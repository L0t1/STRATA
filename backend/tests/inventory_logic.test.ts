import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import { getAuthToken, authHeader } from './testUtils';
import pool from '../src/db';

describe('Inventory Business Logic', () => {
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should update stock and create audit/movement entries (Side Effects)', async () => {
    // 1. Create initial item
    const itemRes = await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send({
        sku: 'LOGIC1',
        product_name: 'Logic Product',
        quantity: 100,
        cost: 10,
        location_id: 1
      });
    
    const itemId = itemRes.body.id;

    // 2. Adjust quantity
    const adjustRes = await request(app)
      .put(`/api/inventory/${itemId}`)
      .set(authHeader(adminToken))
      .send({
        sku: 'LOGIC1',
        product_name: 'Logic Product',
        quantity: 150, // +50
        location_id: 1
      });
    
    expect(adjustRes.statusCode).toBe(200);
    expect(adjustRes.body.quantity).toBe(150);

    // 3. Verify Audit Log entry was created by trigger
    const auditRes = await pool.query('SELECT * FROM audit_log WHERE entity_id = $1', [itemId]);
    expect(auditRes.rows.length).toBeGreaterThan(0);
    expect(auditRes.rows[0].action).toBe('inventory_adjustment');

    // 4. Verify Inventory Movement entry was created by trigger
    const movementRes = await pool.query('SELECT * FROM inventory_movements WHERE sku = $1', ['LOGIC1']);
    expect(movementRes.rows.length).toBeGreaterThan(0);
    const adjustment = movementRes.rows.find(m => m.type === 'adjustment');
    expect(adjustment).toBeDefined();
    expect(parseInt(adjustment.quantity)).toBe(50);
  });

  it('should fail with 400 for invalid data types (Validation/Mass Assignment)', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send({
        sku: 'BADTYPE',
        product_name: 'Bad',
        quantity: 'not-a-number' // Should be number
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid data types/i);
  });
});
