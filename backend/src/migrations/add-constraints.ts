import pool from '../db';

async function addConstraints() {
  console.log('Adding database constraints...');
  const client = await pool.connect();
  
  try {
    // 0. Ensure reserved_quantity column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inventory' AND column_name = 'reserved_quantity'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding missing reserved_quantity column...');
      await client.query('ALTER TABLE inventory ADD COLUMN reserved_quantity INT DEFAULT 0');
      console.log('✓ Column reserved_quantity added');
    }

    // Add constraints to inventory table - using individual queries and catching already exists errors
    const inventoryConstraints = [
      { name: 'chk_quantity_positive', sql: 'CHECK (quantity >= 0)' },
      { name: 'chk_reserved_positive', sql: 'CHECK (reserved_quantity >= 0)' },
      { name: 'chk_reserved_within_quantity', sql: 'CHECK (reserved_quantity <= quantity)' }
    ];

    for (const c of inventoryConstraints) {
      try {
        await client.query(`ALTER TABLE inventory ADD CONSTRAINT ${c.name} ${c.sql}`);
        console.log(`✓ Added constraint ${c.name}`);
      } catch (err: any) {
        if (err.code === '42710') { // duplicate_object
          console.log(`- Constraint ${c.name} already exists`);
        } else {
          throw err;
        }
      }
    }
    
    // Add constraint to order_items table
    try {
      await client.query('ALTER TABLE order_items ADD CONSTRAINT chk_order_item_qty_positive CHECK (quantity > 0)');
      console.log('✓ Added constraint chk_order_item_qty_positive');
    } catch (err: any) {
      if (err.code === '42710') {
        console.log('- Constraint chk_order_item_qty_positive already exists');
      } else {
        throw err;
      }
    }

    // Add missing performance indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_location_warehouse_id ON location(warehouse_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_movements_sku ON inventory_movements(sku)');
    
    // Ensure reorder_points has a unique constraint on SKU for UPSERT logic
    try {
      await client.query('ALTER TABLE reorder_points ADD CONSTRAINT unique_reorder_sku UNIQUE (sku)');
      console.log('✓ Added uniqueness constraint to reorder_points');
    } catch (err: any) {
      if (err.code === '42710') {
        console.log('- Uniqueness constraint for SKU already exists');
      } else {
        throw err;
      }
    }

    console.log('✓ Performance indexes added');
    
    console.log('✓ All constraints added successfully');
  } catch (err) {
    console.error('Error adding constraints:', err);
  } finally {
    client.release();
    process.exit();
  }
}

addConstraints();
