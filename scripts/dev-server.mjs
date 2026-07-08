import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = join(repoRoot, "backend", "directus");
const backendEnvPath = join(backendRoot, ".env");
const frontendEnvPath = join(repoRoot, ".env.local");
const directusCliPath = join(
  backendRoot,
  "node_modules",
  "directus",
  "cli.js"
);
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
const cmsUrl = String(frontendEnv.VITE_CMS_URL || "").replace(/\/+$/, "");
let cmsHostname = "";

if (cmsUrl) {
  try {
    cmsHostname = new URL(cmsUrl).hostname;
  } catch {
    throw new Error(`VITE_CMS_URL is not a valid URL: ${cmsUrl}`);
  }
}

const localCms =
  cmsEnabled &&
  ["localhost", "127.0.0.1", "::1"].includes(cmsHostname);

const isDirectusReady = async () => {
  if (!cmsUrl) {
    return false;
  }

  try {
    const response = await fetch(`${cmsUrl}/server/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.status < 500;
  } catch {
    return false;
  }
};

let directus = null;

if (localCms && !(await isDirectusReady())) {
  if (!existsSync(backendEnvPath) || !existsSync(directusCliPath)) {
    throw new Error(
      "Local Directus is enabled but not prepared. Run npm run cms:setup once."
    );
  }

  console.log("Starting local Directus...");
  directus = spawn(process.execPath, [directusCliPath, "start"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
    stdio: "inherit",
  });

  // Cold boots (Postgres warming up, disk cache cold) can take well over 30s.
  // Wait up to 120s here, but do NOT block the website if Directus is slow.
  for (let attempt = 0; attempt < 240; attempt += 1) {
    if (directus.exitCode !== null || (await isDirectusReady())) {
      break;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  if (await isDirectusReady()) {
    console.log(`Local Directus ready at ${cmsUrl}`);
  } else if (directus.exitCode !== null) {
    // Directus process exited on its own — a real config/DB problem.
    console.warn(
      `Directus exited before it became ready (code ${directus.exitCode}). ` +
        "The website will run on built-in fallback content. " +
        "To diagnose, run: npm run cms:preflight"
    );
  } else {
    // Still starting. Leave it running and start the website anyway; the site
    // uses fallback content until Directus answers, then switches to live.
    console.warn(
      `Directus is still starting at ${cmsUrl}. Continuing — the website uses ` +
        "built-in fallback content until the CMS finishes starting, then picks " +
        "up live content automatically. No action needed on a normal cold boot."
    );
  }
} else if (localCms) {
  console.log(`Using the running local Directus at ${cmsUrl}`);
} else if (cmsEnabled) {
  console.log(`Using the configured cloud Directus at ${cmsUrl}`);
} else {
  console.log("Directus is disabled; using repository fallback content.");
}

const vite = spawn(process.execPath, [viteBin, ...args], {
  cwd: repoRoot,
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
  stdio: "inherit",
});

const stopOwnedDirectus = () => {
  if (directus?.exitCode === null) {
    directus.kill();
  }
};

vite.on("exit", (code, signal) => {
  stopOwnedDirectus();
  process.exit(code ?? (signal ? 1 : 0));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopOwnedDirectus();

    if (vite.exitCode === null) {
      vite.kill(signal);
    }
  });
}
