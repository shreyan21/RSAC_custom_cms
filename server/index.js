import bcrypt from "bcryptjs";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { existsSync, mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { collections, getCollection } from "../shared/cmsCollections.js";
import {
  cmsPermissionKeys,
  createCmsPermissions,
  hasCmsPermission,
  normalizeCmsPermissions,
  permissionForCmsEntry,
  permissionOptionsForCollection,
} from "../shared/cmsPermissions.js";
import { assertStrongPassword } from "../shared/passwordPolicy.js";
import { config } from "./config.js";
import { pool, withTransaction } from "./db.js";
import { assembleBootstrap, localize, mergePreviewRow, readPublishedEntries } from "./contentAssembler.js";
import { clearSession, createSession, requireAdmin, requireAuth, requireCsrf, sessionCookie, sessionCookieOptions } from "./auth.js";
import { preserveStoredUndeclaredFields, validateEntryPayload } from "./contentValidation.js";
import { prepareFormerRosterSave } from "./formerRosterSync.js";
import { feedbackMailConfigured, sendFeedbackNotification } from "./feedbackMailer.js";
import {
  liveDivisionOptions,
  syncDivisionPage,
  syncDivisionStatusFromPage,
} from "./divisionPageSync.js";
import { allocateUniqueEntryKey, entryKeyFor } from "./entryKeys.js";

const app = express();
const ensureUploadDirectory = () => mkdirSync(config.uploadDir, { recursive: true });

// Create runtime storage before static serving or upload middleware can use it.
// The folder is intentionally gitignored and may not exist on a fresh checkout.
ensureUploadDirectory();

const defaultPermissionsJson = JSON.stringify(createCmsPermissions(true)).replaceAll("'", "''");
await pool.query(`
  ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '${defaultPermissionsJson}'::jsonb;
  CREATE UNIQUE INDEX IF NOT EXISTS cms_users_single_administrator_idx ON cms_users ((role)) WHERE role = 'admin';
  ALTER TABLE cms_feedback ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
  ALTER TABLE cms_feedback ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending';
  ALTER TABLE cms_feedback ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0;
  ALTER TABLE cms_feedback ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
  ALTER TABLE cms_feedback ADD COLUMN IF NOT EXISTS delivery_error text NOT NULL DEFAULT '';
  ALTER TABLE cms_feedback ADD COLUMN IF NOT EXISTS last_delivery_attempt_at timestamptz
`);

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
}));
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: "3mb" }));
app.use(cookieParser());
app.use(["/api/auth", "/api/admin"], (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/uploads", express.static(config.uploadDir, { immutable: true, maxAge: "1y" }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const credentialLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const publicFormLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const previewLifetimeMs = 15 * 60 * 1000;
const maxPreviewSessions = 100;
const previewSessions = new Map();
const publicBootstrapCache = new Map();
let publishedRowsCache = { version: "", rows: null };
const publicContentSubscribers = new Set();
let contentVersionCache = { checkedAt: 0, value: "" };

const deliverFeedback = async (feedback) => {
  let delivery;
  try {
    delivery = await sendFeedbackNotification(feedback);
  } catch (error) {
    console.error("Feedback email delivery failed:", error.message);
    delivery = {
      status: "failed",
      error: String(error.message || "Email delivery failed").slice(0, 1000),
    };
  }

  const { rows } = await pool.query(
    `UPDATE cms_feedback
        SET delivery_status=$2,
            delivery_attempts=delivery_attempts+1,
            delivered_at=CASE WHEN $2='sent' THEN now() ELSE delivered_at END,
            delivery_error=$3,
            last_delivery_attempt_at=now()
      WHERE id=$1
      RETURNING *`,
    [feedback.id, delivery.status, delivery.error || ""]
  );
  return rows[0];
};

const broadcastPublicContentUpdate = () => {
  const message = `event: content\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`;
  publicContentSubscribers.forEach((response) => {
    try {
      response.write(message);
    } catch {
      publicContentSubscribers.delete(response);
    }
  });
};

const readContentVersion = async () => {
  const now = Date.now();
  if (now - contentVersionCache.checkedAt < 1000) return contentVersionCache.value;

  const { rows } = await pool.query("SELECT max(updated_at) AS version FROM cms_entries");
  const value = rows[0].version?.toISOString?.() || "";
  contentVersionCache = { checkedAt: now, value };
  return value;
};

const readBootstrapPayload = async (language) => {
  const currentVersion = await readContentVersion();
  const cached = publicBootstrapCache.get(language);
  if (cached?.version === currentVersion) return cached.body;

  const rows = publishedRowsCache.version === currentVersion && publishedRowsCache.rows
    ? publishedRowsCache.rows
    : await readPublishedEntries();
  publishedRowsCache = { version: currentVersion, rows };
  const data = assembleBootstrap(rows, language);
  const body = JSON.stringify({ data, generatedAt: new Date().toISOString() });
  publicBootstrapCache.set(language, { version: data.contentVersion, body });
  return body;
};

const invalidatePublicContentCache = () => {
  publicBootstrapCache.clear();
  publishedRowsCache = { version: "", rows: null };
  contentVersionCache = { checkedAt: 0, value: "" };
  broadcastPublicContentUpdate();
};

const localPreviewPath = (value) => {
  const path = String(value || "").trim();
  if (!path || /^(?:https?:)?\/\//iu.test(path)) return "";
  return path.startsWith("/") ? path : `/${path}`;
};

const previewPathFor = (collection, dataEn) => {
  if (collection === "pages") {
    if (dataEn.slug === "organisational-chart") return "/organisation-chart";
    return dataEn.sectionKey && dataEn.slug
      ? `/${dataEn.sectionKey}/${dataEn.slug}`
      : "/";
  }
  if (collection === "page_sections") {
    return localPreviewPath(dataEn.route || dataEn.key) || "/";
  }
  if (["menu_items", "page_display_settings"].includes(collection)) {
    return localPreviewPath(dataEn.path) || "/";
  }
  if (["policies", "public_info"].includes(collection) && dataEn.slug) {
    return `/${dataEn.slug}`;
  }
  if (collection === "division_section_items" && dataEn.divisionSlug) {
    return `/divisions/${dataEn.divisionSlug}`;
  }
  if (["projects", "publications"].includes(collection)) {
    return dataEn.divisionSlug
      ? `/divisions/${dataEn.divisionSlug}`
      : "/divisions";
  }
  if (collection === "profiles") {
    const profilePaths = {
      leadership: "/leadership",
      official: "/leadership",
      former: "/about-us/our-formers",
      technical: "/technical-staff",
      administration: "/administration",
    };
    return profilePaths[dataEn.profileType] || "/scientists";
  }
  const collectionPaths = {
    divisions: "/divisions",
    facilities: "/facilities",
    manpower: "/manpower",
    organisation_roles: "/organisation-chart",
    notices: "/notices",
    tenders: "/tenders",
    faq: "/faq",
    flood_reports: "/flood-reports",
    gallery: "/gallery",
    downloads: "/downloads",
    mobile_apps: "/mobile-apps",
    geoportals: "/geoportals",
    contact: "/contact",
  };
  return collectionPaths[collection] || "/";
};

const deleteExpiredPreviews = () => {
  const now = Date.now();
  previewSessions.forEach((preview, token) => {
    if (preview.expiresAt <= now) previewSessions.delete(token);
  });
  while (previewSessions.size >= maxPreviewSessions) {
    previewSessions.delete(previewSessions.keys().next().value);
  }
};

const normalizeProfileIdentity = (value) => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/^(?:dr|prof|mr|mrs|ms|shri|sri|smt)\.?\s+/iu, "")
  .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const isPlaceholderProfilePhoto = (value) =>
  /(?:^|[/\\])(?:\d+)?(?:no(?:[-_ ]*copy[-_ ]*\d*)?|placeholder|default[-_ ]*profile|profile[-_ ]*placeholder)\.(?:jpe?g|png|webp)$/i.test(
    String(value || "").split(/[?#]/)[0]
  );

const profileIdentityKeys = (profile) => {
  const keys = new Set();
  const employeeId = normalizeProfileIdentity(profile.employeeId);
  const email = String(profile.email || "").trim().toLowerCase();
  const name = normalizeProfileIdentity(profile.name);
  const photo = String(profile.photo || "").split(/[?#]/)[0].toLowerCase();
  if (employeeId && employeeId !== "notlisted") keys.add(`employee:${employeeId}`);
  if (email) keys.add(`email:${email}`);
  if (name) keys.add(`name:${name}`);
  if (photo && !isPlaceholderProfilePhoto(photo)) keys.add(`photo:${photo}`);
  return keys;
};

const assertUniqueProfile = async (client, dataEn, status, excludeId = null) => {
  if (status === "archived") return;
  const candidateType = String(dataEn.profileType || "");
  const candidateKeys = profileIdentityKeys(dataEn);
  const { rows } = await client.query(
    "SELECT id, data_en FROM cms_entries WHERE collection='profiles' AND status <> 'archived' AND ($1::uuid IS NULL OR id <> $1::uuid)",
    [excludeId]
  );
  const duplicate = rows.find((row) => {
    if (String(row.data_en?.profileType || "") !== candidateType) return false;
    const existingKeys = profileIdentityKeys(row.data_en || {});
    return [...candidateKeys].some((key) => existingKeys.has(key));
  });
  if (duplicate) {
    throw Object.assign(
      new Error("Possible duplicate profile. Edit the existing record or archive it before saving another card."),
      { status: 409 }
    );
  }
};

const assertUniquePageDisplayPath = async (client, dataEn, status, excludeId = null) => {
  if (status === "archived") return;
  const path = String(dataEn.path || "").trim();
  const { rows } = await client.query(
    `SELECT id
       FROM cms_entries
      WHERE collection='page_display_settings'
        AND status <> 'archived'
        AND data_en->>'path'=$1
        AND ($2::uuid IS NULL OR id <> $2::uuid)
      LIMIT 1`,
    [path, excludeId]
  );
  if (rows[0]) {
    throw Object.assign(
      new Error("This page path already has heading settings. Edit the existing item instead."),
      { status: 409 }
    );
  }
};

const publicEntry = (row) => ({
  id: row.id,
  entryKey: row.entry_key,
  status: row.status,
  sortOrder: row.sort_order,
  dataEn: row.data_en,
  dataHi: row.data_hi,
  version: row.version,
  updatedAt: row.updated_at,
});

const audit = async (client, req, action, row, beforeData = null, afterData = null) => {
  await client.query(
    `INSERT INTO cms_audit_log (user_id, action, collection, entry_id, entry_key, before_data, after_data, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [req.cmsUser?.id || null, action, row?.collection || null, row?.id || null, row?.entry_key || null, beforeData, afterData, req.ip]
  );
};

app.get("/api/health", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT current_database() AS database, now() AS time");
    res.json({
      ok: true,
      service: "RSAC Custom CMS",
      database: rows[0].database,
      time: rows[0].time,
      feedbackEmailConfigured: feedbackMailConfigured(),
    });
  } catch (error) { next(error); }
});

app.get("/api/content/events", (req, res) => {
  res.status(200);
  res.set({
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream; charset=utf-8",
    "Content-Encoding": "identity",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  publicContentSubscribers.add(res);

  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    publicContentSubscribers.delete(res);
  });
});

app.get("/api/content/bootstrap", async (req, res, next) => {
  try {
    const language = req.query.lang === "hi" ? "hi" : "en";
    const body = await readBootstrapPayload(language);
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.type("application/json").send(body);
  } catch (error) { next(error); }
});

app.get("/api/content/preview/:token", async (req, res, next) => {
  try {
    deleteExpiredPreviews();
    const preview = previewSessions.get(req.params.token);
    if (!preview) {
      return res.status(404).json({ error: "Preview expired. Return to the CMS and click Preview again." });
    }

    const language = req.query.lang === "hi" ? "hi" : "en";
    const currentVersion = await readContentVersion();
    const publishedRows = publishedRowsCache.version === currentVersion && publishedRowsCache.rows
      ? publishedRowsCache.rows
      : await readPublishedEntries();
    publishedRowsCache = { version: currentVersion, rows: publishedRows };
    const rows = mergePreviewRow(publishedRows, preview);

    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    res.json({
      data: {
        ...assembleBootstrap(rows, language),
        isPreview: true,
        previewRevision: preview.revision,
      },
      expiresAt: new Date(preview.expiresAt).toISOString(),
    });
  } catch (error) { next(error); }
});

app.get("/api/content/version", async (_req, res, next) => {
  try {
    const version = await readContentVersion();
    res.set("Cache-Control", "no-store");
    res.json({ version });
  } catch (error) { next(error); }
});

app.get("/api/content/:collection", async (req, res, next) => {
  try {
    if (!getCollection(req.params.collection)) return res.status(404).json({ error: "Unknown collection" });
    const language = req.query.lang === "hi" ? "hi" : "en";
    const year = String(req.query.year || "").trim();
    if (year && (req.params.collection !== "flood_reports" || !/^\d{4}$/.test(year))) {
      return res.status(400).json({ error: "Invalid content filter" });
    }
    const values = [req.params.collection];
    const yearFilter = year ? " AND data_en->>'date' LIKE $2" : "";
    if (year) values.push(`${year}%`);
    const { rows } = await pool.query(
      `SELECT id, entry_key, sort_order, data_en, data_hi, version, updated_at
         FROM cms_entries
        WHERE collection=$1 AND status='published'${yearFilter}
        ORDER BY sort_order, entry_key`,
      values
    );
    const localized = rows.map((row) => ({
      id: row.id,
      key: row.entry_key,
      ...localize({ ...row, collection: req.params.collection }, language),
    }));
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.json({ data: localized });
  } catch (error) { next(error); }
});

app.post("/api/feedback", publicFormLimiter, async (req, res, next) => {
  try {
    const clean = (value, max = 300) => String(value || "").trim().slice(0, max);
    if (clean(req.body?.website, 200)) {
      return res.status(201).json({ ok: true, delivery: "filtered" });
    }
    const name = clean(req.body?.name, 160);
    const email = clean(req.body?.email);
    const phone = clean(req.body?.phone, 40);
    const address = clean(req.body?.address, 1000);
    const country = clean(req.body?.country);
    const state = clean(req.body?.state);
    const district = clean(req.body?.district);
    const comments = clean(req.body?.comments, 5000);
    const language = req.body?.language === "hi" ? "hi" : "en";
    if (![name, email, phone, address, country, state, district, comments].every(Boolean)) {
      return res.status(400).json({ error: "Complete all required feedback fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    if (!/^[\d+\-\s()]{7,}$/u.test(phone)) {
      return res.status(400).json({ error: "Enter a valid phone number" });
    }
    const { rows } = await pool.query(
      `INSERT INTO cms_feedback
         (name, email, phone, address, country, state, district, comments, ip_address, language)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, email, phone, address, country, state, district, comments, req.ip, language]
    );
    const feedback = await deliverFeedback(rows[0]);
    res.status(201).json({
      ok: true,
      id: feedback.id,
      delivery: feedback.delivery_status,
    });
  } catch (error) { next(error); }
});

app.post("/api/visits", async (_req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO cms_site_visits (visit_day, visit_count) VALUES (current_date, 1)
       ON CONFLICT (visit_day) DO UPDATE SET visit_count=cms_site_visits.visit_count+1`
    );
    const { rows } = await pool.query("SELECT COALESCE(sum(visit_count), 0)::bigint AS count FROM cms_site_visits");
    res.json({ count: Number(rows[0].count) });
  } catch (error) { next(error); }
});

app.get("/api/visits", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT COALESCE(sum(visit_count), 0)::bigint AS count FROM cms_site_visits");
    res.json({ count: Number(rows[0].count) });
  } catch (error) { next(error); }
});

const presentAuthenticatedUser = (row) => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  role: row.role,
  permissions: normalizeCmsPermissions(row.permissions, row.role),
});

app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (username.length > 50 || password.length > 256) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const { rows } = await pool.query("SELECT * FROM cms_users WHERE username=$1 AND active=true", [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    await pool.query("DELETE FROM cms_sessions WHERE expires_at <= now()");
    const session = await createSession(user.id);
    res.cookie(sessionCookie, session.token, { ...sessionCookieOptions, expires: session.expiresAt });
    res.json({ user: presentAuthenticatedUser(user), csrfToken: session.csrfToken });
  } catch (error) { next(error); }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: presentAuthenticatedUser(req.cmsUser), csrfToken: req.cmsUser.csrf_token });
});

app.post("/api/auth/change-password", credentialLimiter, requireAuth, requireCsrf, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    assertStrongPassword(newPassword);
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "Choose a new password that is different from the current password" });
    }
    const { rows } = await pool.query("SELECT password_hash FROM cms_users WHERE id=$1", [req.cmsUser.id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await withTransaction(async (client) => {
      await client.query("UPDATE cms_users SET password_hash=$1 WHERE id=$2", [passwordHash, req.cmsUser.id]);
      await client.query("DELETE FROM cms_sessions WHERE user_id=$1 AND id<>$2", [req.cmsUser.id, req.cmsUser.session_id]);
      await client.query(
        `INSERT INTO cms_audit_log (user_id,action,collection,entry_id,entry_key,after_data,ip_address)
         VALUES ($1,'change_own_password','users',$1,$2,$3,$4)`,
        [req.cmsUser.id, req.cmsUser.username, { changed: true }, req.ip]
      );
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.post("/api/auth/logout", requireAuth, requireCsrf, async (req, res, next) => {
  try {
    await clearSession(req.cmsSessionToken);
    res.clearCookie(sessionCookie, sessionCookieOptions);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.use("/api/admin", requireAuth);

const permissionError = (message = "Your account does not have permission for this CMS area") =>
  Object.assign(new Error(message), { status: 403 });

const canAccessAny = (user, keys) => keys.some((key) => hasCmsPermission(user, key));
const canAccessCollection = (user, collection) => (
  user?.role === "admin" || canAccessAny(user, permissionOptionsForCollection(collection))
);
const canAccessEntry = (user, collection, entry) => {
  if (user?.role === "admin") return true;
  if (collection === "site_settings") return canAccessCollection(user, collection);
  const permission = permissionForCmsEntry(collection, entry);
  return Boolean(permission && hasCmsPermission(user, permission));
};
const assertCollectionAccess = (req, collection) => {
  if (!canAccessCollection(req.cmsUser, collection)) throw permissionError();
};
const assertEntryAccess = (req, collection, entry) => {
  if (!canAccessEntry(req.cmsUser, collection, entry)) throw permissionError();
};

const peopleSettingPrefixes = [
  "cards",
  "pageContent.ourFormers",
  "pageContent.leadership",
  "pageContent.scientists",
  "pageContent.technicalStaff",
  "pageContent.administration",
  "pageContent.manpower",
  "pageContent.organisationChart",
  "organisationChart",
];
const floodSettingPrefixes = ["pageContent.floodReports", "floodSection"];
const pathMatchesPrefix = (path, prefix) => path === prefix || path.startsWith(`${prefix}.`);
const permissionForSettingPath = (path) => {
  if (peopleSettingPrefixes.some((prefix) => pathMatchesPrefix(path, prefix))) return "people";
  if (floodSettingPrefixes.some((prefix) => pathMatchesPrefix(path, prefix))) return "flood";
  return "homepage";
};
const changedSettingPaths = (before, after, prefix = "") => {
  if (Object.is(before, after)) return [];
  const beforeObject = before && typeof before === "object" && !Array.isArray(before);
  const afterObject = after && typeof after === "object" && !Array.isArray(after);
  if (!beforeObject || !afterObject) return [prefix];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].flatMap((key) => changedSettingPaths(
    before[key],
    after[key],
    prefix ? `${prefix}.${key}` : key
  ));
};
const assertSiteSettingsChanges = (req, before, dataEn, dataHi) => {
  if (req.cmsUser.role === "admin") return;
  const paths = new Set([
    ...changedSettingPaths(before.data_en?.settings || {}, dataEn?.settings || {}),
    ...changedSettingPaths(before.data_hi?.settings || {}, dataHi?.settings || {}),
  ]);
  for (const path of paths) {
    const permission = permissionForSettingPath(path);
    if (!hasCmsPermission(req.cmsUser, permission)) {
      throw permissionError(`Your account cannot edit the ${permission.replaceAll("_", " ")} settings`);
    }
  }
};
const contentPermissionKeys = cmsPermissionKeys.filter((key) => !["feedback", "audit"].includes(key));
const requireAnyContentPermission = (req, res, next) => {
  if (req.cmsUser.role !== "admin" && !canAccessAny(req.cmsUser, contentPermissionKeys)) {
    return res.status(403).json({ error: "Your account does not have permission to manage website media" });
  }
  next();
};

app.post("/api/admin/preview", writeLimiter, requireCsrf, async (req, res, next) => {
  try {
    const collection = String(req.body?.collection || "");
    const entry = req.body?.entry || {};
    const { definition, dataEn, dataHi, status, sortOrder } = validateEntryPayload(collection, entry);
    const entryKey = entryKeyFor(entry, dataEn);
    assertEntryAccess(req, definition.id, { ...entry, entry_key: entryKey, data_en: dataEn });
    const now = new Date();
    deleteExpiredPreviews();
    const requestedToken = String(req.body?.token || "").trim();
    const token = requestedToken && previewSessions.has(requestedToken)
      ? requestedToken
      : randomUUID();
    const entryId = entry.id ? String(entry.id) : "";
    const row = {
      id: entryId || randomUUID(),
      collection: definition.id,
      entry_key: entryKey,
      status,
      sort_order: definition.autoNewestFirst && !entryId ? -2147483648 : sortOrder,
      data_en: dataEn,
      data_hi: dataHi,
      version: Number(entry.version) || 0,
      updated_at: now,
      content_version: now,
    };
    const expiresAt = Date.now() + previewLifetimeMs;
    const revision = now.toISOString();

    previewSessions.set(token, { entryId, row, expiresAt, revision });
    res.set("Cache-Control", "no-store");
    res.json({
      token,
      path: previewPathFor(definition.id, dataEn),
      status,
      revision,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) { next(error); }
});
app.get("/api/admin/schema", (req, res) => res.json({
  collections: collections.filter((definition) => canAccessCollection(req.cmsUser, definition.id)),
}));

const cleanUser = (row) => ({
  ...presentAuthenticatedUser(row),
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const validateUserInput = (body, { passwordRequired = false } = {}) => {
  const username = String(body?.username || "").trim().toLowerCase();
  const displayName = String(body?.displayName || "").trim().slice(0, 120);
  const role = String(body?.role || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!displayName) throw Object.assign(new Error("Full name is required"), { status: 400 });
  if (!username) throw Object.assign(new Error("Username is required"), { status: 400 });
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw Object.assign(new Error("Username must be 3-50 letters, numbers, dots, underscores or hyphens"), { status: 400 });
  if (!["admin", "editor"].includes(role)) throw Object.assign(new Error("Choose an account role"), { status: 400 });
  if (passwordRequired && !password) throw Object.assign(new Error("Password is required"), { status: 400 });
  if (passwordRequired || password) assertStrongPassword(password);
  const permissions = body?.permissions && typeof body.permissions === "object" && !Array.isArray(body.permissions)
    ? normalizeCmsPermissions(body.permissions, role)
    : null;
  return { username, displayName, role, password, permissions };
};

app.get("/api/admin/users", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id,username,display_name,role,permissions,active,created_at,updated_at FROM cms_users ORDER BY active DESC, role, display_name");
    res.json({ data: rows.map(cleanUser) });
  } catch (error) { next(error); }
});

app.post("/api/admin/users", writeLimiter, requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const input = validateUserInput(req.body, { passwordRequired: true });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const created = await withTransaction(async (client) => {
      await client.query("LOCK TABLE cms_users IN SHARE ROW EXCLUSIVE MODE");
      const duplicateUsername = (await client.query(
        "SELECT 1 FROM cms_users WHERE lower(username)=$1 LIMIT 1",
        [input.username]
      )).rowCount > 0;
      if (duplicateUsername) {
        throw Object.assign(new Error(`Username '${input.username}' is already in use. Choose another username.`), { status: 409 });
      }
      if (input.role === "admin") {
        const administratorExists = (await client.query(
          "SELECT 1 FROM cms_users WHERE role='admin' LIMIT 1"
        )).rowCount > 0;
        if (administratorExists) {
          throw Object.assign(new Error("Only one administrator account is allowed. Create this user as an Editor."), { status: 400 });
        }
      }
      const row = (await client.query(
        `INSERT INTO cms_users (username,display_name,password_hash,role,permissions)
         VALUES ($1,$2,$3,$4,$5) RETURNING id,username,display_name,role,permissions,active,created_at,updated_at`,
        [input.username, input.displayName, passwordHash, input.role, input.permissions || createCmsPermissions(false)]
      )).rows[0];
      await client.query(
        `INSERT INTO cms_audit_log (user_id,action,collection,entry_id,entry_key,after_data,ip_address)
         VALUES ($1,'create_user','users',$2,$3,$4,$5)`,
        [req.cmsUser.id, row.id, row.username, cleanUser(row), req.ip]
      );
      return row;
    });
    res.status(201).json({ data: cleanUser(created) });
  } catch (error) { next(error); }
});

app.put("/api/admin/users/:id", writeLimiter, requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const input = validateUserInput(req.body);
    const active = req.body?.active !== false;
    if (req.params.id === req.cmsUser.id && (!active || input.role !== "admin")) {
      return res.status(400).json({ error: "You cannot deactivate or demote your own administrator account" });
    }
    const row = await withTransaction(async (client) => {
      await client.query("LOCK TABLE cms_users IN SHARE ROW EXCLUSIVE MODE");
      const before = (await client.query("SELECT * FROM cms_users WHERE id=$1 FOR UPDATE", [req.params.id])).rows[0];
      if (!before) throw Object.assign(new Error("User not found"), { status: 404 });
      const duplicateUsername = (await client.query(
        "SELECT 1 FROM cms_users WHERE lower(username)=$1 AND id<>$2 LIMIT 1",
        [input.username, req.params.id]
      )).rowCount > 0;
      if (duplicateUsername) {
        throw Object.assign(new Error(`Username '${input.username}' is already in use. Choose another username.`), { status: 409 });
      }
      if (input.role === "admin") {
        const anotherAdministratorExists = (await client.query(
          "SELECT 1 FROM cms_users WHERE role='admin' AND id<>$1 LIMIT 1",
          [req.params.id]
        )).rowCount > 0;
        if (anotherAdministratorExists) {
          throw Object.assign(new Error("Only one administrator account is allowed. Keep this user as an Editor."), { status: 400 });
        }
      }
      if (before.role === "admin" && before.active && (!active || input.role !== "admin")) {
        const admins = Number((await client.query("SELECT count(*) AS count FROM cms_users WHERE role='admin' AND active=true")).rows[0].count);
        if (admins <= 1) throw Object.assign(new Error("At least one active administrator is required"), { status: 400 });
      }
      const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : before.password_hash;
      const permissions = input.permissions || normalizeCmsPermissions(before.permissions, input.role);
      const updated = (await client.query(
        `UPDATE cms_users SET username=$1,display_name=$2,role=$3,active=$4,password_hash=$5,permissions=$6
         WHERE id=$7 RETURNING id,username,display_name,role,permissions,active,created_at,updated_at`,
        [input.username, input.displayName, input.role, active, passwordHash, permissions, req.params.id]
      )).rows[0];
      if (input.password || !active) await client.query("DELETE FROM cms_sessions WHERE user_id=$1", [req.params.id]);
      await client.query(
        `INSERT INTO cms_audit_log (user_id,action,collection,entry_id,entry_key,before_data,after_data,ip_address)
         VALUES ($1,'update_user','users',$2,$3,$4,$5,$6)`,
        [req.cmsUser.id, updated.id, updated.username, cleanUser(before), cleanUser(updated), req.ip]
      );
      return updated;
    });
    res.json({ data: cleanUser(row) });
  } catch (error) { next(error); }
});

app.delete("/api/admin/users/:id", writeLimiter, requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    if (req.params.id === req.cmsUser.id) {
      return res.status(400).json({ error: "You cannot delete the administrator account you are currently using" });
    }
    const deleted = await withTransaction(async (client) => {
      const target = (await client.query(
        "SELECT * FROM cms_users WHERE id=$1 FOR UPDATE",
        [req.params.id]
      )).rows[0];
      if (!target) throw Object.assign(new Error("User not found"), { status: 404 });

      if (target.role === "admin" && target.active) {
        const activeAdmins = Number((await client.query(
          "SELECT count(*) AS count FROM cms_users WHERE role='admin' AND active=true"
        )).rows[0].count);
        if (activeAdmins <= 1) {
          throw Object.assign(new Error("At least one active administrator is required"), { status: 400 });
        }
      }

      await client.query(
        `INSERT INTO cms_audit_log (user_id,action,collection,entry_id,entry_key,before_data,after_data,ip_address)
         VALUES ($1,'delete_user','users',$2,$3,$4,$5,$6)`,
        [
          req.cmsUser.id,
          target.id,
          target.username,
          cleanUser(target),
          { deleted: true },
          req.ip,
        ]
      );
      await client.query("DELETE FROM cms_users WHERE id=$1", [target.id]);
      return cleanUser(target);
    });
    res.json({ ok: true, data: deleted });
  } catch (error) { next(error); }
});

app.get("/api/admin/collections", async (req, res, next) => {
  try {
    const [{ rows }, divisionOptions] = await Promise.all([
      pool.query(
        `SELECT collection, count(*) FILTER (WHERE status <> 'archived')::int AS total,
                count(*) FILTER (WHERE status='published')::int AS published,
                count(*) FILTER (WHERE status='draft')::int AS drafts,
                count(*) FILTER (WHERE data_hi <> '{}'::jsonb)::int AS hindi
         FROM cms_entries GROUP BY collection`
      ),
      liveDivisionOptions(pool),
    ]);
    const counts = new Map(rows.map((row) => [row.collection, row]));
    const definitions = collections
      .filter((item) => canAccessCollection(req.cmsUser, item.id))
      .map((item) => ({
      ...item,
      fields: item.id === "division_section_items"
        ? item.fields.map((field) =>
          field.name === "divisionSlug" ? { ...field, options: divisionOptions } : field
        )
        : item.fields,
      counts: counts.get(item.id) || { total: 0, published: 0, drafts: 0, hindi: 0 },
    }));
    res.json({ data: definitions });
  } catch (error) { next(error); }
});

app.get("/api/admin/content/:collection", async (req, res, next) => {
  try {
    if (!getCollection(req.params.collection)) return res.status(404).json({ error: "Unknown collection" });
    assertCollectionAccess(req, req.params.collection);
    const { rows } = await pool.query(
      "SELECT * FROM cms_entries WHERE collection=$1 ORDER BY status='archived', sort_order, updated_at DESC",
      [req.params.collection]
    );
    res.set("Cache-Control", "no-store");
    res.json({ data: rows.filter((row) => canAccessEntry(req.cmsUser, req.params.collection, row)).map(publicEntry) });
  } catch (error) { next(error); }
});

app.post("/api/admin/content/:collection", writeLimiter, requireCsrf, async (req, res, next) => {
  try {
    const hasExplicitSortOrder = req.body?.sortOrder !== ""
      && req.body?.sortOrder !== null
      && req.body?.sortOrder !== undefined
      && Number.isFinite(Number(req.body.sortOrder));
    const { definition, dataEn, dataHi, status, sortOrder } = validateEntryPayload(req.params.collection, req.body || {});
    const automaticEntryKey = !String(req.body?.entryKey || "").trim();
    let baseEntryKey = entryKeyFor(req.body, dataEn);
    assertEntryAccess(req, definition.id, { ...req.body, entry_key: baseEntryKey, data_en: dataEn });
    if (definition.autoNewestFirst && automaticEntryKey) baseEntryKey = `${baseEntryKey}-${randomUUID().slice(0, 8)}`;
    const row = await withTransaction(async (client) => {
      if (definition.singleton) {
        const existing = await client.query("SELECT id FROM cms_entries WHERE collection=$1 AND status <> 'archived' LIMIT 1", [definition.id]);
        if (existing.rows[0]) throw Object.assign(new Error("This collection allows one active record"), { status: 409 });
      }
      if (definition.id === "profiles") await assertUniqueProfile(client, dataEn, status);
      if (definition.id === "page_display_settings") await assertUniquePageDisplayPath(client, dataEn, status);
      const entryKey = await allocateUniqueEntryKey(client, definition.id, baseEntryKey, {
        automatic: automaticEntryKey,
      });
      let effectiveSortOrder = sortOrder;
      if (!definition.singleton && (definition.autoNewestFirst || !hasExplicitSortOrder)) {
        const minimum = await client.query("SELECT COALESCE(min(sort_order),1)::int AS value FROM cms_entries WHERE collection=$1 AND status <> 'archived'", [definition.id]);
        effectiveSortOrder = Number(minimum.rows[0].value) - 1;
      }
      const result = await client.query(
        `INSERT INTO cms_entries (collection, entry_key, status, sort_order, data_en, data_hi, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
        [definition.id, entryKey, status, effectiveSortOrder, dataEn, dataHi, req.cmsUser.id]
      );
      await audit(client, req, "create", result.rows[0], null, result.rows[0]);
      if (definition.id === "divisions") {
        const synced = await syncDivisionPage(client, result.rows[0], { actorId: req.cmsUser.id });
        if (synced.changed) {
          await audit(client, req, "sync_division_page", synced.row, synced.before, synced.row);
        }
      }
      return result.rows[0];
    });
    invalidatePublicContentCache();
    res.status(201).json({ data: publicEntry(row) });
  } catch (error) { next(error); }
});

app.put("/api/admin/content/:collection/:id", writeLimiter, requireCsrf, async (req, res, next) => {
  try {
    const { definition, dataEn, dataHi, status, sortOrder } = validateEntryPayload(req.params.collection, req.body || {});
    const expectedVersion = Number(req.body?.version);
    const entryKey = entryKeyFor(req.body, dataEn);
    const row = await withTransaction(async (client) => {
      const before = await client.query("SELECT * FROM cms_entries WHERE id=$1 AND collection=$2 FOR UPDATE", [req.params.id, definition.id]);
      if (!before.rows[0]) throw Object.assign(new Error("Content item not found"), { status: 404 });
      assertEntryAccess(req, definition.id, before.rows[0]);
      assertEntryAccess(req, definition.id, { ...before.rows[0], entry_key: entryKey, data_en: dataEn });
      if (before.rows[0].version !== expectedVersion) throw Object.assign(new Error("Content changed in another session. Reload before saving."), { status: 409 });
      if (definition.id === "profiles") await assertUniqueProfile(client, dataEn, status, req.params.id);
      if (definition.id === "page_display_settings") await assertUniquePageDisplayPath(client, dataEn, status, req.params.id);
      let nextDataEn = preserveStoredUndeclaredFields(definition, before.rows[0].data_en, dataEn);
      let nextDataHi = preserveStoredUndeclaredFields(definition, before.rows[0].data_hi, dataHi);
      if (definition.id === "site_settings") {
        assertSiteSettingsChanges(req, before.rows[0], nextDataEn, nextDataHi);
      }
      let formerRosterProfileChanges = [];
      if (definition.id === "pages") {
        const preparedRoster = await prepareFormerRosterSave(
          client,
          before.rows[0],
          nextDataEn,
          nextDataHi,
          { actorId: req.cmsUser.id }
        );
        nextDataEn = preparedRoster.dataEn;
        nextDataHi = preparedRoster.dataHi;
        formerRosterProfileChanges = preparedRoster.profileChanges;
      }
      const updated = await client.query(
        `UPDATE cms_entries SET entry_key=$1, status=$2, sort_order=$3, data_en=$4, data_hi=$5,
                version=version+1, updated_by=$6 WHERE id=$7 RETURNING *`,
        [entryKey, status, sortOrder, nextDataEn, nextDataHi, req.cmsUser.id, req.params.id]
      );
      await audit(client, req, "update", updated.rows[0], before.rows[0], updated.rows[0]);
      for (const change of formerRosterProfileChanges) {
        await audit(
          client,
          req,
          "sync_former_roster_profile",
          change.after,
          change.before,
          change.after
        );
      }
      if (definition.id === "divisions") {
        const synced = await syncDivisionPage(client, updated.rows[0], {
          previousDivisionData: before.rows[0].data_en,
          actorId: req.cmsUser.id,
        });
        if (synced.changed) {
          await audit(client, req, "sync_division_page", synced.row, synced.before, synced.row);
        }
      } else if (definition.id === "pages") {
        const synced = await syncDivisionStatusFromPage(client, updated.rows[0], {
          previousPageData: before.rows[0].data_en,
          actorId: req.cmsUser.id,
        });
        if (synced.changed) {
          await audit(client, req, "sync_division_status", synced.row, synced.before, synced.row);
        }
      }
      return updated.rows[0];
    });
    invalidatePublicContentCache();
    res.json({ data: publicEntry(row) });
  } catch (error) { next(error); }
});

app.delete("/api/admin/content/:collection/:id", writeLimiter, requireCsrf, async (req, res, next) => {
  try {
    const row = await withTransaction(async (client) => {
      const before = await client.query("SELECT * FROM cms_entries WHERE id=$1 AND collection=$2 FOR UPDATE", [req.params.id, req.params.collection]);
      if (!before.rows[0]) throw Object.assign(new Error("Content item not found"), { status: 404 });
      assertEntryAccess(req, req.params.collection, before.rows[0]);
      const archived = await client.query("UPDATE cms_entries SET status='archived', version=version+1, updated_by=$1 WHERE id=$2 RETURNING *", [req.cmsUser.id, req.params.id]);
      await audit(client, req, "archive", archived.rows[0], before.rows[0], archived.rows[0]);
      if (req.params.collection === "divisions") {
        const synced = await syncDivisionPage(client, archived.rows[0], {
          previousDivisionData: before.rows[0].data_en,
          actorId: req.cmsUser.id,
        });
        if (synced.changed) {
          await audit(client, req, "sync_division_page", synced.row, synced.before, synced.row);
        }
      } else if (req.params.collection === "pages") {
        const synced = await syncDivisionStatusFromPage(client, archived.rows[0], {
          previousPageData: before.rows[0].data_en,
          actorId: req.cmsUser.id,
        });
        if (synced.changed) {
          await audit(client, req, "sync_division_status", synced.row, synced.before, synced.row);
        }
      }
      return archived.rows[0];
    });
    invalidatePublicContentCache();
    res.json({ data: publicEntry(row) });
  } catch (error) { next(error); }
});

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml", "application/pdf", "video/mp4", "video/webm", "text/csv", "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      try {
        ensureUploadDirectory();
        callback(null, config.uploadDir);
      } catch (error) {
        callback(error);
      }
    },
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase().slice(0, 12)}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (acceptedTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(Object.assign(
      new Error("Unsupported file type. Use JPG, PNG, WebP, AVIF, GIF, SVG, PDF, MP4, WebM, CSV, DOC, DOCX, XLS, XLSX, PPT or PPTX."),
      { status: 415 }
    ));
  },
});

app.post("/api/admin/media", writeLimiter, requireCsrf, requireAnyContentPermission, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });
    const publicUrl = `${config.publicUrl}/uploads/${req.file.filename}`;
    const { rows } = await pool.query(
      `INSERT INTO cms_media (stored_name, original_name, public_url, mime_type, size_bytes, alt_en, alt_hi, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.file.filename, req.file.originalname, publicUrl, req.file.mimetype, req.file.size, String(req.body?.altEn || ""), String(req.body?.altHi || ""), req.cmsUser.id]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) { next(error); }
});

app.get("/api/admin/media", async (req, res, next) => {
  try {
    if (req.cmsUser.role !== "admin" && !canAccessAny(req.cmsUser, contentPermissionKeys)) {
      throw permissionError("Your account does not have permission to view website media");
    }
    const { rows } = await pool.query("SELECT * FROM cms_media ORDER BY created_at DESC LIMIT 500");
    res.json({ data: rows });
  } catch (error) { next(error); }
});

app.get("/api/admin/audit", async (req, res, next) => {
  try {
    if (!hasCmsPermission(req.cmsUser, "audit")) throw permissionError();
    const { rows } = await pool.query(
      `SELECT a.id, a.action, a.collection, a.entry_key, a.created_at, u.username, u.display_name
       FROM cms_audit_log a LEFT JOIN cms_users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 250`
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
});

app.get("/api/admin/feedback", async (req, res, next) => {
  try {
    if (!hasCmsPermission(req.cmsUser, "feedback")) throw permissionError();
    const { rows } = await pool.query("SELECT * FROM cms_feedback ORDER BY created_at DESC LIMIT 500");
    res.json({ data: rows });
  } catch (error) { next(error); }
});

app.post("/api/admin/feedback/:id/send", writeLimiter, requireCsrf, async (req, res, next) => {
  try {
    if (!hasCmsPermission(req.cmsUser, "feedback")) throw permissionError();
    if (!feedbackMailConfigured()) {
      return res.status(503).json({ error: "Feedback email is not configured on this server" });
    }
    const { rows } = await pool.query("SELECT * FROM cms_feedback WHERE id=$1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Feedback record not found" });
    const feedback = await deliverFeedback(rows[0]);
    if (feedback.delivery_status !== "sent") {
      return res.status(502).json({ error: "Email delivery failed; feedback remains saved in CMS" });
    }
    res.json({ data: feedback });
  } catch (error) { next(error); }
});

if (config.serveBuiltApps) {
  const websiteDist = resolve(process.cwd(), "dist");
  const adminDist = resolve(process.cwd(), "dist-admin");
  const websiteIndex = resolve(websiteDist, "index.html");
  const adminIndex = resolve(adminDist, "index.html");

  if (!existsSync(websiteIndex) || !existsSync(adminIndex)) {
    throw new Error("Production website files are missing. Run npm run build:all before npm start.");
  }

  const immutableAssets = { immutable: true, maxAge: "1y", fallthrough: true };
  const publicFiles = { index: false, maxAge: "1h", fallthrough: true };
  const sendIndex = (file) => (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(file);
  };

  app.use("/cms/assets", express.static(resolve(adminDist, "assets"), immutableAssets));
  app.use("/cms", express.static(adminDist, publicFiles));
  app.get(/^\/cms(?:\/.*)?$/, (req, res, next) => {
    if (extname(req.path)) return next();
    return sendIndex(adminIndex)(req, res);
  });

  app.use("/assets", express.static(resolve(websiteDist, "assets"), immutableAssets));
  app.use(express.static(websiteDist, publicFiles));
  app.get(/^\/(?!api(?:\/|$)|uploads(?:\/|$)|cms(?:\/|$)).*$/, (req, res, next) => {
    if (extname(req.path)) return next();
    return sendIndex(websiteIndex)(req, res);
  });
}

app.use((error, _req, res, _next) => {
  void _next;
  const isUploadError = error instanceof multer.MulterError;
  const isDuplicateEntryKey = error.code === "23505" &&
    error.constraint === "cms_entries_collection_entry_key_key";
  const isDuplicateUsername = error.code === "23505" &&
    error.constraint === "cms_users_username_key";
  const isDuplicateAdministrator = error.code === "23505" &&
    error.constraint === "cms_users_single_administrator_idx";
  const status = isUploadError
    ? error.code === "LIMIT_FILE_SIZE" ? 413 : 400
    : Number(error.status) || (error.code === "23505" ? 409 : 500);
  const message = isUploadError && error.code === "LIMIT_FILE_SIZE"
    ? `File is too large. Maximum size is ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`
    : isDuplicateEntryKey
      ? "Another CMS item already uses this internal key. Leave Internal key blank to generate a unique one."
      : isDuplicateUsername
        ? "This username is already in use. Choose another username."
        : isDuplicateAdministrator
          ? "Only one administrator account is allowed. Create this user as an Editor."
      : error.message;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? "Server error" : message });
});

const server = app.listen(config.port, config.host, () => {
  const mode = config.serveBuiltApps ? "website, CMS and API" : "API";
  console.log(`RSAC ${mode}: http://${config.host}:${config.port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
