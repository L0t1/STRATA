import pool from '../../db';
import { Router } from 'express';

const router = Router();

// GET /api/dashboard/stats - Fast counts for dashboard cards
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM inventory) as inventory_count,
        (SELECT COUNT(*) FROM orders) as order_count,
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM warehouse) as warehouse_count
    `);
    
    const stats = rows[0];
    res.json({
      inventoryCount: parseInt(stats.inventory_count),
      orderCount: parseInt(stats.order_count),
      userCount: parseInt(stats.user_count),
      warehouseCount: parseInt(stats.warehouse_count)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/dashboard/recent-activity - Latest 5 activities across the system
router.get('/recent-activity', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT al.*, u.username 
      FROM audit_log al
      JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC 
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;
