// Keep editor ownership in the portal. This module never rewrites stored content
// or changes the public website's existing override/fallback behavior.
export const pageLayoutFieldNames = [
  "eyebrowSize", "headingSize", "contentSize", "pageFont", "headingFont",
  "bodyFontSize", "headingFontSize", "eyebrowFontSize", "contentWidth",
  "mediaSize", "contentSpacing",
];

const textFields = ["title", "eyebrow", "intro"];
const pageFields = new Set([...textFields, ...pageLayoutFieldNames]);
const textFieldSet = new Set(textFields);

const settingsOwner = (label, fields = textFields) => ({ label, fields: new Set(fields) });
// Only claim fields that the current Settings portal actually exposes. For
// example, Contact exposes its app-section text but has no shell-title input.
const staticRouteOwners = {
  "/objectives": settingsOwner("Objective, Approach and Activity Page Content", ["title"]),
  "/implementation": settingsOwner("Objective, Approach and Activity Page Content", ["title"]),
  "/approach": settingsOwner("Objective, Approach and Activity Page Content", ["title"]),
  "/sphere-of-activities": settingsOwner("Objective, Approach and Activity Page Content", ["title", "intro"]),
  "/mobile-apps": settingsOwner("Homepage, Sitemap and Shared Text", ["title", "intro"]),
  "/gallery": settingsOwner("Homepage, Sitemap and Shared Text"),
  "/sitemap": settingsOwner("Homepage, Sitemap and Shared Text"),
  "/downloads": settingsOwner("Homepage, Sitemap and Shared Text"),
  "/about-us/our-formers": settingsOwner("Shared People Page Text"),
  "/leadership": settingsOwner("Shared People Page Text"),
  "/technical-staff": settingsOwner("Shared People Page Text", ["title", "eyebrow"]),
  "/administration": settingsOwner("Shared People Page Text", ["title", "eyebrow"]),
  "/manpower": settingsOwner("Shared People Page Text"),
  "/organisation-chart": settingsOwner("Shared People Page Text"),
};

const publicInfoPaths = new Set([
  "/rti", "/appellate-authority", "/memorandum-of-association",
  "/general-service-rules", "/feedback", "/tenders", "/faq",
]);
const policyPaths = new Set([
  "/terms-and-conditions", "/privacy-policy", "/copyright-policy",
  "/hyperlinking-policy", "/disclaimer", "/help", "/accessibility-statement",
]);

const dataOf = (entry, language = "en") =>
  entry?.[language === "hi" ? "dataHi" : "dataEn"]
  || entry?.[language === "hi" ? "data_hi" : "data_en"]
  || (language === "en" ? entry : {})
  || {};

const normalizedPath = (value) => String(value || "").trim();

const presentOverride = (value) => typeof value === "string"
  ? Boolean(value.trim())
  : typeof value === "number" && Number.isFinite(value) && value > 0;

export const pageOwnerForPath = (path) => {
  const route = normalizedPath(path);
  if (staticRouteOwners[route]) {
    return staticRouteOwners[route];
  }
  if (["/about-us", "/divisions", "/facilities", "/academics"].includes(route)) {
    return { label: "Directory Introductions", fields: textFieldSet };
  }
  if (/^\/(?:about-us|divisions|facilities|academics|standalone)\//u.test(route)) {
    const area = route.split("/")[1];
    const label = {
      "about-us": "About and Institutional Pages",
      divisions: "Division Pages and Sections",
      facilities: "Facility Pages and Sections",
      academics: "Training and Academic Pages",
      standalone: "Custom Standalone Pages",
    }[area];
    return { label, fields: pageFields };
  }
  if (publicInfoPaths.has(route)) {
    return { label: "Official information pages", fields: route === "/feedback" ? new Set(["title", "eyebrow"]) : textFieldSet };
  }
  if (policyPaths.has(route)) return { label: "Website Policies", fields: new Set(["title", "intro"]) };
  return null;
};

export const pagePathForEntry = (collection, entry) => {
  const data = dataOf(entry);
  if (collection === "pages") {
    const section = String(data.sectionKey || "about-us").replace(/^\/+|\/+$/gu, "");
    const slug = String(data.slug || entry?.entryKey || entry?.entry_key || "");
    return slug ? `/${section}/${slug}` : "";
  }
  if (collection === "page_sections") {
    const route = String(data.route || data.key || "").replace(/^\/+|\/+$/gu, "");
    return route ? `/${route}` : "";
  }
  if (["public_info", "policies"].includes(collection)) {
    const slug = String(data.slug || "").replace(/^\/+|\/+$/gu, "");
    return slug ? `/${slug}` : "";
  }
  if (collection === "page_display_settings") return normalizedPath(data.path);
  return "";
};

// Evaluate existing ownership from the record opened for editing, not from the
// draft. Clearing an override must not hide the input before it can be saved.
export const filterPageDisplayEditorFields = (fields, draft, savedEntry) => {
  const path = pagePathForEntry("page_display_settings", draft);
  const owner = pageOwnerForPath(path);
  if (!owner) return fields;
  const existingPath = pagePathForEntry("page_display_settings", savedEntry);
  const sameExistingRoute = Boolean(savedEntry?.id && existingPath === path);
  return fields.filter((field) => {
    if (!owner.fields.has(field.name)) return true;
    if (!sameExistingRoute) return false;
    return presentOverride(dataOf(savedEntry)[field.name])
      || (field.localized !== false && presentOverride(dataOf(savedEntry, "hi")[field.name]));
  });
};

export const sanitizePageDisplayDraft = (fields, draft, savedEntry) => {
  const editable = new Set(filterPageDisplayEditorFields(fields, draft, savedEntry).map((field) => field.name));
  const next = structuredClone(draft);
  for (const field of fields) {
    if (editable.has(field.name)) continue;
    // A path change can retain values from the previous route even though their
    // controls disappear. Do not let those stale values become new overrides.
    for (const language of ["dataEn", "dataHi", "data_en", "data_hi"]) {
      if (next?.[language]) delete next[language][field.name];
    }
  }
  return next;
};

const matchesPath = (settingPath, path) => settingPath === path
  || Boolean(settingPath?.endsWith("/*") && path.startsWith(settingPath.slice(0, -1)));

const getOverrideOwnership = (path, displayField, displayEntries, language) => {
  if (!path) return null;
  if (!pageFields.has(displayField)) return null;
  const published = (Array.isArray(displayEntries) ? displayEntries : []).filter((item) =>
    item?.status === undefined || item.status === "published"
  );
  // This is the exact same selection order as PageShell: an exact route beats
  // the first matching group. An exact empty field does not inherit group data.
  const display = published.find((item) => pagePathForEntry("page_display_settings", item) === path)
    || published.find((item) => matchesPath(pagePathForEntry("page_display_settings", item), path));
  if (!display) return null;
  const sourceLanguage = pageLayoutFieldNames.includes(displayField) ? "en" : language;
  if (!presentOverride(dataOf(display, sourceLanguage)[displayField])) return null;
  return {
    owner: "page_display_settings",
    label: "Page Headings and Subheadings",
    path: pagePathForEntry("page_display_settings", display),
    field: displayField,
    value: dataOf(display, sourceLanguage)[displayField],
    entryId: display.id || "",
  };
};

export const getSourceFieldOwnership = (collection, entry, fieldName, displayEntries, language = "en") => {
  const path = pagePathForEntry(collection, entry);
  // Feedback's summary is the form introduction, separate from the page shell.
  if (collection === "public_info" && path === "/feedback" && fieldName === "summary") return null;
  return getOverrideOwnership(
    path, fieldName === "summary" ? "intro" : fieldName, displayEntries, language
  );
};

const settingsHeaders = {
  "pageContent.gallery.title": ["/gallery", "title", true],
  "pageContent.gallery.eyebrow": ["/gallery", "eyebrow", true],
  "pageContent.gallery.intro": ["/gallery", "intro", false],
  "pageContent.sitemap.title": ["/sitemap", "title", false],
  "pageContent.sitemap.eyebrow": ["/sitemap", "eyebrow", false],
  "pageContent.sitemap.intro": ["/sitemap", "intro", false],
  "pageContent.downloads.title": ["/downloads", "title", false],
  "pageContent.downloads.eyebrow": ["/downloads", "eyebrow", false],
  "pageContent.downloads.intro": ["/downloads", "intro", false],
  "pageContent.ourFormers.title": ["/about-us/our-formers", "title", false],
  "pageContent.ourFormers.eyebrow": ["/about-us/our-formers", "eyebrow", false],
  "pageContent.ourFormers.intro": ["/about-us/our-formers", "intro", false],
  "pageContent.leadership.title": ["/leadership", "title", false],
  "pageContent.leadership.eyebrow": ["/leadership", "eyebrow", false],
  "pageContent.leadership.intro": ["/leadership", "intro", false],
  "pageContent.technicalStaff.title": ["/technical-staff", "title", false],
  "pageContent.technicalStaff.eyebrow": ["/technical-staff", "eyebrow", false],
  "pageContent.administration.title": ["/administration", "title", false],
  "pageContent.administration.eyebrow": ["/administration", "eyebrow", false],
  "pageContent.manpower.title": ["/manpower", "title", false],
  "pageContent.manpower.eyebrow": ["/manpower", "eyebrow", false],
  "pageContent.manpower.intro": ["/manpower", "intro", false],
  "pageContent.organisationChart.title": ["/organisation-chart", "title", false],
  "pageContent.organisationChart.eyebrow": ["/organisation-chart", "eyebrow", false],
  "organisationChart.intro": ["/organisation-chart", "intro", false],
  "pageContent.visionMission.objectivesHeading": ["/objectives", "title", true],
  "pageContent.visionMission.implementationHeading": ["/implementation", "title", true],
  "pageContent.visionMission.approachHeading": ["/approach", "title", true],
  "pageContent.visionMission.sphereHeading": ["/sphere-of-activities", "title", true],
  "pageContent.visionMission.sphereIntro": ["/sphere-of-activities", "intro", true],
  "pageContent.contact.mobileAppsHeading": ["/mobile-apps", "title", true],
  "pageContent.contact.mobileAppsIntro": ["/mobile-apps", "intro", true],
};

// A reused label can remain editable for its other visible uses. The portal
// should render a destination note for that one route, rather than hide it.
export const getSettingsFieldOwnership = (settingsPath, displayEntries, language = "en") => {
  const header = settingsHeaders[settingsPath];
  if (!header) return null;
  const [path, field, reused] = header;
  const ownership = getOverrideOwnership(path, field, displayEntries, language);
  return ownership ? { ...ownership, reused } : null;
};

export const pageDisplayOwnershipNotice = (draft) => {
  const owner = pageOwnerForPath(pagePathForEntry("page_display_settings", draft));
  if (!owner) return "";
  const subject = owner.fields.has("pageFont")
    ? "Page wording and layout"
    : owner.fields.size === 1 ? "The main page heading" : "Page headings and introductions";
  return `${subject} can be edited in ${owner.label}. Existing custom values remain editable here.`;
};
