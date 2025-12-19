import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AddInventory from '../components/AddInventory';
import SearchBar from '../components/SearchBar';
import InventoryLabel from '../components/InventoryLabel';
import { useNotification } from '../context/NotificationContext';

function Inventory() {
  const { notify } = useNotification();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [labelItem, setLabelItem] = useState<any>(null);

  const fetchItems = useCallback((query?: string) => {
    setLoading(true);
    let url = '/api/inventory';
    if (query) url += `?q=${encodeURIComponent(query)}`;
    const token = localStorage.getItem('token');
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setItems(data.data || (Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch(err => {
        notify('Failed to load inventory', 'error');
        setLoading(false);
      });
  }, [notify]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('search');
    fetchItems(searchQuery || undefined);
  }, [location.search, fetchItems]);

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inventory/${deletingItem.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        notify(`Item ${deletingItem.product_name} deleted successfully`);
        setDeletingItem(null);
        fetchItems();
      } else {
        const errData = await res.json();
        notify(errData.error || 'Failed to delete item', 'error');
      }
    } catch (err) {
      notify('An error occurred during deletion', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sku: editingItem.sku,
          product_name: editingItem.product_name,
          quantity: editingItem.quantity,
          unit: editingItem.unit,
          cost: editingItem.cost,
          location_id: editingItem.location_id
        }),
      });
      if (res.ok) {
        notify('Item updated successfully');
        setEditingItem(null);
        fetchItems();
      } else {
        const errData = await res.json();
        notify(errData.error || 'Failed to update item', 'error');
      }
    } catch (err) {
      notify('An error occurred during update', 'error');
    }
  };

  return (
    <div className="inventory-page">
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1>Inventory Master</h1>
          <p className="text-muted">Centralized stock tracking and lifecycle management.</p>
        </div>
        <button className="button" onClick={() => setShowAddModal(true)}>
          <span style={{ fontSize: '18px' }}>+</span> Add SKU
        </button>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-sm)' }}>
        <SearchBar onSearch={fetchItems} />
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="card">
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Provision New Entry</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Create a new SKU record in the global inventory cluster.
            </p>
            <AddInventory onItemAdded={() => { notify('Item added successfully'); fetchItems(); setShowAddModal(false); }} />
            <button className="button secondary" onClick={() => setShowAddModal(false)} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay">
          <div className="card">
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Update SKU Metadata</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Modifying core record for <span className="text-primary font-bold">{editingItem.sku}</span>.
            </p>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>SKU Identifier</label>
                <input type="text" value={editingItem.sku} onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Product Designation</label>
                <input type="text" value={editingItem.product_name} onChange={(e) => setEditingItem({ ...editingItem, product_name: e.target.value })} required />
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="form-group">
                  <label>Total Quantity</label>
                  <input type="number" value={editingItem.quantity} onChange={(e) => setEditingItem({ ...editingItem, quantity: Number(e.target.value) })} required />
                  <div style={{ fontSize: '10px', marginTop: '4px' }} className="text-muted">
                    Active Reservation: <span className="font-bold">{editingItem.reserved_quantity || 0}</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input type="text" value={editingItem.unit} onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })} placeholder="e.g. PCS" />
                </div>
              </div>
              <div className="form-group">
                <label>Unit Cost (USD)</label>
                <input type="number" step="0.01" value={editingItem.cost} onChange={(e) => setEditingItem({ ...editingItem, cost: Number(e.target.value) })} />
              </div>
              <div className="flex-between gap-sm" style={{ marginTop: 'var(--space-lg)' }}>
                <button type="submit" className="button" style={{ flex: 1 }}>Commit Changes</button>
                <button type="button" className="button secondary" onClick={() => setEditingItem(null)} style={{ flex: 1 }}>Discard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingItem && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-sm)' }}>⚠️</div>
            <h2>Security Confirmation</h2>
            <p className="text-muted">
              You are about to permanently decommission SKU <span className="font-bold">{deletingItem.product_name}</span>.
            </p>
            <div style={{ 
              background: 'rgba(244, 63, 94, 0.1)', 
              padding: 'var(--space-sm)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              marginTop: 'var(--space-md)',
              fontSize: '12px',
              color: 'var(--color-danger)'
            }}>
              Critical: Inventory records will be purged from the cluster. This action is irreversible.
            </div>
            <div className="flex-between gap-sm" style={{ marginTop: 'var(--space-lg)' }}>
              <button className="button danger" style={{ flex: 1 }} onClick={handleDelete}>Confirm Purge</button>
              <button className="button secondary" style={{ flex: 1 }} onClick={() => setDeletingItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Querying inventory cluster...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Designation</th>
                <th>Physical Stock</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Unit Cost</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((item: any) => {
                const available = item.quantity - (item.reserved_quantity || 0);
                return (
                  <tr key={item.id}>
                    <td style={{ width: '120px' }}><code className="text-primary font-bold">{item.sku}</code></td>
                    <td className="font-bold" style={{ minWidth: '180px' }}>{item.product_name}</td>
                    <td>
                      <span className={`badge ${item.quantity < 10 ? 'badge-warning' : 'badge-primary'}`}>
                        {item.quantity} {item.unit || 'PCS'}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted font-bold">{item.reserved_quantity || 0}</span>
                    </td>
                    <td>
                      <span className={`font-bold ${available <= 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '15px' }}>
                        {available}
                      </span>
                    </td>
                    <td className="font-bold">
                      ${Number(item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)' }}>
                        {item.location_id ? `L-${item.location_id}` : 'UNASSIGNED'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-between gap-xs" style={{ justifyContent: 'flex-end' }}>
                        <button className="button" style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--color-surface-alt)' }} onClick={() => setLabelItem(item)}>Label</button>
                        <button className="button" style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--color-surface-alt)' }} onClick={() => setEditingItem(item)}>Edit</button>
                        <button className="button danger" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setDeletingItem(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    No active record found in the current scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {labelItem && (
        <InventoryLabel 
          sku={labelItem.sku} 
          productName={labelItem.product_name} 
          onClose={() => setLabelItem(null)} 
        />
      )}
    </div>
  );
}

export default Inventory;
