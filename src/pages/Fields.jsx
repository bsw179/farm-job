import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import db from '../firebase';
import { Link } from 'react-router-dom';

export default function Fields({ cropYear }) {
  const [fields, setFields] = useState([]);
  const [filterFarm, setFilterFarm] = useState('');
  const [sortKey, setSortKey] = useState('fieldName');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'fields'), (snapshot) => {
      const fieldData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFields(fieldData);
    });
    return () => unsubscribe();
  }, []);

  const filteredFields = fields
    .filter(f => f.cropYear === cropYear || f.crops?.[cropYear])
    .filter(f => !filterFarm || f.farmName === filterFarm)
    .sort((a, b) => {
      if (!a[sortKey] || !b[sortKey]) return 0;
      return a[sortKey].toString().localeCompare(b[sortKey].toString());
    });

  const uniqueFarms = [...new Set(fields.map(f => f.farmName))];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Fields – Crop Year: {cropYear}</h2>

      <div className="flex items-center mb-4 gap-4">
        <label className="text-sm">Filter by Farm:</label>
        <select
          value={filterFarm}
          onChange={(e) => setFilterFarm(e.target.value)}
          className="border p-2 text-sm rounded"
        >
          <option value="">All Farms</option>
          {uniqueFarms.map(farm => (
            <option key={farm} value={farm}>{farm}</option>
          ))}
        </select>

        <label className="text-sm ml-4">Sort by:</label>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="border p-2 text-sm rounded"
        >
          <option value="fieldName">Field Name</option>
          <option value="farmName">Farm Name</option>
          <option value="gpsAcres">GPS Acres</option>
        </select>
      </div>

      <table className="w-full table-auto text-sm border rounded overflow-hidden bg-white shadow">
        <thead className="bg-blue-100 text-left">
          <tr>
            <th className="p-2">Field</th>
            <th className="p-2">Farm</th>
            <th className="p-2">GPS Acres</th>
            <th className="p-2">FSA Acres</th>
            <th className="p-2">County</th>
            <th className="p-2">Crop</th>
            <th className="p-2">Boundary</th>
          </tr>
        </thead>
        <tbody>
          {filteredFields.map((field) => {
            const cropAssigned = field.crops?.[cropYear]?.crop;
            const hasBoundary = !!field.boundary; // or use .geojson if applicable

            return (
              <tr key={field.id} className="hover:bg-blue-50">
                <td className="p-2">
                  <Link to={`/fields/${field.id}`} className="text-blue-700 hover:underline font-semibold">
                    {field.fieldName}
                  </Link>
                </td>
                <td className="p-2">{field.farmName}</td>
                <td className="p-2">{field.gpsAcres}</td>
                <td className="p-2">{field.fsaAcres}</td>
                <td className="p-2">{field.county}</td>
                <td className="p-2">
                  {cropAssigned ? (
                    <span className="text-green-700 font-semibold">Assigned</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-2 text-center">
                  {hasBoundary ? <span className="text-green-600 text-lg">🟢</span> : <span className="text-gray-300">⚪️</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
