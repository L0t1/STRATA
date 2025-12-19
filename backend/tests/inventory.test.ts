
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import { getAuthToken, authHeader } from './testUtils';

describe('Inventory API', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
    staffToken = await getAuthToken('staff', 'staffpass');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should list inventory items with pagination', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set(authHeader(adminToken));
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });

  it('should allow admin to add a new inventory item', async () => {
    const newItem = {
      sku: 'TESTPROD1',
      product_name: 'Test Product 1',
      quantity: 10,
      location_id: 1,
      cost: 50.5
    };
    const res = await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send(newItem);
    
    expect(res.statusCode).toBe(201);
    expect(res.body.sku).toBe(newItem.sku);
  });

  it('should reject non-manager from adding inventory', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set(authHeader(staffToken))
      .send({ sku: 'FAIL', product_name: 'Fail', quantity: 1 });
    
    expect(res.statusCode).toBe(403);
  });

  it('should reject duplicate SKU (Business Logic / Conflict)', async () => {
    await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send({ sku: 'DUPE', product_name: 'Dupe1', quantity: 1 });

    const res = await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send({ sku: 'DUPE', product_name: 'Dupe2', quantity: 1 });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('SKU already exists');
  });
});
