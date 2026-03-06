import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserProfile } from "../types/auth";

const googleProvider = new GoogleAuthProvider();

async function ensureUserDoc(user: User): Promise<UserProfile> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const profile: Omit<UserProfile, "createdAt"> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    uid: user.uid,
    email: user.email ?? "",
    username: user.displayName ?? undefined,
    nickname: "",
    description: "",
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, profile);
  const fresh = await getDoc(ref);
  return fresh.data() as UserProfile;
}

export const AuthService = {
  signIn: async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user);
    return cred;
  },

  signUp: async (email: string, password: string, username?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const ref = doc(db, "users", cred.user.uid);
    await setDoc(ref, {
      uid: cred.user.uid,
      email,
      username: username ?? null,
      nickname: "",
      description: "",
      createdAt: serverTimestamp(),
    });
    return cred;
  },

  signInWithGoogle: async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(cred.user);
    return cred;
  },

  ensureUserProfile: async (user: User): Promise<UserProfile> => ensureUserDoc(user),

  signOut: () => firebaseSignOut(auth),

  onAuthStateChanged: (cb: (user: User | null) => void): Unsubscribe =>
    firebaseOnAuthStateChanged(auth, cb),

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  },

  updateInterests: async (uid: string, interests: string[]): Promise<void> => {
    await updateDoc(doc(db, "users", uid), { interests });
  },

  updateDescription: async (uid: string, description: string): Promise<void> => {
    await updateDoc(doc(db, "users", uid), { description });
  },

  updateNickname: async (uid: string, nickname: string): Promise<void> => {
    await updateDoc(doc(db, "users", uid), { nickname });
  },
};
