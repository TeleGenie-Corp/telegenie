import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function readEnvLocal(key: string): string | undefined {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const contents = readFileSync(envPath, 'utf8');
    const line = contents
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${key}=`));
    if (!line) return undefined;
    return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return undefined;
  }
}

const envProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? readEnvLocal('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
const rawStorageBucket =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
  process.env.FIREBASE_STORAGE_BUCKET ??
  readEnvLocal('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') ??
  readEnvLocal('FIREBASE_STORAGE_BUCKET');
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? readEnvLocal('FIREBASE_SERVICE_ACCOUNT_KEY');
const serviceAccountProjectId = serviceAccountJson
  ? (() => {
      try {
        return JSON.parse(serviceAccountJson).project_id as string | undefined;
      } catch {
        return undefined;
      }
    })()
  : undefined;
const projectId = envProjectId ?? serviceAccountProjectId;
const storageBucket = rawStorageBucket ?? (projectId ? `${projectId}.firebasestorage.app` : undefined);

// Prevent multiple initializations in dev
const globalWithFirebase = global as typeof globalThis & {
  firebaseAdminApp: App;
};

let app: App;

if (!getApps().length) {
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId,
      storageBucket,
    }) as App;
  } else {
    // Default to Google Application Default Credentials (works in App Hosting / Functions)
    app = initializeApp({
      projectId,
      storageBucket,
    }) as App;
  }
} else {
  app = getApps()[0] as App;
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export { app as adminApp };
