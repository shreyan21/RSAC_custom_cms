export const cmsGroups = [
  {
    id: "homepage",
    title: "Homepage",
    description: "Edit the homepage in the same order visitors see it, from the hero to repeated cards and footer content.",
    sections: [
      {
        title: "Main homepage content",
        description: "Start here for homepage wording, section visibility, order, sizing and hero media.",
        ids: ["site_settings", "hero_banners"],
      },
      {
        title: "Homepage tabs",
        description: "Edit the compact tab names separately from the full pages opened by those tabs.",
        ids: ["homepage_features", "homepage_tab_pages"],
      },
      {
        title: "Repeated homepage cards",
        description: "Add, edit, hide or reorder the cards and figures inside each homepage section.",
        ids: ["services", "applications", "operational_domains", "impact_stats", "quick_links", "geoportals"],
      },
    ],
  },
  {
    id: "divisions",
    title: "Divisions",
    description: "Use the directory editor for division cards and the page editor for content inside an opened division.",
    sections: [
      {
        title: "Division directory",
        description: "Controls the cards shown when a visitor opens Divisions.",
        ids: ["divisions"],
      },
      {
        title: "Opened division pages",
        description: "Controls sections, lists, people, images, videos and documents inside each division.",
        ids: ["division_pages"],
      },
    ],
  },
  {
    id: "content-pages",
    title: "Website Pages",
    description: "Edit complete About, Facility, Training and other standalone pages.",
    sections: [
      {
        title: "Main website areas",
        description: "Choose a page and edit its visible sections in English or Hindi.",
        ids: ["about_pages", "facility_pages", "academic_pages"],
      },
      {
        title: "Additional standalone pages",
        description: "Use this only for an independent page that does not belong to a named area above.",
        ids: ["pages"],
      },
    ],
  },
  {
    id: "navigation-appearance",
    title: "Navigation and Appearance",
    description: "Manage directory introductions, page titles, menus, contact details, logos and site-wide design.",
    sections: [
      {
        title: "Page titles and appearance",
        description: "Edit directory introductions, individual page headings and shared website fonts or spacing.",
        ids: ["page_sections", "page_display_settings", "design_settings"],
      },
      {
        title: "Header and footer",
        description: "Edit visitor navigation, contact details and the logos used across the website.",
        ids: ["menu_items", "contact", "logos"],
      },
    ],
  },
  {
    id: "people",
    title: "People and Our Formers",
    description: "Page wording, rosters and master profile records are separated here so each person is edited only once.",
    sections: [
      {
        title: "Shared page wording",
        description: "Headings, introductions, labels and buttons used across People pages.",
        ids: ["people_page_text"],
      },
      {
        title: "Page rosters",
        description: "Choose which existing people appear on Our Formers and Scientific Manpower pages.",
        ids: ["our_formers_pages", "scientific_manpower_page"],
      },
      {
        title: "People profiles",
        description: "Edit a person's master name, photograph, role and bilingual details here.",
        ids: ["people_scientists", "people_leadership", "people_officials", "people_former_scientists", "people_technical_staff", "people_administration"],
      },
      {
        title: "Organisation summaries",
        description: "Edit summary groups and the organisation chart.",
        ids: ["manpower", "organisation_roles"],
      },
    ],
  },
  {
    id: "public-information",
    title: "Public Information",
    description: "Edit statutory pages, public updates, questions, gallery, mobile applications and Flood records.",
    sections: [
      {
        title: "Official information pages",
        description: "Edit each complete public-information page and its local documents.",
        ids: ["rti_page", "appellate_authority_page", "memorandum_page", "general_service_rules_page", "feedback_page", "policies"],
      },
      {
        title: "Updates and public resources",
        description: "Manage tenders, questions, notices, photographs and mobile applications.",
        ids: ["tenders", "faq", "notices", "gallery", "mobile_apps"],
      },
      {
        title: "Flood information",
        description: "Edit Flood page labels separately from the year-wise report records and PDFs.",
        ids: ["flood_page_settings", "flood_reports"],
      },
    ],
  },
];
