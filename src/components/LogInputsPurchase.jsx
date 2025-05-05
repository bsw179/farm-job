import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import Select from 'react-select';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

const inferUnitOptions = (unit, rateType, productType) => {
  if (!unit && !rateType && !productType) return [];
  const lower = unit?.toLowerCase() || '';
  if (productType === 'Seed') {
    if (rateType === 'Population') return ['seeds', 'units'];
    if (rateType === 'Weight') return ['lbs', 'units', 'bushels'];
  }
  if (productType === 'Fertilizer') return ['lbs', 'tons'];
  if (productType === 'Chemical') {
    if (lower.includes('fl oz') || lower.includes('pt') || lower.includes('qt') || lower.includes('gal')) return ['fl oz', 'pt', 'qt', 'gal'];
    if (lower.includes('oz dry')) return ['oz', 'lbs'];
    if (lower.includes('%v/v')) return ['%v/v', 'fl oz', 'pt', 'qt', 'gal'];
  }
  return lower ? [lower] : [];
};

const getDefaultUnitSize = (unit, productType, rateType, crop) => {
  if (productType === 'Chemical') {
    switch (unit) {
      case 'gal': return 128;
      case 'qt': return 32;
      case 'pt': return 16;
      case 'fl oz': return 1;
      case 'oz': return 1;
      case 'lbs': return 16;
      case '%v/v': return 128;
      default: return '';
    }
  }
  if (productType === 'Fertilizer') {
    if (unit === 'tons') return 2000;
    if (unit === 'lbs') return 1;
  }
  if (productType === 'Seed') {
    if (rateType === 'Population') {
      if (crop?.toLowerCase().includes('rice')) return 900000;
      if (crop?.toLowerCase().includes('soy')) return 140000;
    }
  }
  if (productType === 'Seed Treatment') {
    return 1;
  }
  return '';
};

export default function LogInputsPurchase({ isOpen, onClose, cropYear, initialProducts = [], editPurchase = null }) {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [jobsByField, setJobsByField] = useState([]);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoice, setInvoice] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [lines, setLines] = useState([]);
  const [operator, setOperator] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [vendorSnap, productSnap, jobSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'jobsByField')),
      ]);

      const activeVendors = vendorSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(v => v.active);
      const allProducts = productSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const jobDocs = jobSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const relevantJobs = jobDocs.filter(j => String(j.cropYear) === String(cropYear));

      setVendors(activeVendors);
      setProducts(allProducts);
      setJobsByField(relevantJobs);
    };
    fetchData();
  }, [cropYear]);

 // When editing a purchase
// Handle edit or new purchase modal open
useEffect(() => {
  if (!isOpen) return;

  if (editPurchase) {
    setPurchaseDate(editPurchase.date || '');
    setInvoice(editPurchase.invoice || '');
    setVendorId(editPurchase.vendorId || '');
    setOperator((editPurchase.operator || '').toUpperCase());

    setLines([{
      productId: editPurchase.productId,
      amount: editPurchase.amount,
      unit: editPurchase.unit,
      unitSize: editPurchase.unitSize,
      cost: editPurchase.cost,
      unitCost: editPurchase.cost / editPurchase.amount || '',
      note: editPurchase.note || ''
    }]);
  } else {
    // This is for new logs ONLY (when modal opens without edit)
    setOperator('');
    setPurchaseDate('');
    setInvoice('');
    setVendorId('');

    if (initialProducts.length > 0) {
      setLines(initialProducts.map(p => ({
        productId: p.id,
        amount: '',
        unit: '',
        unitSize: '',
        cost: '',
        unitCost: '',
        note: ''
      })));
    } else {
      setLines([{
        productId: '',
        amount: '',
        unit: '',
        unitSize: '',
        cost: '',
        unitCost: '',
        note: ''
      }]);
    }
  }
}, [isOpen]);




  const handleChangeLine = (index, field, value) => {
    setLines(prev => {
      const copy = [...prev];
      copy[index][field] = value;

      const amount = parseFloat(copy[index].amount);
      const cost = parseFloat(copy[index].cost);
      const unitCost = parseFloat(copy[index].unitCost);

      if (field === 'unit') {
        const product = products.find(p => p.id === copy[index].productId);
        const jobUsage = jobsByField.flatMap(j => j.products || []).find(p => p.productId === copy[index].productId);
        const unitSize = getDefaultUnitSize(value, product?.type, jobUsage?.rateType, jobUsage?.crop);
        copy[index].unitSize = unitSize;
      }

      if ((field === 'cost' || field === 'amount') && amount && cost) {
        copy[index].unitCost = (cost / amount).toFixed(2);
      }

      if (field === 'unitCost' && amount) {
        copy[index].cost = (amount * parseFloat(value)).toFixed(2);
      }

      return copy;
    });
  };

  const handleAddLine = () => {
    setLines([...lines, { productId: '', amount: '', unit: '', unitSize: '', cost: '', unitCost: '', note: '' }]);
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const batch = lines.map(async (line) => {
      const normalizedAmount = parseFloat(line.amount || 0) * parseFloat(line.unitSize || 1);
      const data = {
        productId: line.productId,
        productName: products.find(p => p.id === line.productId)?.name || '',
        type: products.find(p => p.id === line.productId)?.type || '',
        form: products.find(p => p.id === line.productId)?.form || '',
        npk: products.find(p => p.id === line.productId)?.npk || '',
        ai: products.find(p => p.id === line.productId)?.ai || '',

        amount: parseFloat(line.amount),
        unit: line.unit,
        unitSize: parseFloat(line.unitSize),
        normalizedAmount,
        cost: parseFloat(line.cost),
        cropYear,
        vendorId,
        vendorName: vendors.find(v => v.id === vendorId)?.name || '',
        invoice,
        date: purchaseDate,
        note: line.note || '',
        operator: operator || '',
        updatedAt: serverTimestamp(),
      };

      if (editPurchase?.id) {
        return updateDoc(doc(db, 'inputPurchases', editPurchase.id), data);
      } else {
        return addDoc(collection(db, 'inputPurchases'), data);
      }
    });

    await Promise.all(batch);
    onClose();
  };


  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Dialog.Panel className="w-full max-w-3xl rounded-xl bg-white p-6 overflow-y-auto max-h-[90vh]">
        <Dialog.Title className="text-xl font-bold mb-4">
          {editPurchase ? 'Edit Input Purchase' : `Log ${cropYear} Input Purchase`}
        </Dialog.Title>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium">Purchase Date</label>
            <input type="date" className="w-full border rounded p-2" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Invoice #</label>
            <input type="text" className="w-full border rounded p-2" value={invoice} onChange={e => setInvoice(e.target.value)} />
          </div>
           <div>
  <label className="block text-sm font-medium">Operator</label>
 <select
  className="w-full border rounded p-2"
  value={operator}
  onChange={(e) => setOperator(e.target.value)}
>
  <option value="">Select operator</option>
  <option value="PCF">PCF</option>
  <option value="TCF">TCF</option>
</select>

</div>


          <div>
            <label className="block text-sm font-medium">Vendor</label>
            <select className="w-full border rounded p-2" value={vendorId} onChange={e => setVendorId(e.target.value)}>
              <option value="">Select vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <hr className="my-4" />

        {lines.map((line, index) => {
        const product = products.find(p => p.id === line.productId);
const productJobs = jobsByField.flatMap(j => j.products || []).filter(p => p.productId === line.productId);
const sampleUsage = productJobs[0] || {};
const unitOptions = inferUnitOptions(sampleUsage.unit, sampleUsage.rateType, product?.type);


if (product?.type === 'Seed Treatment') {
  unitOptions.push('units');
}

let displayUnit = '';
if (product?.type === 'Seed' && sampleUsage.rateType === 'Weight') {
  displayUnit = 'lbs';
} else if (line.unit === 'gal' || line.unit === 'qt' || line.unit === 'pt') {
  displayUnit = 'fl oz';
} else if (line.unit === 'tons') {
  displayUnit = 'lbs';
} else if (line.unit === 'seeds') {
  displayUnit = 'seeds';
} else {
  displayUnit = line.unit || '';
}

          return (
            <div key={index} className="mb-6 border p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold">Input #{index + 1}</label>
                {lines.length > 1 && (
                  <button className="text-red-500 text-sm" onClick={() => handleRemoveLine(index)}>Remove</button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Product</label>
                  <Select
                    options={products.map(p => ({ label: p.name, value: p.id }))}
                    value={products.find(p => p.id === line.productId) ? { label: products.find(p => p.id === line.productId).name, value: line.productId } : null}
                    onChange={(opt) => handleChangeLine(index, 'productId', opt?.value)}
                  />
                </div>
                <div>
                  <label className="text-sm">Amount</label>
                  <input type="number" className="w-full border rounded p-2" value={line.amount} onChange={e => handleChangeLine(index, 'amount', e.target.value)} />
                </div>
              
                <div>
                  <label className="text-sm">Unit</label>
                  <select className="w-full border rounded p-2" value={line.unit} onChange={e => handleChangeLine(index, 'unit', e.target.value)}>
                    <option value="">Select unit</option>
                    {unitOptions.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Unit Size</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      value={line.unitSize}
                      onChange={e => handleChangeLine(index, 'unitSize', e.target.value)}
                    />
                    {displayUnit && <span className="ml-2 text-gray-500 text-sm">{displayUnit}</span>}
                  </div>
                </div>
                <div>
                  <label className="text-sm">Total Cost ($)</label>
                  <input type="number" className="w-full border rounded p-2" value={line.cost} onChange={e => handleChangeLine(index, 'cost', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">$/Unit</label>
                  <input type="number" className="w-full border rounded p-2" value={line.unitCost} onChange={e => handleChangeLine(index, 'unitCost', e.target.value)} />
                </div>
              </div>
              <div className="mt-2">
                <label className="text-sm">Note</label>
                <input type="text" className="w-full border rounded p-2" value={line.note} onChange={e => handleChangeLine(index, 'note', e.target.value)} />
              </div>
            </div>
          );
        })}

        <button className="text-blue-600 text-sm mb-4" onClick={handleAddLine}>+ Add input</button>

        <div className="flex justify-end gap-2">
          <button className="bg-gray-200 rounded px-4 py-2" onClick={onClose}>Cancel</button>
          <button className="bg-blue-600 text-white rounded px-4 py-2" onClick={handleSave}>
            {editPurchase ? 'Update Purchase' : 'Log Purchase'}
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}
