/**
 * DANNAuth: Auth API for DANN using Firebase Authentication.
 * Requires firebase-app-compat.js, firebase-auth-compat.js, and firebase-config.js to be loaded first.
 */
(function () {
  // Import config
  // (for browser, expect firebaseConfig to be global or imported via <script type="module">)
  // Here, we assume firebaseConfig is in window scope after loading firebase-config.js

  // Initialise Firebase App
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig || {});
  }
  const auth = firebase.auth();

  // Helper: wrap user object to app's expected structure
  function userInfo(user) {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      username: user.displayName || user.email,
      displayName: user.displayName || "",
      emailVerified: user.emailVerified,
    };
  }

  // DANNAuth API
  const DANNAuth = {
    /**
     * Sign up a new user. Sets displayName = username after creation.
     * @param {Object} param0 {email, password, username}
     */
    async signUp({ email, password, username }) {
      // Create user
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      // Set displayName as username
      if (cred.user && username) {
        await cred.user.updateProfile({ displayName: username });
      }
      return userInfo(cred.user);
    },
    /**
     * Sign in with email/password. Identifier must be email.
     * @param {Object} param0 {identifier, password}
     */
    async signIn({ identifier, password }) {
      // For now, identifier must be an email.
      if (!identifier.includes("@")) {
        throw new Error("Please use your email address to log in.");
      }
      const cred = await auth.signInWithEmailAndPassword(identifier, password);
      return userInfo(cred.user);
    },
    /**
     * Sign out current user.
     */
    async signOut() {
      await auth.signOut();
    },
    /**
     * Gets the current user (or null if not signed in).
     */
    currentUser() {
      return userInfo(auth.currentUser);
    },
    /**
     * Listen to auth state changes.
     * @param {Function} handler (userInfo|null) => void
     */
    onAuthStateChanged(handler) {
      return auth.onAuthStateChanged(user => handler(userInfo(user)));
    }
  };

  // NAV BAR SWAP ("Sign Up" ↔ username)
  function updateNav(user) {
    const navLink = document.querySelector('nav a[href="signup.html"]');
    if (!navLink) return;
    if (user) {
      navLink.textContent = user.displayName || user.email || "Account";
      navLink.href = '#';
      navLink.classList.remove('hover:text-orange-600');
      navLink.addEventListener('click', function navSignOutClick(e) {
        e.preventDefault();
        if (confirm('Log out?')) {
          DANNAuth.signOut().then(() => {
            updateNav(null);
            location.reload();
          });
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

  // Listen to auth state and update nav
  window.addEventListener('DOMContentLoaded', function () {
    DANNAuth.onAuthStateChanged(updateNav);
  });

  // Expose global
  window.DANNAuth = DANNAuth;
})();