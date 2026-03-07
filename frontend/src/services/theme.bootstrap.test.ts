describe("shared theme bootstrap", () => {
  const customThemes = [
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
  ];

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
    delete (window as Window & { MDXTheme?: unknown }).MDXTheme;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme: dark"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("applies the active saved theme for static surfaces on import", async () => {
    window.localStorage.setItem("mdx-theme-preference", "dark");
    window.localStorage.setItem("mdx-theme-custom-v1", JSON.stringify(customThemes));
    window.localStorage.setItem("mdx-theme-custom-active", "ocean-lab");
    vi.resetModules();
    await import("@shared-theme/theme.js");

    const themedWindow = window as Window & {
      MDXTheme?: {
        getPreference: () => string;
        getResolvedTheme: () => string;
        getCustomThemes: () => unknown;
        getActiveCustomThemeId: () => string | null;
        clearCustomThemeSelection: () => void;
      };
    };

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(themedWindow.MDXTheme?.getPreference()).toBe("dark");
    expect(themedWindow.MDXTheme?.getResolvedTheme()).toBe("light");
    expect(themedWindow.MDXTheme?.getCustomThemes()).toEqual(customThemes);
    expect(themedWindow.MDXTheme?.getActiveCustomThemeId()).toBe("ocean-lab");
    expect(document.documentElement.style.getPropertyValue("--theme-light-canvas-override")).toBe("#112233");

    themedWindow.MDXTheme?.clearCustomThemeSelection();

    expect(window.localStorage.getItem("mdx-theme-custom-active")).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--theme-light-canvas-override")).toBe("");
  });
});
