import React from 'react';
import ReactDOM from 'react-dom/client';
import AppLayout from './AppLayout.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </React.StrictMode>
);
