export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export function getDisplayCrop(field, cropYear) {
  return field?.crops?.[cropYear]?.crop || 'No Crop';
}
