describe("shared theme bootstrap", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
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

  it("applies the stored preference for static surfaces on import", async () => {
    window.localStorage.setItem("mdx-theme-preference", "dark");
    vi.resetModules();
    await import("@shared-theme/theme.js");

    const themedWindow = window as Window & {
      MDXTheme?: { getPreference: () => string; getResolvedTheme: () => string };
    };

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(themedWindow.MDXTheme?.getPreference()).toBe("dark");
    expect(themedWindow.MDXTheme?.getResolvedTheme()).toBe("dark");
  });
});
