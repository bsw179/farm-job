import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export default function Fields({ cropYear }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchFields() {
      try {
        const db = getFirestore(getApp());
        const querySnapshot = await getDocs(collection(db, 'fields'));
        const fieldData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setFields(fieldData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching fields:', err);
      }
    }

    fetchFields();
  }, []);

  if (loading) return <div>Loading fields...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Fields</h2>
      {fields.length === 0 ? (
        <div className="text-gray-500 italic">No fields found.</div>
      ) : (
        <table className="w-full text-left border-t border-gray-200">
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
                <td className="py-2 border-b font-medium text-blue-700">{field.name}</td>
                <td className="py-2 border-b">{field.farm || '-'}</td>
                <td className="py-2 border-b">{field.acres || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
