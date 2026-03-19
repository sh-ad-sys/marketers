import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// Component to handle URL-based routing
function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const hostname = window.location.hostname;
    
    // If accessing admin subdomain, redirect to admin
    if (hostname.includes('admin')) {
      if (location.pathname !== '/admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [navigate, location]);

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Default route - redirect based on hostname */}
        <Route path="/" element={<RootRouter />} />
      </Routes>
    </div>
  );
}

// Separate component to handle root redirect
function RootRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const hostname = window.location.hostname;
    
    // If accessing admin subdomain, redirect to admin dashboard
    if (hostname.includes('admin')) {
      navigate('/admin', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return null;
}

function App() {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
}

export default App;
