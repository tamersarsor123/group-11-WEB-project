/*
  rsvp.js - עמוד אישור הגעה לאורח (השירות המרכזי של האפליקציה)

  האורח מגיע לעמוד דרך קישור אישי:  rsvp.html?token=XXXX
  אין צורך בהרשמה או בהתחברות. התשובה נשמרת ומעדכנת את נתוני האירוע אצל המארגן.
*/

// NOTE_MAX_LENGTH מוגדר ב-storage.js, כי גם ה"שרת" בודק את אורך ההערה

const token = getUrlParam("token");

const invalidSection = document.getElementById("invalid-section");
const formSection = document.getElementById("form-section");
const resultSection = document.getElementById("result-section");
const rsvpForm = document.getElementById("rsvp-form");
const formMessage = document.getElementById("form-message");
const answerYes = document.getElementById("answer-yes");
const answerNo = document.getElementById("answer-no");
const countField = document.getElementById("count-field");
const countInput = document.getElementById("guest-count");
const noteInput = document.getElementById("guest-note");
const noteCounter = document.getElementById("note-counter");

// ההזמנה והאירוע של האורח. נשארים null אם הקישור לא תקף.
let invitation = token ? getInvitationByToken(token) : null;
let guestEvent = invitation ? getEvent(invitation.eventId) : null;

function isDeadlinePassed() {
  return guestEvent.rsvpDeadline < todayString();
}

// שדה "כמה תגיעו" מוצג רק כשהאורח בוחר "מגיעים"
function updateCountVisibility() {
  countField.hidden = !answerYes.checked;
}

function updateNoteCounter() {
  noteCounter.textContent = noteInput.value.length + " / " + NOTE_MAX_LENGTH;
}

// כפתורי פלוס ומינוס: משנים את מספר המגיעים בצעד אחד, בין 1 למספר המוזמנים בהזמנה
function changeCount(step) {
  const current = parseInt(countInput.value, 10) || 0;
  const next = Math.min(Math.max(current + step, 1), invitation.invitedCount);
  countInput.value = next;
}

// ממלא את פרטי האירוע ואת התשובה הקודמת של האורח, אם יש
function showForm() {
  resultSection.hidden = true;
  formSection.hidden = false;
  formMessage.hidden = true;

  document.getElementById("event-title").textContent = guestEvent.name;
  document.getElementById("event-info").textContent =
    formatDate(guestEvent.date) + " · " + guestEvent.location;
  document.getElementById("greeting").textContent =
    "שלום " + invitation.contactName + ", ההזמנה שלכם כוללת עד " + invitation.invitedCount + " משתתפים.";

  countInput.max = invitation.invitedCount;
  document.getElementById("count-hint").textContent = "בין 1 ל-" + invitation.invitedCount;

  answerYes.checked = invitation.status === "attending";
  answerNo.checked = invitation.status === "declined";
  countInput.value = invitation.status === "attending" ? invitation.confirmedCount : invitation.invitedCount;
  noteInput.value = invitation.note;
  updateCountVisibility();
  updateNoteCounter();

  const currentAnswer = document.getElementById("current-answer");
  if (invitation.status === "attending") {
    currentAnswer.textContent = "כבר אישרתם הגעה של " + invitation.confirmedCount + " משתתפים. אפשר לעדכן את התשובה.";
    currentAnswer.hidden = false;
  } else if (invitation.status === "declined") {
    currentAnswer.textContent = "כבר עניתם שלא תגיעו. אפשר לעדכן את התשובה.";
    currentAnswer.hidden = false;
  } else {
    currentAnswer.hidden = true;
  }

  // אחרי המועד האחרון - מציגים הודעה ומסתירים את הטופס
  if (isDeadlinePassed()) {
    const closedMessage = document.getElementById("closed-message");
    closedMessage.textContent = "המועד האחרון לאישור הגעה (" +
      formatDate(guestEvent.rsvpDeadline) + ") עבר. לשינויים פנו ישירות למארגן האירוע.";
    closedMessage.hidden = false;
    currentAnswer.hidden = true;
    rsvpForm.hidden = true;
  }
}

function addDetail(list, term, value) {
  list.appendChild(Object.assign(document.createElement("dt"), { textContent: term }));
  list.appendChild(Object.assign(document.createElement("dd"), { textContent: value }));
}

// מציג לאורח את התוצאה אחרי שהתשובה נשמרה
function showResult() {
  formSection.hidden = true;
  resultSection.hidden = false;

  const attending = invitation.status === "attending";
  document.getElementById("result-title").textContent = attending ? "תודה, נתראה באירוע!" : "תודה שעדכנתם";
  document.getElementById("result-text").textContent = attending
    ? "אישור ההגעה שלכם נשמר והועבר למארגן."
    : "רשמנו שלא תוכלו להגיע. התשובה הועברה למארגן.";

  const details = document.getElementById("result-details");
  details.innerHTML = "";
  addDetail(details, "אירוע", guestEvent.name);
  addDetail(details, "תאריך", formatDate(guestEvent.date));
  addDetail(details, "מיקום", guestEvent.location);
  addDetail(details, "תשובה", attending ? "מגיעים" : "לא מגיעים");
  if (attending) {
    addDetail(details, "מספר משתתפים", String(invitation.confirmedCount));
  }
  if (invitation.note) {
    addDetail(details, "הערה", invitation.note);
  }
  addDetail(details, "אפשר לשנות עד", formatDate(guestEvent.rsvpDeadline));
}

/*
  טיפול בשליחת הטופס:
  1. בדיקות קלט בדפדפן (נבחרה תשובה, כמות בטווח, אורך ההערה)
  2. שליחה לשכבת הנתונים (מדמה את השרת), שבודקת שוב ושומרת
  3. הצגת התוצאה או הודעת שגיאה
*/
function handleSubmit(submitEvent) {
  submitEvent.preventDefault();
  formMessage.hidden = true;

  const answerChosen = answerYes.checked || answerNo.checked;
  const note = noteInput.value.trim();

  const checks = [
    { input: answerYes, valid: answerChosen, message: "יש לבחור אם אתם מגיעים או לא." },
    { input: noteInput, valid: note.length <= NOTE_MAX_LENGTH, message: "ההערה ארוכה מדי (עד " + NOTE_MAX_LENGTH + " תווים)." }
  ];
  // את הכמות בודקים רק אם האורח מגיע
  if (answerYes.checked) {
    checks.push({
      input: countInput,
      valid: isWholeNumberInRange(countInput.value, 1, invitation.invitedCount),
      message: "מספר המגיעים חייב להיות מספר שלם בין 1 ל-" + invitation.invitedCount + "."
    });
  }
  if (!runChecks(rsvpForm, checks)) {
    return;
  }

  const status = answerYes.checked ? "attending" : "declined";
  const count = answerYes.checked ? Number(countInput.value) : 0;
  const result = submitRsvp(token, status, count, note);

  if (!result.ok) {
    formMessage.textContent = result.error;
    formMessage.hidden = false;
    return;
  }

  invitation = result.data.invitation;
  showResult();
}

if (!invitation || !guestEvent) {
  invalidSection.hidden = false;
} else {
  showForm();

  answerYes.addEventListener("change", updateCountVisibility);
  answerNo.addEventListener("change", updateCountVisibility);
  noteInput.addEventListener("input", updateNoteCounter);
  document.getElementById("count-minus").addEventListener("click", function () { changeCount(-1); });
  document.getElementById("count-plus").addEventListener("click", function () { changeCount(1); });
  rsvpForm.addEventListener("submit", handleSubmit);
  document.getElementById("change-answer-button").addEventListener("click", showForm);
}
