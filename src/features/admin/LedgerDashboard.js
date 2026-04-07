import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../components/UserDashboard.css';

function formatDateTime(value, includeTime = true) {
  const raw = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const parsed = raw ? new Date(raw) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleString([], includeTime ? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  } : {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'KSh 0';
  }

  return `KSh ${amount.toLocaleString()}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paymentStatusLabel(status) {
  const normalizedStatus = String(status || 'unpaid').trim().toLowerCase();

  if (normalizedStatus === 'completed') return 'Paid';
  if (normalizedStatus === 'initiated') return 'Awaiting Confirmation';
  if (normalizedStatus === 'failed') return 'Failed';

  return 'Unpaid';
}

function paymentBadgeStyle(status) {
  const normalizedStatus = String(status || 'unpaid').trim().toLowerCase();

  if (normalizedStatus === 'completed') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    };
  }

  if (normalizedStatus === 'initiated') {
    return {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    };
  }

  if (normalizedStatus === 'failed') {
    return {
      background: '#fee2e2',
      color: '#b91c1c',
      border: '1px solid #fca5a5',
    };
  }

  return {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
  };
}

function propertyStatusLabel(status) {
  const normalizedStatus = String(status || 'pending').trim().toLowerCase();

  if (normalizedStatus === 'approved') return 'Approved';
  if (normalizedStatus === 'rejected') return 'Rejected';
  if (normalizedStatus === 'pending') return 'Pending';

  return normalizedStatus.replace(/\b\w/g, (char) => char.toUpperCase());
}

function propertyStatusStyle(status) {
  const normalizedStatus = String(status || 'pending').trim().toLowerCase();

  if (normalizedStatus === 'approved') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    };
  }

  if (normalizedStatus === 'rejected') {
    return {
      background: '#fee2e2',
      color: '#b91c1c',
      border: '1px solid #fca5a5',
    };
  }

  return {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
  };
}

function packageLabel(value) {
  const amount = Number(value);

  if (Number.isFinite(amount) && amount > 0) {
    return formatCurrency(amount);
  }

  const text = String(value || '').trim();
  return text || 'Not set';
}

function priorityBadgeStyle(priorityKey) {
  if (priorityKey === 'top_priority') {
    return {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    };
  }

  if (priorityKey === 'priority') {
    return {
      background: '#dbeafe',
      color: '#1d4ed8',
      border: '1px solid #93c5fd',
    };
  }

  return {
    background: '#ede9fe',
    color: '#6d28d9',
    border: '1px solid #c4b5fd',
  };
}

function marketerStatus(marketer) {
  if (marketer.is_blocked) {
    return {
      label: 'Blocked',
      style: {
        background: '#fee2e2',
        color: '#b91c1c',
        border: '1px solid #fca5a5',
      },
    };
  }

  if (marketer.is_authorized) {
    return {
      label: 'Authorized',
      style: {
        background: '#dcfce7',
        color: '#166534',
        border: '1px solid #86efac',
      },
    };
  }

  return {
    label: 'Pending',
    style: {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    },
  };
}

function buildWordDocument(ledger, marketers, showCycleOnly) {
  const summary = ledger?.summary || {};
  const cycleStartedAt = formatDateTime(ledger?.cycle_started_at);
  const generatedAt = formatDateTime(ledger?.generated_at);

  const marketerSections = marketers.map((marketer) => {
    const properties = showCycleOnly ? (marketer.cycle_properties || []) : (marketer.properties || []);
    const rows = properties.map((property) => `
      <tr>
        <td>${escapeHtml(property.property_name || 'Untitled')}</td>
        <td>${escapeHtml(property.property_location || property.area || property.county || 'N/A')}</td>
        <td>${escapeHtml(property.package_selected || 'Not set')}</td>
        <td>${escapeHtml(property.priority_label || 'Standard')}</td>
        <td>${escapeHtml(paymentStatusLabel(property.payment_status))}</td>
        <td>${escapeHtml(property.cycle_scope_label || (property.is_cycle_property ? 'This Week Payment' : 'History'))}</td>
        <td>${escapeHtml(formatDateTime(property.created_at))}</td>
      </tr>
    `).join('');

    return `
      <section style="margin: 0 0 24px;">
        <h2 style="margin: 0 0 8px; color: #312e81;">${escapeHtml(marketer.name || 'Unknown Marketer')}</h2>
        <p style="margin: 0 0 12px; color: #475569;">
          Phone: ${escapeHtml(marketer.phone || 'N/A')}
          <br />
          Email: ${escapeHtml(marketer.email || 'N/A')}
          <br />
          Total properties: ${escapeHtml(marketer.total_properties_count)}
          <br />
          Weekly properties: ${escapeHtml(marketer.cycle_properties_count)}
          <br />
          Weekly payment value: ${escapeHtml(formatCurrency(marketer.cycle_package_value_total || 0))}
        </p>
        <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #ede9fe;">
              <th align="left">Property</th>
              <th align="left">Location</th>
              <th align="left">Package</th>
              <th align="left">Priority</th>
              <th align="left">Payment</th>
              <th align="left">Scope</th>
              <th align="left">Added</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="7">${showCycleOnly ? 'No properties in this payment week.' : 'No property history available.'}</td></tr>`}
          </tbody>
        </table>
      </section>
    `;
  }).join('');

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Ledger Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px;">
      <h1 style="margin: 0 0 12px; color: #1d4ed8;">PlotConnect Ledger Report</h1>
      <p style="margin: 0 0 16px; color: #475569;">
        Cycle started: ${escapeHtml(cycleStartedAt)}
        <br />
        Generated: ${escapeHtml(generatedAt)}
      </p>
      <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
        <tbody>
          <tr>
            <th align="left" style="background: #eff6ff;">All Properties</th>
            <td>${escapeHtml(summary.properties_total || 0)}</td>
            <th align="left" style="background: #eff6ff;">Marketers In Cycle</th>
            <td>${escapeHtml(summary.marketers_with_cycle_properties || 0)}</td>
          </tr>
          <tr>
            <th align="left" style="background: #eff6ff;">All Package Value</th>
            <td>${escapeHtml(formatCurrency(summary.total_package_value_total || 0))}</td>
            <th align="left" style="background: #eff6ff;">Cycle Properties</th>
            <td>${escapeHtml(summary.cycle_properties_total || 0)}</td>
          </tr>
          <tr>
            <th align="left" style="background: #eff6ff;">Priority Score</th>
            <td>${escapeHtml(summary.cycle_priority_score_total || 0)}</td>
            <th align="left" style="background: #eff6ff;">Package Value</th>
            <td>${escapeHtml(formatCurrency(summary.cycle_package_value_total || 0))}</td>
          </tr>
        </tbody>
      </table>
      ${marketerSections || '<p>No marketers match the current filter.</p>'}
    </body>
  </html>`;
}

export default function LedgerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedLedger, setHasLoadedLedger] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showCycleOnly, setShowCycleOnly] = useState(false);
  const [expandedMarketers, setExpandedMarketers] = useState({});

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('role');

    if (!isLoggedIn || role !== 'admin') {
      navigate('/');
      return;
    }

    setUser({
      name: localStorage.getItem('name') || localStorage.getItem('username') || 'Admin',
      user_type: 'admin',
    });

    loadLedger();
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSuccessMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const filteredMarketers = useMemo(() => {
    const marketers = ledger?.marketers || [];
    const query = search.trim().toLowerCase();

    return marketers.filter((marketer) => {
      if (showCycleOnly && marketer.cycle_properties_count === 0) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        marketer.name,
        marketer.email,
        marketer.phone,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [ledger, search, showCycleOnly]);

  const loadLedger = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getLedger();
      if (!result.success) {
        setError(result.message || 'Failed to load ledger.');
        return;
      }

      setLedger(result.data || null);
      setExpandedMarketers((prev) => {
        if (Object.keys(prev).length > 0) {
          return prev;
        }

        const firstMarketerWithEntries = (result.data?.marketers || []).find(
          (marketer) => marketer.total_properties_count > 0
        );

        if (!firstMarketerWithEntries) {
          return {};
        }

        return { [firstMarketerWithEntries.id]: true };
      });
    } catch (loadError) {
      setError(loadError.message || 'Failed to load ledger.');
    } finally {
      setHasLoadedLedger(true);
      setLoading(false);
    }
  };

  const handleToggleMarketer = (marketerId) => {
    setExpandedMarketers((prev) => ({
      ...prev,
      [marketerId]: !prev[marketerId],
    }));
  };

  const handleRefreshWeekly = async () => {
    const confirmed = window.confirm(
      'Start a new weekly payment cycle now? All ledger history will remain visible, and only properties added after this moment will count for this week\'s payment.'
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const result = await api.refreshLedgerWeekly();
      if (!result.success) {
        setError(result.message || 'Failed to refresh ledger cycle.');
        return;
      }

      setSuccessMessage('Ledger cycle refreshed successfully.');
      await loadLedger();
    } catch (refreshError) {
      setError(refreshError.message || 'Failed to refresh ledger cycle.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportWord = () => {
    if (!ledger) {
      return;
    }

    const html = buildWordDocument(ledger, filteredMarketers, showCycleOnly);
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ledger-report-${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleLogout = async () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    await api.logout();
    navigate('/');
  };

  const summary = ledger?.summary || {};
  const visibleMarketerCount = filteredMarketers.length;
  const showBlockingLoader = loading && !hasLoadedLedger;
  const showRefreshIndicator = loading && hasLoadedLedger;

  return (
    <div className="user-dashboard ledger-shell">
      {showBlockingLoader && (
        <div className="user-loading">
          <div className="user-loading-spinner"></div>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#10b981',
            color: '#fff',
            padding: '1.25rem 2rem',
            borderRadius: '14px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
            zIndex: 9999,
          }}
        >
          {successMessage}
        </div>
      )}

      <div className="user-dashboard-header ledger-hero">
        <div className="ledger-hero-copy">
          <span className="ledger-kicker">Payment operations workspace</span>
          <h1>Ledger Dashboard</h1>
          {user && <p className="user-welcome">Hi, {user.name}</p>}
          <p className="user-subtitle">
            Full marketer property history with this week&apos;s payable plots isolated after refresh.
          </p>
          <div className="ledger-hero-meta">
            <span className="ledger-hero-chip">Cycle started {formatDateTime(ledger?.cycle_started_at)}</span>
            <span className="ledger-hero-chip ledger-hero-chip-muted">{visibleMarketerCount} marketers in view</span>
          </div>
        </div>
        <div className="ledger-hero-actions">
          {showRefreshIndicator && (
            <div className="dashboard-refresh-indicator" aria-live="polite">
              <span className="dashboard-refresh-spinner" aria-hidden="true"></span>
              Refreshing ledger...
            </div>
          )}
          <button type="button" onClick={loadLedger} className="btn btn-secondary" disabled={loading || actionLoading}>
            Reload
          </button>
          <button type="button" onClick={handleRefreshWeekly} className="btn btn-primary" disabled={loading || actionLoading}>
            {actionLoading ? 'Refreshing...' : 'Refresh Weekly'}
          </button>
          <button type="button" onClick={handleExportWord} className="btn btn-secondary" disabled={!ledger || loading}>
            Export Word
          </button>
          <button type="button" onClick={handleLogout} className="btn btn-danger">
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="user-alert user-alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="ledger-stat-grid">
        {[
          { label: 'All Properties', value: summary.properties_total || 0, tone: '#4f46e5', note: 'Historical submissions' },
          { label: 'New This Week', value: summary.cycle_properties_total || 0, tone: '#0f766e', note: 'Current payout cycle' },
          { label: 'All Package Value', value: formatCurrency(summary.total_package_value_total || 0), tone: '#0891b2', note: 'Lifetime package total' },
          { label: 'Weekly Payment Value', value: formatCurrency(summary.cycle_package_value_total || 0), tone: '#be185d', note: 'Expected current payout' },
        ].map((item, index) => (
          <div
            key={item.label}
            className="user-card ledger-stat-card"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <p className="ledger-stat-label">{item.label}</p>
            <div className="ledger-stat-value" style={{ color: item.tone }}>{item.value}</div>
            <p className="ledger-stat-note">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="user-card ledger-toolbar-card">
        <div className="ledger-toolbar">
          <div className="ledger-search-block">
            <label className="ledger-field-label">
              Search marketer
            </label>
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or phone"
            />
          </div>
          <div className="ledger-toggle-group">
            <button
              type="button"
              className={`btn btn-secondary ledger-toggle-button${showCycleOnly ? '' : ' is-active'}`}
              onClick={() => setShowCycleOnly(false)}
            >
              All Data
            </button>
            <button
              type="button"
              className={`btn btn-secondary ledger-toggle-button${showCycleOnly ? ' is-active' : ''}`}
              onClick={() => setShowCycleOnly(true)}
            >
              Payment Week Only
            </button>
          </div>
        </div>
        <p className="ledger-toolbar-note">
          Refresh Weekly does not remove old records. It only marks newly added properties after that moment as the ones to be paid in the current week.
        </p>
      </div>

      {filteredMarketers.length === 0 ? (
        <div className="user-card ledger-empty-state">
          No marketers match the current ledger filter.
        </div>
      ) : (
        <div className="ledger-marketer-grid">
          {filteredMarketers.map((marketer, index) => {
            const status = marketerStatus(marketer);
            const isExpanded = !!expandedMarketers[marketer.id];
            const visibleProperties = showCycleOnly ? (marketer.cycle_properties || []) : (marketer.properties || []);

            return (
              <div
                key={marketer.id}
                className="user-card ledger-marketer-card"
                style={{ animationDelay: `${Math.min(index * 80, 360)}ms` }}
              >
                <div className="ledger-marketer-header">
                  <div className="ledger-marketer-identity">
                    <h2 style={{ margin: 0, color: '#1e1b4b' }}>{marketer.name}</h2>
                    <p className="ledger-marketer-contact">
                      {marketer.phone || 'No phone'}
                      {' '}
                      {marketer.email ? `| ${marketer.email}` : ''}
                    </p>
                  </div>
                  <div className="ledger-pill-group">
                    <span
                      className="ledger-pill"
                      style={{
                        ...status.style,
                      }}
                    >
                      {status.label}
                    </span>
                    <span
                      className="ledger-pill"
                      style={{
                        background: '#eef2ff',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                      }}
                    >
                      Total Properties: {marketer.total_properties_count}
                    </span>
                  </div>
                </div>

                <div className="ledger-metric-grid">
                  <div className="ledger-metric-card">
                    <div className="ledger-metric-label">Total Properties</div>
                    <div className="ledger-metric-value" style={{ color: '#1d4ed8' }}>{marketer.total_properties_count}</div>
                  </div>
                  <div className="ledger-metric-card">
                    <div className="ledger-metric-label">New This Week</div>
                    <div className="ledger-metric-value" style={{ color: '#0f766e' }}>
                      {marketer.cycle_properties_count}
                    </div>
                  </div>
                  <div className="ledger-metric-card">
                    <div className="ledger-metric-label">All Package Value</div>
                    <div className="ledger-metric-value" style={{ color: '#0891b2' }}>
                      {formatCurrency(marketer.total_package_value_total)}
                    </div>
                  </div>
                  <div className="ledger-metric-card">
                    <div className="ledger-metric-label">Weekly Payment Value</div>
                    <div className="ledger-metric-value" style={{ color: '#be185d' }}>
                      {formatCurrency(marketer.cycle_package_value_total)}
                    </div>
                  </div>
                </div>

                <div className="ledger-pill-group" style={{ marginBottom: '1rem' }}>
                  {[
                    { key: 'standard', label: 'Standard' },
                    { key: 'priority', label: 'Priority' },
                    { key: 'top_priority', label: 'Top Priority' },
                  ].map((item) => (
                    <span
                      key={`${marketer.id}-${item.key}`}
                      className="ledger-pill"
                      style={{
                        ...priorityBadgeStyle(item.key),
                      }}
                    >
                      {item.label}: {showCycleOnly ? (marketer.cycle_priority_mix?.[item.key] || 0) : (marketer.priority_mix?.[item.key] || 0)}
                    </span>
                  ))}
                  <span
                    className="ledger-pill"
                    style={{
                      background: '#ecfeff',
                      color: '#155e75',
                      border: '1px solid #a5f3fc',
                    }}
                  >
                    Paid: {showCycleOnly ? marketer.cycle_paid_properties_count : marketer.total_paid_properties_count}
                  </span>
                  <span
                    className="ledger-pill"
                    style={{
                      background: '#fff7ed',
                      color: '#9a3412',
                      border: '1px solid #fdba74',
                    }}
                  >
                    Unpaid: {showCycleOnly ? marketer.cycle_unpaid_properties_count : marketer.total_unpaid_properties_count}
                  </span>
                </div>

                <div className="ledger-card-footer">
                  <p className="ledger-card-copy">
                    {marketer.total_properties_count > 0
                      ? (showCycleOnly
                        ? 'This table shows only the new properties that fall in the current payment week.'
                        : 'This table shows all property history, with this week\'s payable plots clearly tagged.')
                      : 'This marketer has no properties recorded yet.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary ledger-expand-button"
                    onClick={() => handleToggleMarketer(marketer.id)}
                    disabled={marketer.total_properties_count === 0}
                  >
                    {isExpanded ? 'Hide Properties' : (showCycleOnly ? 'View Payment Week' : 'View All Properties')}
                  </button>
                </div>

                {isExpanded && marketer.total_properties_count > 0 && (
                  <div className="ledger-expanded-panel">
                    <div className="user-rooms-table-wrapper ledger-table-shell">
                      <table className="user-rooms-table">
                        <thead>
                          <tr>
                            <th>Property</th>
                            <th>Location</th>
                            <th>Package</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Scope</th>
                            <th>Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleProperties.map((property) => (
                            <tr key={property.id}>
                              <td>{property.property_name || 'Untitled Property'}</td>
                              <td>{property.property_location || property.area || property.county || 'N/A'}</td>
                              <td>{packageLabel(property.package_selected)}</td>
                              <td>
                                <span
                                  className="ledger-table-badge"
                                  style={{
                                    ...priorityBadgeStyle(property.priority_key),
                                  }}
                                >
                                  {property.priority_label}
                                </span>
                              </td>
                              <td>
                                <span className="ledger-table-badge" style={propertyStatusStyle(property.status)}>
                                  {propertyStatusLabel(property.status)}
                                </span>
                              </td>
                              <td>
                                <span className="ledger-table-badge" style={paymentBadgeStyle(property.payment_status)}>
                                  {paymentStatusLabel(property.payment_status)}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="ledger-table-badge"
                                  style={{
                                    background: property.is_cycle_property ? '#dcfce7' : '#f1f5f9',
                                    color: property.is_cycle_property ? '#166534' : '#475569',
                                    border: property.is_cycle_property ? '1px solid #86efac' : '1px solid #cbd5e1',
                                  }}
                                >
                                  {property.cycle_scope_label || (property.is_cycle_property ? 'This Week Payment' : 'History')}
                                </span>
                              </td>
                              <td>{formatDateTime(property.created_at)}</td>
                            </tr>
                          ))}
                          {visibleProperties.length === 0 && (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '1.25rem', color: '#64748b' }}>
                                {showCycleOnly ? 'No properties fall inside the current payment week.' : 'No property history available.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
