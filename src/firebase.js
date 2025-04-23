import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBYzAhsCVeIH-Fh1HBTrjpl-r8pkS-h1TY",
  authDomain: "farm-job.firebaseapp.com",
  projectId: "farm-job",
  storageBucket: "farm-job.appspot.com",
  messagingSenderId: "352177686150",
  appId: "1:352177686150:web:d9e81d0a95ca14378c7307"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ FORCE USE OF THE BUCKET YOU SET CORS ON
const storage = getStorage(app, 'gs://farm-job.firebasestorage.app');

export { db, auth, storage };
