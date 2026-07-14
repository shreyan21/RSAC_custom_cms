import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import { getCollection } from "../shared/cmsCollections.js";
import { extractPageTextFields } from "../src/data/pageTextFields.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const devanagari = /[\u0900-\u097f]/u;
const latinWord = /[A-Za-z][A-Za-z'-]{1,}/u;
const sharedKeys = new Set([
  "id", "key", "path", "slug", "href", "url", "image", "photo", "video", "file",
  "icon", "iconKey", "sectionKey", "sourceKey", "groupKey", "blockKey", "entryKey",
  "sourceKeys",
  "type", "kind", "layout", "width", "align", "objectPosition", "sort", "sortOrder",
  "active", "enabled", "hidden", "openInNewTab", "mapQuery", "sourceUrl", "externalUrl",
  "controlsSectionLabel", "editorMode", "isNew",
  "keywords", "languageLabels",
  "accent", "radius", "surface", "secondary", "fontFamily", "contentWidth", "cardEyebrowSize",
  "eyebrowSize",
  "documentUrl", "featuredImage", "thumbnail", "poster", "placement", "cardColor",
  "cardColor2", "employeeId", "email", "contact", "phone", "mobile", "date", "year",
]);
const identityKeys = ["key", "id", "path", "slug", "sourceKey", "sectionKey", "entryKey"];
const sharedTechnicalTokens = new Set([
  "api", "ec", "gis", "gps", "html", "id", "isro", "lan", "lidar", "nrsc", "pdf",
  "ph", "rsac", "rsac-up", "sac", "sonar", "up", "url",
  "facebook", "twitter",
]);
const preservedValues = new Set([
  "india-wris", "bhuvan (nrsc)", "non visual desktop access (nvda)", "jaws", "narrator", "voiceover",
]);

const normalize = (value) => String(value || "")
  .normalize("NFKC")
  .replace(/\u00a0/gu, " ")
  .replace(/\s+/gu, " ")
  .trim();

const identity = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  for (const key of identityKeys) {
    if (value[key] !== undefined && value[key] !== "") return `${key}:${value[key]}`;
  }
  return "";
};

const isSharedTechnicalValue = (value) => {
  const tokens = normalize(value)
    .toLocaleLowerCase("en")
    .split(/[^a-z0-9-]+/u)
    .filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => /^\d+(?:\.\d+)?$/u.test(token) || sharedTechnicalTokens.has(token));
};

const isTranslatable = (value, key) => {
  const text = normalize(value);
  if (
    !text ||
    sharedKeys.has(key) ||
    preservedValues.has(text.toLocaleLowerCase("en")) ||
    devanagari.test(text) ||
    !latinWord.test(text)
  ) return false;
  if (/^[\s,;]*(?:https?:|mailto:|tel:|www\.|\/|\.\/|\.\.\/)/iu.test(text)) return false;
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/u.test(text)) return false;
  if (/^[-+()\d\s.,:/]+$/u.test(text)) return false;
  if (/^E-\d+$/iu.test(text)) return false;
  if (/^@?[a-z][a-z0-9._-]*\d+[a-z0-9._-]*$/iu.test(text) || /^@[a-z0-9.-]+$/iu.test(text)) return false;
  if (/^#[0-9a-f]{3,8}$/iu.test(text) || /^\d+(?:\.\d+)?(?:px|rem|em|%)$/iu.test(text)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}\s+to\s+\d{1,2}\/\d{1,2}\/\d{2,4}$/iu.test(text)) return false;
  if (/^\(?[ivxlcdm]+[.)]?$/iu.test(text)) return false;
  if (/^[+\d()/.\s-]+(?:ext\.?[-\d()]*)?$/iu.test(text)) return false;
  if (/^(?:B|M|Ph)\.?\s*(?:Tech|Sc|E|A|Phil|D)\.?$/iu.test(text)) return false;
  if (/\.(?:avif|docx?|gif|jpe?g|pdf|png|svg|webm|webp|xlsx?)(?:[?#].*)?$/iu.test(text)) return false;
  return !isSharedTechnicalValue(text);
};

const clip = (value, max = 150) => {
  const text = normalize(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const htmlDocument = (value) => new JSDOM(String(value || "")).window.document;

const htmlTagCounts = (value) => {
  const document = htmlDocument(value);
  return Object.fromEntries(
    ["h1", "h2", "h3", "h4", "p", "li", "img", "video", "table", "tr"].map((tag) => [
      tag,
      document.querySelectorAll(tag).length,
    ])
  );
};

const htmlMediaSources = (value) => [
  ...htmlDocument(value).querySelectorAll("img[src],source[src],video[src]"),
].map((element) => element.getAttribute("src"));

const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
};

const issues = {
  missing: [],
  identicalEnglish: [],
  latinOnlyReview: [],
  editorMetadataReview: [],
  structureReview: [],
};

const record = (bucket, row, path, english, hindi = "") => {
  issues[bucket].push({
    entry: `${row.collection}/${row.entry_key}`,
    path: path.join("."),
    english: clip(english),
    ...(hindi ? { hindi: clip(hindi) } : {}),
  });
};

const compareString = (english, hindi, row, path) => {
  const key = path.at(-1) || "";
  if (path.some((segment) => sharedKeys.has(segment))) return;
  if (!isTranslatable(english, key)) return;
  if (hindi === undefined || hindi === null || normalize(hindi) === "") {
    record("missing", row, path, english);
    return;
  }
  if (typeof hindi !== "string") return;
  if (normalize(english).toLocaleLowerCase("en") === normalize(hindi).toLocaleLowerCase("en")) {
    const editorMetadata = path.includes("blocks") && ["label", "sourceLabel"].includes(key);
    record(editorMetadata ? "editorMetadataReview" : "identicalEnglish", row, path, english, hindi);
    return;
  }
  if (!devanagari.test(hindi) && isTranslatable(hindi, key)) {
    const editorMetadata = path.includes("blocks") && ["label", "sourceLabel"].includes(key);
    record(editorMetadata ? "editorMetadataReview" : "latinOnlyReview", row, path, english, hindi);
  }
};

const compareHtml = (english, hindi, row, path) => {
  if (!normalize(english)) return;
  if (!normalize(hindi)) {
    record("missing", row, path, "Visible rich-text body");
    return;
  }
  const englishFields = extractPageTextFields(english);
  const hindiFields = extractPageTextFields(hindi);
  if (englishFields.length !== hindiFields.length) {
    const englishMedia = htmlMediaSources(english);
    const hindiMedia = htmlMediaSources(hindi);
    issues.structureReview.push({
      entry: `${row.collection}/${row.entry_key}`,
      path: path.join("."),
      englishNodes: englishFields.length,
      hindiNodes: hindiFields.length,
      englishTags: htmlTagCounts(english),
      hindiTags: htmlTagCounts(hindi),
      missingHindiMedia: englishMedia.filter((source) => !hindiMedia.includes(source)),
      extraHindiMedia: hindiMedia.filter((source) => !englishMedia.includes(source)),
      duplicateEnglishMedia: duplicateValues(englishMedia),
      duplicateHindiMedia: duplicateValues(hindiMedia),
    });
  }
  if (englishFields.length === hindiFields.length) {
    for (let index = 0; index < englishFields.length; index += 1) {
      compareString(
        englishFields[index].value,
        hindiFields[index].value,
        row,
        [...path, englishFields[index].key]
      );
    }
    return;
  }

  const hindiValues = new Set(hindiFields.map((field) => normalize(field.value).toLocaleLowerCase("en")));
  for (const field of englishFields) {
    const value = normalize(field.value);
    if (hindiValues.has(value.toLocaleLowerCase("en"))) {
      compareString(value, value, row, [...path, field.key]);
    }
  }
};

const compareLocalized = (english, hindi, row, path) => {
  if (typeof english === "string") {
    if (path.at(-1) === "html") compareHtml(english, hindi, row, path);
    else compareString(english, hindi, row, path);
    return;
  }
  if (Array.isArray(english)) {
    const hindiItems = Array.isArray(hindi) ? hindi : [];
    const indexedHindi = new Map(hindiItems.map((item) => [identity(item), item]).filter(([key]) => key));
    english.forEach((item, index) => {
      const itemIdentity = identity(item);
      const localizedItem = itemIdentity ? indexedHindi.get(itemIdentity) ?? hindiItems[index] : hindiItems[index];
      compareLocalized(item, localizedItem, row, [...path, String(index)]);
    });
    return;
  }
  if (english && typeof english === "object") {
    const localizedObject = hindi && typeof hindi === "object" && !Array.isArray(hindi) ? hindi : {};
    for (const [key, value] of Object.entries(english)) {
      if (english.controlsSectionLabel === false && ["label", "value", "sourceLabel"].includes(key)) {
        if (
          typeof value === "string" &&
          isTranslatable(value, key) &&
          normalize(value).toLocaleLowerCase("en") === normalize(localizedObject[key]).toLocaleLowerCase("en")
        ) {
          record("editorMetadataReview", row, [...path, key], value, localizedObject[key]);
        }
        continue;
      }
      compareLocalized(value, localizedObject[key], row, [...path, key]);
    }
  }
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    "SELECT collection,entry_key,data_en,data_hi FROM cms_entries WHERE status='published' ORDER BY collection,sort_order,entry_key"
  );

  for (const row of rows) {
    const definition = getCollection(row.collection);
    for (const field of definition?.fields || []) {
      if (field.localized === false || row.data_en?.[field.name] === undefined) continue;
      compareLocalized(row.data_en[field.name], row.data_hi?.[field.name], row, [field.name]);
    }
  }

  const report = {
    entries: rows.length,
    missing: issues.missing.length,
    identicalEnglish: issues.identicalEnglish.length,
    uniqueIdenticalEnglish: new Set(issues.identicalEnglish.map((issue) => normalize(issue.english))).size,
    latinOnlyReview: issues.latinOnlyReview.length,
    editorMetadataReview: issues.editorMetadataReview.length,
    uniqueEditorMetadataReview: new Set(issues.editorMetadataReview.map((issue) => normalize(issue.english))).size,
    structureReview: issues.structureReview.length,
    identicalByEntry: Object.entries(issues.identicalEnglish.reduce((counts, issue) => {
      counts[issue.entry] = (counts[issue.entry] || 0) + 1;
      return counts;
    }, {})).sort((left, right) => right[1] - left[1]),
    editorMetadataByEntry: Object.entries(issues.editorMetadataReview.reduce((counts, issue) => {
      counts[issue.entry] = (counts[issue.entry] || 0) + 1;
      return counts;
    }, {})).sort((left, right) => right[1] - left[1]),
    examples: Object.fromEntries(Object.entries(issues).map(([key, values]) => [key, values.slice(0, 12)])),
  };
  console.log(JSON.stringify(report, null, 2));
  if (issues.missing.length || issues.identicalEnglish.length) process.exitCode = 1;
} finally {
  await client.end();
}
