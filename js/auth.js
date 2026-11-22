/*
  auth.js - עמוד כניסה והרשמה
*/

const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");

// משתמש שכבר מחובר עובר ישר לרשימת האירועים שלו
if (getCurrentUser()) {
  window.location.href = "events.html";
}

// מעבר בין טופס הכניסה לטופס ההרשמה
function showForm(formName) {
  const showLogin = formName === "login";
  loginForm.hidden = !showLogin;
  registerForm.hidden = showLogin;
  loginTab.classList.toggle("active", showLogin);
  registerTab.classList.toggle("active", !showLogin);
  loginTab.setAttribute("aria-selected", String(showLogin));
  registerTab.setAttribute("aria-selected", String(!showLogin));
  authMessage.hidden = true;
}

function showAuthError(text) {
  authMessage.textContent = text;
  authMessage.className = "message error";
  authMessage.hidden = false;
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email");
  const password = document.getElementById("login-password");

  const valid = runChecks(loginForm, [
    { input: email, valid: isValidEmail(email.value), message: "יש להזין כתובת אימייל תקינה." },
    { input: password, valid: password.value.length > 0, message: "יש להזין סיסמה." }
  ]);
  if (!valid) {
    return;
  }

  const result = loginUser(email.value, password.value);
  if (!result.ok) {
    showAuthError(result.error);
    return;
  }
  window.location.href = "events.html";
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("register-name");
  const email = document.getElementById("register-email");
  const password = document.getElementById("register-password");
  const confirm = document.getElementById("register-confirm");

  const valid = runChecks(registerForm, [
    { input: name, valid: isValidName(name.value), message: "יש להזין שם מלא (לפחות 2 תווים)." },
    { input: email, valid: isValidEmail(email.value), message: "יש להזין כתובת אימייל תקינה." },
    { input: password, valid: isStrongPassword(password.value), message: "הסיסמה חייבת לכלול לפחות 8 תווים, אות וספרה." },
    { input: confirm, valid: confirm.value === password.value, message: "הסיסמאות אינן זהות." }
  ]);
  if (!valid) {
    return;
  }

  const result = registerUser(name.value, email.value, password.value);
  if (!result.ok) {
    showAuthError(result.error);
    return;
  }
  window.location.href = "events.html";
}

loginTab.addEventListener("click", function () { showForm("login"); });
registerTab.addEventListener("click", function () { showForm("register"); });
loginForm.addEventListener("submit", handleLogin);
registerForm.addEventListener("submit", handleRegister);
