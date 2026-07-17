import { spawn } from "node:child_process";
import { mkdir, open, readdir, stat, unlink } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { config as loadEnv } from "dotenv";

const projectRoot = resolve(import.meta.dirname, "..");
const backupsDirectory = resolve(projectRoot, "backups");

loadEnv({ path: resolve(projectRoot, ".env.local"), quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL is missing from .env.local. Run npm run cms:setup first.");
}

const databaseUrl = new URL(process.env.CMS_DATABASE_URL);
const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//u, ""));
const expectedDatabase = String(process.env.CMS_DATABASE_NAME || "rsac_custom_cms");
if (databaseName !== expectedDatabase) {
  throw new Error(`Refusing to back up ${databaseName}; expected ${expectedDatabase}.`);
}

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  "_",
  String(now.getHours()).padStart(2, "0"),
  String(now.getMinutes()).padStart(2, "0"),
  String(now.getSeconds()).padStart(2, "0"),
].join("");
const backupPath = resolve(backupsDirectory, `${expectedDatabase}_${timestamp}.sql`);
const password = decodeURIComponent(databaseUrl.password);
databaseUrl.password = "";

await mkdir(backupsDirectory, { recursive: true });

await new Promise((resolveBackup, rejectBackup) => {
  const child = spawn(
    "pg_dump",
    [
      "--format=plain",
      "--no-owner",
      "--no-privileges",
      "--encoding=UTF8",
      "--file",
      backupPath,
      databaseUrl.toString(),
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, PGPASSWORD: password },
      stdio: "inherit",
      windowsHide: true,
    }
  );
  child.once("error", rejectBackup);
  child.once("exit", (code) => {
    if (code === 0) resolveBackup();
    else rejectBackup(new Error(`pg_dump exited with code ${code}.`));
  });
});

const details = await stat(backupPath);
if (!details.isFile() || details.size < 1024) {
  throw new Error("The new database backup is unexpectedly small. Older backups were kept.");
}

const handle = await open(backupPath, "r");
const headerBuffer = Buffer.alloc(128);
try {
  await handle.read(headerBuffer, 0, headerBuffer.length, 0);
} finally {
  await handle.close();
}
if (!headerBuffer.toString("utf8").includes("PostgreSQL database dump")) {
  throw new Error("The new file is not a valid PostgreSQL plain-text dump. Older backups were kept.");
}

const escapedDatabaseName = expectedDatabase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const generatedBackupPattern = new RegExp(`^${escapedDatabaseName}_\\d{8}_\\d{6}\\.sql$`, "u");
const backupEntries = await readdir(backupsDirectory, { withFileTypes: true });
const olderBackups = backupEntries.filter((entry) =>
  entry.isFile()
  && entry.name !== basename(backupPath)
  && generatedBackupPattern.test(entry.name)
);

for (const entry of olderBackups) {
  const oldBackupPath = resolve(backupsDirectory, entry.name);
  const relativePath = relative(backupsDirectory, oldBackupPath);
  if (!relativePath || relativePath.startsWith("..") || relativePath.includes(sep)) {
    throw new Error(`Refusing to remove a backup outside backups/: ${entry.name}`);
  }
  await unlink(oldBackupPath);
}

console.log(`Database backup created: backups/${basename(backupPath)} (${(details.size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`Removed ${olderBackups.length} older generated backup${olderBackups.length === 1 ? "" : "s"}. The new backup is the only generated database backup kept.`);
