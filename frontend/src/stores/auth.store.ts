import { create } from "zustand";
import type { User } from "firebase/auth";
import type { UserProfile } from "../types/auth";
import { AuthService } from "../services/auth.service";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileInterests: (interests: string[]) => Promise<void>;
  updateProfileDescription: (description: string) => Promise<void>;
  updateProfileNickname: (nickname: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  init: () => {
    const unsub = AuthService.onAuthStateChanged(async (user) => {
      if (user) {
        const profile = await AuthService.ensureUserProfile(user);
        set({ user, profile, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
    return unsub;
  },

  signIn: async (email, password) => {
    await AuthService.signIn(email, password);
  },

  signUp: async (email, password, username) => {
    await AuthService.signUp(email, password, username);
  },

  signInWithGoogle: async () => {
    await AuthService.signInWithGoogle();
  },

  signOut: async () => {
    await AuthService.signOut();
  },

  updateProfileInterests: async (interests) => {
    const { user, profile } = get();
    if (!user || !profile) {
      throw new Error("You must be signed in to update interests.");
    }

    const previous = profile.interests ?? [];
    set({ profile: { ...profile, interests } });

    try {
      await AuthService.updateInterests(user.uid, interests);
    } catch (error) {
      set((current) => ({
        profile: current.profile ? { ...current.profile, interests: previous } : current.profile,
      }));
      throw error;
    }
  },

  updateProfileDescription: async (description) => {
    const { user, profile } = get();
    if (!user || !profile) {
      throw new Error("You must be signed in to update your description.");
    }

    const previous = profile.description ?? "";
    set({ profile: { ...profile, description } });

    try {
      await AuthService.updateDescription(user.uid, description);
    } catch (error) {
      set((current) => ({
        profile: current.profile ? { ...current.profile, description: previous } : current.profile,
      }));
      throw error;
    }
  },

  updateProfileNickname: async (nickname) => {
    const { user, profile } = get();
    if (!user || !profile) {
      throw new Error("You must be signed in to update your nickname.");
    }

    const previous = profile.nickname ?? "";
    set({ profile: { ...profile, nickname } });

    try {
      await AuthService.updateNickname(user.uid, nickname);
    } catch (error) {
      set((current) => ({
        profile: current.profile ? { ...current.profile, nickname: previous } : current.profile,
      }));
      throw error;
    }
  },
}));
