import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ThemeShowcase from "./ThemeShowcase";
import { useAuthStore } from "../stores/auth.store";
import { useThemeStore } from "../stores/theme.store";

describe("ThemeShowcase", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    useAuthStore.setState((state) => ({
      ...state,
      user: null,
      profile: null,
      loading: false,
      updateThemeSelection: vi.fn().mockResolvedValue(undefined),
      updateCustomThemes: vi.fn().mockResolvedValue(undefined),
    }));
    useThemeStore.setState({
      hydrated: true,
      preference: "system",
      resolvedTheme: "light",
      customThemes: [],
      activeCustomThemeId: null,
    });
  });

  it("renders on the internal route and switches theme", () => {
    render(
      <MemoryRouter initialEntries={["/internal/theme"]}>
        <Routes>
          <Route path="/internal/theme" element={<ThemeShowcase />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Theme Showcase")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("mdx-theme-preference")).toBe("dark");
  });
});
