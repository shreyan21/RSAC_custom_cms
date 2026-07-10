const cleanUrl = (value = "") => value.replace(/\/+$/, "");

const provider = (
  import.meta.env.VITE_CMS_PROVIDER ||
  import.meta.env.CMS_PROVIDER ||
  "drupal"
).toLowerCase();

const activeBaseUrl = cleanUrl(
  import.meta.env.VITE_DRUPAL_URL || import.meta.env.VITE_CMS_URL || ""
);

const cmsConfig = {
  enabled: import.meta.env.VITE_CMS_ENABLED === "true",
  provider,
  baseUrl: activeBaseUrl,
  token:
    import.meta.env.VITE_DRUPAL_API_TOKEN ||
    import.meta.env.VITE_DRUPAL_TOKEN ||
    import.meta.env.VITE_CMS_API_KEY ||
    "",
  requestTimeout: Number(import.meta.env.VITE_CMS_REQUEST_TIMEOUT || 20000),
  previewEnabled: import.meta.env.VITE_CMS_PREVIEW_ENABLED === "true",
  previewToken: import.meta.env.VITE_CMS_PREVIEW_TOKEN || "",
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
      contact: import.meta.env.VITE_DRUPAL_CONTACT_BUNDLE || "rsac_contact",
      profile: import.meta.env.VITE_DRUPAL_PROFILE_BUNDLE || "rsac_profile",
      manpower:
        import.meta.env.VITE_DRUPAL_MANPOWER_BUNDLE || "rsac_manpower_group",
      heroVideo:
        import.meta.env.VITE_DRUPAL_HERO_VIDEO_BUNDLE || "rsac_hero_video",
      brandLogo:
        import.meta.env.VITE_DRUPAL_BRAND_LOGO_BUNDLE || "rsac_brand_logo",
      organisationRole:
        import.meta.env.VITE_DRUPAL_ORGANISATION_ROLE_BUNDLE ||
        "rsac_organisation_role",
    },
  },
};

export default cmsConfig;
