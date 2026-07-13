import { createHash, randomBytes } from "node:crypto";
import { pool } from "./db.js";
import { config } from "./config.js";

export const sessionCookie = "rsac_cms_session";
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export const createSession = async (userId) => {
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO cms_sessions (user_id, token_hash, csrf_token, expires_at) VALUES ($1, $2, $3, $4)",
    [userId, hashToken(token), csrfToken, expiresAt]
  );
  return { token, csrfToken, expiresAt };
};

export const clearSession = async (token) => {
  if (token) await pool.query("DELETE FROM cms_sessions WHERE token_hash = $1", [hashToken(token)]);
};

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: config.cookieSecure,
  path: "/",
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[sessionCookie];
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const { rows } = await pool.query(
      `SELECT s.id AS session_id, s.csrf_token, s.expires_at,
              u.id, u.username, u.display_name, u.role
       FROM cms_sessions s
       JOIN cms_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true`,
      [hashToken(token)]
    );
    if (!rows[0]) {
      res.clearCookie(sessionCookie, sessionCookieOptions);
      return res.status(401).json({ error: "Session expired" });
    }
    req.cmsUser = rows[0];
    req.cmsSessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireCsrf = (req, res, next) => {
  const supplied = req.get("X-CSRF-Token") || "";
  if (!supplied || supplied !== req.cmsUser?.csrf_token) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.cmsUser?.role !== "admin") {
    return res.status(403).json({ error: "Administrator access required" });
  }
  next();
};
