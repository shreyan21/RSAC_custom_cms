import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontendEnvPath = join(repoRoot, ".env.local");
const viteBin = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url)
);
const args = process.argv.slice(2);

const parseEnvFile = (path) => {
  if (!existsSync(path)) {
    return {};
  }

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

const frontendEnv = parseEnvFile(frontendEnvPath);
const cmsEnabled = frontendEnv.VITE_CMS_ENABLED === "true";
const cmsProvider = String(frontendEnv.VITE_CMS_PROVIDER || "drupal").toLowerCase();
const cmsUrl = String(
  frontendEnv.VITE_DRUPAL_URL || frontendEnv.VITE_CMS_URL || ""
).replace(/\/+$/, "");

if (cmsEnabled && cmsProvider === "drupal") {
  console.log(`Using configured Drupal CMS at ${cmsUrl || "(not configured)"}`);
} else if (cmsEnabled) {
  console.log("CMS provider is not Drupal; site will use static fallback.");
} else {
  console.log("CMS disabled; site will use static fallback.");
}

const vite = spawn(process.execPath, [viteBin, ...args], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
  stdio: "inherit",
});

vite.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (vite.exitCode === null) {
      vite.kill(signal);
    }
  });
}
