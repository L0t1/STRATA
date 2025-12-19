import request from 'supertest';
import app from '../src/index';

export async function getAuthToken(username = 'admin', password = 'adminpass') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  
  if (res.statusCode !== 200) {
    throw new Error(`Failed to login as ${username}: ${res.body.error}`);
  }
  return res.body.token;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
