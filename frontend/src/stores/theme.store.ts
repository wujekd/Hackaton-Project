import { create } from "zustand";
import {
  applyCustomTheme,
  applyResolvedTheme,
  cloneCustomTheme,
  cloneCustomThemes,
  readStoredActiveCustomThemeId,
  readStoredCustomThemes,
  readStoredThemePreference,
  resolveActiveTheme,
  subscribeToSystemTheme,
  writeStoredActiveCustomThemeId,
  writeStoredCustomThemes,
  writeStoredThemePreference,
} from "../services/theme.service";
import type { CustomTheme, ResolvedTheme, ThemePreference } from "../types/theme";

interface ThemeState {
  hydrated: boolean;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  customThemes: CustomTheme[];
  activeCustomThemeId: string | null;
  sessionTheme: CustomTheme | null;
  hydrate: () => void;
  resetToGuestDefault: () => void;
  syncProfileTheme: (profile: {
    preference?: ThemePreference | null;
    customThemes?: CustomTheme[] | null;
    activeCustomThemeId?: string | null;
  }) => void;
  setPreference: (preference: ThemePreference) => void;
  selectCustomTheme: (customThemeId: string) => void;
  setCustomThemes: (customThemes: CustomTheme[], activeCustomThemeId: string | null) => void;
  applySessionTheme: (customTheme: CustomTheme) => void;
}

let stopSystemSync: (() => void) | null = null;

function commitThemeState(
  preference: ThemePreference,
  customThemes: CustomTheme[],
  activeCustomThemeId: string | null,
  options: { animate: boolean },
): Pick<ThemeState, "preference" | "resolvedTheme" | "customThemes" | "activeCustomThemeId"> {
  const clonedCustomThemes = cloneCustomThemes(customThemes);
  const nextThemeState = resolveActiveTheme(preference, clonedCustomThemes, activeCustomThemeId);

  writeStoredThemePreference(preference);
  writeStoredCustomThemes(clonedCustomThemes);
  writeStoredActiveCustomThemeId(nextThemeState.activeCustomThemeId);
  applyCustomTheme(nextThemeState.activeCustomTheme);
  applyResolvedTheme(nextThemeState.resolvedTheme, { animate: options.animate });

  return {
    preference,
    resolvedTheme: nextThemeState.resolvedTheme,
    customThemes: clonedCustomThemes,
    activeCustomThemeId: nextThemeState.activeCustomThemeId,
  };
}

function commitThemeStateWithAnimation(
  preference: ThemePreference,
  customThemes: CustomTheme[],
  activeCustomThemeId: string | null,
): Pick<ThemeState, "preference" | "resolvedTheme" | "customThemes" | "activeCustomThemeId"> {
  return commitThemeState(preference, customThemes, activeCustomThemeId, { animate: true });
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  hydrated: false,
  preference: "system",
  resolvedTheme: "light",
  customThemes: [],
  activeCustomThemeId: null,
  sessionTheme: null,

  hydrate: () => {
    if (!stopSystemSync) {
      stopSystemSync = subscribeToSystemTheme((nextResolvedTheme) => {
        const state = get();
        if (state.preference !== "system" || state.activeCustomThemeId) return;
        applyResolvedTheme(nextResolvedTheme);
        set({ resolvedTheme: nextResolvedTheme });
      });
    }

    const initialPreference = readStoredThemePreference() ?? "system";
    const initialCustomThemes = readStoredCustomThemes();
    const initialActiveCustomThemeId = readStoredActiveCustomThemeId();
    const nextState = commitThemeState(initialPreference, initialCustomThemes, initialActiveCustomThemeId, {
      animate: false,
    });
    set({ ...nextState, sessionTheme: null, hydrated: true });
  },

  resetToGuestDefault: () => {
    const nextState = commitThemeStateWithAnimation("system", [], null);
    set({ ...nextState, sessionTheme: null, hydrated: true });
  },

  syncProfileTheme: ({ preference, customThemes, activeCustomThemeId }) => {
    if (!preference && typeof customThemes === "undefined" && typeof activeCustomThemeId === "undefined") return;

    const nextPreference = preference ?? get().preference;
    const nextCustomThemes = customThemes ?? get().customThemes;
    const nextActiveCustomThemeId =
      typeof activeCustomThemeId === "undefined" ? get().activeCustomThemeId : activeCustomThemeId;
    const nextState = commitThemeStateWithAnimation(nextPreference, nextCustomThemes, nextActiveCustomThemeId);
    set({ ...nextState, sessionTheme: null, hydrated: true });
  },

  setPreference: (preference) => {
    const nextState = commitThemeStateWithAnimation(preference, get().customThemes, null);
    set({ ...nextState, sessionTheme: null, hydrated: true });
  },

  selectCustomTheme: (customThemeId) => {
    const current = get();
    if (!current.customThemes.some((customTheme) => customTheme.id === customThemeId)) return;

    const nextState = commitThemeStateWithAnimation(current.preference, current.customThemes, customThemeId);
    set({ ...nextState, sessionTheme: null, hydrated: true });
  },

  setCustomThemes: (customThemes, activeCustomThemeId) => {
    const nextState = commitThemeStateWithAnimation(get().preference, customThemes, activeCustomThemeId);
    set({ ...nextState, sessionTheme: null, hydrated: true });
  },

  applySessionTheme: (customTheme) => {
    const nextSessionTheme = cloneCustomTheme(customTheme);
    applyCustomTheme(nextSessionTheme);
    applyResolvedTheme(nextSessionTheme.baseTheme, { animate: true });
    set({
      resolvedTheme: nextSessionTheme.baseTheme,
      activeCustomThemeId: null,
      sessionTheme: nextSessionTheme,
      hydrated: true,
    });
  },
}));
