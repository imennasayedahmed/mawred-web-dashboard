/* ============================================================
   MAWRED – RFQ Platform | Requests Logic
   ============================================================ */

"use strict";

/* ── 1. Auth guard (runs before anything else) ──────────── */
requireAuth();

/* ── 2. Populate navbar user info ───────────────────────── */
(function populateUser() {
  const user = getUser();
  if (!user) return;

  const nameEl = document.getElementById("navbar-user-name");
  const roleEl = document.getElementById("navbar-user-role");
  const avatarEl = document.getElementById("navbar-user-avatar");

  if (nameEl) nameEl.textContent = user.name || "Admin";
  if (roleEl) roleEl.textContent = user.role || "Administrator";
  if (avatarEl) avatarEl.textContent = getInitials(user.name || "Admin");
})();

/* ── 3. Active nav link highlight ───────────────────────── */
(function highlightNav() {
  const filename = window.location.pathname.split("/").pop() || "requests.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href === filename || href.endsWith("/" + filename)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
})();
