import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

export default app;
