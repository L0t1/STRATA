import pool from '../db';

async function addCycleCountsTable() {
  console.log('Creating cycle_counts table...');
  const client = await pool.connect();
  try {
    await client.query(`
      DROP TABLE IF EXISTS cycle_counts CASCADE;
      CREATE TABLE cycle_counts (
        id SERIAL PRIMARY KEY,
        location_id INT REFERENCES location(id) ON DELETE CASCADE,
        sku VARCHAR(64) NOT NULL,
        expected_quantity INT NOT NULL,
        actual_quantity INT,
        difference INT,
        status VARCHAR(32) DEFAULT 'pending', -- pending, completed
        counted_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log('✓ Table cycle_counts created successfully');
    
    // Add performance indexes for analytics
    await client.query('CREATE INDEX IF NOT EXISTS idx_cycle_counts_status ON cycle_counts(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cycle_counts_location_id ON cycle_counts(location_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cycle_counts_reviewed_at ON cycle_counts(reviewed_at)');
    console.log('✓ Performance indexes for cycle_counts added');
  } catch (err) {
    console.error('Error creating cycle_counts table:', err);
  } finally {
    client.release();
    process.exit();
  }
}

addCycleCountsTable();
