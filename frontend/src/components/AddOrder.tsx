import React, { useState, useEffect } from 'react';
import AccessibleButton from './AccessibleButton';
import { useNotification } from '../context/NotificationContext';

function AddOrder({ onOrderAdded }: { onOrderAdded: () => void }) {
  const { notify } = useNotification();
  const [orderNumber, setOrderNumber] = useState('');
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState<{ sku: string, quantity: number }[]>([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/inventory', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setInventory(data.data || []));
  }, []);

  const addItem = () => {
    setItems([...items, { sku: '', quantity: 1 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return notify('Please add at least one item', 'error');
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ order_number: orderNumber, status, items }),
    });
    if (res.ok) {
      notify(`Order ${orderNumber} created successfully`);
      setOrderNumber('');
      setStatus('pending');
      setItems([]);
      onOrderAdded();
    } else {
      const error = await res.json();
      notify(error.error || 'Failed to create order', 'error');
    }
    setLoading(false);
  };


  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <div className="form-group">
        <label>Order Number</label>
        <input
          type="text"
          placeholder="ORD-XXXX"
          value={orderNumber}
          onChange={e => setOrderNumber(e.target.value)}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Initial Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="picked">Picked</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
        </select>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label>Order Items</label>
          <button type="button" className="button secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={addItem}>+ Add SKU</button>
        </div>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select 
              value={item.sku} 
              onChange={e => updateItem(index, 'sku', e.target.value)} 
              required
              style={{ flex: 2 }}
            >
              <option value="">Select SKU...</option>
              {inventory.map((inv: any) => <option key={inv.id} value={inv.sku}>{inv.sku} - {inv.product_name}</option>)}
            </select>
            <input 
              type="number" 
              value={item.quantity} 
              onChange={e => updateItem(index, 'quantity', parseInt(e.target.value))} 
              style={{ flex: 1 }}
              min="1"
              required
            />
            <button type="button" className="button danger" style={{ padding: '4px 8px' }} onClick={() => removeItem(index)}>×</button>
          </div>
        ))}
      </div>

      <AccessibleButton type="submit" disabled={loading} style={{ width: '100%', marginTop: 16 }}>
        {loading ? 'Creating...' : 'Finalize & Create Order'}
      </AccessibleButton>
    </form>
  );
}

export default AddOrder;

