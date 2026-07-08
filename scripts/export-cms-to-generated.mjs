// Snapshots the CMS (Directus rsac_pages + rsac_sections) into the static backup
// files so the offline fallback contains the SAME data the live CMS serves:
//   src/data/rsacOfficialContent.generated.js      (English)
//   src/data/rsacOfficialContent.hi.generated.js   (Hindi)
//
// Mirrors src/data/cmsService.getRsacOfficialSections exactly:
//   - English: every page uses its English body.
//   - Hindi: DIVISION pages use the English body (OfficialContentPage renders the
//     English structure + translates at runtime); all other sections use their
//     official Hindi body (translations.hi).
//
// Usage: node scripts/export-cms-to-generated.mjs

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hiTranslations } from "../src/data/translations.js";

const directusUrl = "http://localhost:8055";
const repoRoot = resolve(import.meta.dirname, "..");
const enPath = resolve(repoRoot, "src/data/rsacOfficialContent.generated.js");
const hiPath = resolve(repoRoot, "src/data/rsacOfficialContent.hi.generated.js");

// --- helpers replicated from directusAdapter (which can't run under Node) -----

const stripHtml = (v = "") =>
  String(v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const applyOfficialHindi = (value) => {
  if (typeof value === "string") return hiTranslations[value] || value;
  if (Array.isArray(value)) return value.map(applyOfficialHindi);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) out[k] = applyOfficialHindi(value[k]);
    return out;
  }
  return value;
};

const deepMerge = (fallback, value) => {
  if (Array.isArray(value)) return value.length ? value : fallback;
  if (value && typeof value === "object" && fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
    return Object.keys({ ...fallback, ...value }).reduce((res, key) => {
      res[key] = deepMerge(fallback[key], value[key]);
      return res;
    }, {});
  }
  return value === undefined || value === null || value === "" ? fallback : value;
};

const parseTranslations = (v) => {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v;
};

const hasHindiBody = (item) =>
  /[ऀ-ॿ]/.test(String(parseTranslations(item?.translations).hi?.html || ""));

const localizeItem = (item, language) => {
  if (language !== "hi") return item;
  const hi = parseTranslations(item.translations).hi;
  const base = hi && typeof hi === "object" ? deepMerge(item, hi) : item;
  return applyOfficialHindi(base);
};

const imageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img.startsWith("http") ? img : `${directusUrl}/assets/${img}`;
  if (img.id) return `${directusUrl}/assets/${img.id}`;
  return "";
};

const normalizePage = (item) => {
  const html = item.html || item.content || item.body || "";
  const summary = item.summary || item.excerpt || item.description || stripHtml(html).slice(0, 360);
  return {
    cmsId: item.id,
    sectionKey: item.section_key || "about-us",
    title: item.title || "",
    slug: item.slug || String(item.id || ""),
    summary,
    sourceUrl: item.source_url || item.source || "",
    preview: item.preview || stripHtml(html).slice(0, 360),
    html,
    featuredImage: imageUrl(item.featured_image || item.image || item.hero_image),
    sort: Number(item.sort ?? 0),
  };
};

const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()).data;
};

const buildSections = (sectionItems, pageItems, language) => {
  const byKey = new Map();
  (sectionItems || []).forEach((raw) => {
    const item = localizeItem(raw, language);
    const key = item.key || item.slug;
    byKey.set(key, {
      key,
      route: item.route || key,
      title: item.title || key,
      eyebrow: item.eyebrow || "",
      intro: item.intro || item.description || "",
      sort: Number(item.sort ?? 0),
      pages: [],
    });
  });

  pageItems
    .map((raw) => {
      const useEnglishDivisionFallback =
        language === "hi" &&
        raw.section_key === "divisions" &&
        !hasHindiBody(raw);
      return localizeItem(raw, useEnglishDivisionFallback ? "en" : language);
    })
    .map(normalizePage)
    .forEach((page) => {
      if (!byKey.has(page.sectionKey)) {
        byKey.set(page.sectionKey, {
          key: page.sectionKey,
          route: page.sectionKey,
          title: page.sectionKey,
          eyebrow: "",
          intro: "",
          sort: 0,
          pages: [],
        });
      }
      byKey.get(page.sectionKey).pages.push(page);
    });

  return Array.from(byKey.values())
    .sort((a, b) => a.sort - b.sort)
    .map((s) => ({
      key: s.key,
      route: s.route,
      title: s.title,
      eyebrow: s.eyebrow,
      intro: s.intro,
      pages: s.pages.sort((a, b) => a.sort - b.sort),
    }));
};

const fileBody = (sections, generator) =>
  `// Generated by scripts/export-cms-to-generated.mjs (snapshot of the live CMS).\n` +
  `// Do not edit by hand. Run the script to refresh. ${generator}\n\n` +
  `export const rsacOfficialContentGeneratedAt = ${JSON.stringify(new Date().toISOString())};\n\n` +
  `export const rsacOfficialSections = ${JSON.stringify(sections, null, 2)};\n\n` +
  `export const getRsacOfficialSection = (sectionKey) =>\n` +
  `  rsacOfficialSections.find((section) => section.key === sectionKey);\n\n` +
  `export const getRsacOfficialPage = (sectionKey, pageSlug) =>\n` +
  `  getRsacOfficialSection(sectionKey)?.pages.find((page) => page.slug === pageSlug);\n`;

const run = async () => {
  const [sectionItemsEn, sectionItemsHi, pageItems] = await Promise.all([
    getJson(`${directusUrl}/items/rsac_sections?fields=*&limit=-1`).catch(() => []),
    getJson(`${directusUrl}/items/rsac_sections?fields=*&limit=-1`).catch(() => []),
    getJson(
      `${directusUrl}/items/rsac_pages?fields=*&sort=section_key,sort,title&limit=-1`
    ),
  ]);

  const enSections = buildSections(sectionItemsEn, pageItems, "en");
  const hiSections = buildSections(sectionItemsHi, pageItems, "hi");

  await writeFile(enPath, fileBody(enSections, "(English)"), "utf8");
  await writeFile(hiPath, fileBody(hiSections, "(Hindi)"), "utf8");

  const count = (s) => s.reduce((n, x) => n + x.pages.length, 0);
  process.stdout.write(
    `Wrote EN ${enPath} (${enSections.length} sections, ${count(enSections)} pages)\n` +
      `Wrote HI ${hiPath} (${hiSections.length} sections, ${count(hiSections)} pages)\n`
  );
};

run().catch((e) => {
  process.stderr.write(`${e.stack || e.message}\n`);
  process.exit(1);
});
