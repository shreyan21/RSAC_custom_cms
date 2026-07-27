import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const apply = process.argv.includes("--apply");
const pageSections = new Set(["divisions", "facilities", "academics", "about-us"]);

const normalize = (value) => String(value || "")
  .replace(/&nbsp;/giu, " ")
  .replace(/<[^>]+>/gu, " ")
  .replace(/[^a-z0-9\u0900-\u097f]+/giu, " ")
  .trim()
  .toLowerCase();

const leadingHeading = (html) => {
  const dom = new JSDOM(`<!doctype html><body>${html || ""}</body>`);
  const first = dom.window.document.body.firstElementChild;
  return first && /^H[2-4]$/u.test(first.tagName)
    ? { dom, element: first, text: normalize(first.textContent) }
    : null;
};

const headingMatchesBlock = (block, headingText) => [
  block?.value,
  block?.sourceLabel,
  block?.label,
].some((value) => normalize(value) === headingText);

const removeLeadingHeading = (block) => {
  const leading = leadingHeading(block?.contentHtml);
  if (!leading) return block;
  leading.element.remove();
  return {
    ...block,
    contentHtml: leading.dom.window.document.body.innerHTML.trim(),
  };
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND status='published'
      ORDER BY entry_key`
  );

  let pagesChanged = 0;
  let sectionsChanged = 0;
  const changedSections = [];

  for (const row of rows) {
    const nextEn = structuredClone(row.data_en || {});
    const nextHi = structuredClone(row.data_hi || {});
    if (!pageSections.has(String(nextEn.sectionKey || ""))) continue;

    const duplicateIds = new Set();
    for (const data of [nextEn, nextHi]) {
      for (const block of data.blocks || []) {
        const leading = leadingHeading(block?.contentHtml);
        if (leading && headingMatchesBlock(block, leading.text)) {
          duplicateIds.add(String(block.id || ""));
        }
      }
    }
    if (!duplicateIds.size) continue;
    const duplicateLabels = (nextEn.blocks || [])
      .filter((block) => duplicateIds.has(String(block.id || "")))
      .map((block) => block.value || block.label || block.sourceLabel || block.id);

    let changed = false;
    for (const data of [nextEn, nextHi]) {
      data.blocks = (data.blocks || []).map((block) => {
        if (!duplicateIds.has(String(block.id || ""))) return block;
        const cleaned = removeLeadingHeading(block);
        if (cleaned === block) return block;
        changed = true;
        sectionsChanged += 1;
        return cleaned;
      });
    }

    if (!changed) continue;
    pagesChanged += 1;
    changedSections.push(`${row.entry_key}: ${duplicateLabels.join(", ")}`);
    if (apply) {
      await client.query(
        `UPDATE cms_entries
            SET data_en=$1, data_hi=$2, version=version+1, updated_at=NOW()
          WHERE id=$3`,
        [nextEn, nextHi, row.id]
      );
    }
  }

  console.log(
    `${apply ? "Cleaned" : "Would clean"} ${sectionsChanged} localized sections across ${pagesChanged} pages.`
  );
  changedSections.forEach((section) => console.log(`- ${section}`));
} finally {
  await client.end();
}
