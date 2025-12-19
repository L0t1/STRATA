
import { Router } from 'express';

const router = Router();

// Health check endpoint for /api/v1/health
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'IWMS backend running' });
});

// GET /api/v1/inventory/levels
router.get('/inventory/levels', (_req, res) => {
  // TODO: Implement versioned inventory levels endpoint
  res.json({ message: 'v1 inventory levels' });
});

// POST /api/v1/orders/sync
router.post('/orders/sync', (_req, res) => {
  // TODO: Implement versioned order sync endpoint
  res.json({ message: 'v1 order sync' });
});

// POST /api/v1/locations/assign
router.post('/locations/assign', (_req, res) => {
  // TODO: Implement versioned location assign endpoint
  res.json({ message: 'v1 location assign' });
});

export default router;
