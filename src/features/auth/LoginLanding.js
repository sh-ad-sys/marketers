import React from 'react';
import { Link } from 'react-router-dom';
import '../../components/UserDashboard.css';

export default function LoginLanding() {
  return (
    <div className="user-dashboard">
      <div className="user-dashboard-header" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>PlotConnect</h1>
          <p className="user-subtitle">Choose your login portal</p>
        </div>
      </div>

      <div className="user-form-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="user-card" style={{ textAlign: 'center' }}>
          <h2 className="user-card-title">Marketer Portal</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>
            Login with email or phone number and password.
          </p>
          <Link to="/plotconnectmarketers" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Go to PlotConnectMarketers
          </Link>
        </div>

        <div className="user-card" style={{ textAlign: 'center' }}>
          <h2 className="user-card-title">Admin Portal</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>
            Login with admin email and password.
          </p>
          <Link to="/plotconnect" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Go to PlotConnect Admin
          </Link>
        </div>
      </div>
    </div>
  );
}

