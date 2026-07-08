// Remove punctuation-only "text slot" rows from rsac_pages content_fields (and
// content_fields_hi). The old-site scrape split some tables/citations so that a
// bare separator ("," ":" "/" "-" ")." ...) became its own editable row under
// "Items in this section", which confuses editors.
//
// Safe to delete because the punctuation still lives in the locked HTML template
// (rsac_pages.html / html_hi): applyPageTextFields only patches a template text
// node when its key is present in content_fields, so dropping the slot leaves the
// template's original character in place. The website render is unchanged; only
// the editor list gets cleaner.
//
// Usage:
//   node scripts/clean-punctuation-only-page-rows.mjs           (dry run)
//   node scripts/clean-punctuation-only-page-rows.mjs --apply   (write + backup)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const env = readFileSync(join(root, "backend", "directus", ".env"), "utf8");
const pick = (k) =>
  (env.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, "m")) || [])[1]?.trim();
const BASE = pick("PUBLIC_URL") || "http://localhost:8055";
const EMAIL = pick("ADMIN_EMAIL");
const PASSWORD = pick("ADMIN_PASSWORD");

const APPLY = process.argv.includes("--apply");

// A row whose visible text is nothing but separators/brackets/dashes.
const PUNCTUATION_ONLY = /^[\s,.;:।|/()[\]{}\-–—•·]+$/;
const isJunk = (value) => {
  const text = String(value ?? "").trim();
  return text !== "" && PUNCTUATION_ONLY.test(text);
};

// Drop junk children from a content_fields array. Section (parent) rows are kept
// even if empty; only their child slots are pruned.
const pruneFields = (fields) => {
  if (!Array.isArray(fields)) return { next: fields, removed: 0 };
  let removed = 0;
  const next = fields.map((row) => {
    if (!row || !Array.isArray(row.children)) return row;
    const keptChildren = row.children.filter((child) => {
      if (isJunk(child?.value)) {
        removed += 1;
        return false;
      }
      return true;
    });
    return { ...row, children: keptChildren };
  });
  return { next, removed };
};

const main = async () => {
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then((r) => r.json());
  const token = login?.data?.access_token;
  if (!token) throw new Error("login failed: " + JSON.stringify(login));
  const auth = { Authorization: `Bearer ${token}` };

  const pages = await fetch(
    `${BASE}/items/rsac_pages?fields=id,slug,content_fields,content_fields_hi&limit=-1`,
    { headers: auth }
  ).then((r) => r.json());

  const rows = pages?.data || [];
  const backup = [];
  const plans = [];
  let totalRemoved = 0;

  for (const page of rows) {
    const en = pruneFields(page.content_fields);
    const hi = pruneFields(page.content_fields_hi);
    const removed = en.removed + hi.removed;
    if (!removed) continue;

    totalRemoved += removed;
    backup.push({
      id: page.id,
      slug: page.slug,
      content_fields: page.content_fields,
      content_fields_hi: page.content_fields_hi,
    });
    plans.push({
      id: page.id,
      slug: page.slug,
      removed,
      patch: {
        content_fields: en.next,
        content_fields_hi: hi.next,
      },
    });
    console.log(`${page.slug} (id ${page.id}): remove ${removed} junk row(s)`);
  }

  console.log(
    `\n${plans.length} page(s), ${totalRemoved} junk row(s) total.`
  );

  if (!APPLY) {
    console.log("Dry run. Re-run with --apply to write changes.");
    return;
  }

  const backupDir = join(root, "backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `content_fields-backup-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup written: ${backupPath}`);

  for (const plan of plans) {
    const res = await fetch(`${BASE}/items/rsac_pages/${plan.id}`, {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(plan.patch),
    }).then((r) => r.json());
    if (res?.errors) {
      throw new Error(plan.slug + ": " + JSON.stringify(res.errors));
    }
    console.log(`patched ${plan.slug} (-${plan.removed})`);
  }

  console.log(`\nDone. ${plans.length} page(s) patched.`);
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
