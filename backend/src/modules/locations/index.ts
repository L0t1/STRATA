import pool from '../../db';
import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// GET /api/locations - List all locations
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM location');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// POST /api/locations - Add new location (ADMIN ONLY)
router.post('/', requireRole('admin'), async (req, res) => {
  const { warehouse_id, zone, aisle, shelf } = req.body;
  const userId = (req as any).user.id;
  try {
    const { rows } = await pool.query(
      'INSERT INTO location (warehouse_id, zone, aisle, shelf) VALUES ($1, $2, $3, $4) RETURNING *',
      [warehouse_id, zone, aisle, shelf]
    );

    // Audit Log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'location_create', 'location', rows[0].id, { warehouse_id, zone, aisle, shelf }]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add location' });
  }
});

// DELETE /api/locations/:id - Delete location (ADMIN ONLY)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  try {
    // 1. Audit capture before delete
    const locData = await pool.query('SELECT * FROM location WHERE id = $1', [id]);
    if (locData.rows.length === 0) return res.status(404).json({ error: 'Location not found' });

    // 2. Logical Guard: Block if stock exists in this location
    const { rows: stock } = await pool.query('SELECT id FROM inventory WHERE location_id = $1 LIMIT 1', [id]);
    if (stock.length > 0) {
      return res.status(400).json({ error: 'Cannot delete location that still contains inventory assets. Relocate stock first.' });
    }

    await pool.query('DELETE FROM location WHERE id = $1', [id]);
    
    // 3. Audit Log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'location_delete', 'location', id, { details: locData.rows[0] }]
    );

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete location: ' + (err as any).message });
  }
});

export default router;
