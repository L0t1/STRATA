import React, { useEffect, useState } from 'react';
import AddWarehouse from '../components/AddWarehouse';
import { useNotification } from '../context/NotificationContext';

function Warehouses() {
  const { notify } = useNotification();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [deletingWh, setDeletingWh] = useState<any>(null);
  const [userRole, setUserRole] = useState('');

  const fetchWarehouses = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/warehouse', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setWarehouses(data.data || (Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch((err) => {
        notify('Failed to sync facility registry', 'error');
        setLoading(false);
      });
  };

  const handleDelete = async () => {
    if (!deletingWh) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/warehouse/${deletingWh.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        notify(`Facility ${deletingWh.name} decommissioned`);
        setDeletingWh(null);
        fetchWarehouses();
      } else {
        const data = await res.json();
        notify(data.error || 'Decommission failed', 'error');
      }
    } catch (err) {
      notify('Network error during site decommissioning', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/warehouse/${editingWarehouse.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingWarehouse.name, address: editingWarehouse.address })
      });
      if (res.ok) {
        notify('Facility parameters updated');
        setEditingWarehouse(null);
        fetchWarehouses();
      } else {
        const data = await res.json();
        notify(data.error || 'Update failed', 'error');
      }
    } catch (err) {
      notify('Network error during parameter update', 'error');
    }
  };

  useEffect(() => {
    fetchWarehouses();
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {}
    }
  }, [notify]);

  const isAdmin = userRole === 'admin';

  return (
    <div className="warehouses-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>Global Facility Mesh</h1>
          <p className="text-muted">Manage the physical architecture and status of all distribution centers.</p>
        </div>
        {isAdmin && (
          <button className="button" onClick={() => setShowAddModal(true)}>
            <span style={{ fontSize: '18px' }}>+</span> Commission Facility
          </button>
        )}
      </header>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>New Site Commissioning</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Assign new physical coordinates to the STRATA logistics network.
            </p>
            <AddWarehouse onWarehouseAdded={() => { fetchWarehouses(); setShowAddModal(false); }} />
            <button className="button secondary" onClick={() => setShowAddModal(false)} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingWarehouse && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Modify Parameters</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Updating configuration for facility: <strong>{editingWarehouse.name}</strong>
            </p>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>SITE DESIGNATION</label>
                <input 
                  className="input"
                  type="text" 
                  value={editingWarehouse.name} 
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })} 
                  required 
                  style={{ fontWeight: 700 }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>PHYSICAL COORDINATES</label>
                <input 
                  className="input"
                  type="text" 
                  value={editingWarehouse.address} 
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, address: e.target.value })} 
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                <button type="submit" className="button" style={{ flex: 1 }}>Save Parameters</button>
                <button type="button" className="button secondary" onClick={() => setEditingWarehouse(null)} style={{ flex: 1 }}>Abort</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingWh && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-sm)' }}>🛑</div>
            <h2>Decommission Site?</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
              Removing <strong>{deletingWh.name}</strong> will purge associated metadata. Logic guards prevent deletion if locations or inventory persist.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button className="button danger" style={{ flex: 1 }} onClick={handleDelete}>Confirm Decommission</button>
              <button className="button secondary" style={{ flex: 1 }} onClick={() => setDeletingWh(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Synchronizing global facility mesh...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Site Node</th>
                <th>Physical Address</th>
                <th>Commission Date</th>
                <th>Grid Status</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.length > 0 ? warehouses.map((wh: any) => (
                <tr key={wh.id}>
                  <td style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '15px' }}>{wh.name.toUpperCase()}</td>
                  <td className="text-muted" style={{ fontSize: '13px' }}>{wh.address || 'UNDEFINED'}</td>
                  <td style={{ fontSize: '13px' }}>{new Date(wh.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                  <td><span className="badge badge-success" style={{ fontWeight: 800 }}>OPERATIONAL</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {isAdmin && (
                        <>
                          <button className="button secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setEditingWarehouse(wh)}>Edit</button>
                          <button className="button danger" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setDeletingWh(wh)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    Zero facilities detected in active directory.
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

export default Warehouses;
