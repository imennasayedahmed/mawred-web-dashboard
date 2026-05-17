/* ============================================================
   MAWRED – RFQ Platform | Analytics Page Logic
   Charts: Requests/Day line, Offers/Category bar,
           Most Active Suppliers bars, Status Distribution donut,
           User Growth dual-line
   Features: date range toggle, live badge, chart download,
             export all, user menu, logout, toast
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
  const filename =
    window.location.pathname.split("/").pop() || "analytics.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle(
      "active",
      href === filename || href.endsWith("/" + filename),
    );
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

/* ── 5. Data generators ──────────────────────────────────── */

// Returns `days` data points for requests/day, scaled to date range
function genRequestsPerDay(days) {
  const data = [];
  const labels = [];
  const today = new Date();
  const step = days <= 7 ? 1 : days <= 30 ? 1 : days <= 90 ? 3 : 7;
  for (let i = days - 1; i >= 0; i -= step) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    );
    data.push(
      Math.max(
        18,
        Math.round(42 + Math.sin(i * 0.35) * 14 + (Math.random() - 0.4) * 16),
      ),
    );
  }
  return { labels, data };
}

// Offers per category — static ratios, values scale with range multiplier
function genOffersPerCategory(multiplier = 1) {
  const cats = ["IT", "Constr.", "Logistics", "Office", "Medical", "Energy"];
  const base = [6.2, 7.1, 5.4, 4.8, 5.9, 4.2];
  return { labels: cats, data: base.map((v) => +(v * multiplier).toFixed(1)) };
}

// Top suppliers
const SUPPLIERS_DATA = [
  { name: "Al-Faisal Industries", count: 142 },
  { name: "Gulf Tech Solutions", count: 124 },
  { name: "Riyadh Supplies ...", count: 108 },
  { name: "Najd Trading LLC", count: 87 },
  { name: "Eastern Logistics", count: 72 },
  { name: "Mecca Builders", count: 61 },
];

// Status distribution — values scale with range
function genStatusDist(multiplier = 1) {
  return {
    open: Math.round(412 * multiplier),
    inprogress: Math.round(284 * multiplier),
    completed: Math.round(498 * multiplier),
    archived: Math.round(90 * multiplier),
  };
}

// User growth — monthly for 10 months
function genUserGrowth() {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
  ];
  const requesters = [120, 165, 210, 270, 330, 395, 455, 520, 580, 650];
  const suppliers = [80, 110, 145, 185, 225, 265, 305, 345, 390, 440];
  return { labels: months, requesters, suppliers };
}

/* ── 6. Chart instances (kept for update/destroy) ─────────── */
const CHARTS = {};

/* ── 7. Chart: Requests Per Day (line) ───────────────────── */
function buildRequestsChart(days = 30) {
  const ctx = document.getElementById("chart-requests");
  if (!ctx || typeof Chart === "undefined") return;

  if (CHARTS.requests) CHARTS.requests.destroy();

  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, "rgba(34,197,94,0.25)");
  gradient.addColorStop(1, "rgba(34,197,94,0.0)");

  const { labels, data } = genRequestsPerDay(days);
  const total = data.reduce((a, b) => a + b, 0);

  // Update KPI
  const kpiEl = document.getElementById("kpi-requests");
  if (kpiEl) kpiEl.textContent = total.toLocaleString();

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

/* ── 8. Chart: Offers Per Request Ratio (bar) ────────────── */
function buildOffersChart(multiplier = 1) {
  const ctx = document.getElementById("chart-offers");
  if (!ctx || typeof Chart === "undefined") return;

  if (CHARTS.offers) CHARTS.offers.destroy();

  const { labels, data } = genOffersPerCategory(multiplier);
  const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
  const avgEl = document.getElementById("kpi-offers-avg");
  if (avgEl) avgEl.textContent = avg;

  CHARTS.offers = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
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
          callbacks: { label: (ctx) => ` ${ctx.parsed.y} avg offers` },
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
          ticks: { color: "#9ca3af", font: { size: 10 }, stepSize: 2 },
          border: { display: false },
          beginAtZero: true,
          max: 10,
        },
      },
    },
  });
}

/* ── 9. Supplier bars (no Chart.js – pure HTML) ──────────── */
function renderSupplierBars(multiplier = 1) {
  const list = document.getElementById("supplier-bar-list");
  if (!list) return;

  const scaled = SUPPLIERS_DATA.map((s) => ({
    ...s,
    count: Math.round(s.count * multiplier),
  }));
  const max = scaled[0].count;

  list.innerHTML = scaled
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

/* ── 10. Chart: Status Distribution donut ────────────────── */
function buildStatusChart(multiplier = 1) {
  const ctx = document.getElementById("chart-status");
  if (!ctx || typeof Chart === "undefined") return;

  if (CHARTS.status) CHARTS.status.destroy();

  const dist = genStatusDist(multiplier);
  const total = dist.open + dist.inprogress + dist.completed + dist.archived;
  const pct = (v) => Math.round((v / total) * 100);

  // Update legend
  const setLegend = (id, count, p) => {
    const el = document.getElementById(id);
    if (el)
      el.innerHTML = `<span class="status-legend-count">${count.toLocaleString()}</span>
       <span class="status-legend-pct">${p}%</span>`;
  };
  setLegend("legend-open", dist.open, pct(dist.open));
  setLegend("legend-inprogress", dist.inprogress, pct(dist.inprogress));
  setLegend("legend-completed", dist.completed, pct(dist.completed));
  setLegend("legend-archived", dist.archived, pct(dist.archived));

  const totalEl = document.getElementById("legend-total");
  if (totalEl) totalEl.textContent = total.toLocaleString();

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
              ` ${ctx.parsed.toLocaleString()} (${pct(ctx.parsed)}%)`,
          },
        },
      },
    },
  });
}

/* ── 11. Chart: User Growth (dual line) ──────────────────── */
function buildUserGrowthChart() {
  const ctx = document.getElementById("chart-user-growth");
  if (!ctx || typeof Chart === "undefined") return;

  if (CHARTS.userGrowth) CHARTS.userGrowth.destroy();

  const { labels, requesters, suppliers } = genUserGrowth();

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
          ticks: { color: "#9ca3af", font: { size: 10 }, stepSize: 150 },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ── 12. Date range wiring ───────────────────────────────── */
const RANGE_MAP = { 7: 7, 30: 30, 90: 90 };
const MULTIPLIERS = { 7: 0.25, 30: 1, 90: 3.2 };

function applyDateRange(range) {
  const days = RANGE_MAP[range] || 30;
  const multiplier = MULTIPLIERS[range] || 1;
  buildRequestsChart(days);
  buildOffersChart(multiplier);
  renderSupplierBars(multiplier);
  buildStatusChart(multiplier);
  // User growth is monthly so stays fixed
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
  /* Date range pills */
  let activeRange = "30";
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
  document
    .getElementById("dropdown-profile")
    ?.addEventListener("click", () =>
      showToast("Profile page coming soon!", "warning"),
    );
  document
    .getElementById("dropdown-settings")
    ?.addEventListener("click", () => {
      window.location.href = "settings.html";
    });

  /* Build all charts on first load */
  applyDateRange("30");
  buildUserGrowthChart();
});
