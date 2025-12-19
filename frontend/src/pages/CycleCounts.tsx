import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';

function CycleCounts() {
  const { notify } = useNotification();
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCountData, setNewCountData] = useState({ zone: '', warehouse_id: '' });
  const [healthData, setHealthData] = useState<any>({
    inventoryAccuracy: 0,
    activeDeviations: 0
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

  const fetchCounts = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/cycle-counts', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setCounts(data.counts || (Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch(() => {
        notify('Failed to sync cycle count database', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCounts();
    fetchHealth();
  }, [notify]);

  const handleStartCount = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/cycle-counts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          zone: newCountData.zone.toUpperCase(),
          warehouse_id: parseInt(newCountData.warehouse_id)
        }),
      });
      if (res.ok) {
        notify('Cycle count batch initialized and queued');
        setShowAddModal(false);
        setNewCountData({ zone: '', warehouse_id: '' });
        fetchCounts();
      } else {
        const err = await res.json();
        notify(err.error || 'Failed to initialize batch', 'error');
      }
    } catch (err) {
      notify('Network error during batch initialization', 'error');
    }
  };


  return (
    <div className="cycle-counts-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>Inventory Sovereignty</h1>
          <p className="text-muted">Rigorous cycle counting for 100% stock accuracy and drift detection.</p>
        </div>
        <button className="button" onClick={() => setShowAddModal(true)}>
          <span style={{ fontSize: '18px' }}>+</span> Initialize Batch
        </button>
      </header>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Provision Count Batch</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Define the physical zone and site for the upcoming inventory audit.
            </p>
            <form onSubmit={handleStartCount}>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>TARGET ZONE DESIGNATION</label>
                <input 
                  className="input"
                  type="text" 
                  value={newCountData.zone} 
                  onChange={e => setNewCountData({...newCountData, zone: e.target.value.toUpperCase()})} 
                  placeholder="e.g. ALPHA, B-WEST" 
                  required 
                  style={{ fontWeight: 800, textAlign: 'center', letterSpacing: '2px' }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>FACILITY ID</label>
                <input 
                  className="input"
                  type="number" 
                  value={newCountData.warehouse_id} 
                  onChange={e => setNewCountData({...newCountData, warehouse_id: e.target.value})} 
                  placeholder="101" 
                  required 
                  style={{ fontWeight: 700, textAlign: 'center' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                <button type="submit" className="button" style={{ flex: 1 }}>Deploy Batch</button>
                <button type="button" className="button secondary" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Abort</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <label className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Fleet Accuracy Index</label>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-success)', marginTop: '8px' }}>
            {statsLoading ? '--' : `${healthData.inventoryAccuracy}%`}
          </div>
          <p className="text-muted" style={{ marginTop: 'var(--space-xs)', fontSize: '12px' }}>Real-time reliability calculated from last {counts.length} audit reviews.</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <label className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Deviations</label>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-warning)', marginTop: '8px' }}>
            {statsLoading ? '--' : String(healthData.activeDeviations).padStart(2, '0')}
          </div>
          <p className="text-muted" style={{ marginTop: 'var(--space-xs)', fontSize: '12px' }}>Unreviewed stock mismatches detected across active monitoring zones.</p>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Synchronizing audit telemetry...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Protocol ID</th>
                <th>Batch Status</th>
                <th>Population Size</th>
                <th>Deviations</th>
                <th>timestamp</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((count: any) => (
                <tr key={count.id}>
                  <td style={{ width: '120px' }}><code>#CC-{count.id}</code></td>
                  <td>
                    <span className={`badge ${count.status === 'completed' || count.status === 'reviewed' ? 'badge-success' : 'badge-warning'}`} style={{ fontWeight: 800 }}>
                      {count.status?.toUpperCase() || 'INITIALIZING'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{count.total_items || 0} Assets</td>
                  <td>
                    <span style={{ 
                      color: count.discrepancies > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', 
                      fontWeight: 800,
                      fontSize: '14px'
                    }}>
                      {count.discrepancies || 0}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '13px' }}>
                    {new Date(count.created_at || count.scheduled_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="button secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>View Analysis</button>
                  </td>
                </tr>
              ))}
              {counts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    No historical cycle count records discovered.
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

export default CycleCounts;
