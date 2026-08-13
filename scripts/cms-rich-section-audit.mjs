import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const normalizeText = (value) => String(value || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/giu, " ")
  .replace(/[^a-z0-9\u0900-\u097f]+/giu, " ")
  .trim()
  .toLowerCase();

const firstBodyItem = (html) => String(html || "").match(
  /^\s*<(?:p|h[2-4]|li|blockquote)[^>]*>([\s\S]*?)<\/(?:p|h[2-4]|li|blockquote)>/iu
)?.[1] || "";

const assetIdentities = (block) => (block?.assets || [])
  .map((asset) => `${asset?.key || ""}|${asset?.kind || ""}|${asset?.value || ""}`)
  .sort();

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(`
    SELECT entry_key, data_en, data_hi
      FROM cms_entries
     WHERE collection = 'pages'
       AND status = 'published'
       AND data_en->>'sectionKey' IN ('divisions', 'facilities', 'academics')
     ORDER BY entry_key
  `);

  const repeatedHeadingBlocks = [];
  const mediaMismatches = [];
  const legacyChildrenBlocks = [];
  let localizedSections = 0;

  for (const row of rows) {
    for (const [language, data] of [["en", row.data_en], ["hi", row.data_hi]]) {
      for (const block of data?.blocks || []) {
        localizedSections += 1;
        const children = Array.isArray(block?.children) ? block.children : [];
        const profileOverrides = children.length > 0 && children.every((child) =>
          String(child?.key || "").startsWith("profile-content:")
        );
        if (Object.hasOwn(block, "children") && !profileOverrides) {
          legacyChildrenBlocks.push(
            `${row.entry_key}:${language}:${block.id || block.value || "unidentified-section"}`
          );
        }
        const heading = normalizeText(block.value || block.sourceLabel || block.label);
        if (heading && normalizeText(firstBodyItem(block.contentHtml)) === heading) {
          repeatedHeadingBlocks.push(`${row.entry_key}:${language}:${block.id || heading}`);
        }
      }
    }

    const englishById = new Map(
      (row.data_en?.blocks || []).map((block) => [String(block.id || ""), assetIdentities(block)])
    );
    for (const block of row.data_hi?.blocks || []) {
      const englishAssets = englishById.get(String(block.id || "")) || [];
      if (JSON.stringify(assetIdentities(block)) !== JSON.stringify(englishAssets)) {
        mediaMismatches.push(`${row.entry_key}:${block.id || "unidentified-section"}`);
      }
    }
  }

  const result = {
    pages: rows.length,
    localizedSections,
    activeLegacyChildren: legacyChildrenBlocks.length,
    legacyChildrenBlocks,
    repeatedHeadingBlocks,
    sharedMediaMismatches: mediaMismatches,
  };
  console.log(JSON.stringify(result, null, 2));

  if (legacyChildrenBlocks.length || repeatedHeadingBlocks.length || mediaMismatches.length) {
    throw new Error("Canonical rich-section audit found migration inconsistencies.");
  }
} finally {
  await client.end();
}
