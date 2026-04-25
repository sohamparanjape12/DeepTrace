const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Basic .env.local parser
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '');
    }
  });
}

loadEnv();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const assetId = '54c03193-7478-4223-987b-5aa124862480';

async function check() {
  console.log('Checking asset:', assetId);
  console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  
  const snap = await db.collection('assets').doc(assetId).get();
  if (snap.exists) {
    console.log('Asset found!');
    console.log('Data:', snap.data());
  } else {
    console.log('Asset NOT found.');
    
    // List some assets to see what's there
    const list = await db.collection('assets').limit(10).get();
    console.log('Existing assets count in collection "assets":', list.size);
    list.forEach(doc => console.log(' - ', doc.id));
  }
}

check().catch(console.error);
