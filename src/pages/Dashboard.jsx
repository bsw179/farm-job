import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  ClipboardList,
  PlusSquare,
  BarChart2,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Fields',
      icon: <MapPin className="w-6 h-6 text-blue-600" />,
      onClick: () => navigate('/fields'),
    },
    {
      title: 'Jobs',
      icon: <ClipboardList className="w-6 h-6 text-green-600" />,
      onClick: () => navigate('/jobs'),
    },
    {
      title: 'Create Job',
      icon: <PlusSquare className="w-6 h-6 text-indigo-600" />,
      onClick: () => navigate('/jobs/create'),
    },
    {
      title: 'Reports',
      icon: <BarChart2 className="w-6 h-6 text-purple-600" />,
      onClick: () => navigate('/reports'),
    },
    {
      title: 'Field Metrics',
      icon: <Activity className="w-6 h-6 text-red-600" />,
      onClick: () => navigate('/metrics'),
    },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Room for stats/widgets later */}
      {/* <div>Future stats/graphs here</div> */}

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
    </div>
  );
}
