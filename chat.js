const CHAT_KEY = "dann_chat_messages";

function loadMsgs() {
  try {
    const a = JSON.parse(localStorage.getItem(CHAT_KEY));
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
function saveMsgs(arr) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(arr));
}

function safe(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("chatMessages");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const loginNotice = document.getElementById("chatLoginNotice");

  let user = (window.DANNAuth && DANNAuth.currentUser()) || null;

  function updateAuthUI(u) {
    if (u) {
      form.classList.remove("hidden");
      loginNotice.classList.add("hidden");
      form.elements["chatInput"].disabled = false;
    } else {
      form.classList.add("hidden");
      loginNotice.classList.remove("hidden");
      form.elements["chatInput"].disabled = true;
    }
  }

  updateAuthUI(user);

  function render() {
    const msgs = loadMsgs();
    box.innerHTML = msgs.map(m =>
      `<p class="mb-2"><span class="font-semibold">${safe(m.u)}</span> <span class="text-xs text-gray-400">${new Date(m.t).toLocaleTimeString()}</span>: ${safe(m.txt)}</p>`
    ).join("");
    box.scrollTop = box.scrollHeight;
  }

  render();

  // Listen to storage change (other tabs)
  window.addEventListener("storage", e => { if (e.key === CHAT_KEY) render(); });

  // React to auth changes in real time
  if (window.DANNAuth && typeof DANNAuth.onChange === "function") {
    DANNAuth.onChange(u => {
      user = u;
      updateAuthUI(user);
    });
  }

  // Attach submit handler always, but only process if user
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!user) return;
    const txt = (input.value || "").trim();
    if (!txt) return;
    const msgs = loadMsgs();
    msgs.push({
      id: Date.now(),
      u: user.username || user.email || "Anon",
      txt: txt.slice(0, 500),
      t: Date.now()
    });
    if (msgs.length > 500) msgs.splice(0, msgs.length - 500); // keep last 500
    saveMsgs(msgs);
    input.value = "";
    render();
  });
});