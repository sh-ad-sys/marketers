import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../components/UserDashboard.css';

export default function AdminLogin() {
  const marketerAppUrl = (process.env.REACT_APP_USER_APP_URL || 'http://localhost:3000').trim();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login('admin', { email: email.trim(), password });

      if (!result.success) {
        setError(result.message || 'Invalid admin credentials.');
        return;
      }

      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('username', result.data?.email || result.username || email.trim());
      localStorage.setItem('name', result.data?.name || 'Admin');
      if (result.token) {
        localStorage.setItem('token', result.token);
      }

      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-dashboard">
      <div className="user-dashboard-header" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>PlotConnect</h1>
          <p className="user-subtitle">Admin login</p>
        </div>
      </div>

      <div className="user-card" style={{ maxWidth: '450px', margin: '0 auto', width: '90%' }}>
        <h2 className="user-card-title">Admin Login</h2>

        {error && <div className="user-alert user-alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="user-form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email"
              required
            />
          </div>

          <div className="user-form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ paddingRight: '4rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: '#6366f1',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.25rem' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <a href={marketerAppUrl} style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
            Marketer login
          </a>
        </div>
      </div>
    </div>
  );
}

