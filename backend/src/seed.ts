import pool from './db';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('--- Starting STRATA High-Fidelity Seeding ---');
  console.log('Connecting to database...');
  const client = await pool.connect();
  console.log('Connected.');

  try {
    await client.query('BEGIN');  

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
