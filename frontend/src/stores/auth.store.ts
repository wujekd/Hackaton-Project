import { create } from "zustand";
import type { User } from "firebase/auth";
import type { UserProfile } from "../types/auth";
import { AuthService } from "../services/auth.service";
import { useThemeStore } from "./theme.store";
import type { CustomTheme, ThemePreference } from "../types/theme";

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
  updateThemeSelection: (selection: { themePreference?: ThemePreference; activeCustomThemeId?: string | null }) => Promise<void>;
  updateCustomThemes: (customThemes: CustomTheme[], activeCustomThemeId: string | null) => Promise<void>;
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
        const hadAuthenticatedSession = get().user !== null || get().profile !== null;
        set({ user: null, profile: null, loading: false });
        if (hadAuthenticatedSession) {
          useThemeStore.getState().resetToGuestDefault();
        }
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
    useThemeStore.getState().resetToGuestDefault();
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

  updateThemeSelection: async (selection) => {
    const { user, profile } = get();
    if (!user || !profile) {
      throw new Error("You must be signed in to update your theme.");
    }

    const previous = {
      themePreference: profile.themePreference ?? "system",
      activeCustomThemeId: profile.activeCustomThemeId ?? null,
    };
    set({
      profile: {
        ...profile,
        themePreference: selection.themePreference ?? profile.themePreference,
        activeCustomThemeId:
          typeof selection.activeCustomThemeId === "undefined"
            ? profile.activeCustomThemeId
            : selection.activeCustomThemeId ?? undefined,
      },
    });

    try {
      await AuthService.updateThemeSelection(user.uid, selection);
    } catch (error) {
      set((current) => ({
        profile: current.profile
          ? {
              ...current.profile,
              themePreference: previous.themePreference,
              activeCustomThemeId: previous.activeCustomThemeId ?? undefined,
            }
          : current.profile,
      }));
      throw error;
    }
  },

  updateCustomThemes: async (customThemes, activeCustomThemeId) => {
    const { user, profile } = get();
    if (!user || !profile) {
      throw new Error("You must be signed in to update your theme.");
    }

    const previous = {
      customThemes: profile.customThemes ?? [],
      activeCustomThemeId: profile.activeCustomThemeId ?? null,
    };
    set({
      profile: {
        ...profile,
        customThemes: customThemes.length > 0 ? customThemes : undefined,
        activeCustomThemeId: activeCustomThemeId ?? undefined,
      },
    });

    try {
      await AuthService.updateCustomThemes(user.uid, customThemes, activeCustomThemeId);
    } catch (error) {
      set((current) => ({
        profile: current.profile
          ? {
              ...current.profile,
              customThemes: previous.customThemes.length > 0 ? previous.customThemes : undefined,
              activeCustomThemeId: previous.activeCustomThemeId ?? undefined,
            }
          : current.profile,
      }));
      throw error;
    }
  },
}));
