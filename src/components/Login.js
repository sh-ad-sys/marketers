import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './UserDashboard.css';

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Unified login form
  const [loginData, setLoginData] = useState({
    identifier: '', // Can be name (marketer) or username (admin)
    password: ''
  });

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check if this is admin deployment
    const isAdminDeployment = window.location.hostname.includes('-admin') || 
                              window.location.hostname.includes('admin.');

    try {
      // First try admin login
      let result = await api.login('admin', {
        username: loginData.identifier,
        password: loginData.password
      });

      if (result.success) {
        // If admin login succeeds
        navigate('/admin');
        return;
      }

      // If admin fails, try marketer login
      // For marketers, identifier is the name
      result = await api.login('marketer', {
        name: loginData.identifier,
        password: loginData.password
      });

      if (result.success) {
        // If marketer login succeeds
        navigate('/dashboard');
        return;
      }

      // If both fail
      setError('Invalid credentials. Please check your username/name and password.');
      
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-dashboard">
      <div className="user-dashboard-header" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>PlotConnect</h1>
          <p className="user-subtitle">Sign in to manage your properties</p>
        </div>
      </div>

      <div className="user-card" style={{ maxWidth: '420px', margin: '0 auto', width: '90%' }}>
        <h2 className="user-card-title">Login</h2>

        {error && (
          <div className="user-alert user-alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Unified Login Form */}
        <form onSubmit={handleLogin}>
          <div className="user-form-group">
            <label>Username</label>
            <input
              type="text"
              className="input"
              value={loginData.identifier}
              onChange={(e) => setLoginData({...loginData, identifier: e.target.value})}
              placeholder="Enter username"
              required
            />
          </div>
          
          <div className="user-form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                placeholder="Enter your password"
                required
                style={{ paddingRight: '4rem' }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#6366f1',
                  fontSize: '1rem'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: '#6366f1', 
                textDecoration: 'underline',
                padding: 0,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
              onClick={() => alert('Please contact your administrator to reset your password.')}
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        
      </div>
    </div>
  );
}

export default Login;
