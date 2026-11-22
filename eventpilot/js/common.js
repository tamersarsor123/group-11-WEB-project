/*
  common.js - פונקציות עזר משותפות לכל עמודי הניהול:
  בדיקת התחברות, טעינת האירוע הנוכחי, תפריט הניווט והודעות למשתמש.
*/

const STATUS_LABELS = {
  pending: "טרם השיב",
  attending: "אישר הגעה",
  declined: "לא מגיע"
};

const PAYMENT_LABELS = {
  unpaid: "לא שולם",
  partial: "שולם חלקית",
  paid: "שולם"
};

/*
  אייקונים: כל אייקון הוא קו (path) של SVG בגודל 24x24.
  הם מוגדרים כאן במקום אחד, ונוספים לעמוד במקום כל אלמנט עם data-icon.
  הצבע נלקח מצבע הטקסט (currentColor), כך שאותו אייקון מתאים גם לתפריט הכהה וגם לכרטיס בהיר.
*/
const ICONS = {
  calendar: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4",
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21v-1a7 7 0 0 1 14 0v1 M16 3.5a4 4 0 0 1 0 7 M22 21v-1a6 6 0 0 0-4-5.6",
  wallet: "M3 6h16v14H3z M3 6l12-3v3 M15 13h2",
  table: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M10 2h4v3h-4z M10 19h4v3h-4z M2 10h3v4H2z M19 10h3v4h-3z",
  check: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z M8 12l3 3 5-6",
  clock: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z M12 7v5l3 2",
  cancel: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z M15 9l-6 6 M9 9l6 6",
  briefcase: "M3 7h18v13H3z M8 7V4h8v3 M3 13h18",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  tag: "M3 3h8l10 10-8 8L3 11z M7.5 7.5h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
  list: "M9 6h12 M9 12h12 M9 18h12 M4 6h.01 M4 12h.01 M4 18h.01"
};

// יוצר אלמנט SVG של אייקון לפי השם שלו ברשימת ICONS
function createIcon(name) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute("d", ICONS[name] || "");
  svg.appendChild(path);
  return svg;
}

// ממלא כל <span data-icon="..."> בעמוד באייקון המתאים
function renderIcons() {
  document.querySelectorAll("[data-icon]").forEach(function (element) {
    element.classList.add("icon");
    element.setAttribute("aria-hidden", "true");
    element.replaceChildren(createIcon(element.dataset.icon));
  });
}

/*
  מעדכן פס התקדמות: הרוחב לפי היחס בין value ל-max (עד 100%).
  חריגה מ-max צובעת באדום. אם warnWhenNear - גם 85% ומעלה נצבע בכתום.
*/
function setProgress(bar, value, max, warnWhenNear) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  bar.style.width = Math.min(percent, 100) + "%";
  let state = "";
  if (value > max) {
    state = " over";
  } else if (warnWhenNear && percent >= 85) {
    state = " near";
  }
  bar.className = "progress-bar" + state;
  return percent;
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatMoney(amount) {
  return "₪" + Number(amount).toLocaleString("he-IL");
}

// הופך 2026-12-31 ל-31/12/2026
function formatDate(dateText) {
  const parts = dateText.split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

// יוצר אלמנט עם מחלקה וטקסט. שימוש ב-textContent מונע הזרקת HTML מקלט המשתמש.
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// תא בטבלה. data-label משמש את ה-CSS להצגת שם העמודה בטלפון נייד.
function createCell(label, content) {
  const cell = document.createElement("td");
  cell.setAttribute("data-label", label);
  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }
  return cell;
}

// מציג הודעת הצלחה / שגיאה / אזהרה באזור ההודעות של העמוד
function showMessage(element, text, type) {
  element.textContent = text;
  element.className = "message " + type;
  element.hidden = false;
}

function hideMessage(element) {
  element.hidden = true;
  element.textContent = "";
}

// אם אין משתמש מחובר - חוזרים לעמוד הכניסה
function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

/*
  טוען את האירוע לפי הפרמטר event שבכתובת.
  בודק שהאירוע שייך למשתמש המחובר - כך מארגן אחד לא יכול לראות אירוע של מארגן אחר.
*/
function requireEvent(user) {
  const event = getEvent(getUrlParam("event"));
  if (!event || event.userId !== user.id) {
    window.location.href = "events.html";
    return null;
  }
  return event;
}

// מגדיר את הכותרת העליונה: שם המשתמש, כפתור יציאה, תפריט נייד וקישורי האירוע
function setupHeader(user, event) {
  document.getElementById("user-name").textContent = user.name;

  document.getElementById("logout-button").addEventListener("click", function () {
    logoutUser();
    window.location.href = "index.html";
  });

  const nav = document.getElementById("main-nav");
  const menuButton = document.getElementById("menu-button");
  menuButton.addEventListener("click", function () {
    const isOpen = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  if (event) {
    // כל קישור בתפריט מקבל את מזהה האירוע, כדי שנישאר באותו אירוע במעבר בין עמודים
    nav.querySelectorAll("a[data-event-link]").forEach(function (link) {
      link.href = link.getAttribute("href") + "?event=" + event.id;
    });
    document.getElementById("event-name").textContent = event.name;
    document.title = event.name + " | EventPilot";
  }
}

// האייקונים שכתובים ישירות ב-HTML (תפריט, כרטיסים) נוספים מיד כשהקובץ נטען
renderIcons();
