import React, { useState, useEffect } from 'react';
import AccessibleButton from './AccessibleButton';
import { useNotification } from '../context/NotificationContext';

function AddLocation({ onLocationAdded }: { onLocationAdded: () => void }) {
  const { notify } = useNotification();
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [zone, setZone] = useState('');
  const [aisle, setAisle] = useState('');
  const [shelf, setShelf] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/warehouse', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setWarehouses(data.data || (Array.isArray(data) ? data : [])))
      .catch(() => notify('Failed to load warehouses', 'error'));
  }, [notify]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!warehouseId) return notify('Please select a target warehouse', 'error');
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ warehouse_id: parseInt(warehouseId), zone, aisle, shelf }),
      });
      if (res.ok) {
        setZone('');
        setAisle('');
        setShelf('');
        notify('Storage location initialized successfully');
        onLocationAdded();
      } else {
        const data = await res.json();
        notify(data.error || 'Failed to create location', 'error');
      }
    } catch (err) {
      notify('Network error during location creation', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', padding: 'var(--space-md)' }}>
      <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '16px' }}>Initialize Storage Slot</h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-md)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>TARGET WAREHOUSE</label>
          <select 
            className="input"
            value={warehouseId} 
            onChange={e => setWarehouseId(e.target.value)} 
            required
            style={{ fontWeight: 700 }}
          >
            <option value="">Choose Warehouse...</option>
            {warehouses.map((wh: any) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ZONE</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. A"
              value={zone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setZone(e.target.value)}
              required
              style={{ margin: 0, fontWeight: 700, textAlign: 'center' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>AISLE</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 12"
              value={aisle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAisle(e.target.value)}
              style={{ margin: 0, fontWeight: 700, textAlign: 'center' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>SHELF</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 04"
              value={shelf}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShelf(e.target.value)}
              style={{ margin: 0, fontWeight: 700, textAlign: 'center' }}
            />
          </div>
        </div>
        
        <AccessibleButton type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Processing...' : 'Provision Location'}
        </AccessibleButton>
      </form>
    </div>
  );
}

export default AddLocation;
