import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const backendRoot = join(root, "backend", "directus");
const backendEnvPath = join(backendRoot, ".env");
const frontendEnvPath = join(root, ".env.local");
const strict = process.argv.includes("--strict");

const parseEnv = (path) => {
  if (!existsSync(path)) return {};

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

      if (match) {
        values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }

      return values;
    }, {});
};

const checks = [];
const addCheck = (label, ok, detail, required = true) => {
  checks.push({ label, ok, detail, required });
};

const nodeMajor = Number(process.versions.node.split(".")[0]);
addCheck("Node.js 22+", nodeMajor >= 22, process.version);

const psql = spawnSync("psql", ["--version"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
addCheck(
  "PostgreSQL psql client",
  !psql.error && psql.status === 0,
  psql.error ? "not found on PATH" : psql.stdout.trim()
);

const requiredFiles = [
  "package.json",
  "package-lock.json",
  ".env.example",
  "postgres-schema.sql",
  "create-database.sql.example",
  "deployment/rsac-directus.service.example",
  "deployment/nginx-directus.conf.example",
  "extensions/directus-extension-rsac-visit-counter/package.json",
  "extensions/directus-extension-rsac-visit-counter/dist/index.js",
];

requiredFiles.forEach((file) => {
  addCheck(
    `CMS file: ${file}`,
    existsSync(join(backendRoot, file)),
    existsSync(join(backendRoot, file)) ? "present" : "missing"
  );
});

addCheck(
  "Project operations guide",
  existsSync(join(root, "SYSTEM_AND_FLOW.md")),
  existsSync(join(root, "SYSTEM_AND_FLOW.md")) ? "present" : "missing"
);

const backendPackage = JSON.parse(
  readFileSync(join(backendRoot, "package.json"), "utf8")
);
const directusVersion = backendPackage.dependencies?.directus || "";
addCheck(
  "Directus version is pinned",
  Boolean(directusVersion && !/^[~^*]/.test(directusVersion)),
  directusVersion || "not configured"
);

addCheck(
  "Directus dependencies installed",
  existsSync(join(backendRoot, "node_modules", "directus")),
  existsSync(join(backendRoot, "node_modules", "directus"))
    ? "installed"
    : "run npm install --prefix backend/directus",
  false
);

const backendEnv = parseEnv(backendEnvPath);
const requiredBackendEnv = [
  "PUBLIC_URL",
  "DB_CLIENT",
  "DB_HOST",
  "DB_PORT",
  "DB_DATABASE",
  "DB_USER",
  "DB_PASSWORD",
  "KEY",
  "SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "CORS_ORIGIN",
];
const invalidBackendEnv = requiredBackendEnv.filter(
  (key) =>
    !backendEnv[key] ||
    /replace-with|change-me|example\.gov\.in/i.test(backendEnv[key])
);

addCheck(
  "Private Directus environment",
  existsSync(backendEnvPath) && invalidBackendEnv.length === 0,
  !existsSync(backendEnvPath)
    ? "copy backend/directus/.env.example to backend/directus/.env"
    : invalidBackendEnv.length
      ? `complete: ${invalidBackendEnv.join(", ")}`
      : "configured",
  false
);

if (backendEnv.DB_CLIENT) {
  addCheck(
    "PostgreSQL driver selected",
    backendEnv.DB_CLIENT === "pg",
    backendEnv.DB_CLIENT
  );
}

const frontendEnv = parseEnv(frontendEnvPath);
const leakedSecrets = Object.keys(frontendEnv).filter(
  (key) =>
    key.startsWith("VITE_") &&
    /(DB_PASSWORD|DB_USER|DATABASE_URL|ADMIN_PASSWORD|SECRET|PRIVATE_KEY)/i.test(
      key
    )
);
addCheck(
  "No private database credentials in frontend env",
  leakedSecrets.length === 0,
  leakedSecrets.length ? leakedSecrets.join(", ") : "clean"
);

addCheck(
  "Frontend CMS connection",
  frontendEnv.VITE_CMS_ENABLED === "true" && Boolean(frontendEnv.VITE_CMS_URL),
  existsSync(frontendEnvPath)
    ? "set VITE_CMS_ENABLED=true and VITE_CMS_URL after CMS bootstrap"
    : "created automatically by npm run cms:setup",
  false
);

// Production hardening. Required with --production, or automatically when
// PUBLIC_URL is an https address (a deployed server); informational otherwise.
const production =
  process.argv.includes("--production") ||
  /^https:/i.test(backendEnv.PUBLIC_URL || "");
const prodCheck = (label, ok, detail) => addCheck(label, ok, detail, production);

prodCheck(
  "CORS_ORIGIN is an exact origin",
  Boolean(backendEnv.CORS_ORIGIN) &&
    backendEnv.CORS_ORIGIN !== "true" &&
    backendEnv.CORS_ORIGIN !== "*",
  backendEnv.CORS_ORIGIN === "true" || backendEnv.CORS_ORIGIN === "*"
    ? `${backendEnv.CORS_ORIGIN} reflects any origin — set the public site URL`
    : backendEnv.CORS_ORIGIN || "not set"
);
prodCheck(
  "Secure cookies",
  backendEnv.REFRESH_TOKEN_COOKIE_SECURE === "true" &&
    backendEnv.SESSION_COOKIE_SECURE === "true",
  `REFRESH_TOKEN_COOKIE_SECURE=${backendEnv.REFRESH_TOKEN_COOKIE_SECURE}, SESSION_COOKIE_SECURE=${backendEnv.SESSION_COOKIE_SECURE}`
);
prodCheck(
  "HSTS enabled",
  backendEnv.HSTS_ENABLED === "true",
  `HSTS_ENABLED=${backendEnv.HSTS_ENABLED}`
);
prodCheck(
  "Rate limiter enabled",
  backendEnv.RATE_LIMITER_ENABLED === "true",
  `RATE_LIMITER_ENABLED=${backendEnv.RATE_LIMITER_ENABLED}`
);
prodCheck(
  "Strong admin password",
  (backendEnv.ADMIN_PASSWORD || "").length >= 16,
  (backendEnv.ADMIN_PASSWORD || "").length >= 16
    ? "16+ characters"
    : "shorter than 16 characters — rotate before go-live"
);
prodCheck(
  "Frontend talks to CMS over https",
  /^https:/i.test(frontendEnv.VITE_CMS_URL || ""),
  frontendEnv.VITE_CMS_URL || "not set"
);

console.log("RSAC Directus/PostgreSQL CMS preflight\n");
checks.forEach(({ label, ok, detail, required }) => {
  const status = ok ? "PASS" : required ? "FAIL" : "PENDING";
  console.log(`[${status}] ${label}: ${detail}`);
});

const failures = checks.filter((check) => check.required && !check.ok);
const pending = checks.filter((check) => !check.required && !check.ok);

console.log(
  `\n${checks.length - failures.length - pending.length} passed, ${pending.length} pending, ${failures.length} failed.`
);

if (failures.length || (strict && pending.length)) {
  process.exitCode = 1;
}
