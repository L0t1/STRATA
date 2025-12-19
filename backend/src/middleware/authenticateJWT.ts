import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Allow bypassing for health check or specific public routes if needed
  if (req.path === '/api/health' || req.path.startsWith('/api/auth')) {
    return next();
  }


  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
       console.error('FATAL: JWT_SECRET not configured');
       return res.status(500).json({ error: 'Authentication internal configuration error' });
    }

    jwt.verify(token, secret, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token' });
      (req as any).user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}
