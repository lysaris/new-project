(function() {
  const THEME_KEY = "theme";
  const root = document.documentElement;
  const toggleBtnId = "theme-toggle";

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
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
    // Icon logic: show moon for light (prompting dark), sun for dark (prompting light)
    btn.innerHTML = theme === "dark"
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    btn.setAttribute("aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  window.toggleTheme = function() {
    const current = root.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  };

  document.addEventListener("DOMContentLoaded", function() {
    const initial = getPreferredTheme();
    setTheme(initial);

    const btn = document.getElementById(toggleBtnId);
    if (btn) {
      btn.addEventListener("click", window.toggleTheme);
      updateToggleIcon(initial); // in case theme was set before DOMContentLoaded
    }
  });

  // --- Service Worker registration for PWA/offline ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
})();