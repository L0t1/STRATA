import importExportRouter from './importExport';
import { Router } from 'express';
import pool from '../../db';
import { requireRole } from '../../middleware/requireRole';
import { pagination } from '../../middleware/pagination';

const router = Router();
router.use('/import-export', importExportRouter);

// GET /api/orders - List all orders
router.get('/', pagination, async (req, res) => {
  const { limit, offset } = (req as any).pagination;
  try {
    const { status } = req.query;
    let query = `
      SELECT o.*, COUNT(*) OVER() as full_count,
        COALESCE(items.data, '[]'::json) as items
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT json_agg(oi) as data
        FROM order_items oi
        WHERE oi.order_id = o.id
      ) items ON true
    `;
    let params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` WHERE o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const { rows } = await pool.query(query, params);
    
    const totalCount = rows.length > 0 ? parseInt(rows[0].full_count) : 0;
    res.json({
      data: rows.map(r => { delete r.full_count; return r; }),
      pagination: { total: totalCount, page: (req as any).pagination.page, limit }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT o.*, 
        (SELECT JSON_AGG(oi) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE o.id = $1
    `, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// POST /api/orders - Create new order (with stock reservation check)
router.post('/', requireRole('manager'), async (req, res) => {
  const { order_number, status, items } = req.body;

  // Input validation
  if (!order_number || typeof order_number !== 'string' || order_number.trim().length === 0) {
    return res.status(400).json({ error: 'Valid order_number is required' });
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required and must not be empty' });
  }
  
  // Validate each item
  for (const item of items) {
    if (!item.sku || typeof item.sku !== 'string') {
      return res.status(400).json({ error: 'Each item must have a valid SKU' });
    }
    if (!item.quantity || typeof item.quantity !== 'number' || !Number.isInteger(item.quantity)) {
      return res.status(400).json({ error: 'Each item must have an integer quantity' });
    }
    if (item.quantity <= 0) {
      return res.status(400).json({ error:  'Item quantity must be positive' });
    }
    if (item.quantity > 1000000) {
      return res.status(400).json({ error: 'Item quantity exceeds maximum allowed (1,000,000)' });
    }
  }
  
  // Validate status if provided
  const validStatuses = ['pending', 'picked', 'packed', 'shipped', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check stock for all items BEFORE creating order (Reservation Logic)
    for (const item of items) {
      const { rows: inventory } = await client.query(
        'SELECT quantity, reserved_quantity FROM inventory WHERE sku = $1 FOR UPDATE', 
        [item.sku]
      );
      if (inventory.length === 0) {
        throw new Error(`Product not found: ${item.sku}`);
      }
      
      const available = inventory[0].quantity - (inventory[0].reserved_quantity || 0);
      if (available < item.quantity) {
        throw new Error(`Insufficient available stock for SKU: ${item.sku} (On Hand: ${inventory[0].quantity}, Reserved: ${inventory[0].reserved_quantity || 0})`);
      }
    }

    // 2. Insert order
    const { rows: orderRows } = await client.query(
      'INSERT INTO orders (order_number, status) VALUES ($1, $2) RETURNING *',
      [order_number, status || 'pending']
    );
    const orderId = orderRows[0].id;

    // 3. Insert order items & Reserve Stock
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, sku, quantity) VALUES ($1, $2, $3)',
        [orderId, item.sku, item.quantity]
      );
      
      // Increment Reserved Quantity
      await client.query(
        'UPDATE inventory SET reserved_quantity = reserved_quantity + $1 WHERE sku = $2',
        [item.quantity, item.sku]
      );

      // 4. Auto-generate Pick Task
      await client.query(
        'INSERT INTO tasks (type, status, payload) VALUES ($1, $2, $3)',
        ['pick', 'pending', { 
          order_id: orderId, 
          order_number, 
          sku: item.sku, 
          quantity: item.quantity,
          priority: 'standard',
          generated_at: new Date()
        }]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderRows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
       return res.status(409).json({ error: 'Order number already exists' });
    }
    if (err.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create order: ' + err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/status - Update order status (with inventory sync for 'shipped')
router.patch('/:id/status', requireRole('staff'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get current status and items if we are shipping
    const { rows: currentOrder } = await client.query('SELECT status FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (currentOrder.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = currentOrder[0].status;

    // 2. Logic for shipping: Ensure stock is correct
    if (status === 'shipped' && oldStatus !== 'shipped') {
      const { rows: items } = await client.query('SELECT sku, quantity FROM order_items WHERE order_id = $1', [id]);
      
      for (const item of items) {
        // If the order was still 'pending', we need to decrement quantities
        // If it was already 'picked', the scanner ALREADY decremented physical quantity
        if (oldStatus === 'pending') {
          const { rows: inventory } = await client.query('SELECT quantity, reserved_quantity FROM inventory WHERE sku = $1 FOR UPDATE', [item.sku]);
          if (inventory.length === 0 || inventory[0].quantity < item.quantity) {
             throw new Error(`Insufficient stock for SKU: ${item.sku}`);
          }
          await client.query(
            'UPDATE inventory SET quantity = quantity - $1, reserved_quantity = reserved_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE sku = $2',
            [item.quantity, item.sku]
          );
        } else if (oldStatus === 'picked' || oldStatus === 'packed') {
           // Physical stock ALREADY decremented by scanner (or packing action)
           // Do nothing for stock, just finish the status transition
        }
      }
    }
    
    
    // Logic for Cancellation: Handle based on current status
    if (status === 'cancelled') {
      const { rows: items } = await client.query('SELECT sku, quantity FROM order_items WHERE order_id = $1', [id]);
      
      // Auto-cancel associated Pick tasks
      await client.query(
        'UPDATE tasks SET status = \'cancelled\', updated_at = CURRENT_TIMESTAMP WHERE payload->>\'order_id\' = $1 AND type = \'pick\' AND status = \'pending\'',
        [id]
      );

      if (oldStatus === 'pending') {
        // Order was never picked - release full reservation
        for (const item of items) {
          await client.query(
            'UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE sku = $2',
            [item.quantity, item.sku]
          );
        }
      } else if (oldStatus === 'picked' || oldStatus === 'packed') {
        // Order was already picked - stock is GONE
        // We CANNOT restore it (would create phantom stock)
        // Log this as a business event for investigation
        const userId = (req as any).user?.id;
        if (userId) {
          await client.query(
            `INSERT INTO audit_log (user_id, action, entity, entity_id, reason, details) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userId,
              'order_cancelled_after_pick',
              'order',
              id,
              'Order cancelled after physical fulfillment - stock not restored',
              { status: oldStatus, items, warning: 'Physical inventory was already removed' }
            ]
          );
        }
        // No stock changes - items are physically gone
      } else if (oldStatus === 'shipped') {
        // Cannot cancel a shipped order
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot cancel an order that has already been shipped' });
      } else if (oldStatus === 'cancelled') {
        // Already cancelled - idempotent operation
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Order is already cancelled' });
      }
    }

    // 3. Update order status
    const { rows: updatedOrder } = await client.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    await client.query('COMMIT');
    res.json(updatedOrder[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update order status: ' + err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/orders/:id - Delete order (with reservation cleanup)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get current order status to determine reservation handling
    const { rows: orderRows } = await client.query(
      'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );
    
    if (orderRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderStatus = orderRows[0].status;
    
    // 2. Get all order items to release reservations
    const { rows: items } = await client.query(
      'SELECT sku, quantity FROM order_items WHERE order_id = $1',
      [id]
    );
    
    // 3. Release stock reservations based on order state
    for (const item of items) {
      if (orderStatus === 'pending') {
        // Order never fulfilled - release full reservation
        await client.query(
          'UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE sku = $2',
          [item.quantity, item.sku]
        );
      } else if (orderStatus === 'picked' || orderStatus === 'packed') {
        // Already picked - stock is gone, no reservation exists
        // Log for audit but no stock changes needed
      } else if (orderStatus === 'shipped') {
        // Shipped - everything is complete, no changes needed
      } else if (orderStatus === 'cancelled') {
        // Already cancelled - reservations already released
      }
    }

    // 3b. Auto-cancel associated Pick tasks (if they weren't already)
    await client.query(
      'UPDATE tasks SET status = \'cancelled\', updated_at = CURRENT_TIMESTAMP WHERE payload->>\'order_id\' = $1 AND type = \'pick\' AND status = \'pending\'',
      [id]
    );
    
    // 4. Delete the order (CASCADE will delete order_items)
    await client.query('DELETE FROM orders WHERE id = $1', [id]);
    
    // 5. Audit log the deletion
    const userId = (req as any).user?.id;
    if (userId) {
      await client.query(
        'INSERT INTO audit_log (user_id, action, entity, entity_id, reason, details) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, 'order_deletion', 'order', id, `Deleted order with status: ${orderStatus}`, { items }]
      );
    }
    
    await client.query('COMMIT');
    res.status(204).send();
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Order deletion error:', err);
    res.status(500).json({ error: 'Failed to delete order: ' + err.message });
  } finally {
    client.release();
  }
});

export default router;
