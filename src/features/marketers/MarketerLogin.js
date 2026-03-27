import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../components/UserDashboard.css';

export default function MarketerLogin() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const value = identifier.trim();
    const isEmail = value.includes('@');

    try {
      const result = await api.login('marketer', {
        email: isEmail ? value : '',
        phone: isEmail ? '' : value,
        password,
      });

      if (!result.success) {
        setError(result.message || 'Invalid credentials.');
        return;
      }

      const hasBlockedFlag = Object.prototype.hasOwnProperty.call(result.data || {}, 'is_blocked');
      const hasAuthorizedFlag = Object.prototype.hasOwnProperty.call(result.data || {}, 'is_authorized');
      const isBlocked = hasBlockedFlag && Number(result.data?.is_blocked) === 1;
      const isAuthorized = hasAuthorizedFlag ? Number(result.data?.is_authorized) === 1 : true;
      if (isBlocked || !isAuthorized) {
        setError('Not authorized. Contact admin.');
        return;
      }

      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('role', 'marketer');
      localStorage.setItem('name', result.data?.name || result.name || value);
      if (hasAuthorizedFlag) {
        localStorage.setItem('isAuthorized', String(result.data?.is_authorized ?? 0));
      }
      const mustChangePassword = Number(result.data?.must_change_password || 0) === 1;
      localStorage.setItem('mustChangePassword', mustChangePassword ? '1' : '0');
      if (result.data?.marketer_id) {
        localStorage.setItem('marketerId', result.data.marketer_id);
      }
      if (result.token) {
        localStorage.setItem('token', result.token);
      }

      if (mustChangePassword) {
        navigate('/plotconnectmarketers/set-password');
      } else {
        navigate('/plotconnectmarketers/dashboard');
      }
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
          <h1>PlotConnectMarketers</h1>
          <p className="user-subtitle">Marketer login</p>
        </div>
      </div>

      <div className="user-card" style={{ maxWidth: '450px', margin: '0 auto', width: '90%' }}>
        <h2 className="user-card-title">Marketer Login</h2>

        {error && <div className="user-alert user-alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="user-form-group">
            <label>Email Or Phone Number</label>
            <input
              type="text"
              className="input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter email or phone number"
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
          <Link to="/plotconnect" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
            Admin login
          </Link>
        </div>
      </div>
    </div>
  );
}

