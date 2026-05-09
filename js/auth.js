/* ============================================================
   MAWRED – RFQ Platform | Auth Utility
   Import on every protected page to enforce login session.
   ============================================================ */

"use strict";

const SESSION_KEY = "mawred_session";

/* ── Session helpers ──────────────────────────────────────── */

/**
 * Save user session after successful login.
 * @param {{ name: string, role: string, email: string }} user
 */
function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/**
 * Return the logged-in user object, or null if not authenticated.
 * @returns {{ name: string, role: string, email: string } | null}
 */
function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

/**
 * Clear session and redirect to login page.
 * Call this from any page's logout button.
 */
function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  // Works regardless of how deep in /pages/ we are
  const loginPath = window.location.pathname.includes("/pages/")
    ? "../pages/login.html"
    : "pages/login.html";
  window.location.replace(loginPath);
}

/**
 * Guard: if no valid session, immediately bounce to login.
 * Call at the very top of every protected page's script.
 */
function requireAuth() {
  const user = getUser();
  if (!user || !user.email) {
    const loginPath = window.location.pathname.includes("/pages/")
      ? "login.html"
      : "pages/login.html";
    window.location.replace(loginPath);
  }
}

/**
 * Compute initials from a full name string.
 * e.g. "Ahmad Hassan" → "AH"
 * @param {string} name
 * @returns {string}
 */
function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
