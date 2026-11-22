/*
  vendors.js - עמוד "ספקים ותקציב": הוספת ספקים, עדכון תשלומים וסיכום מול התקציב
*/

const currentUser = requireLogin();
const currentEvent = currentUser ? requireEvent(currentUser) : null;

const pageMessage = document.getElementById("page-message");
const vendorForm = document.getElementById("vendor-form");
const vendorsBody = document.getElementById("vendors-body");
const plannedInput = document.getElementById("vendor-planned");
const actualInput = document.getElementById("vendor-actual");
const preview = document.getElementById("vendor-preview");

// סטטוס התשלום נקבע אוטומטית לפי הסכומים
function getPaymentStatus(plannedCost, actualCost) {
  if (actualCost === 0) {
    return "unpaid";
  }
  return actualCost >= plannedCost ? "paid" : "partial";
}

function renderBudget() {
  const summary = getEventSummary(currentEvent.id);

  document.getElementById("budget-total").textContent = formatMoney(summary.budget);
  document.getElementById("budget-planned").textContent = formatMoney(summary.plannedCost);
  document.getElementById("budget-actual").textContent = formatMoney(summary.actualCost);

  const remaining = document.getElementById("budget-remaining");
  remaining.textContent = formatMoney(summary.remaining);
  remaining.className = summary.overBudget ? "danger-text" : "success-text";

  // פס ההתקדמות: אחוז התקציב שכבר מתוכנן
  const percent = setProgress(document.getElementById("budget-bar"), summary.plannedCost, summary.budget, true);
  document.getElementById("budget-bar-label").setAttribute("aria-label", percent + "% מהתקציב מתוכנן");

  const alert = document.getElementById("budget-alert");
  if (summary.overBudget) {
    alert.textContent = "חריגה מהתקציב: העלויות המתוכננות גבוהות ב-" +
      formatMoney(-summary.remaining) + " מהתקציב שהוגדר.";
    alert.hidden = false;
  } else {
    alert.hidden = true;
  }
}

// שדה לעדכון הסכום ששולם, ישירות בתוך הטבלה
function createActualCostInput(vendor) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = String(MAX_AMOUNT);
  input.step = "1";
  input.value = vendor.actualCost;
  input.className = "table-input";
  input.setAttribute("aria-label", "סכום ששולם ל" + vendor.name);

  input.addEventListener("change", function () {
    if (!isValidAmount(input.value)) {
      showMessage(pageMessage, "הסכום ששולם חייב להיות מספר שלם בין 0 ל-" + formatMoney(MAX_AMOUNT) + ".", "error");
      input.value = vendor.actualCost;
      return;
    }
    const actualCost = Number(input.value);
    updateVendor(vendor.id, {
      actualCost: actualCost,
      paymentStatus: getPaymentStatus(vendor.plannedCost, actualCost)
    });
    renderAll();
    if (actualCost > vendor.plannedCost) {
      showMessage(pageMessage, "שימו לב: שולם ל" + vendor.name + " יותר מהעלות המתוכננת.", "warning");
    } else {
      showMessage(pageMessage, "התשלום ל" + vendor.name + " עודכן.", "success");
    }
  });
  return input;
}

function createVendorRow(vendor) {
  const row = document.createElement("tr");
  row.appendChild(createCell("ספק", vendor.name));
  row.appendChild(createCell("שירות", vendor.service));
  row.appendChild(createCell("עלות מתוכננת", formatMoney(vendor.plannedCost)));
  row.appendChild(createCell("שולם בפועל", createActualCostInput(vendor)));

  const badgeType = { unpaid: "neutral", partial: "warning", paid: "success" }[vendor.paymentStatus];
  row.appendChild(createCell("סטטוס תשלום",
    createElement("span", "badge " + badgeType, PAYMENT_LABELS[vendor.paymentStatus])));

  const deleteButton = createElement("button", "button ghost small danger-text", "מחיקה");
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", "מחיקת הספק " + vendor.name);
  deleteButton.addEventListener("click", function () {
    if (window.confirm("למחוק את הספק " + vendor.name + "?")) {
      deleteVendor(vendor.id);
      renderAll();
      showMessage(pageMessage, "הספק נמחק.", "success");
    }
  });
  row.appendChild(createCell("פעולות", deleteButton));
  return row;
}

function renderVendors() {
  const vendors = getVendors(currentEvent.id);
  vendorsBody.innerHTML = "";
  vendors.forEach(function (vendor) {
    vendorsBody.appendChild(createVendorRow(vendor));
  });
  document.getElementById("empty-state").hidden = vendors.length > 0;
}

function renderAll() {
  renderBudget();
  renderVendors();
}

// תוך כדי הקלדת העלות - מראים מה תהיה היתרה אם הספק יתווסף
function updatePreview() {
  if (!isValidAmount(plannedInput.value)) {
    preview.textContent = "";
    preview.className = "hint preview";
    return;
  }
  const summary = getEventSummary(currentEvent.id);
  const remainingAfter = summary.remaining - Number(plannedInput.value);
  if (remainingAfter < 0) {
    preview.textContent = "אם תוסיפו את הספק הזה, תחרגו מהתקציב ב-" + formatMoney(-remainingAfter) + ".";
    preview.className = "hint preview danger-text";
  } else {
    preview.textContent = "אחרי הוספת הספק תישאר יתרה של " + formatMoney(remainingAfter) + ".";
    preview.className = "hint preview success-text";
  }
}

function handleAddVendor(submitEvent) {
  submitEvent.preventDefault();
  const name = document.getElementById("vendor-name");
  const service = document.getElementById("vendor-service");

  const valid = runChecks(vendorForm, [
    { input: name, valid: isValidName(name.value), message: "יש להזין שם ספק (לפחות 2 תווים)." },
    { input: service, valid: service.value.trim().length >= 2, message: "יש להזין סוג שירות." },
    { input: plannedInput, valid: isValidAmount(plannedInput.value) && Number(plannedInput.value) > 0, message: "העלות המתוכננת חייבת להיות מספר שלם בין 1 ל-" + formatMoney(MAX_AMOUNT) + "." },
    { input: actualInput, valid: isValidAmount(actualInput.value), message: "הסכום ששולם חייב להיות מספר שלם בין 0 ל-" + formatMoney(MAX_AMOUNT) + "." }
  ]);
  if (!valid) {
    return;
  }

  const plannedCost = Number(plannedInput.value);
  const actualCost = Number(actualInput.value);
  const result = addVendor(currentEvent.id, {
    name: name.value.trim(),
    service: service.value.trim(),
    plannedCost: plannedCost,
    actualCost: actualCost,
    paymentStatus: getPaymentStatus(plannedCost, actualCost)
  });

  vendorForm.reset();
  updatePreview();
  renderAll();

  const summary = getEventSummary(currentEvent.id);
  if (summary.overBudget) {
    showMessage(pageMessage, "הספק " + result.data.name + " נוסף, אבל העלויות המתוכננות חורגות עכשיו מהתקציב.", "warning");
  } else {
    showMessage(pageMessage, "הספק " + result.data.name + " נוסף.", "success");
  }
}

if (currentEvent) {
  setupHeader(currentUser, currentEvent);
  renderAll();

  vendorForm.addEventListener("submit", handleAddVendor);
  plannedInput.addEventListener("input", updatePreview);
}
