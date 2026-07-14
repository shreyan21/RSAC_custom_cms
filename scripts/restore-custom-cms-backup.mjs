import { spawn } from "node:child_process";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const projectRoot = resolve(import.meta.dirname, "..");
const backupsDir = resolve(projectRoot, "backups");
const requestedBackup = process.argv[2];

loadEnv({ path: resolve(projectRoot, ".env.local"), quiet: true });

if (!requestedBackup) {
  throw new Error("Usage: npm run cms:restore -- backups/<postgres-dump.sql>");
}
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL is missing from .env.local.");
}

const backupPath = resolve(projectRoot, requestedBackup);
const backupRelativePath = relative(backupsDir, backupPath);
if (backupRelativePath.startsWith("..") || resolve(backupsDir, backupRelativePath) !== backupPath) {
  throw new Error("The PostgreSQL dump must be inside the project backups folder.");
}
if (!backupPath.toLowerCase().endsWith(".sql")) {
  throw new Error("This restore command accepts a plain-text PostgreSQL .sql dump.");
}

await access(backupPath);
await mkdir(backupsDir, { recursive: true });

const databaseUrl = new URL(process.env.CMS_DATABASE_URL);
const expectedDatabase = String(process.env.CMS_DATABASE_NAME || "rsac_custom_cms");
const targetDatabase = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
if (targetDatabase !== expectedDatabase) {
  throw new Error(`Refusing to restore database ${targetDatabase}; expected ${expectedDatabase}.`);
}

const appRole = decodeURIComponent(databaseUrl.username);
if (!/^[a-z_][a-z0-9_$-]*$/i.test(appRole)) {
  throw new Error("CMS database username contains unsupported identifier characters.");
}
const quotedAppRole = `"${appRole.replaceAll('"', '""')}"`;
const adminDatabaseUrl = new URL(databaseUrl);
if (process.env.POSTGRES_ADMIN_USER && process.env.POSTGRES_ADMIN_PASSWORD) {
  adminDatabaseUrl.username = process.env.POSTGRES_ADMIN_USER;
  adminDatabaseUrl.password = process.env.POSTGRES_ADMIN_PASSWORD;
}
const restoreDatabaseUrl = adminDatabaseUrl.toString();
const restorePassword = decodeURIComponent(adminDatabaseUrl.password);
const cliDatabaseUrl = new URL(adminDatabaseUrl);
cliDatabaseUrl.password = "";
const cliEnvironment = { ...process.env, PGPASSWORD: restorePassword };

const client = new pg.Client({ connectionString: restoreDatabaseUrl });
await client.connect();
const databaseState = (
  await client.query(`
    SELECT current_database() AS database,
           current_user AS username,
           current_setting('server_version') AS server_version,
           (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public') AS public_tables,
           (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public') AS public_functions
  `)
).rows[0];
await client.end();
const serverMajor = Number.parseInt(databaseState.server_version, 10);

const sourceSql = await readFile(backupPath, "utf8");
if (!sourceSql.startsWith("--\n-- PostgreSQL database dump") && !sourceSql.startsWith("--\r\n-- PostgreSQL database dump")) {
  throw new Error(`${basename(backupPath)} is not a PostgreSQL plain-text dump.`);
}
if (/^CREATE DATABASE\s/im.test(sourceSql) || /^\\connect\s/im.test(sourceSql)) {
  throw new Error("Refusing a dump that creates or switches databases.");
}
if (!/CREATE TABLE public\.cms_entries\s*\(/i.test(sourceSql)) {
  throw new Error("The dump does not contain the required public.cms_entries table.");
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const safetyBackupPath = resolve(backupsDir, `pre-restore-${targetDatabase}-${timestamp}.dump`);
const compatibleSqlPath = resolve(backupsDir, `.restore-${targetDatabase}-${timestamp}.sql`);

const run = (command, args) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: projectRoot, env: cliEnvironment, stdio: "inherit", windowsHide: true });
    child.once("error", rejectRun);
    child.once("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with code ${code}.`));
    });
  });

console.log(
  `Target: ${databaseState.database} as ${databaseState.username} on PostgreSQL ${databaseState.server_version} ` +
    `(${databaseState.public_tables} public tables, ${databaseState.public_functions} public functions).`
);
console.log(`Creating safety backup: ${relative(projectRoot, safetyBackupPath)}`);
try {
  await run("pg_dump", ["--format=custom", "--file", safetyBackupPath, cliDatabaseUrl.toString()]);
} catch (error) {
  await unlink(safetyBackupPath).catch(() => undefined);
  throw error;
}

const compatibilityRules = [
  { pattern: /^\\restrict .*\r?\n/gm, label: "restrict" },
  { pattern: /^\\unrestrict .*\r?\n/gm, label: "unrestrict" },
  { pattern: /^SET transaction_timeout = 0;\r?\n/gm, label: "transaction_timeout" },
];
const removed = {};
let compatibleSql = sourceSql;
for (const rule of compatibilityRules) {
  const matches = compatibleSql.match(rule.pattern) || [];
  removed[rule.label] = matches.length;
  compatibleSql = compatibleSql.replace(rule.pattern, "");
}
removed.uuidDefaults = 0;
if (serverMajor < 13) {
  const uuidDefaultPattern = /DEFAULT gen_random_uuid\(\)/g;
  removed.uuidDefaults = (compatibleSql.match(uuidDefaultPattern) || []).length;
  compatibleSql = compatibleSql.replace(uuidDefaultPattern, "DEFAULT public.gen_random_uuid()");
}

const scopedCleanup = `
-- Local restore guard: replace only the custom CMS schema objects.
DROP TABLE IF EXISTS
  public.cms_audit_log,
  public.cms_entries,
  public.cms_feedback,
  public.cms_media,
  public.cms_sessions,
  public.cms_site_visits,
  public.cms_users
CASCADE;
DROP SEQUENCE IF EXISTS public.cms_audit_log_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.cms_feedback_id_seq CASCADE;
DROP FUNCTION IF EXISTS public.cms_touch_updated_at() CASCADE;

`;

const restoreOwnership = `

-- Return the restored application objects to the least-privileged CMS role.
ALTER TABLE public.cms_audit_log OWNER TO ${quotedAppRole};
ALTER TABLE public.cms_entries OWNER TO ${quotedAppRole};
ALTER TABLE public.cms_feedback OWNER TO ${quotedAppRole};
ALTER TABLE public.cms_media OWNER TO ${quotedAppRole};
ALTER TABLE public.cms_sessions OWNER TO ${quotedAppRole};
ALTER TABLE public.cms_site_visits OWNER TO ${quotedAppRole};
ALTER TABLE public.cms_users OWNER TO ${quotedAppRole};
ALTER SEQUENCE public.cms_audit_log_id_seq OWNER TO ${quotedAppRole};
ALTER SEQUENCE public.cms_feedback_id_seq OWNER TO ${quotedAppRole};
ALTER FUNCTION public.cms_touch_updated_at() OWNER TO ${quotedAppRole};
GRANT USAGE ON SCHEMA public TO ${quotedAppRole};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${quotedAppRole};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${quotedAppRole};
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${quotedAppRole};
`;

await writeFile(compatibleSqlPath, scopedCleanup + compatibleSql + restoreOwnership, "utf8");
console.log(
  `Prepared PostgreSQL compatibility copy ` +
    `(removed ${removed.restrict} restrict, ${removed.unrestrict} unrestrict, ${removed.transaction_timeout} transaction_timeout directives; ` +
    `qualified ${removed.uuidDefaults} UUID defaults).`
);

try {
  await run("psql", [
    "--no-psqlrc",
    "--set",
    "ON_ERROR_STOP=1",
    "--single-transaction",
    "--dbname",
    cliDatabaseUrl.toString(),
    "--file",
    compatibleSqlPath,
  ]);
} finally {
  await unlink(compatibleSqlPath).catch(() => undefined);
}

const verificationClient = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await verificationClient.connect();
const restored = (
  await verificationClient.query(`
    SELECT count(*)::int AS entries,
           count(*) FILTER (WHERE status = 'published')::int AS published,
           count(DISTINCT collection)::int AS collections
    FROM cms_entries
  `)
).rows[0];
await verificationClient.end();

console.log(
  `Restore complete: ${restored.entries} entries, ${restored.published} published, ${restored.collections} collections. ` +
    `Safety backup retained at ${relative(projectRoot, safetyBackupPath)}.`
);
