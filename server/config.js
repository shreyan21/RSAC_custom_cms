import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const split = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const bool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

const feedbackRecipients = split(process.env.FEEDBACK_RECIPIENTS);
const feedbackSmtpHost = String(process.env.FEEDBACK_SMTP_HOST || "").trim();
const feedbackFromEmail = String(
  process.env.FEEDBACK_FROM_EMAIL || process.env.FEEDBACK_SMTP_USER || ""
).trim();

export const config = {
  port: Number(process.env.CMS_PORT || 3000),
  databaseUrl: process.env.CMS_DATABASE_URL || "",
  allowedOrigins: split(process.env.CMS_ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"),
  publicUrl: String(process.env.CMS_PUBLIC_URL || "http://localhost:3000").replace(/\/+$/, ""),
  cookieSecure: process.env.CMS_COOKIE_SECURE === "true",
  sessionHours: Number(process.env.CMS_SESSION_HOURS || 8),
  uploadDir: resolve(process.cwd(), process.env.CMS_UPLOAD_DIR || "server/uploads"),
  maxUploadBytes: Number(process.env.CMS_MAX_UPLOAD_BYTES || 25 * 1024 * 1024),
  feedback: {
    recipients: feedbackRecipients,
    fromEmail: feedbackFromEmail,
    fromName: String(process.env.FEEDBACK_FROM_NAME || "RSAC-UP Website").trim(),
    smtpHost: feedbackSmtpHost,
    smtpPort: Number(process.env.FEEDBACK_SMTP_PORT || 587),
    smtpSecure: bool(process.env.FEEDBACK_SMTP_SECURE),
    smtpRequireTls: bool(process.env.FEEDBACK_SMTP_REQUIRE_TLS, true),
    smtpUser: String(process.env.FEEDBACK_SMTP_USER || "").trim(),
    smtpPassword: String(process.env.FEEDBACK_SMTP_PASSWORD || ""),
    enabled: Boolean(feedbackSmtpHost && feedbackFromEmail && feedbackRecipients.length),
  },
};

if (!config.databaseUrl) {
  throw new Error("CMS_DATABASE_URL is missing. Run npm run cms:setup.");
}
