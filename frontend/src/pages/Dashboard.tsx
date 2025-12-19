import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [stats, setStats] = useState<any>({
    inventoryCount: 0,
    orderCount: 0,
    userCount: 0,
    warehouseCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    Promise.all([
      fetch('/api/dashboard/stats', { headers }).then(res => res.json()),
      fetch('/api/dashboard/recent-activity', { headers }).then(res => res.json())
    ]).then(([statsData, activityData]) => {
      setStats(statsData);
      setRecentActivity(activityData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('receive') || act.includes('add') || act.includes('create')) return 'badge-success';
    if (act.includes('delete') || act.includes('remove') || act.includes('cancel')) return 'badge-danger';
    if (act.includes('pick') || act.includes('adjustment')) return 'badge-warning';
    return 'badge-primary';
  };

  return (
    <div className="dashboard-page">
      <div className="flex-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1>Operations Center</h1>
          <p className="text-muted">High-level telemetry and warehouse health overview.</p>
        </div>
        <div className="flex-between gap-sm">
          <Link to="/scanner" className="button success">
            <span>📷</span> Scanner UI
          </Link>
          <Link to="/inventory" className="button secondary">
            Inventory
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
          <div className="loading-spinner"></div>
          <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Synchronizing cluster data...</p>
        </div>
      ) : (
        <>
          <div className="grid">
            <div className="card">
              <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
                <label>Stock Items</label>
                <span style={{ fontSize: '20px' }}>📦</span>
              </div>
              <div className="font-bold" style={{ fontSize: 'var(--font-xxl)', color: 'var(--color-primary)' }}>{stats.inventoryCount}</div>
              <div className="text-muted" style={{ fontSize: '12px', marginTop: 'var(--space-xs)' }}>
                Managed across {stats.warehouseCount} facilities
              </div>
            </div>

            <div className="card">
              <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
                <label>Pending Orders</label>
                <span style={{ fontSize: '20px' }}>🚚</span>
              </div>
              <div className="font-bold" style={{ fontSize: 'var(--font-xxl)', color: 'var(--color-warning)' }}>{stats.orderCount}</div>
              <div className="text-muted" style={{ fontSize: '12px', marginTop: 'var(--space-xs)' }}>
                Awaiting physical fulfillment
              </div>
            </div>

            <div className="card">
              <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
                <label>Warehouses</label>
                <span style={{ fontSize: '20px' }}>🏢</span>
              </div>
              <div className="font-bold" style={{ fontSize: 'var(--font-xxl)', color: 'var(--color-success)' }}>{stats.warehouseCount}</div>
              <div className="text-muted" style={{ fontSize: '12px', marginTop: 'var(--space-xs)' }}>
                Active distribution centers
              </div>
            </div>

            <div className="card">
              <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
                <label>Active Staff</label>
                <span style={{ fontSize: '20px' }}>👥</span>
              </div>
              <div className="font-bold" style={{ fontSize: 'var(--font-xxl)', color: 'var(--color-secondary)' }}>{stats.userCount}</div>
              <div className="text-muted" style={{ fontSize: '12px', marginTop: 'var(--space-xs)' }}>
                Users with system authorization
              </div>
            </div>
          </div>

          <section style={{ marginTop: 'var(--space-xl)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
              <h2>Recent Operational Logs</h2>
              <Link to="/audit-logs" className="text-primary font-bold" style={{ fontSize: '12px', textDecoration: 'none' }}>
                View Full Logs →
              </Link>
            </div>
            
            <div className="table-container">
              {recentActivity.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Operator</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Reason / Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td style={{ width: '180px', fontSize: '12px' }} className="text-muted">
                          {new Date(activity.created_at).toLocaleString()}
                        </td>
                        <td>
                          <Link to={`/users/${activity.user_id}`} className="text-primary font-bold" style={{ textDecoration: 'none' }}>
                            {activity.username}
                          </Link>
                        </td>
                        <td>
                          <span className={`badge ${getActionBadge(activity.action)}`}>
                            {activity.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="font-bold" style={{ fontSize: '12px' }}>{activity.entity}</div>
                          {activity.details?.sku && (
                            <div className="text-muted" style={{ fontSize: '10px' }}>
                              SKU: {activity.details.sku}
                            </div>
                          )}
                        </td>
                        <td className="text-muted" style={{ fontStyle: 'italic', fontSize: '12px' }}>
                          {activity.reason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                   <p>No recent activity detected in the cluster.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Dashboard;
