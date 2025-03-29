import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const pages = {
  Farm: ['Fields', 'Jobs', 'Crop Budget', 'Reminders', 'Reports'],
  Mapping: ['Map Viewer', 'Map Creator'],
  Records: ['Field History', 'Crop History', 'Calendar', 'Documents', 'Field Metrics', 'Inventory']
};

export default function Sidebar({ activePage, onPageChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handlePageClick = (page) => {
    onPageChange(page);
    if (page === 'Fields') navigate('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white shadow-xl border-r border-gray-200 overflow-y-auto max-h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-2xl font-extrabold text-blue-800 mb-8 tracking-tight">🌾 Farm Job</h2>
        <nav className="flex flex-col gap-4 text-sm">
          <button
            onClick={() => handlePageClick('Dashboard')}
            className={`text-left px-3 py-1.5 rounded-md transition font-medium ${activePage === 'Dashboard' ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50'}`}
          >
            Dashboard
          </button>
          {Object.entries(pages).map(([group, list]) => (
            <details key={group} className="group">
              <summary className="cursor-pointer text-xs uppercase font-bold text-gray-600 group-open:text-blue-700">{group}</summary>
              <div className="flex flex-col mt-1 ml-2 gap-1">
                {list.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    className={`text-left px-3 py-1.5 rounded-md transition font-medium ${activePage === page ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </nav>
      </div>
    </aside>
  );
}
