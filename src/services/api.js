// PlotConnect API Service
// Connects to PHP backend

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://marketers-backend.onrender.com';

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: 'Network error. Please check your connection.' };
  }
}

const api = {
  // Authentication
  async checkAuth() {
    return await fetchAPI('/api/auth/check.php');   // FIXED
  },

  async login(type, credentials) {
    return await fetchAPI('/api/auth/login.php', {  // FIXED
      method: 'POST',
      body: JSON.stringify({ type, ...credentials }),
    });
  },

  async logout() {
    return await fetchAPI('/api/auth/logout.php');  // FIXED
  },

  // Properties (Marketer)
  async submitProperty(data) {
    return await fetchAPI('/api/marketer/submit-property.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyProperties() {
    return await fetchAPI('/api/marketer/my-properties.php');
  },

  async deleteProperty(id) {
    return await fetchAPI('/api/marketer/delete-property.php', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  // Admin
  async getAdminStats() {
    return await fetchAPI('/api/admin/dashboard.php');
  },

  async getMarketers() {
    return await fetchAPI('/api/admin/marketers.php');
  },

  async addMarketer(data) {
    return await fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteMarketer(id) {
    return await fetchAPI('/api/admin/marketers.php', {
      method: 'POST',
      body: JSON.stringify({ id, action: 'delete' }),
    });
  },

  async getAllProperties() {
    return await fetchAPI('/api/admin/properties.php');
  },

  async updatePropertyStatus(id, status) {
    return await fetchAPI('/api/admin/properties.php', {
      method: 'POST',
      body: JSON.stringify({ id, status, action: 'update_status' }),
    });
  },

  async deletePropertyAdmin(id) {
    return await fetchAPI('/api/admin/properties.php', {
      method: 'POST',
      body: JSON.stringify({ id, action: 'delete' }),
    });
  }
};

export default api;