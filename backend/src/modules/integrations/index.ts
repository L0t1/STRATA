import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';

const router = Router();


// POST /api/integrations/webhook - Receive webhook from external system (ERP, eCommerce, Shipping)
router.post('/webhook', requireRole('admin'), (req, res) => {
  const { type, payload } = req.body;
  // Example: Process different integration events
  if (type === 'inventory_update') {
    // TODO: Update inventory in local DB
    // await pool.query(...)
    return res.json({ status: 'Inventory updated', payload });
  }
  if (type === 'order_sync') {
    // TODO: Sync order data
    return res.json({ status: 'Order synced', payload });
  }
  // Add more event types as needed
  res.json({ status: 'Webhook received', data: req.body });
});


// GET /api/integrations/status - Check integration status
router.get('/status', requireRole('admin'), (_req, res) => {
  // Example: Return integration status and last sync times
  res.json({
    status: 'OK',
    integrations: [
      { name: 'ERP', lastSync: new Date().toISOString(), status: 'connected' },
      { name: 'eCommerce', lastSync: new Date().toISOString(), status: 'connected' },
      { name: 'Shipping', lastSync: new Date().toISOString(), status: 'connected' },
    ]
  });
});

// POST /api/integrations/erp-sync - Trigger manual ERP sync
router.post('/erp-sync', requireRole('admin'), async (req, res) => {
  // TODO: Connect to ERP API, fetch data, and update local DB
  // Example: Simulate ERP sync
  setTimeout(() => {
    res.json({ status: 'ERP sync complete', timestamp: new Date().toISOString() });
  }, 1000);
});

export default router;
