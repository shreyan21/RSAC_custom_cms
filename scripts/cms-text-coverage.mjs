import { config as loadEnv } from "dotenv";
import pg from "pg";
import {
  applyPageTextFields,
  extractPageStructuralTextKeys,
  extractPageTextFields,
  flattenImportedPageTextFields,
} from "../src/data/pageTextFields.js";
import { normalizeEditorText } from "../shared/importedEditorRows.js";
import { getDivisionLiveSections } from "../shared/divisionLiveSections.js";
import { collectDivisionSectionKeys } from "./lib/division-sections.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const punctuationOnly = /^[\s&,.;:'"`\u0964|/()[\]{}<>\-\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u00b7]+$/u;
const representedText = (data) => {
  const editableKeys = new Set();
  const structuralKeys = new Set();
  const editableValues = new Set();
  const structuralValues = new Set(
    [data.title, data.baseTitle].map(normalizeEditorText).filter(Boolean)
  );

  for (const block of data.blocks || []) {
    [block.label, block.value, block.sourceLabel, block.heading]
      .map(normalizeEditorText)
      .filter(Boolean)
      .forEach((value) => structuralValues.add(value));
    if (block.key) {
      if (
        block.editorVisible === false ||
        block.structural ||
        block.controlsSectionLabel === false
      ) structuralKeys.add(block.key);
      else editableKeys.add(block.key);
    }
    for (const child of block.children || []) {
      const target = child.editorVisible === false || child.structural
        ? structuralKeys
        : editableKeys;
      const valueTarget = child.editorVisible === false || child.structural
        ? structuralValues
        : editableValues;
      if (child.key) target.add(child.key);
      for (const sourceKey of child.sourceKeys || []) target.add(sourceKey);
      const normalizedValue = normalizeEditorText(child.value);
      if (normalizedValue) valueTarget.add(normalizedValue);
    }
  }

  return { editableKeys, structuralKeys, editableValues, structuralValues };
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
      ORDER BY sort_order, entry_key`
  );
  const failures = [];
  let checkedFields = 0;

  for (const row of rows) {
    for (const [language, data] of [["English", row.data_en], ["Hindi", row.data_hi]]) {
      if (!data?.html) continue;
      const {
        editableKeys,
        structuralKeys: cmsStructuralKeys,
        editableValues,
        structuralValues,
      } = representedText(data);
      const usesCategorizedContent = row.data_en?.sectionKey === "divisions" || /^training-division-?$/u.test(row.entry_key);
      const structuralKeys = new Set([
        ...extractPageStructuralTextKeys(data.html),
        ...cmsStructuralKeys,
      ]);
      const categorizedSections = usesCategorizedContent
        ? collectDivisionSectionKeys(data.html, data.title, row.entry_key)
        : null;
      const contractSlug = row.entry_key === "training-division-" ? "training-division" : row.entry_key;
      const liveSectionKeys = new Set(getDivisionLiveSections(contractSlug).map((section) => section.key));
      const visibleKeys = categorizedSections
        ? new Set(categorizedSections.sections
            .filter((section) => !liveSectionKeys.size || liveSectionKeys.has(section.key))
            .flatMap((section) => section.textKeys || []))
        : null;
      const fields = extractPageTextFields(data.html);
      checkedFields += fields.length;
      const missing = fields.filter((field) => {
        const value = String(field.value || "").trim();
        if (
          !value ||
          punctuationOnly.test(value) ||
          (visibleKeys && !visibleKeys.has(field.key))
        ) return false;
        const normalizedValue = normalizeEditorText(value);
        const removableMediaHeading = /^(?:related photos?|photos?|map photos|संबंधित तस्वीरें|तस्वीरें|मानचित्र तस्वीरें)$/u.test(normalizedValue);
        return !editableKeys.has(field.key) &&
          !structuralKeys.has(field.key) &&
          !editableValues.has(normalizedValue) &&
          !structuralValues.has(normalizedValue) &&
          !removableMediaHeading;
      });
      if (missing.length) {
        failures.push(`${language} ${row.entry_key}: ${missing.slice(0, 4).map((field) => field.value).join(" | ")}`);
      }

      const sourceByKey = new Map(fields.map((field) => [field.key, field.value]));
      const blankedSourceCounts = new Map();
      flattenImportedPageTextFields(data.blocks)
        .filter((field) => field.key && String(field.value || "") === "")
        .forEach((field) => {
          const sourceValue = sourceByKey.get(field.key);
          if (!sourceValue) return;
          blankedSourceCounts.set(
            sourceValue,
            (blankedSourceCounts.get(sourceValue) || 0) + 1
          );
        });
      if (blankedSourceCounts.size) {
        const originalCounts = new Map();
        fields.forEach((field) => originalCounts.set(
          field.value,
          (originalCounts.get(field.value) || 0) + 1
        ));
        const renderedCounts = new Map();
        extractPageTextFields(
          applyPageTextFields(data.html, flattenImportedPageTextFields(data.blocks))
        ).forEach((field) => renderedCounts.set(
          field.value,
          (renderedCounts.get(field.value) || 0) + 1
        ));
        const survivors = [...blankedSourceCounts].filter(([value, blankedCount]) =>
          (renderedCounts.get(value) || 0) > (originalCounts.get(value) || 0) - blankedCount
        );
        if (survivors.length) {
          failures.push(
            `${language} ${row.entry_key}: blank CMS fields left source text visible (${survivors.slice(0, 3).map(([value]) => value).join(" | ")})`
          );
        }
      }
    }
  }

  if (failures.length) {
    throw new Error(`Visible page text is missing CMS coverage:\n${failures.join("\n")}`);
  }
  console.log(`CMS text coverage passed for ${rows.length} pages and ${checkedFields} imported text nodes.`);
} finally {
  await client.end();
}
