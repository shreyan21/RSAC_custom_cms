import { config as loadEnv } from "dotenv";
import pg from "pg";
import { localize } from "../server/contentAssembler.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

const problems = [];
let pagesChecked = 0;
let blocksChecked = 0;
let rowsChecked = 0;

try {
  const { rows } = await client.query(
    `SELECT id, collection, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
        AND data_en->>'sectionKey' IN ('divisions', 'facilities')
      ORDER BY sort_order, entry_key`
  );

  for (const row of rows) {
    pagesChecked += 1;
    const hindi = row.data_hi || {};
    const localized = localize({
      ...row,
      data_en: row.data_en || {},
      data_hi: hindi,
    }, "hi");

    for (const field of ["title", "eyebrow", "summary", "html"]) {
      if (String(localized[field] || "") !== String(hindi[field] || "")) {
        problems.push(`${row.entry_key} Hindi ${field} differs from CMS Hindi value.`);
      }
    }

    const sourceBlocks = Array.isArray(hindi.blocks) ? hindi.blocks : [];
    const localizedBlocks = Array.isArray(localized.blocks) ? localized.blocks : [];
    if (JSON.stringify(localizedBlocks) !== JSON.stringify(sourceBlocks)) {
      problems.push(`${row.entry_key} Hindi blocks were changed during API localization.`);
    }

    localizedBlocks.forEach((block) => {
      blocksChecked += 1;
      (block.children || []).forEach((child) => {
        rowsChecked += 1;
        if (!String(child.value || "").trim() && String(child.richText || "").trim()) {
          problems.push(`${row.entry_key} ${block.value || block.sourceLabel || block.id} has rich formatting without visible Hindi text.`);
        }
      });
    });
  }
} finally {
  await client.end();
}

if (problems.length) {
  throw new Error(`No-fallback audit failed with ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
}

console.log(
  `No-fallback audit passed: ${pagesChecked} division/facility pages, ` +
  `${blocksChecked} Hindi sections, ${rowsChecked} Hindi rows. ` +
  "Published Hindi output matches Hindi CMS fields exactly; blank stays blank."
);
