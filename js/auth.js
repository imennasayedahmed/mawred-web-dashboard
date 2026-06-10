/* ============================================================
   MAWRED – RFQ Platform | Auth Utility
   Import on every protected page to enforce login session.

   Strategy: hybrid approach
   • sessionStorage  → fast synchronous guard (no page flicker)
   • Firebase Auth   → real credential validation + logout sync
   ============================================================ */

"use strict";

const SESSION_KEY = "mawred_session";

/* ── Session helpers ──────────────────────────────────────── */

/**
 * Save user session after successful Firebase login.
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
 * Signs out of Firebase Auth AND clears local sessionStorage.
 */
function logout() {
  sessionStorage.removeItem(SESSION_KEY);

  // Sign out of Firebase (works even if Firebase hasn't fully loaded yet)
  if (typeof fbAuth !== "undefined") {
    fbAuth.signOut().catch(() => {});
  }

  const loginPath = window.location.pathname.includes("/pages/")
    ? "login.html"
    : "pages/login.html";
  window.location.replace(loginPath);
}

/**
 * Guard: if no valid session, immediately bounce to login.
 * Call at the very top of every protected page's script.
 * Uses sessionStorage for speed (synchronous — no async delay).
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

/* ── Firebase Auth state sync ─────────────────────────────── */

/**
 * Listens to Firebase Auth state changes.
 *
 * • If Firebase says the user is still authenticated but
 *   sessionStorage is empty (e.g. after a hard refresh on a
 *   different tab), this restores the session automatically.
 *
 * • If Firebase says no user is logged in but sessionStorage
 *   has a stale entry, it clears the stale session.
 *
 * Call this once on every protected page (after firebase-config.js loads).
 */
function initFirebaseAuth() {
  if (typeof fbAuth === "undefined") return;

  fbAuth.onAuthStateChanged(async (firebaseUser) => {
    const localSession = getUser();

    if (firebaseUser) {
      // Firebase user is valid — ensure local session is in sync
      if (!localSession || localSession.email !== firebaseUser.email) {
        // Try to get richer profile from Firestore if available
        let name = firebaseUser.displayName || "Admin";
        let role = "Administrator";

        if (typeof getAdminProfile === "function") {
          try {
            const profile = await getAdminProfile(firebaseUser.uid);
            if (profile) {
              name = profile.name || name;
              role = profile.role || role;
            }
          } catch (_) {}
        }

        saveSession({ name, role, email: firebaseUser.email });
      }
    } else {
      // No Firebase user — clear any stale local session
      if (localSession) {
        sessionStorage.removeItem(SESSION_KEY);
        const loginPath = window.location.pathname.includes("/pages/")
          ? "login.html"
          : "pages/login.html";
        window.location.replace(loginPath);
      }
    }
  });
}
