/* ============================================================
   MAWRED – RFQ Platform | Requests Page Logic
   Features: data table, live search, status/date filter,
             sortable columns, pagination, CSV export
   ============================================================ */

"use strict";

/* ── 1. Auth guard ───────────────────────────────────────── */
requireAuth();

/* ── 2. Populate navbar user info ────────────────────────── */
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

/* ── 3. Active nav highlight ─────────────────────────────── */
(function highlightNav() {
  const filename = window.location.pathname.split("/").pop() || "requests.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle(
      "active",
      href === filename || href.endsWith("/" + filename),
    );
  });
})();


let ALL_REQUESTS = [];


/* ── 5. State ─────────────────────────────────────────────── */
const state = {
  search: "",
  status: "all",
  dateFilter: "all",
  sortKey: "created",
  sortDir: "desc", // "asc" | "desc"
  page: 1,
  perPage: 9,
};

/* ── 6. Utility helpers ───────────────────────────────────── */
function formatBudget(n) {
  if (!n || n === 0) return "Not specified";
  return "EGP " + n.toLocaleString("en-EG", { minimumFractionDigits: 0 });
}

function formatDate(d) {
  return d.toLocaleDateString("en-EG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Cairo"
  });
}

function badgeClass(status) {
  switch (status) {
    case "OPEN":
      return "open";
    case "IN_PROGRESS":
      return "in-progress";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "";
  }
}

function badgeLabel(status) {
  switch (status) {
    case "OPEN":
      return "OPEN";
    case "IN_PROGRESS":
      return "IN PROGRESS";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return status;
  }
}

/* ── 7. Filter + Sort pipeline ───────────────────────────── */
function applyFilters() {
  let rows = [...ALL_REQUESTS];

  // Search
  if (state.search) {
    const q = state.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.requester.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }

  // Status filter
  if (state.status !== "all") {
    rows = rows.filter((r) => r.status === state.status);
  }

  // Date filter
  if (state.dateFilter !== "all") {
    const now = new Date();
    const cutoffs = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now - 7 * 86400000),
      month: new Date(now - 30 * 86400000),
      quarter: new Date(now - 90 * 86400000),
    };
    const cutoff = cutoffs[state.dateFilter];
    if (cutoff) rows = rows.filter((r) => r.created >= cutoff);
  }

  // Sort
  rows.sort((a, b) => {
    let va = a[state.sortKey];
    let vb = b[state.sortKey];
    if (state.sortKey === "requester") {
      va = va.name;
      vb = vb.name;
    }
    if (state.sortKey === "budget" || state.sortKey === "created") {
      return state.sortDir === "asc" ? va - vb : vb - va;
    }
    return state.sortDir === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  return rows;
}

/* ── 8. Render table rows ─────────────────────────────────── */
function renderTable(rows) {
  const tbody = document.getElementById("requests-tbody");
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="table-empty">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1"
                stroke="currentColor" stroke-width="1.5"/>
              <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <p>No requests found</p>
            <span>Try adjusting your search or filter criteria</span>
          </div>
        </td>
      </tr>`;
    return;
  }

  const { page, perPage } = state;
  const start = (page - 1) * perPage;
  const slice = rows.slice(start, start + perPage);

  tbody.innerHTML = slice
    .map(
      (r) => `
    <tr>
      <td>
        <div class="req-title" data-id="${r.id}">${escapeHtml(r.title)}</div>
        <div class="req-id">${r.id}</div>
      </td>
      <td>
        <div class="requester-cell">
          <div class="req-avatar ${r.requester.color}">${r.requester.initials}</div>
          <span class="requester-name">${escapeHtml(r.requester.name)}</span>
        </div>
      </td>
      <td>
        <span class="badge ${badgeClass(r.status)}">${badgeLabel(r.status)}</span>
      </td>
      <td class="budget-cell">${formatBudget(r.budget)}</td>
      <td class="date-cell">${formatDate(r.created)}</td>
      <td>
        <button class="btn-view" aria-label="View ${escapeHtml(r.title)}" data-id="${r.id}">
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 10c2-5 5-7 8-7s6 2 8 7c-2 5-5 7-8 7s-6-2-8-7z"
              stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </td>
    </tr>`,
    )
    .join("");
}

/* ── 9. Render pagination ─────────────────────────────────── */
function renderPagination(total) {
  const { page, perPage } = state;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = Math.min((page - 1) * perPage + 1, total);
  const end = Math.min(page * perPage, total);

  // Page info
  const infoEl = document.getElementById("page-info");
  if (infoEl) {
    infoEl.innerHTML = `Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> requests`;
  }

  // Prev / Next buttons
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  if (btnPrev) btnPrev.disabled = page <= 1;
  if (btnNext) btnNext.disabled = page >= totalPages;

  // Page number buttons
  const numbersEl = document.getElementById("page-numbers");
  if (!numbersEl) return;

  const pages = buildPageRange(page, totalPages);
  numbersEl.innerHTML = pages
    .map((p) =>
      p === "…"
        ? `<span class="page-ellipsis">…</span>`
        : `<button class="page-num ${p === page ? "active" : ""}" data-page="${p}">${p}</button>`,
    )
    .join("");

  // Click page numbers
  numbersEl.querySelectorAll(".page-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = parseInt(btn.dataset.page, 10);
      refresh();
    });
  });
}

/** Build a compact page range with ellipsis, e.g. [1, 2, 3, "…", 16] */
function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 4) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 3)
    [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

/* ── 10. Render sort indicators ──────────────────────────── */
function renderSortIndicators() {
  document.querySelectorAll(".data-table thead th[data-sort]").forEach((th) => {
    const key = th.dataset.sort;
    const arrow =
      state.sortKey === key ? (state.sortDir === "asc" ? " ▲" : " ▼") : "";
    // Remove old arrow text nodes
    th.childNodes.forEach((node) => {
      if (node.nodeType === 3) node.remove();
    });
    th.appendChild(document.createTextNode(th.dataset.label + arrow));
  });
}

/* ── 11. Master refresh ───────────────────────────────────── */
function refresh() {
  const filtered = applyFilters();
  renderTable(filtered);
  renderPagination(filtered.length);
  renderSortIndicators();
}

/* ── 12. Escape HTML ──────────────────────────────────────── */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── 13. Wire up controls ─────────────────────────────────── */
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

  /* ── Pre-apply ?status= query param from dashboard deep-links ── */

  const urlParams = new URLSearchParams(window.location.search);
  const paramStatus = urlParams.get("status");

  /* Search */
  const searchEl = document.getElementById("request-search");
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      state.search = searchEl.value.trim();
      state.page = 1;
      refresh();
    });
  }

  /* Status filter */
  const statusEl = document.getElementById("status-filter");
  if (statusEl) {
    // If a valid status was passed via URL, pre-select it
    const validStatuses = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (paramStatus && validStatuses.includes(paramStatus)) {
      state.status = paramStatus;
      statusEl.value = paramStatus;
    }

    statusEl.addEventListener("change", () => {
      state.status = statusEl.value;
      state.page = 1;
      refresh();
    });
  }

  /* Date filter */
  const dateEl = document.getElementById("date-filter");
  if (dateEl) {
    dateEl.addEventListener("change", () => {
      state.dateFilter = dateEl.value;
      state.page = 1;
      refresh();
    });
  }

  /* Sortable column headers */
  document.querySelectorAll(".data-table thead th[data-sort]").forEach((th) => {
    th.classList.add("sortable");
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
      state.page = 1;
      refresh();
    });
  });

  /* Prev / Next buttons */
  document.getElementById("btn-prev")?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      refresh();
    }
  });
  document.getElementById("btn-next")?.addEventListener("click", () => {
    const total = applyFilters().length;
    const totalPages = Math.ceil(total / state.perPage);
    if (state.page < totalPages) {
      state.page++;
      refresh();
    }
  });

  /* Export CSV */
  document
    .querySelector(".btn-export-outline")
    ?.addEventListener("click", exportCSV);

  /* New Request (placeholder) */
  document.getElementById("btn-new-request")?.addEventListener("click", () => {
    alert("New Request modal — coming soon!");
  });

  /* Row view button + title click → open request detail (event delegation) */
  document.getElementById("requests-tbody")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-view");
    const title = e.target.closest(".req-title");
    const id = (btn || title)?.dataset.id;
    if (id) {
      const fromStatus =
        state.status !== "all"
          ? `&fromStatus=${encodeURIComponent(state.status)}`
          : "";
      window.location.href = `request-detail.html?id=${encodeURIComponent(id)}${fromStatus}`;
    }
  });

  /* Logout */
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document
    .getElementById("dropdown-signout")
    ?.addEventListener("click", logout);

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

  document.getElementById("dropdown-profile")?.addEventListener("click", () => {
    window.location.href = "profile.html";
  });


  /* Initial render — Firebase only */
  if (typeof getRequests === "function") {
    const tbody = document.getElementById("requests-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">Loading requests…</td></tr>`;
    }
    getRequests().then((res) => {
      ALL_REQUESTS = res;
      refresh();
    }).catch((err) => {
      console.error("Failed to load requests from Firestore:", err);
      ALL_REQUESTS = [];
      refresh();
    });
  } else {
    ALL_REQUESTS = [];
    refresh();
  }
});

/* ── 14. CSV Export ───────────────────────────────────────── */
function exportCSV() {
  const rows = applyFilters();
  const header = ["ID", "Title", "Requester", "Status", "Budget", "Created"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.requester.name}"`,
        r.status,
        r.budget,
        formatDate(r.created),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mawred-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
