/* ============================================================
   MAWRED – RFQ Platform | Profile Page Logic
   Features: tab switching, editable info form, password
             strength meter, notification toggles, session
             management, avatar initials, toast notifications
   ============================================================ */

"use strict";

/* ── 1. Auth guard ───────────────────────────────────────── */
requireAuth();
// NOTE: initFirebaseAuth() is called inside DOMContentLoaded below

/* ── 2. Firebase user data helpers ──────────────────────── */

/**
 * Returns the live Firebase Auth current user object.
 * Falls back gracefully if Firebase hasn't loaded.
 */
function getFirebaseUser() {
  if (typeof fbAuth !== "undefined" && fbAuth.currentUser) {
    return fbAuth.currentUser;
  }
  return null;
}

/**
 * Format a Firebase metadata timestamp string into a readable label.
 * e.g. "Mon, 08 Jun 2026 11:00:00 GMT" → "Jun 8, 2026"
 */
function formatDate(timeStr) {
  if (!timeStr) return "—";
  try {
    return new Date(timeStr).toLocaleDateString("en-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Africa/Cairo"
    });
  } catch {
    return "—";
  }
}

/**
 * Format last sign-in as a relative label.
 * e.g. "Today at 09:41 AM" or "Jun 5, 2026"
 */
function formatLastLogin(timeStr) {
  if (!timeStr) return "—";
  try {
    const d = new Date(timeStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return (
        "Today at " +
        d.toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" })
      );
    }
    return d.toLocaleDateString("en-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Africa/Cairo"
    });
  } catch {
    return "—";
  }
}

/* ── 3. Populate all user slots from Firebase Auth ───────── */
function populateUser() {
  // Priority: Firebase Auth currentUser → sessionStorage → hardcoded fallback
  const fbUser   = getFirebaseUser();
  const session  = getUser(); // from auth.js sessionStorage

  const name     = fbUser?.displayName || session?.name || "Admin";
  const email    = fbUser?.email       || session?.email || "";
  const role     = session?.role       || "Administrator";
  const ini      = getInitials(name);

  const joinDate  = formatDate(fbUser?.metadata?.creationTime);
  const lastLogin = formatLastLogin(fbUser?.metadata?.lastSignInTime);

  // ── Navbar ──────────────────────────────────────────────
  setText("navbar-user-name",   name);
  setText("navbar-user-role",   role);
  setText("navbar-user-avatar", ini);

  // ── Dropdown ─────────────────────────────────────────────
  setText("dropdown-name",   name);
  setText("dropdown-role",   role);
  setText("dropdown-avatar", ini);

  // ── Profile card ─────────────────────────────────────────
  setText("profile-name",       name);
  setText("profile-initials",   ini);
  setText("profile-role-label", role);
  setText("profile-join-date",  joinDate);
  setText("profile-last-login", lastLogin);

  // ── Email link (dynamic) ─────────────────────────────────
  const emailLink = document.getElementById("profile-email-link");
  if (emailLink) {
    emailLink.textContent = email || "—";
    emailLink.href = email ? `mailto:${email}` : "#";
  }

  // ── Personal Info form ────────────────────────────────────
  const nameParts = name.split(" ");
  setVal("field-first-name", nameParts[0] || "");
  setVal("field-last-name",  nameParts.slice(1).join(" ") || "");
  setVal("field-email",      email);

  // Phone / department / location / bio — stored in Firestore
  // Will be filled by loadFirestoreProfile() if a profile doc exists
  setVal("field-phone",      "");
  setVal("field-department", "");
  setVal("field-location",   "");
  setVal("field-bio",        "");
}

/* ── 4. Load live stats from Firestore ──────────────────── */
async function loadFirestoreStats() {
  if (typeof fbDb === "undefined") return;

  try {
    // Count requests
    const reqSnap = await fbDb.collection("requests").get();
    setText("pstat-requests", String(reqSnap.size));
  } catch (_) {
    setText("pstat-requests", "—");
  }

  try {
    // Count offers
    const offSnap = await fbDb.collection("offers").get();
    setText("pstat-offers", String(offSnap.size));
  } catch (_) {
    setText("pstat-offers", "—");
  }

  // Reports = flagged requests + flagged offers
  try {
    let flaggedCount = 0;
    const rFlagged = await fbDb.collection("requests").where("status", "==", "flagged").get();
    flaggedCount += rFlagged.size;
    const oFlagged = await fbDb.collection("offers").where("status", "==", "flagged").get();
    flaggedCount += oFlagged.size;
    setText("pstat-reports", String(flaggedCount));
  } catch (_) {
    setText("pstat-reports", "—");
  }
}

/* ── 5. Load Firestore profile doc (phone / location) ────── */
async function loadFirestoreProfile(uid) {
  if (typeof fbDb === "undefined") return;
  try {
    const doc = await fbDb.collection("admins").doc(uid).get();
    if (!doc.exists) return;
    const data = doc.data();

    // Phone
    if (data.phone) {
      setText("profile-phone", data.phone);
      const row = document.getElementById("profile-phone-row");
      if (row) row.style.display = "";
      setVal("field-phone", data.phone);
    }
    // Location
    if (data.location) {
      setText("profile-location", data.location);
      const row = document.getElementById("profile-location-row");
      if (row) row.style.display = "";
      setVal("field-location", data.location);
    }
    // Department
    if (data.department) setVal("field-department", data.department);
    // Bio
    if (data.bio) setVal("field-bio", data.bio);
  } catch (e) {
    console.warn("[Profile] Could not load Firestore profile doc:", e.message);
  }
}

/* ── 4. (Auth state listener wired inside DOMContentLoaded) ─ */

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? "—";
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? "";
}

/* ── 5. Active nav highlight ─────────────────────────────── */
(function highlightNav() {
  const filename =
    window.location.pathname.split("/").pop() || "profile.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle(
      "active",
      href === filename || href.endsWith("/" + filename),
    );
  });
})();

/* ── 6. Toast ────────────────────────────────────────────── */
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
  document.getElementById("toast-icon").innerHTML = icons[type] || icons.success;
  document.getElementById("toast-msg").textContent = message;
  void toast.offsetWidth;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ── 7. Tab switching ────────────────────────────────────── */
function wireTabs() {
  document.querySelectorAll(".profile-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".profile-tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".profile-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(`panel-${btn.dataset.tab}`);
      if (panel) panel.classList.add("active");
    });
  });
}

/* ── 8. Password strength meter ──────────────────────────── */
function wirePasswordStrength() {
  const input = document.getElementById("field-new-password");
  const segs  = document.querySelectorAll(".strength-seg");
  const labelEl = document.getElementById("strength-label");
  if (!input || !segs.length) return;

  input.addEventListener("input", () => {
    const val = input.value;
    let score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = ["", "weak", "fair", "good", "strong"];
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#ef4444", "#f59e0b", "#22c55e", "#15803d"];

    segs.forEach((seg, i) => {
      seg.className = "strength-seg";
      if (i < score) seg.classList.add("filled", levels[score]);
    });
    if (labelEl) {
      labelEl.textContent  = val ? labels[score] || "" : "";
      labelEl.style.color  = colors[score] || "";
    }
  });
}

/* ── 9. Profile info form — saves displayName to Firebase ── */
function wireProfileForm() {
  const form      = document.getElementById("form-profile-info");
  const cancelBtn = document.getElementById("btn-cancel-info");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      populateUser();
      showToast("Changes discarded", "warning");
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const first = document.getElementById("field-first-name")?.value.trim();
      const last  = document.getElementById("field-last-name")?.value.trim();
      if (!first) {
        showToast("First name is required", "error");
        return;
      }

      const fullName = `${first} ${last}`.trim();

      // ── Save displayName to Firebase Auth ─────────────────
      const fbUser = getFirebaseUser();
      if (fbUser) {
        try {
          await fbUser.updateProfile({ displayName: fullName });
          // Also update sessionStorage so navbar stays in sync
          const session = getUser();
          if (session) saveSession({ ...session, name: fullName });
        } catch (err) {
          showToast("Could not save to Firebase: " + err.message, "error");
          return;
        }
      }

      // Update UI live
      setText("profile-name",     fullName);
      setText("profile-initials", getInitials(fullName));
      setText("navbar-user-name", fullName);
      setText("dropdown-name",    fullName);
      showToast("Profile updated successfully!", "success");
    });
  }
}

/* ── 10. Password form — uses real Firebase re-auth ─────── */
function wirePasswordForm() {
  const form = document.getElementById("form-password");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPw = document.getElementById("field-current-password")?.value;
    const newPw     = document.getElementById("field-new-password")?.value;
    const confirmPw = document.getElementById("field-confirm-password")?.value;

    if (!currentPw) {
      showToast("Enter your current password", "error");
      return;
    }
    if (!newPw || newPw.length < 6) {
      showToast("New password must be at least 6 characters", "error");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("Passwords do not match", "error");
      return;
    }

    const fbUser = getFirebaseUser();
    if (!fbUser) {
      showToast("Not signed in — please refresh", "error");
      return;
    }

    try {
      // Firebase requires re-authentication before changing password
      const credential = firebase.auth.EmailAuthProvider.credential(
        fbUser.email,
        currentPw,
      );
      await fbUser.reauthenticateWithCredential(credential);
      await fbUser.updatePassword(newPw);

      form.reset();
      document.querySelectorAll(".strength-seg").forEach((s) => (s.className = "strength-seg"));
      setText("strength-label", "");
      showToast("Password changed successfully!", "success");
    } catch (err) {
      const msg =
        err.code === "auth/wrong-password"
          ? "Current password is incorrect"
          : err.code === "auth/too-many-requests"
          ? "Too many attempts — try again later"
          : "Failed to change password";
      showToast(msg, "error");
    }
  });
}

/* ── 11. Notification toggles ────────────────────────────── */
function wireToggles() {
  document.querySelectorAll(".toggle-switch input").forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const label =
        toggle.closest(".toggle-row")?.querySelector(".toggle-label")
          ?.textContent?.trim() || "Setting";
      showToast(
        `${label} ${toggle.checked ? "enabled" : "disabled"}`,
        "success",
      );
    });
  });
}

/* ── 12. Session revoke ──────────────────────────────────── */
function wireSessions() {
  document.querySelectorAll(".btn-revoke").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row  = btn.closest(".session-row");
      const name = row?.querySelector(".session-name")?.textContent?.trim() || "session";
      row?.style && (row.style.opacity = "0.4");
      btn.disabled = true;
      btn.textContent = "Revoked";
      showToast(`${name} session revoked`, "warning");
    });
  });
}

/* ── 13. Avatar edit stub ────────────────────────────────── */
function wireAvatarEdit() {
  document.getElementById("btn-avatar-edit")?.addEventListener("click", () => {
    showToast("Photo upload coming soon!", "warning");
  });
}

/* ── 14. Profile card buttons ────────────────────────────── */
function wireCardButtons() {
  document.getElementById("btn-download-data")?.addEventListener("click", () => {
    showToast("Preparing your data export…", "success");
  });
  document.getElementById("btn-deactivate")?.addEventListener("click", () => {
    showToast("Please contact a Super Admin to deactivate your account.", "warning");
  });
}

/* ── 15. User dropdown menu ──────────────────────────────── */
function wireUserMenu() {
  const chip     = document.getElementById("user-chip");
  const dropdown = document.getElementById("user-dropdown");
  const caret    = document.getElementById("user-caret");

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

/* ── 16. Recent Activity Feed ────────────────────────────── */
async function loadRecentActivity() {
  const container = document.querySelector(".activity-feed");
  if (!container) return;

  // Render a placeholder spinner/loading state initially
  container.innerHTML = `
    <div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:.85rem;">
      Loading recent activities…
    </div>`;

  if (typeof getRequests !== "function" || typeof getOffers !== "function") {
    container.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:.85rem;">
        No recent activity available
      </div>`;
    return;
  }

  try {
    const [requests, offers] = await Promise.all([getRequests(), getOffers()]);

    const tagged = [
      ...requests.map(r => ({ ...r, _type: "request" })),
      ...offers.map(o   => ({ ...o, _type: "offer"   })),
    ];

    // Sort by most-recent first
    tagged.sort((a, b) => {
      const getMs = (item) => {
        const raw = item.created || item.submitted || item.createdAt;
        if (!raw) return 0;
        const d = raw.toDate ? raw.toDate() : new Date(raw);
        return isNaN(d) ? 0 : d.getTime();
      };
      return getMs(b) - getMs(a);
    });

    if (tagged.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:.85rem;">
          No recent activity found
        </div>`;
      return;
    }

    const typeConfig = {
      request: {
        icon: `<path d="M3 17V8l5-5h9v14H3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 3v5H3M7 11h6M7 14h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
        color: "green",
        label: "New Request",
      },
      offer: {
        icon: `<path d="M3 10l7-7 7 7v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 18v-5h4v5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
        color: "blue",
        label: "Offer Submitted",
      },
    };

    const STATUS_LABELS = {
      OPEN:        "Open",
      IN_PROGRESS: "In Progress",
      COMPLETED:   "Completed",
      CANCELLED:   "Cancelled",
    };

    // Keep top 6 items
    const slice = tagged.slice(0, 6);

    container.innerHTML = slice.map(item => {
      const cfg = typeConfig[item._type] || typeConfig.request;
      let title, desc;

      if (item._type === "offer") {
        title = item.supplier?.name || "Supplier";
        desc  = item.reqId ? `For ${item.reqId}` : "Offer submitted";
      } else {
        title = item.title || "Untitled Request";
        desc  = STATUS_LABELS[item.status] || item.status || "Open";
      }

      const timeStr = formatRelativeTime(item.created || item.submitted || item.createdAt);

      return `
        <div class="activity-feed-item">
          <div class="act-icon ${cfg.color}">
            <svg viewBox="0 0 20 20" fill="none">${cfg.icon}</svg>
          </div>
          <div class="act-body">
            <div class="act-title">${cfg.label}: ${title}</div>
            <div class="act-desc">${desc}</div>
          </div>
          <div class="act-time">${timeStr}</div>
        </div>`;
    }).join("");

  } catch (err) {
    console.error("[Firestore] Failed to load recent activities in profile:", err);
    container.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:.85rem;">
        Failed to load activity log
      </div>`;
  }
}

function formatRelativeTime(date) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d)) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)   return "just now";
  if (diffMin < 60)   return `${diffMin}m ago`;
  if (diffHr  < 24)   return `${diffHr}h ago`;
  if (diffDay === 1)  return "Yesterday";
  if (diffDay < 7)    return `${diffDay}d ago`;
  return d.toLocaleDateString("en-EG", { month: "short", day: "numeric", timeZone: "Africa/Cairo" });
}

/* ── 17. Logout ──────────────────────────────────────────── */
function wireLogout() {
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document.getElementById("dropdown-signout")?.addEventListener("click", logout);
  document.getElementById("dropdown-profile")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ── 18. Bootstrap ───────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Populate immediately from sessionStorage (fast, no flicker)
  populateUser();

  // 2. Wire all interactions
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

  // 3. Once Firebase resolves its auth state, re-populate with
  //    real data (creationTime, lastSignInTime, verified email, etc.)
  //    then load live counts and profile doc from Firestore
  if (typeof fbAuth !== "undefined") {
    fbAuth.onAuthStateChanged((fbUser) => {
      if (fbUser) {
        populateUser(); // now fbAuth.currentUser is guaranteed non-null
        loadFirestoreStats();          // live request / offer / report counts
        loadFirestoreProfile(fbUser.uid); // phone, location, bio from admins doc
        loadRecentActivity();          // live recent activity log
      } else {
        // Firebase says no user — bounce to login
        logout();
      }
    });
  } else {
    // No Firebase — just try to load stats from any available source
    loadFirestoreStats();
    loadRecentActivity();
  }
});

