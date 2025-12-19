import { Router } from 'express';
import pool from '../../db';
import bcrypt from 'bcrypt';
import { requireRole } from '../../middleware/requireRole';
import { pagination } from '../../middleware/pagination';

const router = Router();

// GET /api/users - List all users (Admin only)
router.get('/', requireRole('admin'), pagination, async (req, res) => {
  const { limit, offset } = (req as any).pagination;
  try {
    const { rows } = await pool.query(
      'SELECT id, username, role, created_at, COUNT(*) OVER() as full_count FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    res.json({
      data: rows.map(r => { delete r.full_count; return r; }),
      pagination: { total: totalCount, page: (req as any).pagination.page, limit }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Add new user (Admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body;
  const operatorId = (req as any).user.id;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password and role are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, passwordHash, role]
    );
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [operatorId, 'user_create', 'user', rows[0].id, { username, role }]
    );

    res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to add user: ' + err.message });
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { username, role, password } = req.body;
  const operatorId = (req as any).user.id;

  try {
    let query = 'UPDATE users SET username = $1, role = $2';
    const params: any[] = [username, role];
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      query += ', password_hash = $3 WHERE id = $4';
      params.push(passwordHash, id);
    } else {
      query += ' WHERE id = $3';
      params.push(id);
    }

    query += ' RETURNING id, username, role, created_at';
    
    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [operatorId, 'user_update', 'user', id, { username, role, password_changed: !!password }]
    );

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user: ' + err.message });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const operatorId = (req as any).user.id;

  if (operatorId === parseInt(id)) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const { rows } = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [operatorId, 'user_delete', 'user', id, { username: rows[0].username }]
    );

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, username, role, created_at FROM users WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users/:id/tasks - Get tasks assigned to a specific user
router.get('/:id/tasks', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT id, type, status, payload, created_at FROM tasks WHERE assigned_to = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user tasks' });
  }
});

// GET /api/users/:id/audit-log - Get activity logs for a specific user
router.get('/:id/audit-log', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user activity logs' });
  }
});

export default router;
