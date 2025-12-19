import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import { getAuthToken, authHeader } from './testUtils';

describe('Security & RBAC Validation', () => {
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
    managerToken = await getAuthToken('manager', 'managerpass');
    staffToken = await getAuthToken('staff', 'staffpass');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should reject unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.statusCode).toBe(401);
  });

  it('should reject invalid tokens', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set({ Authorization: 'Bearer invalid_token' });
    expect(res.statusCode).toBe(403);
  });

  it('should enforce Manager rank for adding inventory', async () => {
    // Admin (Rank 3) - OK
    let res = await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send({ sku: 'ADMIN_INV', product_name: 'Admin Item', quantity: 1 });
    expect(res.statusCode).toBe(201);

    // Manager (Rank 2) - OK
    res = await request(app)
      .post('/api/inventory')
      .set(authHeader(managerToken))
      .send({ sku: 'MANAGER_INV', product_name: 'Manager Item', quantity: 1 });
    expect(res.statusCode).toBe(201);

    // Staff (Rank 1) - Forbidden
    res = await request(app)
      .post('/api/inventory')
      .set(authHeader(staffToken))
      .send({ sku: 'STAFF_INV', product_name: 'Staff Item', quantity: 1 });
    expect(res.statusCode).toBe(403);
  });

  it('should enforce Admin rank for deleting items', async () => {
    // First add an item
    const addRes = await request(app)
      .post('/api/inventory')
      .set(authHeader(adminToken))
      .send({ sku: 'DELETE_ME', product_name: 'Delete Me', quantity: 1 });
    const id = addRes.body.id;

    // Manager - Forbidden
    let res = await request(app)
      .delete(`/api/inventory/${id}`)
      .set(authHeader(managerToken));
    expect(res.statusCode).toBe(403);

    // Admin - OK
    res = await request(app)
      .delete(`/api/inventory/${id}`)
      .set(authHeader(adminToken));
    expect(res.statusCode).toBe(204);
  });
});
