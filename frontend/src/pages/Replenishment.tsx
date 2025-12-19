import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';

function Replenishment() {
  const { notify } = useNotification();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>({
    pipelineEfficiency: 0
  });

  const fetchHealth = () => {
    setStatsLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/analytics/warehouse-health', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setHealthData(data);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  };

  const fetchData = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/reorder-points', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        setData(resData.data || (Array.isArray(resData) ? resData : []));
        setLoading(false);
      })
      .catch(() => {
        notify('Failed to sync replenishment forecasting', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    fetchHealth();
  }, [notify]);

  const handleRunForecast = async () => {
    setForecastLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/analytics/run-forecast', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        notify('Predictive modeling engine execution complete');
        fetchData(); // Refresh list with new forecasts
      } else {
        notify('Forecasting engine encountered an error', 'error');
      }
    } catch (err) {
      notify('Network error during model execution', 'error');
    } finally {
      setForecastLoading(false);
    }
  };

  const handleCreatePO = async (sku: string, qty: number) => {
    const token = localStorage.getItem('token');
    notify(`Initializing acquisition protocol for ${sku}...`);
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          type: 'put_away', 
          payload: JSON.stringify({ sku, quantity: qty, note: 'Automated Intelligent Replenishment' })
        }),
      });
      if (res.ok) {
        notify(`Stock acquisition for ${sku} deployed to queue`);
        fetchData(); // Refresh list
      } else {
        notify('Failed to initialize acquisition protocol', 'error');
      }
    } catch (err) {
      notify('Network error during replenishment trigger', 'error');
    }
  };

  return (
    <div className="replenishment-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>Intelligent Replenishment</h1>
          <p className="text-muted">Predictive analytics for automated stock balancing and supply chain resilience.</p>
        </div>
        <div className="flex-between gap-sm">
          <button 
            className="button secondary" 
            onClick={handleRunForecast} 
            disabled={forecastLoading}
          >
            {forecastLoading ? 'Computing Model...' : '🔄 Run Predictive Analysis'}
          </button>
          <div className="badge badge-primary" style={{ fontWeight: 800 }}>AI FORECASTING ENABLED</div>
        </div>
      </header>

      <div className="grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <label className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Critical Stockouts Risk</label>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-danger)', marginTop: '8px' }}>
            {loading ? '--' : data.filter((i:any) => i.quantity <= i.reorder_level).length}
          </div>
          <p className="text-muted" style={{ marginTop: 'var(--space-xs)', fontSize: '12px' }}>Assets currently below defined safety thresholds.</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <label className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pipeline Efficiency</label>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-primary)', marginTop: '8px' }}>
            {statsLoading ? '--' : `${healthData.pipelineEfficiency}%`}
          </div>
          <p className="text-muted" style={{ marginTop: 'var(--space-xs)', fontSize: '12px' }}>Operational velocity of inbound replenishment tasks (Last 30d).</p>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Simulating supply chain trajectories...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU Baseline</th>
                <th>Current Inventory</th>
                <th>Reorder Threshold</th>
                <th>Optimal Batch</th>
                <th>Last Forecast</th>
                <th style={{ textAlign: 'right' }}>Logistics</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <code>{item.sku}</code>
                    <div style={{ fontSize: '10px', marginTop: '4px' }} className="text-muted">{item.product_name}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ color: item.quantity <= item.reorder_level ? 'var(--color-danger)' : 'inherit' }}>
                      {item.quantity} 
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: '4px' }}>{item.unit}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-warning)', fontWeight: 800 }}>{item.reorder_level}</span>
                  </td>
                  <td className="text-primary font-bold">{item.optimal_quantity}</td>
                  <td className="text-muted" style={{ fontSize: '12px' }}>
                    {item.last_forecast_at ? new Date(item.last_forecast_at).toLocaleDateString() : 'INITIAL'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="button" 
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => handleCreatePO(item.sku, item.optimal_quantity)}
                    >
                      Provision PO
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                   <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    Inventory levels currently satisfy all forecasting constraints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Replenishment;
