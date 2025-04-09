// src/components/Basemap.jsx
import React from 'react';
import { TileLayer } from 'react-leaflet';

export default function Basemap() {
  return (
    <TileLayer
      url="https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYnN3ZmFybWpvYjIwMjUiLCJhIjoiY205NjFlZjExMWYzZTJqb2NzYXVlcTRpNyJ9.jdzpMd9m0LOIg2ajC2yKgw"
      attribution="© Mapbox © OpenStreetMap"
      tileSize={256}
      zoomOffset={0}
    />
  );
}
