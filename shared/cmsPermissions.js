export const cmsPermissionAreas = [
  {
    group: "Website content",
    key: "homepage",
    label: "Homepage, sitemap and shared text",
    description: "Homepage sections, common labels, sitemap, footer text and website-wide wording.",
  },
  {
    group: "Website content",
    key: "about",
    label: "About Us pages",
    description: "Institutional About pages, Visitor's Book and related page content.",
  },
  {
    group: "Website content",
    key: "divisions",
    label: "Divisions",
    description: "Division cards, page sections, projects, publications, reports and division media.",
  },
  {
    group: "Website content",
    key: "facilities",
    label: "Facilities",
    description: "Facility cards, facility pages, laboratories, photographs and documents.",
  },
  {
    group: "Website content",
    key: "academics",
    label: "Training and academics",
    description: "Training Division, School of Geo-Informatics and academic page content.",
  },
  {
    group: "Website content",
    key: "people",
    label: "People and Our Formers",
    description: "Scientists, leadership, staff, photographs, profiles and former personnel.",
  },
  {
    group: "Website content",
    key: "geoportals",
    label: "Geoportal services",
    description: "Geoportal cards, links, descriptions and visibility.",
  },
  {
    group: "Website content",
    key: "flood",
    label: "Flood reports",
    description: "Flood years, report rows, PDF files, table labels and the Critical Map.",
  },
  {
    group: "Website content",
    key: "gallery",
    label: "Photo gallery",
    description: "Gallery photographs, captions, order and visibility.",
  },
  {
    group: "Website content",
    key: "mobile_apps",
    label: "Mobile apps",
    description: "Mobile application cards, thumbnails, icons and download links.",
  },
  {
    group: "Public information",
    key: "public_information",
    label: "RTI and institutional documents",
    description: "RTI, Appellate Authority, Memorandum, Service Rules, policies and downloads.",
  },
  {
    group: "Public information",
    key: "tenders",
    label: "Tenders",
    description: "Tender page content, rows, documents and publication status.",
  },
  {
    group: "Public information",
    key: "faq",
    label: "Frequently Asked Questions",
    description: "FAQ questions, answers, order and visibility.",
  },
  {
    group: "Public information",
    key: "notices",
    label: "Notices and updates",
    description: "Notices, announcements and their attached files.",
  },
  {
    group: "Structure and administration",
    key: "navigation",
    label: "Menus, appearance and contact",
    description: "Header and footer menus, page headings, fonts, logos and contact information.",
  },
  {
    group: "Structure and administration",
    key: "standalone_pages",
    label: "Other standalone pages",
    description: "Independent pages that do not belong to About, Divisions, Facilities or Academics.",
  },
  {
    group: "Structure and administration",
    key: "feedback",
    label: "Website feedback",
    description: "Read submitted feedback and retry configured email delivery.",
  },
  {
    group: "Structure and administration",
    key: "audit",
    label: "Audit history",
    description: "View the history of changes made by CMS users.",
  },
];

export const cmsPermissionKeys = cmsPermissionAreas.map((area) => area.key);

export const createCmsPermissions = (enabled = true) => Object.fromEntries(
  cmsPermissionKeys.map((key) => [key, Boolean(enabled)])
);

export const normalizeCmsPermissions = (permissions, role = "editor") => {
  if (role === "admin") return createCmsPermissions(true);
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
    return createCmsPermissions(true);
  }
  return Object.fromEntries(
    cmsPermissionKeys.map((key) => [key, permissions[key] === true])
  );
};

export const hasCmsPermission = (user, key) => (
  user?.role === "admin" || normalizeCmsPermissions(user?.permissions, user?.role)[key] === true
);

const viewPermissions = {
  site_settings: "homepage",
  hero_banners: "homepage",
  homepage_features: "homepage",
  homepage_tab_pages: "homepage",
  services: "homepage",
  applications: "homepage",
  operational_domains: "homepage",
  impact_stats: "homepage",
  quick_links: "homepage",
  about_pages: "about",
  division_pages: "divisions",
  divisions: "divisions",
  division_section_items: "divisions",
  projects: "divisions",
  publications: "divisions",
  facility_pages: "facilities",
  facilities: "facilities",
  academic_pages: "academics",
  people_page_text: "people",
  our_formers_pages: "people",
  scientific_manpower_page: "people",
  people_scientists: "people",
  people_leadership: "people",
  people_officials: "people",
  people_former_scientists: "people",
  people_technical_staff: "people",
  people_administration: "people",
  profiles: "people",
  manpower: "people",
  organisation_roles: "people",
  geoportals: "geoportals",
  flood_page_settings: "flood",
  flood_reports: "flood",
  gallery: "gallery",
  mobile_apps: "mobile_apps",
  rti_page: "public_information",
  appellate_authority_page: "public_information",
  memorandum_page: "public_information",
  general_service_rules_page: "public_information",
  feedback_page: "public_information",
  public_info: "public_information",
  policies: "public_information",
  downloads: "public_information",
  tenders: "tenders",
  faq: "faq",
  notices: "notices",
  page_sections: "navigation",
  page_display_settings: "navigation",
  design_settings: "navigation",
  menu_items: "navigation",
  contact: "navigation",
  logos: "navigation",
  pages: "standalone_pages",
};

export const permissionForCmsView = (viewId) => viewPermissions[viewId] || null;

export const pagePermissionKeys = [
  "about",
  "divisions",
  "facilities",
  "academics",
  "people",
  "standalone_pages",
];

export const publicInfoPermissionKeys = ["public_information", "tenders", "faq"];
export const siteSettingsPermissionKeys = ["homepage", "people", "flood"];

const directCollectionPermissions = {
  hero_banners: "homepage",
  homepage_features: "homepage",
  services: "homepage",
  applications: "homepage",
  operational_domains: "homepage",
  impact_stats: "homepage",
  quick_links: "homepage",
  divisions: "divisions",
  division_section_items: "divisions",
  projects: "divisions",
  publications: "divisions",
  facilities: "facilities",
  profiles: "people",
  manpower: "people",
  organisation_roles: "people",
  geoportals: "geoportals",
  flood_reports: "flood",
  gallery: "gallery",
  mobile_apps: "mobile_apps",
  policies: "public_information",
  downloads: "public_information",
  tenders: "tenders",
  faq: "faq",
  notices: "notices",
  page_sections: "navigation",
  page_display_settings: "navigation",
  design_settings: "navigation",
  menu_items: "navigation",
  contact: "navigation",
  logos: "navigation",
};

export const permissionOptionsForCollection = (collection) => {
  if (collection === "pages") return pagePermissionKeys;
  if (collection === "public_info") return publicInfoPermissionKeys;
  if (collection === "site_settings") return siteSettingsPermissionKeys;
  const direct = directCollectionPermissions[collection];
  return direct ? [direct] : [];
};

const peoplePageKeys = new Set([
  "organisational-chart",
  "organizational-chart",
  "our-chairman's-governing-body",
  "director's",
  "our-former",
  "our-formers",
  "scientific-manpower",
]);

export const permissionForCmsEntry = (collection, entry = {}) => {
  const data = entry.data_en || entry.dataEn || entry || {};
  const entryKey = String(entry.entry_key || entry.entryKey || "").trim().toLowerCase();
  if (collection === "pages") {
    if (peoplePageKeys.has(entryKey)) return "people";
    if (data.sectionKey === "divisions") return "divisions";
    if (data.sectionKey === "facilities") return "facilities";
    if (data.sectionKey === "academics") return "academics";
    if (data.sectionKey === "about-us") return "about";
    return "standalone_pages";
  }
  if (collection === "public_info") {
    if (data.slug === "tenders") return "tenders";
    if (data.slug === "faq") return "faq";
    return "public_information";
  }
  return directCollectionPermissions[collection] || null;
};
