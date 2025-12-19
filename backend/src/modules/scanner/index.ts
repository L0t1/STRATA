import { Router } from 'express';
import pool from '../../db';
import { authenticateJWT } from '../../middleware/authenticateJWT';

const router = Router();

// GET /api/scanner/lookup/:sku
router.get('/lookup/:sku', authenticateJWT, async (req, res) => {
  const { sku } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT i.*, l.zone, l.aisle, l.shelf, w.name as warehouse_name
      FROM inventory i
      LEFT JOIN location l ON i.location_id = l.id
      LEFT JOIN warehouse w ON l.warehouse_id = w.id
      WHERE i.sku = $1 OR i.product_name ILIKE $1
      ORDER BY (i.sku = $1) DESC
      LIMIT 1
    `, [sku]);


    
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    
    // Also fetch pending tasks for this SKU
    const { rows: tasks } = await pool.query(`
      SELECT * FROM tasks 
      WHERE status = 'pending' 
      AND (payload::jsonb->>'sku' = $1 OR payload::jsonb->>'target' = $1)
    `, [sku]);

    res.json({
      ...rows[0],
      pending_tasks: tasks
    });
  } catch (err) {
    res.status(500).json({ error: 'Scanner lookup failed' });
  }
});

// POST /api/scanner/confirm
router.post('/confirm', authenticateJWT, async (req, res) => {
  const { sku, quantity, action, order_id } = req.body;
  const userId = (req as any).user.id;

  try {
    await pool.query('BEGIN');

    if (action === 'pick') {
      // Validate inputs
      if (!quantity || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }
      if (!Number.isInteger(quantity)) {
        throw new Error('Quantity must be an integer');
      }
      
      const { rows } = await pool.query('SELECT quantity, reserved_quantity FROM inventory WHERE sku = $1 FOR UPDATE', [sku]);
      if (rows.length === 0) throw new Error('Product not found');
      if (rows[0].quantity < quantity) throw new Error('Insufficient stock for picking');
      
      // Validate order if provided
      if (order_id) {
        const { rows: orderRows } = await pool.query(
          'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
          [order_id]
        );
        if (orderRows.length === 0) {
          throw new Error('Order not found');
        }
        if (orderRows[0].status !== 'pending') {
          throw new Error(`Cannot pick for order in status: ${orderRows[0].status}`);
        }
      }
      
      // Calculate how much to unreserve (can't go negative)
      const currentReserved = rows[0].reserved_quantity || 0;
      const unreserveAmount = order_id ? Math.min(quantity, currentReserved) : 0;
      
      // Decrement stock and reservations
      await pool.query(
        'UPDATE inventory SET quantity = quantity - $1, reserved_quantity = reserved_quantity - $2 WHERE sku = $3',
        [quantity, unreserveAmount, sku]
      );
      
      await pool.query(`
        INSERT INTO inventory_movements (sku, type, quantity, user_id, order_id)
        VALUES ($1, 'outbound', $2, $3, $4)
      `, [sku, quantity, userId, order_id]);

      // If tied to an order, update order status to 'picked'
      if (order_id) {
        await pool.query('UPDATE orders SET status = \'picked\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [order_id]);
      }
    } else if (action === 'receive') {
      // Validate inputs
      if (!quantity || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }
      if (!Number.isInteger(quantity)) {
        throw new Error('Quantity must be an integer');
      }
      if (quantity > 1000000) {
        throw new Error('Quantity exceeds maximum allowed (1,000,000)');
      }
      
      
      const { rows } = await pool.query('SELECT quantity FROM inventory WHERE sku = $1 FOR UPDATE', [sku]);
      if (rows.length === 0) throw new Error('Cannot receive stock for non-existent SKU. Please create the record in Inventory first.');

      await pool.query('UPDATE inventory SET quantity = quantity + $1 WHERE sku = $2', [quantity, sku]);
      
      await pool.query(`
        INSERT INTO inventory_movements (sku, type, quantity, user_id)
        VALUES ($1, 'inbound', $2, $3)
      `, [sku, quantity, userId]);
    }

    // 3. Auto-complete corresponding tasks if they exist
    const taskType = action === 'pick' ? 'cycle_count' : 'put_away'; // Map scanner actions to task types
    // Note: 'pick' scanner action might correspond to 'cycle_count' (verify) or future 'order_pick'
    // For now, let's just complete any task that matches the SKU in payload
    const { rowCount: taskUpdated } = await pool.query(`
      UPDATE tasks 
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM tasks 
        WHERE status IN ('pending', 'in_progress')
        AND (payload::jsonb->>'sku' = $1 OR payload::jsonb->>'target' = $1)
        ORDER BY created_at ASC
        LIMIT 1
      )
    `, [sku]);

    const taskUpdatedCount = taskUpdated ?? 0;

    await pool.query(`
      INSERT INTO audit_log (user_id, action, entity, details, reason)
      VALUES ($1, $2, 'scanner', $3, $4)
    `, [
      userId, 
      `scanner_${action}`, 
      { sku, quantity, order_id }, 
      `${action.toUpperCase()} ${quantity}x ${sku}${taskUpdatedCount > 0 ? ' (Task Updated)' : ''}`
    ]);

    await pool.query('COMMIT');
    res.json({ 
      success: true, 
      message: `Scanner action ${action} confirmed for ${sku}. Stock updated.${taskUpdatedCount > 0 ? ' Associated task marked COMPLETE.' : ''}` 
    });

  } catch (err: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message || 'Scanner confirmation failed' });
  }
});



export default router;
