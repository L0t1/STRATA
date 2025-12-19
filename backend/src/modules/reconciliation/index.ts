import pool from '../../db';
import { Router } from 'express';

const router = Router();

// POST /api/reconciliation - Trigger inventory reconciliation (manager only)
router.post('/', async (req, res) => {
  // Enqueue a reconciliation job
  const { warehouse_id } = req.body;
  const { taskQueue } = await import('../../queue/asyncJobs');
  await taskQueue.add('reconciliation', { warehouse_id });
  res.json({ status: 'Reconciliation job enqueued' });
});

export default router;
