import pool from '../../db';
import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';
import { pagination } from '../../middleware/pagination';

const router = Router();

// GET /api/tasks - List all tasks (admin/manager)
router.get('/', requireRole('manager'), pagination, async (req, res) => {
  const { limit, offset } = (req as any).pagination;
  try {
    const { rows } = await pool.query(
      'SELECT *, COUNT(*) OVER() as full_count FROM tasks ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    res.json({
      data: rows.map(r => { delete r.full_count; return r; }),
      pagination: { total: totalCount, page: (req as any).pagination.page, limit }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - Create a new task
router.post('/', requireRole('manager'), async (req, res) => {
  const { type, assigned_to, payload, notes } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO tasks (type, assigned_to, payload, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [type, assigned_to, payload, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id - Generic task update (assigned_to, status, notes)
router.patch('/:id', requireRole('staff'), async (req, res) => {
  const { id } = req.params;
  const { assigned_to, status, notes } = req.body;
  
  // Logical Guard: If assigning, set to in_progress if not already
  let finalStatus = status;
  if (assigned_to && !status) finalStatus = 'in_progress';

  try {
    const fields = [];
    const params = [];
    let idx = 1;

    if (assigned_to !== undefined) { fields.push(`assigned_to = $${idx++}`); params.push(assigned_to); }
    if (finalStatus !== undefined) { fields.push(`status = $${idx++}`); params.push(finalStatus); }
    if (notes !== undefined) { fields.push(`notes = $${idx++}`); params.push(notes); }
    
    if (fields.length === 0) return res.status(400).json({ error: 'No fields provided for update' });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const { rows } = await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

export default router;
