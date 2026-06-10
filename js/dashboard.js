/* ============================================================
   MAWRED – RFQ Platform | Dashboard
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

/* ── 4. Dropdown toggle + nav links ─────────────────────── */
(function bindDropdown() {
  // ── User chip toggle ──────────────────────────────────
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

  // ── Populate dropdown header with session data ────────
  const user = getUser();
  if (user) {
    const ini = getInitials(user.name || "Admin");
    const dAvatar = document.getElementById("dropdown-avatar");
    const dName = document.getElementById("dropdown-name");
    const dRole = document.getElementById("dropdown-role");
    if (dAvatar) dAvatar.textContent = ini;
    if (dName) dName.textContent = user.name || "Admin";
    if (dRole) dRole.textContent = user.role || "Administrator";
  }

  // ── Sign out ──────────────────────────────────────────
  const signoutBtn = document.getElementById("dropdown-signout");
  if (signoutBtn) signoutBtn.addEventListener("click", logout);
  const sidebarLogout = document.getElementById("logout-btn");
  if (sidebarLogout) sidebarLogout.addEventListener("click", logout);

  // ── Profile quick link ───────────────────────────────
  const profileBtn = document.getElementById("dropdown-profile");
  if (profileBtn)
    profileBtn.addEventListener(
      "click",
      () => (window.location.href = "profile.html"),
    );
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
    "qa-invite": "requests.html",
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

/* ── 10b. Offers, Reports & Analytics deep-links ─────────── */
(function bindSecondaryLinks() {
  function goOffers(status) {
    window.location.href = status
      ? `offers.html?status=${encodeURIComponent(status)}`
      : "offers.html";
  }
  function goReports() {
    window.location.href = "reports.html";
  }
  function goAnalytics() {
    window.location.href = "analytics.html";
  }

  function makeClickable(el, handler) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.classList.add("stat-card-link");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", handler);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    });
  }

  // Stat cards by label text
  document.querySelectorAll(".stat-card").forEach((card) => {
    const label = card.querySelector(".stat-label");
    if (!label) return;
    const text = label.textContent.trim();
    if (text === "Total Offers") makeClickable(card, () => goOffers(null));
    if (text === "Pending Reports") makeClickable(card, () => goReports());
  });

  // Activity rows by title text
  document.querySelectorAll(".activity-item").forEach((item) => {
    const title = item.querySelector(".activity-title");
    if (!title) return;
    const text = title.textContent.trim();
    if (text === "Offer submitted") makeClickable(item, () => goOffers(null));
    if (text === "Report submitted") makeClickable(item, () => goReports());
  });

  // Requests Per Day chart panel → Analytics
  document.querySelectorAll(".panel").forEach((panel) => {
    const sub = panel.querySelector(".panel-sub");
    if (sub && sub.textContent.includes("activity")) {
      makeClickable(panel, () => goAnalytics());
    }
  });

  // Quick actions (clone to replace old listeners)
  const cloneBtn = (id, handler) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    clone.addEventListener("click", handler);
  };

  cloneBtn("qa-flagged", () => goOffers("flagged"));
  cloneBtn("qa-generate", () => goReports());

  // "View all activity" → reports
  document
    .getElementById("view-all-activity")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      goReports();
    });
})();

/* ── Global Chart Instances & Firestore Loader ────────────── */
let requestsLineChart = null;
let statusDonutChart = null;

async function loadDashboardData() {
  if (typeof getRequests !== "function" || typeof getOffers !== "function")
    return;

  try {
    const requests = await getRequests();
    const offers = await getOffers();

    // 1. Calculate values
    const totalRequests = requests.length;
    const activeRequests = requests.filter(
      (r) => r.status === "OPEN" || r.status === "IN_PROGRESS",
    ).length;
    const openRequests = requests.filter((r) => r.status === "OPEN").length;
    const inProgressRequests = requests.filter(
      (r) => r.status === "IN_PROGRESS",
    ).length;
    const completedRequests = requests.filter(
      (r) => r.status === "COMPLETED",
    ).length;
    const totalOffersVal = offers.length;
    const pendingReports =
      requests.filter(
        (r) => r.flagged || r.status === "flagged" || r.raw?.flagged === true,
      ).length +
      offers.filter((o) => o.flagged || o.status === "flagged").length;

    // 2. Update stat cards in DOM
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val.toLocaleString("en-EG");
    };
    setText("stat-total-requests", totalRequests);
    setText("stat-active-requests", activeRequests);
    setText("stat-completed", completedRequests);
    setText("stat-total-offers", totalOffersVal);
    setText("stat-pending-reports", pendingReports);

    const updateBadge = (
      badgeParentId,
      badgeValId,
      items,
      dateKey,
      positiveIsGood = true,
    ) => {
      const parent = document.getElementById(badgeParentId);
      const valEl = document.getElementById(badgeValId);
      if (!parent || !valEl) return;
      const now = Date.now();
      const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const recent = items.filter((x) => {
        const d = new Date(x[dateKey]);
        return d >= fifteenDaysAgo;
      }).length;
      const older = items.filter((x) => {
        const d = new Date(x[dateKey]);
        return d >= thirtyDaysAgo && d < fifteenDaysAgo;
      }).length;
      let pct = 0;
      if (older > 0) {
        pct = ((recent - older) / older) * 100;
      } else if (recent > 0) {
        pct = 100;
      }
      const isUp = pct >= 0;
      valEl.textContent = (isUp ? "+" : "") + pct.toFixed(1) + "%";
      const isGood = isUp ? positiveIsGood : !positiveIsGood;
      parent.className = `stat-badge ${isGood ? "up" : "down"}`;
      const svg = parent.querySelector("svg");
      if (svg) {
        svg.innerHTML = isUp
          ? `<path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<path d="M6 3v6M9 6L6 9 3 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    };

    updateBadge(
      "stat-badge-total",
      "stat-badge-val-total",
      requests,
      "created",
      true,
    );
    updateBadge(
      "stat-badge-active",
      "stat-badge-val-active",
      requests.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS"),
      "created",
      true,
    );
    updateBadge(
      "stat-badge-completed",
      "stat-badge-val-completed",
      requests.filter((r) => r.status === "COMPLETED"),
      "created",
      true,
    );
    updateBadge(
      "stat-badge-offers",
      "stat-badge-val-offers",
      offers,
      "submitted",
      true,
    );

    const reportsList = [
      ...requests
        .filter(
          (r) => r.flagged || r.status === "flagged" || r.raw?.flagged === true,
        )
        .map((r) => ({ date: r.created })),
      ...offers
        .filter((o) => o.flagged || o.status === "flagged")
        .map((o) => ({ date: o.submitted })),
    ];
    updateBadge(
      "stat-badge-reports",
      "stat-badge-val-reports",
      reportsList,
      "date",
      false,
    );

    // Update quick-action badges
    setText("qa-badge-reports", pendingReports);
    const flaggedRequests = requests.filter(
      (r) => r.flagged || r.status === "flagged",
    ).length;
    setText("qa-badge-flagged", flaggedRequests);

    // Update legend values
    const setLegendVal = (id, val) => {
      const el = document.querySelector(`#${id} .donut-legend-val`);
      if (el) el.textContent = val.toLocaleString("en-EG");
    };
    setLegendVal("donut-open", openRequests);
    setLegendVal("donut-inprogress", inProgressRequests);
    setLegendVal("donut-completed", completedRequests);

    // 3. Re-draw Donut chart with live data
    if (statusDonutChart) {
      statusDonutChart.data.datasets[0].data = [
        openRequests,
        inProgressRequests,
        completedRequests,
      ];
      statusDonutChart.update();
    }

    // 4. Re-draw Line chart (requests per day in last 30 days)
    if (requestsLineChart) {
      const dailyCounts = Array.from({ length: 30 }, () => 0);
      const now = new Date();
      requests.forEach((r) => {
        const createdDate = new Date(r.created);
        const diffTime = Math.abs(now - createdDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
          const idx = 29 - diffDays;
          if (idx >= 0 && idx < 30) {
            dailyCounts[idx]++;
          }
        }
      });
      requestsLineChart.data.datasets[0].data = dailyCounts;
      requestsLineChart.update();
    }
  } catch (err) {
    console.error("[Firestore] Failed to load dashboard stats:", err);
  }
}

/* ── 10. Line chart (starts empty — Firestore fills it) ─── */
(function buildLineChart() {
  const canvas = document.getElementById("requests-line-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "rgba(34,197,94,0.28)");
  gradient.addColorStop(1, "rgba(34,197,94,0.0)");

  // Start with all zeros — Firestore will update this
  const data = Array.from({ length: 30 }, () => 0);
  const labels = Array.from({ length: 30 }, (_, i) => i + 1);

  requestsLineChart = new Chart(ctx, {
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

/* ── 11. Donut chart (starts empty — Firestore fills it) ── */
(function buildDonutChart() {
  const canvas = document.getElementById("status-donut-chart");
  if (!canvas || typeof Chart === "undefined") return;

  statusDonutChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Open", "In Progress", "Completed"],
      datasets: [
        {
          // Start with zeros — Firestore will update this
          data: [0, 0, 0],
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

/* ── 14. Recent Activity feed from Firestore ─────────────── */

/**
 * Format a Date (or Firestore Timestamp) as a human-readable relative string.
 * e.g. "just now", "3m ago", "2h ago", "Yesterday", "Jun 5"
 */
function formatRelativeTime(date) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d)) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-EG", {
    month: "short",
    day: "numeric",
    timeZone: "Africa/Cairo",
  });
}

/**
 * Render up to 5 recent activities in the #activity-feed container.
 * Each item is either a request or an offer.
 */
function renderRecentActivity(items) {
  const feed = document.getElementById("activity-feed");
  if (!feed) return;

  if (!items || items.length === 0) {
    feed.innerHTML = `
      <div class="activity-empty">
        <svg viewBox="0 0 20 20" fill="none" style="width:32px;height:32px;color:var(--text-muted)">
          <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10 7v4l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <p style="color:var(--text-muted);font-size:.85rem;margin:8px 0 0">No recent activity yet</p>
      </div>`;
    return;
  }

  const typeConfig = {
    request: {
      icon: `<path d="M3 17V8l5-5h9v14H3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 3v5H3M7 11h6M7 14h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
      color: "#22c55e",
      label: "New Request",
    },
    offer: {
      icon: `<path d="M3 10l7-7 7 7v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 18v-5h4v5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
      color: "#3b82f6",
      label: "Offer Submitted",
    },
  };

  const STATUS_LABELS = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };

  feed.innerHTML = items
    .map((item) => {
      const cfg = typeConfig[item._type] || typeConfig.request;
      let title, desc;

      if (item._type === "offer") {
        // Offers: show supplier name as title, linked request as desc
        title = item.supplier?.name || "Supplier";
        desc = item.reqId ? `For ${item.reqId}` : "Offer submitted";
      } else {
        // Requests: show request title, status as desc
        title = item.title || "Untitled Request";
        desc = STATUS_LABELS[item.status] || item.status || "Open";
      }

      const timeStr = formatRelativeTime(
        item.created || item.submitted || item.createdAt,
      );

      return `
      <div class="activity-item">
        <div class="activity-icon-wrap" style="background:${cfg.color}20;color:${cfg.color}">
          <svg viewBox="0 0 20 20" fill="none">${cfg.icon}</svg>
        </div>
        <div class="activity-body">
          <div class="activity-title">${cfg.label}</div>
          <div class="activity-desc">${title}</div>
        </div>
        <div class="activity-time">${timeStr}</div>
      </div>`;
    })
    .join("");
}

/**
 * Fetch the most recent requests + offers from Firestore,
 * merge, sort by date descending, and render the top 5.
 */
async function generateRecentActivities() {
  if (typeof getRequests !== "function" || typeof getOffers !== "function")
    return;
  try {
    const [requests, offers] = await Promise.all([getRequests(), getOffers()]);

    const tagged = [
      ...requests.map((r) => ({ ...r, _type: "request" })),
      ...offers.map((o) => ({ ...o, _type: "offer" })),
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

    renderRecentActivity(tagged.slice(0, 5));
  } catch (err) {
    console.error("[Firestore] Failed to load recent activities:", err);
  }
}

// Trigger loading from Firestore
document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
  generateRecentActivities();
});
