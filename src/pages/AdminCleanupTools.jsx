import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function AdminCleanupTools() {
  const handleCheckDuplicateJobIds = async () => {
    const snap = await getDocs(collection(db, "jobsByField"));
    const jobIdMap = {};

    snap.forEach((docSnap) => {
      const job = docSnap.data();
      const jobId = job.jobId;

      if (jobId) {
        if (!jobIdMap[jobId]) {
          jobIdMap[jobId] = [];
        }
        jobIdMap[jobId].push(docSnap.id);
      }
    });

    const duplicates = Object.entries(jobIdMap).filter(
      ([_, docIds]) => docIds.length > 1
    );

    if (duplicates.length === 0) {
      alert("✅ No duplicate jobIds found.");
    } else {
      console.log("🚨 Duplicate jobIds found:", duplicates);
      alert(
        `🚨 Found ${duplicates.length} duplicate jobId(s). Check console for details.`
      );
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">🛠 Admin Cleanup</h2>
      <button
        onClick={handleCheckDuplicateJobIds}
        className="bg-yellow-600 text-white px-4 py-2 rounded shadow hover:bg-yellow-700"
      >
        Check for Duplicate Job IDs
      </button>
    </div>
  );
}
