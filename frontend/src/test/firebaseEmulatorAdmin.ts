import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve(process.cwd(), "../functions/package.json"));

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

type AdminApp = object;

type AdminUserRecord = {
  uid: string;
};

type CreateAdminUserParams = {
  uid?: string;
  email: string;
  password: string;
  displayName?: string;
  emailVerified?: boolean;
};

type AdminAuth = {
  createUser(params: CreateAdminUserParams): Promise<AdminUserRecord>;
  deleteUser(uid: string): Promise<void>;
};

type AdminDocumentReference = {
  set(data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  delete(): Promise<void>;
};

type AdminFirestore = {
  doc(path: string): AdminDocumentReference;
};

type AdminFieldValueModule = {
  serverTimestamp(): unknown;
};

type AdminAppModule = {
  getApps(): AdminApp[];
  initializeApp(options: { projectId: string }): AdminApp;
};

type AdminAuthModule = {
  getAuth(app?: AdminApp): AdminAuth;
};

type AdminFirestoreModule = {
  getFirestore(app?: AdminApp): AdminFirestore;
  FieldValue: AdminFieldValueModule;
};

const adminAppModule = require("firebase-admin/app") as AdminAppModule;
const adminAuthModule = require("firebase-admin/auth") as AdminAuthModule;
const adminFirestoreModule = require("firebase-admin/firestore") as AdminFirestoreModule;

const adminApp =
  adminAppModule.getApps()[0] ?? adminAppModule.initializeApp({ projectId: "mdxnetwork" });

const adminAuth = adminAuthModule.getAuth(adminApp);
const adminDb = adminFirestoreModule.getFirestore(adminApp);
const { FieldValue } = adminFirestoreModule;

type SeedUserOptions = {
  uid?: string;
  email: string;
  password?: string;
  username?: string;
  verified?: boolean;
  profile?: Record<string, unknown>;
};

export type SeededUser = {
  uid: string;
  email: string;
  password: string;
};

function uniqueId(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function uniqueEmail(label: string): string {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.test`;
}

export async function seedEmulatorUser(options: SeedUserOptions): Promise<SeededUser> {
  const uid = options.uid ?? uniqueId("user");
  const password = options.password ?? "StrongPass123!";

  await adminAuth.createUser({
    uid,
    email: options.email,
    password,
    displayName: options.username,
    emailVerified: options.verified ?? false,
  });

  await adminDb.doc(`users/${uid}`).set({
    uid,
    email: options.email,
    username: options.username ?? null,
    nickname: "",
    description: "",
    themePreference: "light",
    createdAt: FieldValue.serverTimestamp(),
    ...(options.profile ?? {}),
  });

  return {
    uid,
    email: options.email,
    password,
  };
}

export async function setEmulatorDocument(
  path: string,
  data: Record<string, unknown>,
  options?: { merge?: boolean },
): Promise<void> {
  await adminDb.doc(path).set(data, options);
}

export async function deleteEmulatorDocument(path: string): Promise<void> {
  await adminDb.doc(path).delete();
}
