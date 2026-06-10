/* ============================================================
   MAWRED – RFQ Platform | Offers Page Logic
   Features: stat cards, anomaly banner, live search,
             status/request filter, sortable table,
             pagination, flag toggle, view nav, CSV export
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
  const dropNameEl = document.getElementById("dropdown-name");
  const dropRoleEl = document.getElementById("dropdown-role");
  const dropAvatarEl = document.getElementById("dropdown-avatar");
  if (nameEl) nameEl.textContent = user.name || "Admin";
  if (roleEl) roleEl.textContent = user.role || "Administrator";
  if (avatarEl) avatarEl.textContent = getInitials(user.name || "Admin");
  if (dropNameEl) dropNameEl.textContent = user.name || "Admin";
  if (dropRoleEl) dropRoleEl.textContent = user.role || "Administrator";
  if (dropAvatarEl)
    dropAvatarEl.textContent = getInitials(user.name || "Admin");
})();

/* ── 3. Active nav highlight ─────────────────────────────── */
(function highlightNav() {
  const filename = window.location.pathname.split("/").pop() || "offers.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle(
      "active",
      href === filename || href.endsWith("/" + filename),
    );
  });
})();

/* ── 4. Mock dataset ─────────────────────────────────────── */

let ALL_OFFERS = [];


/* ── 5. Derived stats ────────────────────────────────────── */
const STATS = { total: 0, pending: 0, flagged: 0, accepted: 0, todayPending: 0 };

/* ── 6. State ─────────────────────────────────────────────── */
const state = {
  search: "",
  status: "all",
  reqFilter: "all",
  sortKey: "submitted",
  sortDir: "desc",
  page: 1,
  perPage: 10,
};

/* ── 7. Utility helpers ───────────────────────────────────── */
function formatEGP(n) {
  if (n === undefined || n === null) return "—";
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

/* ── 8. Toast ────────────────────────────────────────────── */
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

/* ── 9. Filter + sort pipeline ───────────────────────────── */
function applyFilters() {
  let rows = [...ALL_OFFERS];

  if (state.search) {
    const q = state.search.toLowerCase();
    rows = rows.filter(
      (o) =>
        o.supplier.name.toLowerCase().includes(q) ||
        o.reqId.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q),
    );
  }

  if (state.status !== "all") {
    rows = rows.filter((o) => o.status === state.status);
  }

  if (state.reqFilter !== "all") {
    rows = rows.filter((o) => o.reqId === state.reqFilter);
  }

  rows.sort((a, b) => {
    let va = a[state.sortKey];
    let vb = b[state.sortKey];
    if (state.sortKey === "supplier") {
      va = va.name;
      vb = vb.name;
    }
    if (
      state.sortKey === "submitted" ||
      state.sortKey === "price" ||
      state.sortKey === "delivery"
    ) {
      return state.sortDir === "asc" ? va - vb : vb - va;
    }
    return state.sortDir === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  return rows;
}

/* ── 10. Render stat cards ───────────────────────────────── */
function renderStats() {
  const el = (id) => document.getElementById(id);
  if (el("stat-total-offers"))
    el("stat-total-offers").textContent = STATS.total.toLocaleString("en-EG");
  if (el("stat-pending-review"))
    el("stat-pending-review").textContent = STATS.pending.toLocaleString("en-EG");
  if (el("stat-today-pending"))
    el("stat-today-pending").textContent = `${STATS.todayPending} today`;
  if (el("stat-flagged-offers"))
    el("stat-flagged-offers").textContent = STATS.flagged.toLocaleString("en-EG");
  if (el("stat-accepted-offers"))
    el("stat-accepted-offers").textContent = STATS.accepted.toLocaleString("en-EG");
}

function updateStatsAndRender() {
  const total    = ALL_OFFERS.length;
  const pending  = ALL_OFFERS.filter((o) => o.status === "pending").length;
  const flagged  = ALL_OFFERS.filter((o) => o.flagged).length;
  const accepted = ALL_OFFERS.filter((o) => o.status === "accepted").length;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayPending = ALL_OFFERS.filter((o) => o.status === "pending" && new Date(o.submitted) >= todayStart).length;
  if (typeof STATS !== "undefined") {
    STATS.total = total; STATS.pending = pending; STATS.flagged = flagged;
    STATS.accepted = accepted; STATS.todayPending = todayPending;
  }
  renderStats();
}

/* ── 11. Render table ────────────────────────────────────── */
function renderTable(rows) {
  const tbody = document.getElementById("offers-tbody");
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="table-empty">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 10l7-7 7 7v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M9 21V12h6v9" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <p>No offers found</p>
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
      (o) => `
    <tr data-id="${o.id}">
      <td>
        <div class="supplier-cell">
          <div class="sup-avatar ${o.supplier.color}">${o.supplier.initials}</div>
          <span class="sup-name">${escapeHtml(o.supplier.name)}</span>
        </div>
      </td>
      <td>
        <a class="req-link" href="request-detail.html?id=${encodeURIComponent(o.reqId)}" title="View ${o.reqId}">
          ${o.reqId}
        </a>
      </td>
      <td class="price-cell">${formatEGP(o.price)}</td>
      <td class="delivery-cell">${o.delivery} day${o.delivery !== 1 ? "s" : ""}</td>
      <td class="submitted-cell">${formatDate(o.submitted)}</td>
      <td><span class="offer-badge ${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-act view-btn" data-id="${o.id}" aria-label="View offer ${o.id}" title="View">
            <svg viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M2 10c2-5 5-7 8-7s6 2 8 7c-2 5-5 7-8 7s-6-2-8-7z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
          <button class="btn-act flag flag-btn ${o.flagged ? "active" : ""}" data-id="${o.id}" aria-label="Flag offer ${o.id}" title="Flag">
            <svg viewBox="0 0 20 20" fill="none">
              <path d="M4 3v14M4 3h9l-2 4 2 4H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${o.flagged ? 'fill="currentColor"' : ""}/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

/* ── 12. Render pagination ───────────────────────────────── */
function renderPagination(total) {
  const { page, perPage } = state;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = Math.min((page - 1) * perPage + 1, total);
  const end = Math.min(page * perPage, total);

  const infoEl = document.getElementById("page-info");
  if (infoEl)
    infoEl.innerHTML = `Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> offers`;

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  if (btnPrev) btnPrev.disabled = page <= 1;
  if (btnNext) btnNext.disabled = page >= totalPages;

  const numbersEl = document.getElementById("page-numbers");
  if (!numbersEl) return;

  numbersEl.innerHTML = buildPageRange(page, totalPages)
    .map((p) =>
      p === "…"
        ? `<span class="page-ellipsis">…</span>`
        : `<button class="page-num ${p === page ? "active" : ""}" data-page="${p}">${p}</button>`,
    )
    .join("");

  numbersEl.querySelectorAll(".page-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = parseInt(btn.dataset.page, 10);
      refresh();
    });
  });
}

/* ── 13. Render sort indicators ──────────────────────────── */
function renderSortIndicators() {
  document
    .querySelectorAll(".offers-table thead th[data-sort]")
    .forEach((th) => {
      const key = th.dataset.sort;
      th.childNodes.forEach((n) => {
        if (n.nodeType === 3) n.remove();
      });
      const arrow =
        state.sortKey === key ? (state.sortDir === "asc" ? " ▲" : " ▼") : "";
      th.appendChild(document.createTextNode((th.dataset.label || "") + arrow));
    });
}

/* ── 14. Master refresh ──────────────────────────────────── */
function refresh() {
  const filtered = applyFilters();
  renderTable(filtered);
  renderPagination(filtered.length);
  renderSortIndicators();
}

/* ── 15. Populate request filter dropdown ────────────────── */
function populateReqFilter() {
  const sel = document.getElementById("req-filter");
  if (!sel) return;
  const unique = [...new Set(ALL_OFFERS.map((o) => o.reqId))].sort().reverse();
  unique.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    sel.appendChild(opt);
  });
}

/* ── 16. Wire controls ───────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Stats and Request filter dropdown will be rendered after live Firestore data loads

  /* Populate navbar + dropdown with session user */
  const _user = getUser();
  if (_user) {
    const _ini = getInitials(_user.name || "Admin");
    const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    _set("navbar-user-name",   _user.name || "Admin");
    _set("navbar-user-role",   _user.role || "Administrator");
    _set("navbar-user-avatar", _ini);
    _set("dropdown-name",      _user.name || "Admin");
    _set("dropdown-role",      _user.role || "Administrator");
    _set("dropdown-avatar",    _ini);
  }


  /* Anomaly banner dismiss */
  document
    .getElementById("btn-dismiss-banner")
    ?.addEventListener("click", () => {
      document.getElementById("anomaly-banner")?.classList.add("hidden");
    });

  /* Anomaly banner "Review Now" → filter to flagged */
  document.getElementById("btn-review-now")?.addEventListener("click", () => {
    state.status = "flagged";
    state.page = 1;
    const statusSel = document.getElementById("status-filter");
    if (statusSel) statusSel.value = "flagged";
    refresh();
    document.getElementById("anomaly-banner")?.classList.add("hidden");
    showToast("Showing flagged offers", "warning");
  });

  /* Search */
  document.getElementById("offer-search")?.addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    state.page = 1;
    refresh();
  });

  /* Status filter */
  document.getElementById("status-filter")?.addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    refresh();
  });

  /* Request filter */
  document.getElementById("req-filter")?.addEventListener("change", (e) => {
    state.reqFilter = e.target.value;
    state.page = 1;
    refresh();
  });

  /* Sortable column headers */
  document
    .querySelectorAll(".offers-table thead th[data-sort]")
    .forEach((th) => {
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

  /* Prev / Next */
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

  /* Table delegation: view + flag */
  document.getElementById("offers-tbody")?.addEventListener("click", (e) => {
    /* View → navigate to request detail */
    const viewBtn = e.target.closest(".view-btn");
    if (viewBtn) {
      const id = viewBtn.dataset.id;
      const offer = ALL_OFFERS.find((o) => o.id === id);
      if (offer) {
        window.location.href = `request-detail.html?id=${encodeURIComponent(offer.reqId)}`;
      }
      return;
    }

    /* Flag toggle */
    const flagBtn = e.target.closest(".flag-btn");
    if (flagBtn) {
      const id = flagBtn.dataset.id;
      const offer = ALL_OFFERS.find((o) => o.id === id);
      if (!offer) return;
      const oldFlagged = !offer.flagged;
      offer.flagged = !offer.flagged;
      offer.status = offer.flagged ? "flagged" : "pending";
      
      showToast(
        offer.flagged
          ? `Offer ${id} flagged for review.`
          : `Flag removed from ${id}.`,
        offer.flagged ? "warning" : "success",
      );
      updateStatsAndRender();
      refresh();

      if (typeof updateOfferFlag === "function") {
        updateOfferFlag(id, offer.flagged).then((success) => {
          if (!success) {
            offer.flagged = oldFlagged;
            offer.status = oldFlagged ? "flagged" : "pending";
            showToast("Failed to update flag in database.", "error");
            updateStatsAndRender();
            refresh();
          }
        });
      }
    }
  });

  /* More filters (stub) */
  document.getElementById("btn-more-filters")?.addEventListener("click", () => {
    showToast("Advanced filters coming soon!", "warning");
  });

  /* Export CSV */
  document.getElementById("btn-export")?.addEventListener("click", exportCSV);

  /* Logout */
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document
    .getElementById("dropdown-signout")
    ?.addEventListener("click", logout);
  document.getElementById("dropdown-profile")?.addEventListener("click", () => {
    window.location.href = "profile.html";
  });


  /* User chip — open/close dropdown */
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

  /* Keyboard: Escape closes any open dropdown */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".user-dropdown.open")
        .forEach((el) => el.classList.remove("open"));
    }
  });

  /* Initial render */
  /* Initial render — Firebase only */
  if (typeof getOffers === "function") {
    const tbody = document.getElementById("offers-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">Loading offers…</td></tr>`;
    }
    getOffers().then((res) => {
      ALL_OFFERS = res;
      updateStatsAndRender();
      populateReqFilter();
      refresh();
    }).catch((err) => {
      console.error("Failed to load offers from Firestore:", err);
      ALL_OFFERS = [];
      updateStatsAndRender();
      populateReqFilter();
      refresh();
    });
  } else {
    ALL_OFFERS = [];
    updateStatsAndRender();
    populateReqFilter();
    refresh();
  }
});

/* ── 17. CSV Export ──────────────────────────────────────── */
function exportCSV() {
  const rows = applyFilters();
  const header = [
    "Offer ID",
    "Supplier",
    "Linked Request",
    "Price (EGP)",
    "Delivery (days)",
    "Submitted",
    "Status",
  ];
  const lines = [
    header.join(","),
    ...rows.map((o) =>
      [
        o.id,
        `"${o.supplier.name}"`,
        o.reqId,
        o.price,
        o.delivery,
        formatDate(o.submitted),
        o.status,
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mawred-offers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Offers exported as CSV", "success");
}
