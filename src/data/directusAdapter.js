import cmsConfig from "./cmsConfig";
import { hiTranslations } from "./translations";
import {
  decodeHtmlEntities,
  decodeLocalizedValue,
  isRawHtmlKey,
} from "../utils/htmlEntities";
import {
  rewriteOfficialMedia,
  rewriteOfficialMediaDeep,
} from "./officialMedia";
import { applyPageTextFields, flattenContentFields } from "./pageTextFields";
import { canonicalDivisionSection } from "./divisionSectionLabels";

export { rewriteOfficialMedia } from "./officialMedia";

// Recursively replace any string that EXACTLY matches an official Hindi term.
// Non-matching strings (names, long HTML bodies, URLs) pass through unchanged,
// so this only ever applies vetted official Hindi — never invents.
export const applyOfficialHindi = (value, key = "") => {
  if (typeof value === "string") {
    // base* fields hold the ENGLISH title/summary/name on purpose (used to strip
    // duplicate English headings from division bodies that stay English in Hindi
    // mode) — never translate them.
    return isRawHtmlKey(key) || key === "baseTitle" || key === "baseSummary" || key === "baseName"
      ? value
      : decodeHtmlEntities(hiTranslations[value] || value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyOfficialHindi(item, key));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const childKey of Object.keys(value)) {
      out[childKey] = applyOfficialHindi(value[childKey], childKey);
    }
    return out;
  }
  return decodeLocalizedValue(value);
};

// Only manifest-confirmed legacy assets are rewritten to local hosted copies.
// The Hindi scrape lost lazy-loaded image src for some sections (facilities,
// academics) — those pages carry src-less <img> tags that get pruned at render,
// so the page shows text but no photos. Restore the missing photos from the
// English generated content (same pages, same image order) without disturbing the
// Hindi prose: real <img src> tags replace the src-less ones in place, and any
// extra English images are appended so none are lost. Pages whose Hindi already
// has all images (about-us, divisions) are left untouched.
const getSrcImageTags = (html) =>
  (html.match(/<img\b[^>]*>/gi) || []).filter((tag) => /\ssrc=/i.test(tag));

// Compare images by file name: the Hindi and English html localize the same
// image to different paths (/official-media/hi/... vs /en/...), so the full
// src never matches across languages.
const getImgKey = (tag) => {
  const match = tag.match(/\ssrc\s*=\s*["']?([^"'\s>]+)/i);
  return match
    ? match[1].split(/[?#]/)[0].split("/").pop().toLowerCase()
    : "";
};

export const backfillOfficialImages = (hiSections, enSections) => {
  if (!Array.isArray(hiSections) || !Array.isArray(enSections)) {
    return hiSections;
  }

  const enBySection = new Map(
    enSections.map((section) => [
      section.key,
      new Map((section.pages || []).map((page) => [page.slug, page])),
    ])
  );

  return hiSections.map((section) => {
    const enPages = enBySection.get(section.key);

    if (!enPages) {
      return section;
    }

    return {
      ...section,
      pages: (section.pages || []).map((page) => {
        const enPage = enPages.get(page.slug);
        // Carry the English title/summary so Hindi division bodies (which stay
        // English until render-time translation) can strip the duplicate English
        // heading, matching the English page.
        const based = enPage
          ? {
              ...page,
              baseTitle: page.baseTitle ?? enPage.title,
              baseSummary: page.baseSummary ?? enPage.summary,
            }
          : page;

        if (!enPage || typeof based.html !== "string") {
          return based;
        }

        const enImages = getSrcImageTags(enPage.html);
        const hiAllImages = based.html.match(/<img\b[^>]*>/gi) || [];
        const hiSrcImages = hiAllImages.filter((tag) => /\ssrc=/i.test(tag));

        // Backfill only pages whose Hindi scrape actually lost images:
        // src-less <img> tags, or no <img> tags at all. A Hindi page whose
        // images all have src is complete — even when the English page has
        // an image the Hindi one doesn't (e.g. a language-specific chart).
        if (
          !enImages.length ||
          (hiSrcImages.length && hiSrcImages.length === hiAllImages.length)
        ) {
          return based;
        }

        // Only fill with English images the Hindi page does not already show.
        // Filling from the raw English list duplicated any photo the Hindi
        // page kept (e.g. an officer portrait appeared twice side by side)
        // and shifted every later photo into the wrong slot. Deduping the
        // candidate list also keeps a repeated English image from occupying
        // two Hindi slots.
        const hiKeys = new Set(hiSrcImages.map(getImgKey));
        const seen = new Set();
        const candidates = enImages.filter((tag) => {
          const key = getImgKey(tag);
          if (!key || hiKeys.has(key) || seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });

        if (!candidates.length) {
          return based;
        }

        let consumed = 0;
        let html = based.html.replace(/<img\b[^>]*>/gi, (tag) =>
          /\ssrc=/i.test(tag)
            ? tag
            : consumed < candidates.length
            ? candidates[consumed++]
            : tag
        );

        if (consumed < candidates.length) {
          // Gallery pages whose Hindi scrape lost the images entirely have no
          // src-less slots to fill; append the photos so none are lost.
          html += `<div>${candidates.slice(consumed).join("")}</div>`;
        }

        return { ...based, html };
      }),
    };
  });
};

export const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Named HTML entities seen in the official-site content (plus the common set).
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ", ndash: "–", mdash: "—",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  hellip: "…", times: "×", deg: "°", middot: "·",
  bull: "•", laquo: "«", raquo: "»",
  copy: "©", reg: "®", trade: "™",
};

const ENTITY_NAMES = Object.keys(NAMED_ENTITIES).join("|");

// For HTML bodies (rendered via dangerouslySetInnerHTML), keep real entities but
// repair DOUBLE encoding: "&amp;nbsp;" -> "&nbsp;", "&amp;amp;" -> "&amp;", so
// the browser shows a space / "&" instead of the literal "&nbsp;" / "&amp;".
export const fixDoubleEncodedHtml = (html = "") =>
  String(html).replace(
    new RegExp(`&amp;(?=(?:${ENTITY_NAMES}|#x?[0-9a-fA-F]+);)`, "g"),
    "&"
  );

// The official site serves a JS-disabled shell ("Please enable Javascript...")
// for some routes. When that shell was scraped into translations.hi it showed
// as the page body in Hindi — detect it so we fall back to the English content.
const JS_SHELL_RE =
  /please enable javascript|functionalities will not work if javascript/i;
export const isJsDisabledShell = (value) =>
  typeof value === "string" && JS_SHELL_RE.test(value);

export const unwrapRelation = (value) => {
  if (!value) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => item?.item || item).filter(Boolean);
  }

  return value.item || value;
};

export const asArray = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return unwrapRelation(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

export const directusAssetUrl = (file) => {
  if (!file) {
    return "";
  }

  if (typeof file === "object") {
    return directusAssetUrl(
      file.id || file.directus_files_id || file.filename_download || file.url
    );
  }

  const value = String(file);

  if (/^(https?:|data:|blob:|\/)/i.test(value)) {
    return value;
  }

  return cmsConfig.baseUrl ? `${cmsConfig.baseUrl}/assets/${value}` : "";
};

export const directusImageUrl = (
  file,
  { width = 1200, quality = 80, fit = "cover" } = {}
) => {
  const url = directusAssetUrl(file);
  const assetPrefix = cmsConfig.baseUrl
    ? `${cmsConfig.baseUrl}/assets/`
    : "";

  if (!url || !assetPrefix || !url.startsWith(assetPrefix)) {
    return url;
  }

  const transformed = new URL(url);
  transformed.searchParams.set("width", String(width));
  transformed.searchParams.set("quality", String(quality));
  transformed.searchParams.set("format", "webp");
  transformed.searchParams.set("fit", fit);
  transformed.searchParams.set("withoutEnlargement", "true");
  return transformed.toString();
};

export const normalizeDirectusProfile = (item = {}) => ({
  id: item.id,
  profileType: String(item.profile_type || item.profileType || "")
    .trim()
    .toLowerCase(),
  name: item.name || item.title || "",
  role: item.role || item.designation || "",
  designation: item.designation || item.role || "",
  department: item.department || item.deployment || "",
  deployment: item.deployment || item.department || "",
  employeeId: item.employee_id || item.employeeId || "",
  duration:
    item.duration || item.tenure || item.time_period || item.timePeriod || "",
  image: rewriteOfficialMedia(
    directusImageUrl(item.photo || item.image || item.featured_image, {
      width: 640,
      quality: 80,
    })
  ),
  objectPosition:
    item.object_position || item.objectPosition || "center 22%",
  specialization: item.specialization || "",
  experience: item.experience || "",
  publications: item.publications || "",
  contact: item.contact || "",
  email: item.email || "",
  source: item.source_url || item.source || "",
  category: item.category || "",
  details: asArray(item.details),
});

// Swap page photos that an editor replaced in Directus ("Page Photos" rows):
// each row pairs the photo's original src in the locked HTML with an uploaded
// Directus image. Rows without an upload leave the original photo untouched.
// The HTML may hold the original remote src or its already-localised
// /official-media/ path (localizeDirectusItem rewrites media early), so both
// spellings are matched.
const applyPageImageOverrides = (html, overrides) =>
  asArray(overrides).reduce((output, row) => {
    const src = row?.original_src || row?.src || "";
    const url = directusAssetUrl(row?.image || row?.file);
    if (!src || !url) {
      return output;
    }
    const localizedSrc = rewriteOfficialMedia(src);
    const swapped = output.split(src).join(url);
    return localizedSrc && localizedSrc !== src
      ? swapped.split(localizedSrc).join(url)
      : swapped;
  }, html);

// Match key shared by the tab-rename override writer (below) and reader
// (DivisionCategorizedContent): canonical section name when the label is a
// known division tab in either language, else the raw label, lowercased.
export const sectionOverrideKey = (text) => {
  const trimmed = String(text ?? "").trim();
  return (canonicalDivisionSection(trimmed) || trimmed).toLowerCase();
};

export const normalizeDirectusContentPage = (item = {}) => {
  // Keep the CMS HTML as a locked layout template. Editors change only the
  // labelled plain-text rows in content_fields, which are safely inserted into
  // that template without letting text edits remove tabs, grids, or media.
  const html = rewriteOfficialMedia(
    applyPageImageOverrides(
      applyPageTextFields(
        fixDoubleEncodedHtml(item.html || item.content || item.body || ""),
        // content_fields may be flat rows or nested section groups; flatten
        // either shape to the { key, value } rows the template applier expects.
        flattenContentFields(asArray(item.content_fields))
      ),
      item.image_overrides
    )
  );
  const summary =
    item.summary ?? item.excerpt ?? item.description ?? stripHtml(html).slice(0, 360);

  // Section header rows in content_fields (key:null, with children) are the
  // editor's tab names. They are synthetic — not mapped to any html text — so
  // an editor renaming one changed nothing on the site. Surface the rename as
  // a tab-label override instead: label holds the engine's tab name, value the
  // editor's text; the division tab renderer swaps matching labels. Keys are
  // canonicalised so the Hindi tree's Devanagari labels ("वैज्ञानिक जनशक्ति")
  // still match the engine's English section labels ("Scientific Manpower").
  const sectionLabelOverrides = {};
  // Editor-added rows ("Add item") have no `key`, so they map to no existing
  // template text. Collect them per section instead; the division tab renderer
  // inserts them at the top of that section as an extra list.
  const sectionExtraItems = {};
  asArray(item.content_fields).forEach((row) => {
    const original = decodeHtmlEntities(String(row?.label ?? "").trim());

    if (row && !row.key && !Array.isArray(row.children)) {
      const added = decodeHtmlEntities(String(row.value ?? "").trim());
      const sectionKey = sectionOverrideKey(original);
      const looksLikeListSection =
        /project|report|research|publication|paper|article/i.test(original);

      if (added && sectionKey && looksLikeListSection && added !== original) {
        (sectionExtraItems[sectionKey] ||= []).push(added);
      }
      return;
    }

    if (!row || !Array.isArray(row.children)) {
      return;
    }
    if (!row.key) {
      const edited = decodeHtmlEntities(String(row.value ?? "").trim());
      if (original && edited && edited !== original) {
        sectionLabelOverrides[sectionOverrideKey(original)] = edited;
      }
    }
    row.children.forEach((child) => {
      if (!child || child.key) {
        return;
      }
      const added = decodeHtmlEntities(String(child.value ?? "").trim());
      if (added) {
        (sectionExtraItems[sectionOverrideKey(original)] ||= []).push(added);
      }
    });
  });

  return {
    sectionLabelOverrides,
    sectionExtraItems,
    cmsId: item.id,
    sectionKey:
      item.section_key || item.section?.key || item.section?.slug || "about-us",
    title: decodeHtmlEntities(item.title || ""),
    slug: item.slug || String(item.id || ""),
    summary: decodeHtmlEntities(summary),
    sourceUrl: item.source_url || item.source || "",
    preview: decodeHtmlEntities(item.preview ?? stripHtml(html).slice(0, 360)),
    html,
    // Editor-picked card look for section index grids (Website Pages → Card
    // Icon / Card Colors). Empty = automatic theme.
    cardIcon: item.card_icon || "",
    cardAccent: item.card_color || "",
    cardAccent2: item.card_color_2 || "",
    featuredImage: rewriteOfficialMedia(
      directusImageUrl(item.featured_image || item.image || item.hero_image, {
        width: 1600,
        quality: 80,
        fit: "contain",
      })
    ),
    sort: Number(item.sort ?? 0),
  };
};

export const normalizeDirectusPolicySections = (sections) =>
  asArray(sections).map((section) => ({
    heading: section.heading || section.title || "",
    body: rewriteOfficialMedia(section.body || section.content || ""),
  }));

export const deepMerge = (fallback, value) => {
  if (Array.isArray(value)) {
    return value.length ? value : fallback;
  }

  if (
    value &&
    typeof value === "object" &&
    fallback &&
    typeof fallback === "object" &&
    !Array.isArray(fallback)
  ) {
    return Object.keys({ ...fallback, ...value }).reduce((result, key) => {
      result[key] = deepMerge(fallback[key], value[key]);
      return result;
    }, {});
  }

  // Only a genuinely absent field (undefined/null) falls back. An empty string
  // is a DELIBERATE clear by the editor in Directus — respect it so removing
  // CMS text actually removes it on the site instead of resurrecting the old
  // fallback. Directus stores untouched fields as null (not ""), so this keeps
  // fallback safety for fields the editor never filled. Empty arrays still fall
  // back (an empty list is treated as "not provided", the safer default).
  return value === undefined || value === null ? fallback : value;
};

export const localizeDirectusItem = (item, language = "en") => {
  if (!item) {
    return item;
  }

  if (language !== "hi") {
    return rewriteOfficialMediaDeep(item);
  }

  let translations = item.translations;

  if (typeof translations === "string") {
    try {
      translations = JSON.parse(translations);
    } catch {
      translations = {};
    }
  }

  let translated = translations?.hi;
  const plainHindiFields = Object.fromEntries(
    Object.entries(item)
      .filter(
        ([key, value]) =>
          key.endsWith("_hi") &&
          value !== undefined &&
          value !== null &&
          String(value).trim() !== "" &&
          !isJsDisabledShell(value)
      )
      .map(([key, value]) => [key.slice(0, -3), value])
  );

  // Drop any hi field that is the scraped "enable Javascript" shell so deepMerge
  // keeps the real English value instead of showing the banner in Hindi.
  if (translated && typeof translated === "object") {
    translated = Object.fromEntries(
      Object.entries(translated).filter(([, value]) => !isJsDisabledShell(value))
    );
  }

  const translatedBase =
    translated && typeof translated === "object"
      ? deepMerge(item, translated)
      : item;
  const base = { ...translatedBase, ...plainHindiFields };

  // Fall back to the official Hindi term map for any field the CMS left in
  // English (CMS items rarely carry a full translations.hi block).
  return rewriteOfficialMediaDeep(
    decodeLocalizedValue(applyOfficialHindi(base))
  );
};
