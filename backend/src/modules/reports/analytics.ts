import pool from '../../db';
import { Router } from 'express';

const router = Router();

// GET /api/reports/inventory-turnover
router.get('/inventory-turnover', async (_req, res) => {
  try {
    // Calculate inventory turnover: COGS / average inventory (simplified)
    const { rows: turnover } = await pool.query(`
      SELECT sku,
        SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as cogs,
        AVG(quantity) as avg_inventory
      FROM inventory_movements
      GROUP BY sku
      ORDER BY cogs DESC
      LIMIT 20
    `);
    res.json(turnover);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate inventory turnover report' });
  }
});

// GET /api/reports/aging
router.get('/aging', async (_req, res) => {
  try {
    // List inventory items by oldest received date
    const { rows } = await pool.query(`
      SELECT sku, product_name, quantity, received_at
      FROM inventory
      ORDER BY received_at ASC
      LIMIT 20
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate aging report' });
  }
});

// GET /api/reports/shrinkage
router.get('/shrinkage', async (_req, res) => {
  try {
    // List recent inventory shrinkage events
    const { rows } = await pool.query(`
      SELECT 
        details->>'sku' as sku, 
        details->>'quantity' as quantity, 
        COALESCE(reason, details->>'reason', 'Unspecified Adjustment') as reason, 
        created_at
      FROM audit_log
      WHERE (action = 'inventory_adjustment' AND (reason ILIKE '%shrink%' OR details->>'reason' ILIKE '%shrink%'))
         OR (action = 'scanner_pick' AND (details->>'order_id' IS NULL OR details->>'order_id' = 'null'))
      ORDER BY created_at DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate shrinkage report' });
  }
});

export default router;
