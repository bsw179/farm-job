import React from 'react';
import { useParams } from 'react-router-dom';

export default function FieldDetail() {
  const { fieldId } = useParams();

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Field Details</h2>
      <p className="text-sm text-gray-600 mb-4">Field ID: <strong>{fieldId}</strong></p>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div className="bg-white rounded p-4 shadow">📋 Field Info (Name, Farm, Acres, County)</div>
        <div className="bg-white rounded p-4 shadow">🌱 Crop for {new Date().getFullYear()}</div>
        <div className="bg-white rounded p-4 shadow col-span-2">🧾 Jobs for {new Date().getFullYear()}</div>
        <div className="bg-white rounded p-4 shadow">🗺️ Map Thumbnail</div>
        <div className="bg-white rounded p-4 shadow">📝 Notes</div>
      </div>

      <button className="bg-blue-700 text-white text-sm px-4 py-2 rounded shadow hover:bg-blue-800">Back to Fields</button>
    </div>
  );
}
