(function () {
  const LEGACY_THEME_KEY = "ssi_theme";
  const GUEST_THEME_KEY = "ssi_theme_guest";

  function getCurrentUserId() {
    const raw = localStorage.getItem("user_id");
    return raw ? raw.trim() : "";
  }

  function getThemeKey() {
    const userId = getCurrentUserId();
    return userId ? `ssi_theme_user_${userId}` : GUEST_THEME_KEY;
  }

  function normalizeTheme(value) {
    return value === "dark" ? "dark" : "light";
  }

  function getTheme() {
    const currentKey = getThemeKey();
    const savedForUser = localStorage.getItem(currentKey);
    if (savedForUser) return normalizeTheme(savedForUser);

    // Migrate from old shared key if present.
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy) {
      const migrated = normalizeTheme(legacy);
      localStorage.setItem(currentKey, migrated);
      return migrated;
    }

    return "light";
  }

  function applyTheme(theme) {
    if (!document.body) return;
    const isDark = normalizeTheme(theme) === "dark";
    document.body.classList.toggle("theme-dark", isDark);
    document.body.classList.toggle("theme-light", !isDark);
  }

  function syncTheme() {
    // Keep exported key current in case user_id changes between pages.
    if (window.SSITheme) {
      window.SSITheme.key = getThemeKey();
    }
    applyTheme(getTheme());
  }

  function setTheme(theme) {
    localStorage.setItem(getThemeKey(), normalizeTheme(theme));
    syncTheme();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncTheme);
  } else {
    syncTheme();
  }

  window.addEventListener("storage", (e) => {
    if (!e.key) return;
    if (e.key === LEGACY_THEME_KEY || e.key === "user_id" || e.key.startsWith("ssi_theme_")) {
      syncTheme();
    }
  });

  window.SSITheme = {
    key: getThemeKey(),
    getStorageKey: getThemeKey,
    isThemeKey: (key) => typeof key === "string" && key.startsWith("ssi_theme_"),
    getTheme,
    setTheme,
    syncTheme,
  };
})();
