import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onIdTokenChanged as firebaseOnIdTokenChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { deleteField, doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AuthResult, UserProfile } from "../types/auth";
import type { CustomTheme, ThemePreference } from "../types/theme";
import {
  normalizeCustomThemes,
  sanitizeActiveCustomThemeId,
} from "./theme.service";

const googleProvider = new GoogleAuthProvider();

function extractServerErrorCode(error: unknown): string | null {
  const firebaseError = error as (FirebaseError & {
    customData?: { _serverResponse?: string };
  }) | undefined;
  const response = firebaseError?.customData?._serverResponse;
  if (!response) {
    return null;
  }

  try {
    const parsed = JSON.parse(response) as {
      error?: { message?: string };
    };
    return parsed.error?.message ?? null;
  } catch {
    return null;
  }
}

function getAuthErrorMessage(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code;
  const serverCode = extractServerErrorCode(error);

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. If you registered with Google, use Google sign-in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account already exists for that email. Try signing in instead.";
    case "auth/weak-password":
      return "Choose a stronger password.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/requires-recent-login":
      return "Your session is too old for this action. Sign in again and try once more.";
    case "auth/invalid-action-code":
      return "This verification action is no longer valid.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled before it finished.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup.";
    case "auth/account-exists-with-different-credential":
      return "That email is already linked to a different sign-in method.";
    default:
      switch (serverCode) {
        case "TOO_MANY_ATTEMPTS_TRY_LATER":
          return "Too many verification email attempts. Wait a few minutes and try again.";
        case "INVALID_SENDER":
          return "Firebase email sender configuration is invalid. Check the Auth email template settings in Firebase Console.";
        case "INVALID_MESSAGE_PAYLOAD":
          return "Firebase email template configuration is invalid. Check the verification email template in Firebase Console.";
        case "EMAIL_NOT_FOUND":
          return "This account no longer exists. Sign in again or create the account again.";
        case "USER_DISABLED":
          return "This account has been disabled.";
        case "OPERATION_NOT_ALLOWED":
          return "Email actions are not available for this Firebase project configuration.";
        default:
          return error instanceof Error ? error.message : "Authentication failed.";
      }
  }
}

async function sendVerificationEmailToUser(user: User): Promise<void> {
  try {
    await user.reload();
    await user.getIdToken(true);
    await sendEmailVerification(user, {
      url: `${window.location.origin}/verify-email?verified=1`,
    });
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

function normalizeUserProfile(profile: UserProfile): UserProfile {
  const source = profile as UserProfile & {
    customTheme?: unknown;
    customThemes?: unknown;
    activeCustomThemeId?: unknown;
  };
  const customThemes = normalizeCustomThemes(source.customThemes ?? source.customTheme) ?? [];
  const explicitActiveCustomThemeId =
    typeof source.activeCustomThemeId === "string" ? source.activeCustomThemeId : null;
  const legacyActiveCustomThemeId =
    source.customTheme && source.themePreference && source.themePreference !== "system"
      ? customThemes.find((customTheme) => customTheme.baseTheme === source.themePreference)?.id ?? null
      : null;
  const activeCustomThemeId = sanitizeActiveCustomThemeId(
    explicitActiveCustomThemeId ?? legacyActiveCustomThemeId,
    customThemes,
  );

  return {
    ...profile,
    customThemes: customThemes.length > 0 ? customThemes : undefined,
    activeCustomThemeId: activeCustomThemeId ?? undefined,
  };
}

async function ensureUserDoc(user: User): Promise<UserProfile> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return normalizeUserProfile(snap.data() as UserProfile);
  }

  const profile: Omit<UserProfile, "createdAt"> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    uid: user.uid,
    email: user.email ?? "",
    username: user.displayName ?? undefined,
    nickname: "",
    description: "",
    themePreference: "light",
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, profile);
  const fresh = await getDoc(ref);
  return normalizeUserProfile(fresh.data() as UserProfile);
}

export const AuthService = {
  signIn: async (email: string, password: string): Promise<AuthResult> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await ensureUserDoc(cred.user);
      return { emailVerified: cred.user.emailVerified };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  signUp: async (email: string, password: string, username?: string): Promise<AuthResult> => {
    try {
      const normalizedEmail = email.trim();
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const ref = doc(db, "users", cred.user.uid);
      await setDoc(ref, {
        uid: cred.user.uid,
        email: normalizedEmail,
        username: username?.trim() || null,
        nickname: "",
        description: "",
        themePreference: "light",
        createdAt: serverTimestamp(),
      });
      await sendVerificationEmailToUser(cred.user);
      return { emailVerified: cred.user.emailVerified };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  signInWithGoogle: async (): Promise<AuthResult> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUserDoc(cred.user);
      return { emailVerified: cred.user.emailVerified };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  ensureUserProfile: async (user: User): Promise<UserProfile> => ensureUserDoc(user),

  signOut: () => firebaseSignOut(auth),

  onAuthStateChanged: (cb: (user: User | null) => void): Unsubscribe =>
    firebaseOnIdTokenChanged(auth, cb),

  resendEmailVerification: async (): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to verify your email.");
    }

    await sendVerificationEmailToUser(auth.currentUser);
  },

  refreshCurrentUser: async (): Promise<User | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    await currentUser.reload();
    await currentUser.getIdToken(true);
    return auth.currentUser;
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? normalizeUserProfile(snap.data() as UserProfile) : null;
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

  updateThemeSelection: async (
    uid: string,
    selection: { themePreference?: ThemePreference; activeCustomThemeId?: string | null },
  ): Promise<void> => {
    const updates: Record<string, unknown> = {};

    if (selection.themePreference) {
      updates.themePreference = selection.themePreference;
    }

    if ("activeCustomThemeId" in selection) {
      updates.activeCustomThemeId = selection.activeCustomThemeId ?? deleteField();
    }

    await updateDoc(doc(db, "users", uid), updates);
  },

  updateCustomThemes: async (
    uid: string,
    customThemes: CustomTheme[],
    activeCustomThemeId: string | null,
  ): Promise<void> => {
    await updateDoc(doc(db, "users", uid), {
      customThemes: customThemes.length > 0 ? customThemes : deleteField(),
      activeCustomThemeId: activeCustomThemeId ?? deleteField(),
    });
  },
};
