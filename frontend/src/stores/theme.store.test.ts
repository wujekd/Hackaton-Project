import { act } from "@testing-library/react";
import {
  ACTIVE_CUSTOM_THEME_STORAGE_KEY,
  CUSTOM_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "../services/theme.service";
import { useThemeStore } from "./theme.store";

const CUSTOM_THEMES = [
  {
    id: "ocean-lab",
    name: "Ocean Lab",
    baseTheme: "light" as const,
    palette: {
      canvas: "#112233",
      surface: "#223344",
      card: "#334455",
      text: "#F7F8FA",
      mutedText: "#CAD2E0",
      accent: "#FF4477",
      success: "#00C389",
      warning: "#E6AC00",
      danger: "#FF667A",
    },
  },
  {
    id: "night-shift",
    name: "Night Shift",
    baseTheme: "dark" as const,
    palette: {
      canvas: "#0A0B0F",
      surface: "#11141B",
      card: "#1A2030",
      text: "#F7F8FA",
      mutedText: "#AAB6D1",
      accent: "#7A5CFF",
      success: "#00C389",
      warning: "#E6AC00",
      danger: "#FF667A",
    },
  },
];

function mockThemeMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-color-scheme: dark") ? prefersDark : true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("theme store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
    useThemeStore.setState({
      hydrated: false,
      preference: "system",
      resolvedTheme: "light",
      customThemes: [],
      activeCustomThemeId: null,
    });
    mockThemeMatchMedia(false);
  });

  it("hydrates guest theme from system preference when nothing is stored", () => {
    act(() => {
      useThemeStore.getState().hydrate();
    });

    expect(useThemeStore.getState().preference).toBe("system");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(useThemeStore.getState().customThemes).toEqual([]);
    expect(useThemeStore.getState().activeCustomThemeId).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("hydrates a saved custom theme selection from local storage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(CUSTOM_THEMES));
    window.localStorage.setItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY, "ocean-lab");

    act(() => {
      useThemeStore.getState().hydrate();
    });

    expect(useThemeStore.getState().preference).toBe("dark");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(useThemeStore.getState().activeCustomThemeId).toBe("ocean-lab");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--theme-light-canvas-override")).toBe("#112233");
  });

  it("lets signed-in profile theme data override local storage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(CUSTOM_THEMES));
    window.localStorage.setItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY, "ocean-lab");

    act(() => {
      useThemeStore.getState().hydrate();
      useThemeStore.getState().syncProfileTheme({
        preference: "system",
        customThemes: CUSTOM_THEMES,
        activeCustomThemeId: "night-shift",
      });
    });

    expect(useThemeStore.getState().preference).toBe("system");
    expect(useThemeStore.getState().resolvedTheme).toBe("dark");
    expect(useThemeStore.getState().activeCustomThemeId).toBe("night-shift");
    expect(window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY)).toBe("night-shift");
    expect(document.documentElement.style.getPropertyValue("--theme-dark-accent-override")).toBe("#7A5CFF");
  });

  it("switches back to the built-in theme when selecting light or dark", () => {
    act(() => {
      useThemeStore.getState().hydrate();
      useThemeStore.getState().setCustomThemes(CUSTOM_THEMES, "night-shift");
      useThemeStore.getState().setPreference("light");
    });

    expect(useThemeStore.getState().activeCustomThemeId).toBeNull();
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--theme-dark-canvas-override")).toBe("");
  });

  it("writes custom theme collections and selections back to storage", () => {
    act(() => {
      useThemeStore.getState().hydrate();
      useThemeStore.getState().setCustomThemes(CUSTOM_THEMES, null);
      useThemeStore.getState().selectCustomTheme("night-shift");
    });

    expect(window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toContain("Ocean Lab");
    expect(window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY)).toBe("night-shift");
    expect(useThemeStore.getState().activeCustomThemeId).toBe("night-shift");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("resets to the default guest system theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(CUSTOM_THEMES));
    window.localStorage.setItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY, "night-shift");

    act(() => {
      useThemeStore.getState().hydrate();
      useThemeStore.getState().resetToGuestDefault();
    });

    expect(useThemeStore.getState().preference).toBe("system");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(useThemeStore.getState().customThemes).toEqual([]);
    expect(useThemeStore.getState().activeCustomThemeId).toBeNull();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--theme-dark-canvas-override")).toBe("");
  });
});
