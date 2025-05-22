import React, { useEffect, useState, useRef, useContext } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, LayersControl } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { getAuth } from 'firebase/auth';
import { centroid } from '@turf/turf';
import L from 'leaflet';
import Draggable from 'react-draggable';
import { CropYearContext } from '../context/CropYearContext';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import download from 'downloadjs';
import { useMap } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import clsx from 'clsx';

function GeomanControls({ enabled }) {
  const map = useMap();
  const { cropYear } = useContext(CropYearContext); // use this if not already inside

  useEffect(() => {
    if (!map) return;

    if (enabled) {
      map.pm.addControls({
        position: 'topleft',
        drawCircle: false,
        drawMarker: false,
        drawPolyline: false,
        drawCircleMarker: false,
      });

     map.on('pm:create', async (e) => {
  const layer = e.layer;
  const geo = layer.toGeoJSON();

  const techLabel = prompt('Enter technology (Enlist, Xtend, etc):');
  const cropLabel = prompt('Enter crop (Soybeans, Rice - Long Grain, etc):');

  if (!techLabel && !cropLabel) {
    alert('❌ Must enter at least a crop or tech.');
    return;
  }

  try {
    const cleanedGeometry = {
      type: geo.geometry.type,
      coordinates: geo.geometry.coordinates.map(ring =>
        ring.map(coord => [...coord])
      ),
    };

    await addDoc(collection(db, 'neighborPolygons'), {
      geometry: JSON.stringify(cleanedGeometry),

      labelsByYear: {
        [cropYear]: {
          tech: techLabel || null,
          crop: cropLabel || null,
        },
      },
      createdAt: serverTimestamp()
    });
// 🧠 Determine which label to use
const labelValue =
  colorMode === 'tech'
    ? (cropLabel === 'Soybeans' ? 'SB' :
       cropLabel === 'Rice - Long Grain' ? 'RLG' :
       cropLabel === 'Rice - Medium Grain' ? 'RMG' :
       cropLabel === 'Corn' ? 'CRN' :
       cropLabel === 'Wheat' ? 'WHT' :
       '')
    : (techLabel === 'Roundup Ready' ? 'RR' :
       techLabel === 'Enlist' ? 'E' :
       techLabel === 'Xtend' ? 'X' :
       techLabel === 'Conventional' ? 'C' :
       techLabel === 'Clearfield/Fullpage' ? 'CF' :
       techLabel === 'Provisia/MaxAce' ? 'PV' :
       '');

// 🧭 Find centroid
const center = turf.centroid(geo).geometry.coordinates;
const [lng, lat] = center;

// const [lng, lat] = center;
// L.marker([lat, lng], {
//   icon: L.divIcon({
//     className: 'polygon-label',
//     html: `<div style="font-size:18px;font-weight:bold;color:black;text-shadow:1px 1px white">${labelValue}</div>`,
//     iconSize: [50, 20],
//     iconAnchor: [25, 10],
//   })
// }).addTo(map);


    alert('✅ Polygon saved successfully');
  } catch (err) {
    console.error('🧨 Error saving polygon:', err.message, err.stack);
    alert(`❌ Failed to save polygon: ${err.message}`);
  }
});


    } else {
      map.pm.removeControls();
    }
  }, [enabled, map]);

  return null;
}


const cropColors = {
  'Rice - Long Grain': '#facc15',
  'Rice - Medium Grain': '#fb923c',
  Soybeans: '#22c55e',
  Fallow: '#9ca3af',
  'Prevented Planting': '#ef4444',
  Idle: '#6b7280',
  default: '#a3a3a3'
};
const techColors = {
  "Roundup Ready": "#ffffff",         // White
  "Enlist": "#14b8a6",                // Teal
  "Xtend": "#111111",                 // Charcoal
  "Clearfield/Fullpage": "#facc15",   // Yellow
  "Provisia/MaxAce": "#a855f7",       // Purple

  "Conventional": "#ef4444",          // 🔴 Red for rice
  "Conventional (Soybeans)": "#ec4899", // 🌸 Pink for beans

  default: "#a3a3a3"                  // Gray fallback
};

export default function MapLabelTester() {
  const mapRef = useRef();
  const [fields, setFields] = useState([]);
  const [varietyMap, setVarietyMap] = useState({});
  const [productMap, setProductMap] = useState({});
  const [showDrawingTools, setShowDrawingTools] = useState(false);

  const [mapReady, setMapReady] = useState(false);
  const [labelFontSize, setLabelFontSize] = useState(12);
  const [labelFields, setLabelFields] = useState(['fieldName', 'gpsAcres']);
  const [labelOffsets, setLabelOffsets] = useState({});
  const [colorMode, setColorMode] = useState('crop');
  const [farmFilter, setFarmFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
const [dragLabelsMode, setDragLabelsMode] = useState(false);
  const [mapTitle, setMapTitle] = useState('Map Title');
const [mapRenderTick, setMapRenderTick] = useState(0);
const [neighborPolygons, setNeighborPolygons] = useState([]);
const [showNeighborZones, setShowNeighborZones] = useState(false);
const [colorBy, setColorBy] = useState('tech'); // or 'crop'
const [isExportMode, setIsExportMode] = useState(false);
const [exportLayout, setExportLayout] = useState('portrait'); // or 'landscape'

  const { cropYear } = useContext(CropYearContext);

  const availableFields = [
    { key: 'fieldName', label: 'Field Name' },
    { key: 'gpsAcres', label: 'GPS Acres' },
    { key: 'fsaAcres', label: 'FSA Acres' },
    { key: 'variety', label: 'Variety' },
    { key: 'rate', label: 'Rate' },
    { key: 'vendor', label: 'Vendor' },
  ];

  const getCropColor = (crop) => cropColors[crop] || cropColors.default;
  const getVarietyColor = (variety) => {
    const hash = [...variety].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 70%)`;
  };
const getTechColor = (tech) => techColors[tech] || techColors.default;

function MapReadySetter({ setMapReady, mapRef }) {
    const map = useMap();

    useEffect(() => {
      if (!map) return;
      console.log("🗺️ Map initialized via useMap()");
      mapRef.current = map;
      setMapReady(true);
    }, [map]);

    return null;
  }

 useEffect(() => {
  const loadPolygons = async () => {
    const snap = await getDocs(collection(db, 'neighborPolygons'));
    const data = snap.docs.map(doc => {
      const raw = doc.data();
      return {
        id: doc.id,
        geometry: JSON.parse(raw.geometry),
        labelsByYear: raw.labelsByYear || {},
      };
    });
    setNeighborPolygons(data);
  };

  loadPolygons();
}, []);
useEffect(() => {
  if (!showNeighborZones || !mapRef.current) return;

  neighborPolygons.forEach(polygon => {
    const labelData = polygon.labelsByYear?.[cropYear] || {};
    const tech = labelData.tech;
    const crop = labelData.crop;

    const label =
      colorMode === 'tech'
        ? (crop === 'Soybeans' ? 'SB' :
           crop === 'Rice - Long Grain' ? 'RLG' :
           crop === 'Rice - Medium Grain' ? 'RMG' :
           crop === 'Corn' ? 'CRN' :
           crop === 'Wheat' ? 'WHT' :
           '')
        : (tech === 'Roundup Ready' ? 'RR' :
           tech === 'Enlist' ? 'E' :
           tech === 'Xtend' ? 'X' :
           tech === 'Conventional' ? 'C' :
           tech === 'Clearfield/Fullpage' ? 'CF' :
           tech === 'Provisia/MaxAce' ? 'PV' :
           '');

    if (!label) return;

    const center = turf.centroid(polygon.geometry).geometry.coordinates;
    const [lng, lat] = center;

  // L.marker([lat, lng], {
//   icon: L.divIcon({
//     className: 'polygon-label',
//     html: `<div style="font-size:18px;font-weight:bold;color:black;text-shadow:1px 1px white">${label}</div>`,
//     iconSize: [50, 20],
//     iconAnchor: [25, 10],
//   })
// }).addTo(mapRef.current);

  });
}, [neighborPolygons, showNeighborZones, cropYear, colorMode]);


useEffect(() => {
  const fetchFields = async () => {
    const snapshot = await getDocs(collection(db, 'fields'));
    const data = snapshot.docs.map(doc => {
      const raw = doc.data();
      return {
        id: doc.id,
        ...raw,
        labelOffset: raw.labelOffset || { x: 0, y: 0 }
      };
    });
    setFields(data);

    // Initialize labelOffsets state
    const offsets = {};
    data.forEach(field => {
      offsets[field.id] = field.labelOffset;
    });
    setLabelOffsets(offsets);
  };

  fetchFields();
}, []);


  

  useEffect(() => {
    const fetchVarietyInfo = async () => {
      const snapshot = await getDocs(collection(db, 'jobsByField'));
      const allJobs = snapshot.docs.map(doc => doc.data());
  const seedingJobs = allJobs.filter(job =>
  job.jobType?.parentName === 'Seeding' &&
  job.cropYear === cropYear &&
  job.fieldId &&
  Array.isArray(job.products)
);

      const newMap = {};
      seedingJobs.forEach(job => {
        const product = job.products?.[0];
        if (product?.productName) {
          newMap[job.fieldId] = {
            variety: product.productName,
            rate: product.rate || null,
            unit: product.unit || null,
            vendor: job.vendor || null,
          };
        }
      });

      setVarietyMap(newMap);
    };
    fetchVarietyInfo();
  }, [cropYear]);
useEffect(() => {
  const fetchProducts = async () => {
    const snapshot = await getDocs(collection(db, 'products'));
    const map = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.name) {
        map[data.name] = data;
      }
    });
    setProductMap(map);
  };
  fetchProducts();
}, []);
useEffect(() => {
  if (isExportMode && mapRef.current?.invalidateSize) {
    setTimeout(() => {
      mapRef.current.invalidateSize();
    }, 300); // give the DOM time to fully expand
  }
}, [isExportMode]);

useEffect(() => {
  const map = mapRef.current;
  if (map && isExportMode) {
    setTimeout(() => {
      map.invalidateSize();
    }, 300); // allow DOM to stretch
  }
}, [isExportMode]);

  useEffect(() => {
    const waitForMap = () => {
      if (!mapRef.current || !mapRef.current.getSize) return;
      const size = mapRef.current.getSize();
      if (size.x === 0 || size.y === 0) {
        setTimeout(waitForMap, 200);
      } else {
        mapRef.current.invalidateSize();
        setTimeout(() => setMapReady(true), 100);
      }
    };
    waitForMap();
  }, []);

  const placedLabels = [];
const filteredFields = fields.filter(field => {
const matchesFarm = !farmFilter || field.farmName === farmFilter;
  const matchesOperator = !operatorFilter || field.operator === operatorFilter;
  return matchesFarm && matchesOperator;
});

  const getCropAcres = (crop) => {
    return fields.reduce((sum, f) => {
      const c = f.crops?.[cropYear]?.crop;
      if (c === crop) {
        return sum + (f.gpsAcres || 0);
      }
      return sum;
    }, 0);
  };

    const uniqueFarms = Array.from(new Set(fields.map(f => f.farmName).filter(Boolean))).sort();


    const uniqueOperators = Array.from(new Set(fields.map(f => f.operator).filter(Boolean))).sort();
const exportPNG = () => {
  const node = document.getElementById('map-export-area');
  if (!node) return;
  htmlToImage.toPng(node, { pixelRatio: 2 })
    .then(dataUrl => download(dataUrl, 'map-export.png'))
    .catch(err => console.error('PNG export failed', err));
};

const exportPDF = async () => {
 setIsExportMode(true);
 await new Promise((res) => setTimeout(res, 250));

 // ⬇️ Force Leaflet to resize the map
 if (mapRef.current && mapRef.current.invalidateSize) {
   mapRef.current.invalidateSize();
 }

 await new Promise((res) => setTimeout(res, 250));


  const node = document.getElementById('map-export-area');
  if (!node) {
    setIsExportMode(false);
    return;
  }

  try {
    const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 3 });

   const pdf = new jsPDF({
  orientation: exportLayout,
  unit: 'pt',
  format: [612, 792], // doesn't matter: jsPDF flips these based on orientation
});


    const imgProps = pdf.getImageProperties(dataUrl);
    const pageWidth = 612;
    const pageHeight = 792;

    const ratio = Math.min(
      pageWidth / imgProps.width,
      pageHeight / imgProps.height
    );

    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;

    const x = (pageWidth - imgWidth) / 2;
    const y = 0;

    pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save('map-export.pdf');
  } catch (err) {
    console.error('PDF export failed', err);
  }

  setIsExportMode(false); // 🔁 revert layout
};

const saveSnapshotToFirebase = async () => {
  const node = document.getElementById('map-export-area');
  
console.log('🔥 Current Firebase user:', getAuth().currentUser);

const user = getAuth().currentUser;
if (!user) {
  alert('You must be logged in to save a snapshot.');
  return;
}

  if (!node) return;

  try {
    const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 2 });

    // Convert base64 to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Upload to Firebase Storage (modern way)
const fileName = `mapSnapshots/${cropYear}/${Date.now()}.png`;
const user = getAuth().currentUser;
const token = await user.getIdToken();

const storageRef = ref(storage, fileName);
console.log('📦 Uploading to:', storageRef.fullPath, storageRef.bucket);

// Upload blob using Firebase SDK
await uploadBytes(storageRef, blob);

// Get the download URL
const downloadUrl = await getDownloadURL(storageRef);



    // Save Firestore record
    await addDoc(collection(db, 'maps'), {

      cropYear,
      title: mapTitle,
      imageUrl: downloadUrl,
      createdAt: new Date()
    });

    alert('✅ Snapshot saved to Firebase!');
  } catch (err) {
console.error('❌ Snapshot save failed:', err.message, err.stack);
    alert('Snapshot failed to save.');
  }
};


useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  if (dragLabelsMode) {
    map.dragging.disable();
  } else {
    map.dragging.enable();
  }
}, [dragLabelsMode, mapRef]);

useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  const handleMove = () => {
    setMapRenderTick(tick => tick + 1); // force rerender
  };

  map.on('move', handleMove);
  map.on('zoom', handleMove);

  return () => {
    map.off('move', handleMove);
    map.off('zoom', handleMove);
  };
}, []);


  return (
    <div className="relative flex flex-col items-center bg-gray-100 min-h-screen">
      {!isExportMode && (
        <div className="relative flex justify-center px-2 mt-4 z-10">
          <div className="bg-white shadow-lg border border-gray-300 rounded-md w-full max-w-[774px] px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex overflow-x-auto gap-2 mb-2 whitespace-nowrap max-h-[34px]">
              {labelFields.map((fieldKey) => (
                <span
                  key={fieldKey}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-sm flex items-center"
                >
                  {availableFields.find((f) => f.key === fieldKey)?.label}
                  <button
                    className="ml-2 text-white"
                    onClick={() =>
                      setLabelFields(labelFields.filter((f) => f !== fieldKey))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <select
              className="text-sm p-2 border rounded w-full mb-2"
              onChange={(e) => {
                const val = e.target.value;
                if (val && !labelFields.includes(val)) {
                  setLabelFields([...labelFields, val]);
                }
              }}
            >
              <option value="">+ Add Field</option>
              {availableFields
                .filter((f) => !labelFields.includes(f.key))
                .map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
            </select>

            <div className="mt-2 flex flex-wrap items-center gap-4 w-full justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Color by:</label>
                  <select
                    className="text-sm p-1 border rounded"
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value)}
                  >
                    <option value="crop">Crop</option>
                    <option value="variety">Variety</option>
                    <option value="tech">Technology</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Font size:</label>
                  <input
                    type="number"
                    min={8}
                    max={40}
                    step={1}
                    value={labelFontSize}
                    onChange={(e) => setLabelFontSize(Number(e.target.value))}
                    className="w-[60px] text-sm border rounded px-1 py-0.5"
                  />
                </div>

                <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Farm:</label>
                  <select
                    className="text-sm p-1 border rounded"
                    value={farmFilter}
                    onChange={(e) => setFarmFilter(e.target.value)}
                  >
                    <option value="">All Farms</option>
                    {uniqueFarms.map((farm) => (
                      <option key={farm} value={farm}>
                        {farm}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="text-sm font-medium mr-2">Operator:</label>
                  <select
                    className="text-sm p-1 border rounded"
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                  >
                    <option value="">All Operators</option>
                    {uniqueOperators.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="dragLabelsMode"
                  checked={dragLabelsMode}
                  onChange={(e) => setDragLabelsMode(e.target.checked)}
                  className="mr-1"
                />
                <label htmlFor="dragLabelsMode" className="text-sm font-medium">
                  ✏️ Drag Labels
                </label>
              </div>

              <div className="flex items-center gap-2">
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
                <button
                  onClick={saveSnapshotToFirebase}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
                >
                  <div className="flex items-center text-sm">
                    <label className="mr-2 font-medium">Layout:</label>
                    <select
                      className="border rounded p-1 text-sm"
                      value={exportLayout}
                      onChange={(e) => setExportLayout(e.target.value)}
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  💾 Save Snapshot
                </button>

                <div className="mb-4">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={showDrawingTools}
                      onChange={(e) => setShowDrawingTools(e.target.checked)}
                    />
                    Show Drawing Tools
                  </label>
                </div>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 mb-4 mr-6">
                  <input
                    type="checkbox"
                    checked={showNeighborZones}
                    onChange={(e) => setShowNeighborZones(e.target.checked)}
                  />
                  Show Neighbor Zones
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        id="map-export-area"
        className={clsx("shadow-xl bg-white mx-auto mt-6", {
          "w-[774px] h-[1123px]": isExportMode && exportLayout === "portrait",
          "w-[1123px] h-[774px]": isExportMode && exportLayout === "landscape",
          "w-full": !isExportMode,
        })}
      >

        <div className={clsx({
  "w-full h-[880px]": isExportMode,
  "w-full h-[500px]": !isExportMode,
})}></div>
        <MapContainer
          center={[35.5, -91]}
          zoom={12}
          zoomControl={false}
          zoomSnap={0.1}
          zoomDelta={0.1}
          wheelPxPerZoomLevel={500}
          style={{
            width: "100%",
            height: isExportMode ? "880px" : "500px",
            minHeight: "300px",
            margin: "0 auto",
          }}
        >
          <MapReadySetter setMapReady={setMapReady} mapRef={mapRef} />

          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Google Satellite (unofficial)">
              <TileLayer
                url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                subdomains={["mt0", "mt1", "mt2", "mt3"]}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Esri Satellite (fallback)">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Blank">
              <TileLayer url="" />
            </LayersControl.BaseLayer>
          </LayersControl>
          <GeomanControls enabled={showDrawingTools} />

          {showNeighborZones &&
            neighborPolygons.map((polygon) => {
              const label = polygon.labelsByYear?.[cropYear] || {};
              const tech = label.tech;
              const crop = label.crop;

              const fillColor =
                colorMode === "crop"
                  ? getCropColor(crop)
                  : colorMode === "tech"
                  ? getTechColor(tech)
                  : "#cccccc";

              const positions = polygon.geometry.coordinates[0].map(
                ([lng, lat]) => [lat, lng]
              );

              return (
                <Polygon
                  key={`${polygon.id}-${colorMode}`}
                  positions={positions}
                  pathOptions={{
                    fillColor,
                    color: "#374151",
                    fillOpacity: 0.5,
                    weight: 1.5,
                  }}
                />
              );
            })}

          {fields
            .filter((field) => {
              const matchesFarm = !farmFilter || field.farmName === farmFilter;
              const matchesOperator =
                !operatorFilter || field.operator === operatorFilter;
              return matchesFarm && matchesOperator;
            })
            .map((field) => {
              const tick = mapRenderTick;

              let geo = field.boundary?.geojson;
              if (typeof geo === "string") {
                try {
                  geo = JSON.parse(geo);
                } catch {
                  return null;
                }
              }
              if (!geo?.coordinates) return null;

              let turfCenter;
              try {
                turfCenter = centroid(geo);
              } catch {
                return null;
              }

              const coords = turfCenter?.geometry?.coordinates;
              if (!coords) return null;

              let lat = coords[1];
              let lng = coords[0];
              let attempts = 0;
              while (
                placedLabels.some(
                  (pos) =>
                    Math.abs(pos.lat - lat) < 0.0003 &&
                    Math.abs(pos.lng - lng) < 0.0003
                ) &&
                attempts < 10
              ) {
                lat += 0.0002;
                attempts++;
              }
              placedLabels.push({ lat, lng });
              const coordsList = geo?.coordinates?.[0]?.map(([lng, lat]) => [
                lat,
                lng,
              ]);
              const crop = field.crops?.[cropYear]?.crop || "—";
              const info = varietyMap[field.id] || {};
              const variety = info.variety;
              const tech = productMap[variety]?.technology;

              const fillColor =
                colorMode === "crop"
                  ? getCropColor(crop)
                  : colorMode === "variety"
                  ? variety
                    ? getVarietyColor(variety)
                    : cropColors.default
                  : colorMode === "tech"
                  ? tech
                    ? getTechColor(tech)
                    : techColors.default
                  : "#cccccc";

              const labelHtmlLines = labelFields.map((key) => {
                if (key === "fieldName") return field.fieldName || "—";
                if (key === "gpsAcres")
                  return `${(field.gpsAcres || 0).toFixed(1)} ac`;
                if (key === "fsaAcres")
                  return `${(field.fsaAcres || 0).toFixed(1)} FSA ac`;
                if (key === "variety") return info.variety || "";
                if (key === "rate")
                  return info.rate ? `${info.rate} ${info.unit || ""}` : "";
                if (key === "vendor") return info.vendor || "";
                return "";
              });

              let labelNode = null;

              if (mapRef.current && mapReady) {
                const anchor = mapRef.current.latLngToContainerPoint([
                  lat,
                  lng,
                ]);
                const offset = labelOffsets[field.id] || { x: 0, y: 0 };
                const adjustedPoint = {
                  x: Math.round(anchor.x + offset.x),
                  y: Math.round(anchor.y + offset.y),
                };

                const adjustedLatLng =
                  mapRef.current.containerPointToLatLng(adjustedPoint);

                const label = (
                  <div
                    className="text-black font-bold text-center whitespace-nowrap"
                    style={{ fontSize: labelFontSize }}
                  >
                    {labelHtmlLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                );

                const staticLabel = L.divIcon({
                  className: "custom-label",
                  html: `
          <div style="font-size: ${labelFontSize}px; font-weight: bold; text-align: center; white-space: nowrap;">
            ${labelHtmlLines.join("<br />")}
          </div>`,
                });

                labelNode = dragLabelsMode ? (
                  <Draggable
                    position={{ x: adjustedPoint.x, y: adjustedPoint.y }}
                    onStop={(_, data) => {
                      const newOffset = {
                        x: data.x - anchor.x,
                        y: data.y - anchor.y,
                      };

                      setLabelOffsets((prev) => ({
                        ...prev,
                        [field.id]: newOffset,
                      }));

                      updateDoc(doc(db, "fields", field.id), {
                        labelOffset: newOffset,
                      })
                        .then(() => {
                          console.log(`💾 Saved offset for ${field.fieldName}`);
                        })
                        .catch((err) => {
                          console.error(
                            `❌ Failed to save offset for ${field.fieldName}`,
                            err
                          );
                        });
                    }}
                  >
                    <div
                      className="absolute"
                      style={{
                        transform: "translate(-50%, -50%)",
                        zIndex: 1000,
                      }}
                    >
                      {label}
                    </div>
                  </Draggable>
                ) : (
                  <div
                    className="absolute"
                    style={{
                      left: adjustedPoint.x,
                      top: adjustedPoint.y,
                      transform: "translate(-50%, -50%)",
                      zIndex: 1000,
                    }}
                  >
                    {label}
                  </div>
                );
              }

              return (
                <React.Fragment key={field.id}>
                  <Polygon
                    positions={coordsList}
                    pathOptions={{ fillColor, color: "#333", fillOpacity: 1 }}
                  />
                  {labelNode}
                </React.Fragment>
              );
            })}
        </MapContainer>

        {/* TITLE */}
        <div className="w-[300px] text-center mx-auto mt-2 mb-2">
          <textarea
            value={mapTitle}
            onChange={(e) => setMapTitle(e.target.value)}
            className="w-full text-[12pt] font-semibold text-center bg-white bg-opacity-90 rounded px-2 py-1 resize-none focus:outline-none focus:ring-0 leading-tight"
            style={{ height: "40px" }}
          />
        </div>

        {/* LEGEND */}
        {showNeighborZones ? (
          <div className="bg-white bg-opacity-95 shadow border border-gray-300 rounded-md px-4 py-3 w-[400px] text-sm mx-auto">
            <div className="font-semibold mb-2">
              {colorMode === "tech" ? "Technology Legend" : "Crop Legend"}
            </div>
            <div className="grid grid-cols-2 gap-y-1">
              {(colorMode === "tech"
                ? Object.entries(techColors)
                : Object.entries(cropColors)
              )
                .filter(([key]) => key !== "default")
                .map(([label, color]) => (
                  <div key={label} className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="truncate">{label}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div
            className="bg-white bg-opacity-95 shadow border border-gray-300 rounded-md px-4 py-3 w-[500px] text-sm mx-auto"
            style={{
              overflow: "visible",
              maxHeight: "none",
            }}
          >
            <div className="grid grid-cols-2 gap-y-1">
              {colorMode === "crop" &&
                Object.entries(cropColors)
                  .filter(([crop]) =>
                    filteredFields.some(
                      (f) => f.crops?.[cropYear]?.crop === crop
                    )
                  )
                  .map(([crop, color]) => (
                    <div key={crop} className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-sm shrink-0"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="truncate">
                        {crop} –{" "}
                        {filteredFields
                          .reduce((sum, f) => {
                            const c = f.crops?.[cropYear]?.crop;
                            return c === crop ? sum + (f.gpsAcres || 0) : sum;
                          }, 0)
                          .toFixed(1)}{" "}
                        ac
                      </span>
                    </div>
                  ))}

              {colorMode === "variety" &&
                Array.from(
                  new Set(
                    filteredFields
                      .map((f) => varietyMap[f.id]?.variety)
                      .filter(Boolean)
                  )
                ).map((variety) => {
                  const total = filteredFields.reduce((sum, f) => {
                    return varietyMap[f.id]?.variety === variety
                      ? sum + (f.gpsAcres || 0)
                      : sum;
                  }, 0);
                  return (
                    <div key={variety} className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-sm shrink-0"
                        style={{ backgroundColor: getVarietyColor(variety) }}
                      ></div>
                      <span className="truncate">
                        {variety} – {total.toFixed(1)} ac
                      </span>
                    </div>
                  );
                })}

              {colorMode === "tech" &&
                filteredFields
                  .map((f) => {
                    const variety = varietyMap[f.id]?.variety;
                    const tech = productMap[variety]?.technology;
                    return tech || null;
                  })
                  .filter((tech, i, arr) => tech && arr.indexOf(tech) === i)
                  .map((tech) => {
                    const total = filteredFields.reduce((sum, f) => {
                      const variety = varietyMap[f.id]?.variety;
                      const fieldTech = productMap[variety]?.technology;
                      return fieldTech === tech ? sum + (f.gpsAcres || 0) : sum;
                    }, 0);
                    return (
                      <div key={tech} className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-sm shrink-0"
                          style={{ backgroundColor: getTechColor(tech) }}
                        ></div>
                        <span className="truncate">
                          {tech} – {total.toFixed(1)} ac
                        </span>
                      </div>
                    );
                  })}
            </div>
            <div className="pt-2 mt-2 border-t text-xs text-gray-600 flex justify-center">
              <span>
                {filteredFields.length} fields •{" "}
                {filteredFields
                  .reduce((sum, f) => {
                    const crop = f.crops?.[cropYear];
                    const hasCrop = crop?.crop || crop?.riceType;
                    const acres = f.gpsAcres || 0;
                    return hasCrop ? sum + acres : sum;
                  }, 0)
                  .toFixed(1)}{" "}
                crop ac •{" "}
                {filteredFields
                  .reduce((sum, f) => sum + (f.gpsAcres || 0), 0)
                  .toFixed(1)}{" "}
                total ac
              </span>
            </div>
            <div style={{ height: "1px" }} />{" "}
            {/* Keeps PDF from slicing the bottom */}
          </div>
        )}
      </div>
    </div>
  );
}
