import Footer from './components/Footer';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Warehouses from './pages/Warehouses';
import Locations from './pages/Locations';
import Reports from './pages/Reports';
import CycleCounts from './pages/CycleCounts';
import MobileScannerUI from './pages/MobileScannerUI';
import Replenishment from './pages/Replenishment';
import AuditLogs from './pages/AuditLogs';
import TaskManagement from './pages/Tasks';

import ProtectedRoute from './components/ProtectedRoute';
import UserDetail from './pages/UserDetail';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <div className="app-layout">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/tasks" element={<TaskManagement />} />
                  <Route path="/warehouses" element={<Warehouses />} />
                  <Route path="/locations" element={<Locations />} />
                  <Route path="/replenishment" element={<Replenishment />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/cycle-counts" element={<CycleCounts />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/users/:id" element={<UserDetail />} />
                  <Route path="/scanner" element={<MobileScannerUI />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
