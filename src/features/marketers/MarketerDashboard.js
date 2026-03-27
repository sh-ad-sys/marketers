import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../components/UserDashboard.css';

const PROPERTY_TYPES = ['Rental Rooms', 'Hostel', 'Apartments', 'Lodge / Guest Rooms', 'Short Stay Rooms'];
const ROOM_TYPES = ['Single Room', 'Bedsitter', '1 Bedroom', 'Standard Lodge Room', 'Executive Room', 'Other'];
const COUNTRIES = ['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Nigeria', 'South Africa', 'Ghana', 'Ethiopia', 'Other'];

const KENYA_COUNTIES = [
  'Mombasa', 'Nairobi', 'Kisumu', 'Nakuru', 'Eldoret', 'Kericho', 'Kisii', 'Nyamira',
  'Migori', 'Homa Bay', 'Siaya', 'Busia', 'Kakamega', 'Vihiga', 'Bungoma', 'Trans Nzoia',
  'Uasin Gishu', 'Nandi', 'Elgeyo Marakwet', 'West Pokot', 'Turkana', 'Marsabit', 'Samburu',
  'Isiolo', 'Meru', 'Tharaka Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', 'Kirinyaga', 'Muranga', 'Kiambu', 'Garissa', 'Wajir', 'Mandera',
  'Lag BAD', 'Kilifi', 'Kwale', 'Tana River', 'Lamu', 'Taita Taveta', 'Baringo', 'Laikipia',
  'Narok', 'Kajiado', 'Bomet'
];

const PACKAGES = [
  { name: 'Basic', price: '5,000', desc: 'Starter visibility' },
  { name: 'Advanced', price: '10,000', desc: 'More reach & features' },
  { name: 'Premium', price: '15,000', desc: 'Top placement & priority' }
];

export default function MarketerDashboard() {
  const [tab, setTab] = useState('add');
  const [user, setUser] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    owner_name: '', phone_number: '', property_name: '',
    property_location: '', property_type: [], booking_type: '', package_selected: '',
    county: '', area: ''
  });

  const [errors, setErrors] = useState({});
  const [rooms, setRooms] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [mpesaText, setMpesaText] = useState('');
  const [mpesaMessages, setMpesaMessages] = useState([]);
  const [plotsResetActive, setPlotsResetActive] = useState(false);
  const [mapPins, setMapPins] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const visibleProperties = plotsResetActive ? [] : properties;

  useEffect(() => {
    const mustChangePassword = localStorage.getItem('mustChangePassword');
    if (mustChangePassword === '1') {
      navigate('/plotconnectmarketers/set-password');
    }
  }, [navigate]);

  useEffect(() => { init(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab !== 'map') {
      return;
    }

    const geocodeProperties = async () => {
      if (!visibleProperties.length) {
        setMapPins([]);
        return;
      }

      setMapLoading(true);
      setMapError('');

      try {
        const cache = new Map();
        const pins = [];

        for (const property of visibleProperties) {
          const area = property.area || property.property_location || '';
          const county = property.county || '';
          const query = `${area} ${county} Kenya`.trim();
          if (!query) {
            continue;
          }

          if (!cache.has(query)) {
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
              headers: {
                Accept: 'application/json'
              }
            });
            const data = await response.json();
            cache.set(query, data?.[0] || null);
          }

          const location = cache.get(query);
          if (location?.lat && location?.lon) {
            pins.push({
              id: property.id,
              name: property.property_name,
              area: area || 'N/A',
              county: county || 'N/A',
              status: property.status || 'pending',
              lat: Number(location.lat),
              lon: Number(location.lon)
            });
          }
        }

        setMapPins(pins);
      } catch (err) {
        setMapError('Unable to geocode property locations for map pins right now.');
      } finally {
        setMapLoading(false);
      }
    };

    geocodeProperties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, visibleProperties]);

  const init = async () => {
    setLoading(true);
    try {
      // Use localStorage as primary auth source
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const role = localStorage.getItem('role');

      if (!isLoggedIn || role !== 'marketer') {
        navigate('/plotconnectmarketers');
        return;
      }

      // Set user from localStorage immediately
      setUser({
        name: localStorage.getItem('name') || 'Marketer',
        user_type: 'marketer'
      });

      // Try to refresh from server, but don't redirect if it fails
      try {
        const res = await api.checkAuth();
        if (res.success && res.data) {
          setUser(res.data);
          // Check if authorized
          if (res.data.is_authorized !== undefined) {
            setIsAuthorized(!!res.data.is_authorized);
          }
        }
      } catch {
        // Session may not persist cross-origin — localStorage handles auth
        // Check localStorage for is_authorized
        const storedAuthorized = localStorage.getItem('isAuthorized');
        if (storedAuthorized === 'false' || storedAuthorized === '0') {
          setIsAuthorized(false);
        }
      }

      loadProperties();
      loadMpesaMessages();
    } catch {
      navigate('/plotconnectmarketers');
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    const res = await api.getMyProperties();
    if (res.success) {
      setPlotsResetActive(!!res.hidden);
      setProperties(res.data || []);
    }
  };

  const loadMpesaMessages = async () => {
    const res = await api.getMpesaMessages();
    if (res.success) setMpesaMessages(res.data || []);
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const validateForm = () => {
    console.log('=== VALIDATION STARTED ===');
    console.log('Form state:', JSON.stringify(form, null, 2));
    console.log('Rooms state:', JSON.stringify(rooms, null, 2));
    
    const newErrors = {};
    
    // More robust validation - explicitly check each field
    const ownerName = form.owner_name;
    const phoneNumber = form.phone_number;
    const propertyName = form.property_name;
    const county = form.county;
    const area = form.area;
    const propertyType = form.property_type;
    const bookingType = form.booking_type;
    const packageSelected = form.package_selected;
    
    console.log('Checking owner_name:', typeof ownerName, ownerName === '', !!ownerName, Boolean(ownerName));
    if (!ownerName || String(ownerName).trim() === '') {
      console.log('ERROR: owner_name is empty');
      newErrors.owner_name = 'Owner name is required';
    }
    
    console.log('Checking phone_number:', typeof phoneNumber, phoneNumber === '', !!phoneNumber, Boolean(phoneNumber));
    // Make phone optional for now - allow submission even if empty
    // if (!phoneNumber || String(phoneNumber).trim() === '') {
    //   console.log('ERROR: phone_number is empty');
    //   newErrors.phone_number = 'Phone number is required';
    // }
    
    console.log('Checking property_name:', typeof propertyName, propertyName === '', !!propertyName, Boolean(propertyName));
    if (!propertyName || String(propertyName).trim() === '') {
      console.log('ERROR: property_name is empty');
      newErrors.property_name = 'Property name is required';
    }
    
    console.log('Checking county:', typeof county, county === '', !!county, Boolean(county));
    if (!county || county === '') {
      console.log('ERROR: county is empty');
      newErrors.county = 'County is required';
    }
    
    console.log('Checking area:', typeof area, area === '', !!area, Boolean(area));
    if (!area || String(area).trim() === '') {
      console.log('ERROR: area is empty');
      newErrors.area = 'Area is required';
    }
    
    console.log('Checking property_type:', typeof propertyType, Array.isArray(propertyType), propertyType?.length);
    if (!propertyType || !Array.isArray(propertyType) || propertyType.length === 0) {
      console.log('ERROR: property_type is empty');
      newErrors.property_type = 'Property type is required';
    }
    
    console.log('Checking booking_type:', typeof bookingType, bookingType === '', !!bookingType, Boolean(bookingType));
    if (!bookingType || bookingType === '') {
      console.log('ERROR: booking_type is empty');
      newErrors.booking_type = 'Booking type is required';
    }
    
    console.log('Checking package_selected:', typeof packageSelected, packageSelected === '', !!packageSelected, Boolean(packageSelected));
    if (!packageSelected || packageSelected === '') {
      console.log('ERROR: package_selected is empty');
      newErrors.package_selected = 'Please select a package';
    }

    // Only validate rooms if any have been added
    const validRooms = rooms.filter(r => r.room_type && r.availability && r.price !== '' && r.price !== null && r.price !== undefined);
    console.log('Valid rooms count:', validRooms.length);
    if (rooms.length > 0 && validRooms.length === 0) newErrors.rooms = 'At least one room with price and availability is required';

    console.log('Validation errors found:', JSON.stringify(newErrors, null, 2));
    setErrors(newErrors);
    console.log('=== VALIDATION COMPLETE ===');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form data:', form);
    console.log('Rooms:', rooms);
    
    if (!validateForm()) {
      console.log('Validation failed, errors:', errors);
      const missingFields = [];
      if (!form.owner_name?.trim()) missingFields.push('Owner Name');
      if (!form.phone_number?.trim()) missingFields.push('Phone Number');
      if (!form.property_name?.trim()) missingFields.push('Property Name');
      if (!form.county) missingFields.push('County');
      if (!form.area?.trim()) missingFields.push('Area');
      if (!form.property_type || form.property_type.length === 0) missingFields.push('Property Type');
      if (!form.booking_type) missingFields.push('Booking Type');
      if (!form.package_selected) missingFields.push('Package');
      if (rooms.length > 0 && rooms.filter(r => r.room_type && (r.price !== '' && r.price !== null && r.price !== undefined) && r.availability).length === 0)
        missingFields.push('Room Details');

      console.log('Missing fields:', missingFields);
      console.log('Showing error notification for validation failure');
      const errorMessage = 'Please fill: ' + missingFields.join(', ');
      console.log('Error message to show:', errorMessage);
      showNotification('error', errorMessage);
      return;
    }

    console.log('Validation passed, sending to API...');
    
    setLoading(true);
    try {
      // Map phone_number to phone for API compatibility
      // Send BOTH phone and phone_number fields to ensure PHP receives the expected value
      const apiData = { 
        owner_name: form.owner_name,
        phone: form.phone_number || '',  // Use 'phone' - this is what the DB column is named
        property_name: form.property_name,
        county: form.county,
        area: form.area,
        property_type: form.property_type,
        booking_type: form.booking_type,
        package_selected: form.package_selected,
        rooms: rooms
      };
      
      console.log('Submitting with phone:', apiData.phone);
      const result = await api.submitProperty(apiData);
      if (result.success) {
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
        setForm({ owner_name: '', phone_number: '', property_name: '', property_location: '', property_type: [], booking_type: '', package_selected: '', county: '', area: '' });
        setRooms([]);
        setErrors({});
        loadProperties();
      } else {
        showNotification('error', result.message || 'Failed to submit property');
      }
    } catch (error) {
      console.error('API error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      showNotification('error', 'An error occurred while submitting');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ owner_name: '', phone_number: '', property_name: '', property_location: '', property_type: [], booking_type: '', package_selected: '', county: '', area: '' });
    setRooms([]);
    setErrors({});
    showNotification('success', 'Form cleared');
  };

  const handleLogout = async () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    localStorage.removeItem('mustChangePassword');
    await api.logout();
    navigate('/plotconnectmarketers');
  };

  const handleSendMpesaMessage = async (e) => {
    e.preventDefault();
    if (!mpesaText.trim()) {
      showNotification('error', 'Please paste the MPesa transaction message first.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.submitMpesaMessage({ message_text: mpesaText.trim() });
      if (result.success) {
        showNotification('success', 'MPesa transaction message sent successfully.');
        setMpesaText('');
        loadMpesaMessages();
      } else {
        showNotification('error', result.message || 'Failed to send MPesa message.');
      }
    } catch (error) {
      showNotification('error', 'Failed to send MPesa message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-dashboard">
      {/* Not Authorized Message */}
      {!isAuthorized && (
        <div className="user-alert user-alert-error" style={{ textAlign: 'center', margin: '1rem' }}>
          You are not authorized to access this dashboard. Please contact the admin to get authorization.
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`user-alert ${notification.type === 'success' ? 'user-alert-success' : 'user-alert-error'}`}
          style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
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
          {user && <p className="user-welcome">Hi, {user.name}</p>}
          <p className="user-subtitle">Manage your listings</p>
        </div>
        <button onClick={handleLogout} className="btn btn-danger">Logout</button>
      </div>
      {/* Modules - Admin-style cards */}
      <div className="user-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
        {[
          { label: 'Add Property', value: '-', tabKey: 'add' },
          { label: 'My Properties', value: visibleProperties.length, tabKey: 'properties' },
          { label: 'Map', value: visibleProperties.length, tabKey: 'map' },
          { label: 'MPesa Messages', value: mpesaMessages.length, tabKey: 'mpesa' }
        ].map((module, i) => (
          <div
            key={i}
            className="user-card"
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              cursor: 'pointer',
              border: tab === module.tabKey ? '2px solid #6366f1' : '1px solid rgba(229, 231, 235, 0.7)',
              background: tab === module.tabKey ? 'linear-gradient(160deg, #eef2ff 0%, #faf5ff 100%)' : 'rgba(255, 255, 255, 0.95)'
            }}
            onClick={() => setTab(module.tabKey)}
          >
            <p className="user-card-title" style={{ margin: 0, fontSize: '0.85rem' }}>{module.label}</p>
            <h2 style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: '700', color: '#4f46e5' }}>{module.value}</h2>
          </div>
        ))}
      </div>
      {/* Loading Overlay */}
      {loading && (
        <div className="user-loading">
          <div className="user-loading-spinner"></div>
        </div>
      )}

      {/* Description */}
      {tab === 'add' && (
      <div className="user-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="user-card-title">Submit New Property</h2>
        <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
          Use this form to submit a new property listing. Fill in all the required details including owner information, 
          property location, type, available rooms, booking options, and select a package. 
          Once submitted, your property will be reviewed by an admin.
        </p>
      </div>
      )}

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
                  onChange={e => setForm({ ...form, owner_name: e.target.value })}
                />
                {errors.owner_name && <span className="error-text">{errors.owner_name}</span>}
              </div>

              <div className="user-form-group">
                <label>Phone Number <span className="required">*</span></label>
                <input
                  placeholder="Enter phone number"
                  className={`input ${errors.phone_number ? 'input-error' : ''}`}
                  value={form.phone_number}
                  onChange={e => setForm({ ...form, phone_number: e.target.value })}
                />
                {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
              </div>

              <div className="user-form-group">
                <label>Property Name <span className="required">*</span></label>
                <input
                  placeholder="Enter property name"
                  className={`input ${errors.property_name ? 'input-error' : ''}`}
                  value={form.property_name}
                  onChange={e => setForm({ ...form, property_name: e.target.value })}
                />
                {errors.property_name && <span className="error-text">{errors.property_name}</span>}
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="user-card">
            <h2 className="user-card-title">Location Details</h2>
            <div className="user-form-grid">
              <div className="user-form-group">
                <label>County <span className="required">*</span></label>
                <select
                  className={`input ${errors.county ? 'input-error' : ''}`}
                  value={form.county}
                  onChange={e => setForm({ ...form, county: e.target.value })}
                >
                  <option value="">Select County</option>
                  {KENYA_COUNTIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.county && <span className="error-text">{errors.county}</span>}
              </div>

              <div className="user-form-group">
                <label>Area <span className="required">*</span></label>
                <input
                  placeholder="Enter area (e.g., Westlands, Kilimani)"
                  className={`input ${errors.area ? 'input-error' : ''}`}
                  value={form.area}
                  onChange={e => setForm({ ...form, area: e.target.value })}
                />
                {errors.area && <span className="error-text">{errors.area}</span>}
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
                    onChange={() => setForm({ ...form, booking_type: bt })}
                  />
                  <span className="user-room-label">{bt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Property Type */}
          <div className="user-card">
            <h2 className="user-card-title">Property Type <span className="required">*</span></h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>Select all that apply</p>
            {errors.property_type && <span className="error-text mb-2">{errors.property_type}</span>}
            <div className="user-rooms-list">
              {PROPERTY_TYPES.map(t => (
                <label key={t} className="user-room-list-item">
                  <input
                    type="checkbox"
                    name="property_type"
                    className="user-room-checkbox"
                    checked={form.property_type?.includes(t) || false}
                    onChange={e => {
                      const current = form.property_type || [];
                      if (e.target.checked) {
                        setForm({ ...form, property_type: [...current, t] });
                      } else {
                        setForm({ ...form, property_type: current.filter(x => x !== t) });
                      }
                    }}
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
                            type="checkbox"
                            className="user-room-checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setRooms(prev => prev.filter(r => r.room_type !== rt));
                              } else {
                                setRooms(prev => [...prev, { room_type: rt, price: '', availability: '' }]);
                              }
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
                                setRooms(prev => prev.map(r => r.room_type === rt ? { ...r, price: value } : r));
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
                                setRooms(prev => prev.map(r => r.room_type === rt ? { ...r, availability: value } : r));
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
                  onClick={() => setForm({ ...form, package_selected: p.name })}
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

      {/* My Properties Section */}
      {tab === 'properties' && (
        <div className="user-properties-section">
          <div className="user-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="user-card-title">My Properties</h2>
            <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
              View all the properties you have submitted. You can see their current status and details.
            </p>
          </div>
          {plotsResetActive && (
            <div className="user-alert user-alert-success" style={{ marginBottom: '1rem' }}>
              User view plots were refreshed by admin and are currently reset to 0.
            </div>
          )}

          {visibleProperties.length === 0 ? (
            <div className="user-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#9ca3af' }}>🏠</div>
              <h3 style={{ marginBottom: '0.5rem', color: '#4b5563' }}>No Properties Yet</h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You haven't submitted any properties yet.</p>
              <button onClick={() => setTab('add')} className="btn btn-primary">
                Add Your First Property
              </button>
            </div>
          ) : (
            <div className="user-properties-grid">
              {visibleProperties.map(property => (
                <div key={property.id} className="user-property-card">
                  <div className="user-property-header">
                    <h3 className="user-property-name">{property.property_name}</h3>
                    <span className={`user-property-status status-${property.status}`}>
                      {property.status}
                    </span>
                  </div>
                  
                  <div className="user-property-details">
                    <div className="user-property-detail">
                      <span className="detail-label">Owner:</span>
                      <span className="detail-value">{property.owner_name}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{property.phone}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{property.property_location}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Country:</span>
                      <span className="detail-value">{property.country || 'N/A'}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Area:</span>
                      <span className="detail-value">{property.area || 'N/A'}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{property.property_type}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Date Added:</span>
                      <span className="detail-value">
                        {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {property.rooms && property.rooms.length > 0 && (
                    <div className="user-property-rooms">
                      <h4>Available Rooms:</h4>
                      <div className="rooms-list">
                        {property.rooms.map((room, idx) => (
                          <span key={idx} className="room-tag">
                            {room.room_type}: {room.price ? `KSh ${parseInt(room.price).toLocaleString()}` : 'N/A'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="user-property-footer">
                    <span className="user-property-date">
                      Added: {property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Section */}
      {tab === 'map' && (
        <div className="user-card">
          <h2 className="user-card-title">Property Map</h2>
          {visibleProperties.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>
              No visible properties to show on map.
            </p>
          ) : (
            <>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Showing your visible properties by county and area.
              </p>
              {mapLoading && (
                <div className="user-alert user-alert-success" style={{ marginBottom: '1rem' }}>
                  Loading map pins...
                </div>
              )}
              {mapError && (
                <div className="user-alert user-alert-error" style={{ marginBottom: '1rem' }}>
                  {mapError}
                </div>
              )}
              <div className="user-rooms-table-wrapper" style={{ marginBottom: '1rem' }}>
                <table className="user-rooms-table">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>County</th>
                      <th>Area</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProperties.map((property) => (
                      <tr key={property.id}>
                        <td>{property.property_name}</td>
                        <td>{property.county || 'N/A'}</td>
                        <td>{property.area || 'N/A'}</td>
                        <td>{property.status || 'pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mapPins.length > 0 ? (
                <iframe
                  title="Properties map with pins"
                  style={{ width: '100%', height: '460px', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                  srcDoc={`<!doctype html>
                  <html>
                    <head>
                      <meta charset="utf-8" />
                      <meta name="viewport" content="width=device-width, initial-scale=1" />
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <style>html,body,#map{height:100%;margin:0;padding:0}</style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <script>
                        const pins = ${JSON.stringify(mapPins)};
                        const kenyaBounds = [[-4.9, 33.8], [5.1, 42.0]];
                        const map = L.map('map', { maxBounds: kenyaBounds, maxBoundsViscosity: 1.0 });
                        map.fitBounds(kenyaBounds);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                          attribution: '&copy; OpenStreetMap contributors'
                        }).addTo(map);
                        const bounds = [];
                        pins.forEach((p) => {
                          const marker = L.marker([p.lat, p.lon]).addTo(map);
                          marker.bindPopup('<b>' + p.name + '</b><br/>' + p.area + ', ' + p.county + '<br/>Status: ' + p.status);
                          bounds.push([p.lat, p.lon]);
                        });
                        if (bounds.length > 0) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
                      </script>
                    </body>
                  </html>`}
                />
              ) : (
                <div className="user-alert user-alert-error">
                  No pin coordinates found yet for the listed property areas.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MPesa Module */}
      {tab === 'mpesa' && (
        <div className="user-card">
          <h2 className="user-card-title">MPesa Transaction Message</h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Paste MPesa transaction message from the property owner or client, then send it to admin.
          </p>
          <form onSubmit={handleSendMpesaMessage}>
            <div className="user-form-group">
              <label>MPesa Message</label>
              <textarea
                className="input"
                rows={5}
                value={mpesaText}
                onChange={(e) => setMpesaText(e.target.value)}
                placeholder="Paste MPesa message here"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 className="user-card-title">My Sent MPesa Messages</h3>
            <div className="user-rooms-table-wrapper">
              <table className="user-rooms-table">
                <thead>
                  <tr>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mpesaMessages.map((msg) => (
                    <tr key={msg.id}>
                      <td>{msg.message_text}</td>
                      <td>{msg.status || 'pending'}</td>
                      <td>{msg.created_at ? new Date(msg.created_at).toLocaleString() : 'N/A'}</td>
                    </tr>
                  ))}
                  {mpesaMessages.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af' }}>
                        No MPesa messages sent yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}







