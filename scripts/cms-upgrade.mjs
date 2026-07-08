import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const backendRoot = join(root, "backend", "directus");
const envPath = join(backendRoot, ".env");

if (!existsSync(envPath)) {
  throw new Error("backend/directus/.env is missing. Configure CMS first.");
}

const config = readFileSync(envPath, "utf8")
  .split(/\r?\n/)
  .reduce((values, line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    return values;
  }, {});

const required = ["DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD"];
const missing = required.filter((key) => !config[key]);
if (missing.length) {
  throw new Error(`Complete these CMS values first: ${missing.join(", ")}.`);
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}.`);
  }
};

const databaseArgs = [
  "-h", config.DB_HOST,
  "-p", config.DB_PORT,
  "-U", config.DB_USER,
  "-d", config.DB_DATABASE,
];
const databaseEnv = { ...process.env, PGPASSWORD: config.DB_PASSWORD };
const backupDir = join(root, "backups");
mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const backupPath = join(backupDir, `rsac_pre_cms_upgrade_${timestamp}.sql`);

console.log("1/5 Backing up current PostgreSQL database...");
run(
  "pg_dump",
  [...databaseArgs, "--no-owner", "--no-privileges", "-f", backupPath],
  { cwd: backendRoot, env: databaseEnv }
);

console.log("2/5 Adding missing RSAC tables and fields (existing rows stay)...");
run(
  "psql",
  [
    ...databaseArgs,
    "-v", "ON_ERROR_STOP=1",
    "-f", join(backendRoot, "postgres-schema.sql"),
  ],
  { cwd: backendRoot, env: databaseEnv }
);

const localDirectusUrl =
  process.env.DIRECTUS_URL || `http://127.0.0.1:${config.PORT || "8055"}`;
const cmsEnv = {
  ...process.env,
  ...config,
  DIRECTUS_URL: localDirectusUrl,
  DIRECTUS_ALLOW_FORCE_SEED: "false",
};
const setupScript = join(root, "scripts", "directus-setup.mjs");

console.log("3/5 Applying editor-friendly Directus Studio forms...");
run(process.execPath, [setupScript, "configure"], { env: cmsEnv });

console.log("4/5 Adding only missing starter records...");
run(process.execPath, [setupScript, "seed"], { env: cmsEnv });

console.log("5/5 Validating CMS and public API...");
run(process.execPath, [setupScript, "validate"], { env: cmsEnv });

console.log(`CMS upgrade complete. Existing records preserved. Backup: ${backupPath}`);
