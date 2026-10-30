import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

function requireAuth() {
  if (!auth) throw Object.assign(new Error("Sign-in isn't set up yet."), { code: "app/not-configured" });
  return auth;
}

export const signIn = (email, password) =>
  signInWithEmailAndPassword(requireAuth(), email.trim(), password);

export async function signUp(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  if (name.trim()) await updateProfile(user, { displayName: name.trim() });
  await sendEmailVerification(user).catch(() => {}); // nice to have, never blocks sign-up
  return user;
}

export const signInWithGoogle = () => signInWithPopup(requireAuth(), new GoogleAuthProvider());

export const resetPassword = (email) => sendPasswordResetEmail(requireAuth(), email.trim());

export const signOut = () => (auth ? firebaseSignOut(auth) : Promise.resolve());

/** Current user's ID token for API calls, or null for visitors. */
export async function getIdToken() {
  return auth?.currentUser ? auth.currentUser.getIdToken() : null;
}

/** Turns Firebase error codes into sentences people can act on. */
export function authErrorMessage(err) {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password don't match. Try again or reset your password.";
    case "auth/email-already-in-use":
      return "There's already an account with that email. Try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "Please choose a stronger password (at least 8 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/network-request-failed":
      return "Couldn't connect. Check your internet connection.";
    case "app/not-configured":
      return err.message;
    default:
      return "Something went wrong. Please try again.";
  }
}
