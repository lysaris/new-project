(function() {
  const THEME_KEY = "theme";
  const root = document.documentElement;
  const toggleBtnId = "theme-toggle";

  // Multi-theme support
  const THEMES = ["light", "dark", "orangePink", "plumPine", "yellowNavy"];

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (THEMES.includes(stored)) {
      return stored;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    return mql.matches ? "dark" : "light";
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    updateToggleIcon(theme);
  }

  function updateToggleIcon(theme) {
    const btn = document.getElementById(toggleBtnId);
    if (!btn) return;
    // Unified palette icon for all themes, show current theme in aria-label
    btn.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i>';
    btn.setAttribute("aria-label", "Change theme (current: " + theme + ")");
  }

  window.toggleTheme = function() {
    const current = root.dataset.theme || "light";
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  };

  document.addEventListener("DOMContentLoaded", function() {
    const initial = getPreferredTheme();
    setTheme(initial);

    const btn = document.getElementById(toggleBtnId);
    if (btn) {
      btn.addEventListener("click", window.toggleTheme);
      updateToggleIcon(initial);
    }
  });

  // --- Service Worker registration for PWA/offline ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
})();