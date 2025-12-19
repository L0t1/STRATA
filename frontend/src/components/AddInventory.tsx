import React, { useState } from 'react';

function AddInventory({ onItemAdded }: { onItemAdded: () => void }) {
  const [sku, setSku] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('pcs');
  const [cost, setCost] = useState(0);
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          sku, 
          product_name: productName, 
          quantity, 
          unit,
          cost,
          location_id: parseInt(locationId) || null 
        }),
      });
      setSku('');
      setProductName('');
      setQuantity(0);
      setUnit('pcs');
      setCost(0);
      setLocationId('');
      onItemAdded();
    } catch (err) {
      console.error('Failed to add inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>SKU</label>
        <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="e.g. WH-12345" />
      </div>
      <div className="form-group">
        <label>Product Name</label>
        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required placeholder="e.g. Industrial Fan" />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={0} required />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Unit</label>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, kg, etc." />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Unit Cost ($)</label>
          <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} step="0.01" min={0} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Location ID</label>
          <input type="number" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="ID" />
        </div>
      </div>
      <button type="submit" className="button" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Creating Item...' : 'Create Inventory Item'}
      </button>
    </form>
  );
}

export default AddInventory;
