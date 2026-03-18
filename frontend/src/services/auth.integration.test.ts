import { signOut } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { afterEach, describe, expect, it } from "vitest";
import { auth, db } from "./firebase";
import { AuthService } from "./auth.service";

function uniqueEmail(label: string): string {
  return `${label}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.test`;
}

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
});
