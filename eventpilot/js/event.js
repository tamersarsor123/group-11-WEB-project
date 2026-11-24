/*
  event.js - עמוד "האירוע שלי": תמונת מצב, התראות, עריכת פרטים ומשימות
*/

const currentUser = requireLogin();
let currentEvent = currentUser ? requireEvent(currentUser) : null;

const pageMessage = document.getElementById("page-message");
const alertsArea = document.getElementById("alerts");
const tasksList = document.getElementById("tasks-list");
const taskForm = document.getElementById("task-form");
const editSection = document.getElementById("edit-event-section");
const editForm = document.getElementById("edit-event-form");

// כמה ימים נשארו מהיום עד תאריך (בפורמט 2026-12-31). שלילי אם התאריך עבר.
function daysUntil(dateText) {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(todayString() + "T00:00:00");
  const target = new Date(dateText + "T00:00:00");
  return Math.round((target - today) / dayMs);
}

// כותרת האירוע: סוג, שם, פרטים וספירה לאחור
function renderEventDetails() {
  document.getElementById("event-name").textContent = currentEvent.name;
  document.getElementById("detail-type").textContent = currentEvent.type;
  document.getElementById("detail-date").textContent = formatDate(currentEvent.date);
  document.getElementById("detail-location").textContent = currentEvent.location;
  document.getElementById("detail-deadline").textContent = formatDate(currentEvent.rsvpDeadline);

  const days = daysUntil(currentEvent.date);
  const number = document.getElementById("countdown-number");
  const label = document.getElementById("countdown-label");
  if (days > 1) {
    number.textContent = days;
    label.textContent = "ימים לאירוע";
  } else if (days === 1) {
    number.textContent = "מחר";
    label.textContent = "האירוע";
  } else if (days === 0) {
    number.textContent = "היום";
    label.textContent = "האירוע";
  } else {
    number.textContent = "✓";
    label.textContent = "האירוע הסתיים";
  }
}

/*
  גרף עוגה של סטטוסי ההזמנות.
  conic-gradient מצייר עיגול שבו כל צבע תופס זווית לפי האחוז שלו:
  ירוק = אישרו, כתום = טרם השיבו, אדום = לא מגיעים.
*/
function renderRsvpChart(summary) {
  const total = summary.invitationsCount;
  const attending = total - summary.pendingInvitations - summary.declinedInvitations;
  const attendingEnd = total ? (attending / total) * 100 : 0;
  const pendingEnd = total ? ((attending + summary.pendingInvitations) / total) * 100 : 0;

  const donut = document.getElementById("rsvp-donut");
  donut.style.background = total
    ? "conic-gradient(var(--green) 0 " + attendingEnd + "%, var(--amber) " + attendingEnd + "% " +
      pendingEnd + "%, var(--red) " + pendingEnd + "% 100%)"
    : "var(--track)";
  donut.setAttribute("aria-label", attending + " אישרו הגעה, " + summary.pendingInvitations +
    " טרם השיבו, " + summary.declinedInvitations + " לא מגיעים");

  document.getElementById("donut-total").textContent = total;
  document.getElementById("legend-attending").textContent = attending;
  document.getElementById("legend-pending").textContent = summary.pendingInvitations;
  document.getElementById("legend-declined").textContent = summary.declinedInvitations;
}

// מעדכן את כרטיסי הסיכום ואת ההתראות לפי הנתונים העדכניים
function renderSummary() {
  const summary = getEventSummary(currentEvent.id);

  // משתתפים: כמה אישרו מתוך המתוכנן. מעבר למתוכנן - הפס אדום
  document.getElementById("stat-confirmed").textContent = summary.confirmedGuests;
  document.getElementById("stat-confirmed-note").textContent =
    "אישרו מתוך " + currentEvent.plannedGuests + " מתוכננים · " +
    summary.pendingInvitations + " הזמנות טרם השיבו";
  setProgress(document.getElementById("stat-guests-bar"), summary.confirmedGuests, currentEvent.plannedGuests, false);

  // תקציב: העלויות המתוכננות מתוך התקציב. קרוב לתקציב - כתום, חריגה - אדום
  document.getElementById("stat-planned").textContent = formatMoney(summary.totalCost);
  document.getElementById("stat-planned-note").textContent =
    "עלויות מתוך " + formatMoney(summary.budget) + " · שולם " + formatMoney(summary.actualCost);
  setProgress(document.getElementById("stat-budget-bar"), summary.totalCost, summary.budget, true);
  setProgress(document.getElementById("stat-paid-bar"), summary.actualCost, summary.budget, true);

  const vendors = getVendors(currentEvent.id);
  const paidVendors = vendors.filter(function (vendor) {
    return vendor.paymentStatus === "paid" || vendor.paymentStatus === "overpaid";
  }).length;
  document.getElementById("stat-vendors").textContent = vendors.length;
  document.getElementById("stat-vendors-note").textContent = paidVendors + " שולמו במלואם";

  document.getElementById("stat-seated").textContent = summary.seatedGuests + " / " + summary.confirmedGuests;

  renderRsvpChart(summary);

  alertsArea.innerHTML = "";
  if (summary.overBudget) {
    alertsArea.appendChild(createElement("p", "message error",
      "חריגה מהתקציב: העלויות גבוהות ב-" + formatMoney(-summary.remaining) + " מהתקציב."));
  }
  if (summary.overCapacity) {
    alertsArea.appendChild(createElement("p", "message warning",
      "מספר המאשרים (" + summary.confirmedGuests + ") גבוה ממספר המשתתפים המתוכנן (" +
      currentEvent.plannedGuests + ")."));
  }
  // אורח הגדיל את מספר המגיעים והשולחן שלו כבר לא הספיק - השיבוץ בוטל
  if (summary.reseatNeeded > 0) {
    alertsArea.appendChild(createElement("p", "message warning",
      "הזמנות שהשיבוץ שלהן לשולחן בוטל כי מספר המגיעים גדל: " + summary.reseatNeeded +
      ". יש לשבץ אותן מחדש בעמוד סידורי ישיבה."));
  }
  if (currentEvent.rsvpDeadline < todayString()) {
    alertsArea.appendChild(createElement("p", "message warning",
      "המועד האחרון לאישור הגעה עבר. אורחים כבר לא יכולים לענות דרך הקישור."));
  }
}

function createTaskItem(task) {
  const item = createElement("li", task.done ? "task done" : "task");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "task-" + task.id;
  checkbox.checked = task.done;
  checkbox.addEventListener("change", function () {
    toggleTask(task.id);
    renderTasks();
    renderSummary();
  });

  const label = createElement("label", "task-title", task.title);
  label.htmlFor = checkbox.id;

  const isLate = !task.done && task.dueDate < todayString();
  const date = createElement("span", isLate ? "badge danger" : "badge neutral",
    (isLate ? "באיחור · " : "") + formatDate(task.dueDate));

  const deleteButton = createElement("button", "button ghost small danger-text", "מחיקה");
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", "מחיקת המשימה " + task.title);
  deleteButton.addEventListener("click", function () {
    deleteTask(task.id);
    renderTasks();
    renderSummary();
  });

  item.appendChild(checkbox);
  item.appendChild(label);
  item.appendChild(date);
  item.appendChild(deleteButton);
  return item;
}

function renderTasks() {
  const tasks = getTasks(currentEvent.id);
  // משימות פתוחות קודם, ובתוך כל קבוצה לפי תאריך יעד
  tasks.sort(function (a, b) {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });

  tasksList.innerHTML = "";
  tasks.forEach(function (task) {
    tasksList.appendChild(createTaskItem(task));
  });
  document.getElementById("tasks-empty").hidden = tasks.length > 0;

  const done = tasks.filter(function (task) { return task.done; }).length;
  const progress = document.getElementById("tasks-progress");
  progress.textContent = done + " מתוך " + tasks.length + " הושלמו";
  progress.hidden = tasks.length === 0;
}

function handleAddTask(submitEvent) {
  submitEvent.preventDefault();
  const title = document.getElementById("task-title");
  const date = document.getElementById("task-date");

  const valid = runChecks(taskForm, [
    { input: title, valid: title.value.trim().length >= 2, message: "יש להזין תיאור משימה (לפחות 2 תווים)." },
    { input: date, valid: isTodayOrFuture(date.value), message: "יש לבחור תאריך יעד שאינו בעבר." },
    { input: date, valid: date.value <= currentEvent.date, message: "תאריך היעד חייב להיות עד תאריך האירוע." }
  ]);
  if (!valid) {
    return;
  }

  addTask(currentEvent.id, title.value.trim(), date.value);
  taskForm.reset();
  renderTasks();
  renderSummary();
  showMessage(pageMessage, "המשימה נוספה.", "success");
}

function toggleEditForm(show) {
  editSection.hidden = !show;
  clearFormErrors(editForm);
  if (show) {
    document.getElementById("edit-location").value = currentEvent.location;
    document.getElementById("edit-budget").value = currentEvent.budget;
    document.getElementById("edit-guests").value = currentEvent.plannedGuests;
  }
}

function handleEditEvent(submitEvent) {
  submitEvent.preventDefault();
  const place = document.getElementById("edit-location");
  const budget = document.getElementById("edit-budget");
  const guests = document.getElementById("edit-guests");

  const valid = runChecks(editForm, [
    { input: place, valid: place.value.trim().length >= 2, message: "יש להזין מיקום." },
    { input: budget, valid: isWholeNumberInRange(budget.value, 1, MAX_AMOUNT), message: "התקציב חייב להיות מספר שלם בין 1 ל-" + formatMoney(MAX_AMOUNT) + "." },
    { input: guests, valid: isWholeNumberInRange(guests.value, 1, 5000), message: "מספר המשתתפים חייב להיות בין 1 ל-5000." }
  ]);
  if (!valid) {
    return;
  }

  const result = updateEvent(currentEvent.id, {
    location: place.value.trim(),
    budget: Number(budget.value),
    plannedGuests: Number(guests.value)
  });
  currentEvent = result.data;
  toggleEditForm(false);
  renderEventDetails();
  renderSummary();
  showMessage(pageMessage, "פרטי האירוע עודכנו.", "success");
}

if (currentEvent) {
  setupHeader(currentUser, currentEvent);
  renderEventDetails();
  renderSummary();
  renderTasks();

  taskForm.addEventListener("submit", handleAddTask);
  editForm.addEventListener("submit", handleEditEvent);
  document.getElementById("edit-event-button").addEventListener("click", function () {
    toggleEditForm(editSection.hidden);
  });
  document.getElementById("cancel-edit-button").addEventListener("click", function () {
    toggleEditForm(false);
  });
}
