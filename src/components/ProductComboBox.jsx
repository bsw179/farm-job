import React, { useMemo, useState } from 'react';

function ProductComboBox({ value, onChange, productType, allProducts = [], usedProductIds = [] }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
  const filteredProducts = allProducts
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()))
.filter(p => {
  if (!productType) return true;
  if (productType === 'Seeding') return p.type === 'Seed';
  if (productType === 'Spraying') return p.type === 'Chemical';
  if (productType === 'Fertilizing') return p.type === 'Fertilizer';
  return true;
})
    .sort((a, b) => a.name.localeCompare(b.name));

  const used = filteredProducts.filter(p => usedProductIds.includes(p.id));
  const others = filteredProducts.filter(p => !usedProductIds.includes(p.id));

  return { used, others };
}, [allProducts, productType, usedProductIds, search]);

// ✅ Add this line!
const { used, others } = filtered;


  return (
    <div className="relative">
      <input
        
  type="text"
  value={search || (value?.name ?? '')}

        onChange={e => setSearch(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Search products..."
        className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow max-h-60 overflow-y-auto w-full">
       {used.length > 0 && (
  <div>
    <div className="px-3 pt-2 text-xs font-semibold text-gray-500">Products You've Used</div>
    {used.map(prod => (
      <div
        key={prod.id}
        className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
        onClick={() => {
          setSearch('');
          setIsOpen(false);
          onChange(prod);
        }}
      >
        {prod.name}
      </div>
    ))}
  </div>
)}

          {others.length > 0 && (
  <div>
    <div className="px-3 pt-2 text-xs font-semibold text-gray-500">Other Products</div>
    {others.map(prod => (
      <div
        key={prod.id}
        className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
        onClick={() => {
          setSearch('');
          setIsOpen(false);
          onChange(prod);
        }}
      >
        {prod.name}
      </div>
    ))}
  </div>
)}

          <div className="border-t text-blue-600 hover:text-blue-800 px-3 py-2 text-sm cursor-pointer">
            + Create Product
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductComboBox;
