/*
  storage.js - שכבת הנתונים של EventPilot (חלק ב' - צד לקוח בלבד)

  בחלק ב' אין שרת ואין בסיס נתונים אמיתי. הקובץ הזה מדמה אותם:
  כל הנתונים נשמרים ב-localStorage של הדפדפן, והפונקציות כאן מחזירות
  תשובה במבנה שהשרת יחזיר בחלק ג':  { ok: true, data: ... }  או  { ok: false, error: "..." }

  בחלק ג' נחליף את גוף הפונקציות בקריאות fetch לשרת, ושאר הקוד יישאר כמעט ללא שינוי.
*/

const DB_KEY = "eventpilot_db";
const SESSION_KEY = "eventpilot_session";

// אורך מרבי להערת האורח. משותף לבדיקה בדפדפן (rsvp.js) ולבדיקה ב"שרת" (submitRsvp).
const NOTE_MAX_LENGTH = 200;

/* ---------- קריאה ושמירה ---------- */

function loadDb() {
  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      // אם המידע השמור פגום - מתחילים מחדש מנתוני הדמה
      console.warn("המידע השמור פגום, טוענים נתוני דמה", error);
    }
  }
  const db = createSeedData();
  saveDb(db);
  return db;
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// מזהה אקראי לקישור האישי של האורח
function createToken() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
}

function success(data) {
  return { ok: true, data: data };
}

function failure(message) {
  return { ok: false, error: message };
}

/* ---------- נתוני דמה ---------- */

// מחזיר תאריך בפורמט YYYY-MM-DD, מספר ימים מהיום
function dateFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

function toDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

function createSeedData() {
  return {
    users: [
      { id: "u1", name: "דנה לוי", email: "demo@eventpilot.com", password: "Demo1234" }
    ],
    events: [
      {
        id: "e1", userId: "u1", name: "החתונה של דנה ויואב", type: "חתונה",
        date: dateFromToday(60), location: "אולמי הגן, באר שבע",
        budget: 120000, plannedGuests: 150, rsvpDeadline: dateFromToday(45)
      },
      {
        id: "e2", userId: "u1", name: "כנס לקוחות שנתי", type: "כנס",
        date: dateFromToday(30), location: "מלון לאונרדו, תל אביב",
        budget: 40000, plannedGuests: 80, rsvpDeadline: dateFromToday(-1)
      }
    ],
    invitations: [
      { id: "i1", eventId: "e1", contactName: "משפחת כהן", phone: "052-1234567", invitedCount: 4, confirmedCount: 4, status: "attending", note: "", token: "cohen4demo", tableId: "t1" },
      { id: "i2", eventId: "e1", contactName: "רועי אברהם", phone: "054-7654321", invitedCount: 2, confirmedCount: 2, status: "attending", note: "מנה צמחונית", token: "roi2demo", tableId: null },
      { id: "i3", eventId: "e1", contactName: "נועה שגיא", phone: "050-1112233", invitedCount: 1, confirmedCount: 0, status: "pending", note: "", token: "noa1demo", tableId: null },
      { id: "i4", eventId: "e1", contactName: "משפחת מזרחי", phone: "053-9988776", invitedCount: 5, confirmedCount: 0, status: "declined", note: "", token: "mizrahi5demo", tableId: null },
      { id: "i5", eventId: "e1", contactName: "תמר ואורי בן דוד", phone: "058-4455667", invitedCount: 2, confirmedCount: 0, status: "pending", note: "", token: "tamar2demo", tableId: null },
      { id: "i6", eventId: "e2", contactName: "חברת אלפא", phone: "03-5551234", invitedCount: 3, confirmedCount: 0, status: "pending", note: "", token: "alpha3demo", tableId: null }
    ],
    vendors: [
      { id: "v1", eventId: "e1", name: "אולמי הגן", service: "אולם וקייטרינג", plannedCost: 75000, actualCost: 20000, paymentStatus: "partial" },
      { id: "v2", eventId: "e1", name: "סטודיו אור", service: "צילום", plannedCost: 12000, actualCost: 0, paymentStatus: "unpaid" },
      { id: "v3", eventId: "e1", name: "DJ עומר", service: "מוזיקה", plannedCost: 8000, actualCost: 8000, paymentStatus: "paid" },
      { id: "v4", eventId: "e2", name: "מלון לאונרדו", service: "אולם כנסים", plannedCost: 25000, actualCost: 5000, paymentStatus: "partial" }
    ],
    tables: [
      { id: "t1", eventId: "e1", name: "שולחן 1", capacity: 10 },
      { id: "t2", eventId: "e1", name: "שולחן 2", capacity: 4 }
    ],
    tasks: [
      { id: "k1", eventId: "e1", title: "לסגור תפריט עם האולם", dueDate: dateFromToday(14), done: false },
      { id: "k2", eventId: "e1", title: "לשלוח קישורי אישור הגעה", dueDate: dateFromToday(7), done: true },
      { id: "k3", eventId: "e2", title: "להזמין ציוד הגברה", dueDate: dateFromToday(10), done: false }
    ]
  };
}

/* ---------- משתמשים והתחברות ---------- */

function registerUser(name, email, password) {
  const db = loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const exists = db.users.some(function (user) { return user.email === cleanEmail; });
  if (exists) {
    return failure("כתובת האימייל כבר רשומה במערכת.");
  }
  // הערה: בחלק ג' הסיסמה תישלח לשרת ותישמר שם מוצפנת. כאן זו הדמיה בלבד.
  const user = { id: createId(), name: name.trim(), email: cleanEmail, password: password };
  db.users.push(user);
  saveDb(db);
  localStorage.setItem(SESSION_KEY, user.id);
  return success(user);
}

function loginUser(email, password) {
  const db = loadDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find(function (item) {
    return item.email === cleanEmail && item.password === password;
  });
  if (!user) {
    return failure("האימייל או הסיסמה שגויים.");
  }
  localStorage.setItem(SESSION_KEY, user.id);
  return success(user);
}

function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) {
    return null;
  }
  const db = loadDb();
  return db.users.find(function (user) { return user.id === userId; }) || null;
}

/* ---------- אירועים ---------- */

function getEventsOfUser(userId) {
  const db = loadDb();
  return db.events.filter(function (event) { return event.userId === userId; });
}

function getEvent(eventId) {
  const db = loadDb();
  return db.events.find(function (event) { return event.id === eventId; }) || null;
}

function createEvent(userId, details) {
  const db = loadDb();
  const event = Object.assign({ id: createId(), userId: userId }, details);
  db.events.push(event);
  saveDb(db);
  return success(event);
}

function updateEvent(eventId, details) {
  const db = loadDb();
  const event = db.events.find(function (item) { return item.id === eventId; });
  if (!event) {
    return failure("האירוע לא נמצא.");
  }
  Object.assign(event, details);
  saveDb(db);
  return success(event);
}

// מחיקת אירוע מוחקת גם את כל הנתונים שמשויכים אליו
function deleteEvent(eventId) {
  const db = loadDb();
  const belongsToOtherEvent = function (item) { return item.eventId !== eventId; };
  db.events = db.events.filter(function (event) { return event.id !== eventId; });
  db.invitations = db.invitations.filter(belongsToOtherEvent);
  db.vendors = db.vendors.filter(belongsToOtherEvent);
  db.tables = db.tables.filter(belongsToOtherEvent);
  db.tasks = db.tasks.filter(belongsToOtherEvent);
  saveDb(db);
  return success(null);
}

/* ---------- הזמנות (מוזמנים) ---------- */

function getInvitations(eventId) {
  const db = loadDb();
  return db.invitations.filter(function (invitation) { return invitation.eventId === eventId; });
}

function addInvitation(eventId, details) {
  const db = loadDb();
  const duplicate = db.invitations.some(function (invitation) {
    return invitation.eventId === eventId &&
      invitation.contactName === details.contactName &&
      invitation.phone === details.phone;
  });
  if (duplicate) {
    return failure("כבר קיימת הזמנה עם אותו שם ואותו טלפון באירוע הזה.");
  }
  const invitation = {
    id: createId(), eventId: eventId,
    contactName: details.contactName, phone: details.phone,
    invitedCount: details.invitedCount, confirmedCount: 0,
    status: "pending", note: "", token: createToken(), tableId: null
  };
  db.invitations.push(invitation);
  saveDb(db);
  return success(invitation);
}

function deleteInvitation(invitationId) {
  const db = loadDb();
  db.invitations = db.invitations.filter(function (invitation) { return invitation.id !== invitationId; });
  saveDb(db);
  return success(null);
}

function getInvitationByToken(token) {
  const db = loadDb();
  return db.invitations.find(function (invitation) { return invitation.token === token; }) || null;
}

/*
  כמה מקומות תפוסים בשולחן. אפשר להחריג הזמנה אחת, למשל את ההזמנה שבודקים עכשיו.
  מקבלת רשימת הזמנות ולא את כל בסיס הנתונים, כדי שגם עמוד סידורי הישיבה ישתמש בה.
*/
function countSeatsTaken(invitations, tableId, excludeInvitationId) {
  let total = 0;
  invitations.forEach(function (invitation) {
    if (invitation.tableId === tableId && invitation.id !== excludeInvitationId) {
      total += invitation.confirmedCount;
    }
  });
  return total;
}

// בדיקת "שרת": מספר המגיעים הוא מספר שלם בין 1 למספר המוזמנים בהזמנה
function isCountInRange(invitation, count) {
  return Number.isInteger(count) && count >= 1 && count <= invitation.invitedCount;
}

/*
  applyRsvp - הפונקציה המרכזית של עיבוד אישור ההגעה.
  היא משותפת לשני המקרים: האורח עונה דרך הקישור, או המארגן מעדכן ידנית.
  מעדכנת סטטוס וכמות, ואז בודקת אם השיבוץ לשולחן עדיין תקין.
  מחזירה true אם השיבוץ לשולחן בוטל בעקבות השינוי.

  needsReseat מסמן הזמנה שעדיין מגיעה, אבל השיבוץ שלה בוטל כי אין מספיק מקום בשולחן.
  המארגן רואה התראה על כך בעמוד "האירוע שלי" ובעמוד "סידורי ישיבה".
*/
function applyRsvp(db, invitation, status, count) {
  invitation.status = status;
  invitation.confirmedCount = status === "attending" ? count : 0;

  // מי שלא מגיע - לא צריך שיבוץ, ואם היה משובץ - השיבוץ מתבטל
  if (status !== "attending") {
    invitation.needsReseat = false;
    if (invitation.tableId) {
      invitation.tableId = null;
      return true;
    }
    return false;
  }

  if (!invitation.tableId) {
    return false;
  }
  // אם הכמות גדלה - בודקים שעדיין יש מקום בשולחן
  const table = db.tables.find(function (item) { return item.id === invitation.tableId; });
  const takenByOthers = countSeatsTaken(db.invitations, invitation.tableId, invitation.id);
  if (!table || takenByOthers + invitation.confirmedCount > table.capacity) {
    invitation.tableId = null;
    invitation.needsReseat = true;
    return true;
  }
  return false;
}

/*
  עדכון ידני של המארגן, למשל עבור אורח שענה בטלפון.
  count - מספר המגיעים. אם לא נשלח, מניחים שכל המוזמנים בהזמנה מגיעים.
*/
function updateInvitationStatus(invitationId, status, count) {
  const db = loadDb();
  const invitation = db.invitations.find(function (item) { return item.id === invitationId; });
  if (!invitation) {
    return failure("ההזמנה לא נמצאה.");
  }
  if (status !== "pending" && status !== "attending" && status !== "declined") {
    return failure("סטטוס לא מוכר.");
  }
  const confirmedCount = count === undefined ? invitation.invitedCount : count;
  if (status === "attending" && !isCountInRange(invitation, confirmedCount)) {
    return failure("מספר המגיעים חייב להיות בין 1 ל-" + invitation.invitedCount + ".");
  }
  const seatingCancelled = applyRsvp(db, invitation, status, confirmedCount);
  saveDb(db);
  return success({ invitation: invitation, seatingCancelled: seatingCancelled });
}

// אישור הגעה של האורח דרך הקישור האישי
function submitRsvp(token, status, count, note) {
  const db = loadDb();
  const invitation = db.invitations.find(function (item) { return item.token === token; });
  if (!invitation) {
    return failure("הקישור אינו תקף. בקשו מהמארגן קישור חדש.");
  }
  const event = db.events.find(function (item) { return item.id === invitation.eventId; });
  if (!event) {
    return failure("האירוע כבר לא קיים במערכת.");
  }
  if (event.rsvpDeadline < toDateString(new Date())) {
    return failure("המועד האחרון לאישור הגעה עבר. פנו ישירות למארגן האירוע.");
  }
  if (status !== "attending" && status !== "declined") {
    return failure("יש לבחור אם מגיעים או לא.");
  }
  if (status === "attending" && !isCountInRange(invitation, count)) {
    return failure("מספר המגיעים חייב להיות בין 1 ל-" + invitation.invitedCount + ".");
  }
  // בודקים שוב את אורך ההערה, למקרה שהבדיקה בדפדפן נעקפה
  if (typeof note !== "string" || note.length > NOTE_MAX_LENGTH) {
    return failure("ההערה ארוכה מדי (עד " + NOTE_MAX_LENGTH + " תווים).");
  }
  const seatingCancelled = applyRsvp(db, invitation, status, count);
  invitation.note = note;
  saveDb(db);
  return success({ invitation: invitation, event: event, seatingCancelled: seatingCancelled });
}

/* ---------- ספקים ---------- */

function getVendors(eventId) {
  const db = loadDb();
  return db.vendors.filter(function (vendor) { return vendor.eventId === eventId; });
}

function addVendor(eventId, details) {
  const db = loadDb();
  const vendor = Object.assign({ id: createId(), eventId: eventId }, details);
  db.vendors.push(vendor);
  saveDb(db);
  return success(vendor);
}

function updateVendor(vendorId, details) {
  const db = loadDb();
  const vendor = db.vendors.find(function (item) { return item.id === vendorId; });
  if (!vendor) {
    return failure("הספק לא נמצא.");
  }
  Object.assign(vendor, details);
  saveDb(db);
  return success(vendor);
}

function deleteVendor(vendorId) {
  const db = loadDb();
  db.vendors = db.vendors.filter(function (vendor) { return vendor.id !== vendorId; });
  saveDb(db);
  return success(null);
}

/* ---------- משימות ---------- */

function getTasks(eventId) {
  const db = loadDb();
  return db.tasks.filter(function (task) { return task.eventId === eventId; });
}

function addTask(eventId, title, dueDate) {
  const db = loadDb();
  const task = { id: createId(), eventId: eventId, title: title, dueDate: dueDate, done: false };
  db.tasks.push(task);
  saveDb(db);
  return success(task);
}

function toggleTask(taskId) {
  const db = loadDb();
  const task = db.tasks.find(function (item) { return item.id === taskId; });
  if (!task) {
    return failure("המשימה לא נמצאה.");
  }
  task.done = !task.done;
  saveDb(db);
  return success(task);
}

function deleteTask(taskId) {
  const db = loadDb();
  db.tasks = db.tasks.filter(function (task) { return task.id !== taskId; });
  saveDb(db);
  return success(null);
}

/* ---------- שולחנות ושיבוץ ---------- */

function getTables(eventId) {
  const db = loadDb();
  return db.tables.filter(function (table) { return table.eventId === eventId; });
}

function addTable(eventId, name, capacity) {
  const db = loadDb();
  const duplicate = db.tables.some(function (table) {
    return table.eventId === eventId && table.name === name;
  });
  if (duplicate) {
    return failure("כבר קיים שולחן בשם הזה.");
  }
  const table = { id: createId(), eventId: eventId, name: name, capacity: capacity };
  db.tables.push(table);
  saveDb(db);
  return success(table);
}

function deleteTable(tableId) {
  const db = loadDb();
  db.tables = db.tables.filter(function (table) { return table.id !== tableId; });
  // ההזמנות שהיו בשולחן חוזרות למצב "טרם שובץ"
  db.invitations.forEach(function (invitation) {
    if (invitation.tableId === tableId) {
      invitation.tableId = null;
    }
  });
  saveDb(db);
  return success(null);
}

// שיבוץ הזמנה לשולחן, או העברה לשולחן אחר. כל ההזמנה משובצת כיחידה אחת.
function assignInvitation(invitationId, tableId) {
  const db = loadDb();
  const invitation = db.invitations.find(function (item) { return item.id === invitationId; });
  const table = db.tables.find(function (item) { return item.id === tableId; });
  if (!invitation || !table || invitation.eventId !== table.eventId) {
    return failure("ההזמנה או השולחן לא נמצאו באירוע הזה.");
  }
  if (invitation.status !== "attending") {
    return failure("אפשר לשבץ רק הזמנות שאישרו הגעה.");
  }
  if (invitation.tableId === tableId) {
    return failure(invitation.contactName + " כבר משובצים ב" + table.name + ".");
  }
  const freeSeats = table.capacity - countSeatsTaken(db.invitations, tableId, invitation.id);
  if (invitation.confirmedCount > freeSeats) {
    return failure("אין מספיק מקום ב" + table.name + ": נדרשים " + invitation.confirmedCount +
      " מקומות ונותרו " + freeSeats + ". בחרו שולחן אחר.");
  }
  const moved = invitation.tableId !== null;
  invitation.tableId = tableId;
  invitation.needsReseat = false;
  saveDb(db);
  return success({ invitation: invitation, table: table, moved: moved });
}

function unassignInvitation(invitationId) {
  const db = loadDb();
  const invitation = db.invitations.find(function (item) { return item.id === invitationId; });
  if (!invitation) {
    return failure("ההזמנה לא נמצאה.");
  }
  invitation.tableId = null;
  invitation.needsReseat = false;
  saveDb(db);
  return success(invitation);
}

/* ---------- תמונת מצב של אירוע ---------- */

function getEventSummary(eventId) {
  const event = getEvent(eventId);
  const invitations = getInvitations(eventId);
  const vendors = getVendors(eventId);
  const tasks = getTasks(eventId);

  const summary = {
    invitationsCount: invitations.length,
    confirmedGuests: 0, pendingInvitations: 0, declinedInvitations: 0, seatedGuests: 0,
    reseatNeeded: 0,
    plannedCost: 0, actualCost: 0,
    openTasks: tasks.filter(function (task) { return !task.done; }).length
  };

  invitations.forEach(function (invitation) {
    if (invitation.status === "attending") {
      summary.confirmedGuests += invitation.confirmedCount;
      if (invitation.tableId) {
        summary.seatedGuests += invitation.confirmedCount;
      } else if (invitation.needsReseat) {
        summary.reseatNeeded += 1;
      }
    } else if (invitation.status === "pending") {
      summary.pendingInvitations += 1;
    } else {
      summary.declinedInvitations += 1;
    }
  });

  vendors.forEach(function (vendor) {
    summary.plannedCost += vendor.plannedCost;
    summary.actualCost += vendor.actualCost;
  });

  summary.budget = event.budget;
  summary.remaining = event.budget - summary.plannedCost;
  summary.overBudget = summary.plannedCost > event.budget;
  summary.overCapacity = summary.confirmedGuests > event.plannedGuests;
  return summary;
}
