import React, { useState } from 'react';

export default function ReportControls({
  title = '',
  onExport,
  sortOptions = [],
  filters = [],
  onFilterChange,
  selectedSort,
  onSortChange
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [localFilters, setLocalFilters] = useState({});
  const [sort, setSort] = useState('az');


  const applyFilters = () => {
    onFilterChange?.(localFilters);
    setShowFilterModal(false);
  };

  const handleExportClick = (format) => {
    if (onExport) onExport(format);
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">{title}</h2>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
       

          {/* Sort Dropdown */}
          {sortOptions.length > 0 && (
            <select
              value={selectedSort}
              onChange={e => onSortChange?.(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-white"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {/* Filter Button */}
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilterModal(true)}
              className="border rounded px-3 py-1 text-sm bg-white"
            >
              ⚙️ Filters
            </button>
          )}

          {/* Export Dropdown */}
          {onExport && (
            <div className="relative group">
              <button className="bg-blue-600 text-white rounded px-3 py-1 text-sm shadow-sm">
                Export ⏷
              </button>
              <div className="absolute hidden group-hover:block right-0 mt-1 bg-white border rounded shadow-sm z-10 text-sm">
                <button onClick={() => handleExportClick('pdf')} className="block px-4 py-2 w-full text-left hover:bg-gray-100">PDF</button>
                <button onClick={() => handleExportClick('csv')} className="block px-4 py-2 w-full text-left hover:bg-gray-100">CSV</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg relative">
            <button
              onClick={() => setShowFilterModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-4">Filters</h3>

            <div className="space-y-4">
              {filters.map(filter => (
                <div key={filter.key}>
                  <label className="block text-sm font-medium mb-1">{filter.label}</label>

                  {filter.type === 'select' && (
                    <select
                      className="border rounded w-full p-2"
                      value={localFilters[filter.key] || ''}
                      onChange={e =>
                        setLocalFilters(prev => ({ ...prev, [filter.key]: e.target.value }))
                      }
                    >
                      <option value="">All</option>
                      {filter.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {filter.type === 'text' && (
                    <input
                      type="text"
                      className="border rounded w-full p-2"
                      value={localFilters[filter.key] || ''}
                      onChange={e =>
                        setLocalFilters(prev => ({ ...prev, [filter.key]: e.target.value }))
                      }
                    />
                  )}

                  {filter.type === 'date-range' && (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        className="border rounded w-full p-2"
                        value={localFilters[`${filter.key}Start`] || ''}
                        onChange={e =>
                          setLocalFilters(prev => ({ ...prev, [`${filter.key}Start`]: e.target.value }))
                        }
                      />
                      <input
                        type="date"
                        className="border rounded w-full p-2"
                        value={localFilters[`${filter.key}End`] || ''}
                        onChange={e =>
                          setLocalFilters(prev => ({ ...prev, [`${filter.key}End`]: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                className="text-red-500"
                onClick={() => setLocalFilters({})}
              >
                Clear
              </button>

              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={applyFilters}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
