import { config as loadEnv } from "dotenv";
import pg from "pg";
import { cmsGroups } from "../admin/src/cmsGroups.js";
import { collections } from "../shared/cmsCollections.js";
import { validateEntryPayload } from "../server/contentValidation.js";
import { canonicalDivisionSection } from "../src/data/divisionSectionLabels.js";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL is missing. Run npm run cms:setup first.");
}

const supportedFieldTypes = new Set([
  "blocks", "boolean", "color", "date", "email", "json", "list", "media",
  "number", "richtext", "select", "text", "textarea", "url",
]);
const allowedStatuses = new Set(["draft", "published", "archived"]);
const virtualDashboardCollections = new Set([
  "about_pages", "division_pages", "facility_pages", "academic_pages",
]);
const intentionallyHiddenCollections = new Set([
  "division_section_items",
]);
const problems = [];
const legacyFields = new Map();
const databaseCounts = new Map();

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
};
const typeMatches = (field, value) => {
  if (value === null || value === undefined || value === "") return true;
  if (["blocks", "list"].includes(field.type)) return Array.isArray(value);
  if (field.type === "json") return isObject(value) || Array.isArray(value);
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string";
};
const optionValue = (option) => String(typeof option === "object" ? option.value : option);
const sampleRequiredValue = (field) => {
  if (field.type === "boolean") return true;
  if (field.type === "number") return 1;
  if (field.type === "select") return optionValue(field.options[0]);
  if (field.type === "list") return ["Audit value"];
  if (field.type === "json") return {};
  if (field.type === "blocks") return [];
  if (field.type === "email") return "editor@example.gov.in";
  if (field.type === "date") return "2026-01-01";
  if (["url", "media"].includes(field.type)) return "/audit-value";
  return "Audit value";
};
const addLegacyField = (collection, language, name, value) => {
  const key = `${collection}.${language}.${name}`;
  const current = legacyFields.get(key) || { total: 0, populated: 0 };
  current.total += 1;
  if (hasValue(value)) current.populated += 1;
  legacyFields.set(key, current);
};

const definitionIds = new Set();
for (const definition of collections) {
  if (definitionIds.has(definition.id)) problems.push(`Duplicate collection definition: ${definition.id}`);
  definitionIds.add(definition.id);

  const fieldNames = new Set();
  for (const field of definition.fields || []) {
    if (!field.name || !field.label) problems.push(`${definition.id} has a field without a name or label.`);
    if (fieldNames.has(field.name)) problems.push(`${definition.id} repeats field ${field.name}.`);
    fieldNames.add(field.name);
    if (!supportedFieldTypes.has(field.type)) problems.push(`${definition.id}.${field.name} uses unsupported type ${field.type}.`);
    if (field.type === "select" && !(field.options || []).length) problems.push(`${definition.id}.${field.name} has no select options.`);
  }
}

const groupedIds = cmsGroups.flatMap((group) => group.ids);
const groupedIdSet = new Set(groupedIds);
for (const definition of collections) {
  if (!groupedIdSet.has(definition.id) && !intentionallyHiddenCollections.has(definition.id)) {
    problems.push(`${definition.id} is missing from the CMS dashboard.`);
  }
}
for (const id of intentionallyHiddenCollections) {
  if (groupedIdSet.has(id)) problems.push(`${id} must stay hidden because section content is edited on its owning page.`);
}
for (const id of groupedIds) {
  if (!definitionIds.has(id) && !virtualDashboardCollections.has(id)) problems.push(`Dashboard references unknown collection ${id}.`);
}
for (const id of new Set(groupedIds)) {
  if (groupedIds.filter((candidate) => candidate === id).length > 1) problems.push(`Dashboard repeats collection ${id}.`);
}

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    "SELECT id, collection, entry_key, status, sort_order, data_en, data_hi FROM cms_entries ORDER BY collection, sort_order, updated_at DESC"
  );
  const rowsByCollection = new Map(collections.map((definition) => [definition.id, []]));

  for (const row of rows) {
    if (!rowsByCollection.has(row.collection)) {
      problems.push(`Database contains unknown collection ${row.collection}.`);
      continue;
    }
    rowsByCollection.get(row.collection).push(row);
  }

  for (const definition of collections) {
    const collectionRows = rowsByCollection.get(definition.id) || [];
    databaseCounts.set(definition.id, collectionRows.length);
    const activeRows = collectionRows.filter((row) => row.status !== "archived");
    const published = activeRows.filter((row) => row.status === "published").length;
    const drafts = activeRows.filter((row) => row.status === "draft").length;
    const fieldMap = new Map((definition.fields || []).map((field) => [field.name, field]));

    if (definition.singleton && activeRows.length > 1) {
      problems.push(`${definition.id} is a singleton but has ${activeRows.length} active entries.`);
    }

    if (!collectionRows.length) {
      const dataEn = {};
      const dataHi = {};
      for (const field of definition.fields || []) {
        if (!field.required) continue;
        dataEn[field.name] = sampleRequiredValue(field);
        if (field.localized !== false) dataHi[field.name] = sampleRequiredValue(field);
      }
      try {
        validateEntryPayload(definition.id, { status: "draft", sortOrder: 0, dataEn, dataHi });
      } catch (error) {
        problems.push(`${definition.id} cannot validate a new draft: ${error.message}`);
      }
    }

    const activeKeys = new Set();
    for (const row of collectionRows) {
      const label = `${definition.id}/${row.entry_key || row.id}`;
      try {
        validateEntryPayload(definition.id, {
          status: row.status,
          sortOrder: row.sort_order,
          dataEn: row.data_en,
          dataHi: row.data_hi,
        });
      } catch (error) {
        problems.push(`${label} cannot be saved by the CMS: ${error.message}`);
      }
      if (!allowedStatuses.has(row.status)) problems.push(`${label} has invalid status ${row.status}.`);
      if (!String(row.entry_key || "").trim()) problems.push(`${label} has no entry key.`);
      if (!Number.isFinite(Number(row.sort_order))) problems.push(`${label} has an invalid sort order.`);
      if (!isObject(row.data_en)) problems.push(`${label} has invalid English data.`);
      if (!isObject(row.data_hi)) problems.push(`${label} has invalid Hindi data.`);
      if (row.status !== "archived") {
        if (activeKeys.has(row.entry_key)) problems.push(`${definition.id} repeats active key ${row.entry_key}.`);
        activeKeys.add(row.entry_key);
      }

      for (const [language, data] of [["data_en", row.data_en], ["data_hi", row.data_hi]]) {
        if (!isObject(data)) continue;
        for (const [name, value] of Object.entries(data)) {
          if (!fieldMap.has(name)) addLegacyField(definition.id, language, name, value);
        }
      }

      for (const field of definition.fields || []) {
        const englishValue = row.data_en?.[field.name];
        const hindiValue = row.data_hi?.[field.name];
        if (row.status !== "archived" && field.required && !hasValue(englishValue)) {
          problems.push(`${label} is missing required English field ${field.name}.`);
        }
        if (!typeMatches(field, englishValue)) problems.push(`${label} has the wrong English type for ${field.name}.`);
        if (field.localized !== false && !typeMatches(field, hindiValue)) problems.push(`${label} has the wrong Hindi type for ${field.name}.`);
        if (field.type === "select") {
          const allowed = new Set((field.options || []).map(optionValue));
          if (hasValue(englishValue) && !allowed.has(String(englishValue))) problems.push(`${label} has invalid ${field.name} option ${englishValue}.`);
          if (field.localized !== false && hasValue(hindiValue) && !allowed.has(String(hindiValue))) problems.push(`${label} has invalid Hindi ${field.name} option ${hindiValue}.`);
        }
        if (field.type === "blocks") {
          for (const [language, blocks] of [["English", englishValue], ["Hindi", hindiValue]]) {
            if (!Array.isArray(blocks)) continue;
            blocks.forEach((block, index) => {
              if (!isObject(block)) problems.push(`${label} ${language} block ${index + 1} is not an object.`);
              else if (!String(block.type || "").trim() && !Array.isArray(block.children) && !block.editorMode && !Object.hasOwn(block, "contentHtml")) {
                problems.push(`${label} ${language} block ${index + 1} has no editor format.`);
              }
              if (
                isObject(block) &&
                block.assetOnly === true &&
                canonicalDivisionSection(block.sourceLabel || block.value || block.label) === "Map/Photos" &&
                block.controlsSectionLabel === false
              ) {
                problems.push(`${label} ${language} Map/Photos heading is hidden from the CMS editor.`);
              }
            });
          }
        }
      }
    }

    console.log(`${definition.id.padEnd(24)} ${String(activeRows.length).padStart(4)} active | ${String(published).padStart(4)} published | ${String(drafts).padStart(3)} drafts | ${String(collectionRows.length - activeRows.length).padStart(3)} archived`);
  }
} finally {
  await client.end();
}

const apiBase = String(process.env.CMS_API_URL || process.env.VITE_API_URL || "http://127.0.0.1:3000").replace(/\/$/u, "");
let cookie = "";
let csrf = "";
const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrf && options.method && options.method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${path} returned ${response.status}`);
  return { payload, response };
};

try {
  const login = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username: process.env.CMS_ADMIN_USERNAME,
      password: process.env.CMS_ADMIN_PASSWORD,
    }),
  });
  cookie = login.response.headers.get("set-cookie")?.split(";")[0] || "";
  csrf = login.payload.csrfToken || "";
  if (!cookie || !csrf) throw new Error("login did not return a session and CSRF token");

  const portalDefinitions = (await apiRequest("/api/admin/collections")).payload.data;
  if (!Array.isArray(portalDefinitions)) throw new Error("collection index did not return an array");
  const schemaDefinitions = (await apiRequest("/api/admin/schema")).payload.collections;
  const auditRows = (await apiRequest("/api/admin/audit")).payload.data;
  const feedbackRows = (await apiRequest("/api/admin/feedback")).payload.data;
  if (!Array.isArray(schemaDefinitions) || schemaDefinitions.length !== collections.length) problems.push("Admin schema endpoint does not match the collection definitions.");
  if (!Array.isArray(auditRows)) problems.push("Admin audit endpoint did not return an array.");
  if (!Array.isArray(feedbackRows)) problems.push("Admin feedback endpoint did not return an array.");
  const portalIds = new Set(portalDefinitions.map((definition) => definition.id));
  for (const definition of collections) {
    if (!portalIds.has(definition.id)) problems.push(`${definition.id} is missing from the admin collection API.`);
    const entries = (await apiRequest(`/api/admin/content/${definition.id}`)).payload.data;
    if (!Array.isArray(entries)) {
      problems.push(`${definition.id} admin endpoint did not return an array.`);
      continue;
    }
    if (entries.length !== databaseCounts.get(definition.id)) {
      problems.push(`${definition.id} admin endpoint returned ${entries.length} rows; database has ${databaseCounts.get(definition.id)}.`);
    }
    for (const entry of entries) {
      if (!entry.id || !entry.entryKey || !isObject(entry.dataEn) || !isObject(entry.dataHi) || !Number.isFinite(Number(entry.version))) {
        problems.push(`${definition.id} admin endpoint returned an invalid entry contract.`);
        break;
      }
    }
  }
  console.log(`\nAdmin API opened all ${collections.length} collection endpoints successfully.`);
} catch (error) {
  problems.push(`Admin API audit failed: ${error.message}`);
} finally {
  if (cookie && csrf) {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      problems.push(`Admin API logout failed: ${error.message}`);
    }
  }
}

const populatedLegacyFields = [...legacyFields.entries()]
  .filter(([, counts]) => counts.populated > 0)
  .sort(([left], [right]) => left.localeCompare(right));

console.log(`\nLegacy fields retained safely: ${legacyFields.size} field paths (${populatedLegacyFields.length} populated).`);
if (populatedLegacyFields.length) {
  console.log(populatedLegacyFields.map(([name, counts]) => `${name}=${counts.populated}/${counts.total}`).join(", "));
}

if (problems.length) {
  console.error(`\nCMS portal audit failed with ${problems.length} problem(s):`);
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log(`CMS portal audit passed: all ${collections.length} collections are reachable and structurally valid.`);
}
