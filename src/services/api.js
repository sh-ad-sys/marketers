// PlotConnect API Service

// For local development with XAMPP
let API_BASE_URL = 'http://localhost/plotconnect';

// Check if we're in production
if (window.location.hostname !== 'localhost') {
    API_BASE_URL = 'https://marketers-backend.onrender.com';
}

// Debug: log the API URL being used
console.log('Running on:', window.location.hostname);
console.log('API Base URL:', API_BASE_URL);

async function fetchAPI(endpoint, options = {}) {
  try {
    // Get JWT token from localStorage
    const token = localStorage.getItem('token') || '';
    const role = localStorage.getItem('role') || '';
    const username = localStorage.getItem('username') || localStorage.getItem('name') || '';
    const marketerId = localStorage.getItem('marketerId') || '';
    const isLocal = window.location.hostname === 'localhost';

    const url = API_BASE_URL + endpoint;
    console.log('API Request:', url, options);

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    console.log('API Response:', data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    let errorMsg = 'Network error. Please check your connection.';
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      errorMsg = 'Cannot connect to server. Make sure XAMPP is running.';
    }
    return {
      success: false,
      message: errorMsg,
    };
  }
}

const api = {
  checkAuth: () => fetchAPI('/api/auth/check.php'),
  login: (type, credentials) =>
    fetchAPI('/api/auth/login.php', {
      method: 'POST',
      body: { type, ...credentials },
    }),
  logout: () => {
    // Clear JWT token and localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    localStorage.removeItem('marketerId');
    return Promise.resolve({ success: true });
  },
  submitProperty: (data) =>
    fetchAPI('/api/marketer/submit-property.php', {
      method: 'POST',
      body: data,
    }),
  getMyProperties: () => fetchAPI('/api/marketer/my-properties.php'),
  deleteProperty: (id) =>
    fetchAPI('/api/marketer/delete-property.php', {
      method: 'POST',
      body: { id },
    }),
  getAdminStats: () => fetchAPI('/api/admin/dashboard.php'),
  getMarketers: () => fetchAPI('/api/admin/marketers.php'),
  addMarketer: (data) =>
    fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: data,
    }),
  deleteMarketer: (id) =>
    fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: { id, action: 'delete' },
    }),
  getAllProperties: () => fetchAPI('/api/admin/properties.php'),
  updatePropertyStatus: (id, status) =>
    fetchAPI('/api/admin/properties.php', {
      method: 'POST',
      body: { id, status, action: 'update_status' },
    }),
  deletePropertyAdmin: (id) =>
    fetchAPI('/api/admin/properties.php', {
      method: 'POST',
      body: { id, action: 'delete' },
    }),
};

export default api;
