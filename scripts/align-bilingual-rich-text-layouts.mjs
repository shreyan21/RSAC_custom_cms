import { JSDOM } from "jsdom";
import { pool, withTransaction } from "../server/db.js";
import { matchSectionListStructure } from "../admin/src/sectionItemHtml.js";

const apply = process.argv.includes("--apply");
const document = new JSDOM("<!doctype html>").window.document;

const plainText = (html) => {
  const container = document.createElement("div");
  container.innerHTML = String(html || "")
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/<\/(?:p|li|h[2-4]|blockquote|td|th|tr)>/giu, " ");
  return String(container.textContent || "").replace(/\s+/gu, " ").trim();
};

const changes = await withTransaction(async (client) => {
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status <> 'archived'
      ORDER BY entry_key
      FOR UPDATE`
  );
  const repaired = [];

  for (const row of rows) {
    const nextHindi = structuredClone(row.data_hi || {});
    const hindiBlocks = Array.isArray(nextHindi.blocks) ? nextHindi.blocks : [];
    const hindiById = new Map(hindiBlocks.map((block, index) => [block.id, { block, index }]));
    let pageChanged = false;

    for (const [englishIndex, englishBlock] of (row.data_en?.blocks || []).entries()) {
      const match = hindiById.get(englishBlock?.id);
      if (!match || !englishBlock?.contentHtml || !match.block?.contentHtml) continue;
      const aligned = matchSectionListStructure(
        match.block.contentHtml,
        englishBlock.contentHtml,
        document
      );
      if (!aligned.changed) continue;
      if (plainText(aligned.html) !== plainText(match.block.contentHtml)) {
        throw new Error(`${row.entry_key} section ${englishIndex + 1} would change Hindi wording.`);
      }
      hindiBlocks[match.index] = { ...match.block, contentHtml: aligned.html };
      repaired.push({
        page: row.entry_key,
        section: englishBlock.value || `Section ${englishIndex + 1}`,
      });
      pageChanged = true;
    }

    if (apply && pageChanged) {
      nextHindi.blocks = hindiBlocks;
      await client.query(
        `UPDATE cms_entries
            SET data_hi = $1::jsonb,
                version = version + 1,
                updated_at = NOW()
          WHERE id = $2`,
        [JSON.stringify(nextHindi), row.id]
      );
    }
  }

  if (!apply) throw Object.assign(new Error("DRY_RUN"), { repaired });
  return repaired;
}).catch((error) => {
  if (error.message === "DRY_RUN") return error.repaired;
  throw error;
});

console.log(`${apply ? "Aligned" : "Would align"} ${changes.length} safe Hindi page section layout(s).`);
changes.forEach(({ page, section }) => console.log(`- ${page}: ${section}`));

await pool.end();
