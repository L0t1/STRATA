import pool from '../../db';
import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// GET /api/reorder-points - Get reorder suggestions (manager/admin)
router.get('/', requireRole('manager'), async (req, res) => {
  try {
    // Join reorder_points with inventory to get current quantities and SKUs
    const { rows } = await pool.query(`
      SELECT 
        rp.id,
        rp.sku,
        i.product_name,
        i.quantity,
        i.unit,
        rp.reorder_level,
        rp.optimal_quantity,
        rp.last_forecast_at
      FROM reorder_points rp
      JOIN inventory i ON rp.sku = i.sku
      ORDER BY (i.quantity <= rp.reorder_level) DESC, i.quantity ASC
    `);
    
    // Returning a simple array for now to match the user's initial frontend expectation,
    // though we should ideally standardize to { data, pagination } later.
    // For this specific fix, I'll return the array directly as requested by the user's error context.
    res.json(rows);
  } catch (err) {
    console.error('Error fetching reorder points:', err);
    res.status(500).json({ error: 'Failed to fetch reorder suggestions' });
  }
});

export default router;
