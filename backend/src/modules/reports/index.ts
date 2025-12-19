import analyticsRouter from './analytics';
import pool from '../../db';
import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(analyticsRouter);

// GET /api/reports - List all available reports
router.get('/', async (_req, res) => {
  res.json({
    reports: [
      { name: 'Inventory Turnover', endpoint: '/api/reports/inventory-turnover', description: 'Top SKUs by movement' },
      { name: 'Aging Items', endpoint: '/api/reports/aging', description: 'Oldest inventory items' },
      { name: 'Shrinkage Log', endpoint: '/api/reports/shrinkage', description: 'Recent inventory adjustments' },
      { name: 'Predictive Suggestions', endpoint: '/api/reorder-points', description: 'AI-generated stock balancing insights' },
    ]
  });
});

export default router;
