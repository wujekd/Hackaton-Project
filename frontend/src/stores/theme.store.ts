import { create } from "zustand";
import {
  applyResolvedTheme,
  readStoredThemePreference,
  resolveTheme,
  subscribeToSystemTheme,
  writeStoredThemePreference,
} from "../services/theme.service";
import type { ResolvedTheme, ThemePreference } from "../types/theme";

interface ThemeState {
  hydrated: boolean;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  hydrate: () => void;
  syncProfilePreference: (preference?: ThemePreference | null) => void;
  setPreference: (preference: ThemePreference) => void;
}

let stopSystemSync: (() => void) | null = null;

function commitPreference(preference: ThemePreference): Pick<ThemeState, "preference" | "resolvedTheme"> {
  return commitPreferenceWithOptions(preference, { animate: true });
}

function commitPreferenceWithOptions(
  preference: ThemePreference,
  options: { animate: boolean },
): Pick<ThemeState, "preference" | "resolvedTheme"> {
  const resolvedTheme = resolveTheme(preference);
  writeStoredThemePreference(preference);
  applyResolvedTheme(resolvedTheme, { animate: options.animate });
  return { preference, resolvedTheme };
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  hydrated: false,
  preference: "system",
  resolvedTheme: "light",

  hydrate: () => {
    if (!stopSystemSync) {
      stopSystemSync = subscribeToSystemTheme((nextResolvedTheme) => {
        if (get().preference !== "system") return;
        applyResolvedTheme(nextResolvedTheme);
        set({ resolvedTheme: nextResolvedTheme });
      });
    }

    const initialPreference = readStoredThemePreference() ?? "system";
    const nextState = commitPreferenceWithOptions(initialPreference, { animate: false });
    set({ ...nextState, hydrated: true });
  },

  syncProfilePreference: (profilePreference) => {
    if (!profilePreference) return;
    const nextState = commitPreference(profilePreference);
    set({ ...nextState, hydrated: true });
  },

  setPreference: (preference) => {
    const nextState = commitPreference(preference);
    set({ ...nextState, hydrated: true });
  },
}));
