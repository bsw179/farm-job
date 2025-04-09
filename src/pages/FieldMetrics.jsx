// src/pages/FieldMetrics.jsx
import React, { useEffect, useState, useContext } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { CropYearContext } from '@/context/CropYearContext';
import { getFieldMetrics } from '@/utils/fieldMetrics';

export default function FieldMetrics() {
  const { cropYear } = useContext(CropYearContext);
  const [fields, setFields] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [acreType, setAcreType] = useState('fsa');
  
const [countySort, setCountySort] = useState({ column: 'crop', direction: 'asc' });
const [operatorSort, setOperatorSort] = useState({ column: 'operator', direction: 'asc' });
const [landownerSort, setLandownerSort] = useState({ column: 'landowner', direction: 'asc' });

const [countyFilter, setCountyFilter] = useState('');
const [operatorFilter, setOperatorFilter] = useState('');
const [cropFilter, setCropFilter] = useState('');

const [operatorNameFilter, setOperatorNameFilter] = useState('');
const [farmNumberFilter, setFarmNumberFilter] = useState('');
const [operatorCropFilter, setOperatorCropFilter] = useState('');

const [landownerNameFilter, setLandownerNameFilter] = useState('');
const [landownerFarmFilter, setLandownerFarmFilter] = useState('');
const [landownerCropFilter, setLandownerCropFilter] = useState('');



  useEffect(() => {
    const fetchFields = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFields(data);
    };
    fetchFields();
  }, []);

  useEffect(() => {
    const fetchCropTypes = async () => {
      const snapshot = await getDocs(collection(db, 'cropTypes'));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCropTypes(data);
    };
    fetchCropTypes();
  }, []);

  const resolveColor = (tailwindColor) => {
    const map = {
      'yellow-500': '#eab308',
      'orange-500': '#f97316',
      'red-500': '#ef4444',
      'green-600': '#16a34a',
      'gray-500': '#6b7280',
      'blue-600': '#2563eb',
      'purple-600': '#9333ea',
      'lime-500': '#84cc16',
    };
    return map[tailwindColor] || '#999999';
  };

  const metrics = getFieldMetrics(fields, cropYear, acreType, cropTypes);
  

  const formatAcres = (acres) => {
    if (acres == null || isNaN(acres)) return '—';
    return acreType === 'fsa' ? Number(acres).toFixed(2) : Math.round(acres);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Field Metrics" />

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
          <span>Summary ({acreType.toUpperCase()} Acres)</span>
          <button
            onClick={() => setAcreType(acreType === 'gps' ? 'fsa' : 'gps')}
            className="px-3 py-1 border rounded-full text-xs bg-white shadow hover:bg-blue-50 transition"
          >
            {acreType.toUpperCase()}
          </button>
        </div>

        <div className="text-base font-semibold text-blue-800">
          {metrics.totalFields} fields • {formatAcres(metrics.cropAcres)} crop ac • {formatAcres(metrics.totalAcres)} total ac
        </div>

        <div className="mt-3 text-xs text-gray-600">
          {/* Progress bar */}
          <div
            className="w-full h-3 rounded-full overflow-hidden bg-gray-200 mb-2 flex"
            style={{ position: 'relative' }}
          >
            {cropTypes
              .filter((crop) => crop.includeInSummary && crop.metricKey)
              .map((crop) => {
                const pct = metrics[`${crop.metricKey}Pct`] || 0;
                const color = resolveColor(crop.color);
                return (
                  <div
                    key={crop.name}
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: color,
                      minWidth: pct > 0 && pct < 1 ? '1px' : undefined,
                      flexShrink: 0,
                    }}
                  />
                );
              })}
          </div>

          {/* Breakdown rows */}
          {cropTypes
            .filter((crop) => crop.includeInSummary && crop.metricKey)
            .map((crop) => {
              const acres = metrics[crop.metricKey] || 0;
              const pct = metrics[`${crop.metricKey}Pct`] || 0;
              return (
                <div key={crop.name}>
                  {crop.icon} {crop.name} • {Math.round(acres)} ac • {pct.toFixed(1)}%
                </div>
              );
            })}
        </div>
      </Card>

<Card className="mb-4">
  <div className="flex items-center justify-between mb-2">
    <div className="text-sm text-gray-500">Raw FSA Acres by Crop (No Share Applied)</div>
    <div className="text-xs text-gray-400 italic">Click column to sort</div>
  </div>
  <table className="w-full text-sm text-left">
    <thead className="text-gray-600 border-b cursor-pointer select-none">
      <tr>
        <th
          className="py-1 pr-4"
          onClick={() =>
            setCountySort((prev) => ({
              column: 'crop',
              direction: prev.direction === 'asc' ? 'desc' : 'asc',
            }))
          }
        >
          Crop
        </th>
        <th
          className="py-1 text-right"
          onClick={() =>
            setCountySort((prev) => ({
              column: 'acres',
              direction: prev.direction === 'asc' ? 'desc' : 'asc',
            }))
          }
        >
          Total Acres
        </th>
      </tr>
    </thead>
    <tbody className="text-gray-800">
      {(() => {
        const cropTotals = {};
        fields.forEach((field) => {
          const cropInfo = field.crops?.[cropYear];
          if (!cropInfo || !cropInfo.crop || !field.fsaAcres) return;

          const crop = cropInfo.crop;
          if (!cropTotals[crop]) cropTotals[crop] = 0;
          cropTotals[crop] += field.fsaAcres;
        });

        const entries = Object.entries(cropTotals).map(([crop, acres]) => ({ crop, acres }));

        const sortDir = countySort.direction === 'asc' ? 1 : -1;
        if (countySort.column === 'crop') {
          entries.sort((a, b) => a.crop.localeCompare(b.crop) * sortDir);
        } else if (countySort.column === 'acres') {
          entries.sort((a, b) => (a.acres - b.acres) * sortDir);
        }

        const total = entries.reduce((sum, row) => sum + row.acres, 0);

        return (
          <>
            {entries.map(({ crop, acres }) => {
              const cropType = cropTypes.find((c) => c.name === crop);
              const icon = cropType?.icon || '❓';
              return (
                <tr key={crop} className="border-b">
                  <td className="py-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <span>{crop}</span>
                    </div>
                  </td>
                  <td className="py-1 text-right">
                    {isNaN(acres) ? '—' : acres.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            <tr className="font-bold border-t-2">
              <td className="py-1 pr-4 text-right">Total</td>
              <td className="py-1 text-right">{isNaN(total) ? '—' : total.toFixed(2)}</td>
            </tr>
          </>
        );
      })()}
    </tbody>
  </table>
</Card>

<details open className="mb-4">
  <summary className="bg-white border rounded-lg px-4 py-2 font-semibold text-sm text-blue-800 cursor-pointer">
    Crop by County
  </summary>
  <Card className="border-t-0 rounded-t-none">
    <div className="text-sm text-gray-500 mb-2">Crop by County (Operator Share × FSA Acres)</div>

    {/* Filter bar */}
    <div className="flex flex-wrap gap-3 items-center text-sm mb-3">
      <div>
        <label className="text-gray-600 mr-2">County</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setCountyFilter(e.target.value.toLowerCase())}
        />
      </div>
      <div>
        <label className="text-gray-600 mr-2">Operator</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setOperatorFilter(e.target.value.toLowerCase())}
        />
      </div>
      <div>
        <label className="text-gray-600 mr-2">Crop</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setCropFilter(e.target.value.toLowerCase())}
        />
      </div>
    </div>

    <table className="w-full text-sm text-left">
      <thead className="text-gray-600 border-b select-none">
        <tr>
          <th
            className="py-1 pr-4 cursor-pointer"
            onClick={() =>
              setCountySort({
                column: 'county',
                direction: countySort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            County
          </th>
          <th
            className="py-1 pr-4 cursor-pointer"
            onClick={() =>
              setCountySort({
                column: 'operator',
                direction: countySort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Operator
          </th>
          <th
            className="py-1 pr-4 cursor-pointer"
            onClick={() =>
              setCountySort({
                column: 'crop',
                direction: countySort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Crop
          </th>
          <th
            className="py-1 text-right cursor-pointer"
            onClick={() =>
              setCountySort({
                column: 'share',
                direction: countySort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Our Share (ac)
          </th>
        </tr>
      </thead>
      <tbody className="text-gray-800">
        {(() => {
          const rows = {};
          fields.forEach((field) => {
            const cropInfo = field.crops?.[cropYear];
            if (
              !cropInfo ||
              !cropInfo.crop ||
              !field.county ||
              !field.fsaAcres ||
              field.operatorRentShare == null
            )
              return;

            const crop =
              cropInfo.crop === 'Rice' && cropInfo.riceType
                ? `Rice - ${cropInfo.riceType}`
                : cropInfo.crop;

            const key = `${field.county}_${field.operator}_${crop}`;
            const share = field.fsaAcres * (field.operatorRentShare / 100);
            if (!rows[key])
              rows[key] = { county: field.county, operator: field.operator, crop, share: 0 };
            rows[key].share += share;
          });

          let filtered = Object.values(rows).filter((row) => {
            return (
              (!countyFilter || row.county.toLowerCase().includes(countyFilter)) &&
              (!operatorFilter || row.operator.toLowerCase().includes(operatorFilter)) &&
              (!cropFilter || row.crop.toLowerCase().includes(cropFilter))
            );
          });

          const sortDir = countySort.direction === 'asc' ? 1 : -1;
          filtered.sort((a, b) => {
            const col = countySort.column;
            const aVal = a[col];
            const bVal = b[col];
            if (typeof aVal === 'number') return (aVal - bVal) * sortDir;
            return String(aVal).localeCompare(String(bVal)) * sortDir;
          });

          const total = filtered.reduce((sum, r) => sum + r.share, 0);

          return (
            <>
              {filtered.map(({ county, operator, crop, share }) => {
                const cropType = cropTypes.find((c) => c.name === crop);
                const icon = cropType?.icon || '❓';

                return (
                  <tr key={`${county}_${operator}_${crop}`} className="border-b">
                    <td className="py-1 pr-4">{county}</td>
                    <td className="py-1 pr-4">{operator}</td>
                    <td className="py-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span>{crop}</span>
                      </div>
                    </td>
                    <td className="py-1 text-right">
                      {isNaN(share) ? '—' : share.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-semibold border-t">
                <td colSpan={3} className="py-1 pr-4 text-right">
                  Total
                </td>
                <td className="py-1 text-right">
                  {isNaN(total) ? '—' : total.toFixed(2)}
                </td>
              </tr>
            </>
          );
        })()}
      </tbody>
    </table>
  </Card>
</details>

<details open className="mb-4">
  <summary className="bg-white border rounded-lg px-4 py-2 font-semibold text-sm text-blue-800 cursor-pointer">
    Crop by Operator → FSA Farm Number
  </summary>
  <Card className="border-t-0 rounded-t-none">
    <div className="text-sm text-gray-500 mb-2">
      Crop by Operator → FSA Farm Number (Operator Share × FSA Acres)
    </div>

    {/* Filter bar */}
    <div className="flex flex-wrap gap-3 items-center text-sm mb-3">
      <div>
        <label className="text-gray-600 mr-2">Operator</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setOperatorNameFilter(e.target.value.toLowerCase())}
        />
      </div>
      <div>
        <label className="text-gray-600 mr-2">FSA Farm #</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setFarmNumberFilter(e.target.value.toLowerCase())}
        />
      </div>
      <div>
        <label className="text-gray-600 mr-2">Crop</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setOperatorCropFilter(e.target.value.toLowerCase())}
        />
      </div>
    </div>

    <table className="w-full text-sm text-left">
      <thead className="text-gray-600 border-b select-none">
        <tr>
          <th
            className="py-1 pr-4 cursor-pointer"
            onClick={() =>
              setOperatorSort({
                column: 'operator',
                direction: operatorSort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Operator
          </th>
          <th
            className="py-1 pr-4 cursor-pointer"
            onClick={() =>
              setOperatorSort({
                column: 'farmNumber',
                direction: operatorSort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            FSA Farm #
          </th>
          <th
            className="py-1 pr-4 cursor-pointer"
            onClick={() =>
              setOperatorSort({
                column: 'crop',
                direction: operatorSort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Crop
          </th>
          <th
            className="py-1 text-right cursor-pointer"
            onClick={() =>
              setOperatorSort({
                column: 'share',
                direction: operatorSort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Our Share (ac)
          </th>
        </tr>
      </thead>
      <tbody className="text-gray-800">
        {(() => {
          const rows = {};
          fields.forEach((field) => {
            const cropInfo = field.crops?.[cropYear];
            if (
              !cropInfo ||
              !cropInfo.crop ||
              !field.operator ||
              !field.fsaAcres ||
              field.operatorRentShare == null
            )
              return;

            const crop = cropInfo.crop;
            const key = `${field.operator}_${field.farmNumber}_${crop}`;
            const share = field.fsaAcres * (field.operatorRentShare / 100);
            if (!rows[key]) {
              rows[key] = {
                operator: field.operator,
                farmNumber: field.farmNumber,
                crop,
                share: 0,
              };
            }
            rows[key].share += share;
          });

          let filtered = Object.values(rows).filter((row) => {
            return (
              (!operatorNameFilter || row.operator.toLowerCase().includes(operatorNameFilter)) &&
              (!farmNumberFilter || String(row.farmNumber).toLowerCase().includes(farmNumberFilter)) &&
              (!operatorCropFilter || row.crop.toLowerCase().includes(operatorCropFilter))
            );
          });

          const sortDir = operatorSort.direction === 'asc' ? 1 : -1;
          filtered.sort((a, b) => {
            const col = operatorSort.column;
            const aVal = a[col];
            const bVal = b[col];
            if (typeof aVal === 'number') return (aVal - bVal) * sortDir;
            return String(aVal).localeCompare(String(bVal)) * sortDir;
          });

          const total = filtered.reduce((sum, r) => sum + r.share, 0);

          return (
            <>
              {filtered.map(({ operator, farmNumber, crop, share }) => {
                const cropType = cropTypes.find((c) => c.name === crop);
                const icon = cropType?.icon || '❓';

                return (
                  <tr key={`${operator}_${farmNumber}_${crop}`} className="border-b">
                    <td className="py-1 pr-4">{operator}</td>
                    <td className="py-1 pr-4">{farmNumber}</td>
                    <td className="py-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span>{crop}</span>
                      </div>
                    </td>
                    <td className="py-1 text-right">
                      {isNaN(share) ? '—' : share.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-semibold border-t">
                <td colSpan={3} className="py-1 pr-4 text-right">
                  Total
                </td>
                <td className="py-1 text-right">{isNaN(total) ? '—' : total.toFixed(2)}</td>
              </tr>
            </>
          );
        })()}
      </tbody>
    </table>
  </Card>
</details>

<details open className="mb-4">
  <summary className="bg-white border rounded-lg px-4 py-2 font-semibold text-sm text-blue-800 cursor-pointer">
    Crop by Landowner → FSA Farm Number
  </summary>
  <Card className="border-t-0 rounded-t-none">
    <div className="text-sm text-gray-500 mb-2">
      Crop by Landowner → FSA Farm Number (Landowner Share × FSA Acres)
    </div>

    {/* Filter bar */}
    <div className="flex flex-wrap gap-3 items-center text-sm mb-3">
      <div>
        <label className="text-gray-600 mr-2">Landowner</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setLandownerNameFilter(e.target.value.toLowerCase())}
        />
      </div>
      <div>
        <label className="text-gray-600 mr-2">FSA Farm #</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setLandownerFarmFilter(e.target.value.toLowerCase())}
        />
      </div>
      <div>
        <label className="text-gray-600 mr-2">Crop</label>
        <input
          type="text"
          placeholder="Any"
          className="px-2 py-1 border rounded"
          onChange={(e) => setLandownerCropFilter(e.target.value.toLowerCase())}
        />
      </div>
    </div>

    <table className="w-full text-sm text-left">
      <thead className="text-gray-600 border-b select-none">
        <tr>
          <th
            className="py-1 pr-4 cursor-pointer"
            onClick={() =>
              setLandownerSort({
                column: 'landowner',
                direction: landownerSort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Landowner
          </th>
          <th className="py-1 pr-4">FSA Farm #</th>
          <th className="py-1 pr-4">Crop</th>
          <th
            className="py-1 text-right cursor-pointer"
            onClick={() =>
              setLandownerSort({
                column: 'share',
                direction: landownerSort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Landowner Share (ac)
          </th>
        </tr>
      </thead>
      <tbody className="text-gray-800">
        {(() => {
          const rows = {};
          fields.forEach((field) => {
            const cropInfo = field.crops?.[cropYear];
            if (
              !cropInfo ||
              !cropInfo.crop ||
              !field.landowner ||
              !field.farmNumber ||
              !field.fsaAcres ||
              field.landownerRentShare == null
            )
              return;

            const crop =
              cropInfo.crop === 'Rice' && cropInfo.riceType
                ? `Rice - ${cropInfo.riceType}`
                : cropInfo.crop;

            const key = `${field.landowner}_${field.farmNumber}_${crop}`;
            const share = field.fsaAcres * (field.landownerRentShare / 100);
            if (!rows[key]) {
              rows[key] = {
                landowner: field.landowner,
                farmNumber: field.farmNumber,
                crop,
                share: 0,
              };
            }
            rows[key].share += share;
          });

          const filtered = Object.values(rows).filter((row) => {
            return (
              (!landownerNameFilter || row.landowner.toLowerCase().includes(landownerNameFilter)) &&
              (!landownerFarmFilter || row.farmNumber.toLowerCase().includes(landownerFarmFilter)) &&
              (!landownerCropFilter || row.crop.toLowerCase().includes(landownerCropFilter))
            );
          });

          const sortDir = landownerSort.direction === 'asc' ? 1 : -1;
          filtered.sort((a, b) => {
            const col = landownerSort.column;
            const aVal = a[col];
            const bVal = b[col];
            if (typeof aVal === 'number') return (aVal - bVal) * sortDir;
            return String(aVal).localeCompare(String(bVal)) * sortDir;
          });

          const total = filtered.reduce((sum, r) => sum + r.share, 0);

          return (
            <>
              {filtered.map(({ landowner, farmNumber, crop, share }) => {
                const cropType = cropTypes.find((c) => c.name === crop);
                const icon = cropType?.icon || '❓';

                return (
                  <tr key={`${landowner}_${farmNumber}_${crop}`} className="border-b">
                    <td className="py-1 pr-4">{landowner}</td>
                    <td className="py-1 pr-4">{farmNumber}</td>
                    <td className="py-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span>{crop}</span>
                      </div>
                    </td>
                    <td className="py-1 text-right">{share.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold border-t">
                <td colSpan={3} className="py-1 pr-4 text-right">
                  Total
                </td>
                <td className="py-1 text-right">{total.toFixed(2)}</td>
              </tr>
            </>
          );
        })()}
      </tbody>
    </table>
  </Card>
</details>

    </div>
  );
}

