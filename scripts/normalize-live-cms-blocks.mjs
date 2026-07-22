import { config as loadEnv } from "dotenv";
import pg from "pg";
import { isDeepStrictEqual } from "node:util";
import {
  importedEditorRows,
  isImportedStructuralRow,
  normalizeEditorText,
} from "../shared/importedEditorRows.js";
import {
  divisionBlockPrimarySection,
  divisionBlockSections,
  divisionChildSection,
  divisionSectionFamily,
} from "../src/data/divisionSectionLabels.js";
import { getDivisionLiveSections } from "../shared/divisionLiveSections.js";
import { collectDivisionSectionKeys } from "./lib/division-sections.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const apply = process.argv.includes("--apply");
const verbose = process.argv.includes("--verbose");
const debug = process.argv.includes("--debug");
const entryFilter = process.argv.find((argument) => argument.startsWith("--entry="))?.slice(8) || "";
const localizedAssetFields = ["alt", "title", "caption", "text", "label"];
const assetIdentity = (asset) => String(
  asset?.key || asset?.sourceValue || asset?.value || asset?.href || asset?.src || ""
);
const childKeys = (child) => [child?.key, ...(child?.sourceKeys || [])].filter(Boolean);
const blockFamily = (block) => divisionSectionFamily(divisionBlockPrimarySection(block));
const sectionFamily = (section) => divisionSectionFamily(section?.label || section?.key);

const firstDifference = (left, right, path = "data") => {
  if (Object.is(left, right)) return null;
  if (typeof left !== typeof right || left === null || right === null) {
    return { path, before: left, after: right };
  }
  if (typeof left !== "object") return { path, before: left, after: right };
  if (Array.isArray(left) !== Array.isArray(right)) return { path, before: left, after: right };
  const leftKeys = Array.isArray(left) ? left.map((_item, index) => index) : Object.keys(left);
  const rightKeys = Array.isArray(right) ? right.map((_item, index) => index) : Object.keys(right);
  const keys = [...new Set([...leftKeys, ...rightKeys])];
  for (const key of keys) {
    if (!(key in left) || !(key in right)) {
      return { path: `${path}.${key}`, before: left[key], after: right[key] };
    }
    const difference = firstDifference(left[key], right[key], `${path}.${key}`);
    if (difference) return difference;
  }
  return null;
};

const dedupeChildren = (children, language) => {
  const byKey = new Map();
  for (const child of children) {
    const key = String(child?.key || child?.sourceKeys?.[0] || "");
    if (!key) continue;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, structuredClone(child));
      continue;
    }
    const currentValue = String(current.value || "").trim();
    const nextValue = String(child.value || "").trim();
    const currentLocalized = language === "hi" && /[\u0900-\u097f]/u.test(currentValue);
    const nextLocalized = language === "hi" && /[\u0900-\u097f]/u.test(nextValue);
    if ((!currentValue && nextValue) || (!currentLocalized && nextLocalized)) {
      byKey.set(key, { ...structuredClone(child), sourceKeys: [...new Set(childKeys(child))] });
      continue;
    }
    current.sourceKeys = [...new Set([...childKeys(current), ...childKeys(child)])];
  }
  return [...byKey.values()];
};

const dedupeAssets = (assets) => {
  const seen = new Set();
  return assets.filter((asset) => {
    const identity = assetIdentity(asset);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

const sectionTextKeys = (section) => new Set(section?.textKeys || []);
const blockTextKeys = (block) => new Set(
  (block?.children || []).flatMap((child) => childKeys(child))
);
const sharedTextKeyCount = (block, section) => {
  const allowed = sectionTextKeys(section);
  return [...blockTextKeys(block)].filter((key) => allowed.has(key)).length;
};
const blockHasFamily = (block, family) =>
  Boolean(family) && (
    blockFamily(block) === family ||
    divisionBlockSections(block).some((label) => divisionSectionFamily(label) === family)
  );
const blockEditorLabels = (block) =>
  [block?.label, block?.value, block?.sourceLabel, block?.heading]
    .map(normalizeEditorText)
    .filter(Boolean);

const referenceBlockFor = (blocks, section, usedIndexes) => {
  const family = sectionFamily(section);
  const scored = (blocks || []).map((block, index) => {
    if (usedIndexes.has(index) || block?.controlsSectionLabel === false) return null;
    const sharedKeys = sharedTextKeyCount(block, section);
    const familyMatch = blockHasFamily(block, family);
    const overviewMatch = section.key === "overview" && !blockFamily(block);
    const mediaMatch = section.key === "map-photos" && (block?.assets || []).length > 0;
    const score = sharedKeys * 1000 + (familyMatch ? 500 : 0) +
      (overviewMatch ? 100 : 0) + (mediaMatch ? 200 : 0) - index;
    return score > 0 ? { block, index, score } : null;
  }).filter(Boolean).sort((left, right) => right.score - left.score);
  const match = scored[0];
  if (match) usedIndexes.add(match.index);
  return match?.block || null;
};

const candidateBlocks = (blocks, section, referenceBlock, slug) => {
  const family = sectionFamily(section);
  const referenceId = String(referenceBlock?.id || "");
  const allowedKeys = sectionTextKeys(section);
  const candidates = (blocks || []).filter((block) => {
    if (referenceId && String(block?.id || "") === referenceId) return true;
    if (blockHasFamily(block, family)) return true;
    if ((block?.children || []).some((child) => childKeys(child).some((key) => allowedKeys.has(key)))) return true;
    return slug === "training-division" && section.key === "training-hostel" &&
      blockFamily(block) === "Map/Photos";
  });
  return candidates.sort((left, right) => {
    const score = (block) =>
      sharedTextKeyCount(block, section) * 1000 +
      (referenceId && String(block?.id || "") === referenceId ? 500 : 0) +
      (blockHasFamily(block, family) ? 100 : 0) +
      (String(block?.id || "").startsWith("official-") ? 10 : 0);
    return score(right) - score(left);
  });
};

const sectionChildren = (blocks, section, referenceBlock, language, slug) => {
  const family = sectionFamily(section);
  const candidates = candidateBlocks(blocks, section, referenceBlock, slug);
  const allowedKeys = new Set(section?.textKeys || []);
  const mediaOnly = section.key === "map-photos" && !(section?.referenceTextKeys || []).length;
  const localizedLabel = normalizeEditorText(section?.label);
  const parity = candidates.find((block) =>
    String(block?.id || "").startsWith("parity-hi-") &&
    blockHasFamily(block, family) &&
    (block?.children || []).length
  );
  const exactLocalized = (blocks || []).find((block) =>
    (block?.children || []).length && blockEditorLabels(block).includes(localizedLabel)
  );
  const semantic = candidates.find((block) =>
    blockHasFamily(block, family) && (block?.children || []).length > 0
  );
  const direct = parity || exactLocalized || semantic || null;
  const directMatchingRows = (direct?.children || []).filter((child) =>
    childKeys(child).some((key) => allowedKeys.has(key))
  );
  const useMergedTrainingRows = language === "hi" && slug === "training-division" &&
    section.key === "training-programmes";
  const useDirectLocalizedRows = language === "hi" && !mediaOnly && direct && !useMergedTrainingRows;
  const source = useDirectLocalizedRows
    ? (parity
        ? parity.children || []
        : directMatchingRows.length
          ? [...directMatchingRows, ...(direct.children || []).filter((child) => child?.isNew)]
          : direct.children || [])
    : candidates.flatMap((block) => (block?.children || []).filter((child) => {
    if (mediaOnly) return false;
    if (childKeys(child).some((key) => allowedKeys.has(key))) return true;
    if (!child?.isNew) return false;
    const familyForChild = divisionSectionFamily(divisionChildSection(child)) || blockFamily(block);
    return !family || familyForChild === family;
  }));
  return { candidates, children: dedupeChildren(source, language) };
};

const localizedAssets = (englishAssets, hindiBlocks) => {
  const hindiAssets = (hindiBlocks || []).flatMap((block) => block?.assets || []);
  return (englishAssets || []).map((asset) => {
    const localized = hindiAssets.find((candidate) =>
      assetIdentity(candidate) === assetIdentity(asset) ||
      String(candidate?.sourceValue || candidate?.value || "") === String(asset?.sourceValue || asset?.value || "")
    );
    const next = structuredClone(asset);
    localizedAssetFields.forEach((field) => {
      next[field] = String(localized?.[field] || "");
    });
    return next;
  });
};

const removeRepeatedMediaRows = (blocks) => {
  const nonMediaValues = new Set(
    (blocks || [])
      .filter((block) => blockFamily(block) !== "Map/Photos")
      .flatMap((block) => block?.children || [])
      .map((child) => normalizeEditorText(child?.value))
      .filter(Boolean)
  );
  return (blocks || []).map((block) => {
    if (blockFamily(block) !== "Map/Photos") return block;
    return {
      ...block,
      children: (block?.children || []).filter((child) => {
        if (child?.isNew) return true;
        const value = normalizeEditorText(child?.value);
        return value && !nonMediaValues.has(value);
      }),
    };
  });
};

const parsedSectionMap = (data, slug) => {
  const parsed = collectDivisionSectionKeys(data?.html, data?.title, slug);
  return {
    parsed,
    byKey: new Map((parsed?.sections || []).map((section) => [section.key, section])),
  };
};

const normalizedDivisionSections = (data, slug) => {
  const { parsed, byKey } = parsedSectionMap(data, slug);
  const definitions = getDivisionLiveSections(slug);
  return {
    parsed,
    sections: definitions.map(({ key, englishLabel, hindiLabel }) => ({
      key,
      englishLabel,
      hindiLabel,
      label: englishLabel,
      textKeys: byKey.get(key)?.textKeys || [],
    })),
  };
};

const normalizeDivisionData = (data, language, slug, englishData = data) => {
  const parsed = collectDivisionSectionKeys(data?.html, data?.title, slug);
  const { sections: englishSections } = normalizedDivisionSections(englishData, slug);
  const localizedByKey = new Map((parsed?.sections || []).map((section) => [section.key, section]));
  const sourceBlocks = data?.blocks || [];
  const englishBlocks = englishData?.blocks || [];
  const usedReferenceIndexes = new Set();

  const blocks = englishSections.map((englishSection, index) => {
    const localizedSection = {
      ...englishSection,
      ...(localizedByKey.get(englishSection.key) || {}),
      referenceTextKeys: englishSection.textKeys || [],
      label: language === "hi" ? englishSection.hindiLabel : englishSection.englishLabel,
    };
    const referenceBlock = referenceBlockFor(englishBlocks, englishSection, usedReferenceIndexes);
    const { candidates, children } = sectionChildren(
      sourceBlocks,
      localizedSection,
      referenceBlock,
      language,
      slug
    );
    const preferred = candidates[0] || referenceBlock || {};
    const englishAssets = language === "en"
      ? dedupeAssets(referenceBlock
          ? referenceBlock?.assets || []
          : candidates.flatMap((block) => block?.assets || []))
      : referenceBlock?.assets || [];
    const assets = language === "en"
      ? englishAssets
      : localizedAssets(englishAssets, candidates);
    const localizedHeading = language === "hi"
      ? englishSection.hindiLabel
      : englishSection.englishLabel;

    return {
      ...structuredClone(referenceBlock || preferred),
      ...structuredClone(preferred),
      id: referenceBlock?.id || `official-${slug}-${String(index + 1).padStart(2, "0")}`,
      value: localizedHeading,
      label: localizedHeading,
      sourceLabel: englishSection.englishLabel,
      controlsSectionLabel: true,
      ...(preferred?.editorMode || referenceBlock?.editorMode
        ? { editorMode: preferred?.editorMode || referenceBlock?.editorMode }
        : {}),
      children,
      assets,
    };
  });

  return cleanStructuralEditorData({
    ...data,
    blocks: removeRepeatedMediaRows(blocks),
  });
};

function cleanStructuralEditorData(data) {
  const blocks = data?.blocks || [];
  const titleTokenSets = [data?.title, data?.baseTitle]
    .map(normalizeEditorText)
    .filter(Boolean)
    .map((value) => new Set(value.split(" ")));
  const structuralNames = new Set([
    data?.title,
    data?.baseTitle,
    ...blocks.filter((block) => block?.controlsSectionLabel !== false)
      .flatMap((block) => [block?.label, block?.value, block?.sourceLabel, block?.heading]),
  ].map(normalizeEditorText).filter(Boolean));

  const cleaned = blocks.map((block) => {
    const children = (block?.children || []).filter((child) => {
      if (child?.isNew) return true;
      const value = normalizeEditorText(child?.value);
      if (!value) return false;
      if (value && structuralNames.has(value)) return false;
      if (blockFamily(block) === "Map/Photos" && value) {
        if (divisionSectionFamily(child?.value) === "Map/Photos") return false;
        const tokens = value.split(" ").filter(Boolean);
        if (
          tokens.length >= 3 &&
          titleTokenSets.some((titleTokens) => tokens.every((token) => titleTokens.has(token)))
        ) return false;
      }
      return !isImportedStructuralRow({
        child,
        referenceChild: child,
        block,
        referenceBlock: block,
        pageData: data,
        referencePageData: data,
      });
    });
    return { ...block, children };
  }).filter((block) =>
    block?.controlsSectionLabel !== false ||
    (block?.children || []).length > 0 ||
    (block?.assets || []).length > 0
  );

  return { ...data, blocks: cleaned };
}

const cleanFacilityData = (data, englishData = null) => {
  const cleaned = cleanStructuralEditorData(data);
  let blocks = (cleaned?.blocks || []).filter((block) => {
    if (block?.controlsSectionLabel !== false) return true;
    const rows = importedEditorRows({
      block,
      referenceBlock: block,
      pageData: cleaned,
      referencePageData: cleaned,
    });
    return rows.length > 0 || (block?.assets || []).length > 0;
  });

  if (englishData) {
    const used = new Set();
    blocks = (englishData?.blocks || []).map((referenceBlock, index) => {
      let localizedIndex = blocks.findIndex((block, position) =>
        !used.has(position) && String(block?.id || "") === String(referenceBlock?.id || "")
      );
      if (localizedIndex < 0 && index < blocks.length && !used.has(index)) localizedIndex = index;
      const localizedBlock = localizedIndex >= 0 ? blocks[localizedIndex] : {};
      if (localizedIndex >= 0) used.add(localizedIndex);
      return {
        ...structuredClone(referenceBlock),
        ...structuredClone(localizedBlock),
        id: referenceBlock?.id || localizedBlock?.id,
        sourceLabel: referenceBlock?.sourceLabel || referenceBlock?.label || "",
        controlsSectionLabel: referenceBlock?.controlsSectionLabel !== false,
        children: localizedBlock?.children || [],
        assets: localizedAssets(referenceBlock?.assets || [], [localizedBlock]),
      };
    });
  }
  return { ...data, blocks };
};

const normalizeEntryData = (row, isDivision) => {
  let dataEn = structuredClone(row.data_en || {});
  let dataHi = structuredClone(row.data_hi || {});
  for (let pass = 0; pass < 8; pass += 1) {
    const nextEn = isDivision
      ? normalizeDivisionData(structuredClone(dataEn), "en", row.entry_key)
      : cleanFacilityData(structuredClone(dataEn));
    const nextHi = isDivision
      ? normalizeDivisionData(structuredClone(dataHi), "hi", row.entry_key, nextEn)
      : cleanFacilityData(structuredClone(dataHi), nextEn);
    if (isDeepStrictEqual(nextEn, dataEn) && isDeepStrictEqual(nextHi, dataHi)) {
      return { dataEn: nextEn, dataHi: nextHi, passes: pass + 1 };
    }
    dataEn = nextEn;
    dataHi = nextHi;
  }
  throw new Error(`${row.entry_key} CMS normalization did not converge.`);
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
const report = [];

try {
  if (apply) await client.query("BEGIN");
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
        AND data_en->>'sectionKey' IN ('divisions', 'facilities')
      ORDER BY sort_order, entry_key
      ${apply ? "FOR UPDATE" : ""}`
  );

  for (const row of rows) {
    if (entryFilter && row.entry_key !== entryFilter) continue;
    const isDivision = row.data_en?.sectionKey === "divisions";
    const { dataEn, dataHi, passes } = normalizeEntryData(row, isDivision);
    if (
      isDeepStrictEqual(dataEn, row.data_en || {}) &&
      isDeepStrictEqual(dataHi, row.data_hi || {})
    ) continue;

    report.push({
      entryKey: row.entry_key,
      englishBlocks: `${row.data_en?.blocks?.length || 0} -> ${dataEn.blocks.length}`,
      hindiBlocks: `${row.data_hi?.blocks?.length || 0} -> ${dataHi.blocks.length}`,
      englishRows: dataEn.blocks.reduce((count, block) => count + (block.children?.length || 0), 0),
      hindiRows: dataHi.blocks.reduce((count, block) => count + (block.children?.length || 0), 0),
      passes,
      ...(verbose ? {
        englishFirstDifference: firstDifference(row.data_en || {}, dataEn),
        hindiFirstDifference: firstDifference(row.data_hi || {}, dataHi),
      } : {}),
      ...(verbose && isDivision ? {
        parserDebug: collectDivisionSectionKeys(row.data_en?.html, row.data_en?.title, row.entry_key)?.debug,
        parsedEnglishSections: (collectDivisionSectionKeys(row.data_en?.html, row.data_en?.title, row.entry_key)?.sections || [])
          .map((section) => `${section.key}:${section.textKeys.length}`),
        normalizedEnglishBlocks: dataEn.blocks.map((block) => ({
          id: block?.id,
          label: block?.label,
          rows: block?.children?.length || 0,
          assets: block?.assets?.length || 0,
        })),
        normalizedHindiBlocks: dataHi.blocks.map((block) => ({
          id: block?.id,
          label: block?.label,
          rows: block?.children?.length || 0,
          assets: block?.assets?.length || 0,
        })),
      } : {}),
      ...(debug && isDivision ? {
        currentEnglishBlocks: row.data_en?.blocks || [],
        currentHindiBlocks: row.data_hi?.blocks || [],
        normalizedEnglishData: dataEn,
        normalizedHindiData: dataHi,
      } : {}),
    });

    if (!apply) continue;
    await client.query(
      "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
      [dataEn, dataHi, row.id]
    );
    await client.query(
      `INSERT INTO cms_audit_log
        (action,collection,entry_id,entry_key,before_data,after_data)
       VALUES ('normalize-live-cms-blocks','pages',$1,$2,$3,$4)`,
      [
        row.id,
        row.entry_key,
        { dataEn: row.data_en, dataHi: row.data_hi },
        { dataEn, dataHi },
      ]
    );
  }

  if (apply) await client.query("COMMIT");
} catch (error) {
  if (apply) await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", changedEntries: report.length, report }, null, 2));
