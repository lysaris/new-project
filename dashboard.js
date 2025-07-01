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

  // DOM
  document.addEventListener("DOMContentLoaded", function() {
    if (window.DANNAuth && DANNAuth.redirectIfNotAuthenticated()) return;
    const user = DANNAuth.currentUser();
    const greeting = document.getElementById("dashboardGreeting");
    greeting.textContent = "Welcome, " + (user.username || user.email || "user") + "!";

    const todoForm = document.getElementById("todoForm");
    const todoInput = document.getElementById("todoInput");
    const todoList = document.getElementById("todoList");
    const todoEmpty = document.getElementById("todoEmpty");
    let todos = loadTodos(user.email);

    function render() {
      // Clean
      todoList.innerHTML = "";
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
      todos.push({ id: Date.now(), text: txt, done: false });
      saveTodos(user.email, todos);
      todoInput.value = "";
      render();
    });

    render();
  });
})();