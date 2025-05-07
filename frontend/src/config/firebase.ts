import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBgqbJsGBIYLiwyOm1mikqDnKGSCH7uPW8",
  authDomain: "holdingview-459108.firebaseapp.com",
  projectId: "holdingview-459108",
  storageBucket: "holdingview-459108.firebasestorage.app",
  messagingSenderId: "874720724263",
  appId: "1:874720724263:web:829202a3712192534d5502"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export default app;
