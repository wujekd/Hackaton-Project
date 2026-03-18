import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyC-pJW_7T53UkMFwiLJA4-rlrwi9sFysZA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "mdxnetwork.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "mdxnetwork",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "mdxnetwork.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "1044486854040",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:1044486854040:web:fb33fa68db5649c41547ed",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-L3J011Q1C3",
};

function parsePort(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : null;
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "europe-west1");

const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";
const authEmulatorPort = parsePort(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT) ?? 9099;
const firestoreEmulatorPort =
  parsePort(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT) ?? 8080;
const functionsEmulatorPort = parsePort(import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT);
const storageEmulatorPort = parsePort(import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT);

let emulatorsConnected = false;

function connectFirebaseEmulators(): void {
  if (!useFirebaseEmulators || emulatorsConnected) {
    return;
  }

  connectAuthEmulator(auth, `http://${emulatorHost}:${authEmulatorPort}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, emulatorHost, firestoreEmulatorPort);

  if (functionsEmulatorPort !== null) {
    connectFunctionsEmulator(functions, emulatorHost, functionsEmulatorPort);
  }

  if (storageEmulatorPort !== null) {
    connectStorageEmulator(storage, emulatorHost, storageEmulatorPort);
  }

  emulatorsConnected = true;
}

connectFirebaseEmulators();
