(function () {
  const STORAGE_KEY = "mdx-theme-preference";
  const CUSTOM_THEME_STORAGE_KEY = "mdx-theme-custom-v1";
  const ACTIVE_CUSTOM_THEME_STORAGE_KEY = "mdx-theme-custom-active";
  const THEME_TRANSITION_CLASS = "theme-transitioning";
  const VALID_PREFERENCES = new Set(["system", "light", "dark"]);
  const THEME_MODES = ["light", "dark"];
  const THEME_SLOTS = [
    "canvas",
    "surface",
    "card",
    "text",
    "mutedText",
    "accent",
    "success",
    "warning",
    "danger",
  ];
  const LEGACY_CUSTOM_THEME_IDS = {
    light: "legacy-custom-light",
    dark: "legacy-custom-dark",
  };
  const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;
  let themeTransitionTimer = null;
  let currentPreference = "system";
  let currentResolvedTheme = "light";
  let currentCustomThemes = [];
  let currentActiveCustomThemeId = null;

  function normalizePreference(value) {
    return VALID_PREFERENCES.has(value) ? value : "system";
  }

  function normalizeHexColor(value) {
    if (typeof value !== "string") return null;
    const candidate = value.trim();
    if (!HEX_COLOR_PATTERN.test(candidate)) return null;
    return (candidate.startsWith("#") ? candidate : `#${candidate}`).toUpperCase();
  }

  function normalizeThemeName(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : null;
  }

  function normalizeThemePalette(value) {
    if (!value || typeof value !== "object") return null;
    const palette = {};

    for (const slot of THEME_SLOTS) {
      const color = normalizeHexColor(value[slot]);
      if (!color) return null;
      palette[slot] = color;
    }

    return palette;
  }

  function normalizeCustomTheme(value) {
    if (!value || typeof value !== "object") return null;

    const name = normalizeThemeName(value.name);
    const palette = normalizeThemePalette(value.palette);

    if (typeof value.id !== "string" || !name || !palette) return null;
    if (value.baseTheme !== "light" && value.baseTheme !== "dark") return null;

    return {
      id: value.id,
      name,
      baseTheme: value.baseTheme,
      palette,
    };
  }

  function normalizeLegacyCustomTheme(value) {
    if (!value || typeof value !== "object" || value.version !== 1) return null;

    const light = normalizeThemePalette(value.light);
    const dark = normalizeThemePalette(value.dark);

    if (!light || !dark) return null;

    return {
      light,
      dark,
    };
  }

  function normalizeCustomThemes(value) {
    if (Array.isArray(value)) {
      const normalized = value.map(normalizeCustomTheme);
      return normalized.every(Boolean) ? normalized : null;
    }

    const legacy = normalizeLegacyCustomTheme(value);
    if (!legacy) return null;

    return [
      {
        id: LEGACY_CUSTOM_THEME_IDS.light,
        name: "Custom Light",
        baseTheme: "light",
        palette: legacy.light,
      },
      {
        id: LEGACY_CUSTOM_THEME_IDS.dark,
        name: "Custom Dark",
        baseTheme: "dark",
        palette: legacy.dark,
      },
    ];
  }

  function cloneCustomThemes(customThemes) {
    return customThemes.map((customTheme) => ({
      ...customTheme,
      palette: { ...customTheme.palette },
    }));
  }

  function getOverrideVariableName(mode, slot) {
    return `--theme-${mode}-${slot}-override`;
  }

  function getSystemTheme() {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function resolveTheme(preference) {
    return preference === "system" ? getSystemTheme() : preference;
  }

  function getCustomThemeById(customThemes, customThemeId) {
    if (!customThemeId) return null;
    return customThemes.find((customTheme) => customTheme.id === customThemeId) || null;
  }

  function sanitizeActiveCustomThemeId(customThemeId, customThemes) {
    return getCustomThemeById(customThemes, customThemeId)?.id || null;
  }

  function resolveThemeSelection(preference, customThemes, activeCustomThemeId) {
    const activeCustomTheme = getCustomThemeById(customThemes, activeCustomThemeId);

    return {
      activeCustomTheme,
      activeCustomThemeId: activeCustomTheme?.id || null,
      resolvedTheme: activeCustomTheme?.baseTheme || resolveTheme(preference),
    };
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

  function clearCustomThemeOverrides() {
    const root = document.documentElement;

    for (const mode of THEME_MODES) {
      for (const slot of THEME_SLOTS) {
        root.style.removeProperty(getOverrideVariableName(mode, slot));
      }
    }
  }

  function applyCustomTheme(customTheme) {
    clearCustomThemeOverrides();
    if (!customTheme) return;

    const root = document.documentElement;
    for (const slot of THEME_SLOTS) {
      root.style.setProperty(getOverrideVariableName(customTheme.baseTheme, slot), customTheme.palette[slot]);
    }
  }

  function dispatchThemeChange() {
    window.dispatchEvent(new CustomEvent("mdx-theme-change", {
      detail: {
        preference: currentPreference,
        resolvedTheme: currentResolvedTheme,
        customThemes: cloneCustomThemes(currentCustomThemes),
        activeCustomThemeId: currentActiveCustomThemeId,
      },
    }));
  }

  function readStoredPreference() {
    try {
      return normalizePreference(window.localStorage.getItem(STORAGE_KEY));
    } catch (_error) {
      return "system";
    }
  }

  function writeStoredPreference(preference) {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (_error) {
      // Ignore storage failures and still apply the theme.
    }
  }

  function readStoredCustomThemes() {
    try {
      const raw = window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
      if (!raw) return [];
      return normalizeCustomThemes(JSON.parse(raw)) || [];
    } catch (_error) {
      return [];
    }
  }

  function writeStoredCustomThemes(customThemes) {
    try {
      if (!customThemes.length) {
        window.localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(customThemes));
    } catch (_error) {
      // Ignore storage failures and still apply the theme.
    }
  }

  function readStoredActiveCustomThemeId() {
    try {
      const value = window.localStorage.getItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY);
      return typeof value === "string" && value.length > 0 ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function writeStoredActiveCustomThemeId(customThemeId) {
    try {
      if (!customThemeId) {
        window.localStorage.removeItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(ACTIVE_CUSTOM_THEME_STORAGE_KEY, customThemeId);
    } catch (_error) {
      // Ignore storage failures and still apply the theme.
    }
  }

  function applyThemeState(preference, customThemes, activeCustomThemeId, animate) {
    const normalizedPreference = normalizePreference(preference);
    const normalizedCustomThemes = normalizeCustomThemes(customThemes) || [];
    const nextThemeState = resolveThemeSelection(
      normalizedPreference,
      normalizedCustomThemes,
      sanitizeActiveCustomThemeId(activeCustomThemeId, normalizedCustomThemes),
    );

    currentPreference = normalizedPreference;
    currentCustomThemes = normalizedCustomThemes;
    currentActiveCustomThemeId = nextThemeState.activeCustomThemeId;
    currentResolvedTheme = nextThemeState.resolvedTheme;
    applyCustomTheme(nextThemeState.activeCustomTheme);
    applyTheme(nextThemeState.resolvedTheme, animate);
    dispatchThemeChange();
  }

  function getPreference() {
    return currentPreference;
  }

  function getResolvedTheme() {
    return currentResolvedTheme;
  }

  function getCustomThemes() {
    return cloneCustomThemes(currentCustomThemes);
  }

  function getActiveCustomThemeId() {
    return currentActiveCustomThemeId;
  }

  function setPreference(nextPreference) {
    const preference = normalizePreference(nextPreference);
    writeStoredPreference(preference);
    writeStoredActiveCustomThemeId(null);
    applyThemeState(preference, currentCustomThemes, null, true);
    return currentResolvedTheme;
  }

  function setCustomThemes(nextCustomThemes) {
    const customThemes = normalizeCustomThemes(nextCustomThemes) || [];
    const nextActiveCustomThemeId = sanitizeActiveCustomThemeId(currentActiveCustomThemeId, customThemes);
    writeStoredCustomThemes(customThemes);
    writeStoredActiveCustomThemeId(nextActiveCustomThemeId);
    applyThemeState(currentPreference, customThemes, nextActiveCustomThemeId, true);
    return getCustomThemes();
  }

  function setActiveCustomTheme(nextCustomThemeId) {
    const nextActiveCustomThemeId = sanitizeActiveCustomThemeId(nextCustomThemeId, currentCustomThemes);
    writeStoredActiveCustomThemeId(nextActiveCustomThemeId);
    applyThemeState(currentPreference, currentCustomThemes, nextActiveCustomThemeId, true);
    return currentActiveCustomThemeId;
  }

  function clearCustomThemeSelection() {
    writeStoredActiveCustomThemeId(null);
    applyThemeState(currentPreference, currentCustomThemes, null, true);
  }

  function refreshSystemPreference() {
    if (currentPreference !== "system" || currentActiveCustomThemeId) return;
    applyThemeState(currentPreference, currentCustomThemes, null, true);
  }

  applyThemeState(readStoredPreference(), readStoredCustomThemes(), readStoredActiveCustomThemeId(), false);

  const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (mediaQuery?.addEventListener) {
    mediaQuery.addEventListener("change", refreshSystemPreference);
  } else if (mediaQuery?.addListener) {
    mediaQuery.addListener(refreshSystemPreference);
  }

  window.MDXTheme = {
    storageKey: STORAGE_KEY,
    customThemeStorageKey: CUSTOM_THEME_STORAGE_KEY,
    activeCustomThemeStorageKey: ACTIVE_CUSTOM_THEME_STORAGE_KEY,
    getPreference,
    getResolvedTheme,
    getCustomThemes,
    getActiveCustomThemeId,
    setPreference,
    setCustomThemes,
    setActiveCustomTheme,
    clearCustomThemeSelection,
  };
})();
