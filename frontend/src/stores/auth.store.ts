import { create } from "zustand";
import type { User } from "firebase/auth";
import type { AuthResult, UserProfile } from "../types/auth";
import { AuthService } from "../services/auth.service";
import { useThemeStore } from "./theme.store";
import type { CustomTheme, ThemePreference } from "../types/theme";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isEmailVerified: boolean;
  canAccessVerifiedFeatures: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, username?: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
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
  isEmailVerified: false,
  canAccessVerifiedFeatures: false,

  init: () => {
    let authSnapshotVersion = 0;

    const unsub = AuthService.onAuthStateChanged(async (user) => {
      const snapshotVersion = ++authSnapshotVersion;

      if (user) {
        const [profile, canAccessVerifiedFeatures] = await Promise.all([
          AuthService.ensureUserProfile(user),
          AuthService.getVerifiedFeatureAccess(user),
        ]);

        if (snapshotVersion !== authSnapshotVersion) {
          return;
        }

        set({
          user,
          profile,
          loading: false,
          isEmailVerified: user.emailVerified,
          canAccessVerifiedFeatures,
        });
      } else {
        const hadAuthenticatedSession = get().user !== null || get().profile !== null;
        set({
          user: null,
          profile: null,
          loading: false,
          isEmailVerified: false,
          canAccessVerifiedFeatures: false,
        });
        if (hadAuthenticatedSession) {
          useThemeStore.getState().resetToGuestDefault();
        }
      }
    });

    return () => {
      authSnapshotVersion += 1;
      unsub();
    };
  },

  signIn: async (email, password) => {
    return AuthService.signIn(email, password);
  },

  signUp: async (email, password, username) => {
    return AuthService.signUp(email, password, username);
  },

  signInWithGoogle: async () => {
    return AuthService.signInWithGoogle();
  },

  signOut: async () => {
    await AuthService.signOut();
    useThemeStore.getState().resetToGuestDefault();
    set({
      user: null,
      profile: null,
      isEmailVerified: false,
      canAccessVerifiedFeatures: false,
    });
  },

  resendVerificationEmail: async () => {
    const { user } = get();
    if (!user) {
      throw new Error("You must be signed in to verify your email.");
    }

    await AuthService.resendEmailVerification();
  },

  refreshVerificationStatus: async () => {
    const refreshedUser = await AuthService.refreshCurrentUser();
    if (!refreshedUser) {
      set({
        user: null,
        profile: null,
        isEmailVerified: false,
        canAccessVerifiedFeatures: false,
      });
      useThemeStore.getState().resetToGuestDefault();
      return false;
    }

    const canAccessVerifiedFeatures = await AuthService.getVerifiedFeatureAccess(refreshedUser, {
      forceRefresh: true,
    });

    set((current) => ({
      user: refreshedUser,
      profile: current.profile,
      isEmailVerified: refreshedUser.emailVerified,
      canAccessVerifiedFeatures,
    }));

    return canAccessVerifiedFeatures;
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
      themePreference: profile.themePreference ?? "light",
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
