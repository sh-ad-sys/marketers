import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

export default function ResetAdminPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const portal = params.get('portal') || 'ledger';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const linkValid = useMemo(() => !!token && !!email, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!linkValid) {
      setError('Reset link is invalid.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.resetPassword('admin', email, token, password, { portal });
      if (!result.success) {
        setError(result.message || 'Failed to reset password.');
        return;
      }
      setSuccess('Password reset successful. You can now login.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-dashboard">
      <div className="user-dashboard-header" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>PlotConnectLedger</h1>
          <p className="user-subtitle">Reset ledger password</p>
        </div>
      </div>

      <div className="user-card" style={{ maxWidth: '500px', margin: '0 auto', width: '92%' }}>
        <h2 className="user-card-title">Set Ledger Password</h2>

        {!linkValid && <div className="user-alert user-alert-error">Reset link is missing token or email.</div>}
        {error && <div className="user-alert user-alert-error">{error}</div>}
        {success && <div className="user-alert user-alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="user-form-group">
            <label>Email</label>
            <input type="email" className="input" value={email} disabled />
          </div>

          <div className="user-form-group">
            <label>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                style={{ paddingRight: '3rem' }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </div>

          <div className="user-form-group">
            <label>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                style={{ paddingRight: '3rem' }}
              />
              <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !linkValid} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
