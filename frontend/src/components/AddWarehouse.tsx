import React, { useState } from 'react';
import AccessibleButton from './AccessibleButton';
import { useNotification } from '../context/NotificationContext';

function AddWarehouse({ onWarehouseAdded }: { onWarehouseAdded: () => void }) {
  const { notify } = useNotification();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/warehouse', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, address }),
      });
      if (res.ok) {
        setName('');
        setAddress('');
        notify('Facility initialized: New site assigned to mesh');
        onWarehouseAdded();
      } else {
        const data = await res.json();
        notify(data.error || 'Facility initialization failed', 'error');
      }
    } catch (err) {
      notify('Network error during site initialization', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', padding: 'var(--space-md)' }}>
      <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '16px' }}>Commission Distribution Center</h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-md)' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>SITE DESIGNATION (NAME)</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. North Hub Alpha"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ margin: 0, fontWeight: 700 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>PHYSICAL COORDINATES (ADDRESS)</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. 102 Sector 7, Silicon Valley"
            value={address}
            onChange={e => setAddress(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>
        <AccessibleButton type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Processing...' : 'Authorize Facility'}
        </AccessibleButton>
      </form>
    </div>
  );
}

export default AddWarehouse;
