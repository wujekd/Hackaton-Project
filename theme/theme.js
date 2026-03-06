(function () {
  const STORAGE_KEY = "mdx-theme-preference";
  const THEME_TRANSITION_CLASS = "theme-transitioning";
  const VALID_PREFERENCES = new Set(["system", "light", "dark"]);
  let themeTransitionTimer = null;

  function normalizePreference(value) {
    return VALID_PREFERENCES.has(value) ? value : "system";
  }

  function getSystemTheme() {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function resolveTheme(preference) {
    return preference === "system" ? getSystemTheme() : preference;
  }

  function animateThemeChange() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add(THEME_TRANSITION_CLASS);
    if (themeTransitionTimer) {
      window.clearTimeout(themeTransitionTimer);
    }
    themeTransitionTimer = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
      themeTransitionTimer = null;
    }, 420);
  }

  function applyTheme(resolvedTheme, animate) {
    if (animate) {
      animateThemeChange();
    }
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }

  function dispatchThemeChange(preference, resolvedTheme) {
    window.dispatchEvent(new CustomEvent("mdx-theme-change", {
      detail: {
        preference,
        resolvedTheme,
      },
    }));
  }

  function getPreference() {
    try {
      return normalizePreference(window.localStorage.getItem(STORAGE_KEY));
    } catch (_error) {
      return "system";
    }
  }

  function setPreference(nextPreference) {
    const preference = normalizePreference(nextPreference);
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (_error) {
      // Ignore storage failures and still apply the theme.
    }
    const resolvedTheme = resolveTheme(preference);
    applyTheme(resolvedTheme, true);
    dispatchThemeChange(preference, resolvedTheme);
    return resolvedTheme;
  }

  function refreshSystemPreference() {
    const preference = getPreference();
    if (preference !== "system") return;
    const resolvedTheme = resolveTheme(preference);
    applyTheme(resolvedTheme, true);
    dispatchThemeChange(preference, resolvedTheme);
  }

  const initialPreference = getPreference();
  const initialResolvedTheme = resolveTheme(initialPreference);
  applyTheme(initialResolvedTheme, false);
  dispatchThemeChange(initialPreference, initialResolvedTheme);

  const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (mediaQuery?.addEventListener) {
    mediaQuery.addEventListener("change", refreshSystemPreference);
  } else if (mediaQuery?.addListener) {
    mediaQuery.addListener(refreshSystemPreference);
  }

  window.MDXTheme = {
    storageKey: STORAGE_KEY,
    getPreference,
    getResolvedTheme: function getResolvedTheme() {
      return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    },
    setPreference,
  };
})();
