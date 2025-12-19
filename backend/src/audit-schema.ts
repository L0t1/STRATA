import pool from './db';

async function auditSchema() {
  const client = await pool.connect();
  try {
    console.log('--- INDEX AUDIT ---');
    const indexes = await client.query(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('inventory', 'orders', 'order_items', 'audit_log')
      ORDER BY tablename;
    `);
    indexes.rows.forEach(r => console.log(`[${r.tablename}] ${r.indexname}: ${r.indexdef}`));

    console.log('\n--- FOREIGN KEY AUDIT ---');
    const fks = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('inventory', 'orders', 'order_items', 'audit_log');
    `);
    fks.rows.forEach(r => console.log(`[${r.table_name}] ${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name} (ON DELETE: ${r.delete_rule})`));

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

auditSchema();
