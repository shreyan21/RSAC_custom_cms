import { spawn } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable. Run this command through npm.");
const checks = [
  "cms:validate",
  "cms:ownership-audit",
  "cms:portal-audit",
  "cms:contract-audit",
  "cms:audit-official-core",
  "cms:text-coverage",
  "cms:asset-coverage",
  "cms:no-fallback-audit",
  "cms:audit-rich-sections",
  "cms:audit-semantic-content",
  "cms:test-page-write-through",
  "cms:test-site-write-through",
  "cms:test-visibility",
  "cms:test-section-items",
  "cms:test-section-rendering",
  "cms:test-editor-quote",
  "cms:test-divisions",
  "cms:test-former-roster",
  "cms:media-smoke",
  "cms:smoke",
  "cms:feedback-smoke",
  "cms:flood-check",
  "cms:test-artifacts",
  "build:all",
];

const run = (name) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [npmCli, "run", name], {
    stdio: "inherit",
    shell: false,
  });
  child.once("error", reject);
  child.once("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`${name} failed with exit code ${code}.`));
  });
});

for (const [index, check] of checks.entries()) {
  console.log(`\n[${index + 1}/${checks.length}] ${check}`);
  await run(check);
}

console.log(`\nCMS verification passed: ${checks.length} checks completed successfully.`);
