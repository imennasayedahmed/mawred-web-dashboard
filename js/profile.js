/* ============================================================
   MAWRED – RFQ Platform | Profile Page Logic
   Features: tab switching, editable info form, password
             strength meter, notification toggles, session
             management, avatar initials, toast notifications
   ============================================================ */

"use strict";

/* ── 1. Auth guard ───────────────────────────────────────── */
requireAuth();

/* ── 2. Mock admin data ──────────────────────────────────── */
const ADMIN = {
  name: "Ahmad Hassan",
  initials: "AH",
  role: "Super Admin",
  email: "ahmad.hassan@mawred.sa",
  phone: "+966 50 123 4567",
  department: "Platform Operations",
  location: "Riyadh, Saudi Arabia",
  timezone: "Asia/Riyadh",
  language: "English",
  joinDate: "Jan 12, 2023",
  lastLogin: "Today at 09:41 AM",
  bio: "Platform administrator responsible for managing RFQ operations, user access, and platform integrity across all MAWRED modules.",
  stats: { requests: 1284, offers: 3540, reports: 24 },
};

/* ── 3. Populate all user slots ──────────────────────────── */
function populateUser() {
  const user = getUser();
  const name = user?.name || ADMIN.name;
  const role = user?.role || ADMIN.role;
  const ini = getInitials(name);

  // Navbar
  setText("navbar-user-name", name);
  setText("navbar-user-role", role);
  setText("navbar-user-avatar", ini);
  // Dropdown
  setText("dropdown-name", name);
  setText("dropdown-role", role);
  setText("dropdown-avatar", ini);
  // Profile card
  setText("profile-name", name);
  setText("profile-initials", ini);
  setText("profile-role-label", role);
  setText("profile-join-date", ADMIN.joinDate);
  setText("profile-last-login", ADMIN.lastLogin);
  // Stats
  setText("pstat-requests", ADMIN.stats.requests.toLocaleString());
  setText("pstat-offers", ADMIN.stats.offers.toLocaleString());
  setText("pstat-reports", ADMIN.stats.reports.toLocaleString());
  // Form fields
  setVal("field-first-name", name.split(" ")[0] || "");
  setVal("field-last-name", name.split(" ").slice(1).join(" ") || "");
  setVal("field-email", user?.email || ADMIN.email);
  setVal("field-phone", ADMIN.phone);
  setVal("field-department", ADMIN.department);
  setVal("field-location", ADMIN.location);
  setVal("field-timezone", ADMIN.timezone);
  setVal("field-language", ADMIN.language);
  setVal("field-bio", ADMIN.bio);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

/* ── 4. Active nav highlight ─────────────────────────────── */
(function highlightNav() {
  const filename = window.location.pathname.split("/").pop() || "profile.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle(
      "active",
      href === filename || href.endsWith("/" + filename),
    );
  });
})();

/* ── 5. Toast ────────────────────────────────────────────── */
let toastTimer = null;
function showToast(message, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.innerHTML = `<svg viewBox="0 0 20 20" fill="none" id="toast-icon"></svg><span id="toast-msg"></span>`;
    document.body.appendChild(toast);
  }
  const icons = {
    success: `<path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    warning: `<path d="M10 6v4M10 14h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    error: `<path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  };
  toast.className = `toast ${type}`;
  document.getElementById("toast-icon").innerHTML =
    icons[type] || icons.success;
  document.getElementById("toast-msg").textContent = message;
  void toast.offsetWidth;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ── 6. Tab switching ────────────────────────────────────── */
function wireTabs() {
  document.querySelectorAll(".profile-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".profile-tab")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".profile-panel")
        .forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(`panel-${btn.dataset.tab}`);
      if (panel) panel.classList.add("active");
    });
  });
}

/* ── 7. Password strength meter ──────────────────────────── */
function wirePasswordStrength() {
  const input = document.getElementById("field-new-password");
  const segs = document.querySelectorAll(".strength-seg");
  const labelEl = document.getElementById("strength-label");
  if (!input || !segs.length) return;

  input.addEventListener("input", () => {
    const val = input.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = ["", "weak", "fair", "good", "strong"];
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#ef4444", "#f59e0b", "#22c55e", "#15803d"];

    segs.forEach((seg, i) => {
      seg.className = "strength-seg";
      if (i < score) seg.classList.add("filled", levels[score]);
    });

    if (labelEl) {
      labelEl.textContent = val ? labels[score] || "" : "";
      labelEl.style.color = colors[score] || "";
    }
  });
}

/* ── 8. Profile info form ────────────────────────────────── */
function wireProfileForm() {
  const form = document.getElementById("form-profile-info");
  const cancelBtn = document.getElementById("btn-cancel-info");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      populateUser(); // reset fields
      showToast("Changes discarded", "warning");
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const first = document.getElementById("field-first-name")?.value.trim();
      const last = document.getElementById("field-last-name")?.value.trim();
      if (!first) {
        showToast("First name is required", "error");
        return;
      }
      // Update card name live
      setText("profile-name", `${first} ${last}`.trim());
      setText("profile-initials", getInitials(`${first} ${last}`.trim()));
      setText("navbar-user-name", `${first} ${last}`.trim());
      setText("dropdown-name", `${first} ${last}`.trim());
      showToast("Profile updated successfully!", "success");
    });
  }
}

/* ── 9. Password form ────────────────────────────────────── */
function wirePasswordForm() {
  const form = document.getElementById("form-password");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const current = document.getElementById("field-current-password")?.value;
    const next = document.getElementById("field-new-password")?.value;
    const confirm = document.getElementById("field-confirm-password")?.value;

    if (!current) {
      showToast("Enter your current password", "error");
      return;
    }
    if (!next || next.length < 8) {
      showToast("New password must be at least 8 characters", "error");
      return;
    }
    if (next !== confirm) {
      showToast("Passwords do not match", "error");
      return;
    }

    form.reset();
    document
      .querySelectorAll(".strength-seg")
      .forEach((s) => (s.className = "strength-seg"));
    setText("strength-label", "");
    showToast("Password changed successfully!", "success");
  });
}

/* ── 10. Notification toggles ────────────────────────────── */
function wireToggles() {
  document.querySelectorAll(".toggle-switch input").forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const label =
        toggle
          .closest(".toggle-row")
          ?.querySelector(".toggle-label")
          ?.textContent?.trim() || "Setting";
      showToast(
        `${label} ${toggle.checked ? "enabled" : "disabled"}`,
        "success",
      );
    });
  });
}

/* ── 11. Session revoke ──────────────────────────────────── */
function wireSessions() {
  document.querySelectorAll(".btn-revoke").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".session-row");
      const name =
        row?.querySelector(".session-name")?.textContent?.trim() || "session";
      row?.style && (row.style.opacity = "0.4");
      btn.disabled = true;
      btn.textContent = "Revoked";
      showToast(`${name} session revoked`, "warning");
    });
  });
}

/* ── 12. Avatar edit stub ────────────────────────────────── */
function wireAvatarEdit() {
  document.getElementById("btn-avatar-edit")?.addEventListener("click", () => {
    showToast("Photo upload coming soon!", "warning");
  });
}

/* ── 13. Profile card buttons ────────────────────────────── */
function wireCardButtons() {
  document
    .getElementById("btn-download-data")
    ?.addEventListener("click", () => {
      showToast("Preparing your data export…", "success");
    });
  document.getElementById("btn-deactivate")?.addEventListener("click", () => {
    showToast(
      "Please contact a Super Admin to deactivate your account.",
      "warning",
    );
  });
}

/* ── 14. User dropdown menu ──────────────────────────────── */
function wireUserMenu() {
  const chip = document.getElementById("user-chip");
  const dropdown = document.getElementById("user-dropdown");
  const caret = document.getElementById("user-caret");

  chip?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle("open");
    chip.setAttribute("aria-expanded", open);
    if (caret) caret.style.transform = open ? "rotate(180deg)" : "";
  });

  document.addEventListener("click", () => {
    dropdown?.classList.remove("open");
    chip?.setAttribute("aria-expanded", "false");
    if (caret) caret.style.transform = "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dropdown?.classList.remove("open");
  });
}

/* ── 15. Logout ──────────────────────────────────────────── */
function wireLogout() {
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document
    .getElementById("dropdown-signout")
    ?.addEventListener("click", logout);
  document.getElementById("dropdown-profile")?.addEventListener("click", () => {
    // already on profile — no-op or scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document
    .getElementById("dropdown-settings")
    ?.addEventListener("click", () => {
      window.location.href = "settings.html";
    });
}

/* ── 16. Bootstrap ───────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  populateUser();
  wireTabs();
  wirePasswordStrength();
  wireProfileForm();
  wirePasswordForm();
  wireToggles();
  wireSessions();
  wireAvatarEdit();
  wireCardButtons();
  wireUserMenu();
  wireLogout();
});
