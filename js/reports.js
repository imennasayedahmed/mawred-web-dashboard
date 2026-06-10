/* ============================================================
   MAWRED – RFQ Platform | Reports & Flagged Content Logic
   Features: tab filtering, search, type/status/date filters,
             paginated report cards, Remove confirm modal,
             Warn User toast, View Details stub, CSV export
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
  const filename = window.location.pathname.split("/").pop() || "reports.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle(
      "active",
      href === filename || href.endsWith("/" + filename),
    );
  });
})();

/* ── 4. Mock dataset ─────────────────────────────────────── */


/* ── 5. State ─────────────────────────────────────────────── */
const state = {
  tab: "all", // all | flagged-requests | flagged-offers
  search: "",
  type: "all",
  status: "all",
  dateRange: "30",
  page: 1,
  perPage: 3,
};

// Live report list (supports removal)
let reports = [];

/* ── 6. Derived tab counts ───────────────────────────────── */
function tabCounts() {
  return {
    all: reports.length,
    "flagged-requests": reports.filter((r) => r.type === "request").length,
    "flagged-offers": reports.filter((r) => r.type === "offer").length,
  };
}

/* ── 7. Utility helpers ───────────────────────────────────── */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d) {
  if (!(d instanceof Date)) return "—";
  return d.toLocaleDateString("en-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Cairo"
  });
}

function typeLabel(type) {
  return { request: "Request", offer: "Offer", user: "User" }[type] || type;
}

function typeSvg(type) {
  const icons = {
    request: `<path d="M3 17V8l5-5h9v14H3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 3v5H3" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`,
    offer: `<path d="M3 10l7-7 7 7v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`,
    user: `<circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.4"/><path d="M3 18c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  };
  return `<svg viewBox="0 0 20 20" fill="none">${icons[type] || ""}</svg>`;
}

/* ── 8. Filter pipeline ──────────────────────────────────── */
function applyFilters() {
  let rows = [...reports];

  // Tab
  if (state.tab === "flagged-requests")
    rows = rows.filter((r) => r.type === "request");
  else if (state.tab === "flagged-offers")
    rows = rows.filter((r) => r.type === "offer");

  // Search
  if (state.search) {
    const q = state.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.reporter.handle.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q),
    );
  }

  // Type
  if (state.type !== "all") rows = rows.filter((r) => r.type === state.type);

  // Status
  if (state.status !== "all")
    rows = rows.filter((r) => r.status === state.status);

  // Date range (days ago filter)
  if (state.dateRange !== "all") {
    const cutoff = parseInt(state.dateRange, 10);
    rows = rows.filter((r) => r.daysAgo <= cutoff);
  }

  return rows;
}

/* ── 9. Render tab counts ────────────────────────────────── */
function renderTabCounts() {
  const counts = tabCounts();
  const el = (id) => document.getElementById(id);
  if (el("tab-count-all")) el("tab-count-all").textContent = counts.all;
  if (el("tab-count-requests"))
    el("tab-count-requests").textContent = counts["flagged-requests"];
  if (el("tab-count-offers"))
    el("tab-count-offers").textContent = counts["flagged-offers"];
}

/* ── 10. Render report cards ─────────────────────────────── */
function renderCards(rows) {
  const container = document.getElementById("reports-list");
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = `
      <div class="reports-empty">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 17V8l5-5h9v14H3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M7 3v5H3M7 12h6M7 15h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p>No reports found</p>
        <span>Try adjusting your filters or search query</span>
      </div>`;
    return;
  }

  const { page, perPage } = state;
  const slice = rows.slice((page - 1) * perPage, page * perPage);

  container.innerHTML = slice
    .map((r) => {
      const isPending = r.status === "pending";
      const isResolved = r.status === "resolved";
      const isDismissed = r.status === "dismissed";

      const actionsHtml = isPending
        ? `
      <button class="btn-remove" data-id="${r.id}" aria-label="Remove report ${r.id}">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M4 5h12M8 5V3h4v2M6 5l1 11h6l1-11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Remove
      </button>
      <button class="btn-warn" data-id="${r.id}" aria-label="Warn user for report ${r.id}">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 3v8M10 14v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        Warn User
      </button>`
        : isResolved
          ? `
      <div class="resolved-action-label">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M3 6h14a1 1 0 011 1v1H2V7a1 1 0 011-1zM2 8h16v8a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke="currentColor" stroke-width="1.3"/>
        </svg>
        Action: ${escapeHtml(r.resolvedAction || "Resolved")}
      </div>`
          : isDismissed
            ? `
      <div class="resolved-action-label">
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        ${escapeHtml(r.resolvedAction || "Dismissed")}
      </div>`
            : "";

      const footerExtra = isResolved
        ? `
      <span class="report-meta-item">
        <svg viewBox="0 0 20 20" fill="none"><path d="M10 3v8M10 14v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.4"/></svg>
        Resolved ${formatDate(r.resolvedDate)} · by <a href="#">${escapeHtml(r.resolvedBy)}</a>
      </span>`
        : "";

      return `
      <div class="report-card" data-id="${r.id}">
        <div class="report-card-top">
          <div class="report-card-meta">
            <span class="type-tag ${r.type}">${typeSvg(r.type)} ${typeLabel(r.type)}</span>
            <span class="status-tag ${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
            <span class="report-id">#${r.id}</span>
          </div>
          <div class="report-card-actions">
            ${actionsHtml}
            <button class="btn-view-details" data-id="${r.id}">
              View details
              <svg viewBox="0 0 16 16" fill="none" style="width:13px;height:13px">
                <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="report-card-title">${escapeHtml(r.title)}</div>
        <div class="report-card-reason"><strong>Reason:</strong> ${escapeHtml(r.reason)}</div>

        <div class="report-card-footer">
          <span class="report-meta-item">
            <div class="reporter-avatar ${r.reporter.color}">${escapeHtml(r.reporter.initials)}</div>
            Reported by <a href="#">${escapeHtml(r.reporter.handle)}</a>
          </span>
          <span class="report-meta-item">
            <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M10 7v4l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            Submitted ${formatDate(r.submitted)} · ${r.daysAgo}d ago
          </span>
          <span class="report-meta-item">
            <svg viewBox="0 0 20 20" fill="none"><path d="M10 9a3 3 0 110-6 3 3 0 010 6zM3 18a7 7 0 1114 0H3z" stroke="currentColor" stroke-width="1.4"/></svg>
            ${r.reportCount} report${r.reportCount !== 1 ? "s" : ""} total
          </span>
          ${footerExtra}
        </div>
      </div>`;
    })
    .join("");
}

/* ── 11. Render pagination ───────────────────────────────── */
function renderPagination(total) {
  const { page, perPage } = state;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = Math.min((page - 1) * perPage + 1, total);
  const end = Math.min(page * perPage, total);

  const infoEl = document.getElementById("rp-info");
  if (infoEl)
    infoEl.textContent = `Showing ${start}–${end} of ${total} reports`;

  const btnPrev = document.getElementById("rp-btn-prev");
  const btnNext = document.getElementById("rp-btn-next");
  if (btnPrev) btnPrev.disabled = page <= 1;
  if (btnNext) btnNext.disabled = page >= totalPages;

  const numbersEl = document.getElementById("rp-numbers");
  if (!numbersEl) return;
  numbersEl.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
    .map(
      (p) =>
        `<button class="rp-num ${p === page ? "active" : ""}" data-page="${p}">${p}</button>`,
    )
    .join("");

  numbersEl.querySelectorAll(".rp-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = parseInt(btn.dataset.page);
      refresh();
    });
  });
}

/* ── 12. Master refresh ──────────────────────────────────── */
function refresh() {
  const filtered = applyFilters();
  renderTabCounts();
  renderCards(filtered);
  renderPagination(filtered.length);
}

/* ── 13. Toast ───────────────────────────────────────────── */
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

/* ── 14. Confirm Removal Modal ───────────────────────────── */
let pendingRemoveId = null;

function openModal(reportId) {
  const report = reports.find((r) => r.id === reportId);
  if (!report) return;
  pendingRemoveId = reportId;

  // Populate preview
  const previewType = document.getElementById("modal-preview-type");
  const previewName = document.getElementById("modal-preview-name");
  const previewSub = document.getElementById("modal-preview-sub");

  if (previewType) {
    previewType.className = `type-tag ${report.type}`;
    previewType.innerHTML = `${typeSvg(report.type)} ${typeLabel(report.type)}`;
  }
  if (previewName) previewName.textContent = report.title;
  if (previewSub)
    previewSub.textContent = `Reported by ${report.reporter.handle} · ${report.reportCount} report${report.reportCount !== 1 ? "s" : ""} · #${report.id}`;

  document.getElementById("modal-overlay").classList.add("open");
  document.getElementById("btn-modal-confirm").focus();
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  pendingRemoveId = null;
}

function confirmRemove() {
  if (!pendingRemoveId) return;
  const id = pendingRemoveId;
  const idx = reports.findIndex((r) => r.id === id);
  if (idx !== -1) reports.splice(idx, 1);
  closeModal();
  // Reset to page 1 if current page is now empty
  const filtered = applyFilters();
  const totalPages = Math.ceil(filtered.length / state.perPage);
  if (state.page > totalPages) state.page = Math.max(1, totalPages);
  refresh();
  showToast(`Report ${id} removed successfully.`, "success");
}

/* ── 15. Event wiring ────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  /* Populate navbar + dropdown with session user */
  const _u = getUser();
  if (_u) {
    const _ini = getInitials(_u.name || "Admin");
    const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    _set("navbar-user-name",   _u.name || "Admin");
    _set("navbar-user-role",   _u.role || "Administrator");
    _set("navbar-user-avatar", _ini);
    _set("dropdown-name",      _u.name || "Admin");
    _set("dropdown-role",      _u.role || "Administrator");
    _set("dropdown-avatar",    _ini);
  }

  /* Tabs */

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.tab = btn.dataset.tab;
      state.page = 1;
      refresh();
    });
  });

  /* Search */
  document.getElementById("report-search")?.addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    state.page = 1;
    refresh();
  });

  /* Type filter */
  document.getElementById("type-filter")?.addEventListener("change", (e) => {
    state.type = e.target.value;
    state.page = 1;
    refresh();
  });

  /* Status filter */
  document.getElementById("status-filter")?.addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    refresh();
  });

  /* Date range filter */
  document.getElementById("date-filter")?.addEventListener("change", (e) => {
    state.dateRange = e.target.value;
    state.page = 1;
    refresh();
  });

  /* Clear filters */
  document
    .getElementById("btn-clear-filters")
    ?.addEventListener("click", () => {
      state.search = "";
      state.type = "all";
      state.status = "all";
      state.dateRange = "30";
      state.page = 1;
      document.getElementById("report-search").value = "";
      document.getElementById("type-filter").value = "all";
      document.getElementById("status-filter").value = "all";
      document.getElementById("date-filter").value = "30";
      refresh();
      showToast("Filters cleared", "success");
    });

  /* Prev / Next pagination */
  document.getElementById("rp-btn-prev")?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      refresh();
    }
  });
  document.getElementById("rp-btn-next")?.addEventListener("click", () => {
    const total = applyFilters().length;
    if (state.page < Math.ceil(total / state.perPage)) {
      state.page++;
      refresh();
    }
  });

  /* Table delegation — Remove / Warn / View */
  document.getElementById("reports-list")?.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".btn-remove");
    if (removeBtn) {
      openModal(removeBtn.dataset.id);
      return;
    }

    const warnBtn = e.target.closest(".btn-warn");
    if (warnBtn) {
      const r = reports.find((x) => x.id === warnBtn.dataset.id);
      const name = r ? r.reporter.handle : warnBtn.dataset.id;
      showToast(`Warning sent to ${name}`, "warning");
      return;
    }

    const viewBtn = e.target.closest(".btn-view-details");
    if (viewBtn) {
      showToast(
        `Detail view for ${viewBtn.dataset.id} coming soon!`,
        "warning",
      );
    }
  });

  /* Modal: cancel + confirm + overlay click */
  document
    .getElementById("btn-modal-cancel")
    ?.addEventListener("click", closeModal);
  document
    .getElementById("btn-modal-confirm")
    ?.addEventListener("click", confirmRemove);
  document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  /* Modal: Escape key */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* Export */
  document
    .getElementById("btn-export-reports")
    ?.addEventListener("click", exportCSV);

  /* Moderation Rules (stub) */
  document.getElementById("btn-mod-rules")?.addEventListener("click", () => {
    showToast("Moderation rules editor coming soon!", "warning");
  });

  /* User menu */
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

  /* Logout */
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document
    .getElementById("dropdown-signout")
    ?.addEventListener("click", logout);
  document.getElementById("dropdown-profile")?.addEventListener("click", () => {
    window.location.href = "profile.html";
  });


  /* Initial render — Firebase only */
  if (typeof getReports === "function") {
    const container = document.getElementById("reports-list");
    if (container) {
      container.innerHTML = `<div class="reports-empty"><p>Loading reports…</p></div>`;
    }
    getReports().then((res) => {
      reports = res;
      refresh();
    }).catch((err) => {
      console.error("Failed to load reports from Firestore:", err);
      reports = [];
      refresh();
    });
  } else {
    reports = [];
    refresh();
  }
});

/* ── 16. CSV Export ──────────────────────────────────────── */
function exportCSV() {
  const rows = applyFilters();
  const header = [
    "Report ID",
    "Type",
    "Status",
    "Title",
    "Reason",
    "Reporter",
    "Submitted",
    "Report Count",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.type,
        r.status,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.reason.replace(/"/g, '""')}"`,
        r.reporter.handle,
        formatDate(r.submitted),
        r.reportCount,
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mawred-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Reports exported as CSV", "success");
}

function formatDate(d) {
  if (!(d instanceof Date)) return "—";
  return d.toLocaleDateString("en-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Cairo"
  });
}
