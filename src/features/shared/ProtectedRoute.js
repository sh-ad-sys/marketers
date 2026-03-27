import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, role, redirectTo }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const storedRole = localStorage.getItem('role');

  if (!isLoggedIn || (role && storedRole !== role)) {
    return <Navigate to={redirectTo || '/'} replace />;
  }

  return children;
}
