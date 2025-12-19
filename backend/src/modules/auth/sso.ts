import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../../db';
import jwt from 'jsonwebtoken';

const router = Router();

if (process.env.NODE_ENV !== 'test') {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/api/auth/sso/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0].value;
      if (!email) return done(new Error('No email found in Google profile'));

      // 1. Find or Create User
      const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      let user = rows[0];

      if (!user) {
        // Auto-provision as 'staff'
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
        const { rows: newUser } = await pool.query(
          'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
          [username, email, 'sso_user', 'staff']
        );
        user = newUser[0];
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj as any));

router.get('/redirect', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

router.get('/callback', passport.authenticate('google', {
  failureRedirect: '/login?error=sso_failed',
  session: false,
}), (req: any, res) => {
  const user = req.user;
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'changeme',
    { expiresIn: '8h' }
  );
  
  // Redirect back to frontend with token in query param
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${token}`);
});

export default router;
