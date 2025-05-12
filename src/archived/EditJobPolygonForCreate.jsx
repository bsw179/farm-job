import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import * as turf from "@turf/turf";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

export default function EditJobPolygonForCreate({ field, onCloseModal, onSavePolygon }) {
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [drawnAcres, setDrawnAcres] = useState(null);
  const [mapType, setMapType] = useState("satellite");
  const drawnLayerRef = useRef(null);


  useEffect(() => {
    if (!field) return;

    let geo = field?.boundary?.geojson || field?.boundary;
    if (!geo) return;

    try {
      if (typeof geo === "string") geo = JSON.parse(geo);
      if (geo?.type === "Feature") geo = geo.geometry;
    } catch (err) {
      console.warn("Invalid GeoJSON:", err);
      return;
    }

    if (window._leaflet_map) {
      window._leaflet_map.remove();
      delete window._leaflet_map;
    }

    const map = L.map("map", { center: [35, -91], zoom: 17 });
    window._leaflet_map = map;

    const tileLayer =
      mapType === "satellite"
        ? L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          )
        : L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          );
    tileLayer.addTo(map);

    if (geo?.type === "Polygon") {
      const coords = geo.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const boundary = L.polygon(coords, {
        color: "gray",
        weight: 1,
        fillOpacity: 0.2,
        interactive: false,
        pmIgnore: false,
      }).addTo(map);

      delete boundary.pm;
      map.fitBounds(boundary.getBounds());
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
      updateTotalAcres();
    });

    function updateTotalAcres() {
      if (!layers.length) return;
      const geo = layers[0].toGeoJSON();
      const acres = turf.area(geo) * 0.000247105;
      setDrawnPolygon(geo);
      setDrawnAcres(acres.toFixed(2));
    }
  }, [field, mapType]);

const handleSave = () => {
  if (!drawnPolygon || !drawnAcres) return;

  const updatedField = {
    ...field,
    drawnPolygon: drawnPolygon, // Keep it as object, don't stringify here
    drawnAcres: parseFloat(drawnAcres),
  };

  onSavePolygon(updatedField);
  onCloseModal();
};


  return (
    <div className="p-4">
      <div id="map" className="h-[600px] w-full rounded shadow" />
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
