/*
  guests.js - עמוד "מוזמנים": הוספת הזמנות, חיפוש וסינון, עדכון סטטוס וקישור אישי לאורח
*/

const currentUser = requireLogin();
const currentEvent = currentUser ? requireEvent(currentUser) : null;

const pageMessage = document.getElementById("page-message");
const invitationForm = document.getElementById("invitation-form");
const invitationsBody = document.getElementById("invitations-body");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");

// בונה את הכתובת המלאה של עמוד אישור ההגעה עבור הזמנה
function buildRsvpLink(invitation) {
  return new URL("rsvp.html?token=" + invitation.token, window.location.href).href;
}

function renderSummary() {
  const summary = getEventSummary(currentEvent.id);
  document.getElementById("stat-invitations").textContent = summary.invitationsCount;
  document.getElementById("stat-confirmed").textContent = summary.confirmedGuests;
  document.getElementById("stat-pending").textContent = summary.pendingInvitations;
  document.getElementById("stat-declined").textContent = summary.declinedInvitations;
}

function createStatusSelect(invitation) {
  const select = document.createElement("select");
  select.className = "status-select status-" + invitation.status;
  select.setAttribute("aria-label", "סטטוס הגעה של " + invitation.contactName);
  Object.keys(STATUS_LABELS).forEach(function (status) {
    const option = createElement("option", "", STATUS_LABELS[status]);
    option.value = status;
    option.selected = status === invitation.status;
    select.appendChild(option);
  });

  select.addEventListener("change", function () {
    showUpdateResult(invitation, updateInvitationStatus(invitation.id, select.value));
  });
  return select;
}

/*
  תא "מגיעים". כשההזמנה במצב "אישר הגעה" זה שדה שהמארגן יכול לעדכן,
  למשל אורח שענה בטלפון שיגיעו רק חלק מהמוזמנים בהזמנה.
*/
function createConfirmedCountCell(invitation) {
  if (invitation.status !== "attending") {
    return "-";
  }
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = String(invitation.invitedCount);
  input.step = "1";
  input.inputMode = "numeric";
  input.value = invitation.confirmedCount;
  input.className = "table-input";
  input.setAttribute("aria-label", "מספר המגיעים של " + invitation.contactName);

  input.addEventListener("change", function () {
    if (!isWholeNumberInRange(input.value, 1, invitation.invitedCount)) {
      showMessage(pageMessage, "מספר המגיעים חייב להיות מספר שלם בין 1 ל-" + invitation.invitedCount + ".", "error");
      input.value = invitation.confirmedCount;
      return;
    }
    showUpdateResult(invitation, updateInvitationStatus(invitation.id, "attending", Number(input.value)));
  });
  return input;
}

// מציג למארגן את תוצאת העדכון הידני (סטטוס או מספר מגיעים)
function showUpdateResult(invitation, result) {
  renderAll();
  if (!result.ok) {
    showMessage(pageMessage, result.error, "error");
  } else if (result.data.seatingCancelled) {
    showMessage(pageMessage, "ההזמנה של " + invitation.contactName + " עודכנה. השיבוץ שלה לשולחן בוטל.", "warning");
  } else {
    showMessage(pageMessage, "ההזמנה של " + invitation.contactName + " עודכנה.", "success");
  }
}

function createLinkButtons(invitation) {
  const wrapper = createElement("div", "row-actions");
  const link = buildRsvpLink(invitation);

  const copyButton = createElement("button", "button ghost small", "העתקה");
  copyButton.type = "button";
  copyButton.setAttribute("aria-label", "העתקת הקישור של " + invitation.contactName);
  copyButton.addEventListener("click", function () {
    // בחלק מהדפדפנים אין גישה ללוח כשפותחים קובץ מקומי - אז מציגים את הקישור בהודעה
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(function () {
        showMessage(pageMessage, "הקישור של " + invitation.contactName + " הועתק. אפשר לשלוח אותו לאורח.", "success");
      }).catch(function () {
        showMessage(pageMessage, "הקישור האישי: " + link, "success");
      });
    } else {
      showMessage(pageMessage, "הקישור האישי: " + link, "success");
    }
  });

  const openLink = createElement("a", "button ghost small", "פתיחה");
  openLink.href = link;
  openLink.target = "_blank";
  openLink.rel = "noopener";

  wrapper.appendChild(copyButton);
  wrapper.appendChild(openLink);
  return wrapper;
}

function createInvitationRow(invitation) {
  const row = document.createElement("tr");
  row.appendChild(createCell("שם", invitation.contactName));
  row.appendChild(createCell("טלפון", invitation.phone));
  row.appendChild(createCell("מוזמנים", invitation.invitedCount));
  row.appendChild(createCell("מגיעים", createConfirmedCountCell(invitation)));
  row.appendChild(createCell("סטטוס", createStatusSelect(invitation)));
  row.appendChild(createCell("קישור אישי", createLinkButtons(invitation)));

  const deleteButton = createElement("button", "button ghost small danger-text", "מחיקה");
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", "מחיקת ההזמנה של " + invitation.contactName);
  deleteButton.addEventListener("click", function () {
    if (window.confirm("למחוק את ההזמנה של " + invitation.contactName + "?")) {
      deleteInvitation(invitation.id);
      renderAll();
      showMessage(pageMessage, "ההזמנה נמחקה.", "success");
    }
  });
  row.appendChild(createCell("פעולות", deleteButton));
  return row;
}

// מציג רק את ההזמנות שמתאימות לחיפוש ולסינון
function renderInvitations() {
  const searchText = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const all = getInvitations(currentEvent.id);

  const visible = all.filter(function (invitation) {
    const matchesName = invitation.contactName.toLowerCase().includes(searchText);
    const matchesStatus = status === "all" || invitation.status === status;
    return matchesName && matchesStatus;
  });

  invitationsBody.innerHTML = "";
  visible.forEach(function (invitation) {
    invitationsBody.appendChild(createInvitationRow(invitation));
  });

  document.getElementById("results-count").textContent =
    "מוצגות " + visible.length + " מתוך " + all.length + " הזמנות";
  document.getElementById("empty-state").hidden = visible.length > 0;
}

function renderAll() {
  renderSummary();
  renderInvitations();
}

function handleAddInvitation(submitEvent) {
  submitEvent.preventDefault();
  const name = document.getElementById("contact-name");
  const phone = document.getElementById("contact-phone");
  const count = document.getElementById("invited-count");

  const valid = runChecks(invitationForm, [
    { input: name, valid: isValidName(name.value), message: "יש להזין שם (לפחות 2 תווים, לא רק ספרות)." },
    { input: phone, valid: isValidPhone(phone.value), message: "יש להזין טלפון תקין, למשל 050-1234567." },
    { input: count, valid: isWholeNumberInRange(count.value, 1, 20), message: "מספר המוזמנים חייב להיות מספר שלם בין 1 ל-20." }
  ]);
  if (!valid) {
    return;
  }

  const result = addInvitation(currentEvent.id, {
    contactName: name.value.trim(),
    phone: phone.value.trim(),
    invitedCount: Number(count.value)
  });
  if (!result.ok) {
    showMessage(pageMessage, result.error, "error");
    return;
  }

  invitationForm.reset();
  // מנקים חיפוש וסינון כדי שההזמנה החדשה תופיע ברשימה
  searchInput.value = "";
  statusFilter.value = "all";
  renderAll();
  showMessage(pageMessage, "ההזמנה של " + result.data.contactName + " נוספה. אפשר להעתיק את הקישור האישי ולשלוח לאורח.", "success");
}

if (currentEvent) {
  setupHeader(currentUser, currentEvent);
  renderAll();

  invitationForm.addEventListener("submit", handleAddInvitation);
  searchInput.addEventListener("input", renderInvitations);
  statusFilter.addEventListener("change", renderInvitations);

  // אם אורח ענה בלשונית אחרת, הנתונים מתעדכנים כאן בלי לרענן את העמוד
  window.addEventListener("storage", function (storageEvent) {
    if (storageEvent.key === DB_KEY) {
      renderAll();
    }
  });
}
