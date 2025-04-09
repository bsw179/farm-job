// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { CropYearProvider } from './context/CropYearContext';
import './index.css';
// Global error suppressor for WGS84 crash
window.onerror = function (msg) {
  if (msg && typeof msg === 'string' && msg.includes('WGS84')) {
    console.warn('🟡 WGS84 error suppressed');
    return true; // prevent full crash
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CropYearProvider>
        <AppLayout />
      </CropYearProvider>
    </BrowserRouter>
  </React.StrictMode>
);
