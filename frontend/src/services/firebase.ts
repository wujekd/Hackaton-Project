import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC-pJW_7T53UkMFwiLJA4-rlrwi9sFysZA",
  authDomain: "mdxnetwork.firebaseapp.com",
  projectId: "mdxnetwork",
  storageBucket: "mdxnetwork.firebasestorage.app",
  messagingSenderId: "1044486854040",
  appId: "1:1044486854040:web:fb33fa68db5649c41547ed",
  measurementId: "G-L3J011Q1C3",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "europe-west1");
