import { useState } from 'react';
import Fields from './pages/Fields';
import ImportFields from './pages/ImportFields';

export default function AppLayout() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [mobileMenu, setMobileMenu] = useState(null);
  const [cropYear, setCropYear] = useState(2025);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const pages = {
    Farm: ['Fields', 'Jobs', 'Crop Budget', 'Reminders'],
    Mapping: ['Map Viewer', 'Map Creator'],
    Records: ['Field History', 'Crop History', 'Calendar', 'Documents', 'Field Metrics', 'Inventory']
  };

  return (
    <div className="flex min-h-screen font-sans text-gray-800">
      {/* Sidebar */}
      <aside className="hidden md:block w-64 bg-white shadow-xl p-6 border-r border-gray-200">
        <h2 className="text-2xl font-extrabold text-blue-800 mb-8 tracking-tight">🌾 Farm Job</h2>
        <nav className="flex flex-col gap-4 text-sm">
          <button
            onClick={() => setActivePage('Dashboard')}
            className={`text-left px-3 py-1.5 rounded-md transition font-medium ${activePage === 'Dashboard' ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50'}`}
          >
            Dashboard
          </button>
          {Object.entries(pages).map(([label, pageList]) => (
            <details key={label} className="group">
              <summary className="cursor-pointer text-xs uppercase font-bold text-gray-600 group-open:text-blue-700">{label}</summary>
              <div className="flex flex-col mt-1 ml-2 gap-1">
                {pageList.map((page) => (
                  <button
                    key={page}
                    onClick={() => setActivePage(page)}
                    className={`text-left px-3 py-1.5 rounded-md transition font-medium ${activePage === page ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-white p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 items-center">
            <h1 className="text-2xl font-extrabold text-blue-800 tracking-tight">🌾 Farm Job</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 items-center">
              <button onClick={() => setCropYear((y) => y - 1)} className="text-blue-600 hover:text-blue-800 font-bold">⬅</button>
              <span className="text-lg font-semibold text-gray-700">{cropYear}</span>
              <button onClick={() => setCropYear((y) => y + 1)} className="text-blue-600 hover:text-blue-800 font-bold">➡</button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 rounded-full bg-blue-800 text-white font-bold"
              >
                BW
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border shadow rounded text-sm z-50">
                  <div className="px-4 py-2 border-b font-semibold">User Profile</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Profile Settings</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Users</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Logout</button>
                  <div className="px-4 py-2 border-t font-semibold">Setup</div>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Product Import</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Field Import</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Boundary Import</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Job Types</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Audit Log</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page rendering */}
        {activePage === 'Fields' && <Fields cropYear={cropYear} />}
        {activePage === 'Import Fields' && <ImportFields />}
        {activePage !== 'Fields' && activePage !== 'Import Fields' && (
          <div className="bg-white p-6 rounded-xl shadow text-gray-500 italic">
            📄 {activePage} page content will appear here.
          </div>
        )}
      </main>

      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-inner flex justify-around items-center py-2 text-sm md:hidden z-50">
        {['Dashboard', 'Farm', 'Mapping', 'Records'].map((section) => (
          <button
            key={section}
            onClick={() => {
              if (section === 'Dashboard') setActivePage('Dashboard');
              else setMobileMenu(section);
            }}
            className="flex flex-col items-center text-gray-700 hover:text-blue-700 px-2"
          >
            <span className="text-xs font-semibold">{section}</span>
          </button>
        ))}
      </div>

      {/* Mobile submenu overlay */}
      {mobileMenu && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col p-6 text-sm md:hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-blue-800">{mobileMenu}</h2>
            <button onClick={() => setMobileMenu(null)} className="text-gray-500 hover:text-blue-700 text-xl">×</button>
          </div>
          <div className="flex flex-col gap-3">
            {pages[mobileMenu].map((page) => (
              <button
                key={page}
                onClick={() => {
                  setActivePage(page);
                  setMobileMenu(null);
                }}
                className="text-left px-4 py-2 rounded-lg transition font-medium bg-gray-100 hover:bg-blue-100"
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
