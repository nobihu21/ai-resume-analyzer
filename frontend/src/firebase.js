import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDGucQzgIbj_a-NJNiG4xN7LR4xLa5EfP0",
  authDomain: "ai-resume-analyzer-22955.firebaseapp.com",
  projectId: "ai-resume-analyzer-22955",
  storageBucket: "ai-resume-analyzer-22955.firebasestorage.app",
  messagingSenderId: "485674314485",
  appId: "1:485674314485:web:0db421a773079aa3f8f3bc",
  measurementId: "G-1PNH51K8P4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

