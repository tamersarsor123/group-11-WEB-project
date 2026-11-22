/*
  validation.js - בדיקות קלט משותפות לכל הטפסים
*/

function isValidEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text.trim());
}

// טלפון ישראלי: נייד (05X) או קווי (02/03/04/08/09), עם או בלי מקף
function isValidPhone(text) {
  return /^0(5\d|[23489])-?\d{7}$/.test(text.trim());
}

// סיסמה: לפחות 8 תווים, עם אות אחת וספרה אחת לפחות
function isStrongPassword(text) {
  return text.length >= 8 && /[A-Za-z֐-׿]/.test(text) && /\d/.test(text);
}

// שם: לפחות 2 תווים, בלי ספרות בלבד
function isValidName(text) {
  const clean = text.trim();
  return clean.length >= 2 && !/^\d+$/.test(clean);
}

// מספר שלם בטווח (כולל הקצוות). מקבל את הטקסט כפי שהוקלד בשדה.
function isWholeNumberInRange(text, min, max) {
  if (!/^\d+$/.test(String(text).trim())) {
    return false;
  }
  const number = Number(text);
  return number >= min && number <= max;
}

// הסכום הגבוה ביותר שמותר להזין (תקציב, עלות ספק, תשלום)
const MAX_AMOUNT = 10000000;

// סכום כסף: מספר שלם בין 0 ל-MAX_AMOUNT.
// הבדיקה דוחה גם כתיב מדעי כמו 1e125, שהדפדפן מקבל בשדה מספר.
function isValidAmount(text) {
  return isWholeNumberInRange(text, 0, MAX_AMOUNT);
}

function todayString() {
  return toDateString(new Date());
}

// תאריך תקין שאינו בעבר
function isTodayOrFuture(dateText) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateText) && dateText >= todayString();
}

// אירוע אפשר לתכנן עד 3 שנים קדימה
const MAX_YEARS_AHEAD = 3;

function latestEventDateString() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + MAX_YEARS_AHEAD);
  return toDateString(date);
}

// תאריך אירוע: לא בעבר ולא יותר מ-3 שנים קדימה
function isValidEventDate(dateText) {
  return isTodayOrFuture(dateText) && dateText <= latestEventDateString();
}

/* ---------- הצגת שגיאות ליד השדות ---------- */

// מציג הודעת שגיאה מתחת לשדה ומסמן אותו באדום
function showFieldError(input, message) {
  input.classList.add("invalid");
  input.setAttribute("aria-invalid", "true");
  const errorElement = input.closest(".field").querySelector(".field-error");
  errorElement.textContent = message;
}

function clearFormErrors(form) {
  form.querySelectorAll(".invalid").forEach(function (input) {
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  });
  form.querySelectorAll(".field-error").forEach(function (element) {
    element.textContent = "";
  });
}

/*
  מריץ רשימת בדיקות על טופס.
  כל בדיקה היא: { input: שדה, valid: true/false, message: "הודעה" }
  מחזיר true אם הכול תקין. מעביר את הפוקוס לשדה השגוי הראשון.
*/
function runChecks(form, checks) {
  clearFormErrors(form);
  let firstInvalid = null;
  checks.forEach(function (check) {
    // אם השדה כבר סומן כשגוי - משאירים את ההודעה הראשונה
    if (!check.valid && !check.input.classList.contains("invalid")) {
      showFieldError(check.input, check.message);
      if (!firstInvalid) {
        firstInvalid = check.input;
      }
    }
  });
  if (firstInvalid) {
    firstInvalid.focus();
    return false;
  }
  return true;
}
