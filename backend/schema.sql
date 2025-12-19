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
