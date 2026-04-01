import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ChangeLedgerPasswordModal from './ChangeLedgerPasswordModal';
import '../../components/UserDashboard.css';

function portalLabel(portal) {
  return portal === 'ledger' ? 'Ledger' : 'Admin';
}

function adminStatus(admin) {
  if (Number(admin?.is_locked) === 1) {
    return {
      label: 'Locked',
      style: {
        background: '#fee2e2',
        color: '#b91c1c',
        border: '1px solid #fca5a5',
      },
    };
  }

  return {
    label: 'Active',
    style: {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    },
  };
}

export default function LedgerDashboard() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const displayName = localStorage.getItem('name') || localStorage.getItem('username') || 'Ledger Administrator';

  const loadAdmins = async () => {
    setLoading(true);
    setError('');

    const result = await api.getAdmins();
    if (!result.success) {
      setError(result.message || 'Failed to load admin accounts.');
      setLoading(false);
      return;
    }

    const rows = Array.isArray(result.data) ? result.data : [];
    rows.sort((left, right) => {
      if (left.portal === right.portal) {
        return Number(right.is_locked) - Number(left.is_locked);
      }

      return left.portal === 'ledger' ? -1 : 1;
    });

    setAdmins(rows);
    setLoading(false);
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const role = localStorage.getItem('role');

    if (!isLoggedIn || role !== 'admin') {
      navigate('/');
      return;
    }

    if (!localStorage.getItem('adminPortal')) {
      localStorage.setItem('adminPortal', 'ledger');
    }

    loadAdmins();
  }, [navigate]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSuccessMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const totals = useMemo(() => {
    const platformAdmins = admins.filter((admin) => admin.portal === 'admin');
    return {
      accounts: admins.length,
      lockedAdmins: platformAdmins.filter((admin) => Number(admin.is_locked) === 1).length,
      activeAdmins: platformAdmins.filter((admin) => Number(admin.is_locked) !== 1).length,
    };
  }, [admins]);

  const handleUnlock = async (admin) => {
    const confirmed = window.confirm(`Unlock ${admin.full_name || admin.email || 'this admin'}?`);
    if (!confirmed) {
      return;
    }

    setActionId(String(admin.id));
    setError('');

    const result = await api.unlockAdmin(admin.id);
    if (!result.success) {
      setError(result.message || 'Failed to unlock admin account.');
      setActionId('');
      return;
    }

    setSuccessMessage(result.message || 'Admin unlocked successfully.');
    await loadAdmins();
    setActionId('');
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/');
  };

  return (
    <div className="user-dashboard">
      {loading && (
        <div className="user-loading">
          <div className="user-loading-spinner"></div>
        </div>
      )}

      <div className="user-dashboard-header">
        <div>
          <h1>PlotConnect Ledger</h1>
          <p className="user-welcome">Hi, {displayName}</p>
          <p className="user-subtitle">Change the ledger password and unlock locked admin accounts from one place.</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={loadAdmins} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowChangePasswordModal(true)} disabled={loading}>
            Change Password
          </button>
          <button type="button" className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {successMessage && <div className="user-alert user-alert-success">{successMessage}</div>}
      {error && <div className="user-alert user-alert-error">{error}</div>}

      <div className="user-alert user-alert-success" style={{ marginBottom: '1.5rem' }}>
        Marketers now lock after more than 3 wrong passwords and admins now lock after more than 3 wrong passwords. Admins unlock marketers from the admin panel, and ledger unlocks locked admin accounts here.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { label: 'Accounts In View', value: totals.accounts, tone: '#4f46e5' },
          { label: 'Locked Admins', value: totals.lockedAdmins, tone: '#dc2626' },
          { label: 'Active Admins', value: totals.activeAdmins, tone: '#0f766e' },
        ].map((item) => (
          <div key={item.label} className="user-card">
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 600 }}>
              {item.label}
            </p>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: item.tone, marginTop: '0.6rem' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="user-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <h2 className="user-card-title" style={{ justifyContent: 'flex-start' }}>Admin Accounts</h2>
            <p style={{ margin: '0.5rem 0 0', color: '#6b7280' }}>
              Locked platform admins can only be unlocked from the ledger portal.
            </p>
          </div>
        </div>

        {admins.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No admin accounts were returned yet.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {admins.map((admin) => {
              const status = adminStatus(admin);
              const canUnlock = admin.portal === 'admin' && Number(admin.is_locked) === 1;

              return (
                <div key={admin.id || `${admin.email}-${admin.portal}`} className="user-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#1e1b4b' }}>{admin.full_name || admin.username || admin.email || 'Administrator'}</h3>
                      <p style={{ margin: '0.45rem 0 0', color: '#6b7280' }}>{admin.email || 'No email set'}</p>
                    </div>
                    <span
                      style={{
                        ...status.style,
                        borderRadius: '999px',
                        padding: '0.35rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ color: '#6b7280' }}>Portal</span>
                      <strong style={{ color: '#111827' }}>{portalLabel(admin.portal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ color: '#6b7280' }}>Username</span>
                      <strong style={{ color: '#111827' }}>{admin.username || 'Not set'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ color: '#6b7280' }}>Failed Attempts</span>
                      <strong style={{ color: '#111827' }}>{Number(admin.failed_login_attempts || 0)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={canUnlock ? 'btn btn-primary' : 'btn btn-secondary'}
                    onClick={() => handleUnlock(admin)}
                    disabled={!canUnlock || actionId === String(admin.id)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {actionId === String(admin.id) ? 'Unlocking...' : (canUnlock ? 'Unlock Admin' : (admin.portal === 'ledger' ? 'Ledger Account' : 'Active Account'))}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ChangeLedgerPasswordModal
        open={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={(message) => {
          setSuccessMessage(message);
          setShowChangePasswordModal(false);
        }}
      />
    </div>
  );
}
