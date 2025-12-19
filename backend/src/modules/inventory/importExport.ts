
import pool from '../../db';
import { Router } from 'express';
import { Request } from 'express';
import { Parser } from 'json2csv';
import multer from 'multer';
import { parse } from 'csv-parse';

const router = Router();

// GET /api/inventory/export - Export inventory as CSV
router.get('/export', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inventory');
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('inventory_export.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export inventory' });
  }
});

interface InventoryCsvRow {
  sku: string;
  product_name: string;
  quantity: string;
  location_id: string;
}



// POST /api/inventory/import - Import inventory from CSV
const upload = multer({ storage: multer.memoryStorage() });
router.post('/import', upload.single('file'), async (req, res) => {
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const results: any[] = [];
  const errors: any[] = [];
  parse(file.buffer, { columns: true, skip_empty_lines: true }, async (err, records) => {
    if (err) {
      return res.status(400).json({ error: 'Invalid CSV format' });
    }
    for (const [i, row] of records.entries()) {
      const { sku, product_name, quantity, location_id } = row as InventoryCsvRow;
      if (!sku || !product_name || isNaN(Number(quantity))) {
        errors.push({ row: i + 1, error: 'Missing or invalid fields', rowData: row });
        continue;
      }
      try {
        const { rows } = await pool.query(
          'INSERT INTO inventory (sku, product_name, quantity, location_id) VALUES ($1, $2, $3, $4) ON CONFLICT (sku) DO UPDATE SET product_name = $2, quantity = $3, location_id = $4 RETURNING *',
          [sku, product_name, Number(quantity), location_id || null]
        );
        results.push(rows[0]);
      } catch (e) {
        errors.push({ row: i + 1, error: 'DB error', details: String(e), rowData: row });
      }
    }
    res.json({ imported: results.length, errors, results });
  });
});

export default router;
