import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import './App.css';
import ProtectedRoute from './features/shared/ProtectedRoute';
import AdminLogin from './features/admin/AdminLogin';
import LedgerDashboard from './features/admin/LedgerDashboard';
import ForgotAdminPassword from './features/admin/ForgotAdminPassword';
import ResetAdminPassword from './features/admin/ResetAdminPassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotAdminPassword />} />
        <Route path="/reset-password" element={<ResetAdminPassword />} />
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
        <Route path="/plotconnect-ledger" element={<Navigate to="/" replace />} />
        <Route path="/plotconnect-ledger/dashboard" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/admin-login" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
