import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../components/UserDashboard.css';

export default function ForgotAdminPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await api.requestPasswordReset('admin', email.trim());
      if (!result.success) {
        setError(result.message || 'Unable to send reset link.');
        return;
      }
      setSuccess('If the email exists, a reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-dashboard">
      <div className="user-dashboard-header" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>PlotConnect</h1>
          <p className="user-subtitle">Forgot password</p>
        </div>
      </div>

      <div className="user-card" style={{ maxWidth: '450px', margin: '0 auto', width: '90%' }}>
        <h2 className="user-card-title">Reset Admin Password</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Enter your admin email to receive a reset link.
        </p>

        {error && <div className="user-alert user-alert-error">{error}</div>}
        {success && <div className="user-alert user-alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="user-form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your admin email"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
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
