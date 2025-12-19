import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';

function Reports() {
  const { notify } = useNotification();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/reports', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch(() => {
        notify('Failed to load analytic modules', 'error');
        setLoading(false);
      });
  }, [notify]);

  const handleReportClick = (report: any) => {
    setSelectedReport(report);
    setReportLoading(true);
    const token = localStorage.getItem('token');

    fetch(report.endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setReportData(Array.isArray(data) ? data : (data.data || [data]));
        setReportLoading(false);
        notify(`${report.name} analysis generated`);
      })
      .catch(() => {
        setReportLoading(false);
        notify('Failed to compile report telemetry', 'error');
      });
  };

  return (
    <div className="reports-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>Intelligence Terminal</h1>
          <p className="text-muted">High-fidelity data visualization and operational forensics.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex-between" style={{ justifyContent: 'center', minHeight: '400px', flexDirection: 'column' }}>
          <div className="loading-spinner"></div>
          <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Booting analytic sub-systems...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '320px 1fr' : '1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
          <aside className="card" style={{ padding: 'var(--space-md)', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }}>
            <h2 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', letterSpacing: '1px' }}>AVAILABLE PROTOCOLS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-sm)' }}>
              {reports.map((report) => (
                <div 
                  key={report.endpoint}
                  className={`card ${selectedReport?.endpoint === report.endpoint ? 'active' : ''}`}
                  onClick={() => handleReportClick(report)}
                  style={{ 
                    cursor: 'pointer', 
                    padding: 'var(--space-md)',
                    border: selectedReport?.endpoint === report.endpoint ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: selectedReport?.endpoint === report.endpoint ? 'rgba(99, 102, 241, 0.05)' : 'var(--color-surface)',
                    transition: 'all 0.2s ease',
                    margin: 0
                  }}
                >
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>{report.name}</h3>
                    {selectedReport?.endpoint === report.endpoint && <div className="loading-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>}
                  </div>
                  <p className="text-muted" style={{ fontSize: '12px', lineHeight: '1.4' }}>{report.description || 'Standard system diagnostic report.'}</p>
                </div>
              ))}
            </div>
          </aside>


          <main>
            {!selectedReport && (
              <div className="card" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: 'var(--space-md)', filter: 'grayscale(1) opacity(0.3)' }}>📉</div>
                  <h3 className="text-muted">Select Intel Module</h3>
                  <p className="text-muted" style={{ maxWidth: '300px' }}>Choose a diagnostic protocol from the left to visualize real-time warehouse metrics.</p>
                </div>
              </div>
            )}

            {selectedReport && (
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-alt)' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{selectedReport.name}</h3>
                    <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>ACTIVE TELEMETRY STREAM</p>
                  </div>
                  <button className="button secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setSelectedReport(null)}>Terminate View</button>
                </div>
                {reportLoading ? (
                  <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
                    <div className="loading-spinner"></div>
                    <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Compiling database records...</p>
                  </div>
                ) : (
                  <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
                    <table style={{ margin: 0 }}>
                      <thead style={{ background: 'var(--color-surface)' }}>
                        <tr>
                          {reportData.length > 0 && Object.keys(reportData[0]).map(key => (
                            <th key={key} style={{ textTransform: 'uppercase', fontSize: '11px' }}>{key.replace('_', ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} style={{ 
                                fontSize: '13px', 
                                fontWeight: typeof val === 'number' ? 800 : 400,
                                color: typeof val === 'number' ? 'var(--color-primary)' : 'inherit'
                              }}>
                                {typeof val === 'object' && val !== null 
                                  ? <code style={{ fontSize: '10px' }}>{JSON.stringify(val)}</code> 
                                  : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reportData.length === 0 && (
                      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }} className="text-muted">
                        Module returned zero observations for this period.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default Reports;
