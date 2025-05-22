import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function AdminCleanupTools() {
  const handleMarkCompletedPlanted = async () => {
    const year = new Date().getFullYear(); // Adjust if needed
    const fieldsSnap = await getDocs(collection(db, "fields"));
    const jobsSnap = await getDocs(collection(db, "jobsByField"));

    const allJobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    let updatedCount = 0;

    for (const docSnap of fieldsSnap.docs) {
      const field = docSnap.data();
      const ref = docSnap.ref;
      const fieldId = docSnap.id;

      const cropData = field.crops?.[year];
      if (!cropData) continue;

      const cropName = cropData.crop?.toLowerCase() || "";
      const isIgnored =
        cropData.isCompleted ||
        cropData.outcome ||
        cropName.includes("fallow") ||
        cropName.includes("idle") ||
        cropName.includes("prevented");

      if (isIgnored) continue;

      const fieldJobs = allJobs.filter(
        (job) =>
          job.fieldId === fieldId &&
          job.cropYear === year &&
          job.jobType?.parentName === "Seeding"
      );

      if (fieldJobs.length > 0) {
        await updateDoc(ref, {
          [`crops.${year}.isCompleted`]: true,
          [`crops.${year}.outcome`]: "planted",
        });
        updatedCount++;
      }
    }

    alert(`✅ Marked ${updatedCount} fields as Completed (Planted).`);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">🛠 Admin Cleanup</h2>
      <button
        onClick={handleMarkCompletedPlanted}
        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
      >
        Mark Fields as Completed (Planted)
      </button>
    </div>
  );
}
