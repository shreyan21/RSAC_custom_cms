const cleanUrl = (value = "") => value.replace(/\/+$/, "");

const provider = (
  import.meta.env.VITE_CMS_PROVIDER ||
  import.meta.env.CMS_PROVIDER ||
  "directus"
).toLowerCase();

const activeBaseUrl = cleanUrl(
  provider === "drupal"
    ? import.meta.env.VITE_DRUPAL_URL || import.meta.env.VITE_CMS_URL || ""
    : import.meta.env.VITE_CMS_URL || import.meta.env.VITE_DIRECTUS_URL || ""
);

const cmsConfig = {
  enabled: import.meta.env.VITE_CMS_ENABLED === "true",
  provider,
  baseUrl: activeBaseUrl,
  token:
    import.meta.env.VITE_DRUPAL_API_TOKEN ||
    import.meta.env.VITE_DRUPAL_TOKEN ||
    import.meta.env.VITE_DIRECTUS_TOKEN ||
    import.meta.env.VITE_CMS_API_KEY ||
    "",
  // A CMS that is down rejects instantly (connection refused), so a generous
  // timeout only matters when Directus is up but slow — where waiting keeps
  // CMS content winning over the bundled fallback (CMS-first invariant).
  requestTimeout: Number(import.meta.env.VITE_CMS_REQUEST_TIMEOUT || 20000),
  publishedStatus: import.meta.env.VITE_DIRECTUS_PUBLISHED_STATUS || "published",
  previewEnabled: import.meta.env.VITE_CMS_PREVIEW_ENABLED === "true",
  previewToken: import.meta.env.VITE_CMS_PREVIEW_TOKEN || "",
  previewDirectusToken: import.meta.env.VITE_DIRECTUS_PREVIEW_TOKEN || "",
  directus: {
    baseUrl: cleanUrl(
      import.meta.env.VITE_DIRECTUS_FALLBACK_URL ||
        import.meta.env.VITE_DIRECTUS_URL ||
        (provider === "directus" ? activeBaseUrl : "")
    ),
    token:
      import.meta.env.VITE_DIRECTUS_TOKEN ||
      import.meta.env.VITE_CMS_API_KEY ||
      "",
    fallbackEnabled:
      import.meta.env.VITE_DIRECTUS_FALLBACK_ENABLED === "true",
  },
  drupal: {
    basePath: import.meta.env.VITE_DRUPAL_JSONAPI_PATH || "/jsonapi",
    languagePrefixMode:
      import.meta.env.VITE_DRUPAL_LANGUAGE_PREFIX_MODE || "path",
    filterPublished:
      import.meta.env.VITE_DRUPAL_FILTER_PUBLISHED !== "false",
    feedbackPath: import.meta.env.VITE_DRUPAL_FEEDBACK_PATH || "",
    visitPath: import.meta.env.VITE_DRUPAL_VISIT_PATH || "",
    visitCountPath: import.meta.env.VITE_DRUPAL_VISIT_COUNT_PATH || "",
    bundles: {
      page: import.meta.env.VITE_DRUPAL_PAGE_BUNDLE || "rsac_page",
      pageSection:
        import.meta.env.VITE_DRUPAL_PAGE_SECTION_BUNDLE || "rsac_page_section",
      sectionItem:
        import.meta.env.VITE_DRUPAL_SECTION_ITEM_BUNDLE || "rsac_section_item",
      division: import.meta.env.VITE_DRUPAL_DIVISION_BUNDLE || "rsac_division",
      project: import.meta.env.VITE_DRUPAL_PROJECT_BUNDLE || "rsac_project",
      publication:
        import.meta.env.VITE_DRUPAL_PUBLICATION_BUNDLE || "rsac_publication",
      download: import.meta.env.VITE_DRUPAL_DOWNLOAD_BUNDLE || "rsac_download",
      galleryItem:
        import.meta.env.VITE_DRUPAL_GALLERY_BUNDLE || "rsac_gallery_item",
      noticeTenderFaq:
        import.meta.env.VITE_DRUPAL_NOTICE_BUNDLE || "rsac_notice_tender_faq",
      menuItem: import.meta.env.VITE_DRUPAL_MENU_BUNDLE || "rsac_menu_item",
      siteSetting:
        import.meta.env.VITE_DRUPAL_SITE_SETTING_BUNDLE || "rsac_site_setting",
    },
  },
  collections: {
    divisions:
      import.meta.env.VITE_DIRECTUS_DIVISIONS_COLLECTION || "rsac_divisions",
    facilities:
      import.meta.env.VITE_DIRECTUS_FACILITIES_COLLECTION || "rsac_facilities",
    profiles:
      import.meta.env.VITE_DIRECTUS_PROFILES_COLLECTION || "rsac_profiles",
    geoportals:
      import.meta.env.VITE_DIRECTUS_GEOPORTALS_COLLECTION || "rsac_geoportals",
    notices:
      import.meta.env.VITE_DIRECTUS_NOTICES_COLLECTION || "rsac_notices",
    floodReports:
      import.meta.env.VITE_DIRECTUS_FLOOD_REPORTS_COLLECTION ||
      "rsac_flood_reports",
    policies:
      import.meta.env.VITE_DIRECTUS_POLICIES_COLLECTION || "rsac_policies",
    publicInfo:
      import.meta.env.VITE_DIRECTUS_PUBLIC_INFO_COLLECTION ||
      "rsac_public_info",
    pages: import.meta.env.VITE_DIRECTUS_PAGES_COLLECTION || "rsac_pages",
    pageImages:
      import.meta.env.VITE_DIRECTUS_PAGE_IMAGES_COLLECTION ||
      "rsac_page_images",
    sections:
      import.meta.env.VITE_DIRECTUS_SECTIONS_COLLECTION || "rsac_sections",
    contact:
      import.meta.env.VITE_DIRECTUS_CONTACT_COLLECTION || "rsac_contact",
    heroVideos:
      import.meta.env.VITE_DIRECTUS_HERO_COLLECTION || "rsac_hero_videos",
    manpower:
      import.meta.env.VITE_DIRECTUS_MANPOWER_COLLECTION || "rsac_manpower_groups",
    menu: import.meta.env.VITE_DIRECTUS_MENU_COLLECTION || "rsac_menu",
    settings:
      import.meta.env.VITE_DIRECTUS_SETTINGS_COLLECTION || "rsac_site_settings",
    contentBlocks:
      import.meta.env.VITE_DIRECTUS_CONTENT_BLOCKS_COLLECTION ||
      "rsac_content_blocks",
    brandLogos:
      import.meta.env.VITE_DIRECTUS_BRAND_LOGOS_COLLECTION ||
      "rsac_brand_logos",
    homeFeatureTabs:
      import.meta.env.VITE_DIRECTUS_HOME_FEATURE_TABS_COLLECTION ||
      "rsac_home_feature_tabs",
    homeSectionItems:
      import.meta.env.VITE_DIRECTUS_HOME_SECTION_ITEMS_COLLECTION ||
      import.meta.env.VITE_DIRECTUS_HOME_FEATURE_TABS_COLLECTION ||
      "rsac_home_feature_tabs",
    organisationRoles:
      import.meta.env.VITE_DIRECTUS_ORGANISATION_ROLES_COLLECTION ||
      "rsac_organisation_roles",
    quickLinks:
      import.meta.env.VITE_DIRECTUS_QUICK_LINKS_COLLECTION ||
      "rsac_quick_links",
    mobileApps:
      import.meta.env.VITE_DIRECTUS_MOBILE_APPS_COLLECTION ||
      "rsac_mobile_apps",
    gallery:
      import.meta.env.VITE_DIRECTUS_GALLERY_COLLECTION ||
      "rsac_gallery_items",
    visits:
      import.meta.env.VITE_DIRECTUS_VISITS_COLLECTION || "rsac_site_visits",
  },
};

export default cmsConfig;
