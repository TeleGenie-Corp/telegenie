import 'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Prevent multiple initializations in dev
const globalWithFirebase = global as typeof globalThis & {
  firebaseAdminApp: App;
};

let app: App;

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
     const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
     app = initializeApp({
       credential: cert(serviceAccount),
       projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
     }) as App;
  } else {
      // Default to Google Application Default Credentials (works in App Hosting / Functions)
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      }) as App;
  }
} else {
  app = getApps()[0] as App;
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
