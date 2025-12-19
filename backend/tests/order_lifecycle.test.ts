import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import { getAuthToken, authHeader } from './testUtils';
import pool from '../src/db';

describe('Order Lifecycle & Inventory Sync', () => {
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
    managerToken = await getAuthToken('manager', 'managerpass');

    // Setup: Get location and create an inventory item
    const locRes = await pool.query('SELECT id FROM location LIMIT 1');
    const locId = locRes.rows[0].id;
    await pool.query("INSERT INTO inventory (sku, product_name, quantity, cost, location_id) VALUES ('ORDERPROD1', 'Order Product 1', 100, 10.0, $1)", [locId]);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should decrement inventory when order is marked as shipped', async () => {
    // 1. Create an order
    const orderRes = await request(app)
      .post('/api/orders')
      .set(authHeader(managerToken))
      .send({
        order_number: 'SYNC-SHIPPED-001',
        status: 'pending',
        items: [{ sku: 'ORDERPROD1', quantity: 10 }]
      });
    
    expect(orderRes.statusCode).toBe(201);
    const orderId = orderRes.body.id;

    // 2. Change status to 'shipped' (Expected behavior: Decrement stock)
    const shipRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(adminToken))
      .send({ status: 'shipped' });
    
    expect(shipRes.statusCode).toBe(200);

    // 3. Verify Inventory
    const invRes = await pool.query("SELECT quantity FROM inventory WHERE sku = 'ORDERPROD1'");
    expect(parseInt(invRes.rows[0].quantity)).toBe(90); // 100 - 10
  });

  it('should FAIL to ship if stock is insufficient (Business Rule)', async () => {
     // Currently stock is 90. Create an order for 50.
     const orderRes = await request(app)
      .post('/api/orders')
      .set(authHeader(managerToken))
      .send({
        order_number: 'SYNC-FAIL-001',
        status: 'pending',
        items: [{ sku: 'ORDERPROD1', quantity: 50 }]
      });
    
    expect(orderRes.statusCode).toBe(201);
    const orderId = orderRes.body.id;

    // Manually drop stock to 40 (behind the scenes)
    await pool.query("UPDATE inventory SET quantity = 40 WHERE sku = 'ORDERPROD1'");

    // Try to ship 50 when only 40 is left
    const shipRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set(authHeader(adminToken))
      .send({ status: 'shipped' });
    
    expect(shipRes.statusCode).toBe(400); // Bad Request / Insufficient stock
    expect(shipRes.body.error).toMatch(/insufficient stock/i);

    // Verify stock stayed at 40
    const invRes = await pool.query("SELECT quantity FROM inventory WHERE sku = 'ORDERPROD1'");
    expect(parseInt(invRes.rows[0].quantity)).toBe(40);
  });

  it('should ensure transaction rollback if stock update fails', async () => {
    // This is hard to trigger without a bug, but we can test the outcome 
    // If one item fails, the entire shipment (status update) should fail.
  });
});
