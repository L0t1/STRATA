import importExportRouter from './importExport';
import { Router } from 'express';
import pool from '../../db';
import { requireRole } from '../../middleware/requireRole';
import { pagination } from '../../middleware/pagination';

const router = Router();
router.use('/import-export', importExportRouter);

// GET /api/inventory - List all inventory items
router.get('/', pagination, async (req, res) => {
  const { q } = req.query;
  const { limit, offset } = (req as any).pagination;
  try {
    let query = 'SELECT *, COUNT(*) OVER() as full_count FROM inventory';
    let params: any[] = [];
    let paramIndex = 1;
    if (q) {
      query += ` WHERE sku ILIKE $${paramIndex} OR product_name ILIKE $${paramIndex}`;
      params.push(`%${q}%`);
      paramIndex++;
    }
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const { rows } = await pool.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    res.json({
      data: rows.map(r => { delete r.full_count; return r; }),
      pagination: { total: totalCount, page: (req as any).pagination.page, limit }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/:id - Get single inventory item
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// POST /api/inventory - Add new inventory item
router.post('/', requireRole('manager'), async (req, res) => {
  const { sku, product_name, quantity, unit, cost, location_id } = req.body;
  const userId = (req as any).user.id;
  
  // Validation
  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    return res.status(400).json({ error: 'Valid SKU is required' });
  }
  if (!product_name || typeof product_name !== 'string' || product_name.trim().length === 0) {
    return res.status(400).json({ error: 'Valid Product Name is required' });
  }
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: 'Quantity must be a non-negative integer' });
  }
  if (cost !== undefined && (typeof cost !== 'number' || cost < 0)) {
     return res.status(400).json({ error: 'Cost must be a positive number' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO inventory (sku, product_name, quantity, unit, cost, location_id, last_modified_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [sku, product_name, quantity, unit || 'pcs', cost || 0, location_id || null, userId]
    );
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'inventory_create', 'inventory', rows[0].id, { sku, product_name, quantity }]
    );

    res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
       return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to add inventory item: ' + err.message });
  }
});

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', requireRole('manager'), async (req, res) => {
  const { id } = req.params;
  const { sku, product_name, quantity, unit, cost, location_id } = req.body;
  const userId = (req as any).user.id;

  if (typeof quantity !== 'number' || quantity < 0) {
    return res.status(400).json({ error: 'Quantity must be non-negative' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE inventory 
       SET sku = $1, product_name = $2, quantity = $3, unit = $4, cost = $5, location_id = $6, last_modified_by = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`,
      [sku, product_name, quantity, unit, cost, location_id, userId, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'inventory_update', 'inventory', id, { sku, product_name, quantity }]
    );

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update inventory item: ' + err.message });
  }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', requireRole('manager'), async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  try {
    // Get info for audit before delete
    const { rows: item } = await pool.query('SELECT sku, product_name FROM inventory WHERE id = $1', [id]);
    if (item.length === 0) return res.status(404).json({ error: 'Item not found' });

    await pool.query('DELETE FROM inventory WHERE id = $1', [id]);
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'inventory_delete', 'inventory', id, { sku: item[0].sku, product_name: item[0].product_name }]
    );

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete inventory item: ' + err.message });
  }
});

export default router;
