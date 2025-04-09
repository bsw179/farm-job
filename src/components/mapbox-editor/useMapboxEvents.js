import { useEffect, useRef } from 'react';

export function useMapboxEvents({
  mapRef,
  coordinates,
  isClosed,
  drawMode,
  updateCoordinates,
  setMousePosition,
  setIsClosed,
  setDrawMode,
}) {
  const drawClickHandler = useRef(null);
  const dragIndexRef = useRef(null);

  useEffect(() => {
  const map = mapRef.current;
  if (!map || !map.getStyle) return;


    map.getCanvas().style.cursor = drawMode ? 'crosshair' : '';

    let animationFrame;
    const onMouseMove = (e) => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        setMousePosition([e.lngLat.lng, e.lngLat.lat]);
      });
    };

    map.on('mousemove', onMouseMove);

    if (drawClickHandler.current) {
      map.off('click', drawClickHandler.current);
    }

    if (drawMode && !isClosed) {
      drawClickHandler.current = (e) => {
        const lngLat = [e.lngLat.lng, e.lngLat.lat];
        if (coordinates.length >= 3) {
          const first = coordinates[0];
          const dist = Math.hypot(e.point.x - map.project(first).x, e.point.y - map.project(first).y);
          if (dist < 10) {
            updateCoordinates([...coordinates]);
            setIsClosed(true);
            setDrawMode(false);
            return;
          }
        }
        updateCoordinates([...coordinates, lngLat]);
      };
      map.on('click', drawClickHandler.current);
    }

    map.on('mousedown', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['draw-points'] });
      if (!features.length || drawMode) return;
      dragIndexRef.current = features[0].properties.index;

      const onMove = (moveEvt) => {
        const lngLat = [moveEvt.lngLat.lng, moveEvt.lngLat.lat];
        const updated = [...coordinates];
        updated[dragIndexRef.current] = lngLat;
        updateCoordinates(updated);
      };

      const onUp = () => {
        map.off('mousemove', onMove);
        map.off('mouseup', onUp);
        dragIndexRef.current = null;
      };

      map.on('mousemove', onMove);
      map.on('mouseup', onUp);
    });

    return () => {
      map.off('mousemove', onMouseMove);
    };
  }, [mapRef, drawMode, coordinates, isClosed]);
}
