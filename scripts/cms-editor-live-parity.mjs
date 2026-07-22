import { config as loadEnv } from "dotenv";
import pg from "pg";
import { getDivisionLiveSections } from "../shared/divisionLiveSections.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const hasText = (value) => String(value || "").trim().length > 0;
const blockHeading = (block) => String(block?.label || block?.value || "").trim();
const assetIdentity = (asset) => ({
  key: String(asset?.key || ""),
  kind: String(asset?.kind || ""),
  target: String(asset?.target || ""),
  sourceValue: String(asset?.sourceValue || asset?.href || asset?.src || ""),
  value: String(asset?.value || asset?.href || asset?.src || ""),
  hidden: Boolean(asset?.hidden),
  isNew: Boolean(asset?.isNew),
});

const duplicateValues = (items) => {
  const counts = new Map();
  items.filter(Boolean).forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
  return [...counts].filter(([, count]) => count > 1).map(([item]) => item);
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

const problems = [];
let checkedPages = 0;
let checkedSections = 0;
let checkedRichFields = 0;
let checkedAssets = 0;

try {
  const { rows } = await client.query(
    `SELECT entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
        AND data_en->>'sectionKey' IN ('divisions', 'facilities', 'academics')
      ORDER BY sort_order, entry_key`
  );

  for (const row of rows) {
    checkedPages += 1;
    const english = row.data_en || {};
    const hindi = row.data_hi || {};
    const englishBlocks = english.blocks || [];
    const hindiBlocks = hindi.blocks || [];
    const isDivision = english.sectionKey === "divisions";
    const contract = isDivision ? getDivisionLiveSections(row.entry_key) : [];

    if (english.sectionContentVersion !== 2 || hindi.sectionContentVersion !== 2) {
      problems.push(`${row.entry_key} has an old section content version.`);
    }

    if (!hasText(english.title) || !hasText(hindi.title)) {
      problems.push(`${row.entry_key} needs English and Hindi page headings.`);
    }

    if (englishBlocks.length !== hindiBlocks.length) {
      problems.push(`${row.entry_key} section count differs: English ${englishBlocks.length}, Hindi ${hindiBlocks.length}.`);
    }

    if (isDivision && !contract.length) {
      problems.push(`${row.entry_key} has no public division section contract.`);
    }
    if (isDivision && englishBlocks.length !== contract.length) {
      problems.push(`${row.entry_key} has ${englishBlocks.length} CMS sections but public site has ${contract.length}.`);
    }

    for (const [language, blocks] of [
      ["English", englishBlocks],
      ["Hindi", hindiBlocks],
    ]) {
      duplicateValues(blocks.map((block) => String(block?.id || ""))).forEach((id) => {
        problems.push(`${row.entry_key} ${language} repeats section id ${id}.`);
      });
      blocks.forEach((block, index) => {
        checkedSections += 1;
        const heading = blockHeading(block) || `section ${index + 1}`;
        checkedRichFields += 1;
        checkedAssets += (block?.assets || []).length;

        if (!String(block?.id || "").trim()) {
          problems.push(`${row.entry_key} ${language} ${heading} has no stable section id.`);
        }
        if (block?.controlsSectionLabel === false) {
          problems.push(`${row.entry_key} ${language} ${heading} is an orphan supplemental block.`);
        }
        if (!Object.hasOwn(block || {}, "contentHtml")) {
          problems.push(`${row.entry_key} ${language} ${heading} has no canonical rich-text field.`);
        }
        if (Object.hasOwn(block || {}, "children")) {
          problems.push(`${row.entry_key} ${language} ${heading} still exposes legacy item rows.`);
        }

        if (isDivision) {
          const expected = contract[index];
          const expectedHeading = language === "English"
            ? expected?.englishLabel
            : expected?.hindiLabel;
          if (blockHeading(block) !== expectedHeading) {
            problems.push(
              `${row.entry_key} ${language} section ${index + 1} is "${blockHeading(block)}"; expected "${expectedHeading}".`
            );
          }
          if (String(block?.sourceLabel || "").trim() !== expected?.englishLabel) {
            problems.push(`${row.entry_key} ${language} ${expectedHeading} has stale source ownership.`);
          }
        }
      });
    }

    const sharedCount = Math.min(englishBlocks.length, hindiBlocks.length);
    for (let index = 0; index < sharedCount; index += 1) {
      const englishBlock = englishBlocks[index];
      const hindiBlock = hindiBlocks[index];
      if (String(englishBlock?.id || "") !== String(hindiBlock?.id || "")) {
        problems.push(`${row.entry_key} section ${index + 1} uses different English/Hindi section ids.`);
      }

      const englishAssets = (englishBlock?.assets || []).map(assetIdentity);
      const hindiAssets = (hindiBlock?.assets || []).map(assetIdentity);
      if (JSON.stringify(englishAssets) !== JSON.stringify(hindiAssets)) {
        problems.push(`${row.entry_key} ${blockHeading(englishBlock)} media differs between English and Hindi.`);
      }
      if (englishAssets.some((identity) => !identity.key && !identity.sourceValue && !identity.value)) {
        problems.push(`${row.entry_key} ${blockHeading(englishBlock)} has media without stable identity.`);
      }
    }
  }
} finally {
  await client.end();
}

if (problems.length) {
  throw new Error(`CMS editor/live parity failed with ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
}

console.log(
  `CMS editor/live parity passed: ${checkedPages} division/facility/academics pages, ` +
  `${checkedSections} localized sections, ${checkedRichFields} canonical rich fields, ` +
  `${checkedAssets} localized media records.`
);
