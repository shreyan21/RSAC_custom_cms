// Clean content artifacts in rsac_pages:
//   1. translations.hi fields that are the scraped "enable Javascript" shell
//      (drop them so the English value is shown in Hindi).
//   2. literal HTML entities in plain-text fields (title/summary, EN + hi) that
//      React renders verbatim ("RSAC &ndash; UP").
//   3. double-encoded entities in html bodies ("&amp;nbsp;" -> "&nbsp;").
// Mirrors the render-time guards in directusAdapter.js so CMS, backups, and the
// live render all agree. Re-run scripts/export-cms-to-generated.mjs afterwards.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const env = readFileSync(join(root, "backend", "directus", ".env"), "utf8");
const pick = (k) =>
  (env.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, "m")) || [])[1]?.trim();
const BASE = pick("PUBLIC_URL") || "http://localhost:8055";
const EMAIL = pick("ADMIN_EMAIL");
const PASSWORD = pick("ADMIN_PASSWORD");

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ", ndash: "–", mdash: "—",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  hellip: "…", times: "×", deg: "°", middot: "·",
  bull: "•", laquo: "«", raquo: "»", copy: "©", reg: "®", trade: "™",
};
const NAMES = Object.keys(NAMED).join("|");

const decodeToken = (m, body) => {
  if (body[0] === "#") {
    const code =
      body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  }
  return NAMED[body] !== undefined ? NAMED[body] : m;
};
const decodeText = (v = "") => {
  let t = String(v);
  const re = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;
  for (let i = 0; i < 3; i += 1) {
    const n = t.replace(re, decodeToken);
    if (n === t) break;
    t = n;
  }
  return t;
};
const fixDouble = (h = "") =>
  String(h).replace(new RegExp(`&amp;(?=(?:${NAMES}|#x?[0-9a-fA-F]+);)`, "g"), "&");
const isShell = (v) =>
  typeof v === "string" &&
  /please enable javascript|functionalities will not work if javascript/i.test(v);

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
    `${BASE}/items/rsac_pages?fields=id,slug,title,summary,html,translations&limit=500`,
    { headers: auth }
  ).then((r) => r.json());

  let changed = 0;
  for (const p of pages.data) {
    const patch = {};

    // EN text + html
    const enTitle = decodeText(p.title || "");
    if (p.title && enTitle !== p.title) patch.title = enTitle;
    const enSummary = decodeText(p.summary || "");
    if (p.summary && enSummary !== p.summary) patch.summary = enSummary;
    const enHtml = fixDouble(p.html || "");
    if (p.html && enHtml !== p.html) patch.html = enHtml;

    // translations.hi
    let tr = p.translations;
    if (typeof tr === "string") {
      try { tr = JSON.parse(tr); } catch { tr = null; }
    }
    if (tr && typeof tr === "object" && tr.hi && typeof tr.hi === "object") {
      const hi = { ...tr.hi };
      let hiChanged = false;
      for (const [k, v] of Object.entries(hi)) {
        if (isShell(v)) { delete hi[k]; hiChanged = true; continue; }
        if (typeof v !== "string") continue;
        const fixed = k === "html" ? fixDouble(v) : decodeText(v);
        if (fixed !== v) { hi[k] = fixed; hiChanged = true; }
      }
      if (hiChanged) patch.translations = { ...tr, hi };
    }

    if (Object.keys(patch).length) {
      const res = await fetch(`${BASE}/items/rsac_pages/${p.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((r) => r.json());
      if (res?.errors) throw new Error(p.slug + ": " + JSON.stringify(res.errors));
      changed += 1;
      console.log("cleaned", p.slug, "->", Object.keys(patch).join(", "));
    }
  }
  console.log(`\nDone. ${changed} page(s) patched.`);
};

main().catch((e) => { console.error(e); process.exitCode = 1; });
