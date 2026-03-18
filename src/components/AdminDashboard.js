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
  const [newMarketer, setNewMarketer] = useState({ name: '', email: '', phone: '', password: '' });

  const navigate = useNavigate();

  useEffect(() => { init(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const init = async () => {
    setLoading(true);
    try {
      const res = await api.checkAuth();
      if (!res.success) return navigate('/login');
      setUser(res.data);
      loadData();
    } finally { setLoading(false); }
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMarketer({ ...newMarketer, password });
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/login');
  };

  const handleAddMarketer = async () => {
    if (!newMarketer.name || !newMarketer.email || !newMarketer.phone || !newMarketer.password) {
      alert('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const result = await api.addMarketer(newMarketer);
      if (result.success) {
        alert('Marketer added successfully!');
        setShowModal(false);
        setNewMarketer({ name: '', email: '', phone: '', password: '' });
        loadData();
      } else {
        alert(result.message || 'Failed to add marketer');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data, filename) => {
    // Create CSV content
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');

    // Create blob and download
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
          Status: p.status
        };
      });
      exportToExcel(exportData, 'properties');
    }
  };

  return (
    <div className="user-dashboard">
      {/* Header */}
      <div className="user-dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          {user && <p className="user-welcome">Hi, {user.name || user.email}</p>}
          <p className="user-subtitle">Manage platform</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={()=>setShowModal(true)} className="btn btn-primary">+ Add Marketer</button>
          <button onClick={handleDownload} className="btn btn-secondary">
            Download Excel
          </button>
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
          { label:'Marketers', value:stats.total_marketers, tab:'marketers' },
          { label:'Properties', value:stats.total_properties, tab:'properties' }
        ].map((s,i)=>(
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
      {tab==='marketers' && !selectedMarketer && (
        <div className="user-card">
          <h2 className="user-card-title">All Marketers</h2>
          <div className="user-rooms-table-wrapper">
            <table className="user-rooms-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {marketers.map(m=>(
                  <tr key={m.id}>
                    <td 
                      style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: '600' }}
                      onClick={() => setSelectedMarketer(m)}
                    >
                      {m.name}
                    </td>
                    <td>{m.email}</td>
                  </tr>
                ))}
                {marketers.length === 0 && (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
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
      {tab==='marketers' && selectedMarketer && (
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
      {tab==='properties' && (
        <div className="user-card">
          <h2 className="user-card-title">All Properties</h2>
          <div className="user-rooms-table-wrapper">
            <table className="user-rooms-table">
              <thead>
                <tr>
                  <th>Property Name</th>
                  <th>Location</th>
                  <th>Marketer</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p=>{
                  const marketer = marketers.find(m => m.id === p.marketer_id);
                  return (
                    <tr key={p.id}>
                      <td>{p.property_name}</td>
                      <td>{p.property_location}</td>
                      <td>{marketer?.name || 'Unknown'}</td>
                    </tr>
                  );
                })}
                {properties.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
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
            <div className="user-form-group">
              <label>Name</label>
              <input 
                placeholder="Enter name" 
                className="input" 
                value={newMarketer.name}
                onChange={e => setNewMarketer({...newMarketer, name: e.target.value})}
              />
            </div>
            <div className="user-form-group">
              <label>Email</label>
              <input 
                placeholder="Enter email" 
                className="input"
                value={newMarketer.email}
                onChange={e => setNewMarketer({...newMarketer, email: e.target.value})}
              />
            </div>
            <div className="user-form-group">
              <label>Phone</label>
              <input 
                placeholder="Enter phone" 
                className="input"
                value={newMarketer.phone}
                onChange={e => setNewMarketer({...newMarketer, phone: e.target.value})}
              />
            </div>
            <div className="user-form-group">
              <label>Password</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  placeholder="Generate or enter password" 
                  className="input"
                  value={newMarketer.password}
                  onChange={e => setNewMarketer({...newMarketer, password: e.target.value})}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button"
                  onClick={generatePassword}
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Generate
                </button>
              </div>
            </div>
            <div className="user-form-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                onClick={()=>{
                  setShowModal(false);
                  setNewMarketer({ name: '', email: '', phone: '', password: '' });
                }} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddMarketer}
                className="btn btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
