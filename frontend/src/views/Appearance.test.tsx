import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { User } from "firebase/auth";
import { MemoryRouter } from "react-router-dom";
import Appearance from "./Appearance";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";

const CUSTOM_THEME = {
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
};

describe("Appearance", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";

    act(() => {
      useThemeStore.setState({
        hydrated: true,
        preference: "system",
        resolvedTheme: "light",
        customThemes: [CUSTOM_THEME],
        activeCustomThemeId: null,
      });

      useAuthStore.setState((state) => ({
        ...state,
        user: { uid: "user-1", email: "alex@example.com" } as unknown as User,
        profile: {
          uid: "user-1",
          email: "alex@example.com",
          username: "Alex",
          themePreference: "system",
          customThemes: [CUSTOM_THEME],
          createdAt: {} as never,
        },
        loading: false,
        updateThemeSelection: vi.fn().mockResolvedValue(undefined),
        updateCustomThemes: vi.fn().mockResolvedValue(undefined),
      }));
    });
  });

  afterEach(() => {
    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: null,
        profile: null,
        loading: false,
      }));
    });
  });

  it("updates the theme from the appearance settings control", async () => {
    render(
      <MemoryRouter>
        <Appearance />
      </MemoryRouter>,
    );

    const themeToggleGroup = await screen.findByRole("group", { name: "Theme preference preference" });

    fireEvent.click(within(themeToggleGroup).getByRole("button", { name: "Dark" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(window.localStorage.getItem("mdx-theme-preference")).toBe("dark");
    });
  });

  it("renders saved custom themes next to the built-in theme buttons", async () => {
    render(
      <MemoryRouter>
        <Appearance />
      </MemoryRouter>,
    );

    const themeToggleGroup = await screen.findByRole("group", { name: "Theme preference preference" });
    expect(within(themeToggleGroup).getByRole("button", { name: "Ocean Lab" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Theme name")).toBeInTheDocument();
  });
});
