import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './UserDashboard.css';

export default function AdminDashboard() {
  const [tab, setTab] = useState('marketers');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [marketers, setMarketers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMarketer, setSelectedMarketer] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [newMarketer, setNewMarketer] = useState({ name: '', email: '', phone: '' });
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => { init(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const init = async () => {
    setLoading(true);
    try {
      // Use localStorage as primary auth source (set during login)
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const role = localStorage.getItem('role');

      if (!isLoggedIn || role !== 'admin') {
        navigate('/login');
        return;
      }

      // Set user from localStorage immediately so UI renders
      setUser({
        name: localStorage.getItem('name') || localStorage.getItem('username') || 'Admin',
        user_type: 'admin'
      });

      // Try to refresh from server, but don't redirect if it fails
      try {
        const res = await api.checkAuth();
        if (res.success && res.data) {
          setUser(res.data);
        }
      } catch {
        // Session may not persist cross-origin — that's OK, localStorage handles auth
      }

      loadData();
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const s = await api.getAdminStats();
    const m = await api.getMarketers();
    const p = await api.getAllProperties();
    if (s.success) setStats(s.data);
    if (m.success) setMarketers(m.data);
    if (p.success) setProperties(p.data);
  };

  const getPropertiesByMarketer = (marketerId) => {
    return properties.filter(p => p.marketer_id === marketerId);
  };

  const handleLogout = async () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    await api.logout();
    navigate('/login');
  };

  const handleAddMarketer = async () => {
    if (!newMarketer.name || !newMarketer.email || !newMarketer.phone) {
      setError('Please fill in all fields (name, email, and phone)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.addMarketer(newMarketer);
      if (result.success) {
        setSuccessMessage(result.message || 'Marketer added successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowModal(false);
        setNewMarketer({ name: '', email: '', phone: '' });
        loadData();
      } else {
        setError(result.message || 'Failed to add marketer');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMarketer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      const result = await api.deleteMarketer(id);
      if (result.success) {
        setSuccessMessage('Marketer deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        loadData();
      } else {
        setError(result.message || 'Failed to delete marketer');
      }
    } catch (error) {
      setError('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data, filename) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleDownload = () => {
    if (tab === 'marketers') {
      const exportData = marketers.map(m => ({
        Name: m.name,
        Email: m.email,
        Phone: m.phone,
        Properties: getPropertiesByMarketer(m.id).length
      }));
      exportToExcel(exportData, 'marketers');
    } else {
      const exportData = properties.map(p => {
        const marketer = marketers.find(m => m.id === p.marketer_id);
        return {
          'Property Name': p.property_name,
          Location: p.property_location,
          Marketer: marketer?.name || 'Unknown',
          Status: p.status,
          'Date Added': p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'
        };
      });
      exportToExcel(exportData, 'properties');
    }
  };

  return (
    <div className="user-dashboard">
      {/* Success Message Toast */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#10b981',
          color: 'white',
          padding: '1.5rem 2.5rem',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: '500',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="user-dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          {user && <p className="user-welcome">Hi, {user.name || user.username}</p>}
          <p className="user-subtitle">Manage platform</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Add Marketer</button>
          <button onClick={handleDownload} className="btn btn-secondary">Download Excel</button>
          <button onClick={handleLogout} className="btn btn-danger">Logout</button>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="user-loading">
          <div className="user-loading-spinner"></div>
        </div>
      )}

      {/* Stats - Clickable */}
      <div className="user-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.5rem' }}>
        {[
          { label: 'Marketers', value: stats.total_marketers, tab: 'marketers' },
          { label: 'Properties', value: stats.total_properties, tab: 'properties' }
        ].map((s, i) => (
          <div
            key={i}
            className="user-card"
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              cursor: 'pointer',
              border: tab === s.tab ? '2px solid #6366f1' : '1px solid rgba(229, 231, 235, 0.7)',
              background: tab === s.tab ? 'linear-gradient(160deg, #eef2ff 0%, #faf5ff 100%)' : 'rgba(255, 255, 255, 0.95)'
            }}
            onClick={() => setTab(s.tab)}
          >
            <p className="user-card-title" style={{ margin: 0, fontSize: '0.85rem' }}>{s.label}</p>
            <h2 style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#4f46e5' }}>{s.value || 0}</h2>
          </div>
        ))}
      </div>

      {/* Marketers Table - List View */}
      {tab === 'marketers' && !selectedMarketer && (
        <div className="user-card">
          <h2 className="user-card-title">All Marketers</h2>
          <div className="user-rooms-table-wrapper">
            <table className="user-rooms-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {marketers.map(m => (
                  <tr key={m.id}>
                    <td
                      style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: '600' }}
                      onClick={() => setSelectedMarketer(m)}
                    >
                      {m.name}
                    </td>
                    <td>{m.email}</td>
                    <td>{m.created_at ? new Date(m.created_at).toLocaleString() : 'N/A'}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteMarketer(m.id, m.name)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {marketers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No marketers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Marketer Detail View */}
      {tab === 'marketers' && selectedMarketer && (
        <div className="user-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button
              onClick={() => setSelectedMarketer(null)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              ← Back to List
            </button>
            <h2 className="user-card-title" style={{ margin: 0 }}>{selectedMarketer.name}</h2>
            <div></div>
          </div>

          <div className="user-form-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="user-form-group">
              <label>Email</label>
              <input value={selectedMarketer.email} className="input" readOnly />
            </div>
            <div className="user-form-group">
              <label>Phone</label>
              <input value={selectedMarketer.phone} className="input" readOnly />
            </div>
          </div>

          <h3 className="user-card-title">Properties Marketed</h3>
          <div className="user-rooms-table-wrapper">
            <table className="user-rooms-table">
              <thead>
                <tr>
                  <th>Property Name</th>
                  <th>Location</th>
                  <th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {getPropertiesByMarketer(selectedMarketer.id).map(p => (
                  <tr key={p.id}>
                    <td>{p.property_name}</td>
                    <td>{p.property_location}</td>
                    <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
                {getPropertiesByMarketer(selectedMarketer.id).length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No properties found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Properties Table */}
      {tab === 'properties' && (
        <div className="user-card">
          <h2 className="user-card-title">All Properties</h2>
          <div className="user-rooms-table-wrapper">
            <table className="user-rooms-table">
              <thead>
                <tr>
                  <th>Property Name</th>
                  <th>Location</th>
                  <th>Marketer</th>
                  <th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => {
                  const marketer = marketers.find(m => m.id === p.marketer_id);
                  return (
                    <tr key={p.id} onClick={() => setSelectedProperty(p)} style={{ cursor: 'pointer' }}>
                      <td>{p.property_name}</td>
                      <td>{p.property_location}</td>
                      <td>{marketer?.name || 'Unknown'}</td>
                      <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  );
                })}
                {properties.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No properties found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="user-loading" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="user-card" style={{ maxWidth: '450px', width: '90%' }}>
            <h2 className="user-card-title">Add Marketer</h2>
            {error && (
              <div className="user-alert user-alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            <div className="user-form-group">
              <label>Name</label>
              <input
                placeholder="Enter name"
                className="input"
                value={newMarketer.name}
                onChange={e => setNewMarketer({ ...newMarketer, name: e.target.value })}
              />
            </div>
            <div className="user-form-group">
              <label>Email</label>
              <input
                placeholder="Enter email"
                className="input"
                value={newMarketer.email}
                onChange={e => setNewMarketer({ ...newMarketer, email: e.target.value })}
              />
            </div>
            <div className="user-form-group">
              <label>Phone</label>
              <input
                placeholder="Enter phone"
                className="input"
                value={newMarketer.phone}
                onChange={e => setNewMarketer({ ...newMarketer, phone: e.target.value })}
              />
            </div>
            <div className="user-form-actions" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewMarketer({ name: '', email: '', phone: '' });
                  setError('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleAddMarketer} className="btn btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Details Modal */}
      {selectedProperty && (
        <div className="user-loading" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="user-card" style={{ maxWidth: '500px', width: '90%' }}>
            <h2 className="user-card-title">Property Details</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>Property Name:</strong> {selectedProperty.property_name}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Location:</strong> {selectedProperty.property_location}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Type:</strong> {selectedProperty.property_type || 'N/A'}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Status:</strong> {selectedProperty.status}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Marketer:</strong> {selectedProperty.marketer_name || 'Unknown'}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Date Added:</strong> {selectedProperty.created_at ? new Date(selectedProperty.created_at).toLocaleDateString() : 'N/A'}
            </div>
            
            {selectedProperty.rooms && selectedProperty.rooms.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Rooms:</strong>
                <table style={{ width: '100%', marginTop: '0.5rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.25rem' }}>Room Type</th>
                      <th style={{ textAlign: 'left', padding: '0.25rem' }}>Price</th>
                      <th style={{ textAlign: 'left', padding: '0.25rem' }}>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProperty.rooms.map((room, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '0.25rem' }}>{room.room_type}</td>
                        <td style={{ padding: '0.25rem' }}>KSh {room.price}</td>
                        <td style={{ padding: '0.25rem' }}>{room.availability}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="user-form-actions" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => setSelectedProperty(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const newStatus = selectedProperty.status === 'approved' ? 'rejected' : 'approved';
                  const result = await api.updatePropertyStatus(selectedProperty.id, newStatus);
                  if (result.success) {
                    setSuccessMessage(`Property ${newStatus} successfully!`);
                    setTimeout(() => setSuccessMessage(null), 3000);
                  }
                  setSelectedProperty(null);
                  loadData();
                }}
                className="btn btn-primary"
              >
                {selectedProperty.status === 'approved' ? 'Reject' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}