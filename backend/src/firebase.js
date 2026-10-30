import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Admin access to Firebase. The backend is the only thing that reads or writes
 * the database; the browser only uses Firebase for signing in.
 *
 * Credentials, in order:
 *  1. FIREBASE_SERVICE_ACCOUNT  - the whole key file as JSON (use this on a host like Render)
 *  2. GOOGLE_APPLICATION_CREDENTIALS - path to the key file (use this locally)
 */
function app() {
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT;
    initializeApp({
      credential: json ? cert(JSON.parse(json)) : applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  return getApps()[0];
}

export const getDb = () => getFirestore(app());

/** Checks a browser's ID token. Rejects revoked tokens (e.g. after a password reset). */
export const verifyIdToken = (token) => getAuth(app()).verifyIdToken(token, true);

export const getAdminAuth = () => getAuth(app());

export const getBucket = () => getStorage(app()).bucket();
