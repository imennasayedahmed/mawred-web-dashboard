/* ============================================================
   MAWRED – RFQ Platform | Dashboard Logic
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
  const filename =
    window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href === filename || href.endsWith("/" + filename)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
})();

/* ── 4. Dropdown sign-out + nav links ────────────────────── */
(function bindDropdown() {
  // Sign out
  const signoutBtn = document.getElementById("dropdown-signout");
  if (signoutBtn) signoutBtn.addEventListener("click", logout);

  // Also keep sidebar sign-out if it exists
  const sidebarLogout = document.getElementById("logout-btn");
  if (sidebarLogout) sidebarLogout.addEventListener("click", logout);

  // Profile / Settings quick links
  const profileBtn = document.getElementById("dropdown-profile");
  const settingsBtn = document.getElementById("dropdown-settings");
  if (profileBtn)
    profileBtn.addEventListener("click", () =>
      showToast("Profile page coming soon!"),
    );
  if (settingsBtn)
    settingsBtn.addEventListener("click", () => {
      window.location.href = "settings.html";
    });
})();

/* ── 5. Global search (placeholder – extend as needed) ─── */
(function bindSearch() {
  const input = document.getElementById("global-search");
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      showToast(`Searching for "${input.value.trim()}"…`);
    }
  });
})();

/* ── 6. Notification button ─────────────────────────────── */
(function bindNotif() {
  const btn = document.getElementById("notif-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    showToast("You have 3 unread notifications");
  });
})();

/* ── 7. Date-range pill ─────────────────────────────────── */
(function bindDateRange() {
  const btn = document.getElementById("date-range-btn");
  if (!btn) return;
  const ranges = ["Last 7 days", "Last 30 days", "Last 90 days", "This year"];
  let idx = 1; // default = "Last 30 days"
  btn.addEventListener("click", () => {
    idx = (idx + 1) % ranges.length;
    btn.querySelector(".date-label").textContent = ranges[idx];
    showToast(`Date range: ${ranges[idx]}`);
  });
})();

/* ── 8. Export button ───────────────────────────────────── */
(function bindExport() {
  const btn = document.getElementById("export-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spin-icon" viewBox="0 0 20 20" fill="none" style="width:15px;height:15px;animation:dash-spin 0.8s linear infinite">
        <circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.35)" stroke-width="2.5"/>
        <path d="M10 3a7 7 0 017 7" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      Exporting…`;
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 20 20" fill="none" style="width:15px;height:15px">
          <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 15v1a1 1 0 001 1h12a1 1 0 001-1v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Export`;
      showToast("Dashboard exported successfully!");
    }, 1800);
  });
})();

/* ── 9. Quick action buttons ────────────────────────────── */
(function bindQuickActions() {
  const map = {
    "qa-reports": "reports.html",
    "qa-flagged": "requests.html",
    "qa-invite": "users.html",
    "qa-generate": "reports.html",
  };
  Object.entries(map).forEach(([id, page]) => {
    const btn = document.getElementById(id);
    if (btn)
      btn.addEventListener("click", () => {
        window.location.href = page;
      });
  });
})();

/* ── 10. Requests deep-links from dashboard elements ─────── */
(function bindRequestsLinks() {
  /**
   * Navigate to requests.html, optionally pre-filtering by status.
   * The requests page reads `location.search` on load to apply the filter.
   */
  function goRequests(status) {
    window.location.href = status
      ? `requests.html?status=${encodeURIComponent(status)}`
      : "requests.html";
  }

  /** Wire a single element: click + keyboard Enter/Space */
  function wire(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => goRequests(status));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goRequests(status);
      }
    });
  }

  // Stat cards
  wire("stat-card-total", null);
  wire("stat-card-active", "OPEN");
  wire("stat-card-completed", "COMPLETED");

  // Requests Per Day chart panel
  wire("panel-requests-chart", null);

  // Status Donut legend rows
  wire("donut-open", "OPEN");
  wire("donut-inprogress", "IN_PROGRESS");
  wire("donut-completed", "COMPLETED");

  // Recent Activity rows
  wire("activity-new-request", null);
  wire("activity-completed-request", "COMPLETED");
})();

/* ── 10b. Offers deep-links (no HTML changes required) ───── */
(function bindOffersLinks() {
  function goOffers(status) {
    window.location.href = status
      ? `offers.html?status=${encodeURIComponent(status)}`
      : "offers.html";
  }

  function makeClickable(el, status) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.classList.add("stat-card-link");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", () => goOffers(status));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goOffers(status);
      }
    });
  }

  // Total Offers stat card — find by its label text
  document.querySelectorAll(".stat-card").forEach((card) => {
    const label = card.querySelector(".stat-label");
    if (label && label.textContent.trim() === "Total Offers") {
      makeClickable(card, null);
    }
  });

  // "Offer submitted" activity row — find by its title text
  document.querySelectorAll(".activity-item").forEach((item) => {
    const title = item.querySelector(".activity-title");
    if (title && title.textContent.trim() === "Offer submitted") {
      makeClickable(item, null);
    }
  });

  // "View Flagged Requests" quick action → offers instead
  const qaFlagged = document.getElementById("qa-flagged");
  if (qaFlagged) {
    // Remove the existing requests.html listener by cloning the node
    const clone = qaFlagged.cloneNode(true);
    qaFlagged.parentNode.replaceChild(clone, qaFlagged);
    clone.addEventListener("click", () => goOffers("flagged"));
  }
})();

/* ── 10. Line chart ─────────────────────────────────────── */
(function buildLineChart() {
  const canvas = document.getElementById("requests-line-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "rgba(34,197,94,0.28)");
  gradient.addColorStop(1, "rgba(34,197,94,0.0)");

  const data = [
    38, 42, 35, 48, 52, 45, 60, 55, 62, 68, 58, 72, 65, 78, 74, 82, 70, 88, 85,
    90, 80, 95, 88, 100, 92, 97, 85, 102, 98, 105,
  ];
  const labels = Array.from({ length: 30 }, (_, i) => i + 1);

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: "#22c55e",
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#22c55e",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          titleFont: { family: "Inter", size: 11 },
          bodyFont: { family: "Inter", size: 12 },
          callbacks: { title: (items) => `Day ${items[0].label}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "Inter", size: 10 },
            color: "#9ca3af",
            maxTicksLimit: 10,
          },
          border: { display: false },
        },
        y: {
          grid: { color: "#f3f4f6" },
          ticks: { font: { family: "Inter", size: 10 }, color: "#9ca3af" },
          border: { display: false },
        },
      },
    },
  });
})();

/* ── 11. Donut chart ────────────────────────────────────── */
(function buildDonutChart() {
  const canvas = document.getElementById("status-donut-chart");
  if (!canvas || typeof Chart === "undefined") return;

  new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Open", "In Progress", "Completed"],
      datasets: [
        {
          data: [342, 218, 891],
          backgroundColor: ["#22c55e", "#4ade80", "#15803d"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          titleFont: { family: "Inter", size: 11 },
          bodyFont: { family: "Inter", size: 12 },
        },
      },
    },
  });
})();

/* ── 12. Toast notification ─────────────────────────────── */
function showToast(message) {
  let toast = document.querySelector(".dash-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "dash-toast";
    toast.style.cssText = `
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);
      background:#111827;color:#fff;padding:11px 22px;border-radius:9999px;
      font-family:'Inter',sans-serif;font-size:.85rem;font-weight:500;
      box-shadow:0 8px 30px rgba(0,0,0,.18);
      transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .35s;
      opacity:0;z-index:9999;white-space:nowrap;pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.transform = "translateX(-50%) translateY(0)";
  toast.style.opacity = "1";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(80px)";
    toast.style.opacity = "0";
  }, 3000);
}

/* ── 13. Spin keyframe for export button ────────────────── */
(function addSpinStyle() {
  const s = document.createElement("style");
  s.textContent = "@keyframes dash-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
})();
