// src/utils/generateStaticMapUrl.jsx
export function generateStaticMapUrl(centerLat, centerLng, zoom, apiKey) {
  const baseUrl = "https://www.mapquestapi.com/staticmap/v5/map";
  const params = new URLSearchParams({
    key: apiKey,
    size: "794,596",
    type: "sat",
    center: `${centerLat},${centerLng}`,
    zoom: zoom,
  });

  return `${baseUrl}?${params.toString()}`;
}
