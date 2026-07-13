import { getCmsBootstrap } from "./customCmsClient";

const domain = (key) => async (language = "en") => (await getCmsBootstrap(language))[key];

export const getSiteSettings = domain("siteSettings");
export const getDivisions = domain("divisions");
export const getFacilities = domain("facilities");
export const getQuickLinks = domain("quickLinks");
export const getMobileApps = domain("mobileApps");
export const getGalleryItems = domain("galleryItems");
export const getGeoportals = domain("geoportals");
export const getFloodData = domain("floodData");
export const getNotices = domain("notices");
export const getPolicies = domain("policyPages");
export const getPublicInfoPages = domain("publicInfoPages");
export const getMenuItems = domain("menuItems");
export const getRsacOfficialSections = domain("rsacOfficialSections");
export const getProjects = domain("projects");
export const getPublications = domain("publications");
export const getDownloads = domain("downloads");
export const getContactDetails = domain("contactDetails");
export const getOfficials = domain("officials");
export const getLeadershipProfiles = domain("leadershipProfiles");
export const getScientistProfiles = domain("scientistProfiles");
export const getFormerProfiles = domain("formerProfiles");
export const getTechnicalProfiles = domain("technicalProfiles");
export const getAdministrationProfiles = domain("administrationProfiles");
export const getManpowerGroups = domain("manpowerGroups");
export const getHeroVideos = domain("heroVideos");

export const getPolicyBySlugLocal = (slug, policies = []) => policies.find((policy) => policy.slug === slug);

const arrayValue = (value) => Array.isArray(value) ? value : [];

export async function buildSearchIndex(language = "en") {
  const data = await getCmsBootstrap(language);
  return [
    ...arrayValue(data.divisions).map((item) => ({ title: item.title, description: item.lead || "", path: `/divisions/${item.id}`, type: "Division", keywords: [item.title, item.lead || ""] })),
    ...arrayValue(data.notices).map((item) => ({ title: item.title, description: item.category || "", path: item.url || "/notices", type: "Notice", keywords: [item.category, item.meta, item.lastDate].filter(Boolean) })),
    ...arrayValue(data.geoportals).map((item) => ({ title: item.title, description: item.description || "", path: "/geoportals", type: "Geoportal", keywords: [item.title, item.url, "geoportal"].filter(Boolean) })),
    ...arrayValue(data.policyPages).map((item) => ({ title: item.title, description: item.summary || "", path: `/${item.slug}`, type: "Policy", keywords: [item.title, item.summary].filter(Boolean) })),
    ...arrayValue(data.publicInfoPages).map((item) => ({ title: item.title, description: item.summary || "", path: `/${item.slug}`, type: "Public Service", keywords: [item.title, item.summary].filter(Boolean) })),
    ...arrayValue(data.projects).map((item) => ({ title: item.title, description: item.summary || item.category || "", path: item.division?.slug ? `/divisions/${item.division.slug}` : item.url || "/divisions", type: item.type || "Project", keywords: [item.title, item.category, item.year, item.client].filter(Boolean) })),
    ...arrayValue(data.publications).map((item) => ({ title: item.title, description: item.summary || item.citation || "", path: item.division?.slug ? `/divisions/${item.division.slug}` : item.url || "/divisions", type: item.type || "Publication", keywords: [item.title, item.category, item.year, item.authors].filter(Boolean) })),
    ...arrayValue(data.downloads).map((item) => ({ title: item.title, description: item.summary || item.category || "", path: item.url || "/notices", type: item.kind || "Download", keywords: [item.title, item.category, item.meta, item.date].filter(Boolean) })),
  ].filter((item) => item.title);
}
