export function calculateFieldCosts(fieldId, cropYear, jobsByField, products, purchases) {
  const costs = {
    seedCost: 0,
    fertCost: 0,
    chemCost: 0,
    totalCost: 0,
  };

  const jobs = jobsByField.filter(j => j.fieldId === fieldId && j.cropYear === cropYear && j.status !== 'Planned');

  for (const job of jobs) {
    const jobProducts = job.products || [];

    for (const p of jobProducts) {
      const product = products[p.productId];
      if (!product) continue;

      const rate = parseFloat(p.rate) || 0;
      const acres = parseFloat(job.acres) || 0;
      const appliedAmount = rate * acres;

      // Get average $/unit for this product from purchases
      const relevantPurchases = purchases.filter(pu => pu.productId === p.productId && pu.cropYear === cropYear);
      let avgRate = null;

if (relevantPurchases.length > 0) {
  const unitGroups = {};

  for (const pu of relevantPurchases) {
    const unit = (pu.unit || '').toLowerCase();
    const type = (product.type || '').toLowerCase();

    let normalizedAmount = pu.amount || 0;

    if (unit === 'gallon') normalizedAmount *= 128;
    else if (unit === 'quart') normalizedAmount *= 32;
    else if (unit === 'pint') normalizedAmount *= 16;
    else if (unit === 'lb' && type === 'chemical') normalizedAmount *= 16;

    if (!unitGroups[unit]) {
      unitGroups[unit] = { totalAmount: 0, totalCost: 0 };
    }

    unitGroups[unit].totalAmount += normalizedAmount;
    unitGroups[unit].totalCost += pu.cost || 0;
  }

  const [unit, { totalAmount, totalCost }] = Object.entries(unitGroups)[0] || [];
  if (totalAmount > 0) {
    avgRate = totalCost / totalAmount;
  }
}


      if (!avgRate) continue;

      const cost = appliedAmount * avgRate;

      // Group into seed, fertilizer, or chemical
      const type = (product.type || '').toLowerCase();
      const chemSub = (product.chemicalType || '').toLowerCase();

      if (type === 'seed') {
        costs.seedCost += cost;
      } else if (type === 'fertilizer') {
        costs.fertCost += cost;
      } else if (type === 'chemical') {
        costs.chemCost += cost; // All chem subtypes go here for now
      }
    }
  }
// 🔹 Add seed treatment costs (linked via linkedProductId)
const treatmentPurchases = purchases.filter(
  p => (p.type || '').toLowerCase() === 'seed treatment' && p.linkedProductId && p.cropYear === cropYear
);

for (const purchase of treatmentPurchases) {
  const seedProductId = purchase.linkedProductId;
  const treatmentCost = purchase.cost || 0;

  // Find matching jobs for this field, year, and seed
  const matchingJobs = jobsByField.filter(j =>
    j.fieldId === fieldId &&
    j.cropYear === cropYear &&
    j.status !== 'Planned' &&
    j.products?.some(p => p.productId === seedProductId && p.treated)
  );

  if (matchingJobs.length === 0) continue;

  const totalTreatedAcres = matchingJobs.reduce((sum, job) => {
    const acres = parseFloat(job.acres) || 0;
    return sum + acres;
  }, 0);

  if (totalTreatedAcres === 0) continue;

  const costPerAcre = treatmentCost / totalTreatedAcres;

  for (const job of matchingJobs) {
    const acres = parseFloat(job.acres) || 0;
    costs.seedCost += acres * costPerAcre;
  }
}

  costs.totalCost = costs.seedCost + costs.fertCost + costs.chemCost;
  return costs;
}
