import pool from '../db';

async function stabilizeSchema() {
  console.log('Stabilizing schema foreign key constraints...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Audit Log: ON DELETE SET NULL for user_id
    console.log('Updating audit_log.user_id constraint...');
    await client.query(`
      ALTER TABLE audit_log 
      DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey,
      ADD CONSTRAINT audit_log_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    // 2. Tasks: ON DELETE SET NULL for assigned_to
    console.log('Updating tasks.assigned_to constraint...');
    await client.query(`
      ALTER TABLE tasks 
      DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey,
      ADD CONSTRAINT tasks_assigned_to_fkey 
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    `);

    // 3. Reorder Points: ON DELETE SET NULL for warehouse_id
    console.log('Updating reorder_points.warehouse_id constraint...');
    await client.query(`
      ALTER TABLE reorder_points 
      DROP CONSTRAINT IF EXISTS reorder_points_warehouse_id_fkey,
      ADD CONSTRAINT reorder_points_warehouse_id_fkey 
      FOREIGN KEY (warehouse_id) REFERENCES warehouse(id) ON DELETE SET NULL
    `);

    await client.query('COMMIT');
    console.log('✓ Schema stability constraints applied');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error stabilizing schema:', err);
  } finally {
    client.release();
    process.exit();
  }
}

stabilizeSchema();
