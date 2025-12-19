import React, { useEffect, useState, useCallback } from 'react';
import AddOrder from '../components/AddOrder';
import FilterBar from '../components/FilterBar';
import { useNotification } from '../context/NotificationContext';

function Orders() {
  const { notify } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchOrders = useCallback((status?: string) => {
    setLoading(true);
    let url = '/api/orders';
    if (status && status !== 'all') url += `?status=${encodeURIComponent(status)}`;
    const token = localStorage.getItem('token');
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.data || (Array.isArray(data) ? data : []);
        setOrders(formattedData);
        setLoading(false);
      })
      .catch(err => {
        notify('Failed to sync orders', 'error');
        setLoading(false);
      });
  }, [notify]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        notify(`Order status synchronized: ${newStatus.toUpperCase()}`);
        fetchOrders();
      } else {
        const errData = await res.json();
        notify(errData.error || 'State transition failed', 'error');
      }
    } catch (err) {
      notify('Network error during status update', 'error');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'shipped': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'picked': 
      case 'packed': return 'badge-primary';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="orders-page">
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1>Fulfillment Stream</h1>
          <p className="text-muted">Orchestrating outbound logistics and priority shipments.</p>
        </div>
        <button className="button" onClick={() => setShowAddModal(true)}>
          <span style={{ fontSize: '18px' }}>+</span> Provision Order
        </button>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-sm)' }}>
        <FilterBar onFilter={fetchOrders} />
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="card">
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Initialize Shipment</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Define order parameters and reserve inventory assets.
            </p>
            <AddOrder onOrderAdded={() => { notify('Order initialized successfully'); fetchOrders(); setShowAddModal(false); }} />
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
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Retrieving fulfillment queues...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Status</th>
                <th>Allocated Items</th>
                <th>Discovery Date</th>
                <th style={{ textAlign: 'right' }}>Workflow State</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? orders.map((order: any) => (
                <tr key={order.id}>
                  <td style={{ width: '140px' }}><code className="text-primary font-bold">{order.order_number || order.orderNumber}</code></td>
                  <td>
                    <span className={`badge ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(order.items || []).map((item: any) => (
                        <div key={item.id} style={{ fontSize: '12px' }} className="flex-between">
                          <span className="font-bold text-muted" style={{ marginRight: '8px' }}>{item.quantity}×</span>
                          <a href={`/inventory?search=${item.sku}`} className="text-primary font-bold" style={{ textDecoration: 'none' }}>
                            {item.sku}
                          </a>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontSize: '12px' }}>
                    {new Date(order.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <select 
                      className="input" 
                      style={{ 
                        margin: 0, 
                        padding: '6px 12px', 
                        fontSize: '11px', 
                        width: 'auto',
                        background: 'var(--color-surface-alt)',
                        fontWeight: 700,
                        border: '1px solid var(--color-border)'
                      }}
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                    >
                      <option value="pending">PENDING</option>
                      <option value="picked">PICKED</option>
                      <option value="packed">PACKED</option>
                      <option value="shipped">SHIPPED</option>
                      <option value="cancelled">CANCELLED</option>
                    </select>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    Fulfillment queue is currently empty.
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

export default Orders;
