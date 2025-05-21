import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import * as turf from "@turf/turf";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

export default function EditJobPolygonForCreate({ field, onCloseModal, onSavePolygon }) {
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [drawnAcres, setDrawnAcres] = useState(null);
  const [mapType, setMapType] = useState("satellite");
  const drawnLayerRef = useRef(null);
  const layers = useRef([]);

console.log("🔍 EditJobPolygonForCreate mounted");

  useEffect(() => {
    if (!field) return;
console.log("⛳ useEffect triggered", { field });
let geoRaw = field?.boundary?.geojson || field?.boundary;
console.log("🌐 geoRaw value:", geoRaw);

if (!geoRaw) {
  console.warn("⛔ EXIT: no geojson found in field");
  return;
}

let geo;
try {
  geo = typeof geoRaw === "string" ? JSON.parse(geoRaw) : geoRaw;
  if (geo?.type === "Feature") geo = geo.geometry;
} catch (err) {
  console.warn("⛔ EXIT: failed to parse geojson", err);
  return;
}




    try {
      if (typeof geo === "string") geo = JSON.parse(geo);
      if (geo?.type === "Feature") geo = geo.geometry;
    } catch (err) {
      console.warn("Invalid GeoJSON:", err);
        console.warn("⛔ EXIT: invalid geojson", err);

      return;
    }

    if (window._leaflet_map) {
      window._leaflet_map.remove();
      delete window._leaflet_map;
    }

   const container = document.getElementById("map");

   if (!container) {
     console.warn("🛑 #map container not found");
     return;
   }

   console.log("✅ #map container found");
   console.log(
     "📏 width:",
     container.offsetWidth,
     "height:",
     container.offsetHeight
   );

   if (container.offsetWidth === 0 || container.offsetHeight === 0) {
     console.warn("🛑 #map has zero width/height, deferring map render...");
     setTimeout(() => {
       window.dispatchEvent(new Event("resize"));
     }, 300);
     return;
   }
console.log("🧭 Creating map on #map");

   // ✅ Proceed with normal render
   const map = L.map("map", { center: [35, -91], zoom: 17 });
   L.marker([35, -91]).addTo(map).bindPopup("Test marker").openPopup();

   console.log("✅ Map initialized");
   window._leaflet_map = map;


    // ✅ Fix: Force map to resize after modal animation
    setTimeout(() => {
      map.invalidateSize();
    }, 300);


    const tileLayer =
      mapType === "satellite"
        ? L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          )
        : L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          );
    tileLayer.addTo(map);
console.log("🧱 Tile layer added");
console.log("🧱 Attempting to draw polygon", geo);

 if (geo?.type === "Polygon") {
   const coords = geo.coordinates[0].map(([lng, lat]) => [lat, lng]);
   const boundary = L.polygon(coords, {
     color: "gray",
     weight: 1,
     fillOpacity: 0.2,
     interactive: true,
     pmIgnore: false,
   }).addTo(map);

   map.fitBounds(boundary.getBounds());

   // ✅ Calculate acres on initial load
   setDrawnPolygon(boundary.toGeoJSON());
   const acres = turf.area(boundary.toGeoJSON()) * 0.000247105;
   setDrawnAcres(acres.toFixed(2));
 }



    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
    });

    const layers = [];

    if (field?.drawnPolygon) {
      let stored = field.drawnPolygon;
      if (typeof stored === "string") {
        try {
          stored = JSON.parse(stored);
        } catch {
          stored = null;
        }
      }

      if (stored?.type === "Feature" || stored?.type === "Polygon") {
        const geometry = stored.type === "Feature" ? stored.geometry : stored;
        if (geometry?.type === "Polygon") {
          const coords = geometry.coordinates[0].map(([lng, lat]) => [
            lat,
            lng,
          ]);
          const layer = L.polygon(coords, {
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
          }).addTo(map);

          if (layer.pm) {
            layer.pm.enable();
            layer.on("pm:edit", updateTotalAcres);
          }

          layers.push(layer);
          updateTotalAcres();
        }
      }
    }

    map.on("pm:create", (e) => {
      const layer = e.layer;
      layers.push(layer);
      map.addLayer(layer);
      layer.pm.enable();
      layer.on("pm:edit", updateTotalAcres);
      updateTotalAcres();
    });

 map.on("pm:remove", (e) => {
   const layer = e.layer;
   const index = layers.indexOf(layer);
   if (index !== -1) {
     layers.splice(index, 1);
   }

   if (layers.length === 0) {
     // ✅ No drawn polygon left — revert to field boundary
     if (geo?.type === "Polygon") {
       const coords = geo.coordinates[0].map(([lng, lat]) => [lat, lng]);
       const fallback = L.polygon(coords);
       const rawGeo = fallback.toGeoJSON();
       const acres = turf.area(rawGeo) * 0.000247105;
       setDrawnPolygon(rawGeo);
       setDrawnAcres(acres.toFixed(2));
     } else {
       setDrawnPolygon(null);
       setDrawnAcres(null);
     }
   } else {
     updateTotalAcres();
   }
 });


    function updateTotalAcres() {
      if (!layers.length) return;
      const geo = layers[0].toGeoJSON();
      const acres = turf.area(geo) * 0.000247105;
      setDrawnPolygon(geo); console.log("📏 drawnPolygon set:", geo);

      setDrawnAcres(acres.toFixed(2));
    }
  }, [field, mapType]);

const handleSave = () => {
if (!drawnAcres) return;

const updatedField = {
  ...field,
  drawnPolygon: field.drawnPolygon || null,
  drawnAcres: parseFloat(drawnAcres),
};

// Only overwrite drawnPolygon if the user created one
if (drawnPolygon && layers.current.length > 0) {
  updatedField.drawnPolygon = drawnPolygon;
} else {
  updatedField.drawnPolygon = null;
}


onSavePolygon({
  ...field,
  drawnPolygon: drawnPolygon ? JSON.stringify(drawnPolygon) : null,
  drawnAcres: drawnPolygon ? parseFloat(drawnAcres) : null,
});


  onCloseModal();
};


  return (
    <div className="p-4">
      <div id="map" className="h-[600px] w-full rounded shadow bg-gray-200" />

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Acres: <span className="font-semibold">{drawnAcres || "—"}</span>
        </div>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Save Area
        </button>
      </div>
    </div>
  );
}
