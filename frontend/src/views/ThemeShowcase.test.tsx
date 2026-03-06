import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ThemeShowcase from "./ThemeShowcase";
import { useThemeStore } from "../stores/theme.store";

describe("ThemeShowcase", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    useThemeStore.setState({
      hydrated: true,
      preference: "system",
      resolvedTheme: "light",
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
