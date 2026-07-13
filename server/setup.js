import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { repairCmsPageParity } from "./pageParityRepairs.js";

const envPath = resolve(".env.local");
loadEnv({ path: envPath, quiet: true });
const { Client } = pg;

const parseEnv = (text) => Object.fromEntries(text.split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, "")]));
const currentText = await readFile(envPath, "utf8").catch(() => "");
const current = { ...parseEnv(currentText), ...process.env };
const adminPassword = current.POSTGRES_ADMIN_PASSWORD;
if (!adminPassword) throw new Error("Set POSTGRES_ADMIN_PASSWORD for local PostgreSQL setup.");

const dbHost = current.POSTGRES_HOST || "127.0.0.1";
const dbPort = Number(current.POSTGRES_PORT || 5432);
const dbName = current.CMS_DATABASE_NAME || "rsac_custom_cms";
const dbUser = current.CMS_DATABASE_USER || "rsac_custom_app";
const existingUrl = current.CMS_DATABASE_URL ? new URL(current.CMS_DATABASE_URL) : null;
const dbPassword = existingUrl?.password ? decodeURIComponent(existingUrl.password) : randomBytes(24).toString("base64url");
const cmsAdminPassword = current.CMS_ADMIN_PASSWORD || randomBytes(18).toString("base64url");
const cmsAdminUsername = current.CMS_ADMIN_USERNAME || "admin";

for (const identifier of [dbName, dbUser]) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) throw new Error(`Unsafe PostgreSQL identifier: ${identifier}`);
}
const ident = (value) => `"${value.replaceAll('"', '""')}"`;
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;

const admin = new Client({ host: dbHost, port: dbPort, database: "postgres", user: current.POSTGRES_ADMIN_USER || "postgres", password: adminPassword });
await admin.connect();
const roleExists = (await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [dbUser])).rowCount > 0;
if (!roleExists) await admin.query(`CREATE ROLE ${ident(dbUser)} LOGIN PASSWORD ${literal(dbPassword)}`);
else await admin.query(`ALTER ROLE ${ident(dbUser)} WITH LOGIN PASSWORD ${literal(dbPassword)}`);
const databaseExists = (await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [dbName])).rowCount > 0;
if (!databaseExists) await admin.query(`CREATE DATABASE ${ident(dbName)} OWNER ${ident(dbUser)} ENCODING 'UTF8' TEMPLATE template0`);
await admin.end();

const databaseUrl = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
const appDb = new Client({ connectionString: databaseUrl });
await appDb.connect();
const schema = await readFile(resolve("server/schema.sql"), "utf8");
await appDb.query(schema);

const passwordHash = await bcrypt.hash(cmsAdminPassword, 12);
await appDb.query(
  `INSERT INTO cms_users (username, display_name, password_hash, role)
   VALUES ($1,$2,$3,'admin')
   ON CONFLICT (username) DO UPDATE SET display_name=EXCLUDED.display_name,
     password_hash=EXCLUDED.password_hash, role='admin', active=true`,
  [cmsAdminUsername.toLowerCase(), "RSAC CMS Administrator", passwordHash]
);

const existingCount = Number((await appDb.query("SELECT count(*) AS count FROM cms_entries")).rows[0].count);
if (existingCount === 0 || current.CMS_FORCE_SEED === "true") {
  const seed = JSON.parse(await readFile(resolve("server/seed-data.generated.json"), "utf8"));
  await appDb.query("BEGIN");
  try {
    for (const entry of seed.entries) {
      await appDb.query(
        `INSERT INTO cms_entries (collection, entry_key, status, sort_order, data_en, data_hi)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (collection, entry_key) DO UPDATE SET status=EXCLUDED.status,
           sort_order=EXCLUDED.sort_order, data_en=EXCLUDED.data_en, data_hi=EXCLUDED.data_hi,
           version=cms_entries.version+1`,
        [entry.collection, entry.entryKey, entry.status, entry.sortOrder, entry.dataEn, entry.dataHi]
      );
    }
    await appDb.query("COMMIT");
    console.log(`Seeded ${seed.entries.length} bilingual CMS entries.`);
  } catch (error) {
    await appDb.query("ROLLBACK");
    throw error;
  }
} else {
  console.log(`Kept ${existingCount} existing CMS entries; seed skipped.`);
}
const repairedPages = await repairCmsPageParity(appDb);
if (repairedPages) console.log(`Repaired ${repairedPages} imported CMS ${repairedPages === 1 ? "entry" : "entries"}.`);
await appDb.end();

const output = [
  "# Local custom CMS configuration. Ignored by Git.",
  "VITE_API_URL=http://localhost:3000",
  "VITE_CMS_ADMIN_URL=http://localhost:5174",
  "CMS_PORT=3000",
  "CMS_PUBLIC_URL=http://localhost:3000",
  "CMS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
  "CMS_COOKIE_SECURE=false",
  "CMS_SESSION_HOURS=8",
  `POSTGRES_HOST=${dbHost}`,
  `POSTGRES_PORT=${dbPort}`,
  `POSTGRES_ADMIN_USER=${current.POSTGRES_ADMIN_USER || "postgres"}`,
  `POSTGRES_ADMIN_PASSWORD=${adminPassword}`,
  `CMS_DATABASE_NAME=${dbName}`,
  `CMS_DATABASE_USER=${dbUser}`,
  `CMS_DATABASE_URL=${databaseUrl}`,
  `CMS_ADMIN_USERNAME=${cmsAdminUsername}`,
  `CMS_ADMIN_PASSWORD=${cmsAdminPassword}`,
  "",
].join("\n");
await writeFile(envPath, output, "utf8");
console.log("Custom CMS database ready. Local admin credentials stored only in .env.local.");
