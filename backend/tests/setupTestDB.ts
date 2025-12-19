import pool from '../src/db';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

export async function setupTestDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Explicitly drop tables in order of dependency or just cascade
    const tables = [
      'audit_log', 'inventory_movements', 'order_items', 'orders', 
      'tasks', 'reorder_points', 'inventory', 'location', 'warehouse', 'users'
    ];
    
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);

    // Seed data
    const salt = 10;
    const adminHash = await bcrypt.hash('adminpass', salt);
    const managerHash = await bcrypt.hash('managerpass', salt);
    const staffHash = await bcrypt.hash('staffpass', salt);

    await client.query(`
      INSERT INTO users (username, email, role, password_hash)
      VALUES 
        ('admin', 'admin@example.com', 'admin', $1),
        ('manager', 'manager@example.com', 'manager', $2),
        ('staff', 'staff@example.com', 'staff', $3);
    `, [adminHash, managerHash, staffHash]);

    const whRes = await client.query(`
      INSERT INTO warehouse (name, address) VALUES ('Test HQ', '123 Logic lane') RETURNING id
    `);
    const whId = whRes.rows[0].id;

    await client.query(`
      INSERT INTO location (warehouse_id, zone, aisle, shelf) VALUES ($1, 'A', '01', '01')
    `, [whId]);

    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('CRITICAL: setupTestDB failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

export async function teardownTestDB() {
  await pool.query(`
    TRUNCATE users, inventory, orders, warehouse, location, tasks, audit_log, inventory_movements CASCADE
  `).catch(() => {});
}

export async function closePool() {
  await pool.end();
}
