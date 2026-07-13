import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { collections, getCollection } from "../shared/cmsCollections.js";
import { config } from "./config.js";
import { pool, withTransaction } from "./db.js";
import { assembleBootstrap, localize, readPublishedEntries } from "./contentAssembler.js";
import { clearSession, createSession, requireAdmin, requireAuth, requireCsrf, sessionCookie, sessionCookieOptions } from "./auth.js";
import { validateEntryPayload } from "./contentValidation.js";

mkdirSync(config.uploadDir, { recursive: true });

const app = express();
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
app.use(express.json({ limit: "3mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(config.uploadDir, { immutable: true, maxAge: "1y" }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const publicFormLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });

const slugify = (value) => String(value || "entry")
  .normalize("NFKD").replace(/[^a-zA-Z0-9\s-]/g, "").trim().toLowerCase()
  .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 120) || randomUUID();

const entryKeyFor = (body, dataEn) => {
  const existing = [...String(body?.entryKey || "").trim()]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join("")
    .slice(0, 160);
  return existing || slugify(dataEn.slug || dataEn.roleKey || dataEn.title || dataEn.name || dataEn.label);
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
    res.json({ ok: true, service: "RSAC Custom CMS", database: rows[0].database, time: rows[0].time });
  } catch (error) { next(error); }
});

app.get("/api/content/bootstrap", async (req, res, next) => {
  try {
    const language = req.query.lang === "hi" ? "hi" : "en";
    const rows = await readPublishedEntries();
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.json({ data: assembleBootstrap(rows, language), generatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

app.get("/api/content/version", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT max(updated_at) AS version FROM cms_entries");
    res.set("Cache-Control", "no-store");
    res.json({ version: rows[0].version?.toISOString?.() || "" });
  } catch (error) { next(error); }
});

app.get("/api/content/:collection", async (req, res, next) => {
  try {
    if (!getCollection(req.params.collection)) return res.status(404).json({ error: "Unknown collection" });
    const language = req.query.lang === "hi" ? "hi" : "en";
    const { rows } = await pool.query(
      "SELECT id, entry_key, sort_order, data_en, data_hi, version, updated_at FROM cms_entries WHERE collection=$1 AND status='published' ORDER BY sort_order, entry_key",
      [req.params.collection]
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
    const name = clean(req.body?.name, 160);
    const comments = clean(req.body?.comments, 5000);
    if (!name || !comments) return res.status(400).json({ error: "Name and comments are required" });
    const { rows } = await pool.query(
      `INSERT INTO cms_feedback (name, email, phone, address, country, state, district, comments, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [name, clean(req.body?.email), clean(req.body?.phone, 40), clean(req.body?.address, 1000), clean(req.body?.country), clean(req.body?.state), clean(req.body?.district), comments, req.ip]
    );
    res.status(201).json({ ok: true, id: rows[0].id });
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

app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const { rows } = await pool.query("SELECT * FROM cms_users WHERE username=$1 AND active=true", [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    await pool.query("DELETE FROM cms_sessions WHERE expires_at <= now()");
    const session = await createSession(user.id);
    res.cookie(sessionCookie, session.token, { ...sessionCookieOptions, expires: session.expiresAt });
    res.json({ user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role }, csrfToken: session.csrfToken });
  } catch (error) { next(error); }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.cmsUser.id, username: req.cmsUser.username, displayName: req.cmsUser.display_name, role: req.cmsUser.role }, csrfToken: req.cmsUser.csrf_token });
});

app.post("/api/auth/logout", requireAuth, requireCsrf, async (req, res, next) => {
  try {
    await clearSession(req.cmsSessionToken);
    res.clearCookie(sessionCookie, sessionCookieOptions);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.use("/api/admin", requireAuth);
app.get("/api/admin/schema", (_req, res) => res.json({ collections }));

const cleanUser = (row) => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  role: row.role,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const validateUserInput = (body, { passwordRequired = false } = {}) => {
  const username = String(body?.username || "").trim().toLowerCase();
  const displayName = String(body?.displayName || "").trim().slice(0, 120);
  const role = body?.role === "admin" ? "admin" : "editor";
  const password = String(body?.password || "");
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw Object.assign(new Error("Username must be 3-50 letters, numbers, dots, underscores or hyphens"), { status: 400 });
  if (!displayName) throw Object.assign(new Error("Display name is required"), { status: 400 });
  if ((passwordRequired || password) && (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))) {
    throw Object.assign(new Error("Password must be at least 12 characters with upper-case, lower-case and a number"), { status: 400 });
  }
  return { username, displayName, role, password };
};

app.get("/api/admin/users", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id,username,display_name,role,active,created_at,updated_at FROM cms_users ORDER BY active DESC, role, display_name");
    res.json({ data: rows.map(cleanUser) });
  } catch (error) { next(error); }
});

app.post("/api/admin/users", writeLimiter, requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const input = validateUserInput(req.body, { passwordRequired: true });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const { rows } = await pool.query(
      `INSERT INTO cms_users (username,display_name,password_hash,role)
       VALUES ($1,$2,$3,$4) RETURNING id,username,display_name,role,active,created_at,updated_at`,
      [input.username, input.displayName, passwordHash, input.role]
    );
    await pool.query(
      `INSERT INTO cms_audit_log (user_id,action,collection,entry_id,entry_key,after_data,ip_address)
       VALUES ($1,'create_user','users',$2,$3,$4,$5)`,
      [req.cmsUser.id, rows[0].id, rows[0].username, cleanUser(rows[0]), req.ip]
    );
    res.status(201).json({ data: cleanUser(rows[0]) });
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
      const before = (await client.query("SELECT * FROM cms_users WHERE id=$1 FOR UPDATE", [req.params.id])).rows[0];
      if (!before) throw Object.assign(new Error("User not found"), { status: 404 });
      if (before.role === "admin" && before.active && (!active || input.role !== "admin")) {
        const admins = Number((await client.query("SELECT count(*) AS count FROM cms_users WHERE role='admin' AND active=true")).rows[0].count);
        if (admins <= 1) throw Object.assign(new Error("At least one active administrator is required"), { status: 400 });
      }
      const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : before.password_hash;
      const updated = (await client.query(
        `UPDATE cms_users SET username=$1,display_name=$2,role=$3,active=$4,password_hash=$5
         WHERE id=$6 RETURNING id,username,display_name,role,active,created_at,updated_at`,
        [input.username, input.displayName, input.role, active, passwordHash, req.params.id]
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

app.get("/api/admin/collections", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT collection, count(*) FILTER (WHERE status <> 'archived')::int AS total,
              count(*) FILTER (WHERE status='published')::int AS published,
              count(*) FILTER (WHERE status='draft')::int AS drafts,
              count(*) FILTER (WHERE data_hi <> '{}'::jsonb)::int AS hindi
       FROM cms_entries GROUP BY collection`
    );
    const counts = new Map(rows.map((row) => [row.collection, row]));
    res.json({ data: collections.map((item) => ({ ...item, counts: counts.get(item.id) || { total: 0, published: 0, drafts: 0, hindi: 0 } })) });
  } catch (error) { next(error); }
});

app.get("/api/admin/content/:collection", async (req, res, next) => {
  try {
    if (!getCollection(req.params.collection)) return res.status(404).json({ error: "Unknown collection" });
    const { rows } = await pool.query(
      "SELECT * FROM cms_entries WHERE collection=$1 ORDER BY status='archived', sort_order, updated_at DESC",
      [req.params.collection]
    );
    res.set("Cache-Control", "no-store");
    res.json({ data: rows.map(publicEntry) });
  } catch (error) { next(error); }
});

app.post("/api/admin/content/:collection", writeLimiter, requireCsrf, async (req, res, next) => {
  try {
    const { definition, dataEn, dataHi, status, sortOrder } = validateEntryPayload(req.params.collection, req.body || {});
    let entryKey = entryKeyFor(req.body, dataEn);
    if (definition.autoNewestFirst && !req.body?.entryKey) entryKey = `${entryKey}-${randomUUID().slice(0, 8)}`;
    const row = await withTransaction(async (client) => {
      if (definition.singleton) {
        const existing = await client.query("SELECT id FROM cms_entries WHERE collection=$1 AND status <> 'archived' LIMIT 1", [definition.id]);
        if (existing.rows[0]) throw Object.assign(new Error("This collection allows one active record"), { status: 409 });
      }
      let effectiveSortOrder = sortOrder;
      if (definition.autoNewestFirst) {
        const minimum = await client.query("SELECT COALESCE(min(sort_order),1)::int AS value FROM cms_entries WHERE collection=$1 AND status <> 'archived'", [definition.id]);
        effectiveSortOrder = Number(minimum.rows[0].value) - 1;
      }
      const result = await client.query(
        `INSERT INTO cms_entries (collection, entry_key, status, sort_order, data_en, data_hi, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
        [definition.id, entryKey, status, effectiveSortOrder, dataEn, dataHi, req.cmsUser.id]
      );
      await audit(client, req, "create", result.rows[0], null, result.rows[0]);
      return result.rows[0];
    });
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
      if (before.rows[0].version !== expectedVersion) throw Object.assign(new Error("Content changed in another session. Reload before saving."), { status: 409 });
      const updated = await client.query(
        `UPDATE cms_entries SET entry_key=$1, status=$2, sort_order=$3, data_en=$4, data_hi=$5,
                version=version+1, updated_by=$6 WHERE id=$7 RETURNING *`,
        [entryKey, status, sortOrder, dataEn, dataHi, req.cmsUser.id, req.params.id]
      );
      await audit(client, req, "update", updated.rows[0], before.rows[0], updated.rows[0]);
      return updated.rows[0];
    });
    res.json({ data: publicEntry(row) });
  } catch (error) { next(error); }
});

app.delete("/api/admin/content/:collection/:id", writeLimiter, requireCsrf, async (req, res, next) => {
  try {
    const row = await withTransaction(async (client) => {
      const before = await client.query("SELECT * FROM cms_entries WHERE id=$1 AND collection=$2 FOR UPDATE", [req.params.id, req.params.collection]);
      if (!before.rows[0]) throw Object.assign(new Error("Content item not found"), { status: 404 });
      const archived = await client.query("UPDATE cms_entries SET status='archived', version=version+1, updated_by=$1 WHERE id=$2 RETURNING *", [req.cmsUser.id, req.params.id]);
      await audit(client, req, "archive", archived.rows[0], before.rows[0], archived.rows[0]);
      return archived.rows[0];
    });
    res.json({ data: publicEntry(row) });
  } catch (error) { next(error); }
});

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf", "video/mp4", "video/webm", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase().slice(0, 12)}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, callback) => callback(acceptedTypes.has(file.mimetype) ? null : new Error("Unsupported file type"), acceptedTypes.has(file.mimetype)),
});

app.post("/api/admin/media", writeLimiter, requireCsrf, upload.single("file"), async (req, res, next) => {
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

app.get("/api/admin/media", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM cms_media ORDER BY created_at DESC LIMIT 500");
    res.json({ data: rows });
  } catch (error) { next(error); }
});

app.get("/api/admin/audit", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.action, a.collection, a.entry_key, a.created_at, u.username, u.display_name
       FROM cms_audit_log a LEFT JOIN cms_users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 250`
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
});

app.get("/api/admin/feedback", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM cms_feedback ORDER BY created_at DESC LIMIT 500");
    res.json({ data: rows });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  void _next;
  const status = Number(error.status) || (error.code === "23505" ? 409 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? "Server error" : error.message });
});

const server = app.listen(config.port, "127.0.0.1", () => {
  console.log(`RSAC Custom CMS API: http://localhost:${config.port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
