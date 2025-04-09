// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { CropYearProvider } from './context/CropYearContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CropYearProvider>
        <AppLayout />
      </CropYearProvider>
    </BrowserRouter>
  </React.StrictMode>
);
