// Compatibility command for the simple Directus page editor.
// The supported upgrade now lives in cms-upgrade.mjs, which backs up the
// database before adding the language selector, form conditions, and preview.
// It never trims, deletes, or overwrites existing page text rows.
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteArgument = process.argv.find((argument) =>
  argument.startsWith("--site=")
);
const frontendUrl = siteArgument?.slice("--site=".length);
const result = spawnSync(
  process.execPath,
  [join(repoRoot, "scripts", "cms-upgrade.mjs")],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...(frontendUrl ? { FRONTEND_URL: frontendUrl } : {}),
    },
    stdio: "inherit",
  }
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
