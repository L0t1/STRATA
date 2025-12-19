
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';

import v1Router from './modules/v1';
import integrationsRouter from './modules/integrations';
import reconciliationRouter from './modules/reconciliation';
import './queue/asyncJobs';
import replenishmentRouter from './modules/replenishment';
import scannerRouter from './modules/scanner';
import tasksRouter from './modules/tasks';
import auditLogRouter from './modules/audit_log';
import { errorHandler } from './middleware/errorHandler';
import { authenticateJWT } from './middleware/authenticateJWT';
import { apiLimiter } from './middleware/apiLimiter';
import authRouter from './modules/auth';
import reportsRouter from './modules/reports';
import cycleCountsRouter from './modules/cycle_counts';
import orderItemsRouter from './modules/order_items';
import inventoryRouter from './modules/inventory';
import warehouseRouter from './modules/warehouse';
import ordersRouter from './modules/orders';
import usersRouter from './modules/users';
import locationsRouter from './modules/locations';
import dashboardRouter from './modules/dashboard';
import analyticsRouter from './modules/analytics';

import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import { redisConfig } from './redisConfig';
import { seed as runSeed } from './seed';

dotenv.config();

const app = express();

// Session Setup with Redis
const redisClient = createClient(typeof redisConfig === 'string' ? { url: redisConfig } : redisConfig);
redisClient.connect().catch(console.error);

const store = new RedisStore({
  client: redisClient,
  prefix: 'iwms-sess:',
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  store: store,
  secret: (process.env.SESSION_SECRET || 'test_session_secret') as string,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV !== 'test') {
  app.use(apiLimiter);
}

// Manual Seed Trigger (Temporary for setup)
app.get('/api/admin/seed', async (req, res) => {
  try {
    await runSeed();
    res.json({ message: 'Seeding successful! You can now login.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Seeding failed', details: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'STRATA backend running' });
});

app.use('/api/auth', authRouter);

app.use(authenticateJWT); // Enable globally for all routes below

app.use('/api/dashboard', dashboardRouter);
app.use('/api/v1', v1Router);
app.use('/api/integrations', integrationsRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reorder-points', replenishmentRouter);
app.use('/api/scanner', scannerRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/cycle-counts', cycleCountsRouter);
app.use('/api/order-items', orderItemsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/users', usersRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/analytics', analyticsRouter);

// Final middleware: Error handler
app.use(errorHandler);


const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`STRATA backend listening on port ${PORT}`);
  });
}

export default app;
