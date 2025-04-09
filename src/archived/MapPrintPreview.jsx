// src/pages/MapViewer.jsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, LayersControl } from 'react-leaflet';
import { collection, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase';
import { CropYearContext } from '../context/CropYearContext';

const { BaseLayer } = LayersControl;

const cropColors = {
  Corn: '#facc15',
  Soybeans: '#4ade80',
  Rice: '#60a5fa',
  Wheat: '#f97316',
  default: '#a3a3a3',
};

export default function MapViewer() {
  const [fields, setFields] = useState([]);
  const [colorMode, setColorMode] = useState('crop');
  const [mapTitle, setMapTitle] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const { cropYear } = useContext(CropYearContext);
  const mapRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const data = snapshot.docs.map(doc => {
        const field = { id: doc.id, ...doc.data() };
        if (typeof field.boundary?.geojson === 'string') {
          field.boundary.geojson = JSON.parse(field.boundary.geojson);
        }
        return field;
      });
      setFields(data);
    };
    fetchData();
  }, []);

  const getColor = (field) => {
    const crop = field.crops?.[cropYear]?.crop;
    return cropColors[crop] || cropColors.default;
  };

  const handleGeneratePdf = async () => {
    const mapElement = mapRef.current;
    if (!mapElement) return;

    const canvas = await html2canvas(mapElement);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    const imgWidth = 515;
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    pdf.setFontSize(16);
    pdf.text(mapTitle || 'Farm Map', 40, 50);
    pdf.addImage(imgData, 'PNG', 40, 70, imgWidth, imgHeight);

    pdf.save(`${mapTitle || 'Farm_Map'}.pdf`);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">🗺️ Map Viewer</h2>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Enter map title"
          className="px-4 py-2 border rounded w-1/3"
          value={mapTitle}
          onChange={(e) => setMapTitle(e.target.value)}
        />

        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="none">None</option>
          <option value="crop">Crop Type</option>
          <option value="variety">Variety</option>
        </select>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showLegend}
            onChange={() => setShowLegend(!showLegend)}
          />
          Show Legend
        </label>

        <button
          onClick={handleGeneratePdf}
          className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700"
        >
          🖨️ Print PDF
        </button>
      </div>

      <div ref={mapRef} className="h-[80vh] border rounded overflow-hidden">
        <MapContainer
          center={[35.4912, -90.9718]} // Fisher, Arkansas
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <LayersControl position="topright">
            <BaseLayer checked name="Satellite">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" />
            </BaseLayer>
            <BaseLayer name="Streets">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
            </BaseLayer>
            <BaseLayer name="Blank">
              <TileLayer url="" attribution="" />
            </BaseLayer>
          </LayersControl>

          {fields.map(field => field.boundary?.geojson?.coordinates && (
            <Polygon
              key={field.id}
              positions={field.boundary.geojson.coordinates[0].map(([lng, lat]) => [lat, lng])}
              pathOptions={{ color: getColor(field), fillOpacity: 0.6 }}
            />
          ))}
        </MapContainer>

        {showLegend && (
          <div className="absolute bottom-4 left-4 bg-white p-2 border rounded shadow">
            {Object.entries(cropColors).map(([crop, color]) => (
              <div key={crop} className="flex items-center gap-2">
                <span style={{ backgroundColor: color }} className="w-4 h-4 inline-block" />
                <span>{crop}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}