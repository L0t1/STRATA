import pool from '../../db';
import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';
import { pagination } from '../../middleware/pagination';

const router = Router();

// GET /api/audit-log - List audit logs (admin only)
router.get('/', requireRole('admin'), pagination, async (req, res) => {
  const { limit, offset } = (req as any).pagination;
  try {
    const { rows } = await pool.query(
      `SELECT al.*, u.username, COUNT(*) OVER() as full_count 
       FROM audit_log al
       JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    res.json({
      data: rows.map(r => { delete r.full_count; return r; }),
      pagination: { total: totalCount, page: (req as any).pagination.page, limit }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
