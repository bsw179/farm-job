import React, { useEffect, useState, useRef, useContext } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { centroid } from '@turf/turf';
import L from 'leaflet';
import Draggable from 'react-draggable';
import { CropYearContext } from '../context/CropYearContext';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import download from 'downloadjs';
import { useMap } from 'react-leaflet';
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
  "Conventional": "#ef4444",            // Red
  "Clearfield/Fullpage": "#facc15",     // Yellow
  "Provisa/MaxAce": "#a855f7",          // Purple
  "Roundup Ready": "#ffffff",           // White
  "Enlist": "#14b8a6",                  // Teal
  "Xtend": "#111111",                   // Charcoal
  default: "#a3a3a3"                    // Gray fallback
};

export default function MapLabelTester() {
  const mapRef = useRef();
  const [fields, setFields] = useState([]);
  const [varietyMap, setVarietyMap] = useState({});
  const [productMap, setProductMap] = useState({});

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
        (job.jobType === 'Seeding' || job.parentJobType === 'Seeding') &&
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
  const node = document.getElementById('map-export-area');
  if (!node) return;

  try {
    const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 3 });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [612, 792], // Letter size in points
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
    const y = 0; // Top aligned

    pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save('map-export.pdf');
  } catch (err) {
    console.error('PDF export failed', err);
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
      <div className="w-[500px] mt-6 z-[1000]">
        <div className="bg-white border border-gray-300 rounded shadow p-3">
          <div className="flex overflow-x-auto gap-2 mb-2 whitespace-nowrap max-h-[34px]">
            {labelFields.map((fieldKey) => (
              <span key={fieldKey} className="bg-blue-500 text-white px-2 py-1 rounded text-sm flex items-center">
                {availableFields.find(f => f.key === fieldKey)?.label}
                <button
                  className="ml-2 text-white"
                  onClick={() => setLabelFields(labelFields.filter(f => f !== fieldKey))}
                >×</button>
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
            {availableFields.filter(f => !labelFields.includes(f.key)).map(field => (
              <option key={field.key} value={field.key}>{field.label}</option>
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
        {uniqueFarms.map(farm => (
          <option key={farm} value={farm}>{farm}</option>
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
        {uniqueOperators.map(op => (
          <option key={op} value={op}>{op}</option>
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
  <label htmlFor="dragLabelsMode" className="text-sm font-medium">✏️ Drag Labels</label>
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
  </div>
</div>




        </div>
      </div>





<div
  id="map-export-area"
  className="bg-white shadow-xl"
  style={{
    width: '774px',                // 🔥 was 794px — shaved 20px
    height: '1123px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '10px',
    boxSizing: 'border-box',
    overflow: 'visible'
  }}
>






  <MapContainer
    center={[35.5, -91]}
    zoom={12}
    zoomControl={false}
    zoomSnap={0.1}
    zoomDelta={0.1}
    wheelPxPerZoomLevel={500}
    style={{
      width: '100%',
      height: '75%' // 💡 Enough room to breathe
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
      subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
    />
  </LayersControl.BaseLayer>

  <LayersControl.BaseLayer name="Esri Satellite (fallback)">
    <TileLayer
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      attribution='Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    />
  </LayersControl.BaseLayer>

  <LayersControl.BaseLayer name="Blank">
    <TileLayer url="" />
  </LayersControl.BaseLayer>
</LayersControl>


{fields
  .filter(field => {
    const matchesFarm = !farmFilter || field.farmName === farmFilter;
    const matchesOperator = !operatorFilter || field.operator === operatorFilter;
    return matchesFarm && matchesOperator;
  })
  .map((field) => {
    const tick = mapRenderTick;

    let geo = field.boundary?.geojson;
    if (typeof geo === 'string') {
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
      placedLabels.some(pos =>
        Math.abs(pos.lat - lat) < 0.0003 && Math.abs(pos.lng - lng) < 0.0003
      ) && attempts < 10
    ) {
      lat += 0.0002;
      attempts++;
    }
    placedLabels.push({ lat, lng });
    const coordsList = geo?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng]);
    const crop = field.crops?.[cropYear]?.crop || '—';
    const info = varietyMap[field.id] || {};
    const variety = info.variety;
    const tech = productMap[variety]?.technology;

    const fillColor =
      colorMode === 'crop'
        ? getCropColor(crop)
        : colorMode === 'variety'
          ? variety
            ? getVarietyColor(variety)
            : cropColors.default
          : colorMode === 'tech'
            ? tech
              ? getTechColor(tech)
              : techColors.default
            : '#cccccc';

    const labelHtmlLines = labelFields.map(key => {
      if (key === 'fieldName') return field.fieldName || '—';
      if (key === 'gpsAcres') return `${(field.gpsAcres || 0).toFixed(1)} ac`;
      if (key === 'fsaAcres') return `${(field.fsaAcres || 0).toFixed(1)} FSA ac`;
      if (key === 'variety') return info.variety || '';
      if (key === 'rate') return info.rate ? `${info.rate} ${info.unit || ''}` : '';
      if (key === 'vendor') return info.vendor || '';
      return '';
    });

    let labelNode = null;

    if (mapRef.current && mapReady) {
      const anchor = mapRef.current.latLngToContainerPoint([lat, lng]);
      const offset = labelOffsets[field.id] || { x: 0, y: 0 };
      const adjustedPoint = {
  x: Math.round(anchor.x + offset.x),
  y: Math.round(anchor.y + offset.y)
};

      const adjustedLatLng = mapRef.current.containerPointToLatLng(adjustedPoint);

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
        className: 'custom-label',
        html: `
          <div style="font-size: ${labelFontSize}px; font-weight: bold; text-align: center; white-space: nowrap;">
            ${labelHtmlLines.join('<br />')}
          </div>`
      });

      labelNode = (
  dragLabelsMode ? (
    <Draggable
      position={{ x: adjustedPoint.x, y: adjustedPoint.y }}
      onStop={(_, data) => {
        const newOffset = {
          x: data.x - anchor.x,
          y: data.y - anchor.y
        };

        setLabelOffsets(prev => ({
          ...prev,
          [field.id]: newOffset
        }));

        updateDoc(doc(db, 'fields', field.id), {
          labelOffset: newOffset
        }).then(() => {
          console.log(`💾 Saved offset for ${field.fieldName}`);
        }).catch((err) => {
          console.error(`❌ Failed to save offset for ${field.fieldName}`, err);
        });
      }}
    >
      <div
        className="absolute"
        style={{ transform: 'translate(-50%, -50%)', zIndex: 1000 }}
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
        transform: 'translate(-50%, -50%)',
        zIndex: 1000
      }}
    >
      {label}
    </div>
  )
);
    }

    return (
      <React.Fragment key={field.id}>
        <Polygon
          positions={coordsList}
          pathOptions={{ fillColor, color: '#333', fillOpacity: 1 }}
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
      style={{ height: '40px' }}
    />
  </div>


{/* LEGEND */}
<div
  className="bg-white bg-opacity-95 shadow border border-gray-300 rounded-md px-4 py-3 w-[500px] text-sm mx-auto"
  style={{
    overflow: 'visible',
    maxHeight: 'none'
  }}
>

  <div className="grid grid-cols-2 gap-y-1">
    {colorMode === 'crop' && Object.entries(cropColors)
      .filter(([crop]) =>
        filteredFields.some(f => f.crops?.[cropYear]?.crop === crop)
      )
      .map(([crop, color]) => (
        <div key={crop} className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: color }}></div>
          <span className="truncate">
            {crop} – {
              filteredFields.reduce((sum, f) => {
                const c = f.crops?.[cropYear]?.crop;
                return c === crop ? sum + (f.gpsAcres || 0) : sum;
              }, 0).toFixed(1)
            } ac
          </span>
        </div>
      ))}

    {colorMode === 'variety' && Array.from(new Set(
      filteredFields
        .map(f => varietyMap[f.id]?.variety)
        .filter(Boolean)
    )).map(variety => {
      const total = filteredFields.reduce((sum, f) => {
        return varietyMap[f.id]?.variety === variety
          ? sum + (f.gpsAcres || 0)
          : sum;
      }, 0);
      return (
        <div key={variety} className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: getVarietyColor(variety) }}></div>
          <span className="truncate">{variety} – {total.toFixed(1)} ac</span>
        </div>
      );
    })}

    {colorMode === 'tech' && filteredFields
      .map(f => {
        const variety = varietyMap[f.id]?.variety;
        const tech = productMap[variety]?.technology;
        return tech || null;
      })
      .filter((tech, i, arr) => tech && arr.indexOf(tech) === i)
      .map(tech => {
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
            <span className="truncate">{tech} – {total.toFixed(1)} ac</span>
          </div>
        );
      })}
  </div>

  <div className="pt-2 mt-2 border-t text-xs text-gray-600 flex justify-center">
    <span>
      {filteredFields.length} fields •{' '}
      {filteredFields.reduce((sum, f) => {
        const crop = f.crops?.[cropYear];
        const hasCrop = crop?.crop || crop?.riceType;
        const acres = f.gpsAcres || 0;
        return hasCrop ? sum + acres : sum;
      }, 0).toFixed(1)} crop ac •{' '}
      {filteredFields.reduce((sum, f) => sum + (f.gpsAcres || 0), 0).toFixed(1)} total ac
    </span>
  </div>

  <div style={{ height: '1px' }} /> {/* Keeps PDF from slicing the bottom */}
</div>




      </div>
    </div>
  );
}
