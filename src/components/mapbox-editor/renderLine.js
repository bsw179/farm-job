import * as turf from '@turf/turf';

export function renderLine(map, coordinates, mousePosition, isClosed, drawMode) {
  const sourceId = 'draw-line';
  const ghostId = 'ghost-line';

  [sourceId, ghostId].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  });

  if (coordinates.length < 1) return;

  const closedLine = turf.lineString([
    ...coordinates,
    isClosed ? coordinates[0] : mousePosition || coordinates[coordinates.length - 1],
  ]);

  map.addSource(sourceId, { type: 'geojson', data: closedLine });
  map.addLayer({
    id: sourceId,
    type: 'line',
    source: sourceId,
    paint: { 'line-color': '#2563eb', 'line-width': 3 },
  });

  if (!isClosed && drawMode && coordinates.length > 0 && mousePosition) {
    const ghostLine = turf.lineString([coordinates[coordinates.length - 1], mousePosition]);
    map.addSource(ghostId, { type: 'geojson', data: ghostLine });
    map.addLayer({
      id: ghostId,
      type: 'line',
      source: ghostId,
      paint: {
        'line-color': '#2563eb',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    });
  }
}
