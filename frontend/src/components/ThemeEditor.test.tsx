import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { User } from "firebase/auth";
import ThemeEditor from "./ThemeEditor";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";

const SAVED_THEME = {
  id: "ocean-lab",
  name: "Ocean Lab",
  baseTheme: "light" as const,
  palette: {
    canvas: "#F4F6FB",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    text: "#121722",
    mutedText: "#586174",
    accent: "#C01639",
    success: "#087A59",
    warning: "#AB6B12",
    danger: "#C53F57",
  },
};

describe("ThemeEditor", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");

    act(() => {
      useThemeStore.setState({
        hydrated: true,
        preference: "light",
        resolvedTheme: "light",
        customThemes: [],
        activeCustomThemeId: null,
      });

      useAuthStore.setState((state) => ({
        ...state,
        user: { uid: "user-1", email: "alex@example.com" } as unknown as User,
        profile: {
          uid: "user-1",
          email: "alex@example.com",
          username: "Alex",
          themePreference: "light",
          createdAt: {} as never,
        },
        loading: false,
        updateCustomThemes: vi.fn().mockResolvedValue(undefined),
      }));
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");

    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        user: null,
        profile: null,
        loading: false,
      }));
      useThemeStore.setState({
        customThemes: [],
        activeCustomThemeId: null,
      });
    });
  });

  it("applies the draft theme to the whole page while editing and restores the saved theme on unmount", () => {
    const { unmount } = render(<ThemeEditor />);

    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.change(screen.getByLabelText("Canvas color"), { target: { value: "#112233" } });
    expect(document.documentElement.style.getPropertyValue("--theme-dark-canvas-override")).toBe("#112233");

    unmount();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--theme-dark-canvas-override")).toBe("");
  });

  it("requires a name before saving a new theme and saves it as a fixed base theme", async () => {
    const updateCustomThemes = vi.fn().mockResolvedValue(undefined);

    act(() => {
      useAuthStore.setState((state) => ({
        ...state,
        updateCustomThemes,
      }));
    });

    render(<ThemeEditor />);

    fireEvent.change(screen.getByLabelText("Canvas color"), { target: { value: "#112233" } });
    fireEvent.click(screen.getByRole("button", { name: "Save theme" }));

    expect(screen.getByText("Name this theme before saving it.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Theme name"), { target: { value: "Night Shift" } });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.change(screen.getByLabelText("Accent color"), { target: { value: "#445566" } });
    fireEvent.click(screen.getByRole("button", { name: "Save theme" }));

    await waitFor(() => {
      expect(updateCustomThemes).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            name: "Night Shift",
            baseTheme: "dark",
            palette: expect.objectContaining({ accent: "#445566" }),
          }),
        ],
        expect.any(String),
      );
    });
  });

  it("loads the selected saved theme and updates it in place", async () => {
    const updateCustomThemes = vi.fn().mockResolvedValue(undefined);

    act(() => {
      useThemeStore.setState({
        customThemes: [SAVED_THEME],
        activeCustomThemeId: "ocean-lab",
      });

      useAuthStore.setState((state) => ({
        ...state,
        profile: state.profile
          ? {
              ...state.profile,
              customThemes: [SAVED_THEME],
              activeCustomThemeId: "ocean-lab",
            }
          : state.profile,
        updateCustomThemes,
      }));
    });

    render(<ThemeEditor />);

    expect(screen.getByLabelText("Theme name")).toHaveValue("Ocean Lab");

    fireEvent.change(screen.getByLabelText("Theme name"), { target: { value: "Ocean Lab 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateCustomThemes).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: "ocean-lab",
            name: "Ocean Lab 2",
            baseTheme: "light",
          }),
        ],
        "ocean-lab",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "New theme" }));
    expect(screen.getByLabelText("Theme name")).toHaveValue("");
  });
});
