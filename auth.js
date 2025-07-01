/**
 * DANNAuth: Pure localStorage authentication using Web Crypto API hashes.
 * - All users: localStorage["dann_users"] = [{email, username, salt, hash}]
 * - Current user: localStorage["dann_currentUser"] = {email, username}
 * - API: window.DANNAuth = { signUp, signIn, signOut, currentUser, onChange }
 */
(function () {
  const USERS_KEY = "dann_users";
  const CURR_KEY = "dann_currentUser";
  let changeHandlers = [];

  // Secure random 16-byte hex salt
  function generateSalt() {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // SHA-256 hex of (salt + password)
  async function hashPassword(salt, password) {
    const enc = new TextEncoder();
    const data = enc.encode(salt + password);
    const buf = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Load users from localStorage
  function getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY));
      return Array.isArray(users) ? users : [];
    } catch { return []; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // --- Cookie helpers ---
  function setCookie(name, val, days) {
    let expires = "";
    if (typeof days === "number" && days > 0) {
      const d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + d.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(val) + expires + "; path=/";
  }
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let c of ca) {
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
  }
  function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }

  // Set/Get current user in storage and cookie
  // setCurrentUser(user, rememberDays): user=null signs out; rememberDays=null sets session cookie, else days (default 30)
  function setCurrentUser(user, rememberDays = 30) {
    if (user) {
      const userObj = { email: user.email, username: user.username };
      localStorage.setItem(CURR_KEY, JSON.stringify(userObj));
      // If rememberDays is null/false/0, set session cookie (no expiry), else set with expiry
      if (rememberDays == null) {
        setCookie('dann_user', JSON.stringify(userObj));
      } else {
        setCookie('dann_user', JSON.stringify(userObj), rememberDays);
      }
    } else {
      localStorage.removeItem(CURR_KEY);
      deleteCookie('dann_user');
    }
    changeHandlers.forEach(h => { try { h(DANNAuth.currentUser()); } catch {} });
  }
  function getCurrentUser() {
    try {
      const local = localStorage.getItem(CURR_KEY);
      if (local) return JSON.parse(local);
    } catch {}
    // Fallback to cookie if not in localStorage
    try {
      const c = getCookie('dann_user');
      if (c) {
        const user = JSON.parse(c);
        // copy into localStorage for seamless session
        localStorage.setItem(CURR_KEY, JSON.stringify(user));
        return user;
      }
    } catch {}
    return null;
  }

  // Normalization helper for identifiers (trims and lowercases)
  function norm(v) { return (v || "").trim().toLowerCase(); }

  // Sign Up
  async function signUp({ email, password, username }) {
    email = norm(email);
    username = (username || "").trim(); // username is trimmed, but case-preserved
    if (!email || !username || !password) throw new Error("All fields required.");
    if (!/^[\w.+-]+@\w+\.\w+/.test(email)) throw new Error("Invalid email.");
    if (username.length < 3) throw new Error("Username too short.");
    if (password.length < 4 || password.length > 32) throw new Error("Password must be 4-32 characters.");
    let users = getUsers();
    if (users.some(u => norm(u.email) === email)) throw new Error("Email already registered.");
    if (users.some(u => norm(u.username) === norm(username))) throw new Error("Username already taken.");
    const salt = generateSalt();
    const hash = await hashPassword(salt, password);
    users.push({ email, username, salt, hash });
    saveUsers(users);
    setCurrentUser({ email, username });
  }

  // Sign In
  // Accepts optional boolean "remember" (default true): sets 30-day cookie if true, session cookie if false.
  async function signIn({ identifier, password, remember = true }) {
    identifier = norm(identifier);
    if (!identifier || !password) throw new Error("All fields required.");
    let users = getUsers();
    const user = users.find(u =>
      norm(u.email) === identifier ||
      norm(u.username) === identifier
    );
    if (!user) throw new Error("User not found.");
    const hash = await hashPassword(user.salt, password);
    if (hash !== user.hash) throw new Error("Incorrect password.");
    setCurrentUser({ email: user.email, username: user.username }, remember ? 30 : null);
  }

  // Sign Out
  function signOut() {
    setCurrentUser(null);
  }

  // Current user
  function currentUser() {
    return getCurrentUser();
  }

  // onChange: subscribe/unsubscribe
  function onChange(handler) {
    changeHandlers.push(handler);
    handler(currentUser());
    return () => {
      changeHandlers = changeHandlers.filter(h => h !== handler);
    };
  }

  // NAV BAR SWAP ("Sign Up" ↔ username, acts as Log Out)
  function updateNav(user) {
    const navLink = document.querySelector('nav a[href="signup.html"], nav a[href="#"]');
    if (!navLink) return;
    if (user) {
      navLink.textContent = user.username || user.email || "Account";
      navLink.href = '#';
      navLink.classList.remove('hover:text-orange-600');
      navLink.addEventListener('click', function navSignOutClick(e) {
        e.preventDefault();
        if (confirm('Log out?')) {
          DANNAuth.signOut();
          updateNav(null);
          location.reload();
        }
      }, { once: true });
    } else {
      navLink.textContent = 'Sign Up';
      navLink.href = 'signup.html';
    }

    // ---- Dashboard nav link insert/remove logic ----
    const ul = document.querySelector('nav ul');
    let dash = document.getElementById('dashboardNav');
    if (user) {
      if (!dash && ul) {
        dash = document.createElement('li');
        dash.id = 'dashboardNav';
        const a = document.createElement('a');
        a.href = 'dashboard.html';
        a.textContent = 'Dashboard';
        a.className = 'hover:text-orange-600';
        dash.appendChild(a);
        ul.appendChild(dash);
      }
    } else {
      if (dash) dash.remove();
    }
  }

  // Remember where the visitor was before they clicked Log-in / Sign-up.
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href && (href.indexOf('login.html') !== -1 || href.indexOf('signup.html') !== -1)) {
      localStorage.setItem('dann_prevPage', location.pathname.split('/').pop());
    }
  });

  // Listen to user state and update nav, robust to DOMContentLoaded timing
  (function initNav() {
    const run = () => DANNAuth.onChange(updateNav);
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  })();

  // Expose global
  const DANNAuth = { signUp, signIn, signOut, currentUser, onChange };
  window.DANNAuth = DANNAuth;
})();