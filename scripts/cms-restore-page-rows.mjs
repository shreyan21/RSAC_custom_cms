// Restore EVERY editable text row on the Website Pages, in both languages, so no
// inner content (e.g. the list of Completed Projects under its heading) is
// missing from the Directus editor. A previous pass had trimmed rows down to
// section headers + prose; this brings back all rows while preserving anything
// already edited (matched by key — typed Hindi is never overwritten). Rows are
// relabelled with their section context. Idempotent; safe to re-run.
//
// Usage: node scripts/cms-restore-page-rows.mjs
import { readFileSync } from "node:fs";
import { extractPageTextFields } from "../src/data/pageTextFields.js";

const DIRECTUS = (
  process.argv.find((a) => a.startsWith("--directus="))?.split("=").slice(1).join("=") ||
  process.env.DIRECTUS_URL ||
  "http://localhost:8055"
).replace(/\/$/, "");

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

const hasDevanagari = (v) => /[ऀ-ॿ]/.test(String(v || ""));

// Full row set from the locked HTML, with each existing value preserved by key
// (edits/typed Hindi kept) and any missing row filled from the template.
const restore = (currentRows, html) => {
  const template = extractPageTextFields(html || "");
  const current = new Map(
    (Array.isArray(currentRows) ? currentRows : []).map((r) => [r.key, r])
  );
  const merged = template.map((t) => ({
    key: t.key,
    label: t.label,
    value: current.has(t.key) ? current.get(t.key).value : t.value,
  }));
  // keep any edited Hindi whose key no longer exists in the template
  const usedKeys = new Set(template.map((t) => t.key));
  const orphans = (Array.isArray(currentRows) ? currentRows : []).filter(
    (r) => !usedKeys.has(r.key) && hasDevanagari(r.value)
  );
  return [...merged, ...orphans];
};

const main = async () => {
  const login = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      mode: "json",
    }),
  });
  const token = login.data.access_token;

  const pages = await api(
    "/items/rsac_pages?limit=-1&fields=id,slug,section_key,html,html_hi,content_fields,content_fields_hi",
    {},
    token
  );

  let changed = 0, beforeTot = 0, afterTot = 0;
  for (const p of pages.data) {
    const cf = Array.isArray(p.content_fields) ? p.content_fields : [];
    const cfh = Array.isArray(p.content_fields_hi) ? p.content_fields_hi : [];
    const hiSource = p.html_hi && String(p.html_hi).trim() ? p.html_hi : p.html;

    const newCf = restore(cf, p.html);
    const newCfh = restore(cfh, hiSource);
    beforeTot += cf.length + cfh.length;
    afterTot += newCf.length + newCfh.length;

    const patch = {};
    if (JSON.stringify(newCf) !== JSON.stringify(cf)) patch.content_fields = newCf;
    if (JSON.stringify(newCfh) !== JSON.stringify(cfh)) patch.content_fields_hi = newCfh;
    if (Object.keys(patch).length) {
      await api(`/items/rsac_pages/${p.id}`, { method: "PATCH", body: JSON.stringify(patch) }, token);
      changed++;
      console.log(`  ${p.slug}: EN ${cf.length}->${newCf.length}, HI ${cfh.length}->${newCfh.length}`);
    }
  }
  console.log(`\nRestored full rows on ${changed} page(s): ${beforeTot} -> ${afterTot} total rows.`);
  console.log("No values overwritten (existing/typed text preserved by key).");
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
