import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const { notify } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const [userRes, tasksRes, activityRes] = await Promise.all([
          fetch(`/api/users/${id}`, { headers }),
          fetch(`/api/users/${id}/tasks`, { headers }),
          fetch(`/api/users/${id}/audit-log`, { headers })
        ]);
        if (userRes.ok) setUser(await userRes.json());
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (activityRes.ok) setActivities(await activityRes.json());
        
        if (!userRes.ok) notify('Failed to retrieve identity profile', 'error');
      } catch (err) {
        notify('Network error during profile sync', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, notify]);

  if (loading) {
    return (
      <div className="flex-between" style={{ justifyContent: 'center', minHeight: '400px', flexDirection: 'column' }}>
        <div className="loading-spinner"></div>
        <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Retrieving identity dossier...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>👤</div>
        <h2>Identity Not Found</h2>
        <p className="text-muted">The requested user profile does not exist in the security matrix.</p>
        <Link to="/users" className="button" style={{ marginTop: 'var(--space-lg)', display: 'inline-block' }}>Return to Directory</Link>
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      <div className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Link to="/users" className="button secondary" style={{ padding: '8px 12px' }}>&larr;</Link>
            <h1>{user.username} Profile</h1>
          </div>
          <p className="text-muted" style={{ marginLeft: '52px' }}>Comprehensive identity overview and historical activity trace.</p>
        </div>
        <div className={`badge ${user.role === 'admin' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
          {user.role.toUpperCase()}
        </div>
      </div>
      
      <div className="grid" style={{ gridTemplateColumns: '1fr 2.5fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
        <div className="card" style={{ position: 'sticky', top: 'var(--space-lg)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              background: 'var(--color-surface-alt)', 
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              border: '2px solid var(--color-primary)'
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <h3 style={{ margin: 0 }}>{user.username}</h3>
            <p className="text-muted" style={{ fontSize: '13px' }}>Identity #{user.id}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>ACCOUNT CREATED</label>
              <div style={{ fontWeight: 600 }}>{new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>ACCOUNT STATUS</label>
              <div className="badge badge-success" style={{ marginTop: '4px' }}>ACTIVE</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <section className="card">
            <h3>Assigned Operations ({tasks.length})</h3>
            <div className="table-container" style={{ marginTop: 'var(--space-md)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Status</th>
                    <th>Context</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td style={{ textTransform: 'capitalize' }}>
                        <div style={{ fontWeight: 700 }}>{task.type.replace('_', ' ')}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>QUEUE ID: #{task.id}</div>
                      </td>
                      <td>
                        <span className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="text-primary font-bold" style={{ fontSize: '12px' }}>
                        {(() => {
                          const p = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload;
                          return p?.target || p?.order_id || p?.sku || '--';
                        })()}
                      </td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">No operational tasks assigned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h3>Historical Audit Trace ({activities.length})</h3>
            <div className="table-container" style={{ marginTop: 'var(--space-md)' }}>
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Protocol</th>
                    <th>Entity</th>
                    <th>Audit Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(activity => (
                    <tr key={activity.id}>
                      <td className="text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {new Date(activity.created_at).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td>
                        <code className="text-primary font-bold" style={{ fontSize: '11px' }}>
                          {activity.action.replace('scanner_', '').replace('_', ' ').toUpperCase()}
                        </code>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{activity.entity.toUpperCase()}</div>
                      </td>
                      <td className="text-muted" style={{ fontStyle: 'italic', fontSize: '11px' }}>
                        {activity.reason || activity.details?.note || 'System event recorded'}
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">No historical events found in log.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default UserDetail;
