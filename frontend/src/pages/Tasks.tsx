import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

function TaskManagement() {
  const { notify } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningTask, setAssigningTask] = useState<any>(null);
  const [noteTask, setNoteTask] = useState<any>(null);
  const [noteContent, setNoteContent] = useState('');
  const [newTaskData, setNewTaskData] = useState({ type: 'pick', assigned_to: '', payload: { target: '' }, notes: '' });
  const [users, setUsers] = useState<any[]>([]);

  const fetchTasks = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTasks(data.data || (Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch(() => {
        notify('Failed to sync workflow queue', 'error');
        setLoading(false);
      });
  };

  const fetchUsers = () => {
    const token = localStorage.getItem('token');
    fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data.data || []));
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [notify]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newTaskData,
          payload: JSON.stringify(newTaskData.payload)
        }),
      });
      if (res.ok) {
        notify('Operational task initialized successfully');
        setShowAddModal(false);
        setNewTaskData({ type: 'pick', assigned_to: '', payload: { target: '' }, notes: '' });
        fetchTasks();
      } else {
        const data = await res.json();
        notify(data.error || 'Task initialization failed', 'error');
      }
    } catch (err) {
      notify('Network error during task creation', 'error');
    }
  };

  const updateTask = async (taskId: number, payload: any) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        notify('Task telemetry updated');
        setAssigningTask(null);
        setNoteTask(null);
        setNoteContent('');
        fetchTasks();
      } else {
        const data = await res.json();
        notify(data.error || 'Update failed', 'error');
      }
    } catch (err) {
      notify('Network error during update', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'badge-success';
      case 'in_progress': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-primary';
    }
  };

  return (
    <div className="tasks-page">
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1>Operations Queue</h1>
          <p className="text-muted">Orchestrate logistics workflows: Picking, Packing, and Stock Audits.</p>
        </div>
        <button className="button" onClick={() => setShowAddModal(true)}>
          <span style={{ fontSize: '18px' }}>+</span> New Operation
        </button>
      </header>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Initialize Operation</h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-md)', fontSize: '13px' }}>
              Define a new operational requirement for the warehouse floor.
            </p>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>PROTOCOL TYPE</label>
                <select 
                  className="input"
                  value={newTaskData.type} 
                  onChange={e => setNewTaskData({...newTaskData, type: e.target.value})}
                  style={{ fontWeight: 700 }}
                >
                  <option value="pick">PICKING (Order Fulfillment)</option>
                  <option value="pack">PACKING (Shipping Prep)</option>
                  <option value="put_away">PUT AWAY (Inbound Logistics)</option>
                  <option value="cycle_count">CYCLE COUNT (Inventory Audit)</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>CONTEXTUAL TARGET (Order #, SKU, Zone)</label>
                <input 
                  className="input"
                  type="text" 
                  value={newTaskData.payload.target} 
                  onChange={e => setNewTaskData({...newTaskData, payload: { target: e.target.value }})}
                  placeholder="e.g. ORD-102 or SKU-AB-12"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>PRELIMINARY NOTES</label>
                <textarea 
                  className="input"
                  value={newTaskData.notes} 
                  onChange={e => setNewTaskData({...newTaskData, notes: e.target.value})}
                  placeholder="Additional instructions or discovery context..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                <button type="submit" className="button" style={{ flex: 1 }}>Deploy Task</button>
                <button type="button" className="button secondary" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Discard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningTask && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Delegate Task #{assigningTask.id}</h2>
            <div className="form-group">
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>SELECT OPERATOR</label>
              <select 
                className="input"
                onChange={e => updateTask(assigningTask.id, { assigned_to: e.target.value })}
                style={{ fontWeight: 700 }}
              >
                <option value="">Choose User...</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <button className="button secondary" onClick={() => setAssigningTask(null)} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>Cancel</button>
          </div>
        </div>
      )}

      {noteTask && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Operational Discovery Note</h2>
            <div className="form-group">
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>LOG DISCOVERY (e.g. Bin empty, Damages)</label>
              <textarea 
                className="input"
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Describe current physical state or issues..."
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="button" onClick={() => updateTask(noteTask.id, { notes: noteContent })} style={{ flex: 1 }}>Commit Note</button>
              <button className="button secondary" onClick={() => setNoteTask(null)} style={{ flex: 1 }}>Abort</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="flex-between" style={{ justifyContent: 'center', minHeight: '300px', flexDirection: 'column' }}>
            <div className="loading-spinner"></div>
            <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Retrieving operational mesh backlog...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Queue ID</th>
                <th>Operation / Context</th>
                <th>Status</th>
                <th>Operator</th>
                <th>Discovery Notes</th>
                <th style={{ textAlign: 'right' }}>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task: any) => {
                const payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload;
                const assignedUser = (users as any[]).find((u: any) => String(u.id) === String(task.assigned_to));
                
                return (
                  <tr key={task.id}>
                    <td style={{ width: '100px' }}><code>#{task.id}</code></td>
                    <td>
                      <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{task.type.replace('_', ' ')}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>CONTEXT: <span className="text-primary font-bold">{payload?.target || payload?.order_id || payload?.sku || '--'}</span></div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(task.status)}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {assignedUser ? (
                        <Link to={`/users/${assignedUser.id}`} className="text-primary font-bold" style={{ textDecoration: 'none' }}>
                          {assignedUser.username}
                        </Link>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>PENDING ASSIGNMENT</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <div className="text-muted" style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.notes || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No recorded observations</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex-between" style={{ gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="button secondary" 
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                          onClick={() => { setNoteTask(task); setNoteContent(task.notes || ''); }}
                        >
                          Note
                        </button>
                        {task.status !== 'completed' && (
                          <button 
                            className="button secondary" 
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                            onClick={() => setAssigningTask(task)}
                          >
                            Delegate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }} className="text-muted">
                    Workflow queue is currently optimized and empty.
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

export default TaskManagement;
