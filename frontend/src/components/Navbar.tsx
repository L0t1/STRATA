import React from 'react';
import { NavLink } from 'react-router-dom';

function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <NavLink to="/dashboard" className="brand" onClick={closeMenu}>
          <img src="/logo.svg" alt="STRATA" style={{ height: '32px' }} />
        </NavLink>

        <button className={`hamburger ${isOpen ? 'active' : ''}`} onClick={toggleMenu} aria-label="Toggle menu">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        <div className={`nav-links ${isOpen ? 'open' : ''}`}>
          <NavLink to="/dashboard" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
          <NavLink to="/inventory" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Inventory</NavLink>
          <NavLink to="/orders" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Orders</NavLink>
          <NavLink to="/tasks" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Tasks</NavLink>
          <NavLink to="/warehouses" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Warehouses</NavLink>
          <NavLink to="/locations" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Locations</NavLink>
          <NavLink to="/replenishment" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Replenishment</NavLink>
          <NavLink to="/reports" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Reports</NavLink>
          <NavLink to="/cycle-counts" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Cycle Counts</NavLink>
          <NavLink to="/audit-logs" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Audit Logs</NavLink>
          <NavLink to="/users" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Users</NavLink>
          <NavLink to="/scanner" onClick={closeMenu} className={({ isActive }) => isActive ? 'active' : ''}>Scanner</NavLink>
          <button 
            onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
            className="button secondary logout-btn"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
