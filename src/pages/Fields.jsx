import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Fields({ cropYear }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'fields'));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setFields(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading fields:', err);
      }
    };
    fetchFields();
  }, []);

  if (loading) return <div className="text-gray-500">Loading fields...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Your Fields</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Field Name</th>
            <th className="py-2">Farm</th>
            <th className="py-2">Acres</th>
            <th className="py-2">County</th>
            <th className="py-2">Tract #</th>
            <th className="py-2">Field #</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr
              key={field.id}
              className="border-b hover:bg-blue-50 cursor-pointer"
              onClick={() => navigate(`/fields/${field.id}`)}
            >
              <td className="py-2">{field.fieldName || '-'}</td>
              <td className="py-2">{field.farmName || '-'}</td>
              <td className="py-2">{field.fsaAcres || field.gpsAcres || '-'}</td>
              <td className="py-2">{field.county || '-'}</td>
              <td className="py-2">{field.tractNumber || '-'}</td>
              <td className="py-2">{field.fsaFieldNumber || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
