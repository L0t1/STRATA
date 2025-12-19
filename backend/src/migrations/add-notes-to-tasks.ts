import pool from '../db';

async function addNotesColumn() {
  console.log('Adding notes column to tasks table...');
  const client = await pool.connect();
  try {
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'notes'
    `);
    
    if (columnCheck.rows.length === 0) {
      await client.query('ALTER TABLE tasks ADD COLUMN notes TEXT');
      console.log('✓ Column notes added to tasks table');
    } else {
      console.log('- Column notes already exists');
    }
  } catch (err) {
    console.error('Error adding notes column:', err);
  } finally {
    client.release();
    process.exit();
  }
}

addNotesColumn();
