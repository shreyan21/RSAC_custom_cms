import { config as loadEnv } from "dotenv";
import pg from "pg";
import { hasCanonicalSectionContent } from "../shared/sectionRichContent.js";
import { extractPageTextFields, flattenImportedPageTextFields } from "../src/data/pageTextFields.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const activeBlocks = (data) => (Array.isArray(data?.blocks) ? data.blocks : [])
  .filter((block) => block && !block.hidden);
const punctuationOnly = /^[\s&,.;:'"`\u0964|/()[\]{}<>\-\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u00b7]+$/u;

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND status='published'
      ORDER BY data_en->>'sectionKey', sort_order, entry_key`
  );

  const problems = [];
  const summary = [];
  let canonicalPages = 0;
  let importedPages = 0;
  let visibleFields = 0;

  for (const row of rows) {
    const englishBlocks = activeBlocks(row.data_en);
    const canonical = englishBlocks.some(hasCanonicalSectionContent);
    if (canonical) canonicalPages += 1;
    else importedPages += 1;

    const languages = [
      ["English", row.data_en],
      ["Hindi", row.data_hi],
    ];
    const languageCounts = {};

    for (const [language, data] of languages) {
      const blocks = activeBlocks(data);
      if (canonical) {
        const missing = blocks.filter((block) => !hasCanonicalSectionContent(block));
        missing.forEach((block) => problems.push(
          `${row.entry_key} ${language}: "${block.value || block.label || "section"}" has no rich editor field`
        ));
        languageCounts[language] = blocks.reduce(
          (count, block) => count + extractPageTextFields(block.contentHtml || "").length,
          0
        );
      } else {
        const sourceFields = extractPageTextFields(data?.html || "");
        const ownedKeys = new Set(
          flattenImportedPageTextFields(blocks).map((field) => field.key).filter(Boolean)
        );
        const unowned = sourceFields.filter((field) =>
          !punctuationOnly.test(String(field.value || "")) && !ownedKeys.has(field.key)
        );
        unowned.forEach((field) => problems.push(
          `${row.entry_key} ${language}: visible imported text is not in CMS (${field.value})`
        ));
        languageCounts[language] = ownedKeys.size;
      }
      visibleFields += languageCounts[language];
    }

    summary.push({
      page: row.entry_key,
      area: row.data_en?.sectionKey || "custom",
      editor: canonical ? "rich" : "imported",
      englishFields: languageCounts.English || 0,
      hindiFields: languageCounts.Hindi || 0,
    });
  }

  console.table(summary);
  if (problems.length) {
    throw new Error(`CMS ownership report found ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  }
  console.log(
    `CMS content ownership passed: ${rows.length} pages, ${canonicalPages} rich-editor pages, ` +
    `${importedPages} imported-editor pages, ${visibleFields} bilingual visible fields.`
  );
} finally {
  await client.end();
}
