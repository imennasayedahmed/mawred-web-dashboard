/* ============================================================
   MAWRED – RFQ Platform | Analytics Page
   ============================================================ */

"use strict";

/* ── 1. Auth guard ───────────────────────────────────────── */
requireAuth();

/* ── 2. Populate navbar user info ────────────────────────── */
(function populateUser() {
  const user = getUser();
  if (!user) return;
  const slots = {
    "navbar-user-name": user.name || "Admin",
    "navbar-user-role": user.role || "Administrator",
    "navbar-user-avatar": getInitials(user.name || "Admin"),
    "dropdown-name": user.name || "Admin",
    "dropdown-role": user.role || "Administrator",
    "dropdown-avatar": getInitials(user.name || "Admin"),
  };
  Object.entries(slots).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
})();

/* ── 3. Active nav highlight ─────────────────────────────── */
(function highlightNav() {
  const pathSegment = window.location.pathname.split("/").pop() || "analytics.html";
  const filename = pathSegment.replace(/\.html$/, "");
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const hrefSegment = href.split("/").pop() || "";
    const cleanHref = hrefSegment.replace(/\.html$/, "");
    link.classList.toggle("active", cleanHref === filename);
  });
})();

/* ── 4. Toast ────────────────────────────────────────────── */
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

/* ── 6. Chart instances (kept for update/destroy) ─────────── */
const CHARTS = {};

/* ── Charts are built by the Firestore-wired functions below ── */

function buildUserGrowthChart() {
  const ctx = document.getElementById("chart-user-growth");
  if (!ctx || typeof Chart === "undefined") return;

  if (CHARTS.userGrowth) CHARTS.userGrowth.destroy();

  const now = new Date();
  const labels = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(
      d.toLocaleDateString("en-EG", {
        month: "short",
        timeZone: "Africa/Cairo",
      }),
    );
  }

  let requesters = Array(10).fill(0);
  let suppliers = Array(10).fill(0);

  if (liveUsers && liveUsers.length > 0) {
    for (let i = 9; i >= 0; i--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      requesters[9 - i] = liveUsers.filter((u) => {
        const role = (u.role || "").toLowerCase();
        const created = u.createdAt
          ? typeof u.createdAt.toDate === "function"
            ? u.createdAt.toDate()
            : new Date(u.createdAt)
          : new Date(0);
        return (
          (role === "requester" || role === "customer" || role === "client") &&
          created <= d
        );
      }).length;
      suppliers[9 - i] = liveUsers.filter((u) => {
        const role = (u.role || "").toLowerCase();
        const created = u.createdAt
          ? typeof u.createdAt.toDate === "function"
            ? u.createdAt.toDate()
            : new Date(u.createdAt)
          : new Date(0);
        return (role === "supplier" || role === "vendor") && created <= d;
      }).length;
    }
  }

  CHARTS.userGrowth = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Requesters",
          data: requesters,
          borderColor: "#22c55e",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#22c55e",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
        {
          label: "Suppliers",
          data: suppliers,
          borderColor: "#15803d",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#15803d",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          titleColor: "#f9fafb",
          bodyColor: "#d1d5db",
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#9ca3af", font: { size: 10 } },
          border: { display: false },
        },
        y: {
          grid: { color: "#f3f4f6" },
          ticks: { color: "#9ca3af", font: { size: 10 } },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ── 12. Date range & Firestore Integration wiring ───────── */
let liveRequests = [];
let liveOffers = [];
let liveUsers = [];
let activeRange = "30";

async function loadAnalyticsData() {
  if (typeof getRequests !== "function" || typeof getOffers !== "function")
    return;
  try {
    liveRequests = await getRequests();
    liveOffers = await getOffers();
    if (typeof getUsers === "function") {
      liveUsers = await getUsers();
    }
    applyDateRange(activeRange);
  } catch (err) {
    console.error("[Firestore] Failed to load analytics data:", err);
  }
}

const RANGE_MAP = { 7: 7, 30: 30, 90: 90 };

function applyDateRange(range) {
  activeRange = range;
  const days = RANGE_MAP[range] || 30;

  // Filter requests/offers by selected date range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const filteredReqs = liveRequests.filter(
    (r) => new Date(r.created) >= cutoff,
  );
  const filteredOffers = liveOffers.filter(
    (o) => new Date(o.submitted) >= cutoff,
  );

  // 1. Build requests per day chart dynamically
  buildRequestsChart(days, filteredReqs);

  // 2. Build offers per category ratio bar chart
  buildOffersChart(filteredOffers);

  // 3. Render top supplier bars
  renderSupplierBars(filteredOffers);

  // 4. Build status distribution donut chart
  buildStatusChart(filteredReqs);
}

function buildRequestsChart(days, filteredReqs) {
  const ctx = document.getElementById("chart-requests");
  if (!ctx || typeof Chart === "undefined") return;
  if (CHARTS.requests) CHARTS.requests.destroy();

  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(34,197,94,0.25)");
  gradient.addColorStop(1, "rgba(34,197,94,0.0)");

  const labels = [];
  const data = [];
  const today = new Date();
  const step = days <= 7 ? 1 : days <= 30 ? 1 : days <= 90 ? 3 : 7;

  if (liveRequests.length > 0) {
    // Build a daily counts map from real Firestore data
    const counts = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString("en-EG", {
        month: "short",
        day: "numeric",
        timeZone: "Africa/Cairo",
      });
      counts[dateStr] = 0;
    }

    filteredReqs.forEach((r) => {
      const dateStr = new Date(r.created).toLocaleDateString("en-EG", {
        month: "short",
        day: "numeric",
        timeZone: "Africa/Cairo",
      });
      if (dateStr in counts) counts[dateStr]++;
    });

    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString("en-EG", {
        month: "short",
        day: "numeric",
        timeZone: "Africa/Cairo",
      });
      labels.push(dateStr);
      let sum = 0;
      for (let s = 0; s < step; s++) {
        const subD = new Date(d);
        subD.setDate(d.getDate() + s);
        const subStr = subD.toLocaleDateString("en-EG", {
          month: "short",
          day: "numeric",
          timeZone: "Africa/Cairo",
        });
        sum += counts[subStr] || 0;
      }
      data.push(sum);
    }
  } else {
    // No live data — show empty labels, zero data
    const today = new Date();
    const step = days <= 7 ? 1 : days <= 30 ? 1 : days <= 90 ? 3 : 7;
    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(
        d.toLocaleDateString("en-EG", {
          month: "short",
          day: "numeric",
          timeZone: "Africa/Cairo",
        }),
      );
      data.push(0);
    }
  }

  const kpiEl = document.getElementById("kpi-requests");
  if (kpiEl)
    kpiEl.textContent = filteredReqs
      ? filteredReqs.length.toLocaleString("en-EG")
      : "0";

  CHARTS.requests = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: "#22c55e",
          backgroundColor: gradient,
          borderWidth: 2.5,
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
          titleColor: "#f9fafb",
          bodyColor: "#d1d5db",
          padding: 10,
          callbacks: { label: (ctx) => ` ${ctx.parsed.y} requests` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#9ca3af",
            font: { size: 10 },
            maxTicksLimit: 7,
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: { color: "#f3f4f6" },
          ticks: { color: "#9ca3af", font: { size: 10 } },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

function buildOffersChart(filteredOffers) {
  const ctx = document.getElementById("chart-offers");
  if (!ctx || typeof Chart === "undefined") return;
  if (CHARTS.offers) CHARTS.offers.destroy();

  let categories = [];
  let data = [];

  if (liveOffers.length > 0 && liveRequests.length > 0) {
    const categoryCounts = {};
    filteredOffers.forEach((o) => {
      const req = liveRequests.find((r) => r.id === o.reqId);
      const cat = req ? req.category : "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const sorted = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    categories = sorted.map((x) => x.name);
    data = sorted.map((x) => x.count);
    const totalRequests = liveRequests.length || 1;
    const avgOffers = (filteredOffers.length / totalRequests).toFixed(1);
    const avgEl = document.getElementById("kpi-offers-avg");
    if (avgEl) avgEl.textContent = avgOffers;
  } else {
    // No live data — show empty
    categories = [];
    data = [];
    const avgEl = document.getElementById("kpi-offers-avg");
    if (avgEl) avgEl.textContent = "0";
  }

  CHARTS.offers = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categories,
      datasets: [
        {
          data,
          backgroundColor: [
            "#22c55e",
            "#4ade80",
            "#16a34a",
            "#22c55e",
            "#4ade80",
            "#86efac",
          ],
          borderRadius: 5,
          borderSkipped: false,
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
          titleColor: "#f9fafb",
          bodyColor: "#d1d5db",
          padding: 10,
          callbacks: { label: (ctx) => ` ${ctx.parsed.y} offers` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#9ca3af", font: { size: 10 } },
          border: { display: false },
        },
        y: {
          grid: { color: "#f3f4f6" },
          ticks: { color: "#9ca3af", font: { size: 10 } },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

function renderSupplierBars(filteredOffers) {
  const list = document.getElementById("supplier-bar-list");
  if (!list) return;

  let sortedSuppliers = [];
  if (liveOffers.length > 0) {
    const counts = {};
    filteredOffers.forEach((o) => {
      const name = o.supplier?.name || "Unknown Supplier";
      counts[name] = (counts[name] || 0) + 1;
    });
    sortedSuppliers = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  if (sortedSuppliers.length === 0) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:.85rem;padding:16px 0;text-align:center;">No supplier data yet</div>`;
    return;
  }

  const max = sortedSuppliers[0]?.count || 1;

  list.innerHTML = sortedSuppliers
    .map(
      (s, i) => `
    <div class="supplier-bar-row">
      <div class="supplier-bar-name" title="${s.name}">${s.name}</div>
      <div class="supplier-bar-track">
        <div class="supplier-bar-fill ${i > 3 ? "dim" : ""}"
             style="width:${Math.round((s.count / max) * 100)}%"></div>
      </div>
      <div class="supplier-bar-count">${s.count}</div>
    </div>
  `,
    )
    .join("");
}

function buildStatusChart(filteredReqs) {
  const ctx = document.getElementById("chart-status");
  if (!ctx || typeof Chart === "undefined") return;
  if (CHARTS.status) CHARTS.status.destroy();

  let dist = { open: 0, inprogress: 0, completed: 0, archived: 0 };

  if (liveRequests.length > 0) {
    filteredReqs.forEach((r) => {
      const s = (r.status || "").toUpperCase();
      if (s === "OPEN") dist.open++;
      else if (s === "IN_PROGRESS") dist.inprogress++;
      else if (s === "COMPLETED") dist.completed++;
      else dist.archived++;
    });
  }

  const total = dist.open + dist.inprogress + dist.completed + dist.archived;
  const pct = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);

  // Update legend
  const setLegend = (id, count, p) => {
    const el = document.getElementById(id);
    if (el)
      el.innerHTML = `<span class="status-legend-count">${count.toLocaleString("en-EG")}</span>
       <span class="status-legend-pct">${p}%</span>`;
  };
  setLegend("legend-open", dist.open, pct(dist.open));
  setLegend("legend-inprogress", dist.inprogress, pct(dist.inprogress));
  setLegend("legend-completed", dist.completed, pct(dist.completed));
  setLegend("legend-archived", dist.archived, pct(dist.archived));

  const totalEl = document.getElementById("legend-total");
  if (totalEl) totalEl.textContent = total.toLocaleString("en-EG");

  CHARTS.status = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Open", "In Progress", "Completed", "Archived"],
      datasets: [
        {
          data: [dist.open, dist.inprogress, dist.completed, dist.archived],
          backgroundColor: ["#22c55e", "#f59e0b", "#15803d", "#9ca3af"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111827",
          titleColor: "#f9fafb",
          bodyColor: "#d1d5db",
          padding: 10,
          callbacks: {
            label: (ctx) =>
              ` ${ctx.parsed.toLocaleString("en-EG")} (${pct(ctx.parsed)}%)`,
          },
        },
      },
    },
  });
}

/* ── 13. Chart download helper ───────────────────────────── */
function downloadChart(chartKey, filename) {
  const chart = CHARTS[chartKey];
  if (!chart) {
    showToast("Chart not ready yet", "warning");
    return;
  }
  const url = chart.toBase64Image();
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
  showToast(`${filename} downloaded!`, "success");
}

/* ── 14. Bootstrap ───────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  /* Populate navbar + dropdown with session user */
  const _u = getUser();
  if (_u) {
    const _ini = getInitials(_u.name || "Admin");
    const _set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    _set("navbar-user-name", _u.name || "Admin");
    _set("navbar-user-role", _u.role || "Administrator");
    _set("navbar-user-avatar", _ini);
    _set("dropdown-name", _u.name || "Admin");
    _set("dropdown-role", _u.role || "Administrator");
    _set("dropdown-avatar", _ini);
  }

  /* Date range pills */

  document.querySelectorAll(".date-pill[data-range]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document
        .querySelectorAll(".date-pill[data-range]")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeRange = pill.dataset.range;
      if (activeRange === "custom") {
        showToast("Custom date range picker coming soon!", "warning");
        return;
      }
      applyDateRange(activeRange);
    });
  });

  /* Export All */
  document.getElementById("btn-export-all")?.addEventListener("click", () => {
    showToast("Exporting all analytics data…", "success");
  });

  /* Chart download buttons */
  document
    .getElementById("dl-requests")
    ?.addEventListener("click", () =>
      downloadChart("requests", "requests-per-day"),
    );
  document
    .getElementById("dl-offers")
    ?.addEventListener("click", () =>
      downloadChart("offers", "offers-per-category"),
    );
  document
    .getElementById("dl-suppliers")
    ?.addEventListener("click", () =>
      downloadChart("suppliers", "active-suppliers"),
    );
  document
    .getElementById("dl-status")
    ?.addEventListener("click", () =>
      downloadChart("status", "status-distribution"),
    );
  document
    .getElementById("dl-user-growth")
    ?.addEventListener("click", () =>
      downloadChart("userGrowth", "user-growth"),
    );

  /* User menu dropdown */
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

  /* Logout */
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document
    .getElementById("dropdown-signout")
    ?.addEventListener("click", logout);
  document.getElementById("dropdown-profile")?.addEventListener("click", () => {
    window.location.href = "profile.html";
  });

  // Load live data
  loadAnalyticsData().then(() => {
    buildUserGrowthChart();
  });
});
