/* ============================================================
   MAWRED – RFQ Platform | App Logic
   ============================================================ */

"use strict";

const admin = {
  email: ["admin123@gmail.com"],
  password: ["123456789"]
}

/* ── DOM references ─────────────────────────────────────── */
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailWrap = document.getElementById("email-wrap");
const passwordWrap = document.getElementById("password-wrap");
const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const signinBtn = document.getElementById("signin-btn");
const loginForm = document.getElementById("login-form");
const tabRequester = document.getElementById("tab-requester");
const tabSupplier = document.getElementById("tab-supplier");

/* ── Role Switch ────────────────────────────────────────── */
let currentRole = "requester";

function switchRole(role) {
  currentRole = role;

  if (role === "requester") {
    tabRequester.classList.add("active");
    tabSupplier.classList.remove("active");
    tabRequester.setAttribute("aria-selected", "true");
    tabSupplier.setAttribute("aria-selected", "false");
  } else {
    tabSupplier.classList.add("active");
    tabRequester.classList.remove("active");
    tabSupplier.setAttribute("aria-selected", "true");
    tabRequester.setAttribute("aria-selected", "false");
  }

  // Subtle card pulse
  const card = document.getElementById("login-card");
  card.style.transform = "scale(0.99)";
  setTimeout(() => {
    card.style.transform = "";
  }, 120);
}

/* ── Password Visibility ────────────────────────────────── */
let pwVisible = false;

function togglePassword() {
  pwVisible = !pwVisible;
  passwordInput.type = pwVisible ? "text" : "password";

  const icon = document.getElementById("eye-icon");
  if (pwVisible) {
    // eye-off icon
    icon.innerHTML = `
      <path d="M3 3l14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M10.5 6.2A5 5 0 0115.8 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M1 10s3.5-6 9-6c.8 0 1.6.1 2.3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M19 10c-.6 1.3-1.6 2.6-3 3.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6.5 16.2A9 9 0 0010 17c5.5 0 9-6 9-6a15.6 15.6 0 00-1-1.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    `;
  } else {
    // eye icon
    icon.innerHTML = `
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
    `;
  }
}

/* ── Validation helpers ─────────────────────────────────── */
function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function showError(wrap, errorEl, message) {
  wrap.classList.add("error");
  errorEl.innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" class="err-icon">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/>
      <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
    ${message}
  `;
  errorEl.classList.add("visible");
}

function clearError(wrap, errorEl) {
  wrap.classList.remove("error");
  errorEl.classList.remove("visible");
  errorEl.innerHTML = "";
}

/* ── Live validation ────────────────────────────────────── */
emailInput.addEventListener("blur", () => {
  const val = emailInput.value;
  if (!val) {
    showError(emailWrap, emailError, "Email is required");
  } else if (!isValidEmail(val)) {
    showError(emailWrap, emailError, "Enter a valid email address");
  } else {
    clearError(emailWrap, emailError);
  }
});

emailInput.addEventListener("input", () => {
  if (emailWrap.classList.contains("error") && isValidEmail(emailInput.value)) {
    clearError(emailWrap, emailError);
  }
});

passwordInput.addEventListener("input", () => {
  const len = passwordInput.value.length;
  if (len === 0) {
    showError(
      passwordWrap,
      passwordError,
      "Password must be at least 8 characters",
    );
  } else if (len < 8) {
    showError(
      passwordWrap,
      passwordError,
      "Password must be at least 8 characters",
    );
  } else {
    clearError(passwordWrap, passwordError);
  }
});

passwordInput.addEventListener("blur", () => {
  const len = passwordInput.value.length;
  if (len === 0) {
    showError(passwordWrap, passwordError, "Password is required");
  } else if (len < 8) {
    showError(
      passwordWrap,
      passwordError,
      "Password must be at least 8 characters",
    );
  }
});

/* ── Admin Acess ────────────────────────────────────────── */
function login(email, password) {

  if (email === admin.email[0] && password === admin.password[0]) {
    window.location.href = "dashboard.html";
  } else {
    alert("Access denied");
  }
}

/* ── Form submit ────────────────────────────────────────── */
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  let valid = true;

  // Email
  if (!emailInput.value) {
    showError(emailWrap, emailError, "Email is required");
    valid = false;
  } else if (!isValidEmail(emailInput.value) & !login(emailInput.value, passwordInput.value)) {
    showError(emailWrap, emailError, "Enter a valid email address");
    valid = false;
  } else {
    clearError(emailWrap, emailError);
  }

  // Password
  if (!passwordInput.value) {
    showError(passwordWrap, passwordError, "Password is required");
    valid = false;
  } else if (passwordInput.value.length < 8) {
    showError(
      passwordWrap,
      passwordError,
      "Password must be at least 8 characters",
    );
    valid = false;
  } else {
    clearError(passwordWrap, passwordError);
  }

  if (!valid) return;

  // Simulate loading
  signinBtn.classList.add("loading");
  signinBtn.disabled = true;
  signinBtn.textContent = "";

  // Rebuild button content with spinner
  const spinner = document.createElement("svg");
  spinner.setAttribute("class", "btn-icon");
  spinner.setAttribute("viewBox", "0 0 24 24");
  spinner.setAttribute("fill", "none");
  spinner.innerHTML = `<circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" stroke-width="2.5"/>
    <path d="M12 3a9 9 0 019 9" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`;
  spinner.style.animation = "spin 0.8s linear infinite";
  signinBtn.appendChild(spinner);

  const label = document.createElement("span");
  label.textContent = "Signing in…";
  signinBtn.appendChild(label);

  setTimeout(() => {
    signinBtn.classList.remove("loading");
    signinBtn.disabled = false;
    signinBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h14M10 4l7 6-7 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Sign In
    `;
    showToast(
      `Welcome! Signed in as ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`,
    );
  }, 1800);
  window.location.href = "dashboard.html";
});

/* ── Alt buttons ────────────────────────────────────────── */
// document.getElementById('biometric-btn').addEventListener('click', () => {
//   showToast('Biometric authentication initiated…');
// });

// document.getElementById('sso-btn').addEventListener('click', () => {
//   showToast('Redirecting to SSO provider…');
// });

// document.getElementById('forgot-link').addEventListener('click', (e) => {
//   e.preventDefault();
//   showToast('Password reset link sent to your email!');
// });

// document.getElementById('register-link').addEventListener('click', (e) => {
//   e.preventDefault();
//   showToast('Redirecting to registration…');
// });

/* ── Toast notification ─────────────────────────────────── */
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* ── Initial state: show password error as per design ───── */
// (matches the screenshot showing the error by default)
window.addEventListener("DOMContentLoaded", () => {
  passwordWrap.classList.add("error");
});
