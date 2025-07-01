(function() {
  const THEME_KEY = "theme";
  const FONT_KEY = "fontSize"; // 'small' | 'default' | 'large'
  const COOKIE_THEME_KEY = "dann_theme";
  const COOKIE_FONT_KEY = "dann_font";
  const root = document.documentElement;
  const toggleBtnId = "theme-toggle";
  const THEMES = ["light", "dark", "orangePink", "plumPine", "yellowNavy"];
  const FONTS = ["small", "default", "large"];

  // --- Cookie Helpers ---
  function setCookie(name, value, days) {
    let expires = "";
    if (typeof days === "number") {
      const date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
  }
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i<ca.length;i++) {
      let c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
    }
    return null;
  }
  function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
  }
  window.Cookies = { set: setCookie, get: getCookie, delete: deleteCookie };

  // --- Theme Logic ---
  function getPreferredTheme() {
    // 1. Cookie
    const cookieTheme = getCookie(COOKIE_THEME_KEY);
    if (THEMES.includes(cookieTheme)) {
      return cookieTheme;
    }
    // 2. localStorage
    const stored = localStorage.getItem(THEME_KEY);
    if (THEMES.includes(stored)) {
      return stored;
    }
    // 3. System default
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    return mql.matches ? "dark" : "light";
  }
  function setTheme(theme) {
    root.dataset.theme = theme;
    // Set both localStorage and cookie
    localStorage.setItem(THEME_KEY, theme);
    setCookie(COOKIE_THEME_KEY, theme, 365);
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
    setCookie(COOKIE_FONT_KEY, size, 365);
  }
  function getPreferredFont() {
    // 1. Cookie
    const cookieFont = getCookie(COOKIE_FONT_KEY);
    if (FONTS.includes(cookieFont)) {
      return cookieFont;
    }
    // 2. localStorage
    const stored = localStorage.getItem(FONT_KEY);
    if (FONTS.includes(stored)) {
      return stored;
    }
    // 3. Fallback
    return "default";
  }
  window.applyFont = setFont;

  // --- Theme cycling button ---
  window.toggleTheme = function() {
    const current = root.dataset.theme || "light";
    const idx = THEMES.indexOf(current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
  };

  // --- Reset Preferences ---
  window.resetAppearancePrefs = function() {
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(FONT_KEY);
    deleteCookie(COOKIE_THEME_KEY);
    deleteCookie(COOKIE_FONT_KEY);
    location.reload();
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