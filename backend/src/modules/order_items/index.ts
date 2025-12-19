import pool from '../../db';
import { Router } from 'express';

const router = Router();

// GET /api/order-items - List all order items
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM order_items');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order items' });
  }
});

// POST /api/order-items - Add new order item
router.post('/', async (req, res) => {
  const { order_id, sku, quantity } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO order_items (order_id, sku, quantity) VALUES ($1, $2, $3) RETURNING *',
      [order_id, sku, quantity]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add order item' });
  }
});

export default router;
