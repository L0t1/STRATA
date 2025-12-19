import { Router } from 'express';
import pool from '../../db';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// GET /api/warehouse - List all warehouses
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM warehouse');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
});

// POST /api/warehouse - Add new warehouse (ADMIN ONLY)
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, address } = req.body;
  const userId = (req as any).user.id;
  try {
    const { rows } = await pool.query(
      'INSERT INTO warehouse (name, address) VALUES ($1, $2) RETURNING *',
      [name, address]
    );
    
    // Audit Log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'warehouse_create', 'warehouse', rows[0].id, { name }]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add warehouse' });
  }
});

// PUT /api/warehouse/:id - Update warehouse (ADMIN ONLY)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, address } = req.body;
  const userId = (req as any).user.id;
  try {
    const { rows } = await pool.query(
      'UPDATE warehouse SET name = $1, address = $2 WHERE id = $3 RETURNING *',
      [name, address, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });

    // Audit Log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'warehouse_update', 'warehouse', id, { name }]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
});

// DELETE /api/warehouse/:id - Delete warehouse (ADMIN ONLY)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  try {
    // Audit capture before delete
    const warehouseData = await pool.query('SELECT name FROM warehouse WHERE id = $1', [id]);
    if (warehouseData.rows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });

    // Logical Guard: Check if it still has locations (and thus potentially inventory)
    const { rows: locs } = await pool.query('SELECT id FROM location WHERE warehouse_id = $1 LIMIT 1', [id]);
    if (locs.length > 0) {
      return res.status(400).json({ error: 'Cannot delete warehouse that still has registered locations. Relocate resources first.' });
    }

    const { rowCount } = await pool.query('DELETE FROM warehouse WHERE id = $1', [id]);
    
    // Audit Log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'warehouse_delete', 'warehouse', id, { name: warehouseData.rows[0].name }]
    );

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete warehouse: ' + (err as any).message });
  }
});

export default router;
