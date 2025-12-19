import React, { useEffect, useState } from 'react';
import AddLocation from '../components/AddLocation';
import { useNotification } from '../context/NotificationContext';

function Locations() {
  const { notify } = useNotification();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userRole, setUserRole] = useState('');

  const fetchLocations = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/locations', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setLocations(data.data || (Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch((err) => {
        notify('Failed to sync storage database', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLocations();
    // Decode token to get role
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {}
    }
  }, [notify]);

  const handleDeleteLocation = async (id: number) => {
    if (!window.confirm('WARNING: Decommissioning this site node will permanently remove the coordinate mapping. Proceed?')) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        notify('Location decommissioned successfully');
        fetchLocations();
      } else {
        const err = await res.json();
        notify(err.error || 'Decommissioning failed', 'error');
      }
    } catch (err) {
      notify('Network error during decommissioning', 'error');
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <div className="locations-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>Storage Geographies</h1>
          <p className="text-muted">Orchestrate and define the physical architecture of your distribution centers.</p>
        </div>
        {isAdmin && (
          <button className="button" onClick={() => setShowAddModal(true)}>
            <span style={{ fontSize: '18px' }}>+</span> Provision Location
          </button>
        )}
      </header>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Initialize Location</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Define new storage coordinates within your local mesh.
            </p>
            <AddLocation onLocationAdded={() => { fetchLocations(); setShowAddModal(false); }} />
            <button className="button secondary" onClick={() => setShowAddModal(false)} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Synchronizing location directory...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Site Node</th>
                <th>Zone Designation</th>
                <th>Grid Detail</th>
                <th style={{ textAlign: 'center' }}>Coordinate Label</th>
                <th style={{ textAlign: 'right' }}>Logistics</th>
              </tr>
            </thead>
            <tbody>
              {locations.length > 0 ? locations.map((loc: any) => (
                <tr key={loc.id}>
                  <td style={{ width: '140px' }}>
                    <span className="badge badge-primary" style={{ fontWeight: 800 }}>#WH-{loc.warehouse_id}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{loc.zone || '--'}</td>
                  <td className="text-muted">
                    <span style={{ fontSize: '12px' }}>AISLE {loc.aisle || '?'}</span>
                    <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                    <span style={{ fontSize: '12px' }}>SHELF {loc.shelf || '?'}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <code style={{ 
                      background: 'var(--color-surface-alt)', 
                      padding: '4px 8px', 
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)'
                    }}>
                      {loc.zone || '?'}-{loc.aisle || '?'}-{loc.shelf || '?'}
                    </code>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isAdmin && (
                      <button 
                        className="button secondary" 
                        style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteLocation(loc.id)}
                      >
                        Decommission
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    No residential storage locations discovered.
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

export default Locations;
