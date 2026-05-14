/* ============================================================
   MAWRED – RFQ Platform | Request Detail Page Logic
   Features: data hydration, status update, archive/flag,
             share, toast notifications, timeline, offers
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
  const filename = window.location.pathname.split("/").pop() || "requests.html";
  document.querySelectorAll(".nav-item").forEach((link) => {
    const href = link.getAttribute("href") || "";
    // request-detail lives under Requests
    const isDetail = filename === "request-detail.html";
    link.classList.toggle(
      "active",
      isDetail
        ? href === "requests.html" || href.endsWith("/requests.html")
        : href === filename || href.endsWith("/" + filename),
    );
  });
})();

/* ── 4. Mock request data ────────────────────────────────── */
const MOCK_REQUESTS = {
  "REQ-2024-0142": {
    id: "REQ-2024-0142",
    title: "Hydraulic Pump Seals – Unit 7",
    category: "Industrial maintenance",
    postedDaysAgo: 4,
    status: "IN_PROGRESS",
    description:
      "Replacement hydraulic pump seals required for Unit 7 production line. Existing seals show signs of wear after 18 months of continuous operation. Need OEM-equivalent or higher-grade seals rated for 350 bar working pressure with Viton FKM material. Delivery to Jeddah industrial facility within 14 days. All suppliers must include compliance certificates and warranty documentation.",
    requester: { name: "Khalid Mansour", initials: "KM", color: "green" },
    contact: "k.mansour@arabco.sa",
    budget: 49500,
    created: new Date("2025-03-12"),
    updated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hrs ago
    parts: [
      {
        name: "Rotary Shaft Seal",
        spec: "FKM 75A · 45×60×8mm",
        qty: 24,
        unit: "pcs",
      },
      { name: "O-Ring Set", spec: "Viton · 350 bar", qty: 12, unit: "sets" },
      { name: "Piston Seal Kit", spec: "PTFE Bronze", qty: 6, unit: "kits" },
      { name: "Wiper Seals", spec: "PU 90A", qty: 18, unit: "pcs" },
    ],
    attachments: [
      {
        name: "Specificatio...",
        fullName: "Specification_Sheet.pdf",
        size: "2.4 MB",
        type: "pdf",
      },
      {
        name: "Unit7-Photo...",
        fullName: "Unit7-Photos.zip",
        size: "13 MB",
        type: "img",
      },
      {
        name: "PartsList.xlsx",
        fullName: "PartsList.xlsx",
        size: "186 KB",
        type: "xls",
      },
    ],
    timeline: [
      { label: "Created", date: "Mar 12, 09:24", done: true },
      { label: "Open", date: "Mar 12, 11:04", done: true },
      {
        label: "In Progress",
        date: "Mar 14, 15:42",
        done: true,
        current: true,
      },
      { label: "Completed", date: "Pending", done: false },
    ],
    offers: [
      {
        supplier: "SealTech Industries",
        days: 8,
        amount: 42300,
        status: "accepted",
      },
      {
        supplier: "Gulf Hydraulics Co.",
        days: 12,
        amount: 38800,
        status: "pending",
      },
      {
        supplier: "Riyadh Seal Supply",
        days: 6,
        amount: 45100,
        status: "pending",
      },
      {
        supplier: "PetroParts MEA",
        days: 15,
        amount: 51300,
        status: "rejected",
      },
    ],
  },
};

// Generate additional mock records to support deep-links from the requests table
(function buildExtraRecords() {
  const TITLES = [
    "Diesel Filter Set – Fleet B",
    "Industrial Bearing Kit – Plant 3",
    "Brake Pad Replacement – Truck 14",
    "Turbocharger Assembly – Generator 2",
    "Conveyor Belt Rollers – Warehouse A",
    "Air Compressor Valves – Site C",
    "Gearbox Oil & Gaskets – Crane 5",
    "Cooling Fan Motor – HVAC Block D",
    "Electrical Panel Wiring – Tower 2",
    "Forklift Battery Pack – Depot 1",
  ];
  const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const REQUESTERS = [
    { name: "Sarah Abdelrahman", initials: "SA", color: "rose" },
    { name: "Omar Tarek", initials: "OT", color: "blue" },
    { name: "Layla Farouk", initials: "LF", color: "purple" },
    { name: "Youssef Nabil", initials: "YN", color: "amber" },
    { name: "Mohamed Kamal", initials: "MK", color: "teal" },
  ];
  const baseDate = new Date("2024-10-28");
  for (let i = 1; i <= 141; i++) {
    const id = `REQ-2024-${String(142 - i).padStart(4, "0")}`;
    if (MOCK_REQUESTS[id]) continue;
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const requester = REQUESTERS[i % REQUESTERS.length];
    const status = STATUSES[i % STATUSES.length];
    const budget = (15 + (i % 50)) * 500;
    MOCK_REQUESTS[id] = {
      id,
      title: TITLES[i % TITLES.length],
      category: "General procurement",
      postedDaysAgo: i,
      status,
      description: `Procurement request ${id}. Please review specifications and submit competitive offer within the required timeframe.`,
      requester,
      contact: `${requester.initials.toLowerCase()}@mawred.sa`,
      budget,
      created: d,
      updated: d,
      parts: [{ name: "Item A", spec: "Standard", qty: 10, unit: "pcs" }],
      attachments: [],
      timeline: [
        {
          label: "Created",
          date: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          done: true,
        },
        {
          label: "Open",
          date: status !== "OPEN" ? "Submitted" : "Pending",
          done: status !== "OPEN",
        },
        {
          label: "In Progress",
          date:
            status === "IN_PROGRESS" || status === "COMPLETED"
              ? "Active"
              : "Pending",
          done: status === "IN_PROGRESS" || status === "COMPLETED",
          current: status === "IN_PROGRESS",
        },
        {
          label: "Completed",
          date: status === "COMPLETED" ? "Done" : "Pending",
          done: status === "COMPLETED",
        },
      ],
      offers: [],
    };
  }
})();

/* ── 5. Resolve which request to show ────────────────────── */
function getRequestId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "REQ-2024-0142";
}

/* ── 6. Utility helpers ───────────────────────────────────── */
function formatSAR(n) {
  return "SAR " + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(d) {
  if (!(d instanceof Date) || isNaN(d)) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function badgeClass(status) {
  return (
    {
      OPEN: "open",
      IN_PROGRESS: "in-progress",
      COMPLETED: "completed",
      CANCELLED: "cancelled",
    }[status] || ""
  );
}

function badgeLabel(status) {
  return (
    {
      OPEN: "OPEN",
      IN_PROGRESS: "IN PROGRESS",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
    }[status] || status
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attachIconClass(type) {
  return { pdf: "pdf", img: "img", xls: "xls", doc: "doc" }[type] || "other";
}

function attachIconSvg(type) {
  const icons = {
    pdf: `<svg viewBox="0 0 20 20" fill="none"><rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M7 6h6M7 9h6M7 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    img: `<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="8" r="1.5" fill="currentColor"/><path d="M2 14l4-4 3 3 2-2 5 3" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    xls: `<svg viewBox="0 0 20 20" fill="none"><rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    doc: `<svg viewBox="0 0 20 20" fill="none"><rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  };
  return (
    icons[type] ||
    `<svg viewBox="0 0 20 20" fill="none"><rect x="4" y="2" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/></svg>`
  );
}

/* ── 7. Toast notification ───────────────────────────────── */
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

  const iconEl = document.getElementById("toast-icon");
  const msgEl = document.getElementById("toast-msg");

  const icons = {
    success: `<path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    warning: `<path d="M10 6v4M10 14h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    error: `<path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  };

  toast.className = `toast ${type}`;
  iconEl.innerHTML = icons[type] || icons.success;
  msgEl.textContent = message;

  // Force reflow
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ── 8. Render functions ─────────────────────────────────── */

function renderBreadcrumb(req) {
  const el = document.getElementById("breadcrumb-id");
  if (el) el.textContent = req.id;
}

function renderHeader(req) {
  const idBadge = document.getElementById("detail-req-id");
  const statusBadge = document.getElementById("detail-status-badge");
  const titleEl = document.getElementById("detail-title");
  const metaEl = document.getElementById("detail-meta");
  const descEl = document.getElementById("detail-description");

  if (idBadge) idBadge.textContent = req.id;
  if (statusBadge) {
    statusBadge.className = `badge ${badgeClass(req.status)}`;
    statusBadge.textContent = badgeLabel(req.status);
  }
  if (titleEl) titleEl.textContent = req.title;
  if (metaEl)
    metaEl.innerHTML = `${escapeHtml(req.category)} &nbsp;·&nbsp; Posted ${req.postedDaysAgo} day${req.postedDaysAgo !== 1 ? "s" : ""} ago`;
  if (descEl) descEl.textContent = req.description;

  // Page title
  document.title = `MAWRED | ${req.title}`;
}

function renderParts(req) {
  const tbody = document.getElementById("parts-tbody");
  if (!tbody) return;
  if (!req.parts || req.parts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No parts listed.</td></tr>`;
    return;
  }
  tbody.innerHTML = req.parts
    .map(
      (p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td class="spec-cell">${escapeHtml(p.spec)}</td>
      <td class="qty-cell">${p.qty}</td>
      <td class="unit-cell">${escapeHtml(p.unit)}</td>
    </tr>
  `,
    )
    .join("");
}

function renderAttachments(req) {
  const grid = document.getElementById("attachments-grid");
  const countEl = document.getElementById("attach-count");
  if (!grid) return;

  const attachments = req.attachments || [];
  if (countEl) countEl.textContent = `(${attachments.length})`;

  if (attachments.length === 0) {
    grid.innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);">No attachments.</p>`;
    return;
  }

  grid.innerHTML = attachments
    .map(
      (a) => `
    <div class="attach-item" title="${escapeHtml(a.fullName || a.name)}" role="button" tabindex="0" data-file="${escapeHtml(a.fullName || a.name)}">
      <div class="attach-icon ${attachIconClass(a.type)}">${attachIconSvg(a.type)}</div>
      <div class="attach-info">
        <div class="attach-name">${escapeHtml(a.name)}</div>
        <div class="attach-size">${escapeHtml(a.size)}</div>
      </div>
    </div>
  `,
    )
    .join("");

  // Click to "download" (stub)
  grid.querySelectorAll(".attach-item").forEach((item) => {
    const handler = () =>
      showToast(`Downloading ${item.dataset.file}…`, "success");
    item.addEventListener("click", handler);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") handler();
    });
  });
}

function renderTimeline(req) {
  const track = document.getElementById("timeline-track");
  if (!track) return;

  track.innerHTML = (req.timeline || [])
    .map((step, i) => {
      const classes = ["timeline-step"];
      if (step.done) classes.push("done");
      if (step.current) classes.push("current");
      return `
      <div class="${classes.join(" ")}">
        <div class="timeline-dot">
          ${step.done ? `<svg viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ""}
        </div>
        <div class="timeline-label">${escapeHtml(step.label)}</div>
        <div class="timeline-date">${escapeHtml(step.date)}</div>
      </div>
    `;
    })
    .join("");
}

function renderInfoPanel(req) {
  const list = document.getElementById("info-list");
  if (!list) return;

  const statusCls = badgeClass(req.status);

  list.innerHTML = `
    <li class="info-row">
      <span class="info-label">Requester</span>
      <span class="info-value">
        <span class="info-requester">
          <span class="info-avatar ${req.requester.color}">${escapeHtml(req.requester.initials)}</span>
          ${escapeHtml(req.requester.name)}
        </span>
      </span>
    </li>
    <li class="info-row">
      <span class="info-label">Contact</span>
      <span class="info-value email">${escapeHtml(req.contact)}</span>
    </li>
    <li class="info-row">
      <span class="info-label">Budget</span>
      <span class="info-value budget">${formatSAR(req.budget)}</span>
    </li>
    <li class="info-row">
      <span class="info-label">Created</span>
      <span class="info-value">${formatDate(req.created)}</span>
    </li>
    <li class="info-row">
      <span class="info-label">Last Updated</span>
      <span class="info-value">${timeAgo(req.updated)}</span>
    </li>
    <li class="info-row">
      <span class="info-label">Current Status</span>
      <span class="info-value">
        <span class="status-inline ${statusCls}">
          <span class="dot"></span>
          ${badgeLabel(req.status)}
        </span>
      </span>
    </li>
  `;
}

function renderOffers(req) {
  const list = document.getElementById("offers-list");
  const countEl = document.getElementById("offers-count");
  if (!list) return;

  const offers = req.offers || [];
  if (countEl) countEl.textContent = offers.length;

  if (offers.length === 0) {
    list.innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);">No offers yet.</p>`;
    return;
  }

  list.innerHTML = offers
    .map(
      (o) => `
    <div class="offer-item">
      <div class="offer-info">
        <div class="offer-supplier">${escapeHtml(o.supplier)}</div>
        <div class="offer-meta">
          ${o.days} day${o.days !== 1 ? "s" : ""} · ${formatSAR(o.amount)}
        </div>
      </div>
      <span class="offer-badge ${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
    </div>
  `,
    )
    .join("");
}

/* ── 9. Status update logic ──────────────────────────────── */
function wireStatusDropdown(req) {
  const btn = document.getElementById("btn-update-status");
  const dropdown = document.getElementById("status-dropdown");
  if (!btn || !dropdown) return;

  // Toggle dropdown
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Close on outside click
  document.addEventListener("click", () => dropdown.classList.remove("open"));

  // Option selection
  dropdown.querySelectorAll(".status-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      const newStatus = opt.dataset.status;
      if (newStatus === req.status) {
        dropdown.classList.remove("open");
        return;
      }
      req.status = newStatus;
      dropdown.classList.remove("open");
      // Re-render affected elements
      renderHeader(req);
      renderInfoPanel(req);
      // Update timeline current marker if relevant
      syncTimelineToStatus(req);
      renderTimeline(req);
      showToast(`Status updated to ${badgeLabel(newStatus)}`, "success");
    });
  });
}

function syncTimelineToStatus(req) {
  const ORDER = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const idx = ORDER.indexOf(req.status);
  // Map status to timeline index: Created=0, Open=1, InProgress=2, Completed=3
  const statusToStep = { OPEN: 1, IN_PROGRESS: 2, COMPLETED: 3, CANCELLED: 3 };
  const activeStep = statusToStep[req.status] ?? 1;

  (req.timeline || []).forEach((step, i) => {
    step.done = i <= activeStep;
    step.current =
      i === activeStep &&
      req.status !== "COMPLETED" &&
      req.status !== "CANCELLED";
  });
}

/* ── 10. Admin action buttons ────────────────────────────── */
function wireAdminActions(req) {
  const archiveBtn = document.getElementById("btn-archive");
  const flagBtn = document.getElementById("btn-flag");

  if (archiveBtn) {
    archiveBtn.addEventListener("click", () => {
      const isArchived = archiveBtn.classList.toggle("active-archive");
      archiveBtn.style.background = isArchived ? "#fef2f2" : "";
      showToast(
        isArchived
          ? `Request ${req.id} archived.`
          : `Request ${req.id} unarchived.`,
        isArchived ? "warning" : "success",
      );
    });
  }

  if (flagBtn) {
    flagBtn.addEventListener("click", () => {
      const isFlagged = flagBtn.classList.toggle("active-flag");
      flagBtn.style.background = isFlagged ? "#fffbeb" : "";
      showToast(
        isFlagged
          ? `Request ${req.id} flagged for review.`
          : `Flag removed from ${req.id}.`,
        isFlagged ? "warning" : "success",
      );
    });
  }
}

/* ── 11. Share button ────────────────────────────────────── */
function wireShareButton(req) {
  const btn = document.getElementById("btn-share");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}?id=${req.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast("Link copied to clipboard!", "success"))
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  });
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast("Link copied to clipboard!", "success");
  } catch {
    showToast("Could not copy link.", "error");
  }
  document.body.removeChild(ta);
}

/* ── 12. User menu dropdown (navbar) ─────────────────────── */
function wireUserMenu() {
  const chip = document.getElementById("user-chip");
  const dropdown = document.getElementById("user-dropdown");
  const caret = document.getElementById("user-caret");
  if (!chip || !dropdown) return;

  chip.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle("open");
    chip.setAttribute("aria-expanded", open);
    if (caret) caret.style.transform = open ? "rotate(180deg)" : "";
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
    chip.setAttribute("aria-expanded", "false");
    if (caret) caret.style.transform = "";
  });
}

/* ── 13. Back link ───────────────────────────────────────── */
function wireBackLink() {
  const link = document.getElementById("back-link");
  if (!link) return;
  // Preserve any ?status= filter that may have been active
  const params = new URLSearchParams(window.location.search);
  const status = params.get("fromStatus");
  link.href = status
    ? `requests.html?status=${encodeURIComponent(status)}`
    : "requests.html";
}

/* ── 14. Logout ──────────────────────────────────────────── */
function wireLogout() {
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document
    .getElementById("dropdown-signout")
    ?.addEventListener("click", logout);
  document.getElementById("dropdown-profile")?.addEventListener("click", () => {
    showToast("Profile page coming soon!", "warning");
  });
}

/* ── 15. Keyboard accessibility for dropdowns ────────────── */
function wireKeyboardNav() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".status-dropdown.open, .user-dropdown.open")
        .forEach((el) => {
          el.classList.remove("open");
        });
    }
  });
}

/* ── 16. Not-found state ─────────────────────────────────── */
function renderNotFound(id) {
  const content = document.querySelector(".detail-page-content");
  if (!content) return;
  content.innerHTML = `
    <a href="requests.html" class="back-link" id="back-link">
      <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Back to Requests
    </a>
    <div style="text-align:center;padding:80px 24px;">
      <svg viewBox="0 0 48 48" fill="none" style="width:56px;height:56px;margin:0 auto 16px;color:#d1d5db;display:block;">
        <rect x="6" y="8" width="36" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
        <path d="M16 20h16M16 28h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M34 34l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:6px;">Request not found</p>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;">No request matching <strong>${escapeHtml(id)}</strong> could be located.</p>
      <a href="requests.html" style="display:inline-flex;align-items:center;gap:6px;padding:9px 20px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;border-radius:8px;font-size:0.875rem;font-weight:600;text-decoration:none;">
        Back to Requests
      </a>
    </div>
  `;
}

/* ── 17. Bootstrap ───────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const id = getRequestId();
  const req = MOCK_REQUESTS[id];

  if (!req) {
    renderNotFound(id);
    return;
  }

  // Hydrate page
  renderBreadcrumb(req);
  renderHeader(req);
  renderParts(req);
  renderAttachments(req);
  renderTimeline(req);
  renderInfoPanel(req);
  renderOffers(req);

  // Wire interactions
  wireStatusDropdown(req);
  wireAdminActions(req);
  wireShareButton(req);
  wireUserMenu();
  wireBackLink();
  wireLogout();
  wireKeyboardNav();
});
