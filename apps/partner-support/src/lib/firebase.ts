// packages/apps/partner-support/src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// IMPORTANT: Use the same Firebase config as your meno-wellness app
// These environment variables should be defined in a .env.local file
// located in the root of the 'partner-support' application (packages/apps/partner-support/.env.local).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Define a unique name for this Firebase app instance within the monorepo.
// This prevents re-initialization errors if Firebase is initialized elsewhere.
const appName = "partner-support";

// Initialize Firebase.
// It checks if an app with the given name already exists to prevent duplicate initialization.
const app = getApps().find((existingApp: { name: string; }) => existingApp.name === appName) || initializeApp(firebaseConfig, appName);

// Get the authentication, Firestore, and Functions service instances from the initialized app.
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Export the initialized app, auth, db, and functions instances for use throughout the application.
export { app, auth, db, functions };
