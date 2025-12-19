import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { setupTestDB, teardownTestDB } from './setupTestDB';
import { getAuthToken, authHeader } from './testUtils';
import pool from '../src/db';

describe('Task Management Logic', () => {
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    await setupTestDB();
    adminToken = await getAuthToken('admin', 'adminpass');
    managerToken = await getAuthToken('manager', 'managerpass');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should allow manager to create and list tasks', async () => {
    const newTask = {
      type: 'pick',
      assigned_to: 3, // Staff user from setupTestDB
      payload: { order_id: 1, items: ['SKU1'] }
    };

    const res = await request(app)
      .post('/api/tasks')
      .set(authHeader(managerToken))
      .send(newTask);
    
    expect(res.statusCode).toBe(201);
    expect(res.body.type).toBe('pick');

    const listRes = await request(app)
      .get('/api/tasks')
      .set(authHeader(managerToken));
    
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('should reject staff from creating tasks', async () => {
    const staffToken = await getAuthToken('staff', 'staffpass');
    const res = await request(app)
      .post('/api/tasks')
      .set(authHeader(staffToken))
      .send({ type: 'cycle_count' });
    
    expect(res.statusCode).toBe(403);
  });
});
