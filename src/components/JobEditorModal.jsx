import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { v4 as uuidv4 } from "uuid";
import EditAreaModal from "../components/EditAreaModal";
import ProductComboBox from "../components/ProductComboBox";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import html2canvas from "html2canvas";

  const allProducts = [
    { id: "rdup", name: "Roundup", type: "chemical" },
    { id: "cmd", name: "Command", type: "chemical" },
    { id: "urea", name: "Urea", type: "fertilizer" },
    { id: "seedA", name: "Rice Seed A", type: "seed" },
    { id: "seedB", name: "Soybean Seed B", type: "seed" },
  ];
export default function JobEditorModal({ isOpen, onClose, initialJobs = [] }) {
  const isEditing = initialJobs.length > 0;
const [jobType, setJobType] = useState("");




  const [applicator, setApplicator] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Planned");
  const [waterVolume, setWaterVolume] = useState("");
  const [passes, setPasses] = useState("");
  const [showSeedTreatment, setShowSeedTreatment] = useState(false);
  const [jobTypeOptions, setJobTypeOptions] = useState([]);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [openOperators, setOpenOperators] = useState({});
  const [polygonEditField, setPolygonEditField] = useState(null);
  const [jobProducts, setJobProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [usedProductIds, setUsedProductIds] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [seedTreatments, setSeedTreatments] = useState([]);
  const [seedTreatmentStatus, setSeedTreatmentStatus] = useState("none");
  const [shouldGeneratePDF, setShouldGeneratePDF] = useState(false);
const [jobDate, setJobDate] = useState(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const iso = now.toISOString().split("T")[0];
  console.log("📆 Default job date:", iso);
  return iso;
});



  useEffect(() => {
    if (initialJobs.length === 0) return;

    const job = initialJobs[0];
    setJobType(job.jobType || "");
    setJobDate(job.jobDate || "");
    setStatus(job.status || "Planned");
    setVendor(job.vendor || "");
    setApplicator(job.applicator || "");
    setNotes(job.notes || "");
    setPasses(job.passes || "");
    setWaterVolume(job.waterVolume || "");
    setSeedTreatmentStatus(job.seedTreatmentStatus || "none");

    const productList = (job.products || []).filter(
      (p) => (p.type || "").toLowerCase() !== "seed treatment"
    );
    const treatmentList = (job.products || []).filter(
      (p) => (p.type || "").toLowerCase() === "seed treatment"
    );

    setJobProducts(productList);
    setSeedTreatments(treatmentList);

    const fetchField = async (fieldId) => {
      const ref = doc(db, "fields", fieldId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const field = snap.data();
      return {
        id: fieldId,
        fieldName: field.fieldName,
        farmName: field.farmName,
        operator: field.operator,
        landowner: field.landowner,
        county: field.county,
        gpsAcres: field.gpsAcres,
        fsaFieldNumber: field.fsaFieldNumber,
        tractNumber: field.tractNumber,
        farmNumber: field.farmNumber,
        operatorExpenseShare: field.operatorExpenseShare,
        landownerExpenseShare: field.landownerExpenseShare,
        operatorRentShare: field.operatorRentShare,
        landownerRentShare: field.landownerRentShare,
        crop: field.crops?.[job.cropYear]?.crop || "",
        riceType: field.crops?.[job.cropYear]?.riceType || "",
        drawnPolygon: job.drawnPolygon || null,
        drawnAcres: job.drawnAcres || null,
        geojson: field.boundary?.geojson || null,
      };
    };

    Promise.all(
      initialJobs.map(async (job) => {
        const ref = doc(db, "fields", job.fieldId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;

        const field = snap.data();

        return {
          ...field,
          id: job.fieldId,
          jobId: job.jobId || job.id, // ✅ Pass this down so we can reuse it when saving
          fieldName: field.fieldName,
          farmName: field.farmName,
          operator: field.operator,
          landowner: field.landowner,
          county: field.county,
          gpsAcres: field.gpsAcres,
          fsaFieldNumber: field.fsaFieldNumber,
          tractNumber: field.tractNumber,
          farmNumber: field.farmNumber,
          operatorExpenseShare: field.operatorExpenseShare,
          landownerExpenseShare: field.landownerExpenseShare,
          operatorRentShare: field.operatorRentShare,
          landownerRentShare: field.landownerRentShare,
          crop: field.crops?.[job.cropYear]?.crop || "",
          riceType: field.crops?.[job.cropYear]?.riceType || "",
          drawnPolygon: job.drawnPolygon || null,
          drawnAcres: job.drawnAcres || null,
          geojson: field.boundary?.geojson || null,
        };
      })
    ).then((enriched) => {
      setSelectedFields(enriched.filter(Boolean));
    });

    // temporary — will fix field fetch next
  }, [initialJobs]);

  useEffect(() => {
    const fetchJobTypes = async () => {
      const snapshot = await getDocs(collection(db, "jobTypes"));
      let subTypes = [];
      snapshot.forEach((doc) => {
        const parent = doc.data();
        parent.subTypes?.forEach((sub) => {
          if (!sub.archived) {
            subTypes.push({
              ...sub,
              parentName: parent.name,
              productType: parent.productType,
              requiresWater: parent.requiresWater ?? false,
            });
          }
        });
      });
      setJobTypeOptions(subTypes);
    };

    fetchJobTypes();
  }, []);

  const isTillage = jobType?.name?.toLowerCase().includes("till");
  const isSpray = jobType?.name?.toLowerCase().includes("spray");
  const isSeed = jobType?.name?.toLowerCase().includes("seed");
  const jobParent = jobType?.parentName?.toLowerCase() || "";
  const isSeeding = jobParent === "seeding";
  const isSpraying = jobParent === "spraying";
  const isFertilizing = jobParent === "fertilizing";

  const [allFields, setAllFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const cropYear = 2025; // Will wire to context later

  useEffect(() => {
    const fetchFields = async () => {
      const snapshot = await getDocs(collection(db, "fields"));
      const fields = snapshot.docs.map((doc) => {
        const data = doc.data();
        const cropInfo = data.crops?.[cropYear] || {};
        return {
          id: doc.id,
          fieldName: data.fieldName,
          farmName: data.farmName,
          gpsAcres: data.gpsAcres,
          fsaAcres: data.fsaAcres,
          fsaFieldNumber: data.fsaFieldNumber,
          tractNumber: data.tractNumber,
          farmNumber: data.farmNumber,
          operator: data.operator,
          landowner: data.landowner,
          operatorExpenseShare: data.operatorExpenseShare,
          landownerExpenseShare: data.landownerExpenseShare,
          operatorRentShare: data.operatorRentShare,
          landownerRentShare: data.landownerRentShare,
          county: data.county,
          geojson: data.boundary?.geojson || null,
          crop: cropInfo.crop || null,
          riceType: cropInfo.riceType || null,
        };
      });

      setAllFields(fields);
      console.log("📍 Loaded Fields:", fields);
    };

    fetchFields();
  }, []);

  useEffect(() => {
    const fetchVendorAndApplicators = async () => {
      const [vendorSnap, applicatorSnap] = await Promise.all([
        getDocs(collection(db, "vendors")),
        getDocs(collection(db, "applicators")),
      ]);

      setVendors(vendorSnap.docs.map((doc) => doc.data().name));
      setApplicators(applicatorSnap.docs.map((doc) => doc.data().name));
    };

    fetchVendorAndApplicators();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllProducts(list);
    };

    fetchProducts();

    const fetchUsedProducts = async () => {
      const snap = await getDocs(collection(db, "usedProducts"));
      const ids = snap.docs.map((doc) => doc.data().productId).filter(Boolean);
      setUsedProductIds(ids);
    };

    fetchUsedProducts();
  }, []);

  const filteredProducts = allProducts.filter((p) => {
    if (!p.type) return false;
    if (isSpraying && p.type.toLowerCase() === "chemical") return true;
    if (isFertilizing && p.type.toLowerCase() === "fertilizer") return true;
    if (isSeeding && p.type.toLowerCase() === "seed") return true;
    return false;
  });

  const isLeveeJob =
    jobType?.name?.toLowerCase().includes("levee") ||
    jobType?.name?.toLowerCase().includes("pack");

  const totalJobAcres = selectedFields.reduce((sum, f) => {
    const crop = f.crop || f.crops?.[cropYear]?.crop || "";
    if (isLeveeJob) {
      if (crop.toLowerCase().includes("rice") && f.riceLeveeAcres)
        return sum + parseFloat(f.riceLeveeAcres);
      if (crop.toLowerCase().includes("soybean") && f.beanLeveeAcres)
        return sum + parseFloat(f.beanLeveeAcres);
      return sum;
    }

    return sum + (f.acres ?? f.drawnAcres ?? f.gpsAcres ?? 0);
  }, 0);

  function handleSavePolygon(updatedField) {
    console.log("💾 Saving updated field to selectedFields:", updatedField);

    setSelectedFields((prev) =>
      prev.map((f) =>
        f.id === updatedField.id ? { ...f, ...updatedField } : f
      )
    );

    setPolygonEditField(null);
  }

  function resetJobForm() {
    setJobType("");
    setJobDate("");
    setStatus("Planned");
    setApplicator("");
    setVendor("");
    setNotes("");
    setPasses("");
    setWaterVolume("");
    setSelectedFields([]);
    setJobProducts([]);
    setSeedTreatments([]);
    setSeedTreatmentStatus("none");
  }

  async function handleSaveJob() {
    console.log("🧪 Save triggered");
    console.log("📌 selectedFields state at save time:", selectedFields);
    console.log("🧪 Save STARTED");
    if (window.__SAVE_RUNNING__) {
      console.warn("🚨 Save already running — skipping");
      return;
    }
    window.__SAVE_RUNNING__ = true;

    if (!selectedFields.length || !jobType || !jobDate) {
      alert("Missing required info: fields, job type, or date.");
      return;
    }

    const existingBatchTag = initialJobs[0]?.batchTag || null;
    const batchId = existingBatchTag || `batch_${Date.now()}`;

    const cropYear = 2025; // swap if dynamic later

    const sharedData = {
      jobType,
      jobDate,
      status,
      vendor,
      applicator,
      notes,
      passes,
      waterVolume,
      seedTreatmentStatus,
      cropYear,
      batchTag: batchId,
    };

    const enrichedProducts = jobProducts.map((p) => ({
      ...p,
      type: p.type || "",
      productName: p.productName || "",
      productId: p.productId || "",
      vendor: p.vendor || "",
      rate: parseFloat(p.rate) || 0,
      unit: p.unit || "",
      rateType: p.rateType || "",
      crop: p.crop || "",
    }));

    const enrichedTreatments = seedTreatments.map((t) => ({
      ...t,
      productName: t.productName || "",
      productId: t.productId || "",
      rate: parseFloat(t.rate) || 0,
      unit: t.unit || "",
      type: "Seed Treatment",
    }));

    const allProducts = [
      ...enrichedProducts,
      ...(seedTreatmentStatus === "separate" ? enrichedTreatments : []),
    ];

    const shouldDetachField = (fieldId) => {
      const original = initialJobs.find((j) => j.fieldId === fieldId);
      if (!isEditing || !original) return false;

      const latest = selectedFields.find((f) => f.id === fieldId);
      if (!latest) return true;

      return (
        latest.drawnPolygon !== original.drawnPolygon ||
        JSON.stringify(latest.products || []) !==
          JSON.stringify(original.products || []) ||
        latest.notes !== original.notes ||
        latest.status !== original.status ||
        latest.jobDate !== original.jobDate
      );
    };

    for (const field of selectedFields) {
      console.log("💾 Attempting to save:", field.fieldName, field.id);

      const fieldId = field.id;
      const isSingleEdit = isEditing && initialJobs.length === 1;

      const jobId = isSingleEdit
        ? field.jobId || field.id || `${batchId}_${fieldId}`
        : `${batchId}_${fieldId}`;

      const crop = field.crop || "";
      const isRice = crop.toLowerCase().includes("rice");
      const isSoy = crop.toLowerCase().includes("soybean");

      let acres = field.drawnAcres ?? field.acres ?? field.gpsAcres ?? 0;
      if (jobType?.name?.toLowerCase().includes("levee")) {
        if (isRice && field.riceLeveeAcres)
          acres = parseFloat(field.riceLeveeAcres);
        if (isSoy && field.beanLeveeAcres)
          acres = parseFloat(field.beanLeveeAcres);
      }

      const jobDoc = {
        ...sharedData,
        jobId,
        id: jobId,
        timestamp: new Date(),
        isDetachedFromGroup: shouldDetachField(fieldId),
        batchTag: shouldDetachField(fieldId) ? null : batchId,
        linkedToJobId: shouldDetachField(fieldId) ? null : `grouped_${batchId}`,
        fieldId,
        fieldName: field.fieldName || "",
        farmName: field.farmName || "",
        county: field.county || "",
        crop,
        riceType: field.riceType || "",
        acres,
        drawnAcres: field.drawnAcres || null,
        drawnPolygon: field.drawnPolygon || null,
        boundary: field.geojson || null,
        fsaFieldNumber: field.fsaFieldNumber || "",
        tractNumber: field.tractNumber || "",
        farmNumber: field.farmNumber || "",
        operator: field.operator || "",
        landowner: field.landowner || "",
        operatorExpenseShare:
          typeof field.operatorExpenseShare === "number"
            ? field.operatorExpenseShare
            : null,
        landownerExpenseShare:
          typeof field.landownerExpenseShare === "number"
            ? field.landownerExpenseShare
            : null,
        operatorRentShare:
          typeof field.operatorRentShare === "number"
            ? field.operatorRentShare
            : null,
        landownerRentShare:
          typeof field.landownerRentShare === "number"
            ? field.landownerRentShare
            : null,
        products: allProducts,
        createdAt: new Date().toISOString(),
        linkedToJobId: null,
        isDetachedFromGroup: isEditing,
      };

      try {
        await setDoc(doc(db, "jobsByField", jobId), jobDoc);
        console.log("✅ Job saved:", jobId);
        console.log("✅ Saved to:", jobId);
      } catch (err) {
        console.error("❌ Failed to save job:", jobId, err);
      }
    }

    console.log("🎉 All jobs attempted to save");
    alert("Job(s) saved.");
    onClose();
    window.location.reload();

    window.__SAVE_RUNNING__ = false;

    resetJobForm();
    if (shouldGeneratePDF) {
      const fieldSnapshots = await Promise.all(
        selectedFields.map(async (field) => {
          const el = document.getElementById(`field-canvas-${field.id}`);
          if (!el) return { fieldId: field.id, imageBase64: null };

          const canvas = await html2canvas(el);
          const imageBase64 = canvas.toDataURL("image/png");
          return { fieldId: field.id, imageBase64 };
        })
      );

      const allJobs = selectedFields.map((field) => {
        const jobId = `${batchId}_${field.id}`;
        const crop = field.crop || "";
        const isRice = crop.toLowerCase().includes("rice");
        const isSoy = crop.toLowerCase().includes("soybean");

        let acres = field.drawnAcres ?? field.acres ?? field.gpsAcres ?? 0;
        if (isLeveeJob) {
          if (isRice && field.riceLeveeAcres)
            acres = parseFloat(field.riceLeveeAcres);
          if (isSoy && field.beanLeveeAcres)
            acres = parseFloat(field.beanLeveeAcres);
        }

        return {
          ...field,
          jobId,
          jobDate,
          status,
          vendor,
          applicator,
          notes,
          passes,
          waterVolume,
          jobType,
          products: allProducts,
          fields: [
            {
              ...field,
              acres,
              imageBase64:
                fieldSnapshots.find((f) => f.fieldId === field.id)
                  ?.imageBase64 || null,
            },
          ],
        };
      });

      const { generateBatchPDF } = await import("../utils/generatePDF");
      const blob = await generateBatchPDF(allJobs);
    const url = URL.createObjectURL(blob);

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      // Open PDF in a new tab so user can use native "share" or "print"
      window.open(url, "_blank");
    } else {
      // Standard download for desktop and Android
      const a = document.createElement("a");
      a.href = url;
      a.download = `Job_Batch_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    }
  }
console.log("🔍 jobType", jobType);

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen bg-black/50 px-4">
        <Dialog.Panel className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 overflow-y-auto max-h-[90vh] space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit Job" : "Create 2025 Job"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!window.confirm("Clear all job details?")) return;
                setJobType("");
                setJobDate("");
                setStatus("Planned");
                setApplicator("");
                setVendor("");
                setNotes("");
                setPasses("");
                setWaterVolume("");
                setSelectedFields([]);
                setJobProducts([]);
                setSeedTreatments([]);
                setSeedTreatmentStatus("none");
              }}
            >
              🧹 Clear
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Type
            </label>
            <select
              value={jobType?.name || ""}
              onChange={(e) => {
                const selected = jobTypeOptions.find(
                  (jt) => jt.name === e.target.value
                );
                setJobType(selected || "");
              }}
              className="border rounded w-full p-2"
            >
              <option value="">Select Job Type</option>

              {[...new Set(jobTypeOptions.map((j) => j.parentName))] // unique parent names, sorted
                .sort()
                .map((parent) => (
                  <optgroup key={parent} label={parent}>
                    {jobTypeOptions
                      .filter((j) => j.parentName === parent)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((jt) => (
                        <option key={jt.name} value={jt.name}>
                          {jt.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
            </select>
          </div>

          <div className="mt-6 border rounded-lg shadow-sm p-4 bg-white space-y-4">
            <div className="text-sm font-semibold text-gray-700">
              Select Fields
            </div>

            {/* Selected Field Tags */}
            <button
              onClick={() => setShowFieldDropdown((prev) => !prev)}
              className="w-full text-left border rounded p-2 bg-white"
            >
              <div className="flex flex-wrap gap-2">
                {selectedFields.length > 0 ? (
                  selectedFields.map((field) => (
                    <span
                      key={field.id}
                      className="flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {field.fieldName}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFields((prev) =>
                            prev.filter((f) => f.id !== field.id)
                          );
                        }}
                        role="button"
                        tabIndex={0}
                        className="ml-1 text-blue-600 hover:text-red-600 cursor-pointer"
                      >
                        ✕
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">
                    No Fields Selected
                  </span>
                )}
              </div>
            </button>

            <div className="text-sm text-gray-600 ml-1">
              Grouped by Operator & Farm
            </div>

            {[...new Set(allFields.map((f) => f.operator))]
              .sort()
              .map((operator) => {
                const isOpen = openOperators[operator];

                return (
                  <div key={operator} className="mb-2">
                    <div
                      className={`flex justify-between items-center px-1 py-2 rounded-md transition cursor-pointer ${
                        selectedFields.length > 0 &&
                        selectedFields[0].operator !== operator
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-800 hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        if (
                          selectedFields.length === 0 ||
                          selectedFields[0].operator === operator
                        ) {
                          setOpenOperators((prev) => ({
                            ...prev,
                            [operator]: !prev[operator],
                          }));
                        }
                      }}
                    >
                      <div className="font-medium">{operator}</div>
                      <div
                        className={`transform transition-transform text-blue-600 text-xs ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </div>
                    </div>

                    {isOpen &&
                      [
                        ...new Set(
                          allFields
                            .filter((f) => f.operator === operator)
                            .map((f) => f.farmName)
                        ),
                      ]
                        .sort()
                        .map((farm) => (
                          <div key={farm} className="ml-3 mb-2">
                            <div className="font-semibold text-blue-700 text-sm mb-1">
                              {farm}
                            </div>
                            <div className="space-y-1">
                              {allFields
                                .filter(
                                  (f) =>
                                    f.operator === operator &&
                                    f.farmName === farm
                                )
                                .sort((a, b) =>
                                  a.fieldName.localeCompare(b.fieldName)
                                )
                                .map((field) => {
                                  const isSelected = selectedFields.some(
                                    (f) => f.id === field.id
                                  );

                                  return (
                                    <div
                                      key={field.id}
                                      className="flex items-center justify-between border rounded px-2 py-1 text-sm bg-white shadow-sm"
                                    >
                                      <div>
                                        {field.fieldName} –{" "}
                                        {(
                                          field.drawnAcres ??
                                          field.acres ??
                                          field.gpsAcres
                                        )?.toFixed(1)}{" "}
                                        ac – {cropYear} {field.crop}
                                      </div>
                                      {!isSelected && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const ref = doc(
                                              db,
                                              "fields",
                                              field.id
                                            );
                                            const snap = await getDoc(ref);
                                            const full = snap.exists()
                                              ? { ...field, ...snap.data() }
                                              : field;

                                            setSelectedFields((prev) => [
                                              ...prev,
                                              full,
                                            ]);
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-800"
                                        >
                                          Select
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                  </div>
                );
              })}
          </div>

          {selectedFields.length > 0 && (
            <div className="mt-6 border rounded-lg shadow-sm p-4 bg-white space-y-4">
              <div className="text-sm font-semibold text-gray-700">
                Selected Fields
              </div>

              <div className="space-y-3">
                {selectedFields.map((field) => (
                  <div
                    key={field.id}
                    className="relative bg-gray-100 border rounded p-4"
                  >
                    <button
                      className="absolute top-2 left-2 text-sm text-red-500"
                      onClick={() =>
                        setSelectedFields((prev) =>
                          prev.filter((f) => f.id !== field.id)
                        )
                      }
                    >
                      X
                    </button>
                    <div className="font-medium mb-2">
                      {field.fieldName} –{" "}
                      {field.drawnAcres ?? field.acres ?? field.gpsAcres} ac –{" "}
                      {cropYear} {field.crop}
                    </div>

                    {field.geojson && (
                      <div
                        id={`field-canvas-${field.id}`}
                        className="absolute top-1/2 right-4 -translate-y-1/2 w-[80px] h-[80px] border rounded bg-white flex items-center justify-center"
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          {(() => {
                            let base =
                              field.boundary?.geojson || field.boundary;
                            if (typeof base === "string") {
                              try {
                                base = JSON.parse(base);
                              } catch {
                                return (
                                  <text
                                    x={5}
                                    y={20}
                                    className="text-xs fill-red-600"
                                  >
                                    Invalid base
                                  </text>
                                );
                              }
                            }

                            const baseCoords = base?.coordinates?.[0] || [];

                            const isValidPolygon = (poly) => {
                              if (!poly) return false;
                              try {
                                if (typeof poly === "string") {
                                  poly = JSON.parse(poly);
                                }
                                if (
                                  poly.type === "Feature" &&
                                  poly.geometry?.type === "Polygon"
                                ) {
                                  poly = poly.geometry;
                                }
                                return (
                                  poly.type === "Polygon" &&
                                  Array.isArray(poly.coordinates?.[0]) &&
                                  poly.coordinates[0].length > 2
                                );
                              } catch {
                                return false;
                              }
                            };

                            const xs = baseCoords.map(([x]) => x);
                            const ys = baseCoords.map(([_, y]) => y);
                            const minX = Math.min(...xs);
                            const maxX = Math.max(...xs);
                            const minY = Math.min(...ys);
                            const maxY = Math.max(...ys);
                            const padding = 5;
                            const width = maxX - minX;
                            const height = maxY - minY;
                            const scale =
                              Math.min(100 - 2 * padding, 100 - 2 * padding) /
                              Math.max(width, height);

                            const normalize = (coords) =>
                              coords.map(([x, y]) => [
                                (x - minX) * scale + padding,
                                100 - ((y - minY) * scale + padding),
                              ]);

                            const basePoints = normalize(baseCoords)
                              .map(([x, y]) => `${x},${y}`)
                              .join(" ");

                            return (
                              <>
                                <polygon
                                  points={basePoints}
                                  fill={
                                    isValidPolygon(field.drawnPolygon)
                                      ? "#c41e3a"
                                      : "#4ade80"
                                  }
                                  stroke={
                                    field.drawnPolygon ? "#7a1025" : "#166534"
                                  }
                                  strokeWidth="0.5"
                                />

                                {isValidPolygon(field.drawnPolygon) &&
                                  (() => {
                                    let overlay = field.drawnPolygon;
                                    if (typeof overlay === "string") {
                                      try {
                                        overlay = JSON.parse(overlay);
                                      } catch {
                                        return null;
                                      }
                                    }
                                    if (overlay?.type === "Feature") {
                                      overlay = overlay.geometry;
                                    }

                                    const overlayCoords =
                                      overlay?.coordinates?.[0] || [];
                                    const overlayPoints = normalize(
                                      overlayCoords
                                    )
                                      .map(([x, y]) => `${x},${y}`)
                                      .join(" ");

                                    return (
                                      <polygon
                                        points={overlayPoints}
                                        fill="#4ade80"
                                        stroke="#166534"
                                        strokeWidth="0.5"
                                      />
                                    );
                                  })()}
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      {field.farmName} / {field.operator}
                    </div>

                    <button
                      onClick={() => {
                        console.log("🧲 Field passed to polygon modal:", field);
                        setPolygonEditField(field);
                      }}
                      className="absolute right-[120px] top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-600"
                      title="Edit Area"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 🔹 Total Job Acres Summary */}
              <div className="text-sm font-semibold text-blue-700 pt-2">
                Job Acres {totalJobAcres.toFixed(1)} – (
                {isLeveeJob
                  ? "levee acres"
                  : selectedFields.some(
                      (f) =>
                        !!f.drawnPolygon &&
                        !!f.drawnAcres &&
                        parseFloat(f.drawnAcres) > 0
                    )
                  ? "partial"
                  : "full"}
                )
              </div>
            </div>
          )}

          {(jobType?.parentName === "Tillage" ||
            jobType?.parentName === "Spraying") && (
            <div className="mt-6 border rounded-lg shadow-sm p-4 bg-white space-y-4">
              {jobType?.parentName === "Tillage" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Passes
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={passes}
                    onChange={(e) => setPasses(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 w-32 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {jobType?.parentName === "Spraying" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Water Volume (gal/acre)
                  </label>
                  <input
                    type="number"
                    className="border border-gray-300 rounded-md px-3 py-2 w-48 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={waterVolume}
                    onChange={(e) => setWaterVolume(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {(isSeeding || isSpraying || isFertilizing) && (
            <>
              {/* Vendor + Applicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Vendor
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="border rounded w-full p-2"
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setJobProducts((prev) =>
                          prev.map((p) => ({
                            ...p,
                            vendor: vendor,
                          }))
                        );
                      }}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition"
                    >
                      Apply to All
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Applicator
                  </label>
                  <select
                    value={applicator}
                    onChange={(e) => setApplicator(e.target.value)}
                    className="border rounded w-full p-2"
                  >
                    <option value="">Select Applicator</option>
                    {applicators.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product List */}
              <div className="space-y-3 mt-4">
                {jobProducts.map((product, index) => (
                  <div
                    key={index}
                    className="border rounded-md shadow-sm p-4 bg-white flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-semibold text-gray-700">
                        Product {index + 1}
                      </div>
                      <button
                        onClick={() =>
                          setJobProducts((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                        className="text-red-600 text-sm hover:underline"
                        title="Remove Product"
                      >
                        🗑 Remove
                      </button>
                    </div>

                    <ProductComboBox
                      value={{
                        id: product.productId,
                        name: product.productName,
                      }}
                      onChange={(selected) => {
                        const updated = [...jobProducts];
                        updated[index].productId = selected.id;
                        updated[index].productName = selected.name;
                        updated[index].unit = selected.unit || "";
                        updated[index].rateType = selected.rateType || "";
                        updated[index].type = selected.type || "";
                        updated[index].crop = selected.crop || "";
                        setJobProducts(updated);
                      }}
                      productType={
                        jobParent === "seeding"
                          ? "Seeding"
                          : jobParent === "spraying"
                          ? "Spraying"
                          : jobParent === "fertilizing"
                          ? "Fertilizing"
                          : ""
                      }
                      allProducts={allProducts}
                      usedProductIds={usedProductIds}
                    />

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Rate"
                        value={product.rate}
                        onChange={(e) => {
                          const updated = [...jobProducts];
                          updated[index].rate = e.target.value;
                          setJobProducts(updated);
                        }}
                        className="border p-2 rounded w-full sm:w-1/2"
                      />

                      <select
                        value={product.unit}
                        onChange={async (e) => {
                          const newUnit = e.target.value;
                          const oldUnit = product.unit;

                          const updated = [...jobProducts];
                          updated[index].unit = newUnit;
                          setJobProducts(updated);

                          if (newUnit !== oldUnit && product.productId) {
                            const confirmUpdate = window.confirm(
                              "Update Product's Unit in Database?"
                            );
                            if (confirmUpdate) {
                              try {
                                const ref = doc(
                                  db,
                                  "products",
                                  product.productId
                                );
                                await updateDoc(ref, { unit: newUnit });
                                alert("Product unit updated successfully.");
                              } catch (err) {
                                alert("Failed to update product unit.");
                              }
                            }
                          }
                        }}
                        className="border p-2 rounded w-full sm:w-1/2"
                      >
                        <option value="">Unit</option>
                        {(() => {
                          const type = product.type?.toLowerCase() || "";

                          if (type === "chemical") {
                            return [
                              "fl oz/acre",
                              "pt/acre",
                              "qt/acre",
                              "gal/acre",
                            ].map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ));
                          }

                          if (type === "fertilizer") {
                            return ["lbs/acre", "tons/acre"].map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ));
                          }

                          if (type === "seed") {
                            return ["seeds/acre", "units/acre", "lbs/acre"].map(
                              (u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              )
                            );
                          }

                          return ["lbs/acre", "units/acre"].map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    <select
                      value={product.vendor}
                      onChange={(e) => {
                        const updated = [...jobProducts];
                        updated[index].vendor = e.target.value;
                        setJobProducts(updated);
                      }}
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}
          <Button
            size="sm"
            onClick={() =>
              setJobProducts((prev) => [
                ...prev,
                {
                  productId: "",
                  productName: "",
                  rate: "",
                  unit: "",
                  type: "",
                  crop: "",
                  rateType: "",
                  vendor: "",
                },
              ])
            }
          >
            + Add Product
          </Button>

          {jobProducts.some((p) => (p.type || "").toLowerCase() === "seed") && (
            <div className="mt-6 border rounded-lg shadow-sm p-4 bg-white space-y-4">
              <div className="text-sm font-semibold text-gray-700">
                Seed Treatment
              </div>

              {/* Radio Options */}
              <div className="space-y-1">
                <label className="block text-sm">
                  <input
                    type="radio"
                    name="seedTreatmentStatus"
                    value="none"
                    checked={seedTreatmentStatus === "none"}
                    onChange={() => setSeedTreatmentStatus("none")}
                    className="mr-1"
                  />
                  No Treatment
                </label>
                <label className="block text-sm">
                  <input
                    type="radio"
                    name="seedTreatmentStatus"
                    value="included"
                    checked={seedTreatmentStatus === "included"}
                    onChange={() => setSeedTreatmentStatus("included")}
                    className="mr-1"
                  />
                  Treatment Included with Seed
                </label>
                <label className="block text-sm">
                  <input
                    type="radio"
                    name="seedTreatmentStatus"
                    value="separate"
                    checked={seedTreatmentStatus === "separate"}
                    onChange={() => setSeedTreatmentStatus("separate")}
                    className="mr-1"
                  />
                  Treatment Added Separately
                </label>
              </div>

              {/* Seed Treatment Entries */}
              {seedTreatmentStatus === "separate" && (
                <div className="space-y-3">
                  {seedTreatments.map((t, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center"
                    >
                      <ProductComboBox
                        productType="Seed Treatment"
                        allProducts={allProducts.filter(
                          (p) => p.type === "Seed Treatment"
                        )}
                        usedProductIds={usedProductIds}
                        value={{ id: t.productId, name: t.productName }}
                        onChange={(selected) => {
                          const updated = [...seedTreatments];
                          updated[i] = {
                            ...updated[i],
                            productId: selected.id,
                            productName: selected.name,
                            type: "Seed Treatment",
                          };
                          setSeedTreatments(updated);
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Rate"
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        value={t.rate || ""}
                        onChange={(e) => {
                          const updated = [...seedTreatments];
                          updated[i].rate = e.target.value;
                          setSeedTreatments(updated);
                        }}
                      />

                      <select
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        value={t.unit || ""}
                        onChange={(e) => {
                          const updated = [...seedTreatments];
                          updated[i].unit = e.target.value;
                          setSeedTreatments(updated);
                        }}
                      >
                        <option value="">Select Unit</option>
                        <option value="/acre">/acre</option>
                      </select>

                      <div className="text-gray-500 text-xs italic">
                        Tracked during purchase
                      </div>

                      <button
                        className="text-xs text-red-600 hover:text-red-800"
                        onClick={() =>
                          setSeedTreatments((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        🗑 Remove
                      </button>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    onClick={() =>
                      setSeedTreatments((prev) => [
                        ...prev,
                        { productId: "", productName: "", rate: "", unit: "" },
                      ])
                    }
                  >
                    + Add Seed Treatment
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 border rounded-lg shadow-sm p-4 bg-white space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border rounded w-full p-2"
                >
                  <option value="Planned">Planned</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {status === "Completed" ? "Date Completed" : "Planned Date"}
                </label>
                <DatePicker
                  selected={jobDate ? new Date(jobDate + "T00:00") : null}
                  onChange={(date) => {
                    const iso = date?.toISOString().split("T")[0] || "";
                    setJobDate(iso);
                  }}
                  dateFormat="MM/dd/yyyy"
                  className="border rounded w-full p-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                className="w-full border rounded p-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type a note"
              />
            </div>
          </div>

          <div className="text-sm text-gray-700 space-y-1">
            {jobProducts.map((p, i) => {
              const rate = parseFloat(p.rate);
              const unit = p.unit?.toLowerCase() || "";
              const crop = p.crop?.toLowerCase?.() || "";

              const totalAcres = selectedFields.reduce((sum, f) => {
                const cropName = f.crop || "";
                if (
                  jobParent === "levee" ||
                  jobType?.name?.toLowerCase().includes("levee") ||
                  jobType?.name?.toLowerCase().includes("pack")
                ) {
                  if (
                    cropName.toLowerCase().includes("rice") &&
                    f.riceLeveeAcres
                  )
                    return sum + parseFloat(f.riceLeveeAcres);
                  if (
                    cropName.toLowerCase().includes("soybean") &&
                    f.beanLeveeAcres
                  )
                    return sum + parseFloat(f.beanLeveeAcres);
                  return sum;
                }

                return sum + (f.drawnAcres ?? f.acres ?? f.gpsAcres ?? 0);
              }, 0);

              const totalAmount = rate * totalAcres;
              let display = "";

              if (["seeds/acre", "population"].includes(unit)) {
                const seedsPerUnit = crop.includes("rice")
                  ? 900000
                  : crop.includes("soybean")
                  ? 140000
                  : 1000000;
                const totalSeeds = rate * totalAcres;
                const units = totalSeeds / seedsPerUnit;
                display = `${units.toFixed(1)} units`;
              } else if (unit === "lbs/acre") {
                if (p.type?.toLowerCase() === "seed") {
                  const lbsPerBushel = crop.includes("rice")
                    ? 45
                    : crop.includes("soybean")
                    ? 60
                    : 50;
                  const bushels = totalAmount / lbsPerBushel;
                  display = `${totalAmount.toFixed(1)} lbs (${bushels.toFixed(
                    1
                  )} bu)`;
                } else {
                  const tons = totalAmount / 2000;
                  display = `${totalAmount.toFixed(1)} lbs (${tons.toFixed(
                    2
                  )} tons)`;
                }
              } else if (unit === "fl oz/acre") {
                const gal = totalAmount / 128;
                display = `${totalAmount.toFixed(1)} fl oz (${gal.toFixed(
                  2
                )} gal)`;
              } else if (unit === "pt/acre") {
                const gal = totalAmount / 8;
                display = `${totalAmount.toFixed(1)} pt (${gal.toFixed(
                  2
                )} gal)`;
              } else if (unit === "qt/acre") {
                const gal = totalAmount / 4;
                display = `${totalAmount.toFixed(1)} qt (${gal.toFixed(
                  2
                )} gal)`;
              } else if (unit === "oz dry/acre") {
                const lbs = totalAmount / 16;
                display = `${totalAmount.toFixed(1)} oz dry (${lbs.toFixed(
                  2
                )} lbs)`;
              } else if (unit === "tons/acre") {
                display = `${totalAmount.toFixed(2)} tons`;
              } else {
                display = `${totalAmount.toFixed(1)} ${unit
                  .replace("/acre", "")
                  .trim()}`;
              }

              return (
                <div key={i}>
                  {p.productName || "Unnamed"} →{" "}
                  <span className="font-mono">{display}</span>
                </div>
              );
            })}
          </div>
          {/* 🔹 Generate PDF Option */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={shouldGeneratePDF}
              onChange={() => setShouldGeneratePDF(!shouldGeneratePDF)}
              id="generate-pdf-checkbox"
            />
            <label
              htmlFor="generate-pdf-checkbox"
              className="text-sm text-gray-700"
            >
              Generate PDF after saving
            </label>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSaveJob}>
              {isEditing ? "Update Job(s)" : "Create Job(s)"}
            </Button>
          </div>
          {polygonEditField && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
              <div className="bg-white w-full max-w-4xl rounded shadow-lg p-4 relative">
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setPolygonEditField(null)}
                >
                  <X size={20} />
                </button>
                <EditAreaModal
                  field={polygonEditField}
                  onCloseModal={() => setPolygonEditField(null)}
                  onSavePolygon={handleSavePolygon}
                />
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
