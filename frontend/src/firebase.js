import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDGucQzgIbj_a-NJNiG4xN7LR4xLa5EfP0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-resume-analyzer-22955.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-resume-analyzer-22955",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-resume-analyzer-22955.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "485674314485",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:485674314485:web:0db421a773079aa3f8f3bc",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1PNH51K8P4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
