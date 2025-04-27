import React from 'react';

export default function EditAreaModal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="relative bg-white w-full h-full overflow-hidden rounded-lg shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full z-10"
        >
          ✖
        </button>
        <div className="w-full h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
