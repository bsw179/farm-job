import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  LayersControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { CropYearContext } from "../context/CropYearContext";

import Draggable from "react-draggable";
import * as htmlToImage from "html-to-image";
import { jsPDF } from "jspdf";
import download from "downloadjs";
import * as turf from "@turf/turf";

// =========================
// Color maps
// =========================
const cropColors = {
  "Rice - Long Grain": "#facc15",
  "Rice - Medium Grain": "#fb923c",
  Soybeans: "#22c55e",
  Fallow: "#9ca3af",
  "Prevented Planting": "#ef4444",
  Idle: "#6b7280",
  default: "#a3a3a3",
};

const techColors = {
  "Roundup Ready": "#ffffff",
  Enlist: "#14b8a6",
  Xtend: "#111111",
  "Clearfield/Fullpage": "#facc15",
  "Provisia/MaxAce": "#a855f7",
  Conventional: "#ef4444",
  "Conventional (Soybeans)": "#ec4899",
  default: "#a3a3a3",
};

// =========================
// Helpers
// =========================
function getCropColor(crop) {
  return cropColors[crop] || cropColors.default;
}

function getTechColor(tech) {
  return techColors[tech] || techColors.default;
}

function getVarietyColor(variety) {
  if (!variety) return cropColors.default;
  const hash = [...variety].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 70%)`;
}

function getNeighborShortLabel({ crop, tech, colorMode }) {
  if (colorMode === "crop") {
    if (crop === "Soybeans") return "SB";
    if (crop === "Rice - Long Grain") return "RLG";
    if (crop === "Rice - Medium Grain") return "RMG";
    if (crop === "Corn") return "CRN";
    if (crop === "Wheat") return "WHT";
    return "";
  }

  if (tech === "Roundup Ready") return "RR";
  if (tech === "Enlist") return "E";
  if (tech === "Xtend") return "X";
  if (tech === "Conventional") return "C";
  if (tech === "Clearfield/Fullpage") return "CF";
  if (tech === "Provisia/MaxAce") return "PV";
  return "";
}

function parseBoundaryGeoJSON(rawGeo) {
  let geo = rawGeo;

  if (!geo) return null;

  if (typeof geo === "string") {
    try {
      geo = JSON.parse(geo);
    } catch {
      return null;
    }
  }

  if (!geo?.type || !geo?.coordinates) return null;

  try {
    if (geo.type === "Polygon") {
      const outerRing = geo.coordinates?.[0];
      if (!Array.isArray(outerRing)) return null;

      return {
        geo,
        positions: outerRing.map(([lng, lat]) => [lat, lng]),
      };
    }

    if (geo.type === "MultiPolygon") {
      const firstPolygonOuterRing = geo.coordinates?.[0]?.[0];
      if (!Array.isArray(firstPolygonOuterRing)) return null;

      return {
        geo,
        positions: firstPolygonOuterRing.map(([lng, lat]) => [lat, lng]),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function getFieldCenterLatLng(geo) {
  try {
    const center = turf.centroid(geo).geometry.coordinates;
    return { lat: center[1], lng: center[0] };
  } catch {
    return null;
  }
}

function getFieldLabelLines(field, info, labelFields) {
  return labelFields
    .map((key) => {
      if (key === "fieldName") return field.fieldName || "—";
      if (key === "gpsAcres")
        return `${Number(field.gpsAcres || 0).toFixed(1)} ac`;
      if (key === "fsaAcres")
        return `${Number(field.fsaAcres || 0).toFixed(1)} FSA ac`;
      if (key === "variety") return info.variety || "";
      if (key === "rate")
        return info.rate ? `${info.rate} ${info.unit || ""}` : "";
      if (key === "vendor") return info.vendor || "";
      return "";
    })
    .filter(Boolean);
}

function getSafeTimestampValue(value) {
  if (!value) return 0;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (value?.seconds) {
    return value.seconds * 1000;
  }

  return 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================
// Map hooks/components
// =========================
function MapReadySetter({ mapRef, setMapReady }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    mapRef.current = map;
    setMapReady(true);

    const handleLoad = () => {
      setMapReady(true);
    };

    map.on("load", handleLoad);

    return () => {
      map.off("load", handleLoad);
    };
  }, [map, mapRef, setMapReady]);

  return null;
}

function MapMoveWatcher({ onMapChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleChange = () => {
      onMapChange();
    };

    map.on("move", handleChange);
    map.on("zoom", handleChange);
    map.on("resize", handleChange);

    return () => {
      map.off("move", handleChange);
      map.off("zoom", handleChange);
      map.off("resize", handleChange);
    };
  }, [map, onMapChange]);

  return null;
}

function GeomanControls({ enabled, cropYear, onPolygonSaved }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleCreate = async (e) => {
      const layer = e.layer;
      const geo = layer.toGeoJSON();

      const techLabel =
        window.prompt("Enter technology (Enlist, Xtend, etc):") || "";
      const cropLabel =
        window.prompt("Enter crop (Soybeans, Rice - Long Grain, etc):") || "";

      if (!techLabel && !cropLabel) {
        window.alert("❌ Must enter at least a crop or tech.");
        map.removeLayer(layer);
        return;
      }

      try {
        const cleanedGeometry = {
          type: geo.geometry.type,
          coordinates: geo.geometry.coordinates.map((ring) =>
            ring.map((coord) => [...coord]),
          ),
        };

        await addDoc(collection(db, "neighborPolygons"), {
          geometry: JSON.stringify(cleanedGeometry),
          labelsByYear: {
            [cropYear]: {
              tech: techLabel || null,
              crop: cropLabel || null,
            },
          },
          createdAt: serverTimestamp(),
        });

        map.removeLayer(layer);
        window.alert("✅ Polygon saved successfully");

        if (typeof onPolygonSaved === "function") {
          onPolygonSaved();
        }
      } catch (err) {
        console.error("❌ Error saving polygon:", err);
        window.alert(`❌ Failed to save polygon: ${err.message}`);
      }
    };

    if (enabled) {
      map.pm.addControls({
        position: "topleft",
        drawPolygon: true,
        editMode: false,
        dragMode: false,
        cutPolygon: false,
        removalMode: false,
        drawCircle: false,
        drawMarker: false,
        drawPolyline: false,
        drawCircleMarker: false,
        drawRectangle: false,
        rotateMode: false,
      });

      map.on("pm:create", handleCreate);
    } else {
      map.off("pm:create", handleCreate);
      map.pm.removeControls();
    }

    return () => {
      map.off("pm:create", handleCreate);
      map.pm.removeControls();
    };
  }, [enabled, map, cropYear, onPolygonSaved]);

  return null;
}

// =========================
// Main component
// =========================
export default function MapViewer() {
  const { cropYear } = useContext(CropYearContext);

  // Refs
  const mapRef = useRef(null);
  const exportAreaRef = useRef(null);
  const mapStageRef = useRef(null);
  const farmPickerRef = useRef(null);

  // Data state
  const [fields, setFields] = useState([]);
  const [varietyMap, setVarietyMap] = useState({});
  const [productMap, setProductMap] = useState({});
  const [neighborPolygons, setNeighborPolygons] = useState([]);

  // UI state
  const [mapReady, setMapReady] = useState(false);
  const [mapRenderTick, setMapRenderTick] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const [labelFontSize, setLabelFontSize] = useState(12);
  const [labelFields, setLabelFields] = useState(["fieldName", "gpsAcres"]);
  const [labelOffsets, setLabelOffsets] = useState({});
  const [colorMode, setColorMode] = useState("crop");

  const [selectedFarms, setSelectedFarms] = useState([]);
  const [farmSearch, setFarmSearch] = useState("");
  const [farmPickerOpen, setFarmPickerOpen] = useState(false);
  const [operatorFilter, setOperatorFilter] = useState("");

  const [dragLabelsMode, setDragLabelsMode] = useState(false);
  const [mapTitle, setMapTitle] = useState("Map Title");
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showNeighborZones, setShowNeighborZones] = useState(false);

  const availableFields = [
    { key: "fieldName", label: "Field Name" },
    { key: "gpsAcres", label: "GPS Acres" },
    { key: "fsaAcres", label: "FSA Acres" },
    { key: "variety", label: "Variety" },
    { key: "rate", label: "Rate" },
    { key: "vendor", label: "Vendor" },
  ];

  // =========================
  // Data loaders
  // =========================
  const loadNeighborPolygons = useCallback(async () => {
    const snap = await getDocs(collection(db, "neighborPolygons"));
    const data = snap.docs
      .map((docSnap) => {
        const raw = docSnap.data();

        try {
          return {
            id: docSnap.id,
            geometry: JSON.parse(raw.geometry),
            labelsByYear: raw.labelsByYear || {},
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    setNeighborPolygons(data);
  }, []);

  useEffect(() => {
    const loadFields = async () => {
      const snapshot = await getDocs(collection(db, "fields"));
      const data = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data();
        return {
          id: docSnap.id,
          ...raw,
          labelOffset: raw.labelOffset || { x: 0, y: 0 },
        };
      });

      setFields(data);

      const offsets = {};
      data.forEach((field) => {
        offsets[field.id] = field.labelOffset || { x: 0, y: 0 };
      });
      setLabelOffsets(offsets);
    };

    loadFields();
    loadNeighborPolygons();
  }, [loadNeighborPolygons]);

  useEffect(() => {
    const loadVarietyInfo = async () => {
      const snapshot = await getDocs(collection(db, "jobsByField"));
      const allJobs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const seedingJobs = allJobs
        .filter(
          (job) =>
            job.jobType?.parentName === "Seeding" &&
            job.cropYear === cropYear &&
            job.fieldId &&
            Array.isArray(job.products),
        )
        .sort((a, b) => {
          const aTime = Math.max(
            getSafeTimestampValue(a.jobDate),
            getSafeTimestampValue(a.updatedAt),
            getSafeTimestampValue(a.createdAt),
            getSafeTimestampValue(a.timestamp),
          );
          const bTime = Math.max(
            getSafeTimestampValue(b.jobDate),
            getSafeTimestampValue(b.updatedAt),
            getSafeTimestampValue(b.createdAt),
            getSafeTimestampValue(b.timestamp),
          );
          return bTime - aTime;
        });

      const nextMap = {};

      seedingJobs.forEach((job) => {
        if (nextMap[job.fieldId]) return;

        const product = job.products?.[0];
        if (!product?.productName) return;

        nextMap[job.fieldId] = {
          variety: product.productName,
          rate: product.rate || null,
          unit: product.unit || null,
          vendor: job.vendor || null,
        };
      });

      setVarietyMap(nextMap);
    };

    loadVarietyInfo();
  }, [cropYear]);

  useEffect(() => {
    const loadProducts = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const nextMap = {};

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name) {
          nextMap[data.name] = data;
        }
      });

      setProductMap(nextMap);
    };

    loadProducts();
  }, []);

  // =========================
  // Outside click for farm picker
  // =========================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!farmPickerRef.current) return;
      if (!farmPickerRef.current.contains(event.target)) {
        setFarmPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =========================
  // Map drag behavior while dragging labels
  // =========================
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.dragging.enable();
  }, [dragLabelsMode, mapReady]);

  // =========================
  // Derived values
  // =========================
  const uniqueFarms = useMemo(() => {
    return Array.from(
      new Set(fields.map((f) => f.farmName).filter(Boolean)),
    ).sort();
  }, [fields]);

  const uniqueOperators = useMemo(() => {
    return Array.from(
      new Set(fields.map((f) => f.operator).filter(Boolean)),
    ).sort();
  }, [fields]);

  const filteredFarmOptions = useMemo(() => {
    const q = farmSearch.trim().toLowerCase();
    if (!q) return uniqueFarms;
    return uniqueFarms.filter((farm) => farm.toLowerCase().includes(q));
  }, [uniqueFarms, farmSearch]);

  const selectedFields = useMemo(() => {
    return fields.filter((field) => {
      const matchesFarm =
        selectedFarms.length === 0 || selectedFarms.includes(field.farmName);
      const matchesOperator =
        !operatorFilter || field.operator === operatorFilter;

      return matchesFarm && matchesOperator;
    });
  }, [fields, selectedFarms, operatorFilter]);

  const preparedFields = useMemo(() => {
    return selectedFields
      .map((field) => {
        const parsed = parseBoundaryGeoJSON(field.boundary?.geojson);
        if (!parsed) return null;

        const center = getFieldCenterLatLng(parsed.geo);
        if (!center) return null;

        const info = varietyMap[field.id] || {};
        const variety = info.variety || "";
        const crop = field.crops?.[cropYear]?.crop || "—";
        const tech = variety ? productMap[variety]?.technology : null;

        const fillColor =
          colorMode === "crop"
            ? getCropColor(crop)
            : colorMode === "variety"
              ? getVarietyColor(variety)
              : getTechColor(tech);

        return {
          field,
          info,
          crop,
          variety,
          tech,
          fillColor,
          center,
          positions: parsed.positions,
          geo: parsed.geo,
          labelLines: getFieldLabelLines(field, info, labelFields),
        };
      })
      .filter(Boolean);
  }, [
    selectedFields,
    varietyMap,
    productMap,
    cropYear,
    colorMode,
    labelFields,
  ]);

  const cropLegendItems = useMemo(() => {
    const entries = Object.entries(cropColors).filter(
      ([key]) => key !== "default",
    );

    return entries
      .map(([crop, color]) => {
        const total = preparedFields.reduce((sum, item) => {
          return item.crop === crop
            ? sum + Number(item.field.gpsAcres || 0)
            : sum;
        }, 0);

        if (total === 0) return null;

        return {
          label: crop,
          color,
          acres: total,
        };
      })
      .filter(Boolean);
  }, [preparedFields]);

  const varietyLegendItems = useMemo(() => {
    const totals = {};

    preparedFields.forEach((item) => {
      if (!item.variety) return;
      if (!totals[item.variety]) totals[item.variety] = 0;
      totals[item.variety] += Number(item.field.gpsAcres || 0);
    });

    return Object.entries(totals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([variety, acres]) => ({
        label: variety,
        color: getVarietyColor(variety),
        acres,
      }));
  }, [preparedFields]);

  const techLegendItems = useMemo(() => {
    const totals = {};

    preparedFields.forEach((item) => {
      if (!item.tech) return;
      if (!totals[item.tech]) totals[item.tech] = 0;
      totals[item.tech] += Number(item.field.gpsAcres || 0);
    });

    return Object.entries(totals)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tech, acres]) => ({
        label: tech,
        color: getTechColor(tech),
        acres,
      }));
  }, [preparedFields]);

  const neighborLegendItems = useMemo(() => {
    const entries =
      colorMode === "tech"
        ? Object.entries(techColors)
        : Object.entries(cropColors);

    return entries
      .filter(([key]) => key !== "default")
      .map(([label, color]) => ({
        label,
        color,
      }));
  }, [colorMode]);

  const totalSelectedAcres = useMemo(() => {
    return selectedFields.reduce(
      (sum, field) => sum + Number(field.gpsAcres || 0),
      0,
    );
  }, [selectedFields]);

  const totalSelectedCropAcres = useMemo(() => {
    return selectedFields.reduce((sum, field) => {
      const crop = field.crops?.[cropYear];
      const hasCrop = crop?.crop || crop?.riceType;
      return hasCrop ? sum + Number(field.gpsAcres || 0) : sum;
    }, 0);
  }, [selectedFields, cropYear]);

  // =========================
  // UI handlers
  // =========================
  const toggleFarmSelection = useCallback((farmName) => {
    setSelectedFarms((prev) => {
      if (prev.includes(farmName)) {
        return prev.filter((name) => name !== farmName);
      }
      return [...prev, farmName];
    });
  }, []);

  const removeFarmTag = useCallback((farmName) => {
    setSelectedFarms((prev) => prev.filter((name) => name !== farmName));
  }, []);

  const clearAllFarmTags = useCallback(() => {
    setSelectedFarms([]);
  }, []);

  const forceMapRerender = useCallback(() => {
    setMapRenderTick((tick) => tick + 1);
  }, []);

  const saveLabelOffset = useCallback(async (fieldId, newOffset) => {
    setLabelOffsets((prev) => ({
      ...prev,
      [fieldId]: newOffset,
    }));

    try {
      await updateDoc(doc(db, "fields", fieldId), {
        labelOffset: newOffset,
      });
    } catch (err) {
      console.error("❌ Failed to save label offset:", err);
    }
  }, []);

  // =========================
  // Export helpers
  // =========================
  const prepareForExport = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    map.invalidateSize();
    await sleep(350);
    map.invalidateSize();
    await sleep(350);
  }, []);

  const exportPNG = useCallback(async () => {
    if (!exportAreaRef.current) return;

    try {
      setIsExporting(true);
      await prepareForExport();

      const dataUrl = await htmlToImage.toPng(exportAreaRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      download(dataUrl, "map-export.png");
    } catch (err) {
      console.error("❌ PNG export failed:", err);
      window.alert(
        "PNG export failed. Use OpenStreetMap or Esri base layer for the cleanest export.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [prepareForExport]);

  const exportPDF = useCallback(async () => {
    if (!exportAreaRef.current) return;

    try {
      setIsExporting(true);
      await prepareForExport();

      const dataUrl = await htmlToImage.toPng(exportAreaRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;

      const imgProps = pdf.getImageProperties(dataUrl);

      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      const ratio = Math.min(
        usableWidth / imgProps.width,
        usableHeight / imgProps.height,
      );

      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      const x = (pageWidth - imgWidth) / 2;
      const y = margin;

      pdf.addImage(dataUrl, "PNG", x, y, imgWidth, imgHeight);
      pdf.save("map-export.pdf");
    } catch (err) {
      console.error("❌ PDF export failed:", err);
      window.alert(
        "PDF export failed. Use OpenStreetMap or Esri base layer for the cleanest export.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [prepareForExport]);

  // =========================
  // Render helpers
  // =========================
  const renderLegendItems = () => {
    if (showNeighborZones) {
      return (
        <>
          <div className="font-semibold mb-2">
            {colorMode === "tech" ? "Technology Legend" : "Crop Legend"}
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4">
            {neighborLegendItems.map((item) => (
              <div key={item.label} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-sm shrink-0 border border-gray-300"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      );
    }

    const legendItems =
      colorMode === "crop"
        ? cropLegendItems
        : colorMode === "variety"
          ? varietyLegendItems
          : techLegendItems;

    return (
      <>
        <div className="grid grid-cols-2 gap-y-1 gap-x-4">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-sm shrink-0 border border-gray-300"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">
                {item.label} – {Number(item.acres || 0).toFixed(1)} ac
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 mt-2 border-t text-xs text-gray-600 flex justify-center">
          <span>
            {selectedFields.length} fields • {totalSelectedCropAcres.toFixed(1)}{" "}
            crop ac • {totalSelectedAcres.toFixed(1)} total ac
          </span>
        </div>
      </>
    );
  };

  return (
    <div className="relative flex flex-col items-center bg-gray-100 min-h-screen px-4 py-6">
      {/* =========================
          Control panel
      ========================= */}
      <div className="w-full max-w-[1200px] mb-4 z-[1000]">
        <div className="bg-white border border-gray-300 rounded shadow p-4">
          {/* Label fields */}
          <div className="flex overflow-x-auto gap-2 mb-2 whitespace-nowrap">
            {labelFields.map((fieldKey) => (
              <span
                key={fieldKey}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm flex items-center"
              >
                {availableFields.find((f) => f.key === fieldKey)?.label}
                <button
                  type="button"
                  className="ml-2 text-white"
                  onClick={() =>
                    setLabelFields((prev) => prev.filter((f) => f !== fieldKey))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <select
            className="text-sm p-2 border rounded w-full mb-4"
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (value && !labelFields.includes(value)) {
                setLabelFields((prev) => [...prev, value]);
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

          <div className="flex flex-wrap gap-4 items-start">
            {/* Color by */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Color by:</label>
              <select
                className="text-sm p-2 border rounded"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value)}
              >
                <option value="crop">Crop</option>
                <option value="variety">Variety</option>
                <option value="tech">Technology</option>
              </select>
            </div>

            {/* Font size */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Font size:</label>
              <input
                type="number"
                min={8}
                max={40}
                step={1}
                value={labelFontSize}
                onChange={(e) => setLabelFontSize(Number(e.target.value))}
                className="w-[70px] text-sm border rounded px-2 py-2"
              />
            </div>

            {/* Multi farm selector */}
            <div className="min-w-[320px] flex-1" ref={farmPickerRef}>
              <label className="block text-sm font-medium mb-1">Farms:</label>

              <div className="border rounded bg-white p-2 min-h-[44px]">
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedFarms.map((farm) => (
                    <span
                      key={farm}
                      className="inline-flex items-center gap-2 bg-blue-100 text-blue-900 px-2 py-1 rounded text-sm"
                    >
                      {farm}
                      <button
                        type="button"
                        onClick={() => removeFarmTag(farm)}
                        className="font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={() => setFarmPickerOpen((prev) => !prev)}
                    className="text-sm border rounded px-2 py-1 bg-gray-50 hover:bg-gray-100"
                  >
                    {selectedFarms.length === 0 ? "Select farms" : "Add farms"}
                  </button>

                  {selectedFarms.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFarmTags}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {farmPickerOpen && (
                  <div className="mt-2 border rounded bg-white shadow p-2 max-h-[260px] overflow-auto">
                    <input
                      type="text"
                      placeholder="Search farms..."
                      value={farmSearch}
                      onChange={(e) => setFarmSearch(e.target.value)}
                      className="w-full border rounded px-2 py-2 text-sm mb-2"
                    />

                    <div className="space-y-1">
                      {filteredFarmOptions.length === 0 && (
                        <div className="text-sm text-gray-500 px-2 py-1">
                          No farms found
                        </div>
                      )}

                      {filteredFarmOptions.map((farm) => {
                        const isSelected = selectedFarms.includes(farm);

                        return (
                          <button
                            key={farm}
                            type="button"
                            onClick={() => toggleFarmSelection(farm)}
                            className={`w-full text-left px-2 py-2 rounded text-sm ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            {farm}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Operator */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Operator:
              </label>
              <select
                className="text-sm p-2 border rounded min-w-[180px]"
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

            {/* Toggles */}
            <div className="flex flex-col gap-2 min-w-[180px]">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={dragLabelsMode}
                  onChange={(e) => setDragLabelsMode(e.target.checked)}
                />
                Drag Labels
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={showDrawingTools}
                  onChange={(e) => setShowDrawingTools(e.target.checked)}
                />
                Show Drawing Tools
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={showNeighborZones}
                  onChange={(e) => setShowNeighborZones(e.target.checked)}
                />
                Show Neighbor Zones
              </label>
            </div>

            {/* Export buttons */}
            <div className="flex flex-col gap-2 ml-auto">
              <button
                type="button"
                onClick={exportPNG}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded shadow"
              >
                📸 Export PNG
              </button>

              <button
                type="button"
                onClick={exportPDF}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded shadow"
              >
                🧾 Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          Export / print area
      ========================= */}
      <div
        ref={exportAreaRef}
        id="map-export-area"
        className="bg-white shadow-xl"
        style={{
          width: "774px",
          minHeight: "1123px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "12px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Map stage */}
        <div
          ref={mapStageRef}
          className="relative w-full border border-gray-300 rounded overflow-hidden"
          style={{ height: "820px", backgroundColor: "#ffffff" }}
        >
          <MapContainer
            center={[35.5, -91]}
            zoom={12}
            zoomControl={false}
            zoomSnap={0.1}
            zoomDelta={0.1}
            wheelPxPerZoomLevel={500}
            style={{ width: "100%", height: "100%" }}
          >
            <MapReadySetter mapRef={mapRef} setMapReady={setMapReady} />
            <MapMoveWatcher onMapChange={forceMapRerender} />
            <GeomanControls
              enabled={showDrawingTools}
              cropYear={cropYear}
              onPolygonSaved={loadNeighborPolygons}
            />

            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  crossOrigin="anonymous"
                  attribution="© OpenStreetMap contributors"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Esri Satellite">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  crossOrigin="anonymous"
                  attribution="Tiles © Esri"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Blank">
                <TileLayer url="" attribution="" />
              </LayersControl.BaseLayer>
            </LayersControl>

            {showNeighborZones &&
              neighborPolygons.map((polygon) => {
                const labelData = polygon.labelsByYear?.[cropYear] || {};
                const tech = labelData.tech;
                const crop = labelData.crop;

                const parsed = parseBoundaryGeoJSON(polygon.geometry);
                if (!parsed) return null;

                const fillColor =
                  colorMode === "crop"
                    ? getCropColor(crop)
                    : colorMode === "tech"
                      ? getTechColor(tech)
                      : "#cccccc";

                return (
                  <Polygon
                    key={`${polygon.id}-${colorMode}`}
                    positions={parsed.positions}
                    pathOptions={{
                      fillColor,
                      color: "#374151",
                      fillOpacity: 0.45,
                      weight: 1.5,
                    }}
                  />
                );
              })}

            {preparedFields.map((item) => (
              <Polygon
                key={`${item.field.id}-${colorMode}`}
                positions={item.positions}
                pathOptions={{
                  fillColor: item.fillColor,
                  color: "#333333",
                  fillOpacity: 0.9,
                  weight: 1.2,
                }}
              />
            ))}
          </MapContainer>

          {/* Overlay labels */}
          {mapRef.current &&
            mapReady &&
            preparedFields.map((item) => {
              const anchor = mapRef.current.latLngToContainerPoint([
                item.center.lat,
                item.center.lng,
              ]);

              const offset = labelOffsets[item.field.id] || { x: 0, y: 0 };


              return (
                <div
                  key={`${item.field.id}-${mapRenderTick}-${labelFontSize}-${dragLabelsMode ? "drag" : "static"}`}
                  className={
                    dragLabelsMode ? "absolute" : "absolute pointer-events-none"
                  }
                  style={{
                    left: anchor.x,
                    top: anchor.y,
                    zIndex: 1000,
                  }}
                >
                  {dragLabelsMode ? (
                    <Draggable
                      key={item.field.id}
                      defaultPosition={{ x: offset.x, y: offset.y }}
                      onStop={(_, data) => {
                        saveLabelOffset(item.field.id, {
                          x: data.x,
                          y: data.y,
                        });
                      }}
                    >
                      <div
                        key={`${item.field.id}-label-${labelFontSize}`}
                        style={{
                          transform: "translate(-50%, -50%)",
                          cursor: "move",
                        }}
                      >
                        <div
                          className="text-black font-bold text-center whitespace-nowrap select-none"
                          style={{
                            fontSize: `${labelFontSize}px`,
                            lineHeight: 1.1,
                            textShadow:
                              "0 1px 0 rgba(255,255,255,0.95), 1px 0 0 rgba(255,255,255,0.95), -1px 0 0 rgba(255,255,255,0.95), 0 -1px 0 rgba(255,255,255,0.95)",
                          }}
                        >
                          {item.labelLines.map((line, idx) => (
                            <div key={idx}>{line}</div>
                          ))}
                        </div>
                      </div>
                    </Draggable>
                  ) : (
                    <div
                      style={{
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      }}
                    >
                      <div
                        className="text-black font-bold text-center whitespace-nowrap select-none"
                        style={{
                          fontSize: `${labelFontSize}px`,
                          lineHeight: 1.1,
                          textShadow:
                            "0 1px 0 rgba(255,255,255,0.95), 1px 0 0 rgba(255,255,255,0.95), -1px 0 0 rgba(255,255,255,0.95), 0 -1px 0 rgba(255,255,255,0.95)",
                        }}
                      >
                        {item.labelLines.map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Neighbor short labels */}
          {showNeighborZones &&
            mapRef.current &&
            mapReady &&
            neighborPolygons.map((polygon) => {
              const labelData = polygon.labelsByYear?.[cropYear] || {};
              const tech = labelData.tech;
              const crop = labelData.crop;
              const shortLabel = getNeighborShortLabel({
                crop,
                tech,
                colorMode,
              });

              if (!shortLabel) return null;

              const center = getFieldCenterLatLng(polygon.geometry);
              if (!center) return null;

              const point = mapRef.current.latLngToContainerPoint([
                center.lat,
                center.lng,
              ]);

              return (
                <div
                  key={`neighbor-label-${polygon.id}-${mapRenderTick}-${colorMode}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: point.x,
                    top: point.y,
                    transform: "translate(-50%, -50%)",
                    zIndex: 900,
                  }}
                >
                  <div
                    className="font-bold text-black text-center"
                    style={{
                      fontSize: "16px",
                      textShadow:
                        "0 1px 0 rgba(255,255,255,0.95), 1px 0 0 rgba(255,255,255,0.95), -1px 0 0 rgba(255,255,255,0.95), 0 -1px 0 rgba(255,255,255,0.95)",
                    }}
                  >
                    {shortLabel}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Title */}
        <div className="w-[320px] text-center mx-auto mt-3 mb-3">
          <textarea
            value={mapTitle}
            onChange={(e) => setMapTitle(e.target.value)}
            className="w-full text-[12pt] font-semibold text-center bg-white rounded px-2 py-1 resize-none focus:outline-none leading-tight"
            style={{ height: "42px" }}
          />
        </div>

        {/* Legend */}
        <div
          className={`bg-white shadow border border-gray-300 rounded-md px-4 py-3 text-sm mx-auto ${
            showNeighborZones ? "w-[420px]" : "w-[520px]"
          }`}
          style={{ overflow: "visible" }}
        >
          {renderLegendItems()}
        </div>
      </div>
    </div>
  );
}
