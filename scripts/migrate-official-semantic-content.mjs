import { config as loadEnv } from "dotenv";
import pg from "pg";
import { legacyRowsToRichHtml } from "../shared/sectionRichContent.js";
import { buildOfficialSectionRichHtml } from "./lib/official-section-rich-html.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const normalizeHtml = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const baselineHtml = (block, data) => legacyRowsToRichHtml({
  ...block,
  contentHtml: undefined,
  children: Array.isArray(block?.legacyChildren) ? block.legacyChildren : [],
}, data);

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
let pagesChanged = 0;
let sectionsChanged = 0;
let editedSectionsPreserved = 0;

try {
  await client.query("BEGIN");
  const { rows } = await client.query(`
    SELECT id, entry_key, data_en, data_hi
      FROM cms_entries
     WHERE collection='pages'
       AND data_en->>'sectionKey' IN ('divisions', 'facilities', 'academics')
     ORDER BY entry_key
     FOR UPDATE
  `);

  for (const row of rows) {
    const next = { en: structuredClone(row.data_en || {}), hi: structuredClone(row.data_hi || {}) };
    let pageChanged = false;
    for (const language of ["en", "hi"]) {
      const data = next[language];
      const generated = buildOfficialSectionRichHtml({ data, fallbackSlug: row.data_en?.slug });
      data.blocks = (data.blocks || []).map((block, index) => {
        const replacement = generated.get(String(block.id || index));
        if (!replacement || !Object.hasOwn(block, "contentHtml")) return block;
        const current = normalizeHtml(block.contentHtml);
        const baseline = normalizeHtml(baselineHtml(block, data));
        if (current !== baseline) {
          editedSectionsPreserved += 1;
          return block;
        }
        if (current === normalizeHtml(replacement)) return block;
        sectionsChanged += 1;
        pageChanged = true;
        return { ...block, contentHtml: replacement };
      });
      data.sectionContentVersion = 2;
    }
    if (!pageChanged && row.data_en?.sectionContentVersion === 2 && row.data_hi?.sectionContentVersion === 2) continue;
    await client.query(
      "UPDATE cms_entries SET data_en=$1, data_hi=$2, version=version+1, updated_at=now() WHERE id=$3",
      [next.en, next.hi, row.id]
    );
    pagesChanged += 1;
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ pagesChanged, sectionsChanged, editedSectionsPreserved }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
