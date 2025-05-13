import React, { useContext, useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { CropYearContext } from "@/context/CropYearContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import Select from "react-select";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function JobSummaryReport() {
  const { cropYear } = useContext(CropYearContext);
  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [showResults, setShowResults] = useState(false);

const columnOptions = [
  "Field",
  "Farm",
  "Crop",
  "Date",
  "Acres",
  "Job Type",
  "Input",
  "Rate",
  "Total Applied",
  "Vendor",
  "Operator",
  "Landowner",
];

const exportPDF = async () => {
  const input = document.querySelector("#reportTable");

  if (!input) return;

  const canvas = await html2canvas(input, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("l", "pt", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth - 40;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let y = 20;

  if (imgHeight < pageHeight - 40) {
    pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
  } else {
    // Split long content into pages
    let position = 0;
    while (position < imgHeight) {
      pdf.addImage(imgData, "PNG", 20, y - position, imgWidth, imgHeight);
      position += pageHeight - 40;
      if (position < imgHeight) pdf.addPage();
    }
  }

  pdf.save(`JobSummary_${cropYear}.pdf`);
};
  useEffect(() => {
    const fetchJobs = async () => {
      const snapshot = await getDocs(collection(db, "jobsByField"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const yearJobs = data.filter(job => job.cropYear === cropYear);
      setAllJobs(yearJobs);
      generateFilterOptions(yearJobs);
    };
    fetchJobs();
  }, [cropYear]);

  const generateFilterOptions = (jobs) => {
    const getUnique = (list, fn) => [...new Set(list.map(fn).filter(Boolean))].sort();
    setFilterOptions({
      fields: getUnique(jobs, j => j.fieldName),
      farms: getUnique(jobs, j => j.farmName),
      crops: getUnique(jobs, j => j.crop),
      jobTypes: getUnique(jobs, j => j.jobType?.name),
      products: getUnique(jobs.flatMap(j => j.products || []), p => p.productName),
      vendors: getUnique(jobs.flatMap(j => j.products || []), p => p.vendor),
      operators: getUnique(jobs, j => j.operator),
      landowners: getUnique(jobs, j => j.landowner),
    });
  };

  const handleFilterChange = (key, selected) => {
    setSelectedFilters(prev => ({ ...prev, [key]: selected.map(s => s.value) }));
  };

  const handleLoadReport = () => {
    let result = [...allJobs];
    Object.entries(selectedFilters).forEach(([key, selectedValues]) => {
      if (selectedValues && selectedValues.length > 0) {
        switch (key) {
          case "fields":
            result = result.filter(j => selectedValues.includes(j.fieldName));
            break;
          case "farms":
            result = result.filter(j => selectedValues.includes(j.farmName));
            break;
          case "crops":
            result = result.filter(j => selectedValues.includes(j.crop));
            break;
          case "jobTypes":
            result = result.filter(j => selectedValues.includes(j.jobType?.name));
            break;
          case "products":
            result = result.filter(j => (j.products || []).some(p => selectedValues.includes(p.productName)));
            break;
          case "vendors":
            result = result.filter(j => (j.products || []).some(p => selectedValues.includes(p.vendor)));
            break;
          case "operators":
            result = result.filter(j => selectedValues.includes(j.operator));
            break;
          case "landowners":
            result = result.filter(j => selectedValues.includes(j.landowner));
            break;
          default:
            break;
        }
      }
    });
    setFilteredJobs(result);
    setShowResults(true);
  };

  const exportCSV = () => {
    const rows = [];

    filteredJobs.forEach((job) => {
      (job.products || []).forEach((product) => {
        const row = {
          Field: job.fieldName,
          Farm: job.farmName,
          Crop: job.crop,
          Date: job.jobDate || "",
          Acres: job.acres || "",
          "Job Type": job.jobType?.name || "",
          Product: product.productName || "",
          Rate: `${product.rate ?? ""} ${product.unit || ""}`.trim(),
          "Total Applied": ((product.rate ?? 0) * (job.acres || 0)).toFixed(2),
          Vendor: product.vendor || "",
          Operator: job.operator || "",
          Landowner: job.landowner || "",
        };
        rows.push(row);
      });
    });

    const columnsToExport = selectedColumns.map((col) =>
      col === "Input" ? "Product" : col
    );

    if (!columnsToExport.includes("Rate")) columnsToExport.push("Rate");
    if (!columnsToExport.includes("Total Applied"))
      columnsToExport.push("Total Applied");

    const header = columnsToExport.join(",");
    const body = rows
      .map((row) =>
        columnsToExport.map((col) => JSON.stringify(row[col] || "")).join(",")
      )
      .join("\n");

    const blob = new Blob([header + "\n" + body], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, `JobSummary_${cropYear}.csv`);
  };


  return (
    <div className="flex flex-col-reverse md:flex-row max-w-7xl mx-auto">
      {/* Left side: Report Preview */}
      <div className="flex-1 p-4">
        <PageHeader title="📋 Activity Summary" />
        {!showResults ? (
          <p className="text-gray-600">
            Please set filters and click Load Report.
          </p>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Showing {filteredJobs.length} results
            </p>
            <div className="overflow-auto border rounded">
              <div id="reportTable">
  <table className="min-w-full text-sm">

                <thead className="bg-gray-100 text-left">
                  <tr>
                    {selectedColumns.map((col) => (
                      <th key={col} className="p-2 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-t">
                      {selectedColumns.map((col) => (
                        <td key={col} className="p-2">
                          {(() => {
                            switch (col) {
                              case "Field":
                                return job.fieldName;
                              case "Farm":
                                return job.farmName;
                              case "Crop":
                                return job.crop;
                              case "Date":
                                return job.jobDate;

                              case "Acres":
                                return job.acres;
                              case "Job Type":
                                return job.jobType?.name;
                              case "Input":
                                return (
                                  <div className="whitespace-pre-line">
                                    {(job.products || [])
                                      .map((p) => `${p.productName || "—"}`)
                                      .join("\n")}
                                  </div>
                                );

                              case "Rate":
                                return (
                                  <div className="whitespace-pre-line">
                                    {(job.products || [])
                                      .map(
                                        (p) =>
                                          `${p.rate ?? "—"} ${p.unit || ""}`
                                      )
                                      .join("\n")}
                                  </div>
                                );

                              case "Total Applied":
                                return (
                                  <div className="whitespace-pre-line">
                                    {(job.products || [])
                                      .map((p) => {
                                        const rawTotal =
                                          (p.rate ?? 0) * (job.acres || 0);
                                        const isSeed =
                                          p.unit?.includes("seeds") ||
                                          p.unit?.includes("population");
                                        let final = rawTotal;
                                        let suffix =
                                          p.unit?.split("/")?.[0] || "";

                                        if (isSeed) {
                                          const crop =
                                            p.crop?.toLowerCase?.() ||
                                            job.crop?.toLowerCase?.() ||
                                            "";
                                          const seedsPerUnit = crop.includes(
                                            "rice"
                                          )
                                            ? 900000
                                            : crop.includes("soy")
                                            ? 140000
                                            : null;

                                          if (seedsPerUnit) {
                                            final = rawTotal / seedsPerUnit;
                                            suffix = "units";
                                          }
                                        }

                                        return `${final.toFixed(2)} ${suffix}`;
                                      })
                                      .join("\n")}
                                  </div>
                                );

                              case "Vendor":
                                return (job.products || [])
                                  .map((p) => p.vendor)
                                  .join(", ");
                              case "Operator":
                                return job.operator;
                              case "Landowner":
                                return job.landowner;
                              default:
                                return "";
                            }
                          })()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
</div>

            </div>
          </div>
        )}
      </div>

      {/* Right side: Filters and Controls */}
      <div className="w-full md:w-72 border-l px-4 py-6 space-y-4">
        {Object.entries(filterOptions).map(([key, options]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
              {key}
            </label>
            <Select
              isMulti
              options={options.map((val) => ({ value: val, label: val }))}
              onChange={(selected) => handleFilterChange(key, selected)}
              placeholder={`Select ${key}`}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Report Fields
          </label>
          <div className="flex flex-col space-y-1">
            {columnOptions.map((col) => (
              <label key={col} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col)}
                  onChange={(e) => {
                    setSelectedColumns((prev) =>
                      e.target.checked
                        ? [...prev, col]
                        : prev.filter((c) => c !== col)
                    );
                  }}
                />
                <span>{col}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={handleLoadReport} className="w-full">
            Load Report
          </Button>
          {showResults && (
            <Button onClick={exportCSV} variant="outline" className="w-full">
              Download CSV
            </Button>
          )}
          <Button onClick={exportPDF} variant="outline" className="w-full">
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
