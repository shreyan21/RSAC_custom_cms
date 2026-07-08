// Writes REAL official Hindi page bodies into Directus rsac_pages.translations.hi.
//
// Why this exists: the live site runs with VITE_CMS_ENABLED=true, so Hindi is
// read from each rsac_pages item's translations.hi — NOT from the static
// *.generated.js files. An older sync wrote translations.hi by fetching the
// ENGLISH slug under /hi, which 404s to a JS shell, so every Hindi body became
// the noscript banner ("Some of the functionalities will not work..."). The
// real Hindi lives at the *Devanagari* slug (e.g. /hi/page/कृषि-संसाधन-विभाग1)
// and IS server-rendered. This script scrapes that real body, sanitizes it to
// the same tag set the English body uses (identical layout), and PATCHes it
// into translations.hi so the Hindi page mirrors the English page.
//
// Usage:  node scripts/cms-write-hindi-pages.mjs [sectionKey ...]
//         (default section: divisions)

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const officialBaseUrl = "https://rsac.up.gov.in";
const directusUrl = "http://localhost:8055";
const pagesCollection = "rsac_pages";

const sectionsArg = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const targetSections = new Set(sectionsArg.length ? sectionsArg : ["divisions"]);

// English page slug -> official Hindi (Devanagari) page slug.
// Pages absent here keep their English body (no official Hindi source).
const slugMap = {
  // about-us
  "read-more-about-us": "हमारे-बारे-में",
  "organisational-chart": "संगठनात्मक-चार्ट",
  "our-chairman's-governing-body": "हमारे-अध्यक्ष-शासी-निकाय",
  "our-former": "वैज्ञानिक-",
  "scientific-manpower": "वैज्ञानिक-जनशक्ति",
  "administrative-and-auxiliary-staff": "प्रशासनिक-और-सहायक-कर्मचारी",
  // divisions
  "agriculture-resources-division1": "कृषि-संसाधन-विभाग1",
  "computer-image-processing-division": "कंप्यूटर-इमेज-प्रोसेसिंग-डिवीजन",
  "earth-resources-division1": "पृथ्वी-संसाधन-प्रभाग",
  "forest-resources-ecology-division": "वन-संसाधन-और-पारिस्थितिकी-विभाग1",
  "groundwater-resources-division1": "भूजल-संसाधन-विभाग1",
  "geo-spatial-data-bank-division1": "भौगोलिक-स्थानिक-डाटा-बैंक-विभाग1",
  "landuse-amp;-urban-survey-division1": "भूमि-उपयोग-और-शहरी-सर्वेक्षण-विभाग1",
  "soil-resources-division1": "मृदा-संसाधन-विभाग1",
  "surface-water-resources-division1": "भूतल-जल-संसाधन-विभाग1",
  "training-division": "प्रशिक्षण-डिवीजन",
  "school-of-geo-informatics-division1": "स्कूल-ऑफ-जियो-इंफॉर्मेटिक्स1",
  // facilities
  "computer-and-image-processing-lab1": "कंप्यूटर-और-इमेज-प्रोसेसिंग-लैब",
  "water-analysis-lab1": "जल-विश्लेषण-लैब",
  "soil-analysis-lab1": "मिट्टी-विश्लेषण-लैब",
  "data-bank1": "डेटा-बैंक",
  "technical-cell": "तकनीकी-कक्ष",
  "library1": "पुस्तकालय",
  "cartography-reprography": "नक्शानवीसी-और-रीप्रोग्राफी",
  "training-hostels": "प्रशिक्षण-हॉस्टल",
  "service-block1": "सर्विस-ब्लॉक-",
  "lidar-bathymetry-lab": "लिडार-और-बैथिमेट्री-",
  // academics
  "school-of-geo-informatics-": "स्कूल-ऑफ-जियो-इंफॉर्मेटिक्स",
  "training-division-": "प्रशिक्षण-विभाग",
};

const allowedTags = new Set([
  "a", "b", "br", "caption", "div", "em", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "i", "img", "li", "ol", "p",
  "span", "strong", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);

const namedEntities = {
  amp: "&",
  gt: ">",
  lt: "<",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  quot: '"',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  zwj: "\u200d",
  zwnj: "\u200c",
};

const decodeEntities = (value = "") =>
  String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }
    return namedEntities[normalized] ?? match;
  });

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const stripTags = (html = "") =>
  decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const toAbsoluteUrl = (rawValue) => {
  const value = decodeEntities(rawValue || "").trim();
  if (!value || value === "#" || /^javascript:/i.test(value)) return "";
  try {
    return new URL(value, `${officialBaseUrl}/`).href;
  } catch {
    return "";
  }
};

const cleanAttributes = (tagName, rawAttributes, fallbackTitle) => {
  const tag = tagName.toLowerCase();
  const entries = [];
  const attributes = [];
  const matcher = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = matcher.exec(rawAttributes))) {
    entries.push({ name: match[1].toLowerCase(), value: match[3] ?? match[4] ?? match[5] ?? "" });
  }
  if (tag === "a") {
    const href = toAbsoluteUrl(entries.find((e) => e.name === "href")?.value);
    if (href) {
      attributes.push(`href="${escapeAttribute(href)}"`, 'target="_blank"', 'rel="noopener noreferrer"');
    }
  }
  if (tag === "img") {
    const src = toAbsoluteUrl(
      entries.find((e) => ["data-original", "data-src", "src"].includes(e.name))?.value
    );
    const alt = entries.find((e) => e.name === "alt")?.value || fallbackTitle;
    if (src) {
      attributes.push(`src="${escapeAttribute(src)}"`, `alt="${escapeAttribute(alt)}"`, 'loading="lazy"', 'decoding="async"');
    }
  }
  if (tag === "td" || tag === "th") {
    entries
      .filter((e) => ["colspan", "rowspan"].includes(e.name))
      .forEach((e) => attributes.push(`${e.name}="${escapeAttribute(e.value)}"`));
  }
  return attributes.length ? ` ${attributes.join(" ")}` : "";
};

const extractMainContent = (html) => {
  const match = html.match(
    /<section id=["']main-content["'][^>]*>([\s\S]*?)<\/section>\s*<footer/i
  );
  return (match?.[1] || html)
    .replace(/<ol class=["']breadcrumb["'][\s\S]*?<\/ol>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
};

const sanitizeContent = (html, fallbackTitle) => {
  const content = extractMainContent(html)
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+/g, " ");
  return content
    .replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g, (full, closing, tagName, attributes) => {
      const tag = tagName.toLowerCase();
      if (!allowedTags.has(tag)) return "";
      if (closing) return ["br", "img"].includes(tag) ? "" : `</${tag}>`;
      if (tag === "br") return "<br>";
      return `<${tag}${cleanAttributes(tag, attributes, fallbackTitle)}>`;
    })
    .replace(/<a>\s*([\s\S]*?)\s*<\/a>/gi, "<span>$1</span>")
    .replace(/<a(?:\s[^>]*)?>\s*<\/a>/gi, "")
    .replace(/<(p|div)>\s*<\/\1>/gi, "")
    .trim();
};

const getHindiTitle = (html, fallback) => {
  const main = extractMainContent(html);
  const heading = stripTags(main.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1] || "");
  return /[ऀ-ॿ]/.test(heading) ? heading : fallback;
};

const NOSCRIPT_MARKER = "Some of the functionalities will not work";

const fetchHindiBody = async (hindiSlug, fallbackTitle) => {
  const sourceUrl = `${officialBaseUrl}/hi/page/${encodeURIComponent(hindiSlug)}`;
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${response.status} ${sourceUrl}`);
  const sourceHtml = await response.text();
  const title = getHindiTitle(sourceHtml, fallbackTitle);
  const html = sanitizeContent(sourceHtml, title);
  const text = stripTags(html);
  if (!text || text.includes(NOSCRIPT_MARKER) || !/[ऀ-ॿ]/.test(text)) {
    throw new Error(`empty/noscript body: ${sourceUrl}`);
  }
  return { sourceUrl, title, html, summary: text.slice(0, 280) };
};

// --- Directus admin auth + write ----------------------------------------

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
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL / ADMIN_PASSWORD missing in backend/directus/.env");
  }
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
  const authHeaders = { Authorization: `Bearer ${token}` };

  const listRes = await fetch(
    `${directusUrl}/items/${pagesCollection}?fields=id,section_key,slug,translations&limit=-1`,
    { headers: authHeaders }
  );
  if (!listRes.ok) throw new Error(`list failed: ${listRes.status}`);
  const pages = (await listRes.json()).data;

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const page of pages) {
    if (!targetSections.has(page.section_key)) continue;
    const hindiSlug = slugMap[page.slug];
    if (!hindiSlug) {
      skip += 1;
      process.stdout.write(`  skip (no hi slug) ${page.section_key}/${page.slug}\n`);
      continue;
    }
    try {
      const { sourceUrl, title, html, summary } = await fetchHindiBody(hindiSlug, page.slug);

      let existing = page.translations;
      if (typeof existing === "string") {
        try { existing = JSON.parse(existing); } catch { existing = {}; }
      }
      const translations = { ...(existing || {}), hi: { title, summary, html, source_url: sourceUrl } };

      const patchRes = await fetch(`${directusUrl}/items/${pagesCollection}/${page.id}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ translations }),
      });
      if (!patchRes.ok) throw new Error(`PATCH ${patchRes.status} ${await patchRes.text()}`);

      ok += 1;
      process.stdout.write(`  hi   #${page.id} ${page.slug} -> ${hindiSlug} (${html.length} chars)\n`);
    } catch (error) {
      fail += 1;
      process.stderr.write(`  FAIL #${page.id} ${page.slug}: ${error.message}\n`);
    }
  }

  process.stdout.write(`\nDone. updated=${ok} skipped=${skip} failed=${fail} (sections: ${[...targetSections].join(",")})\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
