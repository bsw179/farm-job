import React, { useEffect, useState, useContext } from 'react';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CropYearContext } from '@/context/CropYearContext';
import { getFieldMetrics } from '@/utils/fieldMetrics';
import { getDisplayCrop } from '@/lib/utils';
import { collection, getDocs } from 'firebase/firestore';
import { query, where } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { CloudRain } from 'lucide-react';

export default function Fields() {
  const { cropYear } = useContext(CropYearContext);
  const [fields, setFields] = useState([]);
  const [expandedFarms, setExpandedFarms] = useState({});
  const [search, setSearch] = useState(localStorage.getItem('fieldsSearch') || '');
  const [sortOption, setSortOption] = useState(localStorage.getItem('fieldsSort') || 'name-asc');
  const [filterCrop, setFilterCrop] = useState(localStorage.getItem('fieldsFilter') || 'All');
  const navigate = useNavigate();
  const [cropTypes, setCropTypes] = useState([]);
const [rain24Data, setRain24Data] = useState({});

const getRainBadgeColor = (inches) => {
  if (inches >= 1.0) return 'bg-red-100 text-red-700';
  if (inches >= 0.5) return 'bg-yellow-100 text-yellow-700';
  if (inches > 0) return 'bg-sky-100 text-sky-700';
  return 'bg-gray-100 text-gray-500';
};

  useEffect(() => {
    const stored = localStorage.getItem('fieldsExpanded');
    if (stored) setExpandedFarms(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const fetchCropTypes = async () => {
      const snapshot = await getDocs(collection(db, 'cropTypes'));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCropTypes(data);
    };

    fetchCropTypes();
  }, []);

  useEffect(() => {
    const fetchFields = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFields(data);
    };
    fetchFields();
  }, []);
useEffect(() => {
  const loadRain24 = async () => {
    const dayAgo = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    const q = query(collection(db, 'rainfallLogs'), where('date', '==', dayAgo));
    const snap = await getDocs(q);
    const data = {};

    snap.docs.forEach(doc => {
      const log = doc.data();
      data[log.fieldId] = (data[log.fieldId] || 0) + (log.inches || 0);
    });

    setRain24Data(data);
  };

  loadRain24();
}, []);

  useEffect(() => {
    localStorage.setItem('fieldsSearch', search);
  }, [search]);

  useEffect(() => {
    localStorage.setItem('fieldsSort', sortOption);
  }, [sortOption]);

  useEffect(() => {
    localStorage.setItem('fieldsFilter', filterCrop);
  }, [filterCrop]);

  const getCropIcon = (cropName) => {
    const found = cropTypes.find((c) => c.name === cropName);
    return found?.icon || '⬜';
  };

  const getCropColor = (cropName) => {
    const found = cropTypes.find((c) => c.name === cropName);
    return found?.color || '#999999'; // fallback gray
  };

  const grouped = fields.reduce((acc, field) => {
    const farm = field.farmName || 'Unassigned';
    if (!acc[farm]) acc[farm] = [];
    acc[farm].push(field);
    return acc;
  }, {});

  const sortedFarms = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  const sortFields = (a, b) => {
    if (sortOption === 'name-asc') return a.fieldName.localeCompare(b.fieldName);
    if (sortOption === 'name-desc') return b.fieldName.localeCompare(a.fieldName);
    if (sortOption === 'acres-desc') return (b.gpsAcres || 0) - (a.gpsAcres || 0);
    if (sortOption === 'acres-asc') return (a.gpsAcres || 0) - (b.gpsAcres || 0);
    return 0;
  };

  const filterByCrop = (field) => {
    const crop = field.crops?.[cropYear]?.crop;
    if (filterCrop === 'All') return true;
    return crop === filterCrop;
  };

  const resetFilters = () => {
    setSearch('');
    setSortOption('name-asc');
    setFilterCrop('All');
    localStorage.removeItem('fieldsSearch');
    localStorage.removeItem('fieldsSort');
    localStorage.removeItem('fieldsFilter');
    localStorage.removeItem('fieldsExpanded');
  };

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

  const metrics = getFieldMetrics(fields, cropYear, 'gps', cropTypes);

  const renderMiniPreview = (field) => {
    const raw = field.boundary?.geojson;
    const cropName = field.crops?.[cropYear]?.crop;

    const getCropColor = (name) => {
      const found = cropTypes.find((c) => c.name === name);
      return found?.color || 'gray-500';
    };

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

    const fillColor = resolveColor(getCropColor(cropName));

    if (!raw) {
      return (
        <div className="text-xs text-blue-600 underline" onClick={(e) => {
          e.stopPropagation();
          navigate(`/fields/${field.id}/boundary-editor`);
        }}>
          ➕ Add Boundary
        </div>
      );
    }

    let geo = raw;
    try {
      if (typeof raw === 'string') geo = JSON.parse(raw);
      if (geo.type === 'Feature') geo = geo.geometry;
    } catch {
      return null;
    }

    if (!geo || geo.type !== 'Polygon') return null;

    const coords = geo.coordinates[0];
    const bounds = coords.reduce((acc, [lng, lat]) => ({
      minX: Math.min(acc.minX, lng),
      maxX: Math.max(acc.maxX, lng),
      minY: Math.min(acc.minY, lat),
      maxY: Math.max(acc.maxY, lat)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const padding = 4;
    const scale = Math.min((60 - padding * 2) / width, (60 - padding * 2) / height);

    const path = coords.map(([lng, lat], i) => {
      const x = (lng - bounds.minX) * scale + padding;
      const y = 60 - ((lat - bounds.minY) * scale + padding);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';

    return (
      <svg viewBox="0 0 60 60" className="w-12 h-12 border rounded-sm bg-white">
        <path d={path} fill={fillColor} stroke="#1e40af" strokeWidth="1" />
      </svg>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="mb-4">
        <div className="text-sm text-gray-500">Summary</div>
        <div className="text-base font-semibold text-blue-800">
          {metrics.totalFields} fields • {metrics.cropAcres.toFixed(0)} crop ac • {metrics.totalAcres.toFixed(0)} total ac
        </div>
        <div className="mt-3 text-xs text-gray-600">
          <div className="w-full h-3 rounded-full overflow-hidden bg-gray-200 mb-2 flex">
            {cropTypes
              .filter((crop) => crop.includeInSummary && crop.metricKey)
              .map((crop) => {
                const pct = metrics[`${crop.metricKey}Pct`] || 0;
                return (
                  <div
                    key={crop.name}
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: resolveColor(crop.color),
                    }}
                  />
                );
              })}
          </div>

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

      <PageHeader
        title="Fields"
        actions={<Button onClick={() => navigate('/fields/new')}>+ Add Field</Button>}
      />

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border rounded-md text-sm"
        />

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="name-asc">Sort: Name (A-Z)</option>
          <option value="name-desc">Sort: Name (Z-A)</option>
          <option value="acres-desc">Sort: Acres (High to Low)</option>
          <option value="acres-asc">Sort: Acres (Low to High)</option>
        </select>

        <select
          value={filterCrop}
          onChange={(e) => setFilterCrop(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="All">All Crops</option>
          <option value="Soybeans">Only Soybeans</option>
          <option value="Rice">Only Rice</option>
          <option value="Fallow">Only Fallow</option>
        </select>

        <Button variant="outline" onClick={resetFilters}>
          Reset Filters
        </Button>
      </div>

      <div className="space-y-4">
        {sortedFarms.map(([farmName, farmFields]) => {
          const isOpen = expandedFarms[farmName];
          const toggle = () => {
            const updated = { ...expandedFarms, [farmName]: !expandedFarms[farmName] };
            setExpandedFarms(updated);
            localStorage.setItem('fieldsExpanded', JSON.stringify(updated));
          };

          const filteredFields = farmFields
            .filter((field) => field.fieldName.toLowerCase().includes(search.toLowerCase()))
            .filter(filterByCrop)
            .sort(sortFields);

          const totalAcres = filteredFields.reduce((sum, f) => sum + (f.gpsAcres || 0), 0);

          return (
            <Card key={farmName} className="p-0">
              <button
                onClick={toggle}
                className="w-full px-4 py-3 flex justify-between items-center text-left text-blue-800 font-bold"
              >
                <span>
                  {farmName} • {filteredFields.length} fields • {Math.round(totalAcres)} acres
                </span>
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {isOpen && (
                <div className="divide-y">
                  {filteredFields.map((field) => {
                    const crop = getDisplayCrop(field, cropYear);
                    const icon = getCropIcon(crop);

                    return (
                      <div
                        key={field.id}
                        onClick={() => navigate(`/fields/${field.id}`)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                         <div className="font-medium text-sm text-gray-800">
  {field.fieldName}
  <div className="flex items-center gap-2 mt-0.5">
    <span>{icon} {crop}</span>
  </div>
  {rain24Data[field.id] !== undefined && (
    <div className="mt-1">
      <Link
        to="/rainfall"
        title="View rainfall log"
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full w-fit
          ${getRainBadgeColor(rain24Data[field.id])}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <CloudRain className="w-3 h-3" />
        {rain24Data[field.id].toFixed(2)} in
      </Link>
    </div>
  )}
</div>


                          {renderMiniPreview(field)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}