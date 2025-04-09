export function getFieldMetrics(fields = [], cropYear, acreType = 'gps', cropTypes = []) {
  const getAcres = (field) =>
    acreType === 'fsa' ? field.fsaAcres || 0 : field.gpsAcres || 0;

  const totalAcres = fields.reduce((sum, f) => sum + getAcres(f), 0);
  const totalFields = fields.length;

  const metrics = {
    totalFields,
    totalAcres,
    cropAcres: 0,
  };

  // Loop through all defined crops with metricKeys
  cropTypes.forEach((cropType) => {
    const { name, metricKey } = cropType;
    if (!name || !metricKey) return;

    const cropTotal = fields
      .filter((field) => field.crops?.[cropYear]?.crop === name)
      .reduce((sum, field) => sum + getAcres(field), 0);

    metrics[metricKey] = cropTotal;
    metrics[`${metricKey}Pct`] = totalAcres > 0 ? (cropTotal / totalAcres) * 100 : 0;

    metrics.cropAcres += cropTotal;
  });

  const unassigned = totalAcres - metrics.cropAcres;
  metrics.unassigned = unassigned;
  metrics.unassignedPct = totalAcres > 0 ? (unassigned / totalAcres) * 100 : 0;

  return metrics;
}
