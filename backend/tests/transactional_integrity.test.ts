import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import { getAuthToken, authHeader } from './testUtils';
import pool from '../src/db';

describe('Transactional Integrity', () => {
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
    managerToken = await getAuthToken('manager', 'managerpass');

    // Seed one item with high quantity, one with low
    await pool.query("INSERT INTO inventory (sku, product_name, quantity, cost) VALUES ('BATCH1', 'Batch Item 1', 100, 5.0)");
    await pool.query("INSERT INTO inventory (sku, product_name, quantity, cost) VALUES ('BATCH2', 'Batch Item 2', 5, 5.0)");
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should rollback order creation if one item has insufficient stock', async () => {
    const orderNumber = 'TX-ROLLBACK-001';
    const res = await request(app)
      .post('/api/orders')
      .set(authHeader(managerToken))
      .send({
        order_number: orderNumber,
        status: 'pending',
        items: [
          { sku: 'BATCH1', quantity: 10 }, // OK
          { sku: 'BATCH2', quantity: 10 }  // FAIL (Insufficient stock)
        ]
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/insufficient stock/i);

    // Verify Order was NOT created
    const orderRes = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    expect(orderRes.rows.length).toBe(0);

    // Verify BATCH1 stock was NOT decremented (since it should only decrement on shipment, 
    // but the reservation check should have failed the whole thing anyway)
    // Actually, in POST /api/orders, we only check stock, we don't decrement. 
    // But if any check fails, the ROLLBACK ensures the 'orders' table entry isn't saved.
  });

  it('should rollback inventory sync if a partial update fails during shipment', async () => {
    // 1. Create a valid order with 2 items
    await request(app)
      .post('/api/orders')
      .set(authHeader(managerToken))
      .send({
        order_number: 'TX-SHIP-001',
        status: 'pending',
        items: [
          { sku: 'BATCH1', quantity: 10 },
          { sku: 'BATCH2', quantity: 1 }
        ]
      });
    
    const { rows: orders } = await pool.query("SELECT id FROM orders WHERE order_number = 'TX-SHIP-001'");
    const orderId = orders[0].id;

    // 2. Manipulate BATCH2 stock to fail AFTER reservation check? 
    // Wait, the shipment code checks stock AGAIN.
    // Let's make BATCH2 stock 0 manually.
    await pool.query("UPDATE inventory SET quantity = 0 WHERE sku = 'BATCH2'");

    // 3. Attempt to ship
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(adminToken))
      .send({ status: 'shipped' });
    
    expect(res.statusCode).toBe(400);

    // 4. Verify BATCH1 was NOT decremented (Atomic rollback)
    const invRes = await pool.query("SELECT quantity FROM inventory WHERE sku = 'BATCH1'");
    expect(parseInt(invRes.rows[0].quantity)).toBe(100);

    // 5. Verify order status stayed 'pending'
    const orderRes = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);
    expect(orderRes.rows[0].status).toBe('pending');
  });
});
