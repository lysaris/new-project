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
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch { return []; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Set/Get current user in storage
  function setCurrentUser(user) {
    if (user) localStorage.setItem(CURR_KEY, JSON.stringify({ email: user.email, username: user.username }));
    else localStorage.removeItem(CURR_KEY);
    changeHandlers.forEach(h => { try { h(DANNAuth.currentUser()); } catch {} });
  }
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(CURR_KEY)) || null; } catch { return null; }
  }

  // Sign Up
  async function signUp({ email, password, username }) {
    email = (email || "").toLowerCase().trim();
    username = (username || "").trim();
    if (!email || !username || !password) throw new Error("All fields required.");
    if (!/^[\w.+-]+@\w+\.\w+/.test(email)) throw new Error("Invalid email.");
    if (username.length < 3) throw new Error("Username too short.");
    if (password.length < 2 || password.length > 8) throw new Error("Password must be 2-8 chars.");
    let users = getUsers();
    if (users.some(u => u.email === email)) throw new Error("Email already registered.");
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) throw new Error("Username already taken.");
    const salt = generateSalt();
    const hash = await hashPassword(salt, password);
    users.push({ email, username, salt, hash });
    saveUsers(users);
    setCurrentUser({ email, username });
  }

  // Sign In
  async function signIn({ identifier, password }) {
    identifier = (identifier || "").trim();
    if (!identifier || !password) throw new Error("All fields required.");
    let users = getUsers();
    const user = users.find(u =>
      u.email === identifier.toLowerCase() ||
      u.username.toLowerCase() === identifier.toLowerCase()
    );
    if (!user) throw new Error("User not found.");
    const hash = await hashPassword(user.salt, password);
    if (hash !== user.hash) throw new Error("Incorrect password.");
    setCurrentUser({ email: user.email, username: user.username });
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
    const navLink = document.querySelector('nav a[href="signup.html"]');
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

  // Listen to user state and update nav
  window.addEventListener('DOMContentLoaded', function () {
    DANNAuth.onChange(updateNav);
  });

  // Expose global
  const DANNAuth = { signUp, signIn, signOut, currentUser, onChange };
  window.DANNAuth = DANNAuth;
})();