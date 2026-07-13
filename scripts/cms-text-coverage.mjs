import { config as loadEnv } from "dotenv";
import pg from "pg";
import { extractPageStructuralTextKeys, extractPageTextFields } from "../src/data/pageTextFields.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const punctuationOnly = /^[\s&,.;:'"`\u0964|/()[\]{}<>\-\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u00b7]+$/u;
const canonical = (value) => String(value || "")
  .replace(/^section\s*:\s*/iu, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("en");

const representedText = (data) => {
  const keys = new Set();
  const labels = new Set([
    canonical(data.title),
    canonical(data.eyebrow),
    canonical(data.summary),
  ].filter(Boolean));

  for (const block of data.blocks || []) {
    if (block.key) keys.add(block.key);
    [block.sourceLabel, block.label, block.value, block.heading]
      .map(canonical)
      .filter(Boolean)
      .forEach((label) => labels.add(label));
    for (const child of block.children || []) {
      if (child.key) keys.add(child.key);
      for (const sourceKey of child.sourceKeys || []) keys.add(sourceKey);
    }
  }

  return { keys, labels };
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
      ORDER BY sort_order, entry_key`
  );
  const failures = [];
  let checkedFields = 0;

  for (const row of rows) {
    for (const [language, data] of [["English", row.data_en], ["Hindi", row.data_hi]]) {
      if (!data?.html) continue;
      const { keys, labels } = representedText(data);
      const usesCategorizedContent = row.data_en?.sectionKey === "divisions" || /^training-division-?$/u.test(row.entry_key);
      const structuralKeys = usesCategorizedContent
        ? extractPageStructuralTextKeys(data.html)
        : new Set();
      const fields = extractPageTextFields(data.html);
      checkedFields += fields.length;
      const missing = fields.filter((field) => {
        const value = String(field.value || "").trim();
        if (!value || punctuationOnly.test(value)) return false;
        return !keys.has(field.key) && !labels.has(canonical(value)) && !structuralKeys.has(field.key);
      });
      if (missing.length) {
        failures.push(`${language} ${row.entry_key}: ${missing.slice(0, 4).map((field) => field.value).join(" | ")}`);
      }
    }
  }

  if (failures.length) {
    throw new Error(`Visible page text is missing CMS coverage:\n${failures.join("\n")}`);
  }
  console.log(`CMS text coverage passed for ${rows.length} pages and ${checkedFields} imported text nodes.`);
} finally {
  await client.end();
}
