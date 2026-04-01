import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import './App.css';
import ProtectedRoute from './features/shared/ProtectedRoute';
import AdminLogin from './features/admin/AdminLogin';
import ForgotAdminPassword from './features/admin/ForgotAdminPassword';
import ResetAdminPassword from './features/admin/ResetAdminPassword';
import LedgerDashboard from './features/admin/LedgerDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotAdminPassword />} />
        <Route path="/reset-password" element={<ResetAdminPassword />} />
        <Route path="/plotconnect" element={<Navigate to="/" replace />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin" redirectTo="/">
              <LedgerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="admin" redirectTo="/">
              <LedgerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ledger"
          element={
            <ProtectedRoute role="admin" redirectTo="/">
              <LedgerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/plotconnect/admin" element={<Navigate to="/admin" replace />} />

        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/admin-login" element={<Navigate to="/" replace />} />
        <Route path="/user-login" element={<Navigate to="/" replace />} />
        <Route path="/plotconnectmarketers" element={<Navigate to="/" replace />} />
        <Route path="/plotconnectmarketers/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/plotconnectmarketers/set-password" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
