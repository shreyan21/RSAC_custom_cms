// Removes html + title from rsac_pages.translations.hi for division pages so the
// page keeps its ENGLISH html (the OfficialContentPage layout engine is keyed to
// English markers; Hindi text is applied at render via the official term map).
// Hindi `summary` + `source_url` are kept for the page intro/attribution.
//
// Usage: node scripts/cms-clear-division-hi-html.mjs [sectionKey ...]  (default: divisions)

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const directusUrl = "http://localhost:8055";
const repoRoot = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const targetSections = new Set(args.length ? args : ["divisions"]);

const parseEnv = (raw) => {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
};

const login = async () => {
  const env = parseEnv(await readFile(resolve(repoRoot, "backend/directus/.env"), "utf8"));
  const res = await fetch(`${directusUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data.access_token;
};

const run = async () => {
  const token = await login();
  const auth = { Authorization: `Bearer ${token}` };
  const listRes = await fetch(
    `${directusUrl}/items/rsac_pages?fields=id,section_key,slug,translations&limit=-1`,
    { headers: auth }
  );
  const pages = (await listRes.json()).data;

  let updated = 0;
  for (const page of pages) {
    if (!targetSections.has(page.section_key)) continue;
    let tr = page.translations;
    if (typeof tr === "string") {
      try { tr = JSON.parse(tr); } catch { tr = {}; }
    }
    if (!tr?.hi) continue;

    const { html, title, ...keepHi } = tr.hi; // drop html + title, keep summary/source_url
    const next = { ...tr, hi: keepHi };

    const res = await fetch(`${directusUrl}/items/rsac_pages/${page.id}`, {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ translations: next }),
    });
    if (!res.ok) {
      process.stderr.write(`  FAIL #${page.id} ${page.slug}: ${res.status}\n`);
      continue;
    }
    updated += 1;
    process.stdout.write(`  cleared html/title #${page.id} ${page.slug} (kept: ${Object.keys(keepHi).join(",") || "none"})\n`);
  }
  process.stdout.write(`\nDone. updated=${updated} (sections: ${[...targetSections].join(",")})\n`);
};

run().catch((e) => {
  process.stderr.write(`${e.stack || e.message}\n`);
  process.exit(1);
});
