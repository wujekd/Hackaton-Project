import { act } from "@testing-library/react";
import { THEME_STORAGE_KEY } from "../services/theme.service";
import { useThemeStore } from "./theme.store";

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
    document.documentElement.style.colorScheme = "";
    useThemeStore.setState({
      hydrated: false,
      preference: "system",
      resolvedTheme: "light",
    });
    mockThemeMatchMedia(false);
  });

  it("hydrates guest theme from system preference when nothing is stored", () => {
    act(() => {
      useThemeStore.getState().hydrate();
    });

    expect(useThemeStore.getState().preference).toBe("system");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("hydrates from local storage override", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    act(() => {
      useThemeStore.getState().hydrate();
    });

    expect(useThemeStore.getState().preference).toBe("dark");
    expect(useThemeStore.getState().resolvedTheme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("lets signed-in profile preference override local storage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    act(() => {
      useThemeStore.getState().hydrate();
      useThemeStore.getState().syncProfilePreference("dark");
    });

    expect(useThemeStore.getState().preference).toBe("dark");
    expect(useThemeStore.getState().resolvedTheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("writes theme changes back to local storage and the DOM", () => {
    act(() => {
      useThemeStore.getState().hydrate();
      useThemeStore.getState().setPreference("dark");
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
