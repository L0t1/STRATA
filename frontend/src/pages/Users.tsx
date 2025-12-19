import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AddUser from '../components/AddUser';
import { useNotification } from '../context/NotificationContext';

function Users() {
  const { notify } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);

  const fetchUsers = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.data || (Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch((err) => {
        notify('Failed to sync system users', 'error');
        setLoading(false);
      });
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        notify(`User ${deletingUser.username} successfully purged`);
        setDeletingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        notify(data.error || 'Purge failed', 'error');
      }
    } catch (err) {
      notify('Network error during user deletion', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          username: editingUser.username, 
          role: editingUser.role,
          password: editingUser.password // Optional password update
        })
      });
      if (res.ok) {
        notify('User identity updated successfully');
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        notify(data.error || 'Update failed', 'error');
      }
    } catch (err) {
      notify('Network error during user update', 'error');
    }
  };


  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'badge-danger';
      case 'manager': return 'badge-warning';
      default: return 'badge-primary';
    }
  };

  return (
    <div className="users-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>User & Identity Matrix</h1>
          <p className="text-muted">Manage system access, roles, and administrative permissions.</p>
        </div>
      </header>

      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <AddUser onUserAdded={() => { fetchUsers(); }} />
      </div>

      {editingUser && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Edit User Identity</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Modify account parameters for <strong>{editingUser.username}</strong>
            </p>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>USERNAME</label>
                <input 
                  className="input"
                  type="text" 
                  value={editingUser.username} 
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} 
                  required 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>RESET PASSWORD (OPTIONAL)</label>
                <input 
                  className="input"
                  type="password" 
                  placeholder="Leave blank to keep current"
                  value={editingUser.password || ''} 
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ASSIGNED ROLE</label>
                <select 
                  className="input"
                  value={editingUser.role} 
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  style={{ fontWeight: 700 }}
                >
                  <option value="user">STAFF</option>
                  <option value="manager">MANAGER</option>
                  <option value="admin">ADMIN</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                <button type="submit" className="button" style={{ flex: 1 }}>Update Identity</button>
                <button type="button" className="button secondary" onClick={() => setEditingUser(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-sm)' }}>⚠️</div>
            <h2>Critical Action</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
              Are you absoluteley sure you want to purge <strong>{deletingUser.username}</strong> from the system? This action is irreversible.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button className="button danger" style={{ flex: 1 }} onClick={handleDelete}>Confirm Purge</button>
              <button className="button secondary" style={{ flex: 1 }} onClick={() => setDeletingUser(null)}>Abort</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Synchronizing secure identity directory...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Identity ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Discovery Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? users.map((user: any) => (
                <tr key={user.id}>
                  <td style={{ width: '120px' }}><code>#{user.id}</code></td>
                  <td style={{ fontWeight: 700 }}>
                    <Link to={`/users/${user.id}`} className="text-primary" style={{ textDecoration: 'none' }}>
                      {user.username}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '13px' }}>
                    {new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="button secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setEditingUser(user)}>Edit</button>
                      <button className="button danger" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setDeletingUser(user)}>Delete</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    Security directory is currently empty.
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

export default Users;
