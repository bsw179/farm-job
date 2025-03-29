// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYzAhsCVeIH-Fh1HBTrjpl-r8pkS-h1TY",
  authDomain: "farm-job.firebaseapp.com",
  projectId: "farm-job",
  storageBucket: "farm-job.firebasestorage.app",
  messagingSenderId: "352177686150",
  appId: "1:352177686150:web:d9e81d0a95ca14378c7307"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Add this line to export your Firestore database
const db = getFirestore(app);
export { db };
