import React from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JobEditorModal({ isOpen, onClose, initialJobs = [] }) {
  const isEditing = initialJobs.length > 0;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen bg-black/50 px-4">
        <Dialog.Panel className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 overflow-y-auto max-h-[90vh]">
          {/* Modal Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit Job" : "Create Job"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Job Type and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Type
              </label>
              <select className="border rounded w-full p-2">
                <option value="">Select Job Type</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job Date
              </label>
              <input type="date" className="border rounded w-full p-2" />
            </div>
          </div>

          {/* Applicator and Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Applicator
              </label>
              <select className="border rounded w-full p-2">
                <option value="">Select Applicator</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vendor
              </label>
              <select className="border rounded w-full p-2">
                <option value="">Select Vendor</option>
              </select>
            </div>
          </div>

          {/* Product List */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Products</h3>
              <Button size="sm">+ Add Product</Button>
            </div>

            <div className="space-y-3">
              {/* Product rows will go here */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select className="border p-2 rounded col-span-2">
                  <option>Select Product</option>
                </select>
                <input
                  type="text"
                  placeholder="Rate"
                  className="border p-2 rounded"
                />
                <select className="border p-2 rounded">
                  <option>Unit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={3}
              className="w-full border rounded p-2"
              placeholder="Optional notes..."
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-between items-center mt-6">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="default">
              {isEditing ? "Update Job(s)" : "Create Job(s)"}
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
