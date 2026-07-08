// Turn the flat Website-Pages text rows into a nested, collapsible editor: every
// heading becomes a parent row with an expander, and the text under it (list
// items, paragraphs, table labels) nests inside as children. Editors expand a
// section to see and edit exactly what lives inside it.
//
// - Data is regrouped from the locked html/html_hi; existing/typed values are
//   preserved by key (nothing overwritten, nothing dropped).
// - The website render is unaffected: directusAdapter flattens the tree back
//   before applying it to the locked template.
// - Sets the nested `list` interface on content_fields / content_fields_hi.
// Idempotent; safe to re-run (e.g. after cms-upgrade re-runs directus-setup).
//
// Usage: node scripts/cms-nest-page-rows.mjs
import { readFileSync } from "node:fs";
import {
  extractPageTextTree,
  flattenContentFields,
} from "../src/data/pageTextFields.js";

const DIRECTUS = (process.env.DIRECTUS_URL || "http://localhost:8055").replace(/\/$/, "");

const env = readFileSync("backend/directus/.env", "utf8")
  .split(/\r?\n/)
  .reduce((acc, line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !m[1].startsWith("#")) acc[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    return acc;
  }, {});

const api = async (path, options = {}, token) => {
  const res = await fetch(`${DIRECTUS}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path} -> ${res.status} ${text}`);
  return body;
};

// Regroup into a tree from the locked HTML, keeping any current value by key.
const nest = (currentRows, html) => {
  const tree = extractPageTextTree(html || "");
  const current = new Map(
    flattenContentFields(currentRows).map((r) => [r.key, r.value])
  );
  const applyValues = (nodes) =>
    nodes.map((n) => ({
      ...n,
      value: n.key && current.has(n.key) ? current.get(n.key) : n.value,
      ...(Array.isArray(n.children) ? { children: applyValues(n.children) } : {}),
    }));
  return applyValues(tree);
};

// Nested list interface: section rows that expand to their child text rows.
const nestedInterface = (valueLabel) => {
  const leaf = [
    { field: "key", name: "System text key", type: "string",
      meta: { interface: "input", readonly: true, hidden: true, width: "full" } },
    { field: "label", name: "Page part", type: "string",
      meta: { interface: "input", readonly: true, width: "full" } },
    { field: "value", name: valueLabel, type: "text",
      meta: { interface: "input-multiline", width: "full" } },
  ];
  return {
    width: "full",
    interface: "list",
    options: {
      template: "{{label}}",
      addLabel: "Add item",
      fields: [
        ...leaf,
        { field: "children", name: "Items in this section", type: "json",
          meta: { interface: "list", width: "full",
            options: { template: "{{label}}", addLabel: "Add item", fields: leaf } } },
      ],
    },
    note: "Each section expands to the text inside it. Open a row, change only its text, and Save. Do not delete rows — the website keeps the page layout fixed.",
  };
};

const main = async () => {
  const login = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, mode: "json" }),
  });
  const token = login.data.access_token;

  // 1) nested interface on both language fields
  await api("/fields/rsac_pages/content_fields",
    { method: "PATCH", body: JSON.stringify({ meta: nestedInterface("English text") }) }, token);
  await api("/fields/rsac_pages/content_fields_hi",
    { method: "PATCH", body: JSON.stringify({ meta: nestedInterface("Hindi text") }) }, token);
  console.log("nested list interface set on content_fields + content_fields_hi");

  // 2) regroup data on every page
  const pages = await api(
    "/items/rsac_pages?limit=-1&fields=id,slug,html,html_hi,content_fields,content_fields_hi",
    {}, token);
  let changed = 0;
  for (const p of pages.data) {
    const hiSource = p.html_hi && String(p.html_hi).trim() ? p.html_hi : p.html;
    const newCf = nest(p.content_fields, p.html);
    const newCfh = nest(p.content_fields_hi, hiSource);
    const patch = {};
    if (JSON.stringify(newCf) !== JSON.stringify(p.content_fields)) patch.content_fields = newCf;
    if (JSON.stringify(newCfh) !== JSON.stringify(p.content_fields_hi)) patch.content_fields_hi = newCfh;
    if (Object.keys(patch).length) {
      await api(`/items/rsac_pages/${p.id}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
      changed++;
      console.log(`  ${p.slug}: ${newCf.length} sections (EN), ${newCfh.length} sections (HI)`);
    }
  }
  console.log(`\nNested ${changed} page(s). Values preserved by key; render unaffected.`);
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
