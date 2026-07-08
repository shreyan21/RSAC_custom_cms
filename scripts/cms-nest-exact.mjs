// Group Website-Pages rows into EXACTLY the tabs the public site shows. For a
// division/facility tab page it runs the site's own tab engine (scripts/lib/
// division-sections.mjs, under jsdom) and assigns each editable row to the tab
// its content appears under — so opening "Ongoing Projects" shows only ongoing
// projects, matching the website. Non-tab pages fall back to heading grouping.
//
// Non-destructive: values are preserved by key (typed Hindi never overwritten);
// nothing is dropped (leftover rows go under the first section). The website
// render is unaffected (directusAdapter flattens the tree back). Idempotent.
//
// Usage: node scripts/cms-nest-exact.mjs
import { readFileSync } from "node:fs";
import { extractPageTextTree, flattenContentFields } from "../src/data/pageTextFields.js";
import {
  canonicalDivisionSection,
  divisionSectionDefinitions,
} from "../src/data/divisionSectionLabels.js";
import { hiTranslations } from "../src/data/translations.js";
import { collectDivisionSectionKeys } from "./lib/division-sections.mjs";

const DIRECTUS = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/$/, "");
const env = readFileSync("backend/directus/.env", "utf8").split(/\r?\n/).reduce((a, l) => {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !m[1].startsWith("#")) a[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  return a;
}, {});
const api = async (path, options = {}, token) => {
  const res = await fetch(`${DIRECTUS}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} -> ${res.status} ${text}`);
  return body;
};
const clip = (v, n) => { const t = String(v ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

// Tab labels the website changes per page in normalizeDivisionSections
// (relabelSections calls in OfficialContentPage.jsx) — mirror them so the
// editor's section names read exactly like the website tabs.
const SECTION_RELABEL = {
  "groundwater-resources-division1": { publications: "Publications and Technical Reports", "research-papers": "Research Papers" },
  "geo-spatial-data-bank-division1": { "technical-reports": "Technical Reports and Atlas" },
  "soil-resources-division1": { "research-paper-published": "Research Papers Published" },
  "surface-water-resources-division1": { "research-paper-published": "Research Papers Published" },
  "training-division": { "research-paper-published": "List of Research Papers" },
  "training-division-": { "research-paper-published": "List of Research Papers" },
  "school-of-geo-informatics-division1": { mtech: "School of Geo-Informatics" },
  "school-of-geo-informatics-": { mtech: "School of Geo-Informatics" },
};

// Tab-rename match key: canonical section name (via alias table, so English
// and Hindi spellings of the same tab agree), lowercased. Must mirror the
// website (directusAdapter sectionLabelOverrides + DivisionCategorizedContent).
const sectionMatchKey = (text) => {
  const trimmed = String(text ?? "").trim();
  return (canonicalDivisionSection(trimmed) || trimmed).toLowerCase();
};

// Hindi display name for an engine tab label, so the Hindi Page Text rows read
// in Hindi ("वैज्ञानिक जनशक्ति", not "Scientific Manpower"). Sources: the official
// term map first, then the Devanagari alias of the canonical section.
const hindiSectionLabel = (label) => {
  if (hiTranslations[label]) return hiTranslations[label];
  const canonical = canonicalDivisionSection(label) || label;
  const definition = divisionSectionDefinitions.find((def) => def.label === canonical);
  const devanagari = definition?.aliases.find((alias) => /[ऀ-ॿ]/.test(alias));
  return devanagari || label;
};

// A row is worth showing to editors only if it contains at least one letter
// or digit (any script). Bare separators scraped from the html (",", ":", "|")
// stay in the locked template but are hidden from the editing list.
const isRealText = (value) => /[\p{L}\p{N}]/u.test(String(value ?? ""));

// Build a nested tree from the engine's tab sections, preserving current values.
const treeFromSections = (sections, currentRows, relabel = {}, toDisplayLabel = (l) => l) => {
  const rowByKey = new Map(flattenContentFields(currentRows).map((r) => [r.key, r]));
  // Editor-added rows ("Add item") have no key; the website appends them to
  // their section (sectionExtraItems). Keep them attached to the same section
  // across regroup runs.
  const addedByBucket = new Map();
  (currentRows || []).forEach((row) => {
    if (!row || !Array.isArray(row.children)) return;
    const bucket = sectionMatchKey(row.label);
    row.children.forEach((child) => {
      if (child && !child.key && isRealText(child.value)) {
        if (!addedByBucket.has(bucket)) addedByBucket.set(bucket, []);
        addedByBucket.get(bucket).push(String(child.value));
      }
    });
  });
  // Editors can rename a tab by editing the section-header row's value (the
  // site renders it via sectionLabelOverrides). Keep those renames across
  // regroup runs instead of resetting value back to the engine label. Keyed
  // canonically so a row relabelled English -> Hindi keeps its rename.
  const renamedHeaders = new Map();
  (currentRows || []).forEach((row) => {
    if (!row || row.key || !Array.isArray(row.children)) return;
    const l = String(row.label ?? "").trim();
    const v = String(row.value ?? "").trim();
    if (l && v && v !== l && sectionMatchKey(v) !== sectionMatchKey(l)) {
      renamedHeaders.set(sectionMatchKey(l), row.value);
    }
  });
  const used = new Set();
  const entries = sections.map((sec) => {
    const engineLabel = relabel[sec.key] || sec.label;
    const label = toDisplayLabel(engineLabel);
    const children = [];
    sec.textKeys.forEach((k) => {
      if (!rowByKey.has(k)) return;
      used.add(k);
      const r = rowByKey.get(k);
      // Separator-only rows (",", ":") stay in the template, not the editor.
      if (!isRealText(r.value)) return;
      children.push({ key: k, label: `${label} → ${clip(r.value, 60)}`, value: r.value });
    });
    (addedByBucket.get(sectionMatchKey(engineLabel)) || []).forEach((value) => {
      children.push({ key: null, label: `${label} → ${clip(value, 60)}`, value });
    });
    return {
      secKey: sec.key,
      node: {
        key: null,
        label,
        value: renamedHeaders.get(sectionMatchKey(engineLabel)) || label,
        children,
      },
    };
  }).filter((e) => e.node.children.length);
  // Rows the engine leaves unplaced (page title, tab-strip labels — the site
  // hides them) stay editable under the overview section, not whatever
  // section happens to be first (Scientific Manpower).
  const leftovers = flattenContentFields(currentRows).filter(
    (r) => !used.has(r.key) && isRealText(r.value)
  );
  if (leftovers.length) {
    const target =
      (entries.find((e) => e.secKey === "overview") || entries[0])?.node ||
      (() => { const s = { key: null, label: "Other", value: "Other", children: [] }; entries.push({ secKey: "other", node: s }); return s; })();
    leftovers.forEach((r) => target.children.push({ key: r.key, label: `${target.label} → ${clip(r.value, 60)}`, value: r.value }));
  }
  return entries.map((e) => e.node);
};

// Heuristic tree (non-tab pages), preserving current values by key.
const heuristicTree = (html, currentRows) => {
  const rowByKey = new Map(flattenContentFields(currentRows).map((r) => [r.key, r]));
  const applyVals = (nodes) => nodes.map((n) => ({
    ...n,
    value: n.key && rowByKey.has(n.key) ? rowByKey.get(n.key).value : n.value,
    ...(Array.isArray(n.children) ? { children: applyVals(n.children) } : {}),
  }));
  return applyVals(extractPageTextTree(html || ""))
    .map((n) =>
      Array.isArray(n.children)
        ? { ...n, children: n.children.filter((c) => isRealText(c.value)) }
        : n
    )
    .filter(
      (n) =>
        (Array.isArray(n.children) && n.children.length) || isRealText(n.value)
    );
};

const group = (html, title, currentRows, slug, language = "en") => {
  let sectioned = null;
  try { sectioned = collectDivisionSectionKeys(html || "", title || "", slug || ""); } catch { sectioned = null; }
  if (sectioned && sectioned.sections.length) {
    return treeFromSections(
      sectioned.sections,
      currentRows,
      SECTION_RELABEL[slug] || {},
      language === "hi" ? hindiSectionLabel : (l) => l
    );
  }
  return heuristicTree(html, currentRows);
};

const main = async () => {
  const login = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, mode: "json" }) });
  const token = login.data.access_token;
  const pages = await api("/items/rsac_pages?limit=-1&fields=id,slug,title,html,html_hi,content_fields,content_fields_hi", {}, token);
  let changed = 0;
  for (const p of pages.data) {
    const hiSource = p.html_hi && String(p.html_hi).trim() ? p.html_hi : p.html;
    const newCf = group(p.html, p.title, p.content_fields, p.slug);
    const newCfh = group(hiSource, p.title, p.content_fields_hi, p.slug, "hi");
    const patch = {};
    if (JSON.stringify(newCf) !== JSON.stringify(p.content_fields)) patch.content_fields = newCf;
    if (JSON.stringify(newCfh) !== JSON.stringify(p.content_fields_hi)) patch.content_fields_hi = newCfh;
    if (Object.keys(patch).length) {
      await api(`/items/rsac_pages/${p.id}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
      changed++;
      console.log(`  ${p.slug}: ${newCf.map((s) => s.label + "[" + s.children.length + "]").join(" · ")}`);
    }
  }
  console.log(`\nRegrouped ${changed} page(s) to exact website tabs. Values preserved by key.`);
};
main().catch((e) => { console.error(e.message || e); process.exit(1); });
