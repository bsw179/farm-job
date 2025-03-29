// src/components/TopBar.jsx
import React, { useContext } from 'react';
import { CropYearContext } from '../context/CropYearContext';

export default function TopBar() {
  const { cropYear, setCropYear } = useContext(CropYearContext);

  return (
    <div className="flex justify-between items-center px-6 py-4 border-b bg-white shadow-sm">
      <h1 className="text-xl font-extrabold text-blue-800 tracking-tight">🌾 Farm Job</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCropYear((y) => y - 1)}
          className="text-blue-600 hover:text-blue-800 text-lg font-bold"
        >
          ⬅
        </button>
        <span className="text-lg font-semibold text-gray-700">{cropYear}</span>
        <button
          onClick={() => setCropYear((y) => y + 1)}
          className="text-blue-600 hover:text-blue-800 text-lg font-bold"
        >
          ➡
        </button>
        <div className="w-9 h-9 rounded-full bg-blue-800 text-white font-bold flex items-center justify-center">
          BW
        </div>
      </div>
    </div>
  );
}
