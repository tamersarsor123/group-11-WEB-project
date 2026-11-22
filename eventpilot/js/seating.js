/*
  seating.js - עמוד "סידורי ישיבה": יצירת שולחנות ושיבוץ הזמנות לפי קיבולת
*/

const currentUser = requireLogin();
const currentEvent = currentUser ? requireEvent(currentUser) : null;

const pageMessage = document.getElementById("page-message");
const assignForm = document.getElementById("assign-form");
const tableForm = document.getElementById("table-form");
const invitationSelect = document.getElementById("assign-invitation");
const tableSelect = document.getElementById("assign-table");

// מחזיר רק הזמנות שאישרו הגעה - רק אותן אפשר לשבץ
function getConfirmedInvitations() {
  return getInvitations(currentEvent.id).filter(function (invitation) {
    return invitation.status === "attending";
  });
}

function fillSelect(select, placeholder, options) {
  select.innerHTML = "";
  const first = createElement("option", "", placeholder);
  first.value = "";
  select.appendChild(first);
  options.forEach(function (item) {
    const option = createElement("option", "", item.text);
    option.value = item.value;
    select.appendChild(option);
  });
}

/*
  רשימת ההזמנות שאישרו הגעה.
  מוצגות כל ההזמנות המאושרות - גם אלה שכבר שובצו - עם תווית שמראה את מצב השיבוץ.
  כך אפשר גם לשבץ הזמנה חדשה וגם להעביר הזמנה משובצת לשולחן אחר.
*/
function renderConfirmedList(invitations, tables) {
  const list = document.getElementById("confirmed-list");
  list.innerHTML = "";

  invitations.forEach(function (invitation) {
    const item = createElement("li", "list-row");
    item.appendChild(createElement("span", "", invitation.contactName + " (" + invitation.confirmedCount + ")"));

    const table = tables.find(function (tableItem) { return tableItem.id === invitation.tableId; });
    if (table) {
      item.appendChild(createElement("span", "badge success", "שובץ ל" + table.name));
    } else if (invitation.needsReseat) {
      // מספר המגיעים גדל והשולחן הקודם כבר לא הספיק
      item.appendChild(createElement("span", "badge danger", "השיבוץ בוטל, יש לשבץ מחדש"));
    } else {
      item.appendChild(createElement("span", "badge warning", "טרם שובץ"));
    }
    list.appendChild(item);
  });

  document.getElementById("confirmed-empty").hidden = invitations.length > 0;

  const seated = invitations.filter(function (invitation) { return invitation.tableId; }).length;
  document.getElementById("seating-summary").textContent =
    seated + " מתוך " + invitations.length + " הזמנות שובצו";
}

/*
  ציור השולחן: עיגול במרכז, וסביבו כיסא לכל מקום.
  כל כיסא מקבל זווית משלו (--angle), וה-CSS מסובב אותו למקומו סביב השולחן.
  הכיסאות הראשונים, לפי מספר המקומות התפוסים, נצבעים ככיסאות תפוסים.
  לחיצה על השולחן בוחרת אותו בטופס השיבוץ.
*/
function createTableVisual(table, taken) {
  const visual = createElement("button", "table-visual" + (table.capacity > 16 ? " dense" : ""));
  visual.type = "button";
  visual.setAttribute("aria-label", table.name + ": " + taken + " מתוך " + table.capacity +
    " מקומות תפוסים. לחצו כדי לבחור את השולחן לשיבוץ");

  for (let seat = 0; seat < table.capacity; seat++) {
    const chair = createElement("span", seat < taken ? "chair taken" : "chair");
    chair.style.setProperty("--angle", (360 / table.capacity) * seat + "deg");
    visual.appendChild(chair);
  }

  const top = createElement("span", "table-top");
  top.appendChild(createElement("strong", "", table.name));
  // dir="ltr" כדי שהשבר יוצג "4 / 10" ולא יתהפך בגלל כיוון העברית
  const numbers = createElement("span", "", taken + " / " + table.capacity);
  numbers.dir = "ltr";
  top.appendChild(numbers);
  visual.appendChild(top);

  visual.addEventListener("click", function () {
    tableSelect.value = table.id;
    tableSelect.focus();
  });
  return visual;
}

function createTableCard(table, invitations) {
  const taken = countSeatsTaken(invitations, table.id);
  const free = table.capacity - taken;
  const card = createElement("article", "card table-card" + (free === 0 ? " full" : ""));

  const header = createElement("div", "table-card-header");
  header.appendChild(createElement("h3", "", table.name));
  header.appendChild(createElement("span", free === 0 ? "badge danger" : "badge neutral",
    free === 0 ? "מלא" : free + " מקומות פנויים"));
  card.appendChild(header);
  card.appendChild(createTableVisual(table, taken));
  card.appendChild(createElement("p", "muted", taken + " מתוך " + table.capacity + " מקומות תפוסים"));

  const list = createElement("ul", "plain-list");
  invitations.forEach(function (invitation) {
    if (invitation.tableId !== table.id) {
      return;
    }
    const item = createElement("li", "list-row");
    item.appendChild(createElement("span", "", invitation.contactName + " (" + invitation.confirmedCount + ")"));

    const removeButton = createElement("button", "button ghost small", "הסרה");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "הסרת " + invitation.contactName + " מ" + table.name);
    removeButton.addEventListener("click", function () {
      unassignInvitation(invitation.id);
      renderAll();
      showMessage(pageMessage, invitation.contactName + " הוסרו מ" + table.name + ".", "success");
    });
    item.appendChild(removeButton);
    list.appendChild(item);
  });
  card.appendChild(list);

  const deleteButton = createElement("button", "button ghost small danger-text", "מחיקת השולחן");
  deleteButton.type = "button";
  deleteButton.addEventListener("click", function () {
    if (window.confirm("למחוק את " + table.name + "? ההזמנות שבו יחזרו למצב \"טרם שובץ\".")) {
      deleteTable(table.id);
      renderAll();
      showMessage(pageMessage, table.name + " נמחק.", "success");
    }
  });
  card.appendChild(deleteButton);
  return card;
}

function renderAll() {
  const invitations = getConfirmedInvitations();
  const tables = getTables(currentEvent.id);

  renderConfirmedList(invitations, tables);

  const grid = document.getElementById("tables-grid");
  grid.innerHTML = "";
  tables.forEach(function (table) {
    grid.appendChild(createTableCard(table, invitations));
  });
  document.getElementById("tables-empty").hidden = tables.length > 0;

  fillSelect(invitationSelect, "בחרו הזמנה", invitations.map(function (invitation) {
    const where = invitation.tableId ? " - כבר משובץ" : "";
    return {
      value: invitation.id,
      text: invitation.contactName + " (" + invitation.confirmedCount + " משתתפים)" + where
    };
  }));

  fillSelect(tableSelect, "בחרו שולחן", tables.map(function (table) {
    const free = table.capacity - countSeatsTaken(invitations, table.id);
    return { value: table.id, text: table.name + " (" + free + " פנויים)" };
  }));
}

function handleAssign(submitEvent) {
  submitEvent.preventDefault();

  // בדיקת צד לקוח: נבחרו הזמנה ושולחן
  const valid = runChecks(assignForm, [
    { input: invitationSelect, valid: invitationSelect.value !== "", message: "יש לבחור הזמנה." },
    { input: tableSelect, valid: tableSelect.value !== "", message: "יש לבחור שולחן." }
  ]);
  if (!valid) {
    return;
  }

  // הבדיקות המהותיות (קיבולת, סטטוס, שיבוץ כפול) נעשות בשכבת הנתונים, כמו שהשרת יעשה בחלק ג'
  const result = assignInvitation(invitationSelect.value, tableSelect.value);
  if (!result.ok) {
    showMessage(pageMessage, result.error, "error");
    return;
  }

  renderAll();
  const verb = result.data.moved ? " הועברו ל" : " שובצו ל";
  showMessage(pageMessage, result.data.invitation.contactName + verb + result.data.table.name + ".", "success");
}

function handleAddTable(submitEvent) {
  submitEvent.preventDefault();
  const name = document.getElementById("table-name");
  const capacity = document.getElementById("table-capacity");

  const valid = runChecks(tableForm, [
    { input: name, valid: name.value.trim().length >= 2, message: "יש להזין שם שולחן." },
    { input: capacity, valid: isWholeNumberInRange(capacity.value, 1, 30), message: "מספר המקומות חייב להיות מספר שלם בין 1 ל-30." }
  ]);
  if (!valid) {
    return;
  }

  const result = addTable(currentEvent.id, name.value.trim(), Number(capacity.value));
  if (!result.ok) {
    showFieldError(name, result.error);
    return;
  }
  tableForm.reset();
  renderAll();
  showMessage(pageMessage, result.data.name + " נוסף.", "success");
}

if (currentEvent) {
  setupHeader(currentUser, currentEvent);
  renderAll();

  assignForm.addEventListener("submit", handleAssign);
  tableForm.addEventListener("submit", handleAddTable);
}
