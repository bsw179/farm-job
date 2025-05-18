import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Seed');
const [searchTerm, setSearchTerm] = useState("");

  const fetchProducts = async () => {
    const snapshot = await getDocs(collection(db, 'products'));
    setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

const handleSaveProduct = async () => {
  const productToSave = { ...currentProduct }; // 🚫 Don't overwrite unit anymore

  if (currentProduct.id) {
    await updateDoc(doc(db, 'products', currentProduct.id), productToSave);
  } else {
    console.log("Saving new product:", productToSave);

    await addDoc(collection(db, 'products'), productToSave);
  }

  fetchProducts();
  setModalOpen(false);
  setCurrentProduct({});
};



  const handleDeleteProduct = async (id) => {
    await deleteDoc(doc(db, 'products', id));
    fetchProducts();
  };



  const filteredProducts = products
    .filter((p) => p.type === activeTab)
    .filter(
      (p) =>
        !searchTerm ||
        (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));


  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Manage Products</h2>

      <div className="flex gap-4 mb-4">
        {["Seed", "Fertilizer", "Chemical", "Seed Treatment"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${
              activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        onClick={() => {
          setModalOpen(true);
          setCurrentProduct({ type: activeTab });
        }}
      >
        + Add {activeTab}
      </button>

      <button
        className="bg-green-600 text-white px-4 py-2 rounded mb-4 ml-4"
        onClick={async () => {
          const snapshot = await getDocs(collection(db, "products"));
          const allProducts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const groupByType = (type) =>
            allProducts.filter((p) => p.type === type);

          const exportCSV = (items, filename) => {
            if (!items.length) return;
            const headers = Object.keys(items[0]);
            const csv = [
              headers.join(","),
              ...items.map((obj) =>
                headers
                  .map(
                    (key) =>
                      `"${(obj[key] ?? "").toString().replace(/"/g, '""')}"`
                  )
                  .join(",")
              ),
            ].join("\n");

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };

          exportCSV(groupByType("Seed"), "seed_products.csv");
          exportCSV(groupByType("Fertilizer"), "fertilizer_products.csv");
          exportCSV(groupByType("Chemical"), "chemical_products.csv");
        }}
      >
        Export All Products
      </button>
      <input
        type="text"
        placeholder="Search products..."
        className="border px-2 py-1 mb-4 w-full"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-bold mb-4">
              {currentProduct.id ? `Edit ${activeTab}` : `Add ${activeTab}`}
            </h3>

            <input
              className="border px-2 py-1 mb-4 w-full"
              placeholder="Product Name"
              value={currentProduct.name || ""}
              onChange={(e) =>
                setCurrentProduct({ ...currentProduct, name: e.target.value })
              }
            />

            {activeTab === "Seed" && (
              <>
                <select
                  className="border px-2 py-1 mb-4 w-full"
                  value={currentProduct.crop || ""}
                  onChange={(e) => {
                    const updatedCrop = e.target.value;
                    setCurrentProduct({
                      ...currentProduct,
                      crop: updatedCrop,
                      unit: autoPopulateUnit(
                        updatedCrop,
                        currentProduct.rateType
                      ),
                    });
                  }}
                >
                  <option value="">Select Crop</option>
                  <option value="Rice">Rice</option>
                  <option value="Soybeans">Soybeans</option>
                </select>

                <select
                  className="border px-2 py-1 mb-4 w-full"
                  value={currentProduct.rateType || ""}
                  onChange={(e) => {
                    const updatedRateType = e.target.value;
                    setCurrentProduct({
                      ...currentProduct,
                      rateType: updatedRateType,
                      unit: autoPopulateUnit(
                        currentProduct.crop,
                        updatedRateType
                      ),
                    });
                  }}
                >
                  <option value="">Select Rate Type</option>
                  <option value="Weight">Weight (lbs/acre)</option>
                  <option value="Population">Population (seeds/acre)</option>
                </select>
                <select
                  className="border px-2 py-1 mb-4 w-full"
                  value={currentProduct.unit || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      unit: e.target.value,
                    })
                  }
                >
                  <option value="">Select Unit</option>
                  <option value="fl oz/acre">fl oz/acre</option>
                  <option value="pt/acre">pt/acre</option>
                  <option value="qt/acre">qt/acre</option>
                  <option value="gal/acre">gal/acre</option>
                  <option value="lbs/acre">lbs/acre</option>
                  <option value="oz dry/acre">oz dry/acre</option>
                  <option value="tons/acre">tons/acre</option>
                  <option value="seeds/acre">seeds/acre</option>
                  <option value="units/acre">units/acre</option>
                  <option value="%v/v">%v/v</option>
                </select>

                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Technology (optional)"
                  value={currentProduct.technology || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      technology: e.target.value,
                    })
                  }
                />

                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Manufacturer (optional)"
                  value={currentProduct.manufacturer || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      manufacturer: e.target.value,
                    })
                  }
                />
              </>
            )}

            {activeTab === "Fertilizer" && (
              <>
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="N-P-K"
                  value={currentProduct.npk || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      npk: e.target.value,
                    })
                  }
                />
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Form (Granular, Liquid, etc.)"
                  value={currentProduct.form || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      form: e.target.value,
                    })
                  }
                />
                <select
                  className="border px-2 py-1 mb-4 w-full"
                  value={currentProduct.unit || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      unit: e.target.value,
                    })
                  }
                >
                  <option value="">Select Unit</option>
                  <option value="fl oz/acre">fl oz/acre</option>
                  <option value="pt/acre">pt/acre</option>
                  <option value="qt/acre">qt/acre</option>
                  <option value="gal/acre">gal/acre</option>
                  <option value="lbs/acre">lbs/acre</option>
                  <option value="oz dry/acre">oz dry/acre</option>
                  <option value="tons/acre">tons/acre</option>
                  <option value="seeds/acre">seeds/acre</option>
                  <option value="units/acre">units/acre</option>
                  <option value="%v/v">%v/v</option>
                </select>

                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Manufacturer"
                  value={currentProduct.manufacturer || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      manufacturer: e.target.value,
                    })
                  }
                />
              </>
            )}

            {activeTab === "Chemical" && (
              <>
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Chemical Type (Herbicide, etc.)"
                  value={currentProduct.chemicalType || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      chemicalType: e.target.value,
                    })
                  }
                />
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="EPA Number"
                  value={currentProduct.epa || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      epa: e.target.value,
                    })
                  }
                />
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Active Ingredient (AI)"
                  value={currentProduct.ai || ""}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, ai: e.target.value })
                  }
                />
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Carrier Volume Required (optional)"
                  value={currentProduct.carrierVolumeRequired || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      carrierVolumeRequired: e.target.value,
                    })
                  }
                />
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Manufacturer"
                  value={currentProduct.manufacturer || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      manufacturer: e.target.value,
                    })
                  }
                />
                <select
                  className="border px-2 py-1 mb-4 w-full"
                  value={currentProduct.unit || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      unit: e.target.value,
                    })
                  }
                >
                  <option value="">Select Unit</option>
                  <option value="fl oz/acre">fl oz/acre</option>
                  <option value="pt/acre">pt/acre</option>
                  <option value="qt/acre">qt/acre</option>
                  <option value="gal/acre">gal/acre</option>
                  <option value="lbs/acre">lbs/acre</option>
                  <option value="oz dry/acre">oz dry/acre</option>
                  <option value="tons/acre">tons/acre</option>
                  <option value="seeds/acre">seeds/acre</option>
                  <option value="units/acre">units/acre</option>
                  <option value="%v/v">%v/v</option>
                </select>
              </>
            )}
            {activeTab === "Seed Treatment" && (
              <>
                <input
                  className="border px-2 py-1 mb-4 w-full"
                  placeholder="Manufacturer (optional)"
                  value={currentProduct.manufacturer || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      manufacturer: e.target.value,
                    })
                  }
                />

                <select
                  className="border px-2 py-1 mb-4 w-full"
                  value={currentProduct.unit || ""}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      unit: e.target.value,
                    })
                  }
                >
                  <option value="">Select Unit</option>
                  <option value="units">Units</option>
                  <option value="bushels">Bushels</option>
                </select>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button
                className="bg-blue-600 text-white px-4 py-1 rounded"
                onClick={handleSaveProduct}
              >
                Save
              </button>
              <button
                className="bg-gray-300 px-4 py-1 rounded"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="min-w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2">Name</th>
            {activeTab === "Seed" && <th className="px-4 py-2">Crop</th>}
            {activeTab === "Seed" && <th className="px-4 py-2">Rate Type</th>}
            {activeTab === "Chemical" && <th className="px-4 py-2">Type</th>}
            {activeTab === "Chemical" && <th className="px-4 py-2">EPA</th>}
            {activeTab === "Chemical" && <th className="px-4 py-2">AI</th>}
            {activeTab === "Fertilizer" && <th className="px-4 py-2">N-P-K</th>}
            <th className="px-4 py-2">Unit</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => (
            <tr key={product.id}>
              <td className="px-4 py-2">{product.name}</td>
              {activeTab === "Seed" && (
                <td className="px-4 py-2">{product.crop}</td>
              )}
              {activeTab === "Seed" && (
                <td className="px-4 py-2">{product.rateType}</td>
              )}
              {activeTab === "Chemical" && (
                <td className="px-4 py-2">{product.chemicalType}</td>
              )}
              {activeTab === "Chemical" && (
                <td className="px-4 py-2">{product.epa}</td>
              )}
              {activeTab === "Chemical" && (
                <td className="px-4 py-2">{product.ai}</td>
              )}
              {activeTab === "Fertilizer" && (
                <td className="px-4 py-2">{product.npk}</td>
              )}
              <td className="px-4 py-2">{product.unit}</td>
              <td className="px-4 py-2">
                <button
                  className="text-blue-600"
                  onClick={() => {
                    setModalOpen(true);
                    setCurrentProduct(product);
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-red-600 ml-2"
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
