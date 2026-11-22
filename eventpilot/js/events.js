/*
  events.js - עמוד "האירועים שלי": רשימת האירועים של המשתמש ויצירת אירוע חדש
*/

const currentUser = requireLogin();

const eventsList = document.getElementById("events-list");
const emptyState = document.getElementById("empty-state");
const newEventSection = document.getElementById("new-event-section");
const eventForm = document.getElementById("event-form");
const pageMessage = document.getElementById("page-message");

// בונה כרטיס אחד של אירוע
function createEventCard(event) {
  const summary = getEventSummary(event.id);
  const card = createElement("article", "card event-card");

  card.appendChild(createElement("span", "badge neutral", event.type));
  card.appendChild(createElement("h2", "", event.name));
  card.appendChild(createElement("p", "muted", formatDate(event.date) + " · " + event.location));

  const stats = createElement("p", "event-stats",
    summary.confirmedGuests + " אישרו הגעה · " + summary.openTasks + " משימות פתוחות");
  card.appendChild(stats);

  if (summary.overBudget) {
    card.appendChild(createElement("span", "badge danger", "חריגה מהתקציב"));
  }

  const actions = createElement("div", "card-actions");
  const openLink = createElement("a", "button primary small", "כניסה לאירוע");
  openLink.href = "event.html?event=" + event.id;
  actions.appendChild(openLink);

  const deleteButton = createElement("button", "button ghost small danger-text", "מחיקה");
  deleteButton.type = "button";
  deleteButton.addEventListener("click", function () {
    const approved = window.confirm("למחוק את האירוע \"" + event.name + "\" וכל הנתונים שלו?");
    if (approved) {
      deleteEvent(event.id);
      renderEvents();
      showMessage(pageMessage, "האירוע נמחק.", "success");
    }
  });
  actions.appendChild(deleteButton);
  card.appendChild(actions);

  return card;
}

function renderEvents() {
  const events = getEventsOfUser(currentUser.id);
  eventsList.innerHTML = "";
  events.forEach(function (event) {
    eventsList.appendChild(createEventCard(event));
  });
  emptyState.hidden = events.length > 0;
}

function toggleEventForm(show) {
  newEventSection.hidden = !show;
  if (show) {
    hideMessage(pageMessage);
    document.getElementById("event-name-input").focus();
  } else {
    eventForm.reset();
    clearFormErrors(eventForm);
  }
}

function handleCreateEvent(submitEvent) {
  submitEvent.preventDefault();
  const name = document.getElementById("event-name-input");
  const type = document.getElementById("event-type");
  const date = document.getElementById("event-date");
  const deadline = document.getElementById("event-deadline");
  const place = document.getElementById("event-location");
  const budget = document.getElementById("event-budget");
  const guests = document.getElementById("event-guests");

  const valid = runChecks(eventForm, [
    { input: name, valid: isValidName(name.value), message: "יש להזין שם אירוע (לפחות 2 תווים)." },
    { input: type, valid: type.value !== "", message: "יש לבחור סוג אירוע." },
    { input: date, valid: isTodayOrFuture(date.value), message: "יש לבחור תאריך שאינו בעבר." },
    { input: date, valid: isValidEventDate(date.value), message: "אפשר לתכנן אירוע עד " + MAX_YEARS_AHEAD + " שנים קדימה." },
    { input: deadline, valid: isTodayOrFuture(deadline.value), message: "יש לבחור מועד שאינו בעבר." },
    { input: deadline, valid: deadline.value <= date.value, message: "המועד האחרון לאישור חייב להיות עד תאריך האירוע." },
    { input: place, valid: place.value.trim().length >= 2, message: "יש להזין מיקום." },
    { input: budget, valid: isWholeNumberInRange(budget.value, 1, MAX_AMOUNT), message: "התקציב חייב להיות מספר שלם בין 1 ל-" + formatMoney(MAX_AMOUNT) + "." },
    { input: guests, valid: isWholeNumberInRange(guests.value, 1, 5000), message: "מספר המשתתפים חייב להיות בין 1 ל-5000." }
  ]);
  if (!valid) {
    return;
  }

  const result = createEvent(currentUser.id, {
    name: name.value.trim(),
    type: type.value,
    date: date.value,
    rsvpDeadline: deadline.value,
    location: place.value.trim(),
    budget: Number(budget.value),
    plannedGuests: Number(guests.value)
  });

  toggleEventForm(false);
  renderEvents();
  showMessage(pageMessage, "האירוע \"" + result.data.name + "\" נוצר בהצלחה.", "success");
}

if (currentUser) {
  setupHeader(currentUser, null);
  renderEvents();

  // לוח השנה בדפדפן מציע רק תאריכים בטווח המותר
  ["event-date", "event-deadline"].forEach(function (id) {
    const input = document.getElementById(id);
    input.min = todayString();
    input.max = latestEventDateString();
  });

  document.getElementById("new-event-button").addEventListener("click", function () {
    toggleEventForm(true);
  });
  document.getElementById("cancel-event-button").addEventListener("click", function () {
    toggleEventForm(false);
  });
  eventForm.addEventListener("submit", handleCreateEvent);
}
