// src/components/Sidebar.jsx
import React from 'react';
import {
  LayoutDashboard,
  Map,
  ClipboardList,
  Layers3,
  FileText
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const sections = [
  {
  title: 'Farm',
  links: [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Fields', icon: Layers3 },
    { label: 'Jobs', icon: ClipboardList },
    { label: 'Reports', icon: FileText },
    { label: 'Field Metrics', icon: FileText },
    { label: 'Inputs', icon: FileText }, // ← ADD THIS
  ],
},
{
  title: 'Financial',
  links: [
    { label: 'Products Tracker', icon: FileText },
    { label: 'Ledger', icon: FileText },
    { label: 'Summary', icon: FileText },
  ],
},

 {
  title: 'Mapping',
  links: [
    { label: 'Map Viewer', icon: Map },
    { label: 'Crop Maps', icon: Map }, // you can swap Map for Image or FileText if you want
  ],
},

];

export default function Sidebar({ onNavigate }) {
  const location = useLocation();
  
  const navigate = useNavigate();

  const getPathLabel = (path) => {
    if (path.includes('/fields')) return 'Fields';
    if (path.includes('/jobs')) return 'Jobs';
    if (path.includes('/reports')) return 'Reports';
    if (path.includes('/metrics')) return 'Field Metrics';
    if (path.includes('/map-viewer')) return 'Map Viewer';
    if (path.includes('/financial/products')) return 'Products';
    if (path.includes('/financial/ledger')) return 'Ledger';
    if (path.includes('/crop-maps')) return 'Crop Maps';

    return 'Dashboard';
  };

  const getPathFromLabel = (label) => {
    switch (label) {
      case 'Dashboard': return '/';
      case 'Fields': return '/fields';
      case 'Jobs': return '/jobs';
      case 'Reports': return '/reports';
      case 'Map Viewer': return '/map-viewer';
      case 'Field Metrics': return '/metrics';
      case 'Inputs': return '/inputs';
      case 'Products Tracker': return '/financial/products';
      case 'Ledger': return '/financial/ledger';
      case 'Crop Maps': return '/crop-maps';
      case 'Summary': return '/financial/summary';

      default: return '/';
    }
  };

  const activePage = getPathLabel(location.pathname);

  return (
    <aside className="flex flex-col w-64 bg-blue-900 text-blue-100 shadow-xl border-r border-blue-800 overflow-y-auto max-h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-2xl font-extrabold text-white mb-8 tracking-tight">🌾 Farm Job</h2>
        <nav className="flex flex-col gap-8 text-sm">
          {sections.map(({ title, links }) => (
            <div key={title}>
              <div className="px-3 text-base uppercase font-extrabold text-blue-300 tracking-wide mb-2">{title}</div>
              <div className="flex flex-col gap-1">
                {links.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => {
                      navigate(getPathFromLabel(label));
                      if (window.innerWidth < 768 && onNavigate) {
                        onNavigate();
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition font-medium ${
                      activePage === label ? 'bg-blue-700 text-white' : 'hover:bg-blue-800 text-blue-100'
                    }`}
                  >
                    <Icon size={18} /> {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
