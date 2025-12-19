import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

function AuditLogs() {
  const { notify } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/audit-log', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setLogs(data.data || (Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch(() => {
        notify('Failed to sync security audit trail', 'error');
        setLoading(false);
      });
  }, [notify]);

  const getActionBadge = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('adjustment') || a.includes('update')) return 'badge-warning';
    if (a.includes('fulfillment') || a.includes('shipped') || a.includes('create')) return 'badge-success';
    if (a.includes('delete') || a.includes('purge') || a.includes('failed')) return 'badge-danger';
    return 'badge-primary';
  };

  return (
    <div className="audit-logs-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>Immutable Audit Ledger</h1>
          <p className="text-muted">High-fidelity forensic record of all critical system transactions and security events.</p>
        </div>
        <div className="badge badge-danger" style={{ fontWeight: 800, fontSize: '11px', letterSpacing: '1px' }}>CLOAKED LOGGING ACTIVE</div>
      </header>

      {selectedDetails && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Event Forensics</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Detailed metadata payload for transaction <strong>#{selectedDetails.id}</strong>
            </p>
            <div style={{ marginTop: 'var(--space-md)', background: 'var(--color-bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              {Object.entries(selectedDetails).map(([key, value]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 'var(--space-md)', padding: '10px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                  <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
            <button className="button secondary" onClick={() => setSelectedDetails(null)} style={{ marginTop: 'var(--space-lg)', width: '100%' }}>Terminate Inspection</button>
          </div>
        </div>
      )}


      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '400px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Synchronizing forensic data stream...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Protocol</th>
                <th>Entity Target</th>
                <th>Justification</th>
                <th style={{ textAlign: 'right' }}>Forensics</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '11px', width: '160px' }} className="text-muted">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td>
                    <Link to={`/users/${log.user_id}`} className="text-primary font-bold" style={{ textDecoration: 'none' }}>
                      {log.username?.toUpperCase() || `ID:${log.user_id}`}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${getActionBadge(log.action)}`} style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{log.entity.toUpperCase()}</div>
                    {log.details?.sku && (
                      <div className="text-muted" style={{ fontSize: '10px' }}>
                        SKU: <span className="text-primary">{log.details.sku}</span>
                      </div>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontStyle: 'italic', fontSize: '12px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.reason || log.details?.note || 'Standard system event'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="button secondary" 
                      style={{ padding: '6px 12px', fontSize: '10px' }} 
                      onClick={() => setSelectedDetails({
                        id: log.id,
                        timestamp: new Date(log.created_at).toLocaleString(),
                        operator: log.username,
                        action: log.action.toUpperCase(),
                        entity: log.entity,
                        ...log.details,
                        reason: log.reason
                      })}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    No forensic records discovered in the current security period.
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

export default AuditLogs;
