import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = join(root, ".env");
const backendPath = join(root, "backend", "directus", ".env");
const templatePath = join(root, "backend", "directus", ".env.example");

const parseEnv = (content) =>
  content.split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (match) {
      values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }

    return values;
  }, {});

const source = existsSync(sourcePath)
  ? parseEnv(readFileSync(sourcePath, "utf8"))
  : {};
const existing = existsSync(backendPath)
  ? parseEnv(readFileSync(backendPath, "utf8"))
  : {};
const requiredSourceKeys = [
  "PG_HOST",
  "PG_PORT",
  "PG_USER",
  "PG_PASSWORD",
  "PG_DATABASE",
];
const missing = requiredSourceKeys.filter((key) => !source[key]);

if (missing.length) {
  throw new Error(
    `Complete these private values in .env before preparing Directus: ${missing.join(", ")}.`
  );
}

const publicUrl =
  source.DIRECTUS_URL ||
  source.VITE_CMS_URL ||
  existing.PUBLIC_URL ||
  "http://localhost:8055";
const adminEmail =
  source.CMS_ADMIN_EMAIL ||
  existing.ADMIN_EMAIL ||
  "admin@local.rsacup.org.in";
const values = {
  HOST: existing.HOST || "0.0.0.0",
  PORT: existing.PORT || "8055",
  PUBLIC_URL: publicUrl,
  LOG_LEVEL: existing.LOG_LEVEL || "info",
  DB_CLIENT: "pg",
  DB_HOST: source.PG_HOST,
  DB_PORT: source.PG_PORT,
  DB_DATABASE: source.PG_DATABASE,
  DB_USER: source.PG_USER,
  DB_PASSWORD: source.PG_PASSWORD,
  KEY: existing.KEY || randomBytes(32).toString("hex"),
  SECRET: existing.SECRET || randomBytes(64).toString("hex"),
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD:
    existing.ADMIN_PASSWORD || randomBytes(24).toString("base64url"),
  CORS_ORIGIN:
    source.FRONTEND_URL ||
    existing.CORS_ORIGIN ||
    "http://localhost:5173",
};

const template = readFileSync(templatePath, "utf8");
const rendered = template
  .split(/\r?\n/)
  .map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);

    return match && values[match[1]] !== undefined
      ? `${match[1]}=${values[match[1]]}`
      : line;
  })
  .join("\n");

writeFileSync(backendPath, `${rendered.replace(/\n+$/, "")}\n`, {
  encoding: "utf8",
  mode: 0o600,
});

console.log("Prepared backend/directus/.env.");
console.log(`Directus URL: ${publicUrl}`);
console.log(`Administrator email: ${adminEmail}`);
console.log(
  "The generated administrator password and application secrets remain only in the ignored backend environment file."
);
