import { pool } from "./db.js";
import { getCollection } from "../shared/cmsCollections.js";

const imageTags = (html) => String(html || "").match(/<img\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi) || [];

const imageSource = (tag) => tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || "";

const escapeAttribute = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const normalizeProfileText = (value) => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/^(?:dr|prof|mr|mrs|ms|shri|sri|smt)\.?\s+/iu, "")
  .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const isPlaceholderProfileImage = (value) =>
  /(?:^|[/\\])(?:\d+)?(?:no(?:[-_ ]*copy[-_ ]*\d*)?|placeholder|default[-_ ]*profile|profile[-_ ]*placeholder)\.(?:jpe?g|png|webp)$/i.test(
    String(value || "").split(/[?#]/)[0]
  );

const publicProfileKeys = (profile) => {
  const type = String(profile.profileType || "profile").toLowerCase();
  const pairs = [
    ["employee", normalizeProfileText(profile.employeeId)],
    ["email", String(profile.email || "").trim().toLowerCase()],
    ["name", normalizeProfileText(profile.name)],
  ];
  const photo = String(profile.photo || profile.image || "").split(/[?#]/)[0].toLowerCase();
  if (photo && !isPlaceholderProfileImage(photo)) pairs.push(["photo", photo]);
  return pairs.filter(([, value]) => value && value !== "notlisted").map(([kind, value]) => `${type}:${kind}:${value}`);
};

const dedupePublicProfiles = (profiles) => {
  const seen = new Set();
  return profiles.filter((profile) => {
    const keys = publicProfileKeys(profile);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
};

const normalizeProfileMedia = (profile) => {
  const image = profile.photo || profile.image || "";
  return image ? { ...profile, image } : profile;
};

const localizeImageTag = (tag, title) => {
  const withoutLabels = tag.replace(/\s+(?:alt|title)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
  return withoutLabels.replace(/<img\b/i, `<img alt="${escapeAttribute(title)}"`);
};

export const backfillSharedPageImages = (localizedHtml, englishHtml, title) => {
  const englishImages = imageTags(englishHtml);
  if (!englishImages.length) return localizedHtml || "";

  const localizedImages = imageTags(localizedHtml);
  const localizedSources = new Set(localizedImages.map(imageSource));
  const missingImages = englishImages.filter((tag) => !localizedSources.has(imageSource(tag)));
  if (!missingImages.length) return localizedHtml || "";

  const sharedMedia = missingImages.map((tag) => localizeImageTag(tag, title)).join("");
  return `${localizedHtml || ""}<div data-rsac-shared-media="true">${sharedMedia}</div>`;
};

const alignLocalizedBlockOwners = (localizedBlocks, englishBlocks) => {
  if (!Array.isArray(localizedBlocks) || !Array.isArray(englishBlocks)) return localizedBlocks;

  const ownerByChildKey = new Map();
  for (const block of englishBlocks) {
    const owner = block.sourceLabel || block.label || block.value || "";
    for (const child of block.children || []) {
      if (child?.key && owner) ownerByChildKey.set(child.key, owner);
    }
  }

  return localizedBlocks.flatMap((block, blockIndex) => {
    if (!Array.isArray(block?.children) || !block.children.length) return [block];

    const groups = new Map();
    for (const child of block.children) {
      const owner = ownerByChildKey.get(child?.key) || block.sourceLabel || block.label || block.value || "";
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner).push(child);
    }

    return [...groups.entries()].map(([owner, children], groupIndex) => ({
      ...block,
      ...(groups.size > 1
        ? { id: `${block.id || `cms-block-${blockIndex}`}-${groupIndex + 1}` }
        : {}),
      sourceLabel: owner,
      children,
    }));
  });
};

const sharedSiteSettingPaths = [
  ["appearance", "homeHeadingSize"],
  ["appearance", "homeBodySize"],
  ["homeSectionTypography"],
  ["location", "eyebrowSize"],
  ["location", "cardEyebrowSize"],
  ["hiddenHomeSections"],
  ["homeSectionOrder"],
];

const mergeSharedSiteSettingControls = (localizedSettings, englishSettings) => {
  const merged = { ...(localizedSettings || {}) };

  for (const path of sharedSiteSettingPaths) {
    let source = englishSettings;
    for (const key of path) source = source?.[key];
    if (source === undefined) continue;

    let target = merged;
    for (const key of path.slice(0, -1)) {
      target[key] = { ...(target[key] || {}) };
      target = target[key];
    }
    target[path.at(-1)] = source;
  }

  return merged;
};

export const localize = (entry, language) => {
  if (language !== "hi") return entry.data_en;
  const localized = { ...(entry.data_hi || {}) };
  const hasIndependentOfficialHindi =
    entry.collection === "pages" &&
    Array.isArray(entry.data_hi?.blocks) &&
    entry.data_hi.blocks.some((block) => String(block?.id || "").startsWith("official-"));
  const definition = getCollection(entry.collection);
  for (const field of definition?.fields || []) {
    if (
      field.localized === false &&
      !(hasIndependentOfficialHindi && field.name === "sourceUrl")
    ) {
      localized[field.name] = entry.data_en?.[field.name];
    }
  }
  if (entry.collection === "pages") {
    localized.baseTitle = entry.data_en?.title || "";
    if (!hasIndependentOfficialHindi) {
      localized.blocks = alignLocalizedBlockOwners(localized.blocks, entry.data_en?.blocks);
    }
    const categorizedPage = entry.data_en?.sectionKey === "divisions" ||
      /^training-division-?$/u.test(entry.data_en?.slug || entry.entry_key || "");
    // Division media is merged per tab in the frontend. Appending every missing
    // image here would move it into the final Hindi tab.
    if (!categorizedPage) {
      localized.html = backfillSharedPageImages(
        localized.html,
        entry.data_en?.html,
        localized.title || entry.data_en?.title
      );
    }
  }
  if (entry.collection === "site_settings") {
    localized.settings = mergeSharedSiteSettingControls(
      localized.settings,
      entry.data_en?.settings
    );
  }
  return localized;
};
const bySort = (a, b) => a.sort_order - b.sort_order || String(a.entry_key).localeCompare(String(b.entry_key));

const comparable = (value) => String(value || "").toLowerCase()
  .replace(/&amp;|&/g, "and")
  .replace(/\bdivisions?\b/g, "")
  .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const orderPagesLike = (pages, records) => {
  const rank = (page) => {
    const pageTitle = comparable(page.title);
    const pageSlug = comparable(String(page.slug || "").replace(/amp/g, ""));
    const index = records.findIndex((record) => {
      const recordTitle = comparable(record.title);
      const recordSlug = comparable(record.slug);
      return (recordSlug && pageSlug.startsWith(recordSlug)) || (recordTitle && pageTitle === recordTitle);
    });
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...pages].sort((left, right) => rank(left) - rank(right));
};

export const readPublishedEntries = async () => {
  const { rows } = await pool.query(
    `SELECT id, collection, entry_key, sort_order, data_en, data_hi, version, updated_at,
            (SELECT max(updated_at) FROM cms_entries) AS content_version
       FROM cms_entries
      WHERE status='published'
      ORDER BY collection, sort_order, entry_key`
  );
  return rows;
};

export const assembleBootstrap = (rows, language = "en") => {
  const contentVersion = rows.reduce((latest, row) => {
    const source = row.content_version || row.updated_at;
    const value = source ? new Date(source).toISOString() : "";
    return value > latest ? value : latest;
  }, "");
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.collection)) groups.set(row.collection, []);
    groups.get(row.collection).push(row);
  }
  const list = (collection) => (groups.get(collection) || []).sort(bySort).map((entry) => {
    const localized = localize(entry, language);
    const hasIndependentOfficialHindi =
      collection === "pages" &&
      language === "hi" &&
      Array.isArray(entry.data_hi?.blocks) &&
      entry.data_hi.blocks.some((block) => String(block?.id || "").startsWith("official-"));
    return {
      id: entry.id,
      key: entry.entry_key,
      ...localized,
      ...(collection === "pages" && language === "hi" && entry.data_en?.html
        ? {
            structureHtml: entry.data_en.html,
            structureAssetBlocks: entry.data_en.blocks || [],
            sharedAssetBlocks: entry.data_en.blocks || [],
          }
        : {}),
      ...(collection === "pages" && language === "hi" && entry.data_en?.html && hasIndependentOfficialHindi
        ? { profileStructureHtml: entry.data_en.html }
        : {}),
    };
  });
  const first = (collection) => list(collection)[0] || null;
  const profiles = dedupePublicProfiles(list("profiles").map(normalizeProfileMedia));
  const managedDivisionItems = list("division_section_items");
  const itemsByDivision = new Map();
  for (const item of managedDivisionItems) {
    if (!itemsByDivision.has(item.divisionSlug)) itemsByDivision.set(item.divisionSlug, {});
    const sectionsForDivision = itemsByDivision.get(item.divisionSlug);
    if (!sectionsForDivision[item.sectionKey]) sectionsForDivision[item.sectionKey] = [];
    sectionsForDivision[item.sectionKey].push(item);
  }
  const pages = list("pages").map((page) => ({
    ...page,
    managedSectionItems: itemsByDivision.get(page.slug) || {},
  }));
  const divisions = list("divisions");
  const facilities = list("facilities");
  const sections = list("page_sections").map((section) => {
    const sectionPages = pages.filter((page) => page.sectionKey === section.key);
    const orderingRecords = section.key === "divisions"
      ? divisions
      : section.key === "facilities" && facilities.length >= sectionPages.length
        ? facilities
        : [];
    return { ...section, pages: orderPagesLike(sectionPages, orderingRecords) };
  });
  const siteSettings = first("site_settings")?.settings || {};
  const homepageFeatures = list("homepage_features").map((item) => ({
    ...item,
    buttonPath: item.buttonPath || item.path,
    icon: item.icon || item.iconKey,
  }));
  siteSettings.homeSections = { ...(siteSettings.homeSections || {}), featureTabs: homepageFeatures };
  const serviceItems = list("services").map((item) => ({ ...item, icon: item.icon || item.iconKey }));
  const applicationItems = list("applications").map((item) => ({ ...item, icon: item.icon || item.iconKey }));
  if (serviceItems.length) siteSettings.services = { ...(siteSettings.services || {}), items: serviceItems };
  if (applicationItems.length) siteSettings.applications = { ...(siteSettings.applications || {}), items: applicationItems };
  const operationalDomains = list("operational_domains").map((item) => ({
    ...item,
    stat: { value: item.statValue, label: item.statLabel },
  }));
  if (operationalDomains.length) siteSettings.missionPulse = { ...(siteSettings.missionPulse || {}), domains: operationalDomains };
  const impactStats = list("impact_stats");
  if (impactStats.length) siteSettings.impactStats = impactStats;
  siteSettings.pageDisplaySettings = list("page_display_settings");
  siteSettings.designSettings = first("design_settings") || {};
  const organisationRoles = list("organisation_roles");
  if (organisationRoles.length) {
    siteSettings.organisationChart = {
      ...(siteSettings.organisationChart || {}),
      roles: organisationRoles,
    };
  }
  const logos = list("logos");
  if (logos.length) {
    siteSettings.branding = { ...(siteSettings.branding || {}), logos };
    const primary = logos.find((item) => item.placement === "primary");
    const supporting = logos.find((item) => item.placement === "supporting");
    if (primary?.image) siteSettings.branding.logo = primary.image;
    if (supporting?.image) siteSettings.branding.governmentLogo = supporting.image;
  }
  const heroVideos = list("hero_banners").filter((item) => item.active !== false);
  const floodReports = list("flood_reports");

  return {
    language,
    contentVersion,
    divisions: divisions.map((item) => ({ ...item, id: item.slug || item.key })),
    facilities: facilities.map((item) => ({ ...item, id: item.slug || item.key })),
    contactDetails: first("contact") || {},
    officials: profiles.filter((item) => item.profileType === "official"),
    leadershipProfiles: profiles.filter((item) => item.profileType === "leadership"),
    scientistProfiles: profiles.filter((item) => item.profileType === "scientist"),
    formerProfiles: profiles.filter((item) => item.profileType === "former"),
    technicalProfiles: profiles.filter((item) => item.profileType === "technical"),
    administrationProfiles: profiles.filter((item) => item.profileType === "administration"),
    manpowerGroups: list("manpower"),
    heroVideos,
    activeHeroVideo: heroVideos[0] || null,
    geoportals: list("geoportals"),
    notices: [...list("notices"), ...list("tenders")],
    floodData: { floodSection: siteSettings.floodSection || {}, floodReports },
    policyPages: list("policies"),
    publicInfoPages: list("public_info"),
    menuItems: list("menu_items"),
    rsacOfficialSections: sections,
    siteSettings,
    quickLinks: list("quick_links"),
    mobileApps: list("mobile_apps"),
    galleryItems: list("gallery").map((item) => ({ ...item, src: item.image, caption: item.title, alt: item.altText || item.title })),
    projects: list("projects"),
    publications: list("publications"),
    downloads: list("downloads"),
    faq: list("faq"),
  };
};
