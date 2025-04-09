// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBYzAhsCVeIH-Fh1HBTrjpl-r8pkS-h1TY",
  authDomain: "farm-job.firebaseapp.com",
  projectId: "farm-job",
  storageBucket: "farm-job.appspot.com", // 🔧 fixed typo: .app -> .appspot.com
  messagingSenderId: "352177686150",
  appId: "1:352177686150:web:d9e81d0a95ca14378c7307"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
