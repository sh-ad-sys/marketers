// PlotConnect API Service

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://marketers-backend.onrender.com';

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'include', // IMPORTANT for sessions
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
}

const api = {
  // AUTH — routed through index.php via ?request=
  checkAuth: () => fetchAPI('/?request=check-auth'),

  login: (type, credentials) =>
    fetchAPI('/?request=login', {
      method: 'POST',
      body: { type, ...credentials },
    }),

  logout: () => fetchAPI('/?request=logout'),

  // MARKETER
  submitProperty: (data) =>
    fetchAPI('/?request=submit-property', {
      method: 'POST',
      body: data,
    }),

  getMyProperties: () => fetchAPI('/?request=my-properties'),

  deleteProperty: (id) =>
    fetchAPI('/?request=delete-property', {
      method: 'POST',
      body: { id },
    }),

  // ADMIN
  getAdminStats: () => fetchAPI('/?request=admin'),

  getMarketers: () => fetchAPI('/?request=marketers'),

  addMarketer: (data) =>
    fetchAPI('/?request=marketers', {
      method: 'POST',
      body: data,
    }),

  deleteMarketer: (id) =>
    fetchAPI('/?request=marketers', {
      method: 'POST',
      body: { id, action: 'delete' },
    }),

  getAllProperties: () => fetchAPI('/?request=all-properties'),

  updatePropertyStatus: (id, status) =>
    fetchAPI('/?request=all-properties', {
      method: 'POST',
      body: { id, status, action: 'update_status' },
    }),

  deletePropertyAdmin: (id) =>
    fetchAPI('/?request=all-properties', {
      method: 'POST',
      body: { id, action: 'delete' },
    }),
};

export default api;