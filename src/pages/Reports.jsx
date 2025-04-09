// src/pages/Reports.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Reports() {
  const reports = [
    {
      title: 'Seeding Report',
      path: '/reports/seeding',
      description: 'Detailed breakdown of all seeding jobs including fields, operators, varieties, and vendor usage.'
    },
    {
      title: 'Crop Insurance Report',
      path: '/reports/crop-insurance',
      description: 'Placeholder for a crop insurance summary report, organized by county and FSA data.'
    },
    {
      title: 'FSA Planting Date Report',
      path: '/reports/planting-dates',
      description: 'Placeholder for generating FSA-compliant planting date reports.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">📊 Reports</h2>
      <p className="text-gray-600 mb-6">View and export summaries for your field activity, seed usage, and more.</p>
      <div className="space-y-4">
        {reports.map((r) => (
          <Link key={r.title} to={r.path} className="block border rounded p-4 hover:bg-gray-50 transition">
  <h3 className="text-lg font-semibold text-blue-600">{r.title}</h3>
  <p className="text-sm text-gray-600">{r.description}</p>
</Link>

        ))}
      </div>
    </div>
  );
}
