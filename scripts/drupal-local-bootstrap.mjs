import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const toolsDir = join(root, ".tools");
const phpDir = join(toolsDir, "php");
const phpExe = join(phpDir, "php.exe");
const composerPhar = join(toolsDir, "composer.phar");
const drupalRoot = join(root, "local-drupal");
const drupalDocroot = join(drupalRoot, "web");
const drushBat = join(drupalRoot, "vendor", "bin", "drush.bat");
const drushPhp = join(drupalRoot, "vendor", "drush", "drush", "drush.php");
const cmsEnvPath = join(root, "cms-drupal", ".env.local");
const frontendEnvPath = join(root, ".env.local");
const postgresAdminPassword =
  process.env.POSTGRES_ADMIN_PASSWORD || process.env.PGPASSWORD || "";

const dbName = "rsac_drupal_local";
const dbUser = "rsac_drupal_local";
const dbPassword = process.env.DRUPAL_DB_PASSWORD || randomBytes(24).toString("base64url");
const drupalAdminPassword =
  process.env.DRUPAL_ADMIN_PASSWORD || randomBytes(24).toString("base64url");

const run = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd || root,
    env: { ...process.env, ...(options.env || {}) },
    stdio: options.stdio || "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${options.label || cmd} failed with code ${result.status}`);
  }

  return result;
};

const commandOutput = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd || root,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  if (result.error || result.status !== 0) {
    return "";
  }

  return `${result.stdout || ""}${result.stderr || ""}`;
};

const ensureDir = (dir) => {
  mkdirSync(dir, { recursive: true });
};

const download = async (url, filePath) => {
  if (existsSync(filePath)) {
    console.log(`Already downloaded: ${filePath}`);
    return;
  }

  ensureDir(dirname(filePath));
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}: ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(filePath, buffer);
};

const sha256 = (filePath) =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

const latestPhpZipUrl = async () => {
  const page = await fetch("https://windows.php.net/downloads/releases/").then((r) =>
    r.text()
  );
  const candidates = [
    /href="([^"]*php-8\.4\.\d+-nts-Win32-vs17-x64\.zip)"/gi,
    /href="([^"]*php-8\.3\.\d+-nts-Win32-vs16-x64\.zip)"/gi,
  ];

  for (const pattern of candidates) {
    const matches = [...page.matchAll(pattern)].map((match) => match[1]);
    if (matches.length) {
      const path = matches[0].startsWith("/")
        ? matches[0]
        : `/downloads/releases/${matches[0].split("/").pop()}`;
      return `https://windows.php.net${path}`;
    }
  }

  throw new Error("Could not find a PHP 8.4/8.3 x64 NTS zip on windows.php.net.");
};

const installPhp = async () => {
  ensureDir(toolsDir);

  if (!existsSync(phpExe)) {
    const phpZipUrl = await latestPhpZipUrl();
    const phpZip = join(toolsDir, phpZipUrl.split("/").pop());
    await download(phpZipUrl, phpZip);
    ensureDir(phpDir);
    run("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${phpZip.replace(/'/g, "''")}' -DestinationPath '${phpDir.replace(/'/g, "''")}' -Force`,
    ]);
  }

  const phpIni = join(phpDir, "php.ini");
  if (!existsSync(phpIni)) {
    const sourceIni = existsSync(join(phpDir, "php.ini-development"))
      ? join(phpDir, "php.ini-development")
      : join(phpDir, "php.ini-production");
    const base = existsSync(sourceIni) ? readFileSync(sourceIni, "utf8") : "";
    writeFileSync(
      phpIni,
      `${base}

; RSAC local Drupal CLI setup.
extension_dir = "ext"
extension=curl
extension=fileinfo
extension=gd
extension=intl
extension=mbstring
extension=openssl
extension=pdo_pgsql
extension=pgsql
extension=pdo_sqlite
extension=sqlite3
extension=sodium
extension=zip
memory_limit = 512M
max_execution_time = 300
date.timezone = Asia/Kolkata
`,
      "utf8"
    );
  }

  run(phpExe, ["-v"]);
};

const installComposer = async () => {
  const alreadyDownloaded = existsSync(composerPhar);
  await download("https://getcomposer.org/download/latest-stable/composer.phar", composerPhar);
  if (!alreadyDownloaded) {
    const expectedHash = await fetch("https://getcomposer.org/download/latest-stable/composer.phar.sha256").then((r) =>
      r.text()
    );
    const actualHash = sha256(composerPhar);
    if (expectedHash.trim() && expectedHash.trim() !== actualHash) {
      throw new Error("Composer checksum mismatch.");
    }
  }
  run(phpExe, [composerPhar, "--version"]);
};

const createDatabase = () => {
  if (!postgresAdminPassword) {
    throw new Error("Set POSTGRES_ADMIN_PASSWORD before running this script.");
  }

  const sqlPath = join(toolsDir, "create-rsac-drupal-db.sql");
  const escapedPassword = dbPassword.replace(/'/g, "''");
  writeFileSync(
    sqlPath,
    `
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${dbUser}') THEN
    CREATE ROLE ${dbUser} LOGIN PASSWORD '${escapedPassword}';
  ELSE
    ALTER ROLE ${dbUser} LOGIN PASSWORD '${escapedPassword}';
  END IF;
END
$$;

SELECT 'CREATE DATABASE ${dbName} OWNER ${dbUser} ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${dbName}')\\gexec
`,
    "utf8"
  );

  run("psql.exe", ["-h", "127.0.0.1", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
    env: { PGPASSWORD: postgresAdminPassword },
  });

  run(
    "psql.exe",
    [
      "-h",
      "127.0.0.1",
      "-U",
      "postgres",
      "-d",
      dbName,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
    ],
    { env: { PGPASSWORD: postgresAdminPassword } }
  );
};

const composer = (...args) => run(phpExe, [composerPhar, ...args]);

const drush = (...args) =>
  run(phpExe, [drushPhp, ...args], {
    cwd: drupalRoot,
    env: { PATH: `${phpDir};${process.env.PATH || ""}` },
    label: "drush",
  });

const drupalInstalled = () => {
  if (!existsSync(drushPhp)) {
    return false;
  }

  const output = commandOutput(phpExe, [drushPhp, "status", "--fields=bootstrap"], {
    cwd: drupalRoot,
    env: { PATH: `${phpDir};${process.env.PATH || ""}` },
  });

  return /Successful/i.test(output);
};

const copyRsacAdminModule = () => {
  const source = join(root, "cms-drupal", "modules", "rsac_admin");
  const destination = join(drupalDocroot, "modules", "custom", "rsac_admin");
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
};

const installDrupal = () => {
  if (!existsSync(join(drupalRoot, "composer.json"))) {
    composer("create-project", "drupal/recommended-project", drupalRoot, "--no-interaction");
  }

  if (!existsSync(drushPhp)) {
    composer("require", "drush/drush", "--working-dir", drupalRoot, "--no-interaction");
  }

  if (!drupalInstalled()) {
    const dbUrl = `pgsql://${dbUser}:${encodeURIComponent(dbPassword)}@127.0.0.1:5432/${dbName}`;
    drush(
      "site:install",
      "standard",
      `--db-url=${dbUrl}`,
      "--site-name=RSAC-UP Headless CMS",
      "--account-name=admin",
      `--account-pass=${drupalAdminPassword}`,
      "--account-mail=admin@example.local",
      "-y"
    );
  }

  copyRsacAdminModule();

  drush(
    "pm:enable",
    "language",
    "content_translation",
    "config_translation",
    "locale",
    "media",
    "media_library",
    "jsonapi",
    "path",
    "menu_ui",
    "rest",
    "serialization",
    "rsac_admin",
    "-y"
  );

  run(phpExe, [drushPhp, "php:script", resolve(root, "cms-drupal", "bootstrap-content-model.php")], {
    cwd: drupalRoot,
    env: { PATH: `${phpDir};${process.env.PATH || ""}` },
    label: "drush php:script",
  });

  configureCors();
  drush("cache:rebuild");
};

const configureCors = () => {
  const servicesPath = join(drupalDocroot, "sites", "default", "services.yml");
  writeFileSync(
    servicesPath,
    `parameters:
  cors.config:
    enabled: true
    allowedHeaders: ['x-csrf-token', 'authorization', 'content-type', 'accept', 'origin', 'x-requested-with']
    allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173']
    exposedHeaders: false
    maxAge: 1000
    supportsCredentials: false
`,
    "utf8"
  );
};

const writeEnvFiles = () => {
  const cmsEnv = `# Local Drupal dev paths. This file is ignored by Git.
PHP_BINARY=${phpExe}
DRUPAL_PROJECT_ROOT=${drupalRoot}
DRUPAL_DOCROOT=${drupalDocroot}
DRUPAL_DB_HOST=127.0.0.1
DRUPAL_DB_PORT=5432
DRUPAL_DB_NAME=${dbName}
DRUPAL_DB_USER=${dbUser}
DRUPAL_DB_PASSWORD=${dbPassword}
`;
  writeFileSync(cmsEnvPath, cmsEnv, "utf8");

  if (!existsSync(frontendEnvPath)) {
    writeFileSync(
      frontendEnvPath,
      `# Local frontend CMS connection used by Vite; all VITE_* values are browser-visible.
VITE_CMS_ENABLED=true
VITE_CMS_PROVIDER=drupal
VITE_CMS_URL=http://localhost:8080
VITE_DRUPAL_JSONAPI_PATH=/jsonapi
VITE_DRUPAL_LANGUAGE_PREFIX_MODE=path
`,
      "utf8"
    );
  }
};

console.log("1/6 Installing portable PHP...");
await installPhp();
console.log("2/6 Installing Composer...");
await installComposer();
console.log("3/6 Preparing PostgreSQL database...");
createDatabase();
console.log("4/6 Installing Drupal...");
installDrupal();
console.log("5/6 Writing local environment files...");
writeEnvFiles();
console.log("6/6 Local Drupal bootstrap complete.");
console.log("");
console.log("Run: npm run cms:start");
console.log("Then: npm run cms:setup");
