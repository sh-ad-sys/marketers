import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './UserDashboard.css';

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    identifier: '',
    password: ''
  });

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Attempt admin login
      let result = await api.login('admin', {
        username: loginData.identifier,
        password: loginData.password
      });

      if (result.success) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('role', 'admin');
        localStorage.setItem('username', result.data?.username || result.username || 'admin');
        navigate('/admin');
        return;
      }

      // Attempt marketer login
      result = await api.login('marketer', {
        name: loginData.identifier,
        password: loginData.password
      });

      if (result.success) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('role', 'marketer');
        localStorage.setItem('name', result.data?.name || result.name || loginData.identifier);
        navigate('/dashboard');
        return;
      }

      setError('Invalid credentials. Please check your username/name and password.');
    } catch (err) {
      console.error('Login error:', err);
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
        {/* Centered Login heading */}
        <h2 className="user-card-title" style={{ textAlign: 'center' }}>Login</h2>

        {error && (
          <div className="user-alert user-alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="user-form-group">
            <label>Username / Name</label>
            <input
              type="text"
              className="input"
              value={loginData.identifier}
              onChange={(e) =>
                setLoginData({ ...loginData, identifier: e.target.value })
              }
              placeholder="Enter username or name"
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
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
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
                  fontSize: '0.9rem'
                }}
              >
                {showPassword ? '●' : '○'}
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
              onClick={() =>
                alert('Please contact your administrator to reset your password.')
              }
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '1.5rem' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;