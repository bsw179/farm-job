import React, { useState } from 'react';

export default function BoundaryImport() {
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = function (event) {
      try {
        const json = JSON.parse(event.target.result);
        setMessage('File loaded successfully. Ready to assign.');
        console.log('Parsed boundary:', json);
      } catch (err) {
        console.error(err);
        setMessage('Invalid GeoJSON file.');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Import Field Boundaries</h2>
      <input type="file" accept=".json,.geojson" onChange={handleFile} className="mb-4" />
      {fileName && <p className="text-sm text-gray-600">Loaded file: <strong>{fileName}</strong></p>}
      {message && <p className="text-green-700 font-semibold">{message}</p>}
      <p className="text-sm text-gray-500 mt-2">Upload a valid GeoJSON file. We'll help you assign each one to a field + crop year.</p>
    </div>
  );
}
