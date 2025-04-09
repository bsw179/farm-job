// placeholder – waiting for full JobsD// ✅ Final version: JobsDropdown with crop assignment, acre editing, boundary drawing, and product selection
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import {
  MapContainer,
  TileLayer,
  Polyline,
  LayersControl,
  useMapEvents,
  useMap
} from 'react-leaflet';

const { BaseLayer } = LayersControl;

export default function JobsDropdown({ cropYear, onClose, onSubmit, existingJob, isEditMode }) {
  const [jobType, setJobType] = useState('');
  const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
  const [fieldsList, setFieldsList] = useState([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [assignCropField, setAssignCropField] = useState(null);
  const [cropToAssign, setCropToAssign] = useState('');
  const [fieldAcreEdits, setFieldAcreEdits] = useState({});
  const [status, setStatus] = useState('Planned');
  const [notes, setNotes] = useState('');
  const [editField, setEditField] = useState(null);
  const [drawnPolygons, setDrawnPolygons] = useState({});
  const [mapCenter, setMapCenter] = useState([35, -91]);

  const [allProducts, setAllProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [products, setProducts] = useState([]);
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    if (existingJob) {
      setJobType(existingJob.jobType || '');
      setJobDate(existingJob.jobDate || new Date().toISOString().split('T')[0]);
      setSelectedFields(existingJob.fields || []);
      setFieldAcreEdits(existingJob.acres || {});
      setDrawnPolygons(existingJob.drawnPolygons || {});
      setStatus(existingJob.status || 'Planned');
      setNotes(existingJob.notes || '');
      setProducts(existingJob.products || []);
    }
  }, [existingJob]);

  useEffect(() => {
    const fetchData = async () => {
      const fieldSnap = await getDocs(collection(db, 'fields'));
      const productSnap = await getDocs(collection(db, 'products'));
      const vendorSnap = await getDocs(collection(db, 'vendors'));
      const applicatorSnap = await getDocs(collection(db, 'applicators'));
      setFieldsList(fieldSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setAllProducts(productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setVendors(vendorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setApplicators(applicatorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (editField?.boundary?.geojson) {
      try {
        const parsed = typeof editField.boundary.geojson === 'string'
          ? JSON.parse(editField.boundary.geojson)
          : editField.boundary.geojson;
        if (parsed?.coordinates?.[0]?.length) {
          const center = turf.center({ type: 'Feature', geometry: parsed });
          const [lng, lat] = center.geometry.coordinates;
          setMapCenter([lat, lng]);
        }
      } catch (e) {
        console.error('Invalid GeoJSON for editField:', e);
      }
    }
  }, [editField]);

  function UpdateMapCenter({ center }) {
    const map = useMap();
    useEffect(() => {
      if (center) map.setView(center);
    }, [center, map]);
    return null;
  }

  function DrawTool({ fieldId, onDone }) {
    const [points, setPoints] = useState([]);
    const [hover, setHover] = useState(null);
    const [final, setFinal] = useState(false);

    useMapEvents({
      click(e) {
        if (!final) setPoints(p => [...p, [e.latlng.lat, e.latlng.lng]]);
      },
      mousemove(e) {
        if (!final) setHover([e.latlng.lat, e.latlng.lng]);
      },
      dblclick() {
        if (points.length >= 3 && !final) {
          const closed = [...points, points[0]];
          const geo = { type: 'Polygon', coordinates: [closed.map(([lat, lng]) => [lng, lat])] };
          onDone(fieldId, geo);
          setFinal(true);
        }
      }
    });

    const path = final ? points : [...points, hover].filter(Boolean);
    return path.length >= 2 ? <Polyline positions={path} color="#1e40af" /> : null;
  }

  const handleFieldSelect = (field) => {
    if (!selectedFields.find(f => f.id === field.id)) {
      setSelectedFields([...selectedFields, field]);
      setFieldAcreEdits(prev => ({ ...prev, [field.id]: field.gpsAcres || 0 }));
    }
  };

  const handleAssignCrop = async () => {
    if (!assignCropField || !cropToAssign) return;
    const updatedField = {
      ...assignCropField,
      crops: {
        ...(assignCropField.crops || {}),
        [cropYear]: { crop: cropToAssign }
      }
    };
    await updateDoc(doc(db, 'fields', assignCropField.id), updatedField);
    setFieldsList(fieldsList.map(f => f.id === updatedField.id ? updatedField : f));
    setAssignCropField(null);
    setCropToAssign('');
  };

  const handleDrawDone = (fieldId, geometry) => {
    const acres = turf.area({ type: 'Feature', geometry }) * 0.000247105;
    setDrawnPolygons(prev => ({ ...prev, [fieldId]: geometry }));
    setFieldAcreEdits(prev => ({ ...prev, [fieldId]: parseFloat(acres.toFixed(2)) }));
    setEditField(null);
  };

  const selectedFieldIds = selectedFields.map(f => f.id);
  const groupedFields = fieldsList.reduce((acc, field) => {
    if (selectedFieldIds.includes(field.id)) return acc;
    const farm = field.farmName || 'Unknown Farm';
    if (!acc[farm]) acc[farm] = [];
    acc[farm].push(field);
    return acc;
  }, {});

  const handleProductChange = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;

    if (field === 'productId') {
      const selected = allProducts.find(p => p.id === value);
      if (selected?.type === 'Seed') {
        const isPopulation = selected.rateType === 'Population';
        updated[index].unit = isPopulation ? 'seeds/acre' : 'lbs/acre';
      }
    }

    setProducts(updated);
  };

  const handleAddProductRow = () => {
    setProducts(prev => [...prev, { productId: '', rate: '', unit: '', vendorId: '', applicatorId: '' }]);
    setShowProducts(true);
  };

  const handleRemoveProductRow = (index) => {
    const updated = [...products];
    updated.splice(index, 1);
    setProducts(updated);
  };

  const filteredProducts = allProducts.filter(p => {
    if (jobType === 'Fertilizing') return p.type === 'Fertilizer';
    if (jobType === 'Spraying') return p.type === 'Chemical';
    if (jobType === 'Seeding') return p.type === 'Seed';
    return false;
  });

  const handleSubmit = async () => {
    const masterJob = {
      jobType,
      jobDate,
      cropYear,
      fields: selectedFields,
      acres: fieldAcreEdits,
      drawnPolygons,
      status,
      notes,
      products,
    };
  
    try {
      let masterJobId;
  
      if (isEditMode && existingJob?.id) {
        await updateDoc(doc(db, 'jobs', existingJob.id), {
          ...masterJob,
          updatedAt: serverTimestamp(),
        });
        masterJobId = existingJob.id;
        console.log('Master job updated:', masterJobId);
      } else {
        const jobRef = await addDoc(collection(db, 'jobs'), {
          ...masterJob,
          createdAt: serverTimestamp(),
        });
        masterJobId = jobRef.id;
        console.log('Master job created:', masterJobId);
        console.log('Fields to split into jobs:', selectedFields.map(f => f.fieldName));
      }
  
      // 🧠 Now create 1 jobByField for each field
      for (const field of selectedFields) {
        const fieldJob = {
          masterJobId,
          jobType,
          jobDate,
          cropYear,
          fieldId: field.id,
          fieldName: field.fieldName,
          farmName: field.farmName || '',
          acres: fieldAcreEdits[field.id] || field.gpsAcres || 0,
          products,
          notes,
          status,
          createdAt: serverTimestamp(),
        };
  
        await addDoc(collection(db, 'jobsByField'), fieldJob);
        console.log('Created field-level job for:', field.fieldName);
      }
  
      onSubmit(masterJob);
    } catch (error) {
      console.error('❌ Failed to save job:', error);
    }
  };
  


  const productSection = showProducts && (
    <div className="border rounded p-4 space-y-2">
      <h3 className="font-semibold text-lg">Products</h3>
      {products.map((p, i) => (
        <div key={i} className="flex flex-wrap gap-2 items-center">
          <select className="border rounded px-2 py-1" value={p.productId} onChange={(e) => handleProductChange(i, 'productId', e.target.value)}>
            <option value="">Select Product</option>
            {filteredProducts.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
          </select>
          <input type="number" placeholder="Rate" className="border px-2 py-1 rounded w-24" value={p.rate} onChange={(e) => handleProductChange(i, 'rate', e.target.value)} />
          <input type="text" placeholder="Unit" className="border px-2 py-1 rounded w-24" value={p.unit} onChange={(e) => handleProductChange(i, 'unit', e.target.value)} />
        <Select
  className="w-full"
  placeholder="Search for a product..."
  options={productsList
    .filter(prod =>
      selectedProductType === '' ||
      prod.type?.toLowerCase() === selectedProductType?.toLowerCase()
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(prod => ({
      value: prod.id,
      label: prod.name,
      unit: prod.unit,
    }))
  }
  value={productsList.find(prod => prod.id === p.productId) ? {
    value: p.productId,
    label: productsList.find(prod => prod.id === p.productId).name
  } : null}
  onChange={(selected) => {
    handleProductChange(i, 'productId', selected?.value || '');
    handleProductChange(i, 'unit', selected?.unit || '');
  }}
  isClearable
/>


          <select className="border rounded px-2 py-1" value={p.applicatorId} onChange={(e) => handleProductChange(i, 'applicatorId', e.target.value)}>
            <option value="">Applicator</option>
            {applicators.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={() => handleRemoveProductRow(i)} className="text-red-600 text-sm">×</button>
        </div>
      ))}
      <button onClick={handleAddProductRow} className="mt-2 bg-blue-500 text-white px-3 py-1 rounded">+ Add Product</button>
    </div>
  );

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto p-4">
      {/* Field Selector */}
      <div>
        <label className="block font-semibold mb-1">Select Fields</label>
        <input
          type="text"
          placeholder="Search fields..."
          className="w-full border rounded p-2 mb-2"
          value={fieldSearch}
          onChange={(e) => setFieldSearch(e.target.value)}
        />
        <div className="max-h-40 overflow-auto border rounded">
          {Object.entries(groupedFields).map(([farm, fields]) => (
            <div key={farm} className="border-b">
              <div className="bg-gray-100 px-2 py-1 font-semibold">{farm}</div>
              {fields.filter(f => f.fieldName.toLowerCase().includes(fieldSearch.toLowerCase())).map(field => {
                const hasCrop = field.crops?.[cropYear]?.crop;
                return (
                  <div key={field.id} className="flex justify-between items-center p-2 hover:bg-gray-100">
                    <span>{field.fieldName} – {field.gpsAcres || 0} ac</span>
                    {hasCrop ? (
                      <button onClick={() => handleFieldSelect(field)} className="text-blue-500">Select</button>
                    ) : (
                      <button onClick={() => setAssignCropField(field)} className="text-red-500">Assign Crop</button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Job Type */}
      <div>
        <label className="block font-semibold mb-1">Job Type</label>
        <select className="w-full border px-2 py-1 rounded" value={jobType} onChange={(e) => setJobType(e.target.value)}>
          <option value="">Select Job Type</option>
          <option value="Fertilizing">Fertilizing</option>
          <option value="Spraying">Spraying</option>
          <option value="Seeding">Seeding</option>
        </select>
      </div>

      {/* Job Date */}
      <div>
        <label className="block font-semibold mb-1">Job Date</label>
        <input type="date" className="w-full border px-2 py-1 rounded" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
      </div>

      {/* Selected Fields with Crop & Acre Editing */}
      {selectedFields.map(field => (
        <div key={field.id} className="border p-2 rounded mb-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{field.fieldName}</p>
              <p className="text-sm text-gray-500">{field.crops?.[cropYear]?.crop || 'No crop'}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="border px-2 py-1 w-24 rounded"
                value={fieldAcreEdits[field.id] || ''}
                onChange={(e) => setFieldAcreEdits(prev => ({ ...prev, [field.id]: parseFloat(e.target.value) || 0 }))}
              />
              <button onClick={() => setEditField(field)} className="text-blue-600 underline text-sm">Edit Area</button>
            </div>
          </div>
        </div>
      ))}

      {/* Assign Crop Modal */}
      {assignCropField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign Crop to {assignCropField.fieldName}</h2>
            <select className="w-full border p-2 rounded mb-4" value={cropToAssign} onChange={(e) => setCropToAssign(e.target.value)}>
              <option value="">Select Crop</option>
              <option value="Rice">Rice</option>
              <option value="Soybeans">Soybeans</option>
              <option value="Corn">Corn</option>
            </select>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 border rounded" onClick={() => setAssignCropField(null)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAssignCrop}>Assign Crop</button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Area Modal */}
      {editField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-4xl h-[500px] relative">
            <h2 className="text-lg font-bold mb-2">Draw Area for {editField.fieldName}</h2>
            <MapContainer center={mapCenter} zoom={17} className="w-full h-[400px]">
              <UpdateMapCenter center={mapCenter} />
              <LayersControl position="topright">
                <BaseLayer checked name="Streets">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </BaseLayer>
                <BaseLayer name="Satellite">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </BaseLayer>
              </LayersControl>
              <DrawTool fieldId={editField.id} onDone={handleDrawDone} />
            </MapContainer>
            <div className="flex justify-end mt-4">
              <button className="px-4 py-2 border rounded" onClick={() => setEditField(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Section */}
      <div>
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleAddProductRow}>Add Products</button>
      </div>

      {productSection}

      {/* Status */}
      <div>
        <label className="block font-semibold mb-1">Status</label>
        <select className="w-full border px-2 py-1 rounded" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Planned">Planned</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block font-semibold mb-1">Notes</label>
        <textarea className="w-full border rounded p-2" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-between">
        <button className="border px-4 py-2 rounded" onClick={onClose}>Cancel</button>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSubmit}>{isEditMode ? 'Update Job' : 'Add Job'}</button>
      </div>
    </div>
  );
}

