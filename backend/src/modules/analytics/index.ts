import pool from '../../db';
import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

/**
 * GET /api/analytics/warehouse-health
 * Returns real-time accuracy and performance metrics.
 */
router.get('/warehouse-health', requireRole('manager'), async (req, res) => {
  try {
    // 1. Calculate Inventory Accuracy based on Cycle Counts
    // Formula: 1 - (Sum of absolute discrepancies / Sum of expected quantities)
    const accuracyQuery = `
      WITH recent_counts AS (
        SELECT *
        FROM cycle_counts
        WHERE status = 'completed'
        ORDER BY created_at DESC
        LIMIT 20
      )
      SELECT 
        SUM(ABS(COALESCE(difference, 0))) as total_discrepancy,
        SUM(COALESCE(expected_quantity, 1)) as total_expected
      FROM recent_counts
    `;
    const { rows: accuracyRows } = await pool.query(accuracyQuery);
    const total_discrepancy = parseFloat(accuracyRows[0].total_discrepancy || '0');
    const total_expected = parseFloat(accuracyRows[0].total_expected || '0');
    
    let accuracy = 100.0;
    if (total_expected > 0) {
      accuracy = Math.max(0, (1 - (total_discrepancy / total_expected)) * 100);
    }

    // 2. Calculate Active Deviations (unreviewed cycle counts with discrepancies)
    const deviationQuery = `
      SELECT COUNT(*) as deviations
      FROM cycle_counts
      WHERE status = 'completed' 
      AND difference != 0
    `;
    const { rows: deviationRows } = await pool.query(deviationQuery);
    const deviations = parseInt(deviationRows[0].deviations || '0');

    // 3. Calculate Pipeline Efficiency (Fulfillment Speed)
    // Formula: % of orders shipped within 24 hours of creation
    const efficiencyQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE updated_at - created_at < INTERVAL '24 hours') as fast_orders,
        COUNT(*) as total_orders
      FROM orders
      WHERE status = 'shipped'
      AND created_at > NOW() - INTERVAL '30 days'
    `;
    const { rows: efficiencyRows } = await pool.query(efficiencyQuery);
    const fast_orders = parseInt(efficiencyRows[0].fast_orders || '0');
    const total_orders = parseInt(efficiencyRows[0].total_orders || '0');
    
    let efficiency = 100.0;
    if (total_orders > 0) {
      efficiency = (fast_orders / total_orders) * 100;
    }

    res.json({
      inventoryAccuracy: parseFloat(accuracy.toFixed(1)),
      activeDeviations: deviations,
      pipelineEfficiency: parseFloat(efficiency.toFixed(1)),
      lastUpdated: new Date()
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: 'Failed to compile warehouse health telemetry' });
  }
});

/**
 * POST /api/analytics/run-forecast
 * Triggers re-calculation of reorder points based on historical movement trends.
 */
router.post('/run-forecast', requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Calculate Average Daily Sales (ADS) over 30 days
    // 2. Safety Stock = 7 days of ADS
    // 3. Optimal replenishment = 14 days of ADS
    const forecastQuery = `
      WITH sku_age AS (
        SELECT 
          sku,
          GREATEST(1, LEAST(30, EXTRACT(DAY FROM NOW() - created_at))) as effective_days
        FROM inventory
      ),
      movement_stats AS (
        SELECT 
          im.sku,
          SUM(ABS(im.quantity)) as total_outbound,
          sa.effective_days
        FROM inventory_movements im
        JOIN sku_age sa ON im.sku = sa.sku
        WHERE im.type = 'outbound'
        AND im.created_at > NOW() - INTERVAL '30 days'
        GROUP BY im.sku, sa.effective_days
      )
      INSERT INTO reorder_points (sku, reorder_level, optimal_quantity, last_forecast_at)
      SELECT 
        ms.sku,
        GREATEST(5, CEIL((ms.total_outbound / ms.effective_days) * 7)) as reorder_level,
        GREATEST(10, CEIL((ms.total_outbound / ms.effective_days) * 14)) as optimal_quantity,
        NOW()
      FROM movement_stats ms
      ON CONFLICT (sku) DO UPDATE SET
        reorder_level = EXCLUDED.reorder_level,
        optimal_quantity = EXCLUDED.optimal_quantity,
        last_forecast_at = EXCLUDED.last_forecast_at
    `;
    
    await client.query(forecastQuery);
    await client.query('COMMIT');
    
    res.json({ status: 'Forecasting complete', timestamp: new Date() });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Forecast Error:', err);
    res.status(500).json({ error: 'Failed to execute predictive model' });
  } finally {
    client.release();
  }
});

export default router;
