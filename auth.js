(function () {
  // Helpers
  function getUsers() {
    try { return JSON.parse(localStorage.getItem('dann_users')) || []; } catch (e) { return []; }
  }
  function saveUsers(arr) { localStorage.setItem('dann_users', JSON.stringify(arr)); }
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('dann_currentUser')); } catch (e) { return null; }
  }
  function setCurrentUser(userObj) {
    if (userObj) localStorage.setItem('dann_currentUser', JSON.stringify(userObj));
  }

  // NAV BAR SWAP ("Sign Up" ↔ username)
  function updateNav() {
    const navLink = document.querySelector('nav a[href="signup.html"]');
    if (!navLink) return;
    const user = getCurrentUser();
    if (user) {
      navLink.textContent = user.username;
      navLink.href = '#';
      navLink.classList.remove('hover:text-orange-600');
      navLink.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('Log out?')) {
          localStorage.removeItem('dann_currentUser');
          updateNav();
          location.reload();
        }
      });
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

  window.addEventListener('DOMContentLoaded', updateNav);

  // expose a tiny API for the form pages
  window.DANNAuth = {
    getUsers: getUsers,
    saveUsers: saveUsers,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
  };
})();