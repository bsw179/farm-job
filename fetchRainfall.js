// fetchRainfall.js
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { format, subDays, addDays } from 'date-fns';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

// Helper for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const serviceAccount = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './service-accounts/serviceAccountKey.json'), 'utf8')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = getFirestore();
  const VC_KEY = process.env.VISUAL_CROSSING_KEY;

  const today = new Date();
  const startDate = format(subDays(today, 7), 'yyyy-MM-dd');  // Past 7 days
  const endDate = format(addDays(today, 15), 'yyyy-MM-dd');    // Next 15 days

  console.log(`⏰ Fetching rainfall/forecast from ${startDate} to ${endDate}`);

  const fieldsSnap = await db.collection('fields').get();
  const fields = fieldsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`🔍 Found ${fields.length} fields total`);

  for (const field of fields) {
    let boundary = field.boundary?.geojson || field.boundary;

    if (typeof boundary === 'string') {
      try {
        boundary = JSON.parse(boundary);
      } catch (error) {
        console.warn(`⚠️ Skipping field ${field.fieldName || field.id} — boundary parse error`);
        continue;
      }
    }

    let center;
    try {
      center = boundary.type === 'Feature' ? boundary.geometry.coordinates : boundary.coordinates;
      if (Array.isArray(center[0][0])) center = center[0]; // Flatten if needed
      center = [center[0][0], center[0][1]];
    } catch (error) {
      console.warn(`❌ Skipping field ${field.fieldName || field.id} — invalid centroid`);
      continue;
    }

    const [lng, lat] = center;
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lng}/${startDate}/${endDate}?unitGroup=us&key=${VC_KEY}&include=days`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (!json.days || !Array.isArray(json.days)) {
        console.error(`❌ Invalid response for field ${field.fieldName || field.id}`);
        continue;
      }

      for (const day of json.days) {
        const dayDate = new Date(day.datetime);
        const isFuture = dayDate > today;
        const docId = `${field.id}_${day.datetime}`;

        if (!isFuture) {
          // 🌧️ Save rainfall
          try {
            await db.collection('rainfallLogs').doc(docId).set({
              fieldId: field.id,
              date: day.datetime,
              precip: day.precip || 0,
              tempmax: day.tempmax || null,
              tempmin: day.tempmin || null,
              windspeed: day.windspeed || null,
              windgust: day.windgust || null,
              humidity: day.humidity || null,
              conditions: day.conditions || '',
              source: day.source || '',
            });
            console.log(`🌧️ Saved rainfall for ${field.fieldName || field.id} — ${day.datetime}: ${day.precip || 0} in`);
          } catch (error) {
            console.error(`❌ Failed to save rainfall for ${field.fieldName || field.id} — ${day.datetime}:`, error.message);
          }
        } else {
          // 🔮 Save forecast
          try {
            await db.collection('forecastLogs').doc(docId).set({
              fieldId: field.id,
              date: day.datetime,
              forecastInches: day.precip || 0,
              precipprob: day.precipprob || 0,
              tempmax: day.tempmax || null,
              tempmin: day.tempmin || null,
              windspeed: day.windspeed || null,
              windgust: day.windgust || null,
              humidity: day.humidity || null,
              conditions: day.conditions || '',
              source: day.source || '',
            });
            console.log(`🔮 Saved forecast for ${field.fieldName || field.id} — ${day.datetime}: ${day.precip || 0} in`);
          } catch (error) {
            console.error(`❌ Failed to save forecast for ${field.fieldName || field.id} — ${day.datetime}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Fetch failed for ${field.fieldName || field.id}:`, error.message);
    }
  }

  console.log('✅ Rainfall and forecast fetch complete.');
}

main();
