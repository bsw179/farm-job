import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { centroid } from '@turf/turf';
import L from 'leaflet';

export default function MapLabelTester() {
  const mapRef = useRef();
  const [fields, setFields] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [labelFontSize, setLabelFontSize] = useState(12);

  useEffect(() => {
    const fetchFields = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFields(data.filter(f => f.boundary?.geojson));
    };
    fetchFields();
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

  return (
    <div className="relative flex items-center justify-center bg-gray-100 min-h-screen">
      <div
        id="map-export-area"
        className="relative bg-white border border-black shadow-xl"
        style={{ width: '794px', height: '1123px', paddingTop: '100px', transform: 'scale(0.75)', transformOrigin: 'top center' }}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[500px] text-center">
          <textarea
            value="Map Title"
            readOnly
            className="w-full text-[20pt] font-semibold text-center bg-white bg-opacity-90 rounded px-2 py-2 resize-none focus:outline-none focus:ring-0"
            style={{ height: '90px' }}
          />
        </div>

        <MapContainer
          center={[35.5, -91]}
          zoom={12}
          style={{ width: '94%', height: '80%', margin: '3% auto' }}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
          whenReady={(e) => {
            const map = e.target;
            map.on('dragstart', () => {
              map.scrollWheelZoom.disable();
              map.doubleClickZoom.disable();
              map.boxZoom.disable();
            });
            map.on('dragend', () => {
              map.scrollWheelZoom.enable();
              map.doubleClickZoom.enable();
              map.boxZoom.enable();
            });
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {fields.map((field) => {
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

            const labelIcon = L.divIcon({
              className: 'custom-label',
              html: `
                <div style="
                  background: white;
                  padding: 4px 8px;
                  border: 1px solid #333;
                  border-radius: 4px;
                  font-size: ${labelFontSize}px;
                  font-weight: bold;
                  text-align: center;
                  white-space: nowrap;
                ">
                  ${field.fieldName || '—'}<br />
                  <span style="font-size: 10px; font-weight: normal;">${(field.gpsAcres || 0).toFixed(1)} ac</span>
                </div>`
            });

            return (
              <React.Fragment key={field.id}>
                <Polygon
                  positions={coordsList}
                  pathOptions={{ fillColor: '#ccc', color: '#333' }}
                />
                <Marker position={[lat, lng]} icon={labelIcon} draggable={true} />
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
