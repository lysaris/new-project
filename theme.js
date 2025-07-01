(function() {
  const THEME_KEY = "theme";
  const FONT_KEY = "fontSize"; // 'small' | 'default' | 'large'
  const root = document.documentElement;
  const toggleBtnId = "theme-toggle";
  const THEMES = ["light", "dark", "orangePink", "plumPine", "yellowNavy"];
  const FONTS = ["small", "default", "large"];

  // --- Theme Logic ---
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
    btn.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i>';
    btn.setAttribute("aria-label", "Change theme (current: " + theme + ")");
  }
  window.applyTheme = setTheme;

  // --- Font Size Logic ---
  function setFont(size) {
    if (!FONTS.includes(size)) size = "default";
    root.dataset.font = size;
    localStorage.setItem(FONT_KEY, size);
  }
  function getPreferredFont() {
    return localStorage.getItem(FONT_KEY) || "default";
  }
  window.applyFont = setFont;

  // --- Theme cycling button ---
  window.toggleTheme = function() {
    const current = root.dataset.theme || "light";
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  };

  // --- Inject Settings link into nav ---
  function injectSettingsLink() {
    // Find first <nav> <ul> (direct or indirect child)
    var nav = document.querySelector("nav");
    if (!nav) return;
    var ul = nav.querySelector("ul");
    if (!ul) return;
    // Check if "Settings" link already exists
    var exists = Array.from(ul.querySelectorAll("a")).some(
      a => a.textContent.trim().toLowerCase() === "settings"
    );
    if (!exists) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "settings.html";
      a.textContent = "Settings";
      li.appendChild(a);
      ul.appendChild(li);
    }
  }

  // --- On DOM loaded: apply theme/font, update toggle, inject nav ---
  document.addEventListener("DOMContentLoaded", function() {
    // Theme
    const initialTheme = getPreferredTheme();
    setTheme(initialTheme);
    // Font size
    setFont(getPreferredFont());
    // Theme toggle setup
    const btn = document.getElementById(toggleBtnId);
    if (btn) {
      btn.addEventListener("click", window.toggleTheme);
      updateToggleIcon(initialTheme);
    }
    // Inject settings link into nav
    injectSettingsLink();
  });

  // --- Service Worker registration for PWA/offline ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
})();