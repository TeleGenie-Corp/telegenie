import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  projectId: "telegenie-studio",
  appId: "1:715095782868:web:649db8bda4a957dc40d241",
  storageBucket: "telegenie-studio.firebasestorage.app",
  apiKey: "AIzaSyANwhP5B-Txmea2tjyxR9yrVVWWKysrlI8",
  authDomain: "telegenie-studio.firebaseapp.com",
  messagingSenderId: "715095782868",
  measurementId: "G-GVY6EKSY05"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

import { enableIndexedDbPersistence } from 'firebase/firestore'; 

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        // ...
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        // ...
    }
});

export default app;
