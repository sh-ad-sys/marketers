// PlotConnect API Service
const configuredBaseUrl = (process.env.REACT_APP_API_BASE_URL || '').trim();
const API_BASE_URL = configuredBaseUrl || 'http://localhost/plotconnect';

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
    const url = API_BASE_URL + endpoint;
    console.log('=== API CALL ===');
    console.log('URL:', url);
    console.log('Options:', options);
    console.log('Request body:', options.body);
    
    console.log('Sending headers:', { role, username, marketerId, token: token ? 'present' : 'not set' });
    console.log('Request body:', options.body);

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Auth-Role': role,
      'X-Auth-User': username,
      'X-Auth-Marketer-Id': marketerId,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    });

    // Get response text first to handle empty responses
    const responseText = await response.text();
    
    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      console.error('Empty response from server - URL:', url);
      console.error('HTTP Status:', response.status);
      throw new Error(`Server returned empty response (HTTP ${response.status}). Check if XAMPP Apache is running and the API path is correct.`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      console.error('HTTP Status:', response.status);
      throw new Error(`Invalid JSON from server: ${responseText.substring(0, 200)}`);
    }
    
    console.log('=== API RESPONSE ===');
    console.log('URL:', url);
    console.log('Response:', data);
    console.log('Response headers:', [...response.headers.entries()]);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    let errorMsg = 'Network error. Please check your connection.';
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      errorMsg = 'Cannot connect to server. Make sure XAMPP is running.';
    }
    // Include response data if available
    if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    } else if (error.message) {
      errorMsg = error.message;
    }
    return {
      success: false,
      message: errorMsg,
    };
  }
}

const api = {
  checkAuth: () => fetchAPI('/api/auth/check.php'),
  testHeaders: () => fetchAPI('/api/marketer/test-headers.php', { method: 'POST' }),
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
    localStorage.removeItem('mustChangePassword');
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
  authorizeMarketer: (id) =>
    fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: { id, action: 'authorize' },
    }),
  rejectMarketer: (id) =>
    fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: { id, action: 'reject' },
    }),
  blockMarketer: (id) =>
    fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: { id, action: 'block' },
    }),
  unblockMarketer: (id) =>
    fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: { id, action: 'unblock' },
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
  refreshUserPlots: () =>
    fetchAPI('/api/admin/properties.php', {
      method: 'POST',
      body: { action: 'refresh_user_plots' },
    }),
  submitMpesaMessage: (data) =>
    fetchAPI('/api/marketer/mpesa.php', {
      method: 'POST',
      body: data,
    }),
  getMpesaMessages: () =>
    fetchAPI('/api/marketer/mpesa.php'),
  getAdminMpesaMessages: () =>
    fetchAPI('/api/admin/mpesa-messages.php'),
  updateMpesaMessage: (messageId, action) =>
    fetchAPI('/api/admin/mpesa-messages.php', {
      method: 'POST',
      body: { message_id: messageId, action },
    }),
  changeMarketerPassword: (currentPassword, newPassword) =>
    fetchAPI('/api/marketer/change-password.php', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    }),
  requestPasswordReset: (type, email) =>
    fetchAPI('/api/auth/request-password-reset.php', {
      method: 'POST',
      body: { type, email },
    }),
  resetPassword: (type, email, token, newPassword) =>
    fetchAPI('/api/auth/reset-password.php', {
      method: 'POST',
      body: { type, email, token, new_password: newPassword },
    }),
};

export default api;
