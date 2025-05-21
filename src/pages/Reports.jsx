// src/pages/Reports.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from "@/context/UserContext";

export default function Reports() {
const reports = [
  {
    title: "Job Summary",
    path: "/reports/job-summary",
    description:
      "Filter jobs by field, type, vendor, operator, and more. Export selected columns to PDF or CSV.",
    icon: "📋",
  },
  {
    title: "Field Cost Summary",
    path: "/reports/field-cost",
    description:
      "Breakdown of seed, fertilizer, chemical, and job costs per acre by field.",
    icon: "🧾",
  },
  {
    title: "Operator & Landowner Summary",
    path: "/reports/partner-summary",
    description:
      "Usage and cost share by operator and landowner, based on expense splits.",
    icon: "👥",
  },
  {
    title: "Product Usage Report",
    path: "/reports/product-usage",
    description:
      "Track applied totals, vendor splits, and partner shares across completed jobs.",
    icon: "🧪",
  },

  {
    title: "Vendor Summary",
    path: "/reports/vendor-summary",
    description:
      "Products purchased and used by vendor, with average cost per unit.",
    icon: "🏪",
  },
  {
    title: "Crop Rotation History",
    path: "/reports/crop-rotation",
    description: "Multi-year crop history and spending per field.",
    icon: "🌾",
  },
  {
    title: "Invoice Ledger",
    path: "/reports/invoice-ledger",
    description: "Line-by-line field expense breakdown with unit conversions.",
    icon: "📑",
  },
  {
    title: "Seeding Report",
    path: "/reports/seeding",
    description:
      "Detailed breakdown of seeding jobs by field, variety, operator, and vendor.",
    icon: "🌱",
  },
  {
    title: "Crop Insurance Report",
    path: "/reports/crop-insurance",
    description:
      "Placeholder for crop insurance summaries grouped by FSA and county data.",
    icon: "🛡️",
  },
  {
    title: "FSA Planting Date Report",
    path: "/reports/planting-dates",
    description:
      "Placeholder for generating FSA-compliant planting date reports.",
    icon: "🗓️",
  },
];
const { role } = useUser();

const visibleReports =
  role === "viewer"
    ? reports.filter(
        (r) => r.title !== "Field Cost Summary" && r.title !== "Invoice Ledger"
      )
    : reports;


  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">📊 Reports</h2>
      <p className="text-gray-600 mb-6">
        View and export summaries for your field activity, seed usage, and more.
      </p>
      <div className="space-y-4">
        {visibleReports.map((r) => (
          <Link
            key={r.title}
            to={r.path}
            className="block border rounded p-4 hover:bg-gray-50 transition"
          >
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              <span className="text-xl">{r.icon}</span> {r.title}
            </h3>
            <p className="text-sm text-gray-600">{r.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
