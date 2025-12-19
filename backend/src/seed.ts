import pool from './db';
import bcrypt from 'bcrypt';

export async function seed() {
  console.log('--- Starting STRATA High-Fidelity Seeding ---');
  console.log('Connecting to database...');
  const client = await pool.connect();
  console.log('Connected.');

  try {
    await client.query('BEGIN');  

    // 0. Initialize Infrastructure
    console.log('🏗️ Initializing database infrastructure...');
    await client.query(`
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(64) NOT NULL UNIQUE,
          email VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(32) NOT NULL, -- admin, manager, staff
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Warehouse Table
      CREATE TABLE IF NOT EXISTS warehouse (
          id SERIAL PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          address TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Location Table (Warehouse -> Zone -> Aisle -> Shelf)
      CREATE TABLE IF NOT EXISTS location (
          id SERIAL PRIMARY KEY,
          warehouse_id INT REFERENCES warehouse(id) ON DELETE CASCADE,
          zone VARCHAR(64),
          aisle VARCHAR(32),
          shelf VARCHAR(32)
      );

      -- Inventory Table
      CREATE TABLE IF NOT EXISTS inventory (
          id SERIAL PRIMARY KEY,
          sku VARCHAR(64) NOT NULL UNIQUE,
          product_name VARCHAR(255) NOT NULL,
          quantity INT NOT NULL DEFAULT 0,
          reserved_quantity INT DEFAULT 0,
          unit VARCHAR(32) DEFAULT 'pcs',
          cost DECIMAL(12, 2) DEFAULT 0.00,
          location_id INT REFERENCES location(id) ON DELETE SET NULL,
          last_modified_by INT REFERENCES users(id),
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT chk_quantity_positive CHECK (quantity >= 0),
          CONSTRAINT chk_reserved_positive CHECK (reserved_quantity >= 0),
          CONSTRAINT chk_reserved_within_quantity CHECK (reserved_quantity <= quantity)
      );

      -- Inventory Movements / Audit Log
      CREATE TABLE IF NOT EXISTS audit_log (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id),
          action VARCHAR(128) NOT NULL, -- e.g., 'inventory_adjustment', 'order_fulfillment', 'login'
          entity VARCHAR(64), -- e.g., 'inventory', 'order', 'user'
          entity_id INT,
          details JSONB,
          reason VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Task Management Table
      CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          type VARCHAR(64) NOT NULL, -- 'pick', 'pack', 'put_away', 'cycle_count'
          status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
          assigned_to INT REFERENCES users(id),
          payload JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Orders Table
      CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(64) NOT NULL UNIQUE,
          status VARCHAR(32) NOT NULL, -- 'pending', 'picked', 'packed', 'shipped', 'cancelled'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Order Items Table
      CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INT REFERENCES orders(id) ON DELETE CASCADE,
          sku VARCHAR(64) NOT NULL,
          quantity INT NOT NULL,
          reserved_quantity INT DEFAULT 0,
          CONSTRAINT chk_order_item_qty_positive CHECK (quantity > 0)
      );

      -- Reorder Points / Forecasting
      CREATE TABLE IF NOT EXISTS reorder_points (
          id SERIAL PRIMARY KEY,
          sku VARCHAR(64) REFERENCES inventory(sku) ON DELETE CASCADE,
          warehouse_id INT REFERENCES warehouse(id),
          reorder_level INT NOT NULL,
          optimal_quantity INT NOT NULL,
          last_forecast_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Inventory Movements History (for turnover analytics)
      CREATE TABLE IF NOT EXISTS inventory_movements (
          id SERIAL PRIMARY KEY,
          sku VARCHAR(64) NOT NULL,
          type VARCHAR(32) NOT NULL, -- 'inbound', 'outbound', 'adjustment'
          quantity INT NOT NULL,
          location_id INT,
          user_id INT,
          order_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add triggers for inventory adjustments
      CREATE OR REPLACE FUNCTION log_inventory_adjustment() RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO audit_log (user_id, action, entity, entity_id, details)
          VALUES (NEW.last_modified_by, 'inventory_adjustment', 'inventory', NEW.id, row_to_json(NEW));
          
          INSERT INTO inventory_movements (sku, type, quantity, location_id, user_id)
          VALUES (NEW.sku, 'adjustment', NEW.quantity - OLD.quantity, NEW.location_id, NEW.last_modified_by);
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS inventory_adjustment_trigger ON inventory;
      CREATE TRIGGER inventory_adjustment_trigger
      AFTER UPDATE OF quantity ON inventory
      FOR EACH ROW
      EXECUTE FUNCTION log_inventory_adjustment();

      -- Performance Indexes
      CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_sku_type ON inventory_movements(sku, type);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

      -- Cycle Counts Table
      CREATE TABLE IF NOT EXISTS cycle_counts (
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
      );
      CREATE INDEX IF NOT EXISTS idx_cycle_counts_status ON cycle_counts(status);
    `);

    // 1. Reset Ecosystem
    console.log('♻️ Resetting environment...');
    await client.query('TRUNCATE users, warehouse, location, inventory, orders, order_items, tasks, audit_log, inventory_movements, reorder_points, cycle_counts RESTART IDENTITY CASCADE');

    // 2. Identity & Access Management
    console.log('👥 Provisioning operational identities...');
    const hashedPW = await bcrypt.hash('password123', 10);
    const userRes = await client.query(`
      INSERT INTO users (username, email, role, password_hash)
      VALUES 
        ('admin', 'admin@strata.ai', 'admin', $1),
        ('manager_chi', 'chicago.ops@strata.ai', 'manager', $1),
        ('manager_aus', 'austin.ops@strata.ai', 'manager', $1),
        ('staff_pick_01', 'picker.01@strata.ai', 'staff', $1),
        ('staff_pick_02', 'picker.02@strata.ai', 'staff', $1),
        ('staff_receive_01', 'receiving.01@strata.ai', 'staff', $1)
      RETURNING id, username
    `, [hashedPW]);
    const users = Object.fromEntries(userRes.rows.map(u => [u.username, u.id]));

    // 3. Infrastructure: Global Nodes
    console.log('🏢 Commissioning logistics nodes...');
    const whRes = await client.query(`
      INSERT INTO warehouse (name, address)
      VALUES 
        ('Central Silicon Hub', '100 Innovation Way, San Jose, CA'),
        ('Midwest Mega-Center', '500 Logistics Blvd, Chicago, IL'),
        ('Southwest Nexus', '12 Tech Ridge, Austin, TX')
      RETURNING id, name
    `);
    const warehouses = Object.fromEntries(whRes.rows.map(w => [w.name, w.id]));

    // 4. Facility Topology
    console.log('📍 Mapping internal facility coordinates...');
    const locationsRes = await client.query(`
      INSERT INTO location (warehouse_id, zone, aisle, shelf)
      VALUES 
        -- Silicon Hub
        (${warehouses['Central Silicon Hub']}, 'Secure', 'S1', 'A1'),
        (${warehouses['Central Silicon Hub']}, 'Bulk', 'B1', '01'),
        (${warehouses['Central Silicon Hub']}, 'Bulk', 'B1', '02'),
        -- Midwest Center
        (${warehouses['Midwest Mega-Center']}, 'General', 'G1', '10'),
        (${warehouses['Midwest Mega-Center']}, 'ColdStorage', 'C1', '01'),
        (${warehouses['Midwest Mega-Center']}, 'Returns', 'R1', 'X'),
        -- Southwest Nexus
        (${warehouses['Southwest Nexus']}, 'High-Velocity', 'HV1', '01'),
        (${warehouses['Southwest Nexus']}, 'Staging', 'STAGE', 'A')
      RETURNING id
    `);
    const loc = locationsRes.rows.map(r => r.id);

    // 5. Asset Inventory
    console.log('📦 Ingesting enterprise assets...');
    const assets = [
      ['SKU-LAP-770', 'ThinkPad X1 Carbon', 50, 'pcs', 1899.00, loc[0], users['admin']],
      ['SKU-LAP-990', 'MacBook Pro 14" M3', 30, 'pcs', 1999.00, loc[0], users['admin']],
      ['SKU-MON-500', 'Pro Display XDR 32"', 12, 'pcs', 4999.00, loc[1], users['admin']],
      ['SKU-SRV-100', 'Enterprise Blade Server', 5, 'pcs', 15000.00, loc[1], users['admin']],
      ['SKU-GPU-4090', 'NVIDIA RTX 4090 24GB', 8, 'pcs', 1599.00, loc[0], users['admin']],
      ['SKU-TAB-120', 'iPad Air 5th Gen', 100, 'pcs', 599.00, loc[6], users['manager_aus']],
      ['SKU-AUD-800', 'Bose QuietComfort Ultra', 45, 'pcs', 429.00, loc[6], users['manager_aus']],
      ['SKU-CAB-001', 'Thunderbolt 4 Pro Cable', 250, 'pcs', 159.00, loc[7], users['manager_aus']]
    ];

    for (const asset of assets) {
      await client.query(`
        INSERT INTO inventory (sku, product_name, quantity, unit, cost, location_id, last_modified_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, asset);
    }

    // 6. Thresholds & Forecasting
    console.log('📉 Configuring demand reorder points...');
    await client.query(`
      INSERT INTO reorder_points (sku, warehouse_id, reorder_level, optimal_quantity)
      VALUES 
        ('SKU-GPU-4090', ${warehouses['Central Silicon Hub']}, 10, 20), -- CRITICAL (8 < 10)
        ('SKU-SRV-100', ${warehouses['Central Silicon Hub']}, 10, 15),  -- CRITICAL (5 < 10)
        ('SKU-TAB-120', ${warehouses['Southwest Nexus']}, 20, 100)      -- HEALTHY (100 > 20)
    `);

    // 7. Full-Circle Fulfillment Chains (Order -> Task -> Movement -> Audit)
    console.log('🔄 Simulating operational fulfillment high-fidelity chains...');
    
    // Chain A: Complete Cycle (Order -> Picked -> Shipped)
    const o1 = await client.query("INSERT INTO orders (order_number, status) VALUES ('STR-9001', 'shipped') RETURNING id");
    const o1Id = o1.rows[0].id;
    await client.query("INSERT INTO order_items (order_id, sku, quantity) VALUES ($1, 'SKU-LAP-770', 2)", [o1Id]);
    await client.query(`
      INSERT INTO inventory_movements (sku, type, quantity, user_id, order_id)
      VALUES ('SKU-LAP-770', 'outbound', 2, ${users['staff_pick_01']}, ${o1Id})
    `);

    // Chain B: Active Fulfillment (Pending Order -> Pending Pick Task)
    const o2 = await client.query("INSERT INTO orders (order_number, status) VALUES ('STR-9002', 'pending') RETURNING id");
    const o2Id = o2.rows[0].id;
    await client.query("INSERT INTO order_items (order_id, sku, quantity) VALUES ($1, 'SKU-TAB-120', 5)", [o2Id]);
    await client.query(`
      INSERT INTO tasks (type, status, assigned_to, payload)
      VALUES ('pick', 'pending', ${users['staff_pick_01']}, $1)
    `, [JSON.stringify({ order_id: o2Id, order_number: 'STR-9002', sku: 'SKU-TAB-120', quantity: 5 })]);

    // Chain C: Anomaly / Shrinkage Tracking (Adjustment -> Movement -> Audit)
    console.log('⚠️ Generating forensic shrinkage anomalies...');
    const adjustRes = await client.query(`
      INSERT INTO audit_log (user_id, action, entity, details, reason)
      VALUES (${users['manager_chi']}, 'inventory_adjustment', 'inventory', $1, 'Physical inventory shrinkage noticed during floor walk')
      RETURNING id
    `, [JSON.stringify({ sku: 'SKU-CAB-001', quantity: 240, old_quantity: 250 })]);
    
    await client.query(`
      INSERT INTO inventory_movements (sku, type, quantity, user_id)
      VALUES ('SKU-CAB-001', 'adjustment', -10, ${users['manager_chi']})
    `);

    // 8. Quality Control: Cycle Counts
    console.log('📋 Seeding historical cycle counts...');
    await client.query(`
      INSERT INTO cycle_counts (location_id, sku, expected_quantity, actual_quantity, difference, status, counted_by)
      VALUES 
        (${loc[0]}, 'SKU-LAP-770', 50, 48, -2, 'completed', ${users['staff_pick_02']}),
        (${loc[6]}, 'SKU-AUD-800', 45, NULL, NULL, 'pending', ${users['staff_pick_02']})
    `);

    await client.query('COMMIT');
    console.log('✅ COMMIT SUCCESSFUL.');
    console.log('✨ STRATA Ecosystem Seeded with Absolute Relational Integrity.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed at critical junction:', err);
  } finally {
    client.release();
    process.exit();
  }
}

seed();
