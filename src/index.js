import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Clear any mock mode settings and use real backend
localStorage.removeItem('USE_MOCK');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
