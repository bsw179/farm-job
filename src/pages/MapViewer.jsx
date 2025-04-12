import React, { useEffect, useState, useContext, useRef } from 'react';
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

function getFieldCenter(latlngs) {
  const flat = latlngs.flat();
  const lats = flat.map(p => p.lat);
  const lngs = flat.map(p => p.lng);
  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
  return { lat: avgLat, lng: avgLng };
}




export default function MapViewer() {
  const [mapReady, setMapReady] = useState(false);

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
  const [dragLabelsMode, setDragLabelsMode] = useState(false);
  const [labelOffsets, setLabelOffsets] = useState({});
  const { cropYear } = useContext(CropYearContext);
const mapRef = useRef(null);

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
  if (!mapReady || !mapRef.current) return;

  const map = mapRef.current;

  if (dragLabelsMode) {
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
  } else {
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
  }
}, [dragLabelsMode, mapReady]);

useEffect(() => {
  if (!mapRef.current) {
    console.log('🛑 mapRef not ready yet');
    return;
  }

  console.log(`🔁 dragLabelsMode is ${dragLabelsMode}`);

  if (dragLabelsMode) {
    mapRef.current.dragging.disable();
    mapRef.current.scrollWheelZoom.disable();
    console.log('🧊 Map drag & zoom disabled');
  } else {
    mapRef.current.dragging.enable();
    mapRef.current.scrollWheelZoom.enable();
    console.log('🟢 Map drag & zoom enabled');
  }
}, [dragLabelsMode]);


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
useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  // Fully disable interaction
  const disableMapDragging = () => {
    map.dragging.disable();
    map.touchZoom.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();

    // Emergency kill switch — literally stop the internal dragging handler
    if (map._handlers) {
      map._handlers.forEach(handler => {
        if (handler.enable && handler.disable) {
          handler.disable();
        }
      });
    }
  };

  // Re-enable interaction
  const enableMapDragging = () => {
    map.dragging.enable();
    map.touchZoom.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
  };

  if (dragLabelsMode) {
    disableMapDragging();
  } else {
    enableMapDragging();
  }
}, [dragLabelsMode]);




  return (
  <div className="flex flex-col items-center bg-gray-200 p-4 space-y-4">

    <div className="w-[794px] bg-white px-4 py-3 rounded shadow border border-gray-300 space-y-2 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-gray-600 mb-1">Farm</label>
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="border border-gray-300 rounded-md bg-white px-2 py-1"
          >
            {farms.map(farm => <option key={farm} value={farm}>{farm}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-gray-600 mb-1">Operator</label>
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="border border-gray-300 rounded-md bg-white px-2 py-1"
          >
            {operators.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-gray-600 mb-1">Color By</label>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            className="border border-gray-300 rounded-md bg-white px-2 py-1"
          >
            <option value="none">None</option>
            <option value="crop">Crop Type</option>
            <option value="variety">Variety</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-gray-600 mb-1">Acres</label>
          <select
            value={acreMode}
            onChange={(e) => setAcreMode(e.target.value)}
            className="border border-gray-300 rounded-md bg-white px-2 py-1"
          >
            <option value="gps">GPS Acres</option>
            <option value="fsa">FSA Acres</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              id="label-toggle"
            />
            <label htmlFor="label-toggle" className="text-gray-700">Show Labels</label>
          </div>

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

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={dragLabelsMode}
              onChange={(e) => setDragLabelsMode(e.target.checked)}
              id="drag-labels-toggle"
            />
            <label htmlFor="drag-labels-toggle" className="text-gray-700">Drag Labels</label>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={exportPNG}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
          >
            📸 Export PNG
          </button>
          <button
            onClick={exportPDF}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
          >
            🧾 Export PDF
          </button>
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
  whenCreated={(mapInstance) => {
    mapRef.current = mapInstance;
    setMapReady(true);
  }}

  wheelPxPerZoomLevel={30}
  zoomSnap={0.1}
  zoomDelta={0.1}
 style={{
    width: '94%',
    height: '80%',
    margin: '3% auto',
  }}
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
</Polygon>

);

              })}
            </MapContainer>
{showLabels && fields.map((field) => {
const center = field.center;
  if (!mapRef.current || !center) return null;

const point = mapRef.current.latLngToContainerPoint(L.latLng(center.lat, center.lng));
  const offset = labelOffsets[field.id] || { x: 0, y: 0 };
  const x = point.x + offset.x;
  const y = point.y + offset.y;

  return (
    <Draggable
      key={field.id}
      disabled={!dragLabelsMode}
      position={{ x, y }}
      onStop={(_, data) => {
        setLabelOffsets((prev) => ({
          ...prev,
          [field.id]: { x: data.x - point.x, y: data.y - point.y },
        }));
      }}
    >
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          transform: `translate(${x}px, ${y}px)`,
          cursor: dragLabelsMode ? 'move' : 'default',
        }}
      >
        <FieldLabel
          acres={acreMode === 'gps' ? field.gpsAcres : field.fsaAcres}
          operator={field.operator}
          center={center}
          fontSize={labelFontSize}
          colorMode={colorMode}
          varietyInfo={varietyMap[field.id]}
        />
      </div>
    </Draggable>
  );
})}

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
  ? Array.from(
      Object.entries(varietyMap)
        .filter(([fieldId]) => filteredFields.some(f => f.id === fieldId))
        .reduce((acc, [fieldId, v]) => {
          const field = filteredFields.find(f => f.id === fieldId);
          if (!field || !v.variety) return acc;

          const key = v.variety;
          const acres = acreMode === 'gps' ? field.gpsAcres : field.fsaAcres;
          const prev = acc.get(key) || { ...v, totalAcres: 0 };
          prev.totalAcres += acres || 0;
          acc.set(key, prev);
          return acc;
        }, new Map())
    ).map(([varietyName, info]) => {
      const hash = [...varietyName].reduce((a, c) => a + c.charCodeAt(0), 0);
      const hue = hash % 360;
      const color = `hsl(${hue}, 70%, 65%)`;

      return (
        <div key={varietyName} className="flex items-center space-x-2 whitespace-nowrap overflow-hidden text-ellipsis">
          <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: color }}></div>
          <span className="truncate">{varietyName} – {info.totalAcres.toFixed(1)} ac</span>
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
  );
}
