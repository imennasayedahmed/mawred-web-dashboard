# MAWRED — RFQ Admin Dashboard

A web-based admin dashboard for the MAWRED procurement platform. Built as part of a Software Engineering diploma project. The Android app handles the supplier and requester side of things — this dashboard is what the admin uses to keep everything running.

---

## What it does

MAWRED is an RFQ (Request for Quotation) platform. Businesses post procurement requests, suppliers submit price offers, and admins manage the whole thing through this dashboard. Think of it like a procurement control room.

The dashboard covers:

- **Requests** — view all incoming RFQ requests, filter by status, search, sort, and drill into individual ones
- **Offers** — see every supplier offer submitted, flag suspicious ones, track acceptance rates
- **Reports** — moderate flagged content, remove bad listings, warn users
- **Analytics** — charts for requests over time, offer ratios per category, top suppliers, user growth
- **Profile** — manage your admin account, change password, control notification preferences

---

## Tech stack

No frameworks, no build tools. Just HTML, CSS, and vanilla JavaScript running straight in the browser.

| What | How |
|------|-----|
| Frontend | HTML + CSS + vanilla JS |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| File storage | Firebase Storage |
| Hosting | Firebase Hosting |
| Charts | Chart.js (via CDN) |

The Android app and this web dashboard share the same Firebase project, so they're looking at the same live data.

---

## File structure

```
mawred-web-dashboard/
├── pages/
│   ├── dashboard.html
│   ├── requests.html
│   ├── request-detail.html
│   ├── offers.html
│   ├── reports.html
│   ├── analytics.html
│   ├── profile.html
│   └── login.html
│
├── css/
│   ├── dashboard.css        ← shared design system, used by every page
│   ├── requests.css
│   ├── request-detail.css
│   ├── offers.css
│   ├── reports.css
│   ├── analytics.css
│   ├── profile.css
│   └── style.css            ← login page styles
│
└── js/
    ├── firebase-config.js   ← Firebase init, run this first
    ├── auth.js              ← session management, shared by all pages
    ├── firestore.js         ← all Firestore queries live here
    ├── login.js
    ├── dashboard.js
    ├── requests.js
    ├── request-detail.js
    ├── offers.js
    ├── reports.js
    ├── analytics.js
    └── profile.js
```

---

## Getting started

No npm install, no build step. Just open the files.

**To run locally:**

1. Clone the repo
2. Open `pages/login.html` in your browser — that's it

If you want live Firebase data, you'll need to either use the existing Firebase project credentials (ask a team member) or swap in your own `firebase-config.js`.

**To deploy:**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## Firebase setup

The project connects to Firebase using the compat SDK loaded from CDN — no npm package needed. Script load order in each HTML file matters:

```html
<!-- 1. Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js"></script>

<!-- 2. Then our config -->
<script src="../js/firebase-config.js"></script>

<!-- 3. Then auth + firestore helpers -->
<script src="../js/auth.js"></script>
<script src="../js/firestore.js"></script>

<!-- 4. Then the page script -->
<script src="../js/dashboard.js"></script>
```

### Firestore collections

The dashboard reads from these collections:

| Collection | What's in it |
|------------|-------------|
| `requests` | RFQ procurement requests |
| `offers` | Supplier offers against requests |
| `users` | User profiles (requesters + suppliers) |
| `admins` | Admin profiles with name and role |

Flagged content is queried from `requests` and `offers` directly — items with `status: "flagged"` or `flagged: true` show up in the Reports page. There's also support for a dedicated `reports` collection if you add one later.

### Field names the dashboard expects

**requests:**
```
title, status (active/in_progress/completed/cancelled/flagged),
estimatedBudget, userId, categoryId, subcategoryId,
quantity, unitType, description, createdAt, attachments[]
```

**offers:**
```
requestId, supplierId, total (or price), deliveryDays,
status (pending/accepted/rejected/flagged), flagged, createdAt
```

**admins:**
```
name, role, email
```

---

## Auth

Login uses Firebase Auth (email + password). After a successful sign-in, a session is saved to `sessionStorage` so the auth check on every page is synchronous — no flicker while waiting for Firebase to respond.

Every protected page starts with `requireAuth()` which immediately redirects to login if there's no valid session. Firebase Auth state changes are also listened to in the background to handle edge cases like expired tokens.

---

## How the data flows

The `firestore.js` file is the only place that talks to Firebase. It exports:

- `getRequests()` — fetches all requests, joins user data, normalizes status names
- `getOffers()` — fetches all offers, normalizes supplier info
- `getRequestById(id)` — single request with offers, timeline, and attachments
- `getReports()` — queries flagged requests and offers, builds report objects
- `getAdminProfile(uid)` — gets admin name and role after login

Each function falls back to mock data if Firestore returns nothing, so the dashboard always shows something even during development without a live database.

---

## Pages at a glance

**Dashboard** — overview with stat cards, a requests-per-day line chart, status donut chart, recent activity, and quick action buttons. Clicking any stat card navigates to the relevant page filtered by that stat.

**Requests** — filterable, sortable table of all requests. Search by title or ID, filter by status or date range, sort any column. Clicking a row opens the detail page.

**Request Detail** — full view of a single request: description, parts list, attachments, status timeline, related offers. Admins can update the status directly from this page.

**Offers** — table of all supplier offers with status badges. Suspicious offers can be flagged. Each row links back to its parent request.

**Reports** — card-based view of flagged content. Three tabs: All, Flagged Requests, Flagged Offers. Admins can remove content (with a confirmation modal) or send a warning to the user.

**Analytics** — five Chart.js charts with a date range selector (7 / 30 / 90 days). Requests per day, offers per category, top active suppliers, status distribution donut, and user growth over time.

**Profile** — four tabs: Personal Info (editable form), Security (password change + active sessions), Notifications (toggles for email and in-app), Activity (log of recent admin actions).

---

## Known issues / things to finish

- The Reports page falls back to mock data if there are no flagged items in Firebase yet — this is intentional so the page isn't empty during development
- Analytics charts use generated data scaled by the date range — wiring them to live Firestore aggregations is the next step
- The profile form saves locally only; connecting it to Firestore to persist changes is still pending
- No real-time listeners yet (everything uses one-time `get()` calls) — `onSnapshot()` would make the dashboard update live without refreshing

---

## Team

This is a diploma project. The Android app and Firebase backend were built by the rest of the team. The web dashboard was built separately and connected to the same Firebase project.

---

## License

This is a student project built for academic purposes.
