import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();

const parseEnv = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((acc, line) => {
      const index = line.indexOf("=");
      if (index === -1) return acc;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      acc[key] = value;
      return acc;
    }, {});
};

const frontendEnv = {
  ...parseEnv(join(root, ".env.example")),
  ...parseEnv(join(root, ".env.local")),
};

const fileDrupalEnv = {
  ...parseEnv(join(root, "cms-drupal", ".env.example")),
  ...parseEnv(join(root, "cms-drupal", ".env.local")),
};

const drupalEnv = {
  ...fileDrupalEnv,
  DRUPAL_PROJECT_ROOT:
    process.env.DRUPAL_PROJECT_ROOT || fileDrupalEnv.DRUPAL_PROJECT_ROOT,
  DRUPAL_DOCROOT: process.env.DRUPAL_DOCROOT || fileDrupalEnv.DRUPAL_DOCROOT,
};

const baseUrl = String(
  frontendEnv.VITE_DRUPAL_URL || frontendEnv.VITE_CMS_URL || ""
).replace(/\/+$/, "");
const jsonApiPath = frontendEnv.VITE_DRUPAL_JSONAPI_PATH || "/jsonapi";

const isLocalHost = (hostname) =>
  ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);

const checkJsonApi = async () => {
  if (!baseUrl) {
    return { ok: false, detail: "VITE_CMS_URL is empty" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  const url = `${baseUrl}${jsonApiPath}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.api+json, application/json" },
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      detail: `${response.status} ${url}`,
    };
  } catch (error) {
    return {
      ok: false,
      detail:
        error?.cause?.code ||
        (error?.name === "AbortError" ? "timeout" : error?.message) ||
        "connection failed",
    };
  } finally {
    clearTimeout(timeout);
  }
};

const existing = await checkJsonApi();
if (existing.ok) {
  console.log(`Drupal already running: ${existing.detail}`);
  process.exit(0);
}

if (!baseUrl) {
  console.error("Drupal URL missing. Set VITE_CMS_URL in .env.local.");
  process.exit(1);
}

const parsedUrl = new URL(baseUrl);
if (!isLocalHost(parsedUrl.hostname)) {
  console.error(`Drupal is not reachable at ${baseUrl}: ${existing.detail}`);
  console.error("This script can only start a local Drupal project.");
  process.exit(1);
}

const projectRoot = drupalEnv.DRUPAL_PROJECT_ROOT
  ? resolve(drupalEnv.DRUPAL_PROJECT_ROOT)
  : "";
const docroot = drupalEnv.DRUPAL_DOCROOT
  ? resolve(drupalEnv.DRUPAL_DOCROOT)
    : projectRoot
      ? join(projectRoot, "web")
      : "";
const phpBinary = drupalEnv.PHP_BINARY
  ? resolve(drupalEnv.PHP_BINARY)
  : join(root, ".tools", "php", "php.exe");
const router = join(root, "cms-drupal", "local-router.php");

if (!projectRoot || !existsSync(projectRoot) || !existsSync(join(docroot, "index.php"))) {
  console.error("Local Drupal project not found.");
  console.error("");
  console.error("This React repo has Drupal integration, not Drupal core files.");
  console.error("Create Drupal separately, then set cms-drupal/.env.local:");
  console.error("");
  console.error("DRUPAL_PROJECT_ROOT=D:\\\\path\\\\to\\\\rsac-drupal");
  console.error("DRUPAL_DOCROOT=D:\\\\path\\\\to\\\\rsac-drupal\\\\web");
  console.error("");
  console.error("After that run: npm run cms:start");
  process.exit(1);
}

const phpCheck = spawnSync(phpBinary, ["-v"], { stdio: "ignore" });
if (phpCheck.error || phpCheck.status !== 0) {
  console.error(`PHP not found at ${phpBinary}. Run npm run cms:bootstrap:local first.`);
  process.exit(1);
}

const port = parsedUrl.port || (parsedUrl.protocol === "https:" ? "443" : "80");
const host = parsedUrl.hostname === "::1" ? "127.0.0.1" : parsedUrl.hostname;

console.log(`Starting local Drupal dev server at ${baseUrl}`);
console.log(`Docroot: ${docroot}`);
console.log("Stop with Ctrl+C.");

const child = spawn(phpBinary, ["-S", `${host}:${port}`, "-t", docroot, router], {
  cwd: projectRoot,
  env: { ...process.env, PATH: `${dirname(phpBinary)};${process.env.PATH || ""}` },
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
