import { useEffect, useMemo, useState } from "react";
import cmsConfig from "../data/cmsConfig";
import * as defaults from "../data/defaultData";
import {
  applyOfficialHindi,
  backfillOfficialImages,
} from "../data/directusAdapter";
import { policyPagesHindi } from "../data/policies.hi.generated";
import { decodeLocalizedValue } from "../utils/htmlEntities";
import {
  localizeBasicItems,
  localizeFloodSection,
  localizeMenuItems,
  localizePublicInfoFallback,
  localizeSiteSettingsFallback,
} from "../data/hindiContent";
import { useLanguage } from "../hooks/useLanguage";
import { setUiLabels } from "../data/uiLabels";
import { DataContext } from "./DataContextCore";
import {
  getDivisions,
  getFacilities,
  getContactDetails,
  getOfficials,
  getLeadershipProfiles,
  getScientistProfiles,
  getFormerProfiles,
  getTechnicalProfiles,
  getAdministrationProfiles,
  getManpowerGroups,
  getHeroVideos,
  getGeoportals,
  getNotices,
  getFloodData,
  getPolicies,
  getPublicInfoPages,
  getMenuItems,
  getRsacOfficialSections,
  getSiteSettings,
  getQuickLinks,
  getMobileApps,
  getGalleryItems,
} from "../data/cmsService";

const getPolicyFallback = (language) =>
  decodeLocalizedValue(language === "hi" ? policyPagesHindi : defaults.policyPages);

const createBaseData = (language) => {
  const policyPages = getPolicyFallback(language);

  return {
    divisions: decodeLocalizedValue(
      localizeBasicItems("divisions", defaults.divisions, language)
    ),
    facilities: decodeLocalizedValue(
      localizeBasicItems("facilities", defaults.facilities, language)
    ),
    contactDetails: defaults.contactDetails,
    officials: defaults.officials,
    leadershipProfiles: defaults.leadershipProfiles,
    scientistProfiles: defaults.scientistProfiles,
    formerProfiles: defaults.formerProfiles,
    technicalProfiles: defaults.technicalProfiles,
    administrationProfiles: defaults.administrationProfiles,
    manpowerGroups: defaults.manpowerGroups,
    heroVideos: defaults.heroVideos,
    activeHeroVideo: defaults.activeHeroVideo,
    geoportals: defaults.geoportals,
    notices: defaults.notices,
    floodData: {
      floodSection: decodeLocalizedValue(
        localizeFloodSection(defaults.floodSection, language)
      ),
      floodReports: defaults.floodReports,
    },
    policyPages,
    publicInfoPages: decodeLocalizedValue(
      localizePublicInfoFallback(defaults.publicInfoPages, language)
    ),
    getPolicyBySlug: (slug) =>
      policyPages.find((policy) => policy.slug === slug) ||
      defaults.getPolicyBySlug(slug),
    menuItems: decodeLocalizedValue(
      localizeMenuItems(defaults.menuItems, language)
    ),
    rsacOfficialSections: [],
    siteSettings: decodeLocalizedValue(
      localizeSiteSettingsFallback(defaults.siteSettings, language)
    ),
    quickLinks: defaults.quickLinks,
    mobileApps: defaults.mobileApps.map((item) => ({
      ...item,
      title: language === "hi" ? item.titleHi || item.title : item.title,
      description:
        language === "hi"
          ? item.descriptionHi || item.description
          : item.description,
      sourceUrl: item.url,
    })),
    galleryItems: defaults.galleryImages.map((item) => ({
      ...item,
      caption:
        language === "hi" ? item.captionHi || item.caption : item.caption,
      alt:
        language === "hi"
          ? item.altHi || item.captionHi || item.caption
          : item.alt || item.caption,
    })),
  };
};

export function DataProvider({ children }) {
  const { language } = useLanguage();
  const fallbackData = useMemo(() => createBaseData(language), [language]);
  const [data, setData] = useState(() => ({
    ...createBaseData(language),
    language,
  }));
  // True while the CMS hydrates content for the active language (drives the
  // global loading animation). Stays false when the CMS is disabled — the
  // static fallback is already complete.
  const [isLoading, setIsLoading] = useState(cmsConfig.enabled);

  // Publish CMS-edited Interface Labels to the uiLabels store so the t()
  // translator in LanguageProvider (mounted above this provider) can use them.
  useEffect(() => {
    setUiLabels(data.siteSettings?.interfaceLabels);
  }, [data.siteSettings]);

  useEffect(() => {
    if (cmsConfig.enabled) {
      return undefined;
    }

    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;

    const loadFallbackContent = async () => {
      const fallback =
        language === "hi"
          ? await import("../data/rsacOfficialContent.hi.generated")
          : await import("../data/rsacOfficialContent.generated");
      const enFallbackSections =
        language === "hi"
          ? (await import("../data/rsacOfficialContent.generated"))
              .rsacOfficialSections
          : null;
      const policyFallback =
        language === "hi"
          ? policyPagesHindi
          : defaults.policyPages;
      const decodedPolicyFallback = decodeLocalizedValue(policyFallback);

      if (!cancelled) {
        setData((prev) => ({
          ...prev,
          language,
          divisions: decodeLocalizedValue(
            localizeBasicItems("divisions", defaults.divisions, language)
          ),
          facilities: decodeLocalizedValue(
            localizeBasicItems("facilities", defaults.facilities, language)
          ),
          rsacOfficialSections:
            language === "hi"
              ? applyOfficialHindi(
                  backfillOfficialImages(
                    fallback.rsacOfficialSections,
                    enFallbackSections
                  )
                )
              : fallback.rsacOfficialSections,
          // applyOfficialHindi above maps residual exact-match English labels.
          policyPages: decodedPolicyFallback,
          publicInfoPages: decodeLocalizedValue(
            localizePublicInfoFallback(defaults.publicInfoPages, language)
          ),
          getPolicyBySlug: (slug) =>
            decodedPolicyFallback.find((policy) => policy.slug === slug) ||
            defaults.getPolicyBySlug(slug),
          menuItems: decodeLocalizedValue(
            localizeMenuItems(defaults.menuItems, language)
          ),
          siteSettings: decodeLocalizedValue(
            localizeSiteSettingsFallback(defaults.siteSettings, language)
          ),
          floodData: {
            floodSection: decodeLocalizedValue(
              localizeFloodSection(defaults.floodSection, language)
            ),
            floodReports: defaults.floodReports,
          },
        }));
      }
    };

    if (window.location.pathname === "/" && "requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(loadFallbackContent, {
        timeout: 2500,
      });
    } else {
      timeoutHandle = window.setTimeout(loadFallbackContent, 0);
    }

    return () => {
      cancelled = true;

      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [language]);

  useEffect(() => {
    if (!cmsConfig.enabled) {
      return undefined;
    }

    let cancelled = false;
    let loading = false;

    const ok = (r) => (r.status === "fulfilled" ? r.value : undefined);

    async function loadFromCms() {
      if (loading) {
        return;
      }

      loading = true;
      // Hide stale/fallback content during every CMS refresh. This prevents a
      // cleared Directus field from briefly showing the old default text.
      setIsLoading(true);

      const [
        divisions,
        facilities,
        contactDetails,
        officials,
        leadershipProfiles,
        scientistProfiles,
        formerProfiles,
        technicalProfiles,
        administrationProfiles,
        manpowerGroups,
        heroVideos,
        geoportals,
        notices,
        floodData,
        policyPages,
        publicInfoPages,
        menuItems,
        rsacOfficialSections,
        siteSettings,
        quickLinks,
        mobileApps,
        galleryItems,
      ] = await Promise.allSettled([
          getDivisions(language),
          getFacilities(language),
          getContactDetails(language),
          getOfficials(language),
          getLeadershipProfiles(language),
          getScientistProfiles(language),
          getFormerProfiles(language),
          getTechnicalProfiles(language),
          getAdministrationProfiles(language),
          getManpowerGroups(language),
          getHeroVideos(language),
          getGeoportals(language),
          getNotices(language),
          getFloodData(language),
          getPolicies(language),
          getPublicInfoPages(language),
          getMenuItems(language),
          getRsacOfficialSections(language),
          getSiteSettings(language),
          getQuickLinks(language),
          getMobileApps(language),
          getGalleryItems(language),
        ])
        .then((results) => results.map(ok))
        .finally(() => {
          loading = false;
        });

      // Restore photos lost from the scraped Hindi bodies (facilities, academics)
      // using the English generated content, regardless of whether the official
      // sections came from Directus or the static fallback.
      let officialSections = rsacOfficialSections;
      if (language === "hi" && officialSections) {
        const enSections = (
          await import("../data/rsacOfficialContent.generated")
        ).rsacOfficialSections;
        officialSections = backfillOfficialImages(officialSections, enSections);
      }

      if (!cancelled) {
        setData((prev) => ({
          language,
          divisions: divisions || prev.divisions,
          facilities: facilities || prev.facilities,
          contactDetails: contactDetails || prev.contactDetails,
          officials: officials || prev.officials,
          leadershipProfiles: leadershipProfiles || prev.leadershipProfiles,
          scientistProfiles: scientistProfiles || prev.scientistProfiles,
          formerProfiles: formerProfiles || prev.formerProfiles,
          technicalProfiles: technicalProfiles || prev.technicalProfiles,
          administrationProfiles: administrationProfiles || prev.administrationProfiles,
          manpowerGroups: manpowerGroups || prev.manpowerGroups,
          heroVideos: heroVideos || prev.heroVideos,
          activeHeroVideo: (heroVideos && heroVideos[0]) || prev.activeHeroVideo,
          geoportals: geoportals || prev.geoportals,
          notices: notices || prev.notices,
          floodData: floodData || prev.floodData,
          policyPages: policyPages || prev.policyPages,
          publicInfoPages: publicInfoPages || prev.publicInfoPages,
          getPolicyBySlug: policyPages
            ? (slug) => policyPages.find((p) => p.slug === slug) || defaults.getPolicyBySlug(slug)
            : prev.getPolicyBySlug,
          menuItems: menuItems || prev.menuItems,
          rsacOfficialSections: officialSections || prev.rsacOfficialSections,
          siteSettings: siteSettings || prev.siteSettings,
          quickLinks: quickLinks || prev.quickLinks,
          mobileApps: mobileApps || prev.mobileApps,
          galleryItems: galleryItems || prev.galleryItems,
        }));
        setIsLoading(false);
      }

    }

    loadFromCms();
    const refreshOnFocus = () => loadFromCms();
    const refreshWhenVisible = () => {
      if (!document.hidden) {
        loadFromCms();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [language]);

  const value = useMemo(() => {
    const base =
      data.language === language ? data : { ...fallbackData, language };
    return { ...base, isLoading };
  }, [data, fallbackData, language, isLoading]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
