// fetchRainfall.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fetch from 'node-fetch';
import * as turf from '@turf/turf';
import dotenv from 'dotenv';
import { format, subDays } from 'date-fns';
dotenv.config();

// 🔐 Firebase config
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

// 🌧️ Visual Crossing API
const VC_KEY = process.env.VISUAL_CROSSING_KEY;

async function main() {
  const fieldSnap = await getDocs(collection(db, 'fields'));
  const fields = fieldSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  for (const field of fields) {
    let boundary = field.boundary?.geojson || field.boundary;
    if (typeof boundary === 'string') {
      try {
        boundary = JSON.parse(boundary);
      } catch {
        console.warn(`⚠️ Skipping ${field.fieldName || field.id} — invalid boundary`);
        continue;
      }
    }

    let center;
    try {
      center = turf.centroid(boundary).geometry.coordinates;
    } catch {
      console.warn(`❌ Could not get centroid for ${field.fieldName || field.id}`);
      continue;
    }

    const [lng, lat] = center;
    const end = format(new Date(), 'yyyy-MM-dd');
const start = '2025-03-01'; // pull from March 1 onward

    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lng}/${start}/${end}?unitGroup=us&key=${VC_KEY}&include=days`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (!json.days) throw new Error('Invalid response from Visual Crossing');

      for (const day of json.days) {
        const docId = `${field.id}_${day.datetime}`;
        await setDoc(doc(db, 'rainfallLogs', docId), {
          fieldId: field.id,
          date: day.datetime,
          inches: day.precip || 0,
          source: 'VisualCrossing',
        });

        console.log(`📅 ${field.fieldName || field.id} — ${day.datetime}: ${day.precip || 0} in`);
      }
    } catch (err) {
      console.error(`❌ Error fetching for ${field.fieldName || field.id}:`, err.message);
    }
  }

  console.log('✅ Visual Crossing rainfall fetch complete.');
}

main();
