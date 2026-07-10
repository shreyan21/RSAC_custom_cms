import { canonicalDivisionSection } from "./divisionSectionLabels";
import { hiTranslations } from "./translations";
import {
  decodeHtmlEntities,
  decodeLocalizedValue,
  isRawHtmlKey,
} from "../utils/htmlEntities";

export const applyOfficialHindi = (value, key = "") => {
  if (typeof value === "string") {
    return isRawHtmlKey(key) ||
      key === "baseTitle" ||
      key === "baseSummary" ||
      key === "baseName"
      ? value
      : decodeHtmlEntities(hiTranslations[value] || value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => applyOfficialHindi(item, key));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        applyOfficialHindi(childValue, childKey),
      ])
    );
  }

  return decodeLocalizedValue(value);
};

const getSrcImageTags = (html) =>
  (html.match(/<img\b[^>]*>/gi) || []).filter((tag) => /\ssrc=/i.test(tag));

const getImgKey = (tag) => {
  const match = tag.match(/\ssrc\s*=\s*["']?([^"'\s>]+)/i);
  return match ? match[1].split(/[?#]/)[0].split("/").pop().toLowerCase() : "";
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

        if (
          !enImages.length ||
          (hiSrcImages.length && hiSrcImages.length === hiAllImages.length)
        ) {
          return based;
        }

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
          html = `${html}${candidates.slice(consumed).join("")}`;
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

export const sectionOverrideKey = (text) => {
  const trimmed = String(text ?? "").trim();
  return (canonicalDivisionSection(trimmed) || trimmed).toLowerCase();
};

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

  return value === undefined || value === null ? fallback : value;
};
