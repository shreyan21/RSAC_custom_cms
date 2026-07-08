/**
 * Default (hardcoded) data re-exported from the original data files.
 *
 * This module is the single fallback source used when no CMS is configured.
 * Components should import data through the DataContext/hooks instead of
 * importing these files directly — that way switching to a CMS requires
 * zero component changes.
 */
export {
  officialSourceLinks,
  divisions,
  facilities,
  contactDetails,
} from "./siteContent";

export { officials } from "./officials";

export {
  leadershipProfiles,
  scientistProfiles,
  technicalProfiles,
  administrationProfiles,
  manpowerGroups,
} from "./people";

export { formerProfiles } from "./formerProfiles";

export { heroVideos, activeHeroVideo } from "./heroVideos";

export { geoportals } from "./geoportals";

export { notices } from "./notices";

export { floodSection, floodReports } from "./floodReports";

export { policyPages, getPolicyBySlug } from "./policies";

export { publicInfoPages, getPublicInfoBySlug } from "./publicInfo";

export { menuItems } from "./menuItems";
export { quickLinks } from "./quickLinks";
export { mobileApps } from "./mobileApps";
export { gallerySection, galleryImages } from "./gallery";
export { siteSettings } from "./siteSettings";
