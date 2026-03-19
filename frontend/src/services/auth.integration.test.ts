import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterEach, describe, expect, it } from "vitest";
import { auth, db } from "./firebase";
import { AuthService } from "./auth.service";
import {
  deleteEmulatorDocument,
  seedEmulatorUser,
  uniqueEmail,
} from "../test/firebaseEmulatorAdmin";

describe("AuthService integration with Firebase emulators", () => {
  afterEach(async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }

    window.localStorage.clear();
  });

  it("signs up, creates a profile document, and signs back in", async () => {
    const email = uniqueEmail("signup");
    const password = "StrongPass123!";
    const username = "Integration User";

    const signUpResult = await AuthService.signUp(email, password, username);

    expect(signUpResult.emailVerified).toBe(false);
    expect(auth.currentUser?.email).toBe(email);

    if (!auth.currentUser) {
      throw new Error("Expected the auth emulator to create and sign in the user.");
    }

    const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));

    expect(profileSnap.exists()).toBe(true);
    expect(profileSnap.data()).toMatchObject({
      uid: auth.currentUser.uid,
      email,
      username,
      nickname: "",
      description: "",
      themePreference: "light",
    });

    await AuthService.signOut();
    expect(auth.currentUser).toBeNull();

    const signInResult = await AuthService.signIn(email, password);

    expect(signInResult.emailVerified).toBe(false);
    expect(auth.currentUser?.email).toBe(email);
  });

  it("rejects writes to another user's profile document", async () => {
    const userOneEmail = uniqueEmail("user-one");
    const userTwoEmail = uniqueEmail("user-two");
    const password = "StrongPass123!";

    await AuthService.signUp(userOneEmail, password, "User One");
    const userOneUid = auth.currentUser?.uid;
    await AuthService.signOut();

    await AuthService.signUp(userTwoEmail, password, "User Two");

    if (!userOneUid) {
      throw new Error("Expected the first user to be created before switching accounts.");
    }

    await expect(
      setDoc(
        doc(db, "users", userOneUid),
        {
          uid: userOneUid,
          email: userOneEmail,
          username: "Hijacked",
          nickname: "Hijacked",
          description: "Hijacked",
          themePreference: "light",
        },
        { merge: true },
      ),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("creates a missing profile document on sign-in", async () => {
    const seededUser = await seedEmulatorUser({
      email: uniqueEmail("missing-profile"),
      username: "Needs Profile",
    });

    await deleteEmulatorDocument(`users/${seededUser.uid}`);

    const signInResult = await AuthService.signIn(seededUser.email, seededUser.password);

    expect(signInResult.emailVerified).toBe(false);
    expect(auth.currentUser?.uid).toBe(seededUser.uid);

    const profileSnap = await getDoc(doc(db, "users", seededUser.uid));
    expect(profileSnap.exists()).toBe(true);
    expect(profileSnap.data()).toMatchObject({
      uid: seededUser.uid,
      email: seededUser.email,
      nickname: "",
      description: "",
      themePreference: "light",
    });
  });

  it("maps duplicate sign-up errors to a user-friendly message", async () => {
    const email = uniqueEmail("duplicate-signup");
    const password = "StrongPass123!";

    await AuthService.signUp(email, password, "First User");
    await AuthService.signOut();

    await expect(AuthService.signUp(email, password, "Second User")).rejects.toThrow(
      "An account already exists for that email. Try signing in instead.",
    );
  });

  it("requires a signed-in user before resending a verification email", async () => {
    await expect(AuthService.resendEmailVerification()).rejects.toThrow(
      "You must be signed in to verify your email.",
    );
  });

  it("reports verified feature access for a verified emulator user", async () => {
    const seededUser = await seedEmulatorUser({
      email: uniqueEmail("verified-access"),
      username: "Verified User",
      verified: true,
    });

    await AuthService.signIn(seededUser.email, seededUser.password);

    if (!auth.currentUser) {
      throw new Error("Expected the verified emulator user to be signed in.");
    }

    const hasAccess = await AuthService.getVerifiedFeatureAccess(auth.currentUser, {
      forceRefresh: true,
    });

    expect(auth.currentUser.emailVerified).toBe(true);
    expect(hasAccess).toBe(true);
  });

  it("updates the signed-in user's profile fields", async () => {
    const seededUser = await seedEmulatorUser({
      email: uniqueEmail("profile-update"),
      username: "Profile User",
      verified: true,
    });

    await AuthService.signIn(seededUser.email, seededUser.password);

    await AuthService.updateNickname(seededUser.uid, "Night Owl");
    await AuthService.updateDescription(seededUser.uid, "Builds campus projects");
    await AuthService.updateInterests(seededUser.uid, ["music", "events"]);
    await AuthService.updateThemeSelection(seededUser.uid, {
      themePreference: "dark",
      activeCustomThemeId: "theme-1",
    });
    await AuthService.updateCustomThemes(
      seededUser.uid,
      [
        {
          id: "theme-1",
          name: "Campus Sunset",
          baseTheme: "dark",
          palette: {
            canvas: "#101820",
            surface: "#17232f",
            card: "#203040",
            text: "#f7f4ea",
            mutedText: "#b0b8c0",
            accent: "#ff8c42",
            success: "#4caf50",
            warning: "#f4b400",
            danger: "#e53935",
          },
        },
      ],
      "theme-1",
    );

    const profile = await AuthService.getUserProfile(seededUser.uid);

    expect(profile).toMatchObject({
      uid: seededUser.uid,
      nickname: "Night Owl",
      description: "Builds campus projects",
      interests: ["music", "events"],
      themePreference: "dark",
      activeCustomThemeId: "theme-1",
    });
    expect(profile?.customThemes).toHaveLength(1);
    expect(profile?.customThemes?.[0]).toMatchObject({
      id: "theme-1",
      name: "Campus Sunset",
      baseTheme: "dark",
    });
  });

  it("rejects attempts to grant admin on self-created profiles", async () => {
    const email = uniqueEmail("self-admin");
    const password = "StrongPass123!";

    await AuthService.signUp(email, password, "Privilege Escalation");

    if (!auth.currentUser) {
      throw new Error("Expected the signed-up user to be available.");
    }

    await expect(
      setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          uid: auth.currentUser.uid,
          email,
          admin: true,
        },
        { merge: true },
      ),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});
