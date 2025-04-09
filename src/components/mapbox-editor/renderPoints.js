import * as turf from '@turf/turf';

export function renderPoints(map, coordinates, isClosed, deleteMode, updateCoordinates) {
  const fullId = 'draw-points';
  const midId = 'mid-points';

  [fullId, midId].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  });

  const fullPoints = coordinates.map((coord, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coord },
    properties: { index: i },
  }));

  const midPoints = [];
  if (isClosed) {
    for (let i = 0; i < coordinates.length; i++) {
      const start = coordinates[i];
      const end = coordinates[(i + 1) % coordinates.length];
      const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
      midPoints.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: mid },
        properties: { insertIndex: i + 1 },
      });
    }
  }

  map.addSource(fullId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: fullPoints },
  });

  map.addLayer({
    id: fullId,
    type: 'circle',
    source: fullId,
    paint: {
      'circle-radius': 6,
      'circle-color': '#2563eb',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  });

  if (isClosed) {
    map.addSource(midId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: midPoints },
    });

    map.addLayer({
      id: midId,
      type: 'circle',
      source: midId,
      paint: {
        'circle-radius': 4,
        'circle-color': '#fff',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#2563eb',
      },
    });

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [midId] });
      if (features.length) {
        const index = features[0].properties.insertIndex;
        const lngLat = features[0].geometry.coordinates;
        const updated = [...coordinates];
        updated.splice(index, 0, lngLat);

        const closed = [...updated, updated[0]];
        const polygon = turf.polygon([closed]);
        if (turf.kinks(polygon).features.length > 0) return alert('That insert would cross lines.');

        updateCoordinates(updated);
      }
    });
  }

  map.on('contextmenu', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: [fullId] });
    if (features.length && isClosed && deleteMode) {
      const index = features[0].properties.index;
      if (coordinates.length <= 3) return alert('Need at least 3 points.');
      const updated = [...coordinates];
      updated.splice(index, 1);

      const closed = [...updated, updated[0]];
      const polygon = turf.polygon([closed]);
      if (turf.kinks(polygon).features.length > 0) return alert('That delete would cross lines.');

      updateCoordinates(updated);
    }
  });
}
