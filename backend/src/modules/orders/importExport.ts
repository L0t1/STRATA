import pool from '../../db';
import { Router } from 'express';
import { Parser } from 'json2csv';

const router = Router();

// GET /api/orders/export - Export orders as CSV
router.get('/export', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders');
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('orders_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export orders' });
  }
});

// POST /api/orders/import - Import orders from CSV
router.post('/import', async (req, res) => {
  // TODO: Implement CSV import logic
  res.status(501).json({ error: 'Import not implemented yet' });
});

export default router;
