import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Polygon, LayersControl } from 'react-leaflet';
import { collection, getDocs } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase';
import { CropYearContext } from '../context/CropYearContext';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import * as htmlToImage from 'html-to-image';
import download from 'downloadjs';
import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import { Tooltip, useMap } from 'react-leaflet';
import { centroid } from '@turf/turf';
import { useMapEvents } from 'react-leaflet';

function ZoomDebugger() {
  useMapEvents({
    zoomend: (e) => {
      console.log('Zoom level:', e.target.getZoom());
    },
  });
  return null;
}

const { BaseLayer } = LayersControl;

const cropColors = {
  'Rice - Long Grain': '#facc15',
  'Rice - Medium Grain': '#fb923c',
  Soybeans: '#22c55e',
  Fallow: '#9ca3af',
  'Prevented Planting': '#ef4444',
  Idle: '#6b7280',
  default: '#a3a3a3',
};
function FieldLabel({ acres, operator, center, fontSize, colorMode, varietyInfo }) {
  let line1 = `${acres?.toFixed(1)} ac`;
  let line2 = operator || '—';
  let line3 = null;

  if (colorMode === 'variety' && varietyInfo?.variety) {
    line1 = varietyInfo.variety;
    line2 = varietyInfo.rate && varietyInfo.unit
      ? `${varietyInfo.rate} ${varietyInfo.unit}`
      : '';
    line3 = varietyInfo.vendor || null;
  }

  return (
    <Tooltip
      direction="center"
      permanent
      position={center}
      className="!bg-transparent !border-none !shadow-none p-0"
    >
      <div
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.1' }}
        className="text-center font-semibold text-black"
      >
        <div>{line1}</div>
        {line2 && <div className="text-black">{line2}</div>}
        {line3 && <div className="text-black">{line3}</div>}
      </div>
    </Tooltip>
  );
}





export default function MapViewer() {
 const [varietyMap, setVarietyMap] = useState({});
  const [fields, setFields] = useState([]);
  const [farms, setFarms] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('All');
  const [selectedOperator, setSelectedOperator] = useState('All');
  const [colorMode, setColorMode] = useState('crop');
  const [mapTitle, setMapTitle] = useState('');
  const [scale, setScale] = useState(1);
  const [acreMode, setAcreMode] = useState('gps');
  const [labelFontSize, setLabelFontSize] = useState(12); // default size
  const [showLabels, setShowLabels] = useState(true);     // toggle
  const { cropYear } = useContext(CropYearContext);

  useEffect(() => {
    const fetchFields = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setFields(data.filter(f => f.boundary?.geojson));

      const validOperators = data
        .map(f => f.operator)
        .filter(name => typeof name === 'string' && name.trim().length > 0);

      setOperators(['All', ...new Set(validOperators)]);

      const validFarms = data
        .map(f => f.farmName)
        .filter(name => typeof name === 'string' && name.trim().length > 0);

      setFarms(['All', ...new Set(validFarms)]);
    };

    fetchFields();
  }, []);

  useEffect(() => {
  const fetchSeedingJobs = async () => {
    console.log('🧪 Running fetchSeedingJobs from jobsByField');

    const snapshot = await getDocs(collection(db, 'jobsByField'));
    console.log('📦 Total jobsByField loaded:', snapshot.docs.length);

    const allJobs = snapshot.docs.map(doc => doc.data());
    console.log('📝 All jobsByField:', allJobs);

    const seedingJobs = allJobs.filter(job => {
      const isSeeding =
        job.jobType === 'Seeding' || job.parentJobType === 'Seeding';
      const hasCropYear = job.cropYear === cropYear;
      const hasFieldId = !!job.fieldId;
      const hasProducts = Array.isArray(job.products);

      console.log(
        '🔎 Job Check →',
        job.jobType,
        '| cropYear match:', hasCropYear,
        '| hasFieldId:', hasFieldId,
        '| hasProducts:', hasProducts
      );

      return isSeeding && hasCropYear && hasFieldId && hasProducts;
    });

    console.log('🌱 Filtered seedingJobs:', seedingJobs.length);

    const varietyMap = {};
    seedingJobs.forEach(job => {
      const product = job.products?.[0];
      if (product?.productName) {
        console.log('✅ Found variety for field:', job.fieldId, product.productName);
        varietyMap[job.fieldId] = {
          variety: product.productName,
          rate: product.rate || null,
          unit: product.unit || null,
          vendor: job.vendor || null,
        };
      }
    });

    console.log('🗺️ Variety map:', varietyMap);
    setVarietyMap(varietyMap);
  };

  fetchSeedingJobs();
}, [cropYear]);


  useEffect(() => {
    const updateScale = () => {
      const screenHeight = window.innerHeight;
      const a4Height = 1123;
      const padding = 100;
      const newScale = Math.min(1, (screenHeight - padding) / a4Height);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  if (!cropYear) return <div className="text-red-600 p-4">Loading crop year...</div>;

  const filteredFields = fields.filter(f => {
    const matchesFarm = selectedFarm === 'All' || f.farmName === selectedFarm;
    const matchesOperator = selectedOperator === 'All' || f.operator === selectedOperator;
    return matchesFarm && matchesOperator;
  });

  const getColor = (field) => {
  if (colorMode === 'variety') {
    const v = varietyMap[field.id];
    if (!v?.variety) return '#d4d4d4'; // light gray fallback
    // Simple hash to generate consistent color for each variety
    const hash = [...v.variety].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 65%)`;
  }

  const cropData = field.crops?.[cropYear];
  if (!cropData) return cropColors.default;
  if (cropData.crop === 'Rice') {
    return cropColors[cropData.riceType] || cropColors.default;
  }
  return cropColors[cropData.crop] || cropColors.default;
};


  const getCropAcres = (cropName) => {
    return filteredFields.reduce((sum, field) => {
      const cropData = field.crops?.[cropYear];
      const matches =
        cropData?.crop === cropName ||
        (cropData?.crop === 'Rice' && cropData?.riceType === cropName);
      const acres = acreMode === 'gps' ? field.gpsAcres : field.fsaAcres;
      return matches ? sum + (acres || 0) : sum;
    }, 0);
  };

  const exportPNG = () => {
    const node = document.getElementById('map-export-area');
    if (!node) return;
    htmlToImage.toPng(node, { pixelRatio: 2 })
      .then(dataUrl => download(dataUrl, 'map-export.png'))
      .catch(err => console.error('PNG export failed', err));
  };

 const exportPDF = async () => {
  const node = document.getElementById('map-export-area');
  if (!node) return;

  try {
    const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 2 });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = 595.28; // A4 width in pt
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('map-export.pdf');
  } catch (err) {
    console.error('PDF export failed', err);
  }
};


  return (
    <div className="flex flex-col items-center bg-gray-200 p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-[794px] text-sm items-end">
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 mb-1">Farm</label>
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="border border-gray-300 rounded-md bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {farms.map(farm => <option key={farm} value={farm}>{farm}</option>)}
          </select>
        </div>
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 mb-1">Operator</label>
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="border px-2 py-1 rounded text-sm"
          >
            {operators.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 mb-1">Color By</label>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            className="border px-2 py-1 rounded text-sm"
          >
            <option value="none">None</option>
            <option value="crop">Crop Type</option>
            <option value="variety">Variety</option>
          </select>
        </div>
        <div className="flex flex-col text-sm">
          <label className="text-gray-600 mb-1">Acres</label>
          <select
            value={acreMode}
            onChange={(e) => setAcreMode(e.target.value)}
            className="border px-2 py-1 rounded text-sm"
          >
            <option value="gps">GPS Acres</option>
            <option value="fsa">FSA Acres</option>
          </select>
        </div>
      </div>

      <div className="w-[794px] flex justify-end mt-2">
        <button
          onClick={exportPNG}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
        >
          📸 Export PNG
        </button>
        <button
          onClick={exportPDF}
          className="ml-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
        >
          🧾 Export PDF
        </button>
      </div>

     <div className="flex justify-center">
<div className="mb-2">
  <div className="flex items-center space-x-4 text-sm">
    {/* Toggle */}
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={showLabels}
        onChange={(e) => setShowLabels(e.target.checked)}
        id="label-toggle"
      />
      <label htmlFor="label-toggle" className="text-gray-700">Show Field Labels</label>
    </div>

    {/* Font Size Control */}
    <div className="flex items-center space-x-2">
      <label htmlFor="label-size" className="text-gray-700">Label Size</label>
      <input
        id="label-size"
        type="number"
        min="6"
        max="30"
        value={labelFontSize}
        onChange={(e) => setLabelFontSize(Number(e.target.value))}
        className="w-16 border border-gray-300 rounded px-1 py-0.5"
      />
      <span className="text-gray-500">px</span>
    </div>
  </div>
</div>

  <div className="origin-top shadow-xl" style={{ transform: `scale(${scale})` }}>
    <div
      id="map-export-area"
      className="relative bg-white border border-black"
      style={{ width: '794px', height: '1123px', paddingTop: '100px' }}
    >

       <MapContainer
  center={[35.5, -91]}
  zoom={12}
  zoomControl={false}
  wheelPxPerZoomLevel={30} // ✅ More responsive zooming
  zoomSnap={0.1}            // ✅ Allows fractional zoom
  zoomDelta={0.1}           // ✅ Smaller step sizes
  style={{ width: '94%', height: '80%', margin: '3% auto' }}

>


              <ZoomDebugger />
              <LayersControl position="topright">
                <BaseLayer checked name="Street View">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </BaseLayer>
                <BaseLayer name="Satellite">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </BaseLayer>
                <BaseLayer name="Blank Background">
                  <TileLayer url="" />
                </BaseLayer>
              </LayersControl>
              {filteredFields.map(field => {
                let geo = field.boundary?.geojson;
if (typeof geo === 'string') {
  try {
    const parsed = JSON.parse(geo);
    if (!parsed || typeof parsed !== 'object' || !parsed.type || !parsed.coordinates) {
      throw new Error('Invalid geojson structure');
    }
    geo = parsed;
  } catch {
    console.warn(`⚠️ Skipping bad geojson in field ${field.id}`);
    return null;
  }
}

                const coords = geo?.coordinates?.[0];
                if (!coords || coords.length === 0) return null;
                const latlngs = coords.map(([lng, lat]) => [lat, lng]);
                const turfCenter = centroid(geo);
const centerCoords = turfCenter?.geometry?.coordinates;
const center = [centerCoords[1], centerCoords[0]]; // [lat, lng]


return (
  <Polygon
  key={field.id}
  positions={latlngs}
  pathOptions={{ fillColor: getColor(field), color: '#555', weight: 1, fillOpacity: 1 }}
>
  {showLabels && (
   <FieldLabel
  fieldId={field.id}
  acres={acreMode === 'gps' ? field.gpsAcres : field.fsaAcres}
  operator={field.operator}
  center={center}
  fontSize={labelFontSize}
  colorMode={colorMode}
  varietyInfo={varietyMap[field.id]}
/>

  )}
</Polygon>

);

              })}
            </MapContainer>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[500px] text-center">
 <textarea
  value={mapTitle}
  onChange={(e) => setMapTitle(e.target.value)}
  placeholder="Map Title"
className="w-full text-[20pt] font-semibold text-center bg-white bg-opacity-90 rounded px-2 py-2 resize-none focus:outline-none focus:ring-0"
  style={{ height: '90px' }}
/>


</div>


        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white bg-opacity-95 shadow border border-gray-300 rounded-md px-4 py-3 w-[500px] max-h-[180px] overflow-y-auto text-sm">
  <div className="grid grid-cols-2 gap-y-1">

    {colorMode === 'variety'
  ? Object.entries(varietyMap).map(([fieldId, v]) => {
      const matchingField = filteredFields.find(f => f.id === fieldId);
      if (!matchingField) return null;

      const acres = acreMode === 'gps' ? matchingField.gpsAcres : matchingField.fsaAcres;
      const hash = [...v.variety].reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = hash % 360;
      const color = `hsl(${hue}, 70%, 65%)`;

      return (
        <div key={v.variety} className="flex items-center space-x-2 whitespace-nowrap overflow-hidden text-ellipsis">
          <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: color }}></div>
          <span className="truncate">{v.variety} – {acres?.toFixed(1)} ac</span>
        </div>
      );
    })
  : Object.entries(cropColors)
      .filter(([crop]) =>
        filteredFields.some(f => {
          const cropData = f.crops?.[cropYear];
          return cropData?.crop === crop || cropData?.riceType === crop;
        })
      )
      .map(([crop, color]) => (
        <div key={crop} className="flex items-center space-x-2 whitespace-nowrap overflow-hidden text-ellipsis">
          <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: color }}></div>
          <span className="truncate">{crop} – {getCropAcres(crop).toFixed(1)} ac</span>
        </div>
      ))}

  </div>

  {/* Summary row */}
  <div className="pt-2 mt-2 border-t text-xs text-gray-600 flex justify-center">
    {filteredFields.length} fields •{" "}
    {filteredFields.reduce((sum, f) => {
      const crop = f.crops?.[cropYear];
      const hasCrop = crop?.crop || crop?.riceType;
      const acres = acreMode === 'gps' ? f.gpsAcres : f.fsaAcres;
      return hasCrop ? sum + (acres || 0) : sum;
    }, 0).toFixed(1)} crop ac •{" "}
    {filteredFields.reduce((sum, f) => {
      const acres = acreMode === 'gps' ? f.gpsAcres : f.fsaAcres;
      return sum + (acres || 0);
    }, 0).toFixed(1)} total ac
  </div>
</div>



          </div>
        </div>
      </div>
    </div>
  );
}
