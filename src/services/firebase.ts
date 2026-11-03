import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  Firestore
} from 'firebase/firestore';

// Environment variables configuration with fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDiaeCpePtOXdng_vffdwfZvixyVtJdkYM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "finanzas-vzla-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "finanzas-vzla-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "finanzas-vzla-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "85090607903",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:85090607903:web:96ba1c715a7efd892ac62a"
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with robust Offline Persistence Cache
let firestoreDb: Firestore;

try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.info('[Firebase] Firestore persistent local cache initialized successfully (multi-tab enabled).');
} catch (error) {
  console.warn('[Firebase] Warning initializing persistent cache, falling back to standard Firestore:', error);
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// Auth helper exports
export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
export type { User };
