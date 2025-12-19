import pool from '../../db';
import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// GET /api/cycle-counts - List all cycle counts (Manager/Admin)
router.get('/', requireRole('manager'), async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        cc.*, 
        1 as total_items, 
        COALESCE(cc.difference, 0) as discrepancies
      FROM cycle_counts cc
      ORDER BY cc.created_at DESC 
      LIMIT 100
    `);
    res.json({ counts: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cycle counts' });
  }
});

// POST /api/cycle-counts - Schedule a new cycle count batch (Manager/Admin)
router.post('/', requireRole('manager'), async (req, res) => {
  const { zone, warehouse_id, assigned_to } = req.body;
  const userId = (req as any).user.id;
  try {
    if (zone && warehouse_id) {
       const locs = await pool.query('SELECT l.id, i.sku, i.quantity FROM location l JOIN inventory i ON l.id = i.location_id WHERE l.warehouse_id = $1 AND l.zone = $2', [warehouse_id, zone]);
       if (locs.rows.length === 0) return res.status(404).json({ error: 'No locations with inventory found in this zone' });
       
       const results = [];
       for (const loc of locs.rows) {
         const { rows } = await pool.query(
           'INSERT INTO cycle_counts (location_id, sku, expected_quantity, status) VALUES ($1, $2, $3, $4) RETURNING *',
           [loc.id, loc.sku, loc.quantity, 'pending']
         );
         results.push(rows[0]);
       }

       // Audit Log
       await pool.query(
         'INSERT INTO audit_log (user_id, action, entity, details) VALUES ($1, $2, $3, $4)',
         [userId, 'cycle_count_scheduled_batch', 'cycle_counts', { zone, warehouse_id, count: results.length }]
       );

       return res.status(201).json({ message: 'Count batch created', counts: results });
    }
    res.status(400).json({ error: 'Zone and Warehouse are required' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule cycle count' });
  }
});

// POST /api/cycle-counts/:id/perform - Perform a cycle count (Staff)
router.post('/:id/perform', requireRole('staff'), async (req, res) => {
  const { id } = req.params;
  const { actual_quantity, completed_at } = req.body;
  const userId = (req as any).user.id;
  try {
    // 1. Get current count to find difference
    const { rows: current } = await pool.query('SELECT expected_quantity FROM cycle_counts WHERE id = $1', [id]);
    if (current.length === 0) return res.status(404).json({ error: 'Cycle count record not found' });
    
    const difference = actual_quantity - current[0].expected_quantity;

    const { rows } = await pool.query(
      'UPDATE cycle_counts SET actual_quantity = $1, difference = $2, counted_by = $3, status = $4, completed_at = $5 WHERE id = $6 RETURNING *',
      [actual_quantity, difference, userId, 'completed', completed_at || 'NOW()', id]
    );

    // Audit Log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'cycle_count_performed', 'cycle_counts', id, { actual_quantity, difference }]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to perform cycle count' });
  }
});

export default router;
