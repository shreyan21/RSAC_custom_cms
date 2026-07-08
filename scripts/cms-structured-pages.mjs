// One-off migration: turn the raw HTML/rich-text Pages editor into a compact,
// non-technical "labelled text rows" editor for BOTH English and Hindi.
//
// What it does (idempotent):
//   1. Registers rsac_pages.content_fields / content_fields_hi as Directus fields
//      (the DB columns already exist from postgres-schema.sql).
//   2. Configures both as a compact `list` editor (row = read-only label + editable
//      text), grouped under the English / Hindi editor sections.
//   3. Hides and locks the raw html / html_hi rich-text fields.
//   4. Fills content_fields from html and content_fields_hi from html_hi ONLY when
//      empty, so it never overwrites text an editor already changed.
//
// Text extraction round-trips exactly (same keys the frontend uses in
// applyPageTextFields), so the rendered site is unchanged until an editor edits a row.
// No AI translation: Hindi rows carry whatever Hindi already exists; English rows
// stay English for the editor to translate by hand.
//
// Usage:  node scripts/cms-structured-pages.mjs [pilot|all]
//   pilot -> only earth-resources-division1 (default)
//   all   -> every rsac_pages row

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { extractPageTextFields } = await import(
  pathToFileURL(join(repoRoot, "src/data/pageTextFields.js")).href
);

const mode = process.argv[2] === "all" ? "all" : "pilot";
const PILOT_SLUG = "earth-resources-division1";

const env = readFileSync(join(repoRoot, "backend/directus/.env"), "utf8")
  .split(/\r?\n/)
  .reduce((a, l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !m[1].startsWith("#")) a[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    return a;
  }, {});

const URL = (env.PUBLIC_URL || "http://localhost:8055").replace(/\/+$/, "");
let token = "";
const api = async (path, { method = "GET", body, allow404 = false } = {}) => {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
};

const listField = (valueLabel, valueNote) => ({
  interface: "list",
  special: ["cast-json"],
  options: {
    template: "{{label}}",
    addLabel: "Add text row",
    fields: [
      { field: "key", name: "System key", type: "string", meta: { interface: "input", readonly: true, hidden: true, width: "full" } },
      { field: "label", name: "Page part", type: "string", meta: { interface: "input", readonly: true, width: "full" } },
      { field: "value", name: valueLabel, type: "text", meta: { interface: "input-multiline", width: "full" } },
    ],
  },
  note: valueNote,
  width: "full",
});

let knownFields = new Set();
const ensureField = async (field, meta) => {
  if (knownFields.has(field)) {
    await api(`/fields/rsac_pages/${field}`, { method: "PATCH", body: { meta } });
    return "patched";
  }
  await api(`/fields/rsac_pages`, {
    method: "POST",
    body: { field, type: "json", schema: {}, meta },
  });
  knownFields.add(field);
  return "created";
};

const main = async () => {
  const login = await api("/auth/login", {
    method: "POST",
    body: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, mode: "json" },
  });
  token = login.access_token;

  const fieldList = await api(`/fields/rsac_pages`);
  knownFields = new Set(fieldList.map((f) => f.field));

  // 1 + 2: register + configure the two compact editors
  const enMeta = {
    ...listField(
      "English text",
      "Open a row and change only its text, then Save. Do not delete rows — the page layout is fixed."
    ),
    group: "editor_english",
    sort: 20,
    translations: [{ language: "en-US", translation: "English Page Text" }],
  };
  const hiMeta = {
    ...listField(
      "Hindi text",
      "Type the Hindi for each row here, then Save. Empty or English rows fall back automatically. Do not delete rows."
    ),
    group: "editor_hindi",
    sort: 20,
    translations: [{ language: "en-US", translation: "Hindi Page Text" }],
  };
  console.log("content_fields:", await ensureField("content_fields", enMeta));
  console.log("content_fields_hi:", await ensureField("content_fields_hi", hiMeta));

  // 3: hide + lock the raw HTML editors
  for (const [f, note] of [
    ["html", "Locked layout template. Edit the labelled English Page Text rows instead."],
    ["html_hi", "Locked layout template. Edit the labelled Hindi Page Text rows instead."],
  ]) {
    await api(`/fields/rsac_pages/${f}`, {
      method: "PATCH",
      body: { meta: { interface: "input-code", options: { language: "htmlmixed" }, hidden: true, readonly: true, group: null } },
    });
    console.log(`locked ${f}: ${note ? "ok" : ""}`);
  }

  // 4: populate rows (only where empty)
  const filter = mode === "pilot" ? `&filter[slug][_eq]=${encodeURIComponent(PILOT_SLUG)}` : "";
  const pages = await api(
    `/items/rsac_pages?limit=-1&fields=id,slug,section_key,html,html_hi,content_fields,content_fields_hi${filter}`
  );
  console.log(`\nPopulating ${pages.length} page(s) [mode=${mode}]`);
  let filled = 0;
  for (const p of pages) {
    const patch = {};
    const cf = Array.isArray(p.content_fields) ? p.content_fields : [];
    const cfhi = Array.isArray(p.content_fields_hi) ? p.content_fields_hi : [];
    if (cf.length === 0 && p.html) patch.content_fields = extractPageTextFields(p.html);
    if (cfhi.length === 0 && p.html_hi) patch.content_fields_hi = extractPageTextFields(p.html_hi);
    if (Object.keys(patch).length === 0) {
      console.log(`  skip ${p.slug} (already has rows)`);
      continue;
    }
    await api(`/items/rsac_pages/${p.id}`, { method: "PATCH", body: patch });
    filled += 1;
    console.log(
      `  ${p.slug}: en=${patch.content_fields?.length ?? cf.length} hi=${patch.content_fields_hi?.length ?? cfhi.length}`
    );
  }
  console.log(`\nDone. Filled ${filled} page(s).`);
};

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
