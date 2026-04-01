import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../components/UserDashboard.css';

function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1.5 12C3.5 7.5 7.4 4.5 12 4.5C16.6 4.5 20.5 7.5 22.5 12C20.5 16.5 16.6 19.5 12 19.5C7.4 19.5 3.5 16.5 1.5 12Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 5.1C11.1 5 11.5 5 12 5C16.6 5 20.5 8 22.5 12C21.8 13.5 20.8 14.8 19.6 15.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.1 14.1C13.5 14.7 12.8 15 12 15C10.3 15 9 13.7 9 12C9 11.2 9.3 10.5 9.9 9.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.2 6.2C4.2 7.5 2.6 9.5 1.5 12C3.5 16.5 7.4 19.5 12 19.5C13.8 19.5 15.5 19 17 18.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('techswifttrix361@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login('admin', { email: email.trim(), password, portal: 'admin' });

      if (!result.success) {
        setError(result.message || 'Invalid admin credentials.');
        return;
      }

      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('username', result.data?.username || result.data?.email || result.username || email.trim());
      localStorage.setItem('name', result.data?.full_name || result.data?.name || result.data?.username || 'Admin');
      if (result.data?.token || result.token) {
        localStorage.setItem('token', result.data?.token || result.token);
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
          <p className="user-subtitle">Primary admin control room</p>
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
              placeholder="techswifttrix361@gmail.com"
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
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.25rem' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: '0.85rem', textAlign: 'right' }}>
          <a href="/forgot-password" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
