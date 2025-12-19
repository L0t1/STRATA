import React from 'react';
import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/dashboard" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/logo.svg" alt="STRATA" style={{ height: '32px' }} />
      </NavLink>
      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
        <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>Inventory</NavLink>
        <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>Orders</NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>Tasks</NavLink>
        <NavLink to="/warehouses" className={({ isActive }) => isActive ? 'active' : ''}>Warehouses</NavLink>
        <NavLink to="/locations" className={({ isActive }) => isActive ? 'active' : ''}>Locations</NavLink>
        <NavLink to="/replenishment" className={({ isActive }) => isActive ? 'active' : ''}>Replenishment</NavLink>
        <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>Reports</NavLink>
        <NavLink to="/cycle-counts" className={({ isActive }) => isActive ? 'active' : ''}>Cycle Counts</NavLink>
        <NavLink to="/audit-logs" className={({ isActive }) => isActive ? 'active' : ''}>Audit Logs</NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>Users</NavLink>
        <NavLink to="/scanner" className={({ isActive }) => isActive ? 'active' : ''}>Scanner</NavLink>
        <button 
          onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
          className="button secondary"
          style={{ padding: '4px 12px', fontSize: '13px', marginLeft: 'var(--space-md)' }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
