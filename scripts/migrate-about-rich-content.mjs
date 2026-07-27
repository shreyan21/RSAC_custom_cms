import { config as loadEnv } from "dotenv";
import pg from "pg";
import { SECTION_CONTENT_VERSION } from "../shared/sectionRichContent.js";
import { createLocalizedDivisionBlock } from "../src/data/divisionSectionLabels.js";
import { extractPageTextFields } from "../src/data/pageTextFields.js";
import { buildImportedPageRichHtml } from "./lib/official-section-rich-html.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const editableAboutPages = new Set([
  "read-more-about-us",
  "en-visitors-book",
  "administrative-and-auxiliary-staff",
]);
const apply = process.argv.includes("--apply");
const normalizeText = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const missingImportedRows = (block, contentHtml) => {
  const available = new Map();
  extractPageTextFields(contentHtml).forEach((field) => {
    const value = normalizeText(field.value);
    available.set(value, (available.get(value) || 0) + 1);
  });
  return (block?.children || []).filter((child) => {
    if (child?.hidden || child?.editorVisible === false || child?.structural) return false;
    const value = normalizeText(child?.value);
    if (!value) return false;
    const count = available.get(value) || 0;
    if (!count) return true;
    available.set(value, count - 1);
    return false;
  });
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

let pagesChanged = 0;
let sectionsChanged = 0;
const previews = [];

try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND entry_key = ANY($1::text[])
      ORDER BY entry_key
      FOR UPDATE`,
    [[...editableAboutPages]]
  );

  for (const row of rows) {
    const next = {
      en: structuredClone(row.data_en || {}),
      hi: structuredClone(row.data_hi || {}),
    };
    next.hi.blocks = Array.isArray(next.hi.blocks) ? next.hi.blocks : [];
    (next.en.blocks || []).forEach((englishBlock, index) => {
      if (!next.hi.blocks[index]) {
        next.hi.blocks[index] = createLocalizedDivisionBlock(englishBlock);
      }
    });
    let changed = false;

    for (const language of ["en", "hi"]) {
      const data = next[language];
      const generated = buildImportedPageRichHtml({ data });
      data.blocks = (data.blocks || []).map((block, index) => {
        if (Object.hasOwn(block, "contentHtml")) return block;
        const contentHtml = generated.get(String(block.id || index)) || "";
        const missingRows = missingImportedRows(block, contentHtml);
        if (missingRows.length) {
          throw new Error(
            `${row.entry_key} ${language} ${block.value || block.label}: ` +
            `${missingRows.length} imported row(s) would be lost`
          );
        }
        previews.push({
          page: row.entry_key,
          language,
          section: block.value || block.label || `Section ${index + 1}`,
          characters: contentHtml.length,
          tables: (contentHtml.match(/<table\b/giu) || []).length,
        });
        const migrated = {
          ...block,
          contentHtml,
          legacyChildren: Array.isArray(block.children) ? block.children : [],
        };
        delete migrated.children;
        sectionsChanged += 1;
        changed = true;
        return migrated;
      });
      if (data.blocks.some((block) => Object.hasOwn(block, "contentHtml"))) {
        data.sectionContentVersion = SECTION_CONTENT_VERSION;
      }
    }

    if (!changed) continue;
    if (apply) {
      await client.query(
        `UPDATE cms_entries
            SET data_en=$1, data_hi=$2, version=version+1, updated_at=now()
          WHERE id=$3`,
        [next.en, next.hi, row.id]
      );
    }
    pagesChanged += 1;
  }

  await client.query(apply ? "COMMIT" : "ROLLBACK");
  console.table(previews);
  console.log(JSON.stringify({ mode: apply ? "applied" : "check", pagesChanged, sectionsChanged }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
