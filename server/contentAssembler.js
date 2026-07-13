import { pool } from "./db.js";
import { getCollection } from "../shared/cmsCollections.js";

export const localize = (entry, language) => {
  if (language !== "hi") return entry.data_en;
  const localized = { ...(entry.data_hi || {}) };
  const definition = getCollection(entry.collection);
  for (const field of definition?.fields || []) {
    if (field.localized === false) localized[field.name] = entry.data_en?.[field.name];
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
    "SELECT id, collection, entry_key, sort_order, data_en, data_hi, version, updated_at FROM cms_entries WHERE status='published' ORDER BY collection, sort_order, entry_key"
  );
  return rows;
};

export const assembleBootstrap = (rows, language = "en") => {
  const contentVersion = rows.reduce((latest, row) => {
    const value = row.updated_at ? new Date(row.updated_at).toISOString() : "";
    return value > latest ? value : latest;
  }, "");
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.collection)) groups.set(row.collection, []);
    groups.get(row.collection).push(row);
  }
  const list = (collection) => (groups.get(collection) || []).sort(bySort).map((entry) => {
    const localized = localize(entry, language);
    return {
      id: entry.id,
      key: entry.entry_key,
      ...localized,
      ...(collection === "pages" && language === "hi" && entry.data_en?.html
        ? { structureHtml: entry.data_en.html }
        : {}),
    };
  });
  const first = (collection) => list(collection)[0] || null;
  const profiles = list("profiles");
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
