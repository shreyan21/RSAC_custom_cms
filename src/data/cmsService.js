import * as defaults from "./defaultData";
import {
  getDrupalAdministrationProfiles,
  getDrupalContactDetails,
  getDrupalDivisions,
  getDrupalDownloads,
  getDrupalFacilities,
  getDrupalFloodData,
  getDrupalGalleryItems,
  getDrupalGeoportals,
  getDrupalHeroVideos,
  getDrupalLeadershipProfiles,
  getDrupalManpowerGroups,
  getDrupalMenuItems,
  getDrupalMobileApps,
  getDrupalNotices,
  getDrupalOfficials,
  getDrupalPolicies,
  getDrupalProjects,
  getDrupalPublications,
  getDrupalPublicInfoPages,
  getDrupalQuickLinks,
  getDrupalRsacOfficialSections,
  getDrupalScientistProfiles,
  getDrupalSiteSettings,
  getDrupalFormerProfiles,
  getDrupalTechnicalProfiles,
} from "./drupalService";
import { resolveCmsDomain } from "./cmsResolve";
import {
  localizeBasicItems,
  localizeFloodSection,
  localizeMenuItems,
  localizePublicInfoFallback,
  localizeSiteSettingsFallback,
  mergeHindiFallback,
} from "./hindiContent";
import { policyPagesHindi } from "./policies.hi.generated";
import {
  applyOfficialHindi,
  backfillOfficialImages,
} from "./contentUtils";

const providerValue = (language, drupalLoader, fallbackLoader) =>
  resolveCmsDomain({
    drupal: drupalLoader ? () => drupalLoader(language) : null,
    fallback: fallbackLoader ? () => fallbackLoader(language) : null,
  });

const staticPolicies = (language = "en") =>
  language === "hi"
    ? defaults.policyPages.map((policy) => {
        const hindi = policyPagesHindi.find((item) => item.slug === policy.slug);
        return hindi ? mergeHindiFallback(policy, hindi) : policy;
      })
    : defaults.policyPages;

const staticOfficialSections = async (language = "en") => {
  if (language !== "hi") {
    const fallback = await import("./rsacOfficialContent.generated");
    return fallback.rsacOfficialSections;
  }

  const [hiFallback, enFallback] = await Promise.all([
    import("./rsacOfficialContent.hi.generated"),
    import("./rsacOfficialContent.generated"),
  ]);

  return applyOfficialHindi(
    backfillOfficialImages(
      hiFallback.rsacOfficialSections,
      enFallback.rsacOfficialSections
    )
  );
};

const staticGalleryItems = () =>
  defaults.galleryImages.map((item) => ({
    id: item.id,
    src: item.src,
    caption: item.caption || "",
    alt: item.alt || item.caption || "RSAC-UP gallery image",
  }));

export const getSiteSettings = (language = "en") =>
  providerValue(language, getDrupalSiteSettings, () =>
    localizeSiteSettingsFallback(defaults.siteSettings, language)
  );

export const getDivisions = (language = "en") =>
  providerValue(language, getDrupalDivisions, () =>
    localizeBasicItems("divisions", defaults.divisions, language)
  );

export const getFacilities = (language = "en") =>
  providerValue(language, getDrupalFacilities, () =>
    localizeBasicItems("facilities", defaults.facilities, language)
  );

export const getQuickLinks = (language = "en") =>
  providerValue(language, getDrupalQuickLinks, () => defaults.quickLinks);

export const getMobileApps = (language = "en") =>
  providerValue(language, getDrupalMobileApps, () => defaults.mobileApps);

export const getGalleryItems = (language = "en") =>
  providerValue(language, getDrupalGalleryItems, staticGalleryItems);

export const getGeoportals = (language = "en") =>
  providerValue(language, getDrupalGeoportals, () => defaults.geoportals);

export const getFloodData = (language = "en") =>
  providerValue(language, getDrupalFloodData, () => ({
    floodSection: localizeFloodSection(defaults.floodSection, language),
    floodReports: defaults.floodReports,
  }));

export const getNotices = (language = "en") =>
  providerValue(language, getDrupalNotices, () => defaults.notices);

export const getPolicies = (language = "en") =>
  providerValue(language, getDrupalPolicies, staticPolicies);

export const getPublicInfoPages = (language = "en") =>
  providerValue(language, getDrupalPublicInfoPages, () =>
    localizePublicInfoFallback(defaults.publicInfoPages, language)
  );

export const getMenuItems = (language = "en") =>
  providerValue(language, getDrupalMenuItems, () =>
    localizeMenuItems(defaults.menuItems, language)
  );

export const getRsacOfficialSections = (language = "en") =>
  providerValue(language, getDrupalRsacOfficialSections, staticOfficialSections);

export const getProjects = (language = "en") =>
  providerValue(language, getDrupalProjects, () => []);

export const getPublications = (language = "en") =>
  providerValue(language, getDrupalPublications, () => []);

export const getDownloads = (language = "en") =>
  providerValue(language, getDrupalDownloads, () => []);

export const getContactDetails = (language = "en") =>
  providerValue(language, getDrupalContactDetails, () => defaults.contactDetails);

export const getOfficials = (language = "en") =>
  providerValue(language, getDrupalOfficials, () => defaults.officials);

export const getLeadershipProfiles = (language = "en") =>
  providerValue(language, getDrupalLeadershipProfiles, () =>
    defaults.leadershipProfiles
  );

export const getScientistProfiles = (language = "en") =>
  providerValue(language, getDrupalScientistProfiles, () =>
    defaults.scientistProfiles
  );

export const getFormerProfiles = (language = "en") =>
  providerValue(language, getDrupalFormerProfiles, () => defaults.formerProfiles);

export const getTechnicalProfiles = (language = "en") =>
  providerValue(language, getDrupalTechnicalProfiles, () =>
    defaults.technicalProfiles
  );

export const getAdministrationProfiles = (language = "en") =>
  providerValue(language, getDrupalAdministrationProfiles, () =>
    defaults.administrationProfiles
  );

export const getManpowerGroups = (language = "en") =>
  providerValue(language, getDrupalManpowerGroups, () => defaults.manpowerGroups);

export const getHeroVideos = (language = "en") =>
  providerValue(language, getDrupalHeroVideos, () => defaults.heroVideos);

export const getPolicyBySlugLocal = (slug, policies) =>
  (policies || defaults.policyPages).find((policy) => policy.slug === slug) ||
  defaults.getPolicyBySlug(slug);

const arrayValue = (value) => (Array.isArray(value) ? value : []);

export async function buildSearchIndex(language = "en") {
  const [
    divisions,
    notices,
    geoportals,
    policies,
    publicInfoPages,
    projects,
    publications,
    downloads,
  ] = await Promise.all([
    getDivisions(language),
    getNotices(language),
    getGeoportals(language),
    getPolicies(language),
    getPublicInfoPages(language),
    getProjects(language),
    getPublications(language),
    getDownloads(language),
  ]);

  return [
    ...arrayValue(divisions).map((item) => ({
      title: item.title,
      description: item.lead || "",
      path: `/divisions/${item.id}`,
      type: "Division",
      keywords: [item.title, item.lead || ""],
    })),
    ...arrayValue(notices).map((item) => ({
      title: item.title,
      description: item.category || "",
      path: item.url || "/notices",
      type: "Notice",
      keywords: [item.category, item.meta, item.lastDate].filter(Boolean),
    })),
    ...arrayValue(geoportals).map((item) => ({
      title: item.title,
      description: item.description || "",
      path: "/geoportals",
      type: "Geoportal",
      keywords: [item.title, item.url, "geoportal"].filter(Boolean),
    })),
    ...arrayValue(policies).map((item) => ({
      title: item.title,
      description: item.summary || "",
      path: `/${item.slug}`,
      type: "Policy",
      keywords: [item.title, item.summary].filter(Boolean),
    })),
    ...arrayValue(publicInfoPages).map((item) => ({
      title: item.title,
      description: item.summary || "",
      path: `/${item.slug}`,
      type: "Public Service",
      keywords: [item.title, item.summary].filter(Boolean),
    })),
    ...arrayValue(projects).map((item) => ({
      title: item.title,
      description: item.summary || item.category || "",
      path: item.division?.slug
        ? `/divisions/${item.division.slug}`
        : item.url || "/divisions",
      type: item.type || "Project",
      keywords: [item.title, item.category, item.year, item.client].filter(Boolean),
    })),
    ...arrayValue(publications).map((item) => ({
      title: item.title,
      description: item.summary || item.citation || "",
      path: item.division?.slug
        ? `/divisions/${item.division.slug}`
        : item.url || "/divisions",
      type: item.type || "Publication",
      keywords: [item.title, item.category, item.year, item.authors].filter(Boolean),
    })),
    ...arrayValue(downloads).map((item) => ({
      title: item.title,
      description: item.summary || item.category || "",
      path: item.url || "/notices",
      type: item.kind || "Download",
      keywords: [item.title, item.category, item.meta, item.date].filter(Boolean),
    })),
  ].filter((item) => item.title);
}
