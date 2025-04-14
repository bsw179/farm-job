// src/layouts/AppLayout.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { CropYearProvider } from '@/context/CropYearContext';

// Page imports
import Dashboard from '@pages/Dashboard';
import Fields from '@/pages/Fields';
import FieldDetail from '@/pages/FieldDetail';
import FieldBoundaryEditor from '@/pages/FieldBoundaryEditor';
import MapViewer from '@/pages/MapViewer';
import ProfileSettings from '@/pages/ProfileSettings';
import ManageUsers from '@/pages/ManageUsers';
import Products from '@/pages/Products';
import ManagePartners from '@/pages/ManagePartners';
import ManageCropTypes from '@/pages/ManageCropTypes';
import Jobs from '@/pages/Jobs';
import Reports from '@/pages/Reports';
import FieldMetrics from '@/pages/FieldMetrics';
import BoundaryUploadMapbox from '@/pages/BoundaryUploadMapbox'; // ✅ ADD THIS
import ManageJobTypes from '@/pages/Setup/ManageJobTypes';
import JobSummaryPage from '@/pages/JobSummaryPage';
import CreateJobPage from '@/pages/CreateJobPage'; // 👈 This import should be at the top
import EditJobPolygon from "../pages/EditJobPolygon";
import FieldJobSummaryPage from "../pages/FieldJobSummaryPage";
import SeedingReport from '../pages/Reports/SeedingReport'; // adjust if path is different
import AdminCleanupTools from '../pages/AdminCleanupTools';




export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileNavOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPathFromPage = (page) => {
    const clean = page?.toLowerCase().trim();

    switch (clean) {
      case 'dashboard': return '/';
      case 'fields': return '/fields';
      case 'jobs': return '/jobs';
      case 'reports': return '/reports';
      case 'field metrics': return '/metrics';
      case 'map viewer': return '/map-viewer';

      // TopBar pages
      case 'profile settings': return '/profile-settings';
      case 'manage users': return '/manage-users';
      case 'products': return '/products';
      case 'manage partners': return '/manage-partners';
      case 'manage crop types': return '/setup/manage-crop-types';
      case 'import boundaries': return '/setup/import-boundaries'; // ✅ ADD THIS
      case 'manage job types': return '/setup/manage-job-types';

      default:
        console.warn('Unknown page label:', page);
        return '/';
    }
  };

  return (
    <CropYearProvider>
      <div className="flex min-h-screen font-sans text-gray-800 relative">
        {/* Sidebar */}
        <div
          className={`fixed md:static top-0 left-0 z-40 bg-blue-800 w-64 h-full md:h-screen transform transition-transform duration-300 ease-in-out ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-blue-800 text-white px-4 py-3 flex items-center justify-between border-b border-blue-700">
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="text-white text-xl">☰</button>
          <span className="font-bold text-lg">Farm Job</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col pt-[64px] md:pt-0">
          <main className="flex-1 p-4 overflow-y-auto">
            <TopBar onNavigate={(page) => (window.location.href = getPathFromPage(page))} />

            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fields" element={<Fields />} />
              <Route path="/fields/:fieldId" element={<FieldDetail />} />
              <Route path="/fields/:fieldId/boundary-editor" element={<FieldBoundaryEditor />} />
              <Route path="/map-viewer" element={<MapViewer />} />
              <Route path="/profile-settings" element={<ProfileSettings />} />
              <Route path="/manage-users" element={<ManageUsers />} />
              <Route path="/products" element={<Products />} />
              <Route path="/manage-partners" element={<ManagePartners />} />
              <Route path="/setup/manage-crop-types" element={<ManageCropTypes />} />
              <Route path="/setup/import-boundaries" element={<BoundaryUploadMapbox />} /> {/* ✅ Route is here */}
              <Route path="/reports" element={<Reports />} />
              <Route path="/metrics" element={<FieldMetrics />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              <Route path="/setup/manage-job-types" element={<ManageJobTypes />} />
              <Route path="/jobs/summary" element={<JobSummaryPage />} />
              <Route path="/jobs/create" element={<CreateJobPage />} /> // 👈 Add this route
              <Route path="/jobs/edit-area/:fieldId" element={<EditJobPolygon />} />
              <Route path="/jobs/field/:jobId" element={<FieldJobSummaryPage />} />
              <Route path="/reports/seeding" element={<SeedingReport />} />
             <Route path="/admin-tools" element={<AdminCleanupTools />} />
            



            </Routes>
          </main>
        </div>
      </div>
    </CropYearProvider>
  );
}
