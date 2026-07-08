// Fill Directus `translations.hi` from vetted local Hindi fallback files.
// Sources: exact UI and division phrase maps, generated page backup, policy backup.
// Existing Hindi wins; only missing values are filled.
//
// Run:  node scripts/cms-write-hindi-from-map.mjs          (dry run, prints plan)
//       node scripts/cms-write-hindi-from-map.mjs --apply  (writes to Directus)

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hiTranslations } from "../src/data/translations.js";
import { divisionHindiPhrases } from "../src/data/divisionHindiPhrases.js";
import {
  divisionHindiFallback,
  facilityHindiFallback,
  localizeMenuItems,
  publicInfoPagesHindi,
} from "../src/data/hindiContent.js";
import { rsacOfficialSections as hindiSections } from "../src/data/rsacOfficialContent.hi.generated.js";
import { policyPagesHindi } from "../src/data/policies.hi.generated.js";
import { translatePageTextFields } from "../src/data/pageTextFields.js";

const repoRoot = resolve(import.meta.dirname, "..");
const apply = process.argv.includes("--apply");

const fetchWithRetry = async (url, options = {}) => {
  let response;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    response = await fetch(url, options);
    if (response.status !== 429) return response;

    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter)
      ? Math.max(retryAfter * 1000, 300)
      : 500 * (attempt + 1);
    await new Promise((resolveWait) => setTimeout(resolveWait, delay));
  }
  return response;
};

const collections = [
  "rsac_site_settings",
  "rsac_content_blocks",
  "rsac_brand_logos",
  "rsac_organisation_roles",
  "rsac_quick_links",
  "rsac_home_feature_tabs",
  "rsac_mobile_apps",
  "rsac_gallery_items",
  "rsac_sections",
  "rsac_pages",
  "rsac_divisions",
  "rsac_facilities",
  "rsac_geoportals",
  "rsac_notices",
  "rsac_contact",
  "rsac_manpower_groups",
  "rsac_menu",
  "rsac_public_info",
  "rsac_profiles",
  "rsac_hero_videos",
  "rsac_flood_reports",
  "rsac_policies",
];

const plainHindiFieldPairs = {
  rsac_content_blocks: [["value", "value_hi"]],
  rsac_brand_logos: [["title", "title_hi"], ["alt_text", "alt_text_hi"]],
  rsac_organisation_roles: [["title", "title_hi"], ["name", "name_hi"], ["role", "role_hi"], ["post", "post_hi"]],
  rsac_quick_links: [["title", "title_hi"], ["description", "description_hi"]],
  rsac_home_feature_tabs: [["title", "title_hi"], ["summary", "summary_hi"], ["details", "details_hi"], ["button_label", "button_label_hi"]],
  rsac_mobile_apps: [["title", "title_hi"], ["description", "description_hi"]],
  rsac_gallery_items: [["title", "title_hi"], ["alt_text", "alt_text_hi"]],
  rsac_contact: [["title", "title_hi"], ["address", "address_hi"], ["contacts", "contacts_hi"]],
  rsac_sections: [["title", "title_hi"], ["eyebrow", "eyebrow_hi"], ["intro", "intro_hi"]],
  rsac_pages: [["title", "title_hi"], ["summary", "summary_hi"], ["html", "html_hi"]],
  rsac_profiles: [["name", "name_hi"], ["role", "role_hi"], ["designation", "designation_hi"], ["department", "department_hi"], ["deployment", "deployment_hi"], ["duration", "duration_hi"], ["specialization", "specialization_hi"], ["experience", "experience_hi"], ["publications", "publications_hi"], ["category", "category_hi"], ["details", "details_hi"]],
  rsac_divisions: [["title", "title_hi"], ["lead", "lead_hi"], ["highlights", "highlights_hi"]],
  rsac_facilities: [["title", "title_hi"], ["text", "text_hi"]],
  rsac_geoportals: [["title", "title_hi"], ["description", "description_hi"]],
  rsac_notices: [["title", "title_hi"], ["category", "category_hi"], ["meta", "meta_hi"]],
  rsac_flood_reports: [["title", "title_hi"], ["date_label", "date_label_hi"], ["category", "category_hi"], ["coverage", "coverage_hi"], ["meta", "meta_hi"]],
  rsac_policies: [["title", "title_hi"], ["summary", "summary_hi"], ["sections", "sections_hi"]],
  rsac_public_info: [["title", "title_hi"], ["eyebrow", "eyebrow_hi"], ["summary", "summary_hi"], ["sections", "sections_hi"], ["links", "links_hi"]],
  rsac_hero_videos: [["title", "title_hi"]],
  rsac_manpower_groups: [["title", "title_hi"], ["text", "text_hi"]],
  rsac_menu: [["title", "title_hi"], ["description", "description_hi"], ["links", "links_hi"]],
};

const collectionsWithoutLegacyTranslations = new Set([
  "rsac_content_blocks",
  "rsac_brand_logos",
  "rsac_organisation_roles",
  "rsac_quick_links",
  "rsac_home_feature_tabs",
  "rsac_mobile_apps",
  "rsac_gallery_items",
]);

const SKIP_KEYS = new Set([
  "id",
  "sort",
  "status",
  "translations",
  "content_fields",
  "content_fields_hi",
  "date_created",
  "date_updated",
  "user_created",
  "user_updated",
]);

// Translate any string that EXACTLY matches an official Hindi term. complete=true
// (used inside arrays, which Directus/deepMerge replaces wholesale) returns full
// objects so untranslated siblings are not lost; complete=false returns only the
// changed keys so object merges stay minimal.
const translate = (value, complete = false, translations = hiTranslations) => {
  if (typeof value === "string") {
    const key = value.trim();
    const hi = translations[key];
    return hi && hi !== value
      ? { changed: true, value: hi }
      : { changed: false, value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const r = translate(item, true, translations);
      if (r.changed) changed = true;
      return r.value;
    });
    return { changed, value: out };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SKIP_KEYS.has(k)) continue;
      const r = translate(v, complete, translations);
      if (complete) {
        out[k] = r.value;
        if (r.changed) changed = true;
      } else if (r.changed) {
        out[k] = r.value;
        changed = true;
      }
    }
    return { changed, value: out };
  }

  return { changed: false, value };
};

const hasDevanagari = (value) => /[\u0900-\u097f]/.test(JSON.stringify(value));

// Existing approved Hindi wins. A non-empty "Hindi" value that is still wholly
// English is treated as missing and replaced by the bundled Hindi fallback.
const mergePreferExisting = (generated, existing) => {
  if (
    generated &&
    existing &&
    typeof generated === "object" &&
    typeof existing === "object" &&
    !Array.isArray(generated) &&
    !Array.isArray(existing)
  ) {
    const out = { ...generated };
    for (const [k, v] of Object.entries(existing)) {
      out[k] = k in generated ? mergePreferExisting(generated[k], v) : v;
    }
    return out;
  }
  if (Array.isArray(existing)) {
    if (!existing.length) return generated;
    return hasDevanagari(existing) || !hasDevanagari(generated)
      ? existing
      : generated;
  }

  if (existing === undefined || existing === null || existing === "") {
    return generated;
  }
  if (
    typeof existing === "string" &&
    typeof generated === "string" &&
    !hasDevanagari(existing) &&
    hasDevanagari(generated)
  ) {
    return generated;
  }
  return existing;
};

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object") {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
};

const parseEnv = (content) =>
  content.split(/\r?\n/).reduce((acc, line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) acc[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    return acc;
  }, {});

const getExistingHi = (translations) => {
  let t = translations;
  if (typeof t === "string") {
    try {
      t = JSON.parse(t);
    } catch {
      t = {};
    }
  }
  return { all: t && typeof t === "object" ? t : {}, hi: t?.hi || {} };
};

const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

const isLanguageNeutral = (value) =>
  typeof value === "string" &&
  value.trim() !== "" &&
  !/[A-Za-z\u0900-\u097f]/.test(value);

const isTechnicalContentBlock = (item) => {
  if (item?.value_type && item.value_type !== "text" && item.value_type !== "multiline") {
    return true;
  }
  return /(?:\.keywords\.\d+|\.(?:id|icon|path|url|href|external|objectPosition|website|sourceUrl|downloadName|mapQuery|slug|route|key|sort|accent|color|reviewDate|reviewLabel)$|accessibility\.screenReaders\.\d+\.name|footer\.socialLinks\.\d+\.name|search\.languageLabels\.)/i.test(
    String(item?.key || "")
  );
};

const getPlainHindiPatch = (collection, item, generatedHi) => {
  const entries = [];
  for (const [englishField, hindiField] of
    plainHindiFieldPairs[collection] || []) {
    const value = !isEmptyValue(generatedHi?.[englishField])
      ? generatedHi[englishField]
      : isLanguageNeutral(item[englishField])
        ? item[englishField]
        : collection === "rsac_content_blocks" &&
            isTechnicalContentBlock(item)
          ? item[englishField]
        : undefined;
    const current = item[hindiField];
    const needsHindi =
      isEmptyValue(current) ||
      (!hasDevanagari(current) && hasDevanagari(value));
    if (needsHindi && !isEmptyValue(value)) {
      entries.push([hindiField, value]);
    }
  }
  return Object.fromEntries(entries);
};

const main = async () => {
  const env = parseEnv(
    await readFile(resolve(repoRoot, "backend/directus/.env"), "utf8")
  );
  const baseUrl = (env.PUBLIC_URL || "http://localhost:8055").replace(/\/+$/, "");

  const login = await fetchWithRetry(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    }),
  });

  if (!login.ok) {
    throw new Error(`Login failed: ${login.status} ${await login.text()}`);
  }

  const token = (await login.json()).data.access_token;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const getItems = async (collection, fields) => {
    const response = await fetchWithRetry(
      `${baseUrl}/items/${collection}?fields=${fields}&limit=-1`,
      { headers: authHeaders }
    );

    if (!response.ok) {
      process.stdout.write(`SKIP ${collection}: ${response.status}\n`);
      return [];
    }

    const data = (await response.json()).data;
    return Array.isArray(data) ? data : data ? [data] : [];
  };

  const writeHindi = async (collection, item, generatedHi, label) => {
    const { all, hi: existingHi } = getExistingHi(item.translations);
    const mergedHi = mergePreferExisting(generatedHi, existingHi);
    const plainPatch = getPlainHindiPatch(collection, item, mergedHi);

    if (deepEqual(mergedHi, existingHi) && !Object.keys(plainPatch).length) {
      return 0;
    }

    process.stdout.write(
      `${apply ? "WRITE" : "PLAN "} ${collection}/${label}\n`
    );

    if (apply) {
      const patch = await fetchWithRetry(`${baseUrl}/items/${collection}/${item.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          translations: { ...all, hi: mergedHi },
          ...plainPatch,
        }),
      });

      if (!patch.ok) {
        process.stdout.write(
          `  ! PATCH failed ${patch.status}: ${await patch.text()}\n`
        );
        return 0;
      }
    }

    return 1;
  };

  const writePageTextRows = async (item, rows, label) => {
    if (deepEqual(rows, item.content_fields_hi || [])) return 0;

    process.stdout.write(`${apply ? "WRITE" : "PLAN "} rsac_pages/${label} text rows\n`);
    if (apply) {
      const patch = await fetchWithRetry(
        `${baseUrl}/items/rsac_pages/${item.id}`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ content_fields_hi: rows }),
        }
      );
      if (!patch.ok) {
        process.stdout.write(
          `  ! PATCH failed ${patch.status}: ${await patch.text()}\n`
        );
        return 0;
      }
    }
    return 1;
  };

  let totalWrites = 0;

  for (const collection of collections) {
    const res = await fetchWithRetry(
      `${baseUrl}/items/${collection}?fields=*&limit=-1`,
      { headers: authHeaders }
    );

    if (!res.ok) {
      process.stdout.write(`SKIP ${collection}: ${res.status}\n`);
      continue;
    }

    const data = (await res.json()).data;
    const isSingleton = !Array.isArray(data);
    const items = isSingleton ? [data] : data;
    const translationMap =
      collection === "rsac_divisions"
        ? { ...hiTranslations, ...divisionHindiPhrases }
        : hiTranslations;

    for (const item of items) {
      const generated = translate(item, false, translationMap).value || {};

      const hasLegacyTranslations =
        !collectionsWithoutLegacyTranslations.has(collection);
      const { all, hi: existingHi } = hasLegacyTranslations
        ? getExistingHi(item.translations)
        : { all: {}, hi: {} };
      const mergedHi = hasLegacyTranslations
        ? mergePreferExisting(generated, existingHi)
        : generated;
      const plainPatch = getPlainHindiPatch(collection, item, mergedHi);

      if (
        (!hasLegacyTranslations || deepEqual(mergedHi, existingHi)) &&
        !Object.keys(plainPatch).length
      ) {
        continue;
      }

      const body = {
        ...(hasLegacyTranslations
          ? { translations: { ...all, hi: mergedHi } }
          : {}),
        ...plainPatch,
      };
      const url = isSingleton
        ? `${baseUrl}/items/${collection}`
        : `${baseUrl}/items/${collection}/${item.id}`;

      const addedKeys = hasLegacyTranslations
        ? Object.keys(generated).filter((k) => !(k in existingHi))
        : Object.keys(plainPatch);
      process.stdout.write(
        `${apply ? "WRITE" : "PLAN "} ${collection}${
          isSingleton ? "" : `/${item.id}`
        } +[${addedKeys.join(", ")}]\n`
      );

      if (apply) {
        const patch = await fetchWithRetry(url, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        if (!patch.ok) {
          process.stdout.write(
            `  ! PATCH failed ${patch.status}: ${await patch.text()}\n`
          );
          continue;
        }
      }
      totalWrites += 1;
    }
  }

  const cmsFacilities = await getItems(
    "rsac_facilities",
    "id,title,title_hi,text,text_hi,translations"
  );
  for (const facility of cmsFacilities) {
    const fallbackEntry = Object.entries(facilityHindiFallback).find(
      ([title]) => title.toLowerCase() === String(facility.title).toLowerCase()
    )?.[1];
    if (!fallbackEntry) continue;

    totalWrites += await writeHindi(
      "rsac_facilities",
      facility,
      { title: fallbackEntry[0], text: fallbackEntry[1] },
      facility.title
    );
  }

  const cmsMenuItems = await getItems(
    "rsac_menu",
    "id,title,title_hi,description,description_hi,path,links,links_hi,translations"
  );
  const localizedMenuItems = localizeMenuItems(cmsMenuItems, "hi");
  for (const [index, item] of cmsMenuItems.entries()) {
    const translated = localizedMenuItems[index];
    totalWrites += await writeHindi(
      "rsac_menu",
      item,
      {
        title: translated.title,
        description: translated.description,
        links: translated.links,
      },
      item.path || item.id
    );
  }

  const cmsPublicInfo = await getItems(
    "rsac_public_info",
    "id,slug,title,title_hi,eyebrow,eyebrow_hi,summary,summary_hi,sections,sections_hi,links,links_hi,translations"
  );
  const publicInfoHindiBySlug = new Map(
    publicInfoPagesHindi.map((page) => [page.slug, page])
  );
  for (const item of cmsPublicInfo) {
    const translated = publicInfoHindiBySlug.get(item.slug);
    if (!translated) continue;

    totalWrites += await writeHindi(
      "rsac_public_info",
      item,
      {
        title: translated.title,
        eyebrow: translated.eyebrow,
        summary: translated.summary,
        sections: translated.sections,
        links: translated.links,
      },
      item.slug
    );
  }

  const [cmsSections, cmsPages, cmsPolicies, cmsDivisions] = await Promise.all([
    getItems(
      "rsac_sections",
      "id,key,title_hi,eyebrow_hi,intro_hi,translations"
    ),
    getItems(
      "rsac_pages",
      "id,section_key,slug,title_hi,summary_hi,html_hi,content_fields,content_fields_hi,translations"
    ),
    getItems(
      "rsac_policies",
      "id,slug,title_hi,summary_hi,sections_hi,translations"
    ),
    getItems(
      "rsac_divisions",
      "id,slug,title_hi,lead_hi,highlights_hi,translations"
    ),
  ]);
  const sectionByKey = new Map(cmsSections.map((item) => [item.key, item]));
  const pageByKey = new Map(
    cmsPages.map((item) => [`${item.section_key}:${item.slug}`, item])
  );
  const policyBySlug = new Map(cmsPolicies.map((item) => [item.slug, item]));

  for (const division of cmsDivisions) {
    const fallback = divisionHindiFallback[division.slug];
    if (!fallback) continue;

    totalWrites += await writeHindi(
      "rsac_divisions",
      division,
      { title: fallback[0], lead: fallback[1] },
      division.slug
    );
  }

  for (const section of hindiSections) {
    const cmsSection = sectionByKey.get(section.key);

    if (cmsSection) {
      totalWrites += await writeHindi(
        "rsac_sections",
        cmsSection,
        {
          title: section.title,
          eyebrow: section.eyebrow,
          intro: section.intro,
        },
        section.key
      );
    }

    for (const page of section.pages || []) {
      const cmsPage = pageByKey.get(`${section.key}:${page.slug}`);
      const hindiText = `${page.title || ""} ${page.summary || ""} ${
        page.html || ""
      }`;

      if (!cmsPage || !/[\u0900-\u097f]/.test(hindiText)) {
        continue;
      }

      totalWrites += await writeHindi(
        "rsac_pages",
        cmsPage,
        {
          title: page.title,
          summary: page.summary,
          html: page.html,
          source_url: page.sourceUrl,
        },
        `${section.key}:${page.slug}`
      );

      const currentRows = Array.isArray(cmsPage.content_fields_hi) &&
        cmsPage.content_fields_hi.length
        ? cmsPage.content_fields_hi
        : cmsPage.content_fields || [];
      const translatedRows = translatePageTextFields(currentRows, {
        ...hiTranslations,
        ...divisionHindiPhrases,
      });
      totalWrites += await writePageTextRows(
        cmsPage,
        translatedRows,
        `${section.key}:${page.slug}`
      );
    }
  }

  for (const policy of policyPagesHindi) {
    const cmsPolicy = policyBySlug.get(policy.slug);

    if (!cmsPolicy) {
      continue;
    }

    totalWrites += await writeHindi(
      "rsac_policies",
      cmsPolicy,
      {
        title: policy.title,
        summary: policy.summary,
        source_url: policy.source,
        sections: policy.sections,
      },
      policy.slug
    );
  }

  process.stdout.write(
    `\n${apply ? "Wrote" : "Would write"} ${totalWrites} item(s).\n`
  );
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
