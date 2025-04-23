import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useContext } from 'react';
import { CropYearContext } from '@/context/CropYearContext';
import { useUser } from '@/context/UserContext';
import { deleteDoc, doc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { storage } from '@/firebase';

export default function CropMaps() {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const { user, role, loading } = useUser();
  if (loading || !role) return null;

  const { cropYear } = useContext(CropYearContext);

useEffect(() => {
  const fetchMaps = async () => {
    const snap = await getDocs(collection(db, 'maps'));
    const allMaps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
const filtered = allMaps
  .filter(map => map.cropYear === cropYear)
  .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    setMaps(filtered);
  };
  fetchMaps();
}, [cropYear]);

const handleDelete = async () => {
  const confirmDelete = window.confirm('Are you sure you want to delete this map snapshot?');
  if (!confirmDelete || !selectedMap) return;

  try {
    // Delete from Firestore
    await deleteDoc(doc(db, 'maps', selectedMap.id));

    // Delete image from Storage
    const fileRef = storageRef(storage, `mapSnapshots/${selectedMap.cropYear}/${selectedMap.imageUrl.split('/').pop().split('?')[0]}`);
    await deleteObject(fileRef);

    // Remove from UI
    setMaps(prev => prev.filter(m => m.id !== selectedMap.id));
    setSelectedMap(null);
  } catch (err) {
    console.error('🧨 Delete failed:', err);
    alert('Failed to delete the map. Check console for details.');
  }
};
return (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Crop Maps</h1>

 {maps.length === 0 ? (
  <div className="text-center text-gray-500 text-sm italic mt-12">
    No map snapshots available for {cropYear}.
  </div>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    {maps.map(map => (
      <div
        key={map.id}
        onClick={() => setSelectedMap(map)}
        className="cursor-pointer border rounded-xl shadow p-3 bg-white hover:shadow-lg transition"
      >
        <img
          src={map.imageUrl}
          alt={map.title}
          className="w-full h-auto rounded-lg mb-4"
        />
        <div className="px-2">
          <h2 className="text-lg font-bold leading-tight">{map.title}</h2>
          <p className="text-sm text-gray-500 mt-1">Year: {map.cropYear}</p>
        </div>
      </div>
    ))}
  </div>
)}


    {/* ✅ Modal */}
    {selectedMap && (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
  <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl my-8 p-6">

          <button
            className="absolute top-3 right-4 text-gray-500 hover:text-black text-xl"
            onClick={() => setSelectedMap(null)}
          >
            ✕
          </button>

          <img
            src={selectedMap.imageUrl}
            alt={selectedMap.title}
            className="w-full h-auto mb-4"
          />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-xl font-bold">{selectedMap.title}</h2>
            <p className="text-sm text-gray-500 mt-2 md:mt-0">
              Crop Year: {selectedMap.cropYear}
            </p>
          </div>

          <div className="h-4" /> {/* Spacer to keep image clear of sticky footer */}

<div className="sticky bottom-0 left-0 bg-white border-t pt-4 pb-2 mt-6 flex flex-wrap items-center justify-between">
  {/* Cancel on the left */}
  <button
    onClick={() => setSelectedMap(null)}
    className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm"
  >
    Cancel
  </button>

  {/* Buttons on the right */}
  <div className="flex flex-wrap gap-3">
    <button
      onClick={async () => {
        try {
          const response = await fetch(selectedMap.imageUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);

          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `${selectedMap.title || 'map'}.png`;

          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Download failed:', err);
          alert('Download failed. Check console.');
        }
      }}
      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
    >
      Download
    </button>

    <button
      onClick={() => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>${selectedMap.title}</title>
             <style>
  @page {
    margin: 0;
  }

  body {
    margin: 0;
    padding: 0;
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  img {
    max-width: 100vw;
    max-height: 100vh;
    width: 100%;
    height: auto;
    object-fit: contain;
  }
</style>

            </head>
            <body>
              <img src="${selectedMap.imageUrl}" />
              <script>
                const img = document.querySelector('img');
                img.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }}
      className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
    >
      Print
    </button>

  {role === 'admin' && (
  <button
    onClick={() => {
      const confirmDelete = window.confirm('Are you sure you want to delete this map snapshot? This cannot be undone.');
      if (confirmDelete) handleDelete();
    }}
    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
  >
    Delete
  </button>
)}

  </div>
</div>


        </div>
      </div>
    )}
  </div>
);
}