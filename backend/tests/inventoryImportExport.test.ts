import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import pool from '../src/db';
import { getAuthToken, authHeader } from './testUtils';

describe('Inventory Import/Export API', () => {
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
  });

  afterAll(async () => {
    await teardownTestDB();
  });
  it('should export inventory as CSV', async () => {
    // 1. Get the seeded location ID
    const locRes = await pool.query('SELECT id FROM location LIMIT 1');
    const locId = locRes.rows[0].id;

    // 2. Seed a row
    await pool.query(`INSERT INTO inventory (sku, product_name, quantity, location_id) VALUES ('CSVSKU', 'CSV Product', 5, $1)`, [locId]);

    const res = await request(app)
      .get('/api/inventory/import-export/export')
      .set(authHeader(adminToken));
    
    expect(res.statusCode).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.text).toContain('sku');
    expect(res.text).toContain('CSVSKU');
  });

  it('should return 400 if no file uploaded for import', async () => {
    const res = await request(app)
      .post('/api/inventory/import-export/import')
      .set(authHeader(adminToken));
    
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 for invalid CSV format', async () => {
    const malformedCsv = 'sku,product_name\n"unclosed_quote,product';
    const res = await request(app)
      .post('/api/inventory/import-export/import')
      .set(authHeader(adminToken))
      .attach('file', Buffer.from(malformedCsv), 'invalid.csv');
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid csv format/i);
  });
});
