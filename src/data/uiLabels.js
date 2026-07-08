// Registry of short interface wordings (buttons, badges, statuses) that appear
// across the site through the t() translator in LanguageContext. Every entry
// below is seeded into Directus as an "Interface Labels" content block so
// editors can reword any of them (English and Hindi) without code changes.
// The slug is derived from the English text; components keep calling
// t("English text") and the CMS override wins when present.

export const slugifyUiLabel = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const uiLabelDefaults = {
  "about-rsac-up": "About RSAC-UP",
  "administration": "Administration",
  "all-notices": "All notices",
  "breadcrumb": "Breadcrumb",
  "close": "Close",
  "close-full-chart": "Close full chart",
  "contact": "Contact",
  "details": "Details",
  "download-a-screen-reader": "Download a screen reader",
  "english": "English",
  "experience": "Experience",
  "flood": "Flood",
  "flood-reports": "Flood reports",
  "former-chairman-governing-body-directors-and-scientists": "Former Chairman Governing Body, Directors, and Scientists.",
  "four-decades-of-geospatial-service-to-uttar-pradesh": "Four decades of geospatial service to Uttar Pradesh",
  "geospatial-intelligence-for-uttar-pradesh": "Geospatial Intelligence for Uttar Pradesh",
  "government-and-partner-logos": "Government and partner logos",
  "home": "Home",
  "homepage-sections": "Homepage sections",
  "image-viewer": "Image viewer",
  "inner-pages": "inner pages",
  "institution-at-a-glance": "Institution at a Glance",
  "jump-straight-to-the-most-used-pages": "Jump straight to the most-used pages",
  "language": "Language:",
  "last-date": "Last Date",
  "latest-announcements": "Latest announcements",
  "leadership": "Leadership",
  "legacy-rsac-media-is-currently-unavailable": "Legacy RSAC media is currently unavailable.",
  "links": "links",
  "listen": "Listen",
  "listen-to-this-page": "Listen to this page",
  "loading-official-records": "Loading Official Records",
  "local-copy-unavailable": "Local copy unavailable",
  "navigated-to": "Navigated to",
  "next": "Next",
  "no-reports-have-been-published-for-this-year-yet": "No reports have been published for this year yet.",
  "official-organisational-chart": "Official organisational chart",
  "open": "Open",
  "open-full-chart": "Open full chart",
  "open-our-formers": "Open Our Formers",
  "open-portal": "Open Portal",
  "opens-in-new-tab": "opens in new tab",
  "organisation-chart": "Organisation Chart",
  "organisational-chart-is-awaiting-publication": "Organisational chart is awaiting publication.",
  "our-formers": "Our Formers",
  "pause": "Pause",
  "pause-hero-background-video": "Pause hero background video",
  "paused": "Paused",
  "pdf": "PDF",
  "people": "People",
  "play-hero-background-video": "Play hero background video",
  "please-wait-while-the-selected-section-is-loaded": "Please wait while the selected section is loaded.",
  "preparing-page-content": "Preparing page content",
  "previous": "Previous",
  "prime-minister-and-chief-minister-portraits": "Prime Minister and Chief Minister portraits",
  "publications": "Publications",
  "published-structure": "Published Structure",
  "quick-access": "Quick Access",
  "quick-links": "Quick links",
  "reading-aloud": "Reading aloud",
  "reports": "reports",
  "request": "Request",
  "resume": "Resume",
  "return-home": "Return home",
  "rsac-up-key-metrics": "RSAC-UP key metrics",
  "rsac-up-logo": "RSAC-UP logo",
  "screen-reader": "Screen Reader",
  "screen-reader-software-list": "Screen reader software list",
  "section-menu": "Section Menu",
  "service-categories": "Service categories",
  "size": "Size:",
  "stop": "Stop",
  "stopped": "Stopped",
  "swipe-horizontally-to-view-the-complete-chart": "Swipe horizontally to view the complete chart",
  "technical-staff": "Technical Staff",
  "tenders": "Tenders",
  "type": "Type",
  "view-all": "View all",
  "view-all-photos": "View all photos",
  "view-details": "View Details",
  "view-facility": "View facility",
  "view-scientists": "View Scientists",
  "website": "Website",
  "what-s-new": "What's New",
  "year-wise-flood-archive": "Year-wise flood archive",
};

// Tiny module-level store bridging provider order: LanguageProvider (above)
// needs overrides that DataProvider (below) fetches from the CMS.
let activeLabels = {};
let activeVersion = 0;
const listeners = new Set();

export const setUiLabels = (labels) => {
  const next = labels && typeof labels === "object" ? labels : {};
  if (next === activeLabels) {
    return;
  }
  activeLabels = next;
  activeVersion += 1;
  listeners.forEach((listener) => listener(activeVersion));
};

export const getUiLabelOverride = (text) => {
  const override = activeLabels[slugifyUiLabel(text)];
  return typeof override === "string" && override.trim() ? override : undefined;
};

export const getUiLabelsVersion = () => activeVersion;

export const subscribeUiLabels = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
