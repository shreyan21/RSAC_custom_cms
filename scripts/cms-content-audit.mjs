import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { collections } from "../shared/cmsCollections.js";

loadEnv({ path: ".env.local", quiet: true });
const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  "SELECT collection,entry_key,data_en,data_hi FROM cms_entries WHERE status='published' ORDER BY collection,sort_order,entry_key"
);
await client.end();

const schemas = new Map(collections.map((collection) => [collection.id, collection]));
const devanagari = /[\u0900-\u097f]/u;
const missingRequiredHindi = [];
const missingPageBodies = [];
const englishLanguageLeaks = [];
const identicalLocalizedFields = [];
const mediaPaths = new Set();

const collectStrings = (value, path = "", output = []) => {
  if (typeof value === "string") output.push([path, value]);
  else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, output));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => collectStrings(item, path ? `${path}.${key}` : key, output));
  return output;
};

for (const row of rows) {
  const schema = schemas.get(row.collection);
  for (const field of schema?.fields || []) {
    if (field.localized === false) continue;
    const english = row.data_en?.[field.name];
    const hindi = row.data_hi?.[field.name];
    if (field.required && english && !hindi) missingRequiredHindi.push(`${row.collection}/${row.entry_key}:${field.name}`);
    if (typeof english === "string" && typeof hindi === "string" && english.length > 20 && english === hindi && /[A-Za-z]/.test(english)) {
      identicalLocalizedFields.push(`${row.collection}/${row.entry_key}:${field.name}`);
    }
  }
  if (row.collection === "pages" && row.data_en?.html && !row.data_hi?.html) missingPageBodies.push(row.entry_key);
  for (const field of schema?.fields || []) {
    const value = row.data_en?.[field.name];
    if (field.localized !== false && ["text", "textarea"].includes(field.type) && typeof value === "string" && devanagari.test(value)) {
      englishLanguageLeaks.push(`${row.collection}/${row.entry_key}:${field.name}`);
    }
  }
  for (const [, value] of [...collectStrings(row.data_en), ...collectStrings(row.data_hi)]) {
    for (const match of value.matchAll(/\/cms-media\/[A-Za-z0-9_./-]+/g)) mediaPaths.add(match[0]);
  }
}

const missingMedia = [];
for (const mediaPath of mediaPaths) {
  try {
    await access(resolve("public", mediaPath.replace(/^\//, "")));
  } catch {
    missingMedia.push(mediaPath);
  }
}

const report = {
  entries: rows.length,
  collections: new Set(rows.map((row) => row.collection)).size,
  missingRequiredHindi,
  missingPageBodies,
  englishLanguageLeaks,
  identicalLocalizedFields,
  missingMedia,
};
console.log(JSON.stringify(report, null, 2));
if (missingRequiredHindi.length || missingPageBodies.length || englishLanguageLeaks.length || missingMedia.length) process.exitCode = 1;
