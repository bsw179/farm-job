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
        const querySnapshot = await getDocs(collection(db, 'fields'));
        const fieldData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFields(fieldData);
      } catch (error) {
        console.error('Error fetching fields:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  if (loading) return <div className="text-gray-500">Loading fields…</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-blue-800 mb-4">Your Fields</h2>
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="py-2 border-b">Field Name</th>
            <th className="py-2 border-b">Farm</th>
            <th className="py-2 border-b">Acres</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr
              key={field.id}
              onClick={() => navigate(`/fields/${field.id}`)}
              className="hover:bg-blue-50 cursor-pointer"
            >
              <td className="py-2 border-b">{field.fieldName || '-'}</td>
              <td className="py-2 border-b">{field.farm || '-'}</td>
              <td className="py-2 border-b">{field.acres || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
