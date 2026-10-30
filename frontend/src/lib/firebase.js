import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// The browser only uses Firebase for signing in. All data goes through the API.
// Values come from frontend/.env.local (see .env.example); they are not secret.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain);

if (!firebaseConfigured) {
  console.warn("Firebase is not configured: sign-in is disabled. See frontend/.env.example.");
}

export const auth = firebaseConfigured ? getAuth(initializeApp(config)) : null;
