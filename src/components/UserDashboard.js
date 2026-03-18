import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './UserDashboard.css';

const PROPERTY_TYPES = ['Rental Rooms','Hostel','Apartments','Lodge / Guest Rooms','Short Stay Rooms'];
const ROOM_TYPES = ['Single Room','Bedsitter','1 Bedroom','Standard Lodge Room','Executive Room','Other'];

const PACKAGES = [
  { name: 'Basic', price: '5,000', desc: 'Starter visibility' },
  { name: 'Advanced', price: '10,000', desc: 'More reach & features' },
  { name: 'Premium', price: '15,000', desc: 'Top placement & priority' }
];

export default function UserDashboard() {
  const [tab, setTab] = useState('add');
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    owner_name: '', phone_number: '', property_name: '',
    property_location: '', property_type: '', booking_type: '', package_selected: ''
  });

  const [errors, setErrors] = useState({});

  const [rooms, setRooms] = useState([]);

  useEffect(() => { init(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const init = async () => {
    setLoading(true);
    try {
      const res = await api.checkAuth();
      if (!res.success) return navigate('/login');
      setUser(res.data);
      loadProperties();
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    const res = await api.getMyProperties();
    if (res.success) setProperties(res.data);
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.owner_name.trim()) newErrors.owner_name = 'Owner name is required';
    if (!form.phone_number.trim()) newErrors.phone_number = 'Phone number is required';
    if (!form.property_name.trim()) newErrors.property_name = 'Property name is required';
    if (!form.property_location.trim()) newErrors.property_location = 'Location is required';
    // Handle property_type as single selection
    if (!form.property_type) {
      newErrors.property_type = 'Property type is required';
    }
    if (!form.booking_type) newErrors.booking_type = 'Booking type is required';
    if (!form.package_selected) newErrors.package_selected = 'Please select a package';
    
    // Validate at least one room with price and availability
    const validRooms = rooms.filter(r => r.room_type && r.price !== '' && r.availability !== '');
    if (validRooms.length === 0) newErrors.rooms = 'At least one room with price and availability is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Build a list of missing fields
      const missingFields = [];
      if (!form.owner_name.trim()) missingFields.push('Owner Name');
      if (!form.phone_number.trim()) missingFields.push('Phone Number');
      if (!form.property_name.trim()) missingFields.push('Property Name');
      if (!form.property_location.trim()) missingFields.push('Location');
      if (!form.property_type) missingFields.push('Property Type');
      if (!form.booking_type) missingFields.push('Booking Type');
      if (!form.package_selected) missingFields.push('Package');
      if (rooms.filter(r => r.room_type && r.price !== '' && r.availability !== '').length === 0) missingFields.push('Room with price & availability');
      
      showNotification('error', `Please fill: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const result = await api.submitProperty({ ...form, rooms });
      if (result.success) {
        setShowSuccessModal(true);
        // Auto-hide success modal after 3 seconds
        setTimeout(() => setShowSuccessModal(false), 3000);
        // Reset form after submit
        setForm({ owner_name: '', phone_number: '', property_name: '', property_location: '', property_type: '', booking_type: '', package_selected: '' });
        setRooms([]);
        setErrors({});
        loadProperties();
      } else {
        showNotification('error', result.message || 'Failed to submit property');
      }
    } catch (error) {
      showNotification('error', 'An error occurred while submitting');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ owner_name: '', phone_number: '', property_name: '', property_location: '', property_type: '', booking_type: '', package_selected: '' });
    setRooms([]);
    setErrors({});
    showNotification('success', 'Form cleared');
  };

  return (
    <div className="user-dashboard">
      {/* Notification */}
      {notification && (
        <div className={`user-alert ${notification.type === 'success' ? 'user-alert-success' : 'user-alert-error'}`} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          {notification.message}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="user-loading" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="user-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
            <h2 className="user-card-title" style={{ marginBottom: '1rem' }}>Success!</h2>
            <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>Property submitted successfully!</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="user-dashboard-header">
        <div>
          <h1>Dashboard</h1>
          {user && <p className="user-welcome">Hi, {user.name || user.email}</p>}
          <p className="user-subtitle">Manage your listings</p>
        </div>
        <button onClick={() => navigate('/login')} className="btn btn-danger">Logout</button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="user-loading">
          <div className="user-loading-spinner"></div>
        </div>
      )}

      {/* Tabs */}
      <div className="user-tabs">
        <button 
          onClick={() => setTab('add')} 
          className={`user-tab ${tab === 'add' ? 'active' : ''}`}
        >
          Add Property
        </button>
      </div>

      {/* Form */}
      {tab === 'add' && (
        <form onSubmit={handleSubmit} className="user-form" noValidate>
          {/* Basic Info */}
          <div className="user-card">
            <h2 className="user-card-title">Basic Info</h2>
            
            <div className="user-form-grid">
              <div className="user-form-group">
                <label>Owner Name <span className="required">*</span></label>
                <input 
                  placeholder="Enter owner name" 
                  className={`input ${errors.owner_name ? 'input-error' : ''}`}
                  value={form.owner_name}
                  onChange={e=>setForm({...form, owner_name:e.target.value})}
                />
                {errors.owner_name && <span className="error-text">{errors.owner_name}</span>}
              </div>
              
              <div className="user-form-group">
                <label>Phone Number <span className="required">*</span></label>
                <input 
                  placeholder="Enter phone number" 
                  className={`input ${errors.phone_number ? 'input-error' : ''}`}
                  value={form.phone_number}
                  onChange={e=>setForm({...form, phone_number:e.target.value})}
                />
                {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
              </div>
              
              <div className="user-form-group">
                <label>Property Name <span className="required">*</span></label>
                <input 
                  placeholder="Enter property name" 
                  className={`input ${errors.property_name ? 'input-error' : ''}`}
                  value={form.property_name}
                  onChange={e=>setForm({...form, property_name:e.target.value})}
                />
                {errors.property_name && <span className="error-text">{errors.property_name}</span>}
              </div>
              
              <div className="user-form-group">
                <label>Location <span className="required">*</span></label>
                <input 
                  placeholder="Enter location" 
                  className={`input ${errors.property_location ? 'input-error' : ''}`}
                  value={form.property_location}
                  onChange={e=>setForm({...form, property_location:e.target.value})}
                />
                {errors.property_location && <span className="error-text">{errors.property_location}</span>}
              </div>
            </div>
          </div>

          {/* Booking Type */}
          <div className="user-card">
            <h2 className="user-card-title">Booking Type</h2>
            {errors.booking_type && <span className="error-text mb-2">{errors.booking_type}</span>}
            <div className="user-rooms-list">
              {['Monthly Rental', 'Daily Stay', 'Both'].map(bt => (
                <label key={bt} className="user-room-list-item">
                  <input
                    type="radio"
                    name="booking_type"
                    className="user-room-radio"
                    checked={form.booking_type === bt}
                    onChange={() => setForm({...form, booking_type: bt})}
                  />
                  <span className="user-room-label">{bt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Property Type */}
          <div className="user-card">
            <h2 className="user-card-title">Property Type</h2>
            {errors.property_type && <span className="error-text mb-2">{errors.property_type}</span>}
            <div className="user-rooms-list">
              {PROPERTY_TYPES.map(t => (
                <label key={t} className="user-room-list-item">
                  <input
                    type="radio"
                    name="property_type"
                    className="user-room-radio"
                    checked={form.property_type === t}
                    onChange={() => setForm({...form, property_type: t})}
                  />
                  <span className="user-room-label">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rooms */}
          <div className="user-card">
            <h2 className="user-card-title">Rooms</h2>
            {errors.rooms && <span className="error-text mb-2">{errors.rooms}</span>}
            <div className="user-rooms-table-wrapper">
              <table className="user-rooms-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Room Type</th>
                    <th>Price (KSh)</th>
                    <th>Typical Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {ROOM_TYPES.map(rt => {
                    const room = rooms.find(r => r.room_type === rt);
                    const isChecked = !!room;
                    return (
                      <tr key={rt}>
                        <td>
                          <input
                            type="radio"
                            name="room_type"
                            className="user-room-radio"
                            checked={isChecked}
                            onChange={() => {
                              setRooms([{ room_type: rt, price: room?.price || '', availability: room?.availability || '' }]);
                            }}
                          />
                        </td>
                        <td>{rt}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            placeholder="Enter price"
                            className={`input room-price-input ${errors.rooms && isChecked && !room?.price ? 'input-error' : ''}`}
                            value={room?.price || ''}
                            disabled={!isChecked}
                            onChange={e => {
                              const value = e.target.value;
                               if (value === '' || (parseFloat(value) >= 0)) {
                                setRooms(prevRooms => prevRooms.map(r => 
                                  r.room_type === rt ? { ...r, price: value } : r
                                ));
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            placeholder="No. of rooms"
                            className={`input room-availability-input ${errors.rooms && isChecked && !room?.availability ? 'input-error' : ''}`}
                            value={room?.availability || ''}
                            disabled={!isChecked}
                            onChange={e => {
                              const value = e.target.value;
                              if (value === '' || (parseInt(value) >= 0)) {
                                setRooms(prevRooms => prevRooms.map(r => 
                                  r.room_type === rt ? { ...r, availability: value } : r
                                ));
                              }
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Packages */}
          <div className="user-card">
            <h2 className="user-card-title">Select Package</h2>
            {errors.package_selected && <span className="error-text mb-2">{errors.package_selected}</span>}
            <div className="user-packages">
              {PACKAGES.map(p => (
                <div 
                  key={p.name}
                  onClick={()=>setForm({...form, package_selected:p.name})}
                  className={`user-package ${form.package_selected === p.name ? 'selected' : ''}`}
                >
                  <h3 className="package-name">{p.name}</h3>
                  <p className="package-price">KSh {p.price}</p>
                  <p className="package-desc">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="user-form-actions">
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              Clear Form
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Property'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
