import { config as loadEnv } from "dotenv";
import pg from "pg";
import { canonicalDivisionSection } from "../src/data/divisionSectionLabels.js";
import {
  extractPageStructuralTextKeys,
  extractPageTextFields,
  extractPageTextTree,
} from "../src/data/pageTextFields.js";
import { collectDivisionSectionKeys } from "./lib/division-sections.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const dryRun = process.argv.includes("--dry-run");
const punctuationOnly = /^[\s&,.;:'"`\u0964|/()[\]{}<>\-\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u00b7]+$/u;
const canonical = (value) => String(value || "")
  .replace(/^section\s*:\s*/iu, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("en");
const sectionIdentity = (value) => canonicalDivisionSection(value) || canonical(value);

const represented = (data) => {
  const keys = new Set();
  const structuralKeys = new Set();
  for (const block of data.blocks || []) {
    const blockTarget = block.editorVisible === false || block.structural || block.controlsSectionLabel === false
      ? structuralKeys
      : keys;
    if (block.key) blockTarget.add(block.key);
    for (const child of block.children || []) {
      const childTarget = child.editorVisible === false || child.structural
        ? structuralKeys
        : keys;
      if (child.key) childTarget.add(child.key);
      for (const sourceKey of child.sourceKeys || []) childTarget.add(sourceKey);
    }
  }
  return { keys, structuralKeys };
};

const ensureDataFields = (data, sectionKey, pageSlug) => {
  if (!data?.html || !Array.isArray(data.blocks)) return { data, changed: false, added: 0 };
  const blocks = structuredClone(data.blocks);
  const { keys, structuralKeys: cmsStructuralKeys } = represented(data);
  const usesCategorizedContent = sectionKey === "divisions" || /^training-division-?$/u.test(pageSlug);
  const structuralKeys = new Set([
    ...extractPageStructuralTextKeys(data.html),
    ...cmsStructuralKeys,
  ]);
  const categorizedSections = usesCategorizedContent
    ? collectDivisionSectionKeys(data.html, data.title, pageSlug)
    : null;
  const visibleKeys = categorizedSections
    ? new Set(categorizedSections.sections.flatMap((section) => section.textKeys || []))
    : null;
  const tree = extractPageTextTree(data.html);
  const bucketByKey = new Map();
  tree.forEach((bucket) => (bucket.children || []).forEach((child) => bucketByKey.set(child.key, bucket)));
  const supplemental = new Map();
  let added = 0;

  for (const field of extractPageTextFields(data.html)) {
    const value = String(field.value || "").trim();
    if (
      !value ||
      punctuationOnly.test(value) ||
      keys.has(field.key) ||
      structuralKeys.has(field.key) ||
      (visibleKeys && !visibleKeys.has(field.key))
    ) continue;

    const bucket = bucketByKey.get(field.key);
    const bucketIdentity = sectionIdentity(bucket?.label);
    const targetIndex = blocks.findIndex((block) =>
      [block.sourceLabel, block.label, block.value]
        .filter(Boolean)
        .some((label) => sectionIdentity(label) === bucketIdentity)
    );
    const child = bucket?.children?.find((item) => item.key === field.key) || field;
    if (targetIndex < 0) {
      const globalKey = `global:${bucketIdentity || "page"}`;
      if (!supplemental.has(globalKey)) supplemental.set(globalKey, []);
      supplemental.get(globalKey).push(child);
    } else if (blocks[targetIndex].editorMode === "numbered_list" || blocks[targetIndex].normalizedItemRows) {
      if (!supplemental.has(targetIndex)) supplemental.set(targetIndex, []);
      supplemental.get(targetIndex).push(child);
    } else {
      blocks[targetIndex].children = [...(blocks[targetIndex].children || []), child];
    }
    keys.add(field.key);
    added += 1;
  }

  [...supplemental.entries()].filter(([targetIndex]) => Number.isInteger(targetIndex)).reverse().forEach(([targetIndex, children]) => {
    const target = blocks[targetIndex];
    blocks.splice(targetIndex + 1, 0, {
      id: `cms-text-${canonical(target.label || target.value).replace(/[^a-z0-9]+/g, "-") || targetIndex}`,
      label: `${target.label || target.value || "Section"} headings`,
      value: `${target.value || target.label || "Section"} headings`,
      sourceLabel: target.sourceLabel || target.label || target.value,
      controlsSectionLabel: false,
      children,
    });
  });
  [...supplemental.entries()].filter(([targetIndex]) => !Number.isInteger(targetIndex)).forEach(([globalKey, children]) => {
    const sourceLabel = bucketByKey.get(children[0]?.key)?.label || "Page content";
    blocks.push({
      id: `cms-text-${canonical(globalKey).replace(/[^a-z0-9]+/g, "-")}`,
      label: `${sourceLabel} additional text`,
      value: `${sourceLabel} additional text`,
      sourceLabel,
      controlsSectionLabel: false,
      children,
    });
  });

  return { data: added ? { ...data, blocks } : data, changed: added > 0, added };
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
      ORDER BY sort_order, entry_key`
  );
  let updated = 0;
  let added = 0;
  for (const row of rows) {
    const sectionKey = row.data_en?.sectionKey || "";
    const english = ensureDataFields(row.data_en, sectionKey, row.entry_key);
    const hindi = ensureDataFields(row.data_hi, sectionKey, row.entry_key);
    if (!english.changed && !hindi.changed) continue;
    updated += 1;
    added += english.added + hindi.added;
    console.log(`${row.entry_key}: English +${english.added}, Hindi +${hindi.added}`);
    if (!dryRun) {
      await client.query(
        `UPDATE cms_entries
            SET data_en = $2::jsonb,
                data_hi = $3::jsonb,
                version = version + 1,
                updated_at = NOW()
          WHERE id = $1`,
        [row.id, JSON.stringify(english.data), JSON.stringify(hindi.data)]
      );
    }
  }
  console.log(`${dryRun ? "Would update" : "Updated"} ${updated} pages with ${added} additional editable text fields.`);
} finally {
  await client.end();
}
