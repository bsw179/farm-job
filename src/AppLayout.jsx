// src/AppLayout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Fields from './pages/Fields';
import FieldDetail from './pages/FieldDetail';
import ImportFields from './pages/ImportFields';
import MapViewer from './pages/MapViewer';
import BoundaryUpload from './pages/BoundaryUpload';
import ImportSeeds from './pages/ImportSeeds';
import ImportFertilizers from './pages/ImportFertilizers';
import ImportChemicals from './pages/ImportChemicals';
import ImportRiceSeeds from './pages/ImportRiceSeeds';
import AddSoybeanVariety from './pages/AddSoybeanVariety';
import Reports from './pages/Reports';
import { CropYearProvider } from './context/CropYearContext';

export default function AppLayout() {
  const [activePage, setActivePage] = useState('Fields');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();

  const pages = {
    Farm: ['Fields', 'Jobs', 'Crop Budget', 'Reminders', 'Reports'],
    Mapping: ['Map Viewer', 'Map Creator'],
    Records: ['Field History', 'Crop History', 'Calendar', 'Documents', 'Field Metrics', 'Inventory']
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageChange = (page) => {
    setActivePage(page);
    navigate('/');
  };

  return (
    <CropYearProvider>
      <div className="flex min-h-screen font-sans text-gray-800">
        <Sidebar activePage={activePage} handlePageChange={handlePageChange} />
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
          <TopBar
            activePage={activePage}
            setActivePage={setActivePage}
            showProfileMenu={showProfileMenu}
            setShowProfileMenu={setShowProfileMenu}
            profileMenuRef={profileMenuRef}
            handlePageChange={handlePageChange}
          />
          <div className="p-6">
            <Routes>
              <Route path="/" element={
                <>
                  {activePage === 'Fields' && <Fields />}
                  {activePage === 'Import Fields' && <ImportFields />}
                  {activePage === 'Map Viewer' && <MapViewer />}
                  {activePage === 'Boundary Upload' && <BoundaryUpload />}
                  {activePage === 'Import Seeds' && <ImportSeeds />}
                  {activePage === 'Import Rice Seeds' && <ImportRiceSeeds />}
                  {activePage === 'Import Fertilizers' && <ImportFertilizers />}
                  {activePage === 'Import Chemicals' && <ImportChemicals />}
                  {activePage === 'Add Soybean Variety' && <AddSoybeanVariety />}
                  {activePage === 'Reports' && <Reports />}
                  {[
                    'Fields', 'Import Fields', 'Map Viewer', 'Boundary Upload',
                    'Import Seeds', 'Import Rice Seeds', 'Import Fertilizers',
                    'Import Chemicals', 'Add Soybean Variety', 'Reports'
                  ].indexOf(activePage) === -1 && (
                    <div className="bg-white p-6 rounded-xl shadow text-gray-500 italic">
                      📄 {activePage} page content will appear here.
                    </div>
                  )}
                </>
              } />
              <Route path="/fields/:fieldId" element={<FieldDetail />} />
            </Routes>
          </div>
        </main>
      </div>
    </CropYearProvider>
  );
}
