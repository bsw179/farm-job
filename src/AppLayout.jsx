// src/AppLayout.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { CropYearProvider } from './context/CropYearContext';
import Fields from './pages/Fields';
import FieldDetail from './pages/FieldDetail';
import BoundaryUpload from './pages/BoundaryUpload';

export default function AppLayout() {
  return (
    <CropYearProvider>
      <div className="flex min-h-screen font-sans text-gray-800">
        <Sidebar />
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
          <TopBar />
          <Routes>
            <Route path="/" element={<Fields />} />
            <Route path="/fields/:fieldId" element={<FieldDetail />} />
            <Route path="/boundary-upload" element={<BoundaryUpload />} />
          </Routes>
        </main>
      </div>
    </CropYearProvider>
  );
}

