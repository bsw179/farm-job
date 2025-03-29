import React from 'react';

export default function Reports() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Reports</h2>
      <p className="text-gray-600 text-sm">This will display all reports such as:</p>
      <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
        <li>Seeding Report</li>
        <li>Crop Insurance Acreage Report</li>
        <li>Planting Date Report</li>
        <li>Vendor Summary</li>
        <li>Job Cost Breakdown</li>
      </ul>
    </div>
  );
}
