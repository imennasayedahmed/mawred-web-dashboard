/* ============================================================
   MAWRED – RFQ Platform | Firestore Data Layer
   Provides helper functions to fetch live data from Firestore.
   Each function falls back to mock data if Firestore is empty
   or unavailable, so the dashboard always shows something.

   Depends on: firebase-config.js (loaded before this file)
   ============================================================ */

"use strict";

/* ── Generic fetch helper ────────────────────────────────── */

/**
 * Fetch all documents from a Firestore collection.
 * Returns an array of objects with { id, ...fields }.
 *
 * @param {string} collectionName
 * @returns {Promise<Array>}
 */
async function fetchCollection(collectionName) {
  try {
    const snapshot = await fbDb.collection(collectionName).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn(
      `[Firestore] Could not fetch "${collectionName}":`,
      err.message,
    );
    return null;
  }
}

/**
 * Fetch a single document from Firestore by collection + doc ID.
 * Returns the document data object (with id), or null if not found.
 *
 * @param {string} collectionName
 * @param {string} docId
 * @returns {Promise<Object|null>}
 */
async function fetchDoc(collectionName, docId) {
  try {
    const doc = await fbDb.collection(collectionName).doc(docId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    console.warn(
      `[Firestore] Could not fetch "${collectionName}/${docId}":`,
      err.message,
    );
    return null;
  }
}

/**
 * Update a document in a Firestore collection.
 *
 * @param {string} collectionName
 * @param {string} docId
 * @param {Object} data
 * @returns {Promise<boolean>}
 */
async function updateDoc(collectionName, docId, data) {
  if (typeof fbDb === "undefined") {
    console.warn("[Firestore] fbDb not initialized.");
    return false;
  }
  try {
    await fbDb.collection(collectionName).doc(docId).update(data);
    return true;
  } catch (e) {
    console.error(`[Firestore] Could not update "${collectionName}/${docId}":`, e.message);
    return false;
  }
}

/* ── Schema Normalizers ──────────────────────────────────── */

/**
 * Map raw Firestore offer doc to the dashboard format.
 */
function normalizeOffer(doc) {
  const resolveDate = (timestampField) => {
    if (!timestampField) return new Date();
    if (typeof timestampField.toDate === "function")
      return timestampField.toDate();
    return new Date(timestampField);
  };

  const getSupplierObj = (rawDoc) => {
    const name = rawDoc.supplierName || rawDoc.supplier || (typeof rawDoc.supplier === "object" ? rawDoc.supplier.name : null) || (rawDoc.supplierId ? `Supplier ${rawDoc.supplierId.substring(0, 6).toUpperCase()}` : "Unknown Supplier");
    const supplierId = rawDoc.supplierId || rawDoc.supplier?.id || name;
    const colors = [
      "green",
      "amber",
      "blue",
      "purple",
      "rose",
      "teal",
      "indigo",
      "slate",
    ];
    let hash = 0;
    for (let i = 0; i < supplierId.length; i++) {
      hash = supplierId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
    return {
      name: name,
      initials: initials || "US",
      color: color,
    };
  };

  return {
    id: doc.id || "OFR-UNKNOWN",
    supplier: getSupplierObj(doc),
    reqId: doc.requestId || "REQ-UNKNOWN",
    price: doc.total || doc.price || doc.amount || 0,
    delivery: doc.deliveryDays || doc.delivery || 0,
    submitted: resolveDate(doc.createdAt || doc.updatedAt),
    status: doc.status || "pending",
    flagged: doc.status === "flagged" || doc.flagged === true,
    raw: doc,
  };
}

/**
 * Map raw Firestore request doc to the dashboard format.
 */
function normalizeRequest(doc) {
  const resolveDate = (timestampField) => {
    if (!timestampField) return new Date();
    if (typeof timestampField.toDate === "function")
      return timestampField.toDate();
    return new Date(timestampField);
  };

  const getRequesterObj = (rawDoc) => {
    const u = rawDoc.users || {};
    const name = u.displayName || u.name || "System User";
    const colors = [
      "green",
      "blue",
      "purple",
      "amber",
      "rose",
      "teal",
      "indigo",
    ];
    let hash = 0;
    const key = rawDoc.userId || "SU";
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];

    const parts = name.split(" ").filter(Boolean);
    const initials = parts
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    return {
      name: name,
      initials: initials || "SU",
      color: color,
    };
  };

  const statusMap = {
    active: "OPEN",
    in_progress: "IN_PROGRESS",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };

  const rawStatus = (doc.status || "active").toLowerCase();
  const uiStatus = statusMap[rawStatus] || rawStatus.toUpperCase();

  return {
    id: doc.id || "REQ-UNKNOWN",
    title: doc.title || doc.requestTitle || doc.name || "Untitled Request",
    category: doc.category || doc.type || doc.sector || "General",
    requester: getRequesterObj(doc),
    status: uiStatus,
    budget:
      doc.estimatedBudget || doc.budget || doc.price || doc.targetPrice || 0,
    created: resolveDate(doc.createdAt || doc.created),
    raw: doc,
  };
}

/* ── Domain-specific fetchers ────────────────────────────── */

/**
 * Fetch all RFQ requests from Firestore.
 * Falls back to the mock dataset generated in requests.js.
 *
 * @returns {Promise<Array>}
 */
async function getRequests() {
  const rows = await fetchCollection("requests");
  if (rows !== null) {
    if (rows.length > 0) {
      // Client-side join with users collection to populate requester display name & email
      const usersMap = {};
      try {
        const usersList = await fetchCollection("users");
        if (usersList) {
          usersList.forEach((u) => {
            usersMap[u.id] = u;
          });
        }
      } catch (err) {
        console.warn("[Firestore] Failed to pre-fetch users map:", err.message);
      }

      rows.forEach((r) => {
        if (r.userId && usersMap[r.userId]) {
          r.users = usersMap[r.userId];
        }
      });

      return rows.map(normalizeRequest);
    }
    return [];
  }

  // Firestore unreachable — return empty
  return [];
}

/**
 * Fetch all supplier offers from Firestore.
 * Returns empty array if Firestore is unreachable or collection is empty.
 *
 * @returns {Promise<Array>}
 */
async function getOffers() {
  const rows = await fetchCollection("offers");
  if (rows !== null) {
    if (rows.length > 0) return rows.map(normalizeOffer);
    return [];
  }
  // Firestore unreachable — return empty
  return [];
}

/**
 * Update the flagged state and status of an offer in Firestore.
 *
 * @param {string} id
 * @param {boolean} flagged
 * @returns {Promise<boolean>}
 */
async function updateOfferFlag(id, flagged) {
  const status = flagged ? "flagged" : "pending";
  return await updateDoc("offers", id, { flagged, status });
}

/**
 * Fetch a single request with all details and matching offers.
 * Falls back to MOCK_REQUESTS from request-detail.js.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getRequestById(id) {
  const doc = await fetchDoc("requests", id);
  if (doc) {
    // Fetch associated user profile
    if (doc.userId) {
      try {
        const userProfile = await fetchDoc("users", doc.userId);
        if (userProfile) {
          doc.users = userProfile;
        }
      } catch (err) {
        console.warn(
          "[Firestore] Failed to fetch user for request:",
          doc.userId,
          err.message,
        );
      }
    }

    const req = normalizeRequest(doc);

    // Fetch matching offers for this request from firestore
    try {
      const offersSnapshot = await fbDb
        .collection("offers")
        .where("requestId", "==", id)
        .get();
      const offersList = [];
      offersSnapshot.forEach((d) => {
        offersList.push({ id: d.id, ...d.data() });
      });
      req.offers = offersList.map((o) => ({
        supplier: o.supplierId
          ? `Supplier ${o.supplierId.substring(0, 6).toUpperCase()}`
          : "Unknown",
        days: o.deliveryDays || 0,
        amount: o.total || o.price || 0,
        status: o.status || "pending",
      }));
    } catch (err) {
      console.warn("[Firestore] Failed to fetch offers for request:", id, err);
      req.offers = [];
    }

    const resolveDateStr = (t) => {
      if (!t) return "Pending";
      const d = typeof t.toDate === "function" ? t.toDate() : new Date(t);
      return d.toLocaleDateString("en-EG", {
        month: "short",
        day: "numeric",
        timeZone: "Africa/Cairo",
      });
    };

    req.timeline = [
      { label: "Created", date: resolveDateStr(doc.createdAt), done: true },
      {
        label: "Open",
        date: req.status !== "OPEN" ? "Submitted" : "Pending",
        done: req.status !== "OPEN",
      },
      {
        label: "In Progress",
        date:
          req.status === "IN_PROGRESS" || req.status === "COMPLETED"
            ? "Active"
            : "Pending",
        done: req.status === "IN_PROGRESS" || req.status === "COMPLETED",
        current: req.status === "IN_PROGRESS",
      },
      {
        label: "Completed",
        date: req.status === "COMPLETED" ? "Done" : "Pending",
        done: req.status === "COMPLETED",
      },
    ];

    // Fallbacks for extra description/parts/attachments fields if they don't exist
    req.description =
      doc.description ||
      doc.notes ||
      `Procurement request ${id}. Please review specifications and submit competitive offer.`;
    req.category = doc.categoryId || doc.category || "General Procurement";
    req.postedDaysAgo = Math.max(
      1,
      Math.floor((Date.now() - req.created.getTime()) / (1000 * 60 * 60 * 24)),
    );
    req.contact =
      (doc.users && doc.users.email) ||
      doc.contact ||
      req.requester.initials.toLowerCase() + "@mawred.sa";

    // Map parts dynamically using category, subcategory, unitType, quantity
    req.parts = doc.parts || [
      {
        name: doc.title || "Request Items",
        spec: `Category: ${doc.categoryId || "General"} · Subcategory: ${doc.subcategoryId || "General"}`,
        qty: doc.quantity || 1,
        unit: doc.unitType || "units",
      },
    ];

    // Attachments mapping
    req.attachments = (doc.attachments || []).map((a) => {
      if (typeof a === "string") {
        const fileName = a.split("/").pop() || "attachment";
        return {
          name: fileName.substring(0, 15),
          fullName: fileName,
          size: "Unknown Size",
          type: fileName.split(".").pop() || "pdf",
          url: a,
        };
      }
      return {
        name: a.name || "Attachment",
        fullName: a.name || "Attachment",
        size:
          typeof a.size === "number"
            ? (a.size / 1024).toFixed(1) + " KB"
            : a.size || "Unknown Size",
        type: a.mimeType ? a.mimeType.split("/")[1] || "pdf" : "pdf",
        url: a.url,
      };
    });

    return req;
  }

  return null;
}

/**
 * Fetch admin user profile from Firestore by UID.
 * Called after successful login to get display name + role.
 *
 * @param {string} uid  Firebase Auth user UID
 * @returns {Promise<Object|null>}
 */
async function getAdminProfile(uid) {
  const profile = await fetchDoc("admins", uid);
  return profile;
}

/**
 * Fetch merged list of flagged requests/offers from Firestore.
 * Falls back to the RAW_REPORTS array from reports.js.
 *
 * @returns {Promise<Array>}
 */
async function getReports() {
  try {
    const flaggedRequests = [];
    const flaggedOffers = [];

    // Query flagged requests
    try {
      const q1 = await fbDb
        .collection("requests")
        .where("status", "==", "flagged")
        .get();
      q1.forEach((doc) => {
        flaggedRequests.push({ id: doc.id, type: "request", ...doc.data() });
      });
      const q1b = await fbDb
        .collection("requests")
        .where("flagged", "==", true)
        .get();
      q1b.forEach((doc) => {
        if (!flaggedRequests.some((r) => r.id === doc.id)) {
          flaggedRequests.push({ id: doc.id, type: "request", ...doc.data() });
        }
      });
    } catch (e) {
      console.warn("[Firestore] Failed to fetch flagged requests:", e.message);
    }

    // Query flagged offers
    try {
      const q2 = await fbDb
        .collection("offers")
        .where("status", "==", "flagged")
        .get();
      q2.forEach((doc) => {
        flaggedOffers.push({ id: doc.id, type: "offer", ...doc.data() });
      });
      const q2b = await fbDb
        .collection("offers")
        .where("flagged", "==", true)
        .get();
      q2b.forEach((doc) => {
        if (!flaggedOffers.some((o) => o.id === doc.id)) {
          flaggedOffers.push({ id: doc.id, type: "offer", ...doc.data() });
        }
      });
    } catch (e) {
      console.warn("[Firestore] Failed to fetch flagged offers:", e.message);
    }

    const merged = [...flaggedRequests, ...flaggedOffers].map((item) => {
      const resolveDate = (t) => {
        if (!t) return new Date();
        if (typeof t.toDate === "function") return t.toDate();
        return new Date(t);
      };
      const date = resolveDate(item.createdAt || item.updatedAt);
      const daysAgo = Math.max(
        1,
        Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)),
      );

      return {
        id: item.id || `RPT-${Math.floor(1000 + Math.random() * 9000)}`,
        type: item.type,
        status:
          item.status === "flagged" ? "pending" : item.status || "pending",
        title:
          item.title || item.requestTitle || item.name || "Flagged content",
        reason:
          item.rejectionReason || item.notes || "Reported for admin review.",
        reporter: {
          name: "System Reporter",
          handle: "@system",
          initials: "SR",
          color: "rose",
        },
        submitted: date,
        daysAgo: daysAgo,
        reportCount: 1,
        resolvedBy: null,
        resolvedDate: null,
      };
    });

    return merged;
  } catch (err) {
    console.error("[Firestore] Failed to get live reports:", err);
    return [];
  }
}

/**
 * Fetch all users from Firestore.
 *
 * @returns {Promise<Array>}
 */
async function getUsers() {
  const rows = await fetchCollection("users");
  return rows || [];
}
