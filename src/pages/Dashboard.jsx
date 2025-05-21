import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  ClipboardList,
  PlusSquare,
  BarChart2,
  Activity
} from 'lucide-react';
import { CalendarDays } from 'lucide-react';
import { useUser } from "@/context/UserContext";
import { useState } from "react";
import JobEditorModal from "@/components/JobEditorModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useUser();

  const [showJobModal, setShowJobModal] = useState(false);

  const cards = [
    {
      title: "Fields",
      icon: <MapPin className="w-6 h-6 text-blue-600" />,
      onClick: () => navigate("/fields"),
    },
    {
      title: "Jobs",
      icon: <ClipboardList className="w-6 h-6 text-green-600" />,
      onClick: () => navigate("/jobs"),
    },
    role !== "viewer" && {
      title: "Create Job",
      icon: <PlusSquare className="w-6 h-6 text-indigo-600" />,
      onClick: () => setShowJobModal(true),
    },
    {
      title: "Reports",
      icon: <BarChart2 className="w-6 h-6 text-purple-600" />,
      onClick: () => navigate("/reports"),
    },
    {
      title: "Field Metrics",
      icon: <Activity className="w-6 h-6 text-red-600" />,
      onClick: () => navigate("/metrics"),
    },
    {
      title: "Calendar",
      icon: <CalendarDays className="w-6 h-6 text-teal-600" />,
      onClick: () => navigate("/calendar"),
    },
    {
      title: "Crop Maps",
      icon: <MapPin className="w-6 h-6 text-yellow-600" />,
      onClick: () => navigate("/crop-maps"),
    },

  ].filter(Boolean); // removes false items like Create Job for viewers

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">📊 Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={card.onClick}
            className="bg-white hover:shadow-lg transition cursor-pointer border rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center shadow-sm"
          >
            {card.icon}
            <h2 className="text-lg font-semibold">{card.title}</h2>
          </div>
        ))}
      </div>

      {showJobModal && (
        <JobEditorModal
          isOpen={showJobModal}
          onClose={() => setShowJobModal(false)}
          initialJobs={[]}
        />
      )}
    </div>
  );
}

