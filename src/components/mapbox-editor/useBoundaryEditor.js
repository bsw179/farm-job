import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import * as turf from '@turf/turf';

export function useBoundaryEditor(fieldId, navigate) {
  const mapRef = useRef(null);
  const [field, setField] = useState(null);
  const [coordinates, setCoordinates] = useState([]);
  const [history, setHistory] = useState([]);
  const [drawMode, setDrawMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [mousePosition, setMousePosition] = useState(null);

  const updateCoordinates = (newCoords) => {
    setHistory((prev) => [...prev, coordinates]);
    setCoordinates(newCoords);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setCoordinates(prev);
    setHistory((prevHist) => prevHist.slice(0, -1));
  };

  const handleReset = () => {
    if (mapRef.current) {
      const map = mapRef.current;
      ['draw-line', 'ghost-line', 'draw-points', 'mid-points'].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      });
    }
    setCoordinates([]);
    setIsClosed(false);
    setDrawMode(false);
    setDeleteMode(false);
    setHistory([]);
  };

  const handleSave = async () => {
    if (coordinates.length < 3) return alert('Draw at least 3 points');
    const closedCoords = [...coordinates, coordinates[0]];
    const polygon = turf.polygon([closedCoords]);
    await updateDoc(doc(db, 'fields', fieldId), {
      boundary: {
        geojson: JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [closedCoords] }, properties: {} }),
        year: new Date().getFullYear(),
      },
      gpsAcres: parseFloat((turf.area(polygon) * 0.000247105).toFixed(1)),
    });
    navigate(`/fields/${fieldId}`);
  };

  const getAcres = () => {
    if (!isClosed || coordinates.length < 3) return '0.00';
    const closed = [...coordinates, coordinates[0]];
    const polygon = turf.polygon([closed]);
    return (turf.area(polygon) * 0.000247105).toFixed(2);
  };

  useEffect(() => {
    const fetchField = async () => {
      const ref = doc(db, 'fields', fieldId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setField(data);
        if (data.boundary?.geojson) {
          const geo = JSON.parse(data.boundary.geojson);
          if (geo.geometry?.coordinates?.[0]) {
            setCoordinates(geo.geometry.coordinates[0]);
            setIsClosed(true);
          }
        }
      }
    };
    fetchField();
  }, [fieldId]);

  return {
    mapRef,
    field,
    coordinates,
    drawMode,
    deleteMode,
    isClosed,
    mousePosition,
    setMousePosition,
    setDrawMode,
    setDeleteMode,
    updateCoordinates,
    handleUndo,
    handleReset,
    handleSave,
    getAcres,
    setIsClosed,
  };
}
