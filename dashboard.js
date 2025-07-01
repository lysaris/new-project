(function() {
  // Helpers
  function todoKey(email) {
    return "dann_" + encodeURIComponent(email) + "_todos";
  }
  function loadTodos(email) {
    try {
      const raw = localStorage.getItem(todoKey(email));
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveTodos(email, todos) {
    localStorage.setItem(todoKey(email), JSON.stringify(todos));
  }

  // Pomodoro helpers
  function pomodoroKey(email) {
    return "dann_" + encodeURIComponent(email) + "_pomodoro";
  }
  function loadPomodoro(email) {
    try {
      const raw = localStorage.getItem(pomodoroKey(email));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      return obj;
    } catch { return null; }
  }
  function savePomodoro(email, data) {
    if (data) {
      localStorage.setItem(pomodoroKey(email), JSON.stringify(data));
    } else {
      localStorage.removeItem(pomodoroKey(email));
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    if (window.DANNAuth && DANNAuth.redirectIfNotAuthenticated()) return;
    const user = DANNAuth.currentUser();
    const greeting = document.getElementById("dashboardGreeting");
    greeting.textContent = "Welcome, " + (user.username || user.email || "user") + "!";

    // --- To-Do Section ---
    const todoForm = document.getElementById("todoForm");
    const todoInput = document.getElementById("todoInput");
    const todoList = document.getElementById("todoList");
    const todoEmpty = document.getElementById("todoEmpty");
    const todoStats = document.getElementById("todoStats");
    const todoExport = document.getElementById("todoExport");
    const todoImport = document.getElementById("todoImport");

    let todos = loadTodos(user.email);

    function updateTodoStats() {
      if (!todos.length) {
        todoStats.style.display = "none";
        todoStats.textContent = "";
      } else {
        const done = todos.filter(t => t.done).length;
        todoStats.textContent = `Completed: ${done} / ${todos.length}`;
        todoStats.style.display = "";
      }
    }

    function render() {
      // Clean
      todoList.innerHTML = "";
      updateTodoStats();
      if (!todos.length) {
        todoEmpty.classList.remove("hidden");
        return;
      }
      todoEmpty.classList.add("hidden");
      todos.forEach(item => {
        const li = document.createElement("li");
        li.className = "flex items-center px-2 py-2 bg-gray-50 rounded-lg";
        // Checkbox
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !!item.done;
        cb.className = "mr-3 accent-orange-600";
        cb.addEventListener("change", function() {
          item.done = cb.checked;
          saveTodos(user.email, todos);
          render();
        });
        // Text
        const span = document.createElement("span");
        span.textContent = item.text;
        span.className = "flex-1" + (item.done ? " todo-done" : "");
        // Delete
        const del = document.createElement("span");
        del.className = "todo-x ml-2";
        del.title = "Delete";
        del.setAttribute("role", "button");
        del.setAttribute("tabindex", "0");
        del.innerHTML = "&times;";
        del.addEventListener("click", function() {
          todos = todos.filter(t => t.id !== item.id);
          saveTodos(user.email, todos);
          render();
        });
        del.addEventListener("keydown", function(e) {
          if (e.key === "Enter" || e.key === " ") del.click();
        });
        // Compose
        li.appendChild(cb);
        li.appendChild(span);
        li.appendChild(del);
        todoList.appendChild(li);
      });
    }
    // Add
    todoForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const txt = (todoInput.value || "").trim();
      if (!txt) return;
      if (txt.length > 100) {
        alert('Task text is too long (max 100 characters).');
        return;
      }
      todos.push({ id: Date.now(), text: txt, done: false });
      saveTodos(user.email, todos);
      todoInput.value = "";
      render();
    });

    // Export
    todoExport.addEventListener("click", function() {
      if (!todos.length) {
        alert("No tasks to export.");
        return;
      }
      const blob = new Blob([JSON.stringify(todos, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date();
      const fname = `todos-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}.json`;
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 500);
    });

    // Import
    todoImport.addEventListener("change", function() {
      const file = todoImport.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw 1;
          let byId = {};
          todos.forEach(t => byId[t.id] = true);
          let added = 0;
          imported.forEach(t => {
            if (!t || typeof t !== "object" || !("text" in t)) return;
            let id = t.id;
            if (id == null || byId[id]) {
              id = Date.now() + Math.floor(Math.random()*100000);
              while (byId[id]) id++;
            }
            // Text validation: trim, slice to 100 chars, skip empty
            const text = String(t.text).trim().slice(0, 100);
            if (!text) return;
            byId[id] = true;
            todos.push({id, text, done: !!t.done});
            added++;
          });
          saveTodos(user.email, todos);
          render();
          alert("Imported "+(added)+" tasks.");
        } catch {
          alert("Failed to import tasks: invalid JSON file.");
        } finally {
          todoImport.value = "";
        }
      };
      reader.readAsText(file);
    });

    render();

    // --- Pomodoro Section ---
    // Elements
    const pDisplay = document.getElementById("pomodoroDisplay");
    const pStart = document.getElementById("pomodoroStart");
    const pPause = document.getElementById("pomodoroPause");
    const pResume = document.getElementById("pomodoroResume");
    const pReset = document.getElementById("pomodoroReset");
    const pEdit  = document.getElementById("pomodoroEdit");
    const POMODORO_DEFAULT = 1500; // 25 min in seconds

    let pState = loadPomodoro(user.email) || {
      start: null,
      pausedAt: null,
      running: false,
      duration: POMODORO_DEFAULT
    };
    let timerInterval = null;

    // Helper to show/hide buttons
    function setVisible(btn, show) {
      btn.classList.toggle('hidden', !show);
    }

    function updatePomodoroDisplay() {
      const now = Date.now();
      let tleft = pState.duration;
      if (pState.running && pState.start) {
        tleft = Math.max(0, Math.round((pState.start + pState.duration * 1000 - now) / 1000));
      } else if (pState.pausedAt && pState.start) {
        tleft = Math.max(0, Math.round((pState.pausedAt - pState.start) / 1000));
      }
      const min = Math.floor(tleft / 60).toString().padStart(2, "0");
      const sec = (tleft % 60).toString().padStart(2, "0");
      document.getElementById("pomodoroTime").textContent = `${min}:${sec}`;
      // Explicitly set Pomodoro button visibility/disabled state for all states
      const notStarted = !pState.start;
      const running    = pState.running;
      const paused     = !running && !!pState.pausedAt;
      setVisible(pStart,  notStarted);
      setVisible(pPause,  running);
      setVisible(pResume, paused);
      setVisible(pReset,  running || paused || (tleft !== pState.duration));

      pStart.disabled  = !notStarted;
      pPause.disabled  = !running;
      pResume.disabled = !paused;
      pReset.disabled  = !(running || paused);
    }
    function clearPomodoroInterval() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
    function startPomodoroTimer() {
      clearPomodoroInterval();
      timerInterval = setInterval(function() {
        let tleft = pState.duration;
        if (pState.running && pState.start) {
          const now = Date.now();
          tleft = Math.max(0, Math.round(pState.duration - (now - pState.start) / 1000));
        }
        if (tleft <= 0) {
          // Preserve chosen duration
          const dur = pState.duration;
          clearPomodoroInterval();
          savePomodoro(user.email, null);
          pState = {
            start: null,
            pausedAt: null,
            running: false,
            duration: dur
          };
          updatePomodoroDisplay();
          alert("Pomodoro complete! Take a break.");
        } else {
          updatePomodoroDisplay();
        }
      }, 1000);
    }

    pStart.addEventListener("click", function() {
      if (pState.running) return;
      pState.start = Date.now();
      pState.pausedAt = null;
      pState.running = true;
      savePomodoro(user.email, pState);
      updatePomodoroDisplay();
      startPomodoroTimer();
    });
    pPause.addEventListener("click", function() {
      if (!pState.running) return;
      pState.pausedAt = Date.now();
      pState.running = false;
      savePomodoro(user.email, pState);
      updatePomodoroDisplay();
      clearPomodoroInterval();
    });
    pResume.addEventListener("click", function() {
      if (pState.running || !pState.pausedAt) return;
      const pauseDelta = Date.now() - pState.pausedAt;
      pState.start += pauseDelta;
      pState.pausedAt = null;
      pState.running = true;
      savePomodoro(user.email, pState);
      updatePomodoroDisplay();
      startPomodoroTimer();
    });
    pReset.addEventListener("click", function() {
      const dur = pState.duration;
      pState = {
        start: null,
        pausedAt: null,
        running: false,
        duration: dur
      };
      savePomodoro(user.email, pState);
      updatePomodoroDisplay();
      clearPomodoroInterval();
    });

    // Pomodoro Edit handler
    pEdit.addEventListener("click", function() {
      let minutes = prompt("Set Pomodoro duration (minutes, 1–180):", Math.round(pState.duration/60));
      if (minutes === null) return;
      minutes = parseInt(minutes.trim(), 10);
      if (isNaN(minutes) || minutes < 1 || minutes > 180) {
        alert("Invalid number (1–180).");
        return;
      }
      if (pState.running && !confirm("Timer is running. Changing duration will reset it. Continue?")) return;
      pState = {
        start: null,
        pausedAt: null,
        running: false,
        duration: minutes * 60
      };
      savePomodoro(user.email, pState);
      clearPomodoroInterval();
      updatePomodoroDisplay();
    });

    // Load on entry
    updatePomodoroDisplay();
    if (pState.running && pState.start) startPomodoroTimer();

    // Clean up on unload
    window.addEventListener("beforeunload", clearPomodoroInterval);
    window.addEventListener("pagehide", clearPomodoroInterval);
  });
})();