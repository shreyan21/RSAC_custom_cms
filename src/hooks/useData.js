/**
 * Convenience hooks for accessing individual data domains.
 * Each hook reads from the DataContext so components never
 * need to know whether data came from a CMS or hardcoded files.
 */
import { useContext } from "react";
import { DataContext } from "../contexts/DataContextCore";

export function useDataContext() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error("useDataContext must be used within a DataProvider");
  }

  return context;
}

export function useDivisions() {
  return useDataContext().divisions;
}

export function useFacilities() {
  return useDataContext().facilities;
}

export function useContactDetails() {
  return useDataContext().contactDetails;
}

export function useOfficials() {
  return useDataContext().officials;
}

export function useLeadershipProfiles() {
  return useDataContext().leadershipProfiles;
}

export function useScientistProfiles() {
  return useDataContext().scientistProfiles;
}

export function useFormerProfiles() {
  return useDataContext().formerProfiles;
}

export function useTechnicalProfiles() {
  return useDataContext().technicalProfiles;
}

export function useAdministrationProfiles() {
  return useDataContext().administrationProfiles;
}

export function useManpowerGroups() {
  return useDataContext().manpowerGroups;
}

export function useHeroVideos() {
  return useDataContext().heroVideos;
}

export function useActiveHeroVideo() {
  return useDataContext().activeHeroVideo;
}

export function useGeoportals() {
  return useDataContext().geoportals;
}

export function useNotices() {
  return useDataContext().notices;
}

export function useFloodData() {
  return useDataContext().floodData;
}

export function usePolicies() {
  return useDataContext().policyPages;
}

export function usePublicInfoPages() {
  return useDataContext().publicInfoPages;
}

export function useGetPolicyBySlug() {
  return useDataContext().getPolicyBySlug;
}

export function useMenuItems() {
  return useDataContext().menuItems;
}

export function useRsacOfficialSections() {
  return useDataContext().rsacOfficialSections;
}

export function useSiteSettings() {
  return useDataContext().siteSettings;
}

export function useQuickLinks() {
  return useDataContext().quickLinks;
}

export function useMobileApps() {
  return useDataContext().mobileApps;
}

export function useGalleryItems() {
  return useDataContext().galleryItems;
}

export function useIsContentLoading() {
  return useDataContext().isLoading;
}
