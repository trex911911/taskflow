// ============================================================
// TaskFlow — Premium To-Do List App
// ============================================================

// localStorage keys
const STORAGE_KEY = "todo-tasks";
const THEME_KEY = "todo-theme";
const STREAK_KEY = "todo-streak";
const VIEW_KEY = "todo-view";

// DOM element references
const taskInput = document.getElementById("task-input");
const prioritySelect = document.getElementById("priority-select");
const dueDateInput = document.getElementById("due-date-input");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const noResults = document.getElementById("no-results");
const searchInput = document.getElementById("search-input");
const todayDate = document.getElementById("today-date");
const themeToggle = document.getElementById("theme-toggle");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const analyticsSection = document.getElementById("analytics-section");
const statTotal = document.getElementById("stat-total");
const statCompleted = document.getElementById("stat-completed");
const statPending = document.getElementById("stat-pending");
const statPercent = document.getElementById("stat-percent");
const streakSection = document.getElementById("streak-section");
const streakCurrent = document.getElementById("streak-current");
const streakLongest = document.getElementById("streak-longest");
const streakMessage = document.getElementById("streak-message");
const voiceBtn = document.getElementById("voice-btn");
const voiceStatus = document.getElementById("voice-status");
const tabTasks = document.getElementById("tab-tasks");
const tabCalendar = document.getElementById("tab-calendar");
const tasksView = document.getElementById("tasks-view");
const calendarView = document.getElementById("calendar-view");
const calPrev = document.getElementById("cal-prev");
const calNext = document.getElementById("cal-next");
const calMonthLabel = document.getElementById("cal-month-label");
const calendarGrid = document.getElementById("calendar-grid");
const calSelectedLabel = document.getElementById("cal-selected-label");
const calendarTaskList = document.getElementById("calendar-task-list");
const calEmpty = document.getElementById("cal-empty");

// Current search query (used when filtering the visible list)
let searchQuery = "";

// ============================================================
// Theme (dark mode)
// ============================================================

/**
 * Apply the saved theme on page load.
 * Falls back to light mode if nothing is stored.
 */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", saved);
}

/**
 * Toggle between light and dark mode, then save the choice.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
}

// ============================================================
// Today's date
// ============================================================

/**
 * Display today's date in a friendly format at the top of the app.
 * Example: "Sunday, July 12, 2026"
 */
function displayTodayDate() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  todayDate.textContent = now.toLocaleDateString("en-US", options);
}

// ============================================================
// localStorage helpers
// ============================================================

/**
 * Load tasks from localStorage.
 * Older saved tasks without a priority get "medium" by default.
 */
function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  const tasks = JSON.parse(saved);

  // Backward compatibility: add priority to tasks saved before this upgrade
  return tasks.map((task) => ({
    ...task,
    priority: task.priority || "medium",
    dueDate: task.dueDate || null,
  }));
}

/**
 * Save the tasks array to localStorage as a JSON string.
 */
function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ============================================================
// Due dates
// ============================================================

/**
 * Determine the visual status of a task based on its due date.
 * @returns {"completed"|"overdue"|"today"|"upcoming"|"none"}
 */
function getDueDateStatus(task) {
  if (task.completed) return "completed";
  if (!task.dueDate) return "none";

  const today = getDateKey();

  if (task.dueDate < today) return "overdue";
  if (task.dueDate === today) return "today";
  return "upcoming";
}

/**
 * Pick a dot color class for calendar date markers.
 */
function getTaskDotClass(task) {
  const status = getDueDateStatus(task);

  if (status === "completed") return "cal-dot-green";
  if (status === "overdue") return "cal-dot-red";
  if (status === "today") return "cal-dot-orange";
  return "cal-dot-" + task.priority;
}

/**
 * Update a task's due date and refresh the UI.
 */
function updateTaskDueDate(id, dueDate) {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);

  if (!task) return;

  task.dueDate = dueDate || null;
  saveTasks(tasks);
  renderTasks(tasks);
  refreshCalendar();
}

// ============================================================
// Task statistics (progress bar + analytics)
// ============================================================

/**
 * Calculate task counts from the full task list.
 * Used by both the progress bar and analytics section.
 */
function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, pending, percent };
}

/**
 * Update the progress bar and its label.
 */
function updateProgress(tasks) {
  const { total, completed, percent } = getTaskStats(tasks);

  progressBar.style.width = percent + "%";
  progressBar.setAttribute("aria-valuenow", percent);
  progressText.textContent = completed + " of " + total + " completed";
}

/**
 * Update the Task Analytics cards with live counts.
 * Triggers a brief pop animation so changes feel instant and smooth.
 */
function updateAnalytics(tasks) {
  const { total, completed, pending, percent } = getTaskStats(tasks);

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statPending.textContent = pending;
  statPercent.textContent = percent + "%";

  // Replay the pop animation whenever stats change
  analyticsSection.classList.remove("stats-updated");
  void analyticsSection.offsetWidth;
  analyticsSection.classList.add("stats-updated");
}

/**
 * Refresh all dashboard stats (progress bar + analytics) at once.
 */
function updateDashboard(tasks) {
  updateProgress(tasks);
  updateAnalytics(tasks);
}

// ============================================================
// Daily Streak
// ============================================================

/**
 * Return today's date as a YYYY-MM-DD string (local timezone).
 * Used as a unique key for each calendar day.
 */
function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

/**
 * Return yesterday's date key in YYYY-MM-DD format.
 */
function getYesterdayKey() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
}

/**
 * Load streak data from localStorage.
 * Returns default values if nothing is saved yet.
 */
function loadStreak() {
  const saved = localStorage.getItem(STREAK_KEY);
  if (!saved) {
    return {
      lastCompletedDate: null,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
  return JSON.parse(saved);
}

/**
 * Save streak data to localStorage.
 */
function saveStreak(streak) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

/**
 * Check whether the user missed a day and reset the current streak if so.
 * The longest streak is never reduced here.
 */
function validateStreak(streak) {
  const today = getDateKey();
  const yesterday = getYesterdayKey();

  if (!streak.lastCompletedDate) {
    return streak;
  }

  const last = streak.lastCompletedDate;

  // Streak is still alive if the last completion was today or yesterday
  if (last === today || last === yesterday) {
    return streak;
  }

  // User missed at least one day — reset current streak only
  streak.currentStreak = 0;
  return streak;
}

/**
 * Pick a motivational message based on the current streak length.
 */
function getMotivationalMessage(currentStreak) {
  if (currentStreak === 0) {
    return "Complete a task today to start your streak!";
  }
  if (currentStreak === 1) {
    return "Great start! Keep it up!";
  }
  if (currentStreak <= 3) {
    return "You're on a roll! Keep it up!";
  }
  if (currentStreak <= 6) {
    return "Nice momentum! Stay consistent!";
  }
  if (currentStreak <= 13) {
    return "Amazing consistency! One week strong!";
  }
  if (currentStreak <= 29) {
    return "Incredible dedication! You're unstoppable!";
  }
  return "Legendary streak! Absolute champion!";
}

/**
 * Update the streak UI with current values and a motivational message.
 * @param {boolean} animate - Play celebration animation when true
 */
function updateStreakUI(animate = false) {
  const streak = loadStreak();

  streakCurrent.textContent = streak.currentStreak;
  streakLongest.textContent = streak.longestStreak;
  streakMessage.textContent = getMotivationalMessage(streak.currentStreak);

  if (animate) {
    streakSection.classList.remove("streak-increased");
    void streakSection.offsetWidth;
    streakSection.classList.add("streak-increased");
  }
}

/**
 * Record that the user completed at least one task today.
 * Called when a task is marked as complete.
 * @returns {{ increased: boolean }} Whether the current streak went up
 */
function recordDailyCompletion() {
  const streak = loadStreak();
  const today = getDateKey();
  const yesterday = getYesterdayKey();
  const previousStreak = streak.currentStreak;

  // Already counted today — no change needed
  if (streak.lastCompletedDate === today) {
    return { increased: false };
  }

  // Consecutive day — extend the streak
  if (streak.lastCompletedDate === yesterday) {
    streak.currentStreak += 1;
  } else {
    // First day or streak was broken — start at 1
    streak.currentStreak = 1;
  }

  streak.lastCompletedDate = today;
  streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
  saveStreak(streak);

  return { increased: streak.currentStreak > previousStreak };
}

/**
 * Validate saved streak data and render the streak section on page load.
 */
function initStreak() {
  const streak = validateStreak(loadStreak());
  saveStreak(streak);
  updateStreakUI(false);
}

// ============================================================
// Search
// ============================================================

/**
 * Check if a task's text matches the current search query.
 */
function matchesSearch(task) {
  if (!searchQuery) return true;
  return task.text.toLowerCase().includes(searchQuery.toLowerCase());
}

// ============================================================
// UI helpers
// ============================================================

/**
 * Show the correct empty-state message:
 * - "No tasks yet" when there are zero tasks
 * - "No matching tasks" when search filters everything out
 * - Hide both when tasks are visible
 */
function updateEmptyState(tasks) {
  const visibleCount = tasks.filter(matchesSearch).length;

  emptyState.classList.add("hidden");
  noResults.classList.add("hidden");

  if (tasks.length === 0) {
    emptyState.classList.remove("hidden");
  } else if (visibleCount === 0) {
    noResults.classList.remove("hidden");
  }
}

/**
 * Build the HTML label for a priority badge.
 */
function getPriorityLabel(priority) {
  const labels = { high: "High", medium: "Medium", low: "Low" };
  return labels[priority] || "Medium";
}

/**
 * Create a single <li> element for one task.
 * @param {Object} task - { id, text, completed, priority }
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  const dueStatus = getDueDateStatus(task);
  let className = "task-item";

  if (task.completed) className += " completed";
  if (dueStatus === "overdue") className += " task-overdue";
  else if (dueStatus === "today") className += " task-due-today";
  else if (dueStatus === "completed" && task.dueDate) className += " task-due-completed";

  li.className = className;
  li.dataset.id = task.id;

  // Hide tasks that don't match the search query
  if (!matchesSearch(task)) {
    li.classList.add("hidden-by-search");
  }

  // --- Drag handle ---
  const dragHandle = document.createElement("button");
  dragHandle.type = "button";
  dragHandle.className = "drag-handle";
  dragHandle.setAttribute("aria-label", "Drag to reorder");
  dragHandle.innerHTML = '<span class="drag-handle-icon" aria-hidden="true">⠿</span>';

  // --- Checkbox ---
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Mark task as complete");

  checkbox.addEventListener("change", () => {
    toggleTask(task.id);
  });

  // --- Task content (text + priority badge) ---
  const content = document.createElement("div");
  content.className = "task-content";

  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = task.text;

  const badge = document.createElement("span");
  badge.className = "priority-badge " + task.priority;
  badge.textContent = getPriorityLabel(task.priority);

  content.appendChild(span);
  content.appendChild(badge);

  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.className = "task-due-input glass-input";
  dueInput.value = task.dueDate || "";
  dueInput.setAttribute("aria-label", "Due date for " + task.text);

  dueInput.addEventListener("change", () => {
    updateTaskDueDate(task.id, dueInput.value);
  });

  content.appendChild(dueInput);

  // --- Delete button ---
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.setAttribute("aria-label", "Delete task");

  deleteBtn.addEventListener("click", () => {
    deleteTask(task.id, li);
  });

  li.appendChild(dragHandle);
  li.appendChild(checkbox);
  li.appendChild(content);
  li.appendChild(deleteBtn);

  return li;
}

/**
 * Re-render the full task list and refresh progress + empty states.
 */
function renderTasks(tasks) {
  taskList.innerHTML = "";

  tasks.forEach((task) => {
    taskList.appendChild(createTaskElement(task));
  });

  updateEmptyState(tasks);
  updateDashboard(tasks);
}

/**
 * Apply the search filter to already-rendered task items
 * without rebuilding the entire list.
 */
function applySearchFilter(tasks) {
  const items = taskList.querySelectorAll(".task-item");

  items.forEach((li) => {
    const task = tasks.find((t) => t.id === li.dataset.id);
    if (task && matchesSearch(task)) {
      li.classList.remove("hidden-by-search");
    } else {
      li.classList.add("hidden-by-search");
    }
  });

  updateEmptyState(tasks);
}

// ============================================================
// Task actions
// ============================================================

/**
 * Add a new task from the input field and priority dropdown.
 */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const tasks = loadTasks();

  const newTask = {
    id: Date.now().toString(),
    text: text,
    completed: false,
    priority: prioritySelect.value,
    dueDate: dueDateInput.value || null,
  };

  tasks.push(newTask);
  saveTasks(tasks);

  taskList.appendChild(createTaskElement(newTask));
  updateEmptyState(tasks);
  updateDashboard(tasks);
  refreshCalendar();

  taskInput.value = "";
  prioritySelect.value = "medium";
  dueDateInput.value = "";
  taskInput.focus();
}

/**
 * Toggle a task's completed status on or off.
 */
function toggleTask(id) {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);

  if (task) {
    task.completed = !task.completed;
    saveTasks(tasks);
    renderTasks(tasks);

    // Only count toward the streak when marking a task as complete
    if (task.completed) {
      const result = recordDailyCompletion();
      updateStreakUI(result.increased);
    }

    refreshCalendar();
  }
}

/**
 * Delete a task with a smooth slide-out animation.
 */
function deleteTask(id, element) {
  element.classList.add("removing");

  element.addEventListener("animationend", () => {
    const tasks = loadTasks().filter((t) => t.id !== id);
    saveTasks(tasks);
    element.remove();
    updateEmptyState(tasks);
    updateDashboard(tasks);
    refreshCalendar();
  });
}

// ============================================================
// Event listeners
// ============================================================

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});

// Filter tasks as the user types in the search box
searchInput.addEventListener("input", (event) => {
  searchQuery = event.target.value.trim();
  applySearchFilter(loadTasks());
});

themeToggle.addEventListener("click", toggleTheme);

// ============================================================
// Voice Input (Web Speech API)
// ============================================================

// Browser prefix: Chrome/Edge use webkitSpeechRecognition
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

/**
 * Check whether this browser supports the Web Speech API.
 */
function isSpeechSupported() {
  return !!SpeechRecognition;
}

/**
 * Show a status message below the task input.
 * @param {string} message - Text to display
 * @param {"info"|"listening"|"error"} type - Controls styling
 */
function showVoiceStatus(message, type = "info") {
  voiceStatus.textContent = message;
  voiceStatus.classList.remove("hidden", "listening-msg", "error");

  if (type === "listening") {
    voiceStatus.classList.add("listening-msg");
  } else if (type === "error") {
    voiceStatus.classList.add("error");
  }
}

/**
 * Hide the voice status message.
 */
function hideVoiceStatus() {
  voiceStatus.textContent = "";
  voiceStatus.classList.add("hidden");
  voiceStatus.classList.remove("listening-msg", "error");
}

/**
 * Enter listening mode — update button and status UI.
 */
function setListeningState(active) {
  isListening = active;
  voiceBtn.classList.toggle("listening", active);
  voiceBtn.setAttribute("aria-label", active ? "Stop listening" : "Voice input");

  if (active) {
    showVoiceStatus("Listening... Speak now", "listening");
  }
}

/**
 * Map Speech API error codes to user-friendly messages.
 */
function getVoiceErrorMessage(errorCode) {
  const messages = {
    "not-allowed": "Microphone permission denied. Allow mic access in your browser settings.",
    "no-speech": "No speech detected. Please try again.",
    "audio-capture": "No microphone found. Connect a mic and try again.",
    "network": "Network error. Check your connection and try again.",
    "aborted": "",
  };
  return messages[errorCode] || "Voice recognition failed. Please try again.";
}

/**
 * Stop the speech recognizer and reset the listening UI.
 */
function stopListening() {
  setListeningState(false);
  if (recognition) {
    try {
      recognition.stop();
    } catch (error) {
      // Already stopped — safe to ignore
    }
  }
}

/**
 * Start listening via the Web Speech API.
 */
function startListening() {
  if (!recognition) return;

  try {
    recognition.start();
  } catch (error) {
    // Recognition may already be running if the user clicked quickly
    if (error.name === "InvalidStateError") {
      stopListening();
    }
  }
}

/**
 * Toggle voice input on/off when the microphone button is clicked.
 */
function toggleVoiceInput() {
  if (!isSpeechSupported()) {
    showVoiceStatus(
      "Voice input is not supported in this browser. Try Chrome or Edge.",
      "error"
    );
    return;
  }

  if (isListening) {
    stopListening();
    hideVoiceStatus();
    return;
  }

  startListening();
}

/**
 * Set up speech recognition and wire up event handlers.
 */
function initVoiceInput() {
  if (!isSpeechSupported()) {
    voiceBtn.disabled = true;
    voiceBtn.title = "Voice input not supported in this browser";
    showVoiceStatus(
      "Voice input is not supported in this browser. Try Chrome or Edge.",
      "error"
    );
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    setListeningState(true);
  };

  recognition.onresult = (event) => {
    let transcript = "";
    let isFinal = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        isFinal = true;
      }
    }

    const text = transcript.trim();

    if (text) {
      taskInput.value = text;
      taskInput.focus();
      taskInput.setSelectionRange(text.length, text.length);
    }

    if (isFinal) {
      if (text) {
        showVoiceStatus("Speech captured — edit if needed, then press Add.");
      }
      stopListening();
    } else if (text) {
      showVoiceStatus("Listening... " + text, "listening");
    }
  };

  recognition.onerror = (event) => {
    const message = getVoiceErrorMessage(event.error);

    stopListening();

    if (message) {
      showVoiceStatus(message, "error");
    } else {
      hideVoiceStatus();
    }
  };

  recognition.onend = () => {
    if (isListening) {
      setListeningState(false);
    }
  };

  voiceBtn.addEventListener("click", toggleVoiceInput);
}

// ============================================================
// Drag & Drop Reordering
// ============================================================

// Tracks the active drag session (null when not dragging)
let dragState = null;

/**
 * Clear drop-indicator highlights from all task items.
 */
function clearDropIndicators() {
  taskList.querySelectorAll(".task-item").forEach((item) => {
    item.classList.remove("drop-above", "drop-below");
  });
}

/**
 * Reset drag styles and remove document-level listeners.
 */
function endDragSession() {
  if (!dragState) return;

  dragState.draggedElement.classList.remove("dragging");
  dragState.draggedElement.style.transform = "";
  clearDropIndicators();

  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
  document.removeEventListener("pointercancel", onDragEnd);

  dragState = null;
}

/**
 * Find which task item the pointer is over and whether
 * the drop should go above or below it.
 */
function getDropTarget(clientY) {
  const items = taskList.querySelectorAll(
    ".task-item:not(.hidden-by-search):not(.dragging)"
  );

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      const midpoint = rect.top + rect.height / 2;
      return {
        element: item,
        id: item.dataset.id,
        position: clientY < midpoint ? "above" : "below",
      };
    }
  }

  return null;
}

/**
 * Persist task order based on the current DOM order.
 * The array order in localStorage matches the visual list order.
 */
function saveOrderFromDOM() {
  const tasks = loadTasks();
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const orderedIds = [...taskList.querySelectorAll(".task-item")].map(
    (item) => item.dataset.id
  );

  const reordered = orderedIds
    .map((id) => taskMap.get(id))
    .filter((task) => task !== undefined);

  saveTasks(reordered);
}

/**
 * Move the dragged element to its drop position in the DOM,
 * then save the new order to localStorage.
 */
function applyReorder() {
  if (!dragState || !dragState.dropTarget) return;

  const { draggedElement, dropTarget } = dragState;

  if (dropTarget.position === "above") {
    taskList.insertBefore(draggedElement, dropTarget.element);
  } else {
    taskList.insertBefore(draggedElement, dropTarget.element.nextSibling);
  }

  saveOrderFromDOM();
}

/**
 * Begin dragging when the user presses the drag handle.
 */
function onHandlePointerDown(event) {
  const handle = event.target.closest(".drag-handle");
  if (!handle) return;

  const item = handle.closest(".task-item");
  if (!item || item.classList.contains("hidden-by-search")) return;

  event.preventDefault();
  handle.setPointerCapture(event.pointerId);

  dragState = {
    draggedElement: item,
    draggedId: item.dataset.id,
    handle: handle,
    startY: event.clientY,
    dropTarget: null,
  };

  item.classList.add("dragging");

  document.addEventListener("pointermove", onDragMove);
  document.addEventListener("pointerup", onDragEnd);
  document.addEventListener("pointercancel", onDragEnd);
}

/**
 * Move the dragged task with the pointer and highlight the drop zone.
 */
function onDragMove(event) {
  if (!dragState) return;

  event.preventDefault();

  const offsetY = event.clientY - dragState.startY;
  dragState.draggedElement.style.transform = "translateY(" + offsetY + "px)";

  const target = getDropTarget(event.clientY);
  clearDropIndicators();

  if (target && target.element !== dragState.draggedElement) {
    const className = target.position === "above" ? "drop-above" : "drop-below";
    target.element.classList.add(className);
    dragState.dropTarget = target;
  } else {
    dragState.dropTarget = null;
  }
}

/**
 * Finish dragging — apply the reorder and clean up.
 */
function onDragEnd(event) {
  if (!dragState) return;

  try {
    dragState.handle.releasePointerCapture(event.pointerId);
  } catch (error) {
    // Pointer may already be released
  }

  applyReorder();
  endDragSession();
}

/**
 * Attach drag-and-drop listeners to the task list.
 * Uses event delegation so handles work after re-renders.
 */
function initDragAndDrop() {
  taskList.addEventListener("pointerdown", onHandlePointerDown);
}

// ============================================================
// View tabs (Tasks | Calendar)
// ============================================================

/**
 * Switch between the Tasks view and Calendar view.
 */
function switchView(viewName) {
  const isTasks = viewName === "tasks";

  tabTasks.classList.toggle("active", isTasks);
  tabCalendar.classList.toggle("active", !isTasks);
  tabTasks.setAttribute("aria-selected", isTasks);
  tabCalendar.setAttribute("aria-selected", !isTasks);

  tasksView.classList.toggle("active", isTasks);
  calendarView.classList.toggle("active", !isTasks);

  localStorage.setItem(VIEW_KEY, viewName);

  if (!isTasks) {
    refreshCalendar();
  }
}

/**
 * Restore the last active view from localStorage.
 */
function initViews() {
  const savedView = localStorage.getItem(VIEW_KEY) || "tasks";

  tabTasks.addEventListener("click", () => switchView("tasks"));
  tabCalendar.addEventListener("click", () => switchView("calendar"));

  switchView(savedView === "calendar" ? "calendar" : "tasks");
}

// ============================================================
// Calendar View
// ============================================================

// Tracks which month is displayed and which date is selected
const calendarState = {
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  selectedDate: getDateKey(),
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Build a YYYY-MM-DD key for a specific day in the calendar month.
 */
function getCalendarDateKey(year, month, day) {
  const monthStr = String(month + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  return year + "-" + monthStr + "-" + dayStr;
}

/**
 * Format a date key for display (e.g. "Monday, July 13, 2026").
 */
function formatDateLabel(dateKey) {
  const parts = dateKey.split("-");
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Return all tasks due on a specific date.
 */
function getTasksForDate(dateKey) {
  return loadTasks().filter((task) => task.dueDate === dateKey);
}

/**
 * Render the monthly calendar grid with dots for task dates.
 */
function renderCalendar() {
  const { viewYear, viewMonth, selectedDate } = calendarState;
  const today = getDateKey();

  calMonthLabel.textContent = MONTH_NAMES[viewMonth] + " " + viewYear;
  calendarGrid.innerHTML = "";

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const tasks = loadTasks();

  // Empty cells before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day-empty";
    empty.setAttribute("aria-hidden", "true");
    calendarGrid.appendChild(empty);
  }

  // One button per day
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = getCalendarDateKey(viewYear, viewMonth, day);
    const dayTasks = tasks.filter((task) => task.dueDate === dateKey);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day";
    btn.dataset.date = dateKey;
    btn.setAttribute("aria-label", formatDateLabel(dateKey));

    if (dateKey === today) btn.classList.add("today");
    if (dateKey === selectedDate) btn.classList.add("selected");

    const dayNum = document.createElement("span");
    dayNum.className = "cal-day-num";
    dayNum.textContent = day;
    btn.appendChild(dayNum);

    if (dayTasks.length > 0) {
      const dots = document.createElement("span");
      dots.className = "cal-dots";

      dayTasks.slice(0, 4).forEach((task) => {
        const dot = document.createElement("span");
        dot.className = "cal-dot " + getTaskDotClass(task);
        dots.appendChild(dot);
      });

      btn.appendChild(dots);
    }

    btn.addEventListener("click", () => selectCalendarDate(dateKey));
    calendarGrid.appendChild(btn);
  }
}

/**
 * Select a date and show its due tasks in the panel below.
 */
function selectCalendarDate(dateKey) {
  calendarState.selectedDate = dateKey;
  renderCalendar();
  renderCalendarDayTasks(dateKey);
}

/**
 * Render the list of tasks due on the selected calendar date.
 */
function renderCalendarDayTasks(dateKey) {
  const tasks = getTasksForDate(dateKey);

  calSelectedLabel.textContent = "Tasks for " + formatDateLabel(dateKey);
  calendarTaskList.innerHTML = "";

  if (tasks.length === 0) {
    calEmpty.classList.remove("hidden");
    return;
  }

  calEmpty.classList.add("hidden");

  tasks.forEach((task) => {
    const status = getDueDateStatus(task);
    const li = document.createElement("li");
    li.className = "cal-task-item cal-task-" + status;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cal-task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task as complete");

    checkbox.addEventListener("change", () => {
      toggleTask(task.id);
    });

    const text = document.createElement("span");
    text.className = "cal-task-text";
    text.textContent = task.text;

    const badge = document.createElement("span");
    badge.className = "priority-badge " + task.priority;
    badge.textContent = getPriorityLabel(task.priority);

    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(badge);
    calendarTaskList.appendChild(li);
  });
}

/**
 * Refresh the calendar grid and selected-day task list.
 */
function refreshCalendar() {
  if (!calendarView.classList.contains("active")) return;

  renderCalendar();
  renderCalendarDayTasks(calendarState.selectedDate);
}

/**
 * Go to the previous or next month.
 */
function changeCalendarMonth(offset) {
  calendarState.viewMonth += offset;

  if (calendarState.viewMonth > 11) {
    calendarState.viewMonth = 0;
    calendarState.viewYear += 1;
  } else if (calendarState.viewMonth < 0) {
    calendarState.viewMonth = 11;
    calendarState.viewYear -= 1;
  }

  renderCalendar();
}

/**
 * Wire up calendar navigation and render the initial month.
 */
function initCalendar() {
  calPrev.addEventListener("click", () => changeCalendarMonth(-1));
  calNext.addEventListener("click", () => changeCalendarMonth(1));
  renderCalendar();
  renderCalendarDayTasks(calendarState.selectedDate);
}

// ============================================================
// Initialise the app on page load
// ============================================================

initTheme();
displayTodayDate();
initStreak();
initVoiceInput();
initDragAndDrop();
initViews();
initCalendar();

const tasks = loadTasks();
renderTasks(tasks);
taskInput.focus();
