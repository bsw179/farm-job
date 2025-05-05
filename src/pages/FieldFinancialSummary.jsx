// FieldFinancialSummary.jsx — partner splits per column, filtered zero shares
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCropYear } from '../context/CropYearContext';

export default function FieldFinancialSummary() {
  const { cropYear } = useCropYear();

  const [fields, setFields] = useState({});
  const [jobsByField, setJobsByField] = useState([]);
  const [products, setProducts] = useState({});
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [fieldSnap, jobSnap, prodSnap, purchaseSnap] = await Promise.all([
        getDocs(collection(db, 'fields')),
        getDocs(collection(db, 'jobsByField')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'inputPurchases')),
      ]);

      const fieldMap = {};
      fieldSnap.docs.forEach(doc => fieldMap[doc.id] = { id: doc.id, ...doc.data() });

      const jobList = jobSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const prodMap = {};
      prodSnap.docs.forEach(doc => prodMap[doc.id] = { id: doc.id, ...doc.data() });

      const purchaseList = purchaseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setFields(fieldMap);
      setJobsByField(jobList);
      setProducts(prodMap);
      setPurchases(purchaseList);
    };

    fetchAll();
  }, [cropYear]);

  const fieldEntries = Object.entries(fields).filter(([id, f]) =>
    f.crops?.[cropYear] || f.crop
  );

  const getUnitCost = (productId) => {
    const matching = purchases.filter(p => p.productId === productId);
    if (matching.length === 0) return 0;

    const totalAmount = matching.reduce((sum, p) => sum + ((p.amount || 0) * (p.unitSize || 1)), 0);
    const totalCost = matching.reduce((sum, p) => sum + (p.cost || 0), 0);

    return totalAmount > 0 ? totalCost / totalAmount : 0;
  };

  const getCosts = (fieldId) => {
    let seedCost = 0;
    let fertCost = 0;
    let chemCost = 0;
    let totalCost = 0;
    let splits = {};

    const jobs = jobsByField.filter(j => j.fieldId === fieldId && String(j.cropYear) === String(cropYear));

    jobs.forEach(job => {
      const acres = job.drawnAcres ?? job.acres ?? 0;
      const split = job.expenseSplit || {};
      const op = split.operator;
      const lo = split.landowner;
      const opShare = split.operatorShare ?? 100;
      const loShare = split.landownerShare ?? 0;

      (job.products || []).forEach(p => {
        const rate = parseFloat(p.rate);
        if (!p.productId || isNaN(rate)) return;
        const product = products[p.productId];
        const unitCost = getUnitCost(p.productId);
        const type = (product?.type || '').toLowerCase();

        if (!unitCost || unitCost === 0) return;

        const applied = acres * rate;
        const cost = applied * unitCost;

        if (type === 'seed' || type === 'seed treatment') seedCost += cost;
        else if (type === 'fertilizer') fertCost += cost;
        else if (type === 'chemical') chemCost += cost;

        totalCost += cost;

        if (op && opShare > 0) {
          if (!splits[op]) splits[op] = { seed: 0, fert: 0, chem: 0, total: 0 };
          if (type === 'seed' || type === 'seed treatment') splits[op].seed += cost * (opShare / 100);
          else if (type === 'fertilizer') splits[op].fert += cost * (opShare / 100);
          else if (type === 'chemical') splits[op].chem += cost * (opShare / 100);
          splits[op].total += cost * (opShare / 100);
        }
        if (lo && loShare > 0) {
          if (!splits[lo]) splits[lo] = { seed: 0, fert: 0, chem: 0, total: 0 };
          if (type === 'seed' || type === 'seed treatment') splits[lo].seed += cost * (loShare / 100);
          else if (type === 'fertilizer') splits[lo].fert += cost * (loShare / 100);
          else if (type === 'chemical') splits[lo].chem += cost * (loShare / 100);
          splits[lo].total += cost * (loShare / 100);
        }
      });
    });

    return {
      seedCost,
      fertCost,
      chemCost,
      totalCost,
      splits
    };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">💰 Field Financial Summary – {cropYear}</h1>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Field</th>
            <th className="border px-2 py-1 text-left">Crop</th>
            <th className="border px-2 py-1 text-right">Seed Cost</th>
            <th className="border px-2 py-1 text-right">Fert Cost</th>
            <th className="border px-2 py-1 text-right">Chem Cost</th>
            <th className="border px-2 py-1 text-right">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {fieldEntries.map(([id, field]) => {
            const crop = field.crops?.[cropYear]?.crop || field.crop || '';
            const { seedCost, fertCost, chemCost, totalCost, splits } = getCosts(id);

            return (
              <React.Fragment key={id}>
                <tr className="hover:bg-gray-50">
                  <td className="border px-2 py-1 font-medium">{field.fieldName}</td>
                  <td className="border px-2 py-1">{crop}</td>
                  <td className="border px-2 py-1 text-right">${seedCost.toFixed(2)}</td>
                  <td className="border px-2 py-1 text-right">${fertCost.toFixed(2)}</td>
                  <td className="border px-2 py-1 text-right">${chemCost.toFixed(2)}</td>
                  <td className="border px-2 py-1 text-right font-semibold">${totalCost.toFixed(2)}</td>
                </tr>
                {Object.entries(splits).map(([name, amt]) => (
                  amt.total > 0 && (
                    <tr key={id + '-' + name}>
                      <td colSpan={6} className="border px-4 py-1 text-xs text-gray-600 italic">
                        {name}: Seed ${amt.seed.toFixed(2)} • Fert ${amt.fert.toFixed(2)} • Chem ${amt.chem.toFixed(2)} • Total ${amt.total.toFixed(2)}
                      </td>
                    </tr>
                  )
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
