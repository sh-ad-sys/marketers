import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../components/UserDashboard.css';

const PROPERTY_TYPES = ['Rental Rooms', 'Hostel', 'Apartments', 'Lodge / Guest Rooms', 'Short Stay Rooms'];
const ROOM_TYPES = ['Single Room', 'Bedsitter', '1 Bedroom', 'Standard Lodge Room', 'Executive Room', 'Other'];
const MAX_PROPERTY_IMAGES = 8;
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_OUTPUT_QUALITY = 0.82;
const INITIAL_PAYMENT_STATUS_CHECK_DELAY_MS = 5000;
const REPEAT_PAYMENT_STATUS_CHECK_DELAY_MS = 10000;
const MAX_PAYMENT_STATUS_CHECK_ATTEMPTS = 12;

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

function createEmptyPropertyForm() {
  return {
    owner_name: '',
    phone_number_1: '',
    phone_number_2: '',
    whatsapp_phone: '',
    property_name: '',
    property_location: '',
    property_type: [],
    booking_type: '',
    package_selected: '',
    county: '',
    area: '',
    images: []
  };
}

function normalizePropertyImage(image) {
  if (typeof image === 'string') {
    return image;
  }

  if (image && typeof image === 'object') {
    return image.data_url || image.url || image.src || '';
  }

  return '';
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const largestSide = Math.max(img.width, img.height);
        const scale = largestSide > IMAGE_MAX_DIMENSION ? IMAGE_MAX_DIMENSION / largestSide : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }

        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_OUTPUT_QUALITY));
      };

      img.onerror = () => reject(new Error(`Unable to process image: ${file.name}`));
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };

    reader.onerror = () => reject(new Error(`Unable to read image: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function formatPropertyDateTime(value) {
  const normalizedValue = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const parsedDate = normalizedValue ? new Date(normalizedValue) : new Date();
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return safeDate.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrencyValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return `KSh ${numericValue.toLocaleString()}`;
}

function resolvePackagePriceLabel(packageSelected) {
  const matchedPackage = PACKAGES.find(
    (pkg) => pkg.name.toLowerCase() === String(packageSelected || '').trim().toLowerCase()
  );

  if (matchedPackage) {
    return `KSh ${matchedPackage.price}`;
  }

  const numericValue = Number(String(packageSelected || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(numericValue) && numericValue > 0 ? formatCurrencyValue(numericValue) : null;
}

function resolvePropertyPaymentPhone(property, preferredPhone = '') {
  return String(
    preferredPhone
    || property?.payment_phone
    || property?.whatsapp_phone
    || property?.phone_number_1
    || property?.phone
    || ''
  ).trim();
}

function getPaymentStatusLabel(status) {
  const normalizedStatus = String(status || 'unpaid').trim().toLowerCase();

  if (normalizedStatus === 'completed') {
    return 'Paid';
  }
  if (normalizedStatus === 'initiated') {
    return 'Awaiting Confirmation';
  }
  if (normalizedStatus === 'failed') {
    return 'Failed';
  }

  return 'Unpaid';
}

function getPaymentStatusStyle(status) {
  const normalizedStatus = String(status || 'unpaid').trim().toLowerCase();

  if (normalizedStatus === 'completed') {
    return {
      background: '#dcfce7',
      color: '#166534',
    };
  }

  if (normalizedStatus === 'initiated') {
    return {
      background: '#dbeafe',
      color: '#1d4ed8',
    };
  }

  if (normalizedStatus === 'failed') {
    return {
      background: '#fee2e2',
      color: '#b91c1c',
    };
  }

  return {
    background: '#f3f4f6',
    color: '#374151',
  };
}

export default function MarketerDashboard() {
  const [tab, setTab] = useState('add');
  const [user, setUser] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const paymentStatusTimeoutsRef = useRef({});
  const paymentStatusAttemptsRef = useRef({});

  const [form, setForm] = useState(createEmptyPropertyForm);

  const [errors, setErrors] = useState({});
  const [rooms, setRooms] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [mpesaText, setMpesaText] = useState('');
  const [mpesaMessages, setMpesaMessages] = useState([]);
  const [paymentPhones, setPaymentPhones] = useState({});
  const [paymentLoadingPropertyId, setPaymentLoadingPropertyId] = useState(null);
  const [paymentSyncPropertyId, setPaymentSyncPropertyId] = useState(null);
  const [paymentPanelPropertyId, setPaymentPanelPropertyId] = useState(null);
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
  useEffect(() => () => {
    Object.values(paymentStatusTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    paymentStatusTimeoutsRef.current = {};
    paymentStatusAttemptsRef.current = {};
  }, []);
  useEffect(() => {
    if (tab !== 'map') {
      return;
    }

    const propertiesForMap = plotsResetActive ? [] : properties;
    const geocodeProperties = async () => {
      if (!propertiesForMap.length) {
        setMapPins([]);
        return;
      }

      setMapLoading(true);
      setMapError('');

      try {
        const cache = new Map();
        const pins = [];

        for (const property of propertiesForMap) {
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
  }, [tab, plotsResetActive, properties]);

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

      await Promise.all([loadProperties(), loadMpesaMessages()]);
    } catch {
      navigate('/plotconnectmarketers');
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    const res = await api.getMyProperties();
    if (res.success) {
      const nextProperties = res.data || [];
      setPlotsResetActive(!!res.hidden);
      setProperties(nextProperties);
      setPaymentPhones(prev => {
        const nextPhones = {};

        nextProperties.forEach((property) => {
          nextPhones[property.id] = resolvePropertyPaymentPhone(property, prev[property.id]);
        });

        return nextPhones;
      });
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

  const clearPropertyForm = () => {
    setForm(createEmptyPropertyForm());
    setRooms([]);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    console.log('=== VALIDATION STARTED ===');
    console.log('Form state:', JSON.stringify(form, null, 2));
    console.log('Rooms state:', JSON.stringify(rooms, null, 2));
    
    const newErrors = {};
    
    // More robust validation - explicitly check each field
    const ownerName = form.owner_name;
    const phoneNumber1 = form.phone_number_1;
    const whatsappPhone = form.whatsapp_phone;
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
    
    console.log('Checking phone_number_1:', typeof phoneNumber1, phoneNumber1 === '', !!phoneNumber1, Boolean(phoneNumber1));
    if (!phoneNumber1 || String(phoneNumber1).trim() === '') {
      console.log('ERROR: phone_number_1 is empty');
      newErrors.phone_number_1 = 'Phone number 1 is required';
    }

    console.log('Checking whatsapp_phone:', typeof whatsappPhone, whatsappPhone === '', !!whatsappPhone, Boolean(whatsappPhone));
    if (!whatsappPhone || String(whatsappPhone).trim() === '') {
      console.log('ERROR: whatsapp_phone is empty');
      newErrors.whatsapp_phone = 'WhatsApp phone is required';
    }
    
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
    if ((form.images || []).length > MAX_PROPERTY_IMAGES) {
      newErrors.images = `You can upload up to ${MAX_PROPERTY_IMAGES} images`;
    }

    console.log('Validation errors found:', JSON.stringify(newErrors, null, 2));
    setErrors(newErrors);
    console.log('=== VALIDATION COMPLETE ===');
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelection = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      return;
    }

    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== selectedFiles.length) {
      showNotification('error', 'Only image files can be uploaded.');
    }

    const existingImages = form.images || [];
    const remainingSlots = MAX_PROPERTY_IMAGES - existingImages.length;

    if (remainingSlots <= 0) {
      setErrors(prev => ({ ...prev, images: `You can upload up to ${MAX_PROPERTY_IMAGES} images` }));
      showNotification('error', `You can upload a maximum of ${MAX_PROPERTY_IMAGES} images.`);
      event.target.value = '';
      return;
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots);
    if (imageFiles.length > remainingSlots) {
      showNotification('error', `Only the first ${remainingSlots} image(s) were added. Maximum is ${MAX_PROPERTY_IMAGES}.`);
    }

    setProcessingImages(true);
    try {
      const processedImages = await Promise.all(filesToProcess.map(file => resizeImageFile(file)));
      setForm(prev => ({
        ...prev,
        images: [...(prev.images || []), ...processedImages.filter(Boolean)]
      }));
      setErrors(prev => {
        const nextErrors = { ...prev };
        delete nextErrors.images;
        return nextErrors;
      });
    } catch (error) {
      console.error('Image processing error:', error);
      showNotification('error', 'One or more images could not be processed.');
    } finally {
      setProcessingImages(false);
      event.target.value = '';
    }
  };

  const handleRemoveImage = (imageIndex) => {
    setForm(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, index) => index !== imageIndex)
    }));
    setErrors(prev => {
      const nextErrors = { ...prev };
      delete nextErrors.images;
      return nextErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form data:', form);
    console.log('Rooms:', rooms);

    if (processingImages) {
      showNotification('error', 'Please wait for the selected images to finish processing.');
      return;
    }
    
    if (!validateForm()) {
      console.log('Validation failed, errors:', errors);
      const missingFields = [];
      if (!form.owner_name?.trim()) missingFields.push('Owner Name');
      if (!form.phone_number_1?.trim()) missingFields.push('Phone Number 1');
      if (!form.whatsapp_phone?.trim()) missingFields.push('WhatsApp Phone');
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
      const apiData = { 
        owner_name: form.owner_name,
        phone: form.phone_number_1 || '',
        phone_number: form.phone_number_1 || '',
        phone_number_1: form.phone_number_1 || '',
        phone_number_2: form.phone_number_2 || '',
        whatsapp_phone: form.whatsapp_phone || '',
        property_name: form.property_name,
        county: form.county,
        area: form.area,
        property_type: form.property_type,
        booking_type: form.booking_type,
        package_selected: form.package_selected,
        images: form.images || [],
        rooms: rooms
      };
      
      console.log('Submitting with phone_number_1:', apiData.phone_number_1);
      const result = await api.submitProperty(apiData);
      if (result.success) {
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
        clearPropertyForm();
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
    clearPropertyForm();
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

  const handlePaymentPhoneChange = (propertyId, value) => {
    setPaymentPhones(prev => ({
      ...prev,
      [propertyId]: value,
    }));
  };

  const handleOpenPaymentPanel = (propertyId) => {
    setPaymentPanelPropertyId(propertyId);
  };

  const handleClosePaymentPanel = () => {
    setPaymentPanelPropertyId(null);
  };

  const clearScheduledPaymentStatusCheck = (propertyId) => {
    const timeoutId = paymentStatusTimeoutsRef.current[propertyId];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    delete paymentStatusTimeoutsRef.current[propertyId];
    delete paymentStatusAttemptsRef.current[propertyId];
  };

  const schedulePaymentStatusCheck = (propertyId, delayMs = INITIAL_PAYMENT_STATUS_CHECK_DELAY_MS) => {
    const attempts = paymentStatusAttemptsRef.current[propertyId] || 0;
    if (attempts >= MAX_PAYMENT_STATUS_CHECK_ATTEMPTS) {
      delete paymentStatusTimeoutsRef.current[propertyId];
      return;
    }

    paymentStatusAttemptsRef.current[propertyId] = attempts + 1;

    const existingTimeoutId = paymentStatusTimeoutsRef.current[propertyId];
    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId);
    }

    paymentStatusTimeoutsRef.current[propertyId] = window.setTimeout(() => {
      delete paymentStatusTimeoutsRef.current[propertyId];
      handleSyncPropertyPaymentStatus(propertyId, { silent: true, notifyIfFinal: true });
    }, delayMs);
  };

  const handleSyncPropertyPaymentStatus = async (propertyId, options = {}) => {
    const { silent = false, notifyIfFinal = false } = options;

    setPaymentSyncPropertyId(propertyId);
    try {
      const result = await api.syncPropertyPaymentStatus(propertyId);
      if (result.success) {
        const nextStatus = String(result.data?.payment_status || '').trim().toLowerCase();
        await loadProperties();

        if (!silent) {
          showNotification('success', result.message || 'Payment status updated.');
        } else if (notifyIfFinal && nextStatus === 'completed') {
          showNotification('success', result.message || 'MPesa payment confirmed successfully.');
        } else if (notifyIfFinal && nextStatus === 'failed') {
          showNotification('error', result.message || 'MPesa payment was not completed.');
        }

        if (nextStatus === 'initiated') {
          schedulePaymentStatusCheck(
            propertyId,
            silent ? REPEAT_PAYMENT_STATUS_CHECK_DELAY_MS : INITIAL_PAYMENT_STATUS_CHECK_DELAY_MS
          );
        } else {
          clearScheduledPaymentStatusCheck(propertyId);
        }

        return result;
      }

      if (!silent) {
        showNotification('error', result.message || 'Unable to check MPesa payment status.');
      }

      return result;
    } catch (error) {
      if (!silent) {
        showNotification('error', 'Unable to check MPesa payment status.');
      }

      return null;
    } finally {
      setPaymentSyncPropertyId((current) => (current === propertyId ? null : current));
    }
  };

  const handleInitiatePropertyPayment = async (property) => {
    const paymentPhone = resolvePropertyPaymentPhone(property, paymentPhones[property.id]);

    if (!paymentPhone) {
      showNotification('error', 'Enter an MPesa phone number before sending the STK push.');
      return;
    }

    setPaymentLoadingPropertyId(property.id);
    try {
      const result = await api.initiatePropertyPayment(property.id, paymentPhone);
      if (result.success) {
        showNotification('success', result.message || 'MPesa payment request sent successfully.');
        setPaymentPanelPropertyId(null);
        await loadProperties();
        paymentStatusAttemptsRef.current[property.id] = 0;
        schedulePaymentStatusCheck(property.id, INITIAL_PAYMENT_STATUS_CHECK_DELAY_MS);
      } else {
        showNotification('error', result.message || 'Unable to initiate MPesa payment.');
      }
    } catch (error) {
      showNotification('error', 'Unable to initiate MPesa payment.');
    } finally {
      setPaymentLoadingPropertyId(null);
    }
  };

  useEffect(() => {
    const initiatedPropertyIds = new Set();

    visibleProperties.forEach((property) => {
      const propertyId = Number(property.id);
      const paymentStatus = String(property.payment_status || '').trim().toLowerCase();

      if (paymentStatus !== 'initiated') {
        clearScheduledPaymentStatusCheck(propertyId);
        return;
      }

      initiatedPropertyIds.add(propertyId);

      if (paymentSyncPropertyId === propertyId || paymentStatusTimeoutsRef.current[propertyId]) {
        return;
      }

      schedulePaymentStatusCheck(propertyId, INITIAL_PAYMENT_STATUS_CHECK_DELAY_MS);
    });

    Object.keys(paymentStatusTimeoutsRef.current).forEach((propertyId) => {
      const numericPropertyId = Number(propertyId);
      if (!initiatedPropertyIds.has(numericPropertyId)) {
        clearScheduledPaymentStatusCheck(numericPropertyId);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleProperties, paymentSyncPropertyId]);

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
                <label>Phone Number 1 <span className="required">*</span></label>
                <input
                  type="tel"
                  placeholder="Enter primary phone number"
                  className={`input ${errors.phone_number_1 ? 'input-error' : ''}`}
                  value={form.phone_number_1}
                  onChange={e => setForm({ ...form, phone_number_1: e.target.value })}
                />
                {errors.phone_number_1 && <span className="error-text">{errors.phone_number_1}</span>}
              </div>

              <div className="user-form-group">
                <label>Phone Number 2</label>
                <input
                  type="tel"
                  placeholder="Enter secondary phone number"
                  className="input"
                  value={form.phone_number_2}
                  onChange={e => setForm({ ...form, phone_number_2: e.target.value })}
                />
              </div>

              <div className="user-form-group">
                <label>WhatsApp Phone <span className="required">*</span></label>
                <input
                  type="tel"
                  placeholder="Enter WhatsApp phone number"
                  className={`input ${errors.whatsapp_phone ? 'input-error' : ''}`}
                  value={form.whatsapp_phone}
                  onChange={e => setForm({ ...form, whatsapp_phone: e.target.value })}
                />
                {errors.whatsapp_phone && <span className="error-text">{errors.whatsapp_phone}</span>}
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

          {/* Property Images */}
          <div className="user-card">
            <h2 className="user-card-title">Property Images</h2>
            <div className="user-form-group">
              <label>Select Images</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className={`input ${errors.images ? 'input-error' : ''}`}
                onChange={handleImageSelection}
              />
              <span className="user-file-helper">
                Upload up to {MAX_PROPERTY_IMAGES} images.
              </span>
              {processingImages && (
                <span className="user-file-helper">Processing selected images...</span>
              )}
              {errors.images && <span className="error-text">{errors.images}</span>}
            </div>

            {(form.images || []).length > 0 && (
              <>
                <div className="user-image-count">
                  {(form.images || []).length} / {MAX_PROPERTY_IMAGES} images selected
                </div>
                <div className="user-image-preview-grid">
                  {(form.images || []).map((image, index) => (
                    <div key={`${index}-${image.slice(0, 20)}`} className="user-image-preview-card">
                      <img
                        src={image}
                        alt={`Property preview ${index + 1}`}
                        className="user-image-preview"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className="user-image-remove"
                        onClick={() => handleRemoveImage(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
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
            <button type="submit" className="btn btn-primary" disabled={loading || processingImages}>
              {processingImages ? 'Processing Images...' : loading ? 'Submitting...' : 'Submit Property'}
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
              {visibleProperties.map((property) => {
                const paymentStatus = String(property.payment_status || 'unpaid').trim().toLowerCase();
                const canInitiatePayment = !['approved'].includes(String(property.status || '').trim().toLowerCase())
                  && ['unpaid', 'failed', ''].includes(paymentStatus);
                const isPaymentPanelOpen = paymentPanelPropertyId === property.id;
                const showPaymentPanel = !canInitiatePayment || isPaymentPanelOpen;
                const paymentPhone = resolvePropertyPaymentPhone(property, paymentPhones[property.id]);
                const numericPaymentAmount = Number(property.payment_amount);
                const packagePriceLabel = (Number.isFinite(numericPaymentAmount) && numericPaymentAmount > 0
                  ? formatCurrencyValue(numericPaymentAmount)
                  : null)
                  || resolvePackagePriceLabel(property.package_selected);
                const packageDisplayLabel = packagePriceLabel || 'Not set';

                return (
                <div key={property.id} className="user-property-card">
                  <div className="user-property-header">
                    <h3 className="user-property-name">{property.property_name}</h3>
                    <span className={`user-property-status status-${property.status || 'pending'}`}>
                      {property.status || 'pending'}
                    </span>
                  </div>
                  
                  <div className="user-property-details">
                    <div className="user-property-detail">
                      <span className="detail-label">Owner:</span>
                      <span className="detail-value">{property.owner_name}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Phone Number 1:</span>
                      <span className="detail-value">{property.phone_number_1 || property.phone || 'N/A'}</span>
                    </div>
                    {property.phone_number_2 && (
                      <div className="user-property-detail">
                        <span className="detail-label">Phone Number 2:</span>
                        <span className="detail-value">{property.phone_number_2}</span>
                      </div>
                    )}
                    <div className="user-property-detail">
                      <span className="detail-label">WhatsApp:</span>
                      <span className="detail-value">{property.whatsapp_phone || 'N/A'}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">County:</span>
                      <span className="detail-value">{property.county || 'N/A'}</span>
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
                      <span className="detail-label">Package:</span>
                      <span className="detail-value">{packageDisplayLabel}</span>
                    </div>
                    <div className="user-property-detail">
                      <span className="detail-label">Date Added:</span>
                      <span className="detail-value">
                        {formatPropertyDateTime(property.created_at)}
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

                  {property.images && property.images.length > 0 && (
                    <div className="user-property-images">
                      <h4>Property Images</h4>
                      <div className="user-property-image-grid">
                        {property.images.map((image, idx) => {
                          const imageSrc = normalizePropertyImage(image);
                          if (!imageSrc) {
                            return null;
                          }

                          return (
                            <img
                              key={`${property.id}-image-${idx}`}
                              src={imageSrc}
                              alt={`${property.property_name} ${idx + 1}`}
                              className="user-property-image-thumb"
                              loading="lazy"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {showPaymentPanel ? (
                    <div
                      className="user-property-rooms"
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        border: '1px solid rgba(209, 213, 219, 0.9)',
                        borderRadius: '14px',
                        background: '#f8fafc',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          flexWrap: 'wrap',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <h4 style={{ margin: 0 }}>Package Payment</h4>
                        <span
                          style={{
                            ...getPaymentStatusStyle(paymentStatus),
                            padding: '0.35rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          {getPaymentStatusLabel(paymentStatus)}
                        </span>
                      </div>

                      <div className="user-property-details">
                        <div className="user-property-detail">
                          <span className="detail-label">Payment Amount:</span>
                          <span className="detail-value">{packageDisplayLabel}</span>
                        </div>
                        <div className="user-property-detail">
                          <span className="detail-label">Payment Phone:</span>
                          <span className="detail-value">{paymentPhone || 'Not requested yet'}</span>
                        </div>
                        {property.payment_requested_at && (
                          <div className="user-property-detail">
                            <span className="detail-label">Requested At:</span>
                            <span className="detail-value">{formatPropertyDateTime(property.payment_requested_at)}</span>
                          </div>
                        )}
                        {property.paid_at && (
                          <div className="user-property-detail">
                            <span className="detail-label">Paid At:</span>
                            <span className="detail-value">{formatPropertyDateTime(property.paid_at)}</span>
                          </div>
                        )}
                        {property.mpesa_receipt_number && (
                          <div className="user-property-detail">
                            <span className="detail-label">Receipt:</span>
                            <span className="detail-value">{property.mpesa_receipt_number}</span>
                          </div>
                        )}
                      </div>

                      {!!property.payment_result_desc && (
                        <p style={{ margin: '0.85rem 0 0', color: '#475569', lineHeight: '1.5' }}>
                          {property.payment_result_desc}
                        </p>
                      )}

                      {canInitiatePayment && (
                        <div style={{ marginTop: '1rem' }}>
                          <label
                            htmlFor={`payment-phone-${property.id}`}
                            style={{ display: 'block', fontWeight: 600, marginBottom: '0.45rem' }}
                          >
                            MPesa Phone Number
                          </label>
                          <input
                            id={`payment-phone-${property.id}`}
                            type="tel"
                            className="input"
                            value={paymentPhone}
                            onChange={(event) => handlePaymentPhoneChange(property.id, event.target.value)}
                            placeholder="07... or 2547..."
                            style={{ width: '100%', marginBottom: '0.75rem' }}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleInitiatePropertyPayment(property)}
                              disabled={paymentLoadingPropertyId === property.id}
                            >
                              {paymentLoadingPropertyId === property.id
                                ? 'Sending STK...'
                                : packagePriceLabel
                                  ? `Pay ${packagePriceLabel} with MPesa`
                                  : 'Pay with MPesa'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={handleClosePaymentPanel}
                              disabled={paymentLoadingPropertyId === property.id}
                            >
                              Cancel
                            </button>
                          </div>
                          <p style={{ margin: '0.6rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Use the payer&apos;s Safaricom number. We&apos;ll send the STK push and update this card after confirmation.
                          </p>
                        </div>
                      )}

                      {paymentStatus === 'initiated' && (
                        <>
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleSyncPropertyPaymentStatus(property.id)}
                              disabled={paymentSyncPropertyId === property.id}
                            >
                              {paymentSyncPropertyId === property.id ? 'Checking Daraja...' : 'Check Payment Status'}
                            </button>
                          </div>
                          <div className="user-alert user-alert-success" style={{ marginTop: '1rem' }}>
                            An MPesa prompt has been sent. Complete the payment on the phone and we&apos;ll keep checking Daraja for confirmation.
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div
                      className="user-property-rooms"
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        border: '1px solid rgba(209, 213, 219, 0.9)',
                        borderRadius: '14px',
                        background: '#f8fafc',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          flexWrap: 'wrap',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <h4 style={{ margin: 0 }}>Package Payment</h4>
                        <span
                          style={{
                            ...getPaymentStatusStyle(paymentStatus),
                            padding: '0.35rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          {getPaymentStatusLabel(paymentStatus)}
                        </span>
                      </div>
                      <div className="user-property-detail" style={{ marginBottom: '0.75rem' }}>
                        <span className="detail-label">Amount to Pay:</span>
                        <span className="detail-value">{packageDisplayLabel}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleOpenPaymentPanel(property.id)}
                      >
                        {packagePriceLabel ? `Make Payment (${packagePriceLabel})` : 'Make Payment'}
                      </button>
                    </div>
                  )}

                  <div className="user-property-footer">
                    <span className="user-property-date">
                      Added: {formatPropertyDateTime(property.created_at)}
                    </span>
                  </div>
                </div>
                );
              })}
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
            Start package payments from the My Properties tab. Use this section only when you need to forward a manual MPesa message to admin.
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







