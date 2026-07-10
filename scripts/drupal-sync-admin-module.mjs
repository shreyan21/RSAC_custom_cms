import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const source = join(root, "cms-drupal", "modules", "rsac_admin");
const drupalRoot = join(root, "local-drupal");
const docroot = join(drupalRoot, "web");
const destination = join(docroot, "modules", "custom", "rsac_admin");
const php = join(root, ".tools", "php", "php.exe");
const drush = join(drupalRoot, "vendor", "drush", "drush", "drush.php");
const bootstrap = join(root, "cms-drupal", "bootstrap-content-model.php");
const bootstrapArgument = join("cms-drupal", "bootstrap-content-model.php");

for (const path of [source, docroot, php, drush, bootstrap]) {
  if (!existsSync(path)) {
    throw new Error(`Required Drupal path missing: ${path}`);
  }
}

const runDrush = (...args) => {
  const result = spawnSync(php, [drush, `--root=${docroot}`, ...args], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Drush failed with code ${result.status}`);
  }
};

mkdirSync(dirname(destination), { recursive: true });
cpSync(source, destination, { recursive: true, force: true });
runDrush("pm:enable", "rsac_admin", "-y");
runDrush("php:script", bootstrapArgument);
runDrush("cache:rebuild");

console.log("RSAC Drupal collections dashboard ready.");
console.log("Open: http://localhost:8080/admin/content/rsac");
