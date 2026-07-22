import { config as loadEnv } from "dotenv";
import pg from "pg";
import { canonicalDivisionSection } from "../src/data/divisionSectionLabels.js";
import { divisionHindiPhrases } from "../src/data/divisionHindiPhrases.js";
import { hiTranslations } from "../src/data/translations.js";
import { decodeHtmlEntities } from "../src/utils/htmlEntities.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const apply = process.argv.includes("--apply");
const normalize = (value) => decodeHtmlEntities(String(value || ""))
  .replace(/\u00ad/gu, "")
  .replace(/[\u200b-\u200d\ufeff]/gu, "")
  .normalize("NFKC")
  .replace(/\u00a0/gu, " ")
  .replace(/\s+/gu, " ")
  .trim();
const slugify = (value) => normalize(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/gu, "-")
  .replace(/^-+|-+$/gu, "");
const translations = new Map();

Object.entries({ ...divisionHindiPhrases, ...hiTranslations }).forEach(([english, hindi]) => {
  if (!english || !hindi) return;
  translations.set(english, hindi);
  translations.set(normalize(english), hindi);
});

const translated = (value) => translations.get(value) || translations.get(normalize(value));
const translateOrKeep = (value) => translated(value) || value;
const blockFamily = (block) => canonicalDivisionSection(
  block?.sourceLabel || block?.label || block?.value || ""
);

const mergeEnglishFamilyBlocks = (blocks) => {
  const merged = new Map();
  for (const block of blocks || []) {
    const family = blockFamily(block);
    if (!family) continue;
    if (!merged.has(family)) {
      merged.set(family, structuredClone(block));
      continue;
    }

    const target = merged.get(family);
    const childKeys = new Set((target.children || []).map((child) => child?.key).filter(Boolean));
    const assetKeys = new Set((target.assets || []).map((asset) => asset?.key).filter(Boolean));
    target.children = [
      ...(target.children || []),
      ...(block.children || []).filter((child) => !child?.key || !childKeys.has(child.key)),
    ];
    target.assets = [
      ...(target.assets || []),
      ...(block.assets || []).filter((asset) => !asset?.key || !assetKeys.has(asset.key)),
    ];
  }
  return merged;
};

const localizeAsset = (asset, sectionLabel, index) => {
  const localized = structuredClone(asset);
  localized.label = translated(asset.label) || `${sectionLabel} - Media ${index + 1}`;
  for (const key of ["alt", "title", "caption", "text"]) {
    if (asset[key] === undefined) continue;
    localized[key] = translated(asset[key]) || "";
  }
  return localized;
};

const localizeBlock = (block, entryKey, family) => {
  const localizedLabel = translateOrKeep(family);
  const localized = structuredClone(block);
  localized.id = `parity-hi-${slugify(entryKey)}-${slugify(family)}`;
  localized.label = localizedLabel;
  localized.value = localizedLabel;
  localized.sourceLabel = block.sourceLabel || block.label || block.value || family;
  localized.children = (block.children || []).map((child, index) => {
    const value = translateOrKeep(child.value || "");
    return {
      ...structuredClone(child),
      value,
      label: `${localizedLabel} - ${normalize(value).slice(0, 80) || `Item ${index + 1}`}`,
    };
  });
  localized.assets = (block.assets || []).map((asset, index) =>
    localizeAsset(asset, localizedLabel, index)
  );
  return localized;
};

const repairCipdmMediaFields = (dataEn, dataHi) => {
  const englishMap = (dataEn.blocks || []).find((block) => blockFamily(block) === "Map/Photos");
  const hindiMap = (dataHi.blocks || []).find((block) => blockFamily(block) === "Map/Photos");
  if (!englishMap || !hindiMap) return false;

  const before = JSON.stringify({ englishMap, hindiMap });
  const englishRelatedPhotos = (englishMap.children || []).find((child) =>
    ["text-0205", "text-0206"].includes(child.key)
  ) || {};
  englishMap.children = [{
    ...englishRelatedPhotos,
    key: "text-0205",
    value: "Related Photos",
    hidden: false,
  }];
  hindiMap.children = (hindiMap.children || [])
    .filter((child) => !["text-0185", "text-0186"].includes(child.key))
    .map((child) => {
      if (child.key === "text-0187") {
        return {
          ...child,
          hidden: false,
          sourceKeys: ["text-0205"],
        };
      }
      return child;
    });

  return before !== JSON.stringify({ englishMap, hindiMap });
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

const report = [];
let changed = 0;

try {
  if (apply) await client.query("BEGIN");
  const { rows } = await client.query(
    `SELECT id,entry_key,data_en,data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND status='published'
        AND (
          data_en->>'sectionKey'='divisions'
          OR (
            data_en->>'sectionKey'='academics'
            AND data_en->>'slug'='training-division-'
          )
        )
      ORDER BY sort_order,entry_key
      ${apply ? "FOR UPDATE" : ""}`
  );

  for (const row of rows) {
    const dataEn = structuredClone(row.data_en || {});
    const dataHi = structuredClone(row.data_hi || {});
    const englishFamilies = mergeEnglishFamilyBlocks(dataEn.blocks || []);
    const hindiFamilies = new Set((dataHi.blocks || []).map(blockFamily).filter(Boolean));
    const missing = [...englishFamilies.keys()].filter((family) => !hindiFamilies.has(family));
    const additions = missing.map((family) =>
      localizeBlock(englishFamilies.get(family), row.entry_key, family)
    );
    dataHi.blocks = [...(dataHi.blocks || []), ...additions];
    const correctedMediaFields = row.entry_key === "computer-image-processing-division"
      ? repairCipdmMediaFields(dataEn, dataHi)
      : false;
    if (!missing.length && !correctedMediaFields) continue;

    report.push({
      entryKey: row.entry_key,
      addedSections: missing,
      ...(correctedMediaFields ? { correctedMediaFields: true } : {}),
    });

    if (!apply) continue;
    await client.query(
      "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
      [dataEn, dataHi, row.id]
    );
    await client.query(
      `INSERT INTO cms_audit_log
        (action,collection,entry_id,entry_key,before_data,after_data)
       VALUES ('repair-bilingual-section-structure','pages',$1,$2,$3,$4)`,
      [
        row.id,
        row.entry_key,
        { dataEn: row.data_en, dataHi: row.data_hi },
        { dataEn, dataHi },
      ]
    );
    changed += 1;
  }

  if (apply) await client.query("COMMIT");
} catch (error) {
  if (apply) await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(JSON.stringify({
  mode: apply ? "applied" : "dry-run",
  changedEntries: apply ? changed : report.length,
  report,
}, null, 2));
