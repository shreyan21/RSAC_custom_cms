import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../server/db.js";
import { slugifyUiLabel, uiLabelDefaults } from "../src/data/uiLabels.js";

const root = process.cwd();
const runtimeRoots = [
  "src/components",
  "src/contexts",
  "src/hooks",
  "src/pages",
  "src/utils",
];
const sourceExtensions = new Set([".js", ".jsx"]);
const forbiddenImports = [
  "data/gallery",
  "data/people",
  "data/formerProfiles",
  "data/floodReportsArchive.generated",
  "data/divisionHindiPhrases",
  "data/siteContent",
  "data/siteSettings",
  "data/menuItems",
  "data/publicInfo",
  "data/mobileApps",
  "data/quickLinks",
  "data/policies",
  "data/officials",
  "data/notices",
  "data/heroVideos",
  "data/geoportals",
  "data/floodReports",
  "data/translations",
];

const listFiles = async (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(relative)));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(relative);
  }
  return files;
};

const decodeLiteral = (quote, body) => {
  if (quote === '"') {
    try {
      return JSON.parse(`"${body}"`);
    } catch {
      return body;
    }
  }
  return body.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
};

const files = (await Promise.all(runtimeRoots.map(listFiles))).flat();
const literalLabels = new Map();
const forbidden = [];

for (const file of files) {
  const source = await readFile(path.join(root, file), "utf8");
  for (const importName of forbiddenImports) {
    if (source.includes(importName)) forbidden.push(`${file}: ${importName}`);
  }

  const pattern = /\b(?:t|translate|localizeOfficialText)\(\s*(["'])([^"'\\]*(?:\\.[^"'\\]*)*)\1(?:\s*,[^)]*)?\s*\)/g;
  for (const match of source.matchAll(pattern)) {
    const value = decodeLiteral(match[1], match[2]).trim();
    if (value) literalLabels.set(slugifyUiLabel(value), value);
  }
}

const missingRegistry = [...literalLabels.entries()]
  .filter(([slug]) => !uiLabelDefaults[slug])
  .map(([, value]) => value);

const settingsResult = await pool.query(
  `SELECT data_en, data_hi
   FROM cms_entries
   WHERE collection='site_settings' AND status <> 'archived'
   ORDER BY sort_order, id
   LIMIT 1`
);
const settings = settingsResult.rows[0];
const labelsEn = settings?.data_en?.settings?.interfaceLabels || {};
const labelsHi = settings?.data_hi?.settings?.interfaceLabels || {};
const required = Object.keys(uiLabelDefaults);
const missingEnglish = required.filter((slug) => !String(labelsEn[slug] || "").trim());
const missingHindi = required.filter((slug) => !String(labelsHi[slug] || "").trim());

const errors = [];
if (forbidden.length) errors.push(`Forbidden runtime data imports:\n- ${forbidden.join("\n- ")}`);
if (missingRegistry.length) errors.push(`t() labels missing from uiLabelDefaults:\n- ${missingRegistry.join("\n- ")}`);
if (missingEnglish.length) errors.push(`CMS English interface labels missing:\n- ${missingEnglish.join("\n- ")}`);
if (missingHindi.length) errors.push(`CMS Hindi interface labels missing:\n- ${missingHindi.join("\n- ")}`);

await pool.end();

if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log(`CMS runtime ownership audit passed: ${files.length} files and ${required.length} bilingual interface labels checked.`);
}
