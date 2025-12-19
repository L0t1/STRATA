import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import { getAuthToken, authHeader } from './testUtils';
import pool from '../src/db';

describe('Warehouse & Location Constraints', () => {
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should enforce warehouse existence when creating a location (Foreign Key)', async () => {
    const res = await request(app)
      .post('/api/locations')
      .set(authHeader(adminToken))
      .send({
        warehouse_id: 9999, // Non-existent
        zone: 'Z',
        aisle: '01',
        shelf: '01'
      });
    
    expect(res.statusCode).toBe(500); // DB constraint error usually results in 500 currently
    expect(res.body.error).toBeDefined();
  });

  it('should enforce location existence when adding inventory (Foreign Key)', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send({
        sku: 'LOCFAIL',
        product_name: 'Location Fail',
        quantity: 1,
        location_id: 9999 // Non-existent
      });
    
    expect(res.statusCode).toBe(500); 
  });
});
