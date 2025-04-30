// src/layouts/AppLayout.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { CropYearProvider } from "@/context/CropYearContext";
import { UserProvider } from "@/context/UserContext";
import ProtectedRoute from '@/components/ProtectedRoute';
import { auth } from '../firebase';


console.log('👤 Current user:', auth.currentUser);

// Page imports
import Dashboard from "@pages/Dashboard";
import Fields from "@/pages/Fields";
import FieldDetail from "@/pages/FieldDetail";
import FieldBoundaryEditor from "@/pages/FieldBoundaryEditor";
import MapViewer from "@/pages/MapViewer";
import ProfileSettings from "@/pages/ProfileSettings";
import ManageUsers from "@/pages/ManageUsers";
import Products from "@/pages/Products";
import ManagePartners from "@/pages/ManagePartners";
import ManageCropTypes from "@/pages/ManageCropTypes";
import Jobs from "@/pages/Jobs";
import Reports from "@/pages/Reports";
import FieldMetrics from "@/pages/FieldMetrics";
import BoundaryUploadMapbox from "@/pages/BoundaryUploadMapbox";
import ManageJobTypes from "@/pages/Setup/ManageJobTypes";
import JobSummaryPage from "@/pages/JobSummaryPage";
import EditJobPolygonForCreate from "../pages/EditJobPolygonForCreate";
import EditJobPolygonForFieldJob from "../pages/EditJobPolygonForFieldJob";
import FieldJobSummaryPage from "../pages/FieldJobSummaryPage";
import SeedingReport from "../pages/Reports/SeedingReport";
import AdminCleanupTools from "../pages/AdminCleanupTools";
import RequireRole from "@/components/RequireRole"; // add this at the top
import RequireLogin from "@/components/RequireLogin";
import LoginPage from '@/pages/LoginPage';
import InputsPage from '@/pages/InputsPage'; // make sure path matches
import LogProductPurchase from '@/pages/LogProductPurchase';
import ProductsTracker from '@/pages/ProductsTracker';
import ProductLedger from '@/pages/ProductLedger';
import JobsCalendar from "@/pages/JobsCalendar";
import CropMaps from '@/pages/CropMaps';
import RainfallPage from '@/pages/RainfallPage';

// Then inside <Routes>
<Route path="/inputs" element={<InputsPage />} />

export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileNavOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getPathFromPage = (page) => {
    const clean = page?.toLowerCase().trim();

    switch (clean) {
      case "dashboard":
        return "/";
      case "fields":
        return "/fields";
      case "jobs":
        return "/jobs";
      case "reports":
        return "/reports";
      case "field metrics":
        return "/metrics";
      case "map viewer":
        return "/map-viewer";
      case "profile settings":
        return "/profile-settings";
      case "manage users":
        return "/manage-users";
      case "products":
        return "/products";
      case "manage partners":
        return "/manage-partners";
      case "manage crop types":
        return "/setup/manage-crop-types";
      case "import boundaries":
        return "/setup/import-boundaries";
      case "manage job types":
        return "/setup/manage-job-types";
      default:
        console.warn("Unknown page label:", page);
        return "/";
    }
  };

  return (
    <UserProvider>
      <CropYearProvider>
        <div className="flex min-h-screen font-sans text-gray-800 relative">
          {/* Sidebar */}
          <div
            className={`fixed md:static top-0 left-0 z-40 bg-blue-800 w-64 h-full md:h-screen transform transition-transform duration-300 ease-in-out ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            } md:translate-x-0`}
          >
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>

          {/* Mobile Header */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-blue-800 text-white px-4 py-3 flex items-center justify-between border-b border-blue-700">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="text-white text-xl"
            >
              ☰
            </button>
            <span className="font-bold text-lg">Farm Job</span>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col pt-[64px] md:pt-0">
            <main className="flex-1 p-4 overflow-y-auto">
              <TopBar
                onNavigate={(page) =>
                  (window.location.href = getPathFromPage(page))
                }
              />

           <Routes>
  <Route path="/login" element={<LoginPage />} />

  <Route
    path="*"
    element={
      <RequireLogin>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/seeding" element={<SeedingReport />} />
          <Route path="/metrics" element={<FieldMetrics />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/calendar" element={<JobsCalendar />} />
          <Route path="/fields/:fieldId" element={<FieldDetail />} />
          <Route path="/crop-maps" element={<CropMaps />} />
          <Route path="/rainfall" element={<RainfallPage />} />

          {/* Protected Pages */}
      
          <Route
            path="/jobs/field/:jobId"
            element={
              <ProtectedRoute path="/jobs/field/:jobId">
                <FieldJobSummaryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/map-viewer"
            element={
              <ProtectedRoute path="/map-viewer">
                <MapViewer />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fields/:fieldId/boundary-editor"
            element={
              <ProtectedRoute path="/fields/:fieldId/boundary-editor">
                <FieldBoundaryEditor />
              </ProtectedRoute>
            }
          />
<Route
  path="/financial/products"
  element={
    <ProtectedRoute path="/financial/products">
      <ProductsTracker />
    </ProtectedRoute>
  }
/>
<Route
  path="/financial/ledger"
  element={
    <ProtectedRoute path="/financial/ledger">
      <ProductLedger />
    </ProtectedRoute>
  }
/>

          <Route
            path="/manage-users"
            element={
              <ProtectedRoute path="/manage-users">
                <ManageUsers />
              </ProtectedRoute>
            }
          />
import LogProductPurchase from './pages/LogProductPurchase';

<Route
  path="/financial/log"
  element={
    <ProtectedRoute path="/financial/log">
      <LogProductPurchase />
    </ProtectedRoute>
  }
/>

          <Route
            path="/products"
            element={
              <ProtectedRoute path="/products">
                <Products />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manage-partners"
            element={
              <ProtectedRoute path="/manage-partners">
                <ManagePartners />
              </ProtectedRoute>
            }
          />

          <Route
            path="/setup/manage-crop-types"
            element={
              <ProtectedRoute path="/setup/manage-crop-types">
                <ManageCropTypes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/setup/import-boundaries"
            element={
              <ProtectedRoute path="/setup/import-boundaries">
                <BoundaryUploadMapbox />
              </ProtectedRoute>
            }
          />

          <Route
            path="/setup/manage-job-types"
            element={
              <ProtectedRoute path="/setup/manage-job-types">
                <ManageJobTypes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-tools"
            element={
              <ProtectedRoute path="/admin-tools">
                <AdminCleanupTools />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/summary"
            element={
              <ProtectedRoute path="/jobs/summary">
                <JobSummaryPage />
              </ProtectedRoute>
            }
          />
           <Route
            path="/inputs"
            element={
              <ProtectedRoute path="/inputs">
               <InputsPage />
             </ProtectedRoute>
           }
         />

          <Route
  path="/jobs/edit-area/create/:fieldId"
  element={
    <ProtectedRoute path="/jobs/edit-area/create/:fieldId">
      <EditJobPolygonForCreate />
    </ProtectedRoute>
  }
/>
<Route
  path="/jobs/edit-area/field-job/:fieldId"
  element={
    <ProtectedRoute path="/jobs/edit-area/field-job/:fieldId">
      <EditJobPolygonForFieldJob />
    </ProtectedRoute>
  }
/>

        </Routes>
      </RequireLogin>
    }
  />
</Routes>


            </main>
          </div>
        </div>
      </CropYearProvider>
    </UserProvider>
  );
}
