import { act } from "@testing-library/react";
import {
  ACTIVE_CUSTOM_THEME_STORAGE_KEY,
  CUSTOM_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "../services/theme.service";
import { useThemeStore } from "./theme.store";

const authServiceMock = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn(),
  ensureUserProfile: vi.fn(),
  resendEmailVerification: vi.fn().mockResolvedValue(undefined),
  refreshCurrentUser: vi.fn(),
  getUserProfile: vi.fn(),
  updateInterests: vi.fn(),
  updateDescription: vi.fn(),
  updateNickname: vi.fn(),
  updateThemeSelection: vi.fn(),
  updateCustomThemes: vi.fn(),
}));

vi.mock("../services/auth.service", () => ({
  AuthService: authServiceMock,
}));

import { useAuthStore } from "./auth.store";

const CUSTOM_THEMES = [
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

describe("auth store sign out", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
    mockThemeMatchMedia(false);
    authServiceMock.signOut.mockClear();
    authServiceMock.onAuthStateChanged.mockReset();
    authServiceMock.ensureUserProfile.mockReset();
    authServiceMock.refreshCurrentUser.mockReset();

    useThemeStore.setState({
      hydrated: false,
      preference: "light",
      resolvedTheme: "light",
      customThemes: [],
      activeCustomThemeId: null,
    });

    useAuthStore.setState({
      user: null,
      profile: null,
      loading: false,
      isEmailVerified: false,
      canAccessVerifiedFeatures: false,
    });
  });

  it("resets the theme to the guest light default on sign out", async () => {
    act(() => {
      useThemeStore.getState().hydrate();
      useThemeStore.getState().setCustomThemes(CUSTOM_THEMES, "night-shift");
      useAuthStore.setState({
        user: { uid: "user-1", email: "alex@example.com" } as never,
        profile: {
          uid: "user-1",
          email: "alex@example.com",
          themePreference: "dark",
        } as never,
      });
    });

    await act(async () => {
      await useAuthStore.getState().signOut();
    });

    expect(authServiceMock.signOut).toHaveBeenCalledTimes(1);
    expect(useThemeStore.getState().preference).toBe("light");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(useThemeStore.getState().customThemes).toEqual([]);
    expect(useThemeStore.getState().activeCustomThemeId).toBeNull();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY)).toBeNull();
    expect(useAuthStore.getState().isEmailVerified).toBe(false);
    expect(useAuthStore.getState().canAccessVerifiedFeatures).toBe(false);
  });

  it("keeps unverified users in a limited session during init", async () => {
    let listener: ((user: unknown) => Promise<void>) | undefined;
    authServiceMock.onAuthStateChanged.mockImplementation((cb: (user: unknown) => Promise<void>) => {
      listener = cb;
      return vi.fn();
    });
    authServiceMock.ensureUserProfile.mockResolvedValue({
      uid: "user-1",
      email: "alex@example.com",
      createdAt: {} as never,
    });

    useAuthStore.getState().init();

    await act(async () => {
      await listener?.({ uid: "user-1", email: "alex@example.com", emailVerified: false });
    });

    const state = useAuthStore.getState();
    expect(state.user?.uid).toBe("user-1");
    expect(state.profile?.email).toBe("alex@example.com");
    expect(state.isEmailVerified).toBe(false);
    expect(state.canAccessVerifiedFeatures).toBe(false);
  });

  it("updates access after refreshing a newly verified user", async () => {
    useAuthStore.setState({
      user: { uid: "user-1", email: "alex@example.com", emailVerified: false } as never,
      profile: {
        uid: "user-1",
        email: "alex@example.com",
        createdAt: {} as never,
      } as never,
      loading: false,
      isEmailVerified: false,
      canAccessVerifiedFeatures: false,
    });
    authServiceMock.refreshCurrentUser.mockResolvedValue({
      uid: "user-1",
      email: "alex@example.com",
      emailVerified: true,
    });

    await act(async () => {
      await expect(useAuthStore.getState().refreshVerificationStatus()).resolves.toBe(true);
    });

    const state = useAuthStore.getState();
    expect(state.isEmailVerified).toBe(true);
    expect(state.canAccessVerifiedFeatures).toBe(true);
    expect(state.user?.emailVerified).toBe(true);
  });
});
