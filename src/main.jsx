import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { CropYearProvider } from './context/CropYearContext';
import './index.css';

// 🧨 Global error trap
window.onerror = function (message, source, lineno, colno, error) {
  console.error('🧨 Global Error Caught:', {
    message,
    source,
    lineno,
    colno,
    error,
  });
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
