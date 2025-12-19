import React, { useState } from 'react';
import AccessibleButton from './AccessibleButton';
import { useNotification } from '../context/NotificationContext';

function AddUser({ onUserAdded }: { onUserAdded: () => void }) {
  const { notify } = useNotification();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, role }),
      });
      if (res.ok) {
        setUsername('');
        setPassword('');
        setRole('user');
        notify('System user provisioned successfully');
        onUserAdded();
      } else {
        const data = await res.json();
        notify(data.error || 'Provisioning failed', 'error');
      }
    } catch (err) {
      notify('Network error during user provisioning', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ 
      background: 'var(--color-surface-alt)', 
      border: '1px solid var(--color-border)',
      padding: 'var(--space-md)' 
    }}>
      <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '16px' }}>Provision New Identity</h3>
      <form onSubmit={handleSubmit} style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 120px 140px', 
        gap: 'var(--space-sm)',
        alignItems: 'end'
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>USERNAME</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. jdoe"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            required
            style={{ margin: 0 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>TEMPORARY PASSWORD</label>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            style={{ margin: 0 }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ROLE</label>
          <select 
            className="input"
            value={role} 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)} 
            style={{ margin: 0, fontWeight: 700 }}
          >
            <option value="user">STAFF</option>
            <option value="manager">MANAGER</option>
            <option value="admin">ADMIN</option>
          </select>
        </div>
        <AccessibleButton 
          type="submit" 
          disabled={loading}
          style={{ height: '42px', width: '100%' }}
        >
          {loading ? 'Initializing...' : 'Add User'}
        </AccessibleButton>
      </form>
    </div>
  );
}

export default AddUser;
