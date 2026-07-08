import { Blob } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { divisionHindiPhrases } from "../src/data/divisionHindiPhrases.js";
import {
  extractPageTextFields,
  mergePageTextFieldValues,
  translatePageTextFields,
} from "../src/data/pageTextFields.js";
import { hiTranslations } from "../src/data/translations.js";
import { collectPageImages } from "./lib/division-sections.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = join(repoRoot, "backend", "directus");
const mode = process.argv.find((argument) =>
  ["configure", "seed", "sync-settings", "validate", "all"].includes(argument)
) || "all";
const forceRequested = process.argv.includes("--force");

const parseEnvFile = (path) => {
  if (!existsSync(path)) {
    return {};
  }

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

      if (!match || match[1].startsWith("#")) {
        return values;
      }

      values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      return values;
    }, {});
};

const env = {
  ...parseEnvFile(join(backendRoot, ".env")),
  ...process.env,
};
const forceAllowed =
  String(env.DIRECTUS_ALLOW_FORCE_SEED).toLowerCase() === "true";
if (forceRequested && !forceAllowed) {
  throw new Error(
    "Force seed is locked to protect editor data. Set DIRECTUS_ALLOW_FORCE_SEED=true only for an approved recovery, then unset it immediately."
  );
}
const force = forceRequested && forceAllowed;
const directusUrl = String(
  env.DIRECTUS_URL || env.PUBLIC_URL || "http://localhost:8055"
).replace(/\/+$/, "");
const configuredFrontendOrigin = String(env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .find((origin) => /^https?:\/\//i.test(origin));
const frontendUrl = String(
  env.FRONTEND_URL || configuredFrontendOrigin || "http://localhost:5173"
).replace(/\/+$/, "");
const adminEmail = env.ADMIN_EMAIL;
const adminPassword = env.ADMIN_PASSWORD;
const publicPolicyId = "abf8a154-5b1c-4a46-ac9c-7300570f4f17";
const strictPublicPermissions =
  String(env.DIRECTUS_STRICT_PUBLIC_PERMISSIONS).toLowerCase() === "true";
let accessToken = "";
let publicFolderId = "";

const request = async (
  path,
  { method = "GET", body, auth = true, form = false, allow404 = false } = {}
) => {
  const headers = {};

  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (body !== undefined && !form) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    response = await fetch(`${directusUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined ? undefined : form ? body : JSON.stringify(body),
    });

    if (response.status !== 429) {
      break;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter)
      ? Math.max(retryAfter * 1000, 250)
      : 600 * (attempt + 1);
    await new Promise((resolveWait) => setTimeout(resolveWait, delay));
  }

  if (allow404 && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const details = await response.text();
    const isFieldMetadataPatch =
      method === "PATCH" && String(path).startsWith("/fields/");

    if (
      isFieldMetadataPatch &&
      (response.status === 403 || response.status === 404)
    ) {
      console.warn(
        `Skipped Directus Studio field metadata update for ${path}: ${response.status}. Content data and website rendering are unaffected.`
      );
      return null;
    }

    throw new Error(
      `${method} ${path} failed (${response.status}): ${details.slice(0, 600)}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  return payload?.data ?? payload;
};

const waitForDirectus = async () => {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(`${directusUrl}/server/health`);

      if (response.status < 500) {
        return;
      }
    } catch {
      // Directus may still be creating its system tables.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 2000));
  }

  throw new Error(`Directus did not become healthy at ${directusUrl}.`);
};

const login = async () => {
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required in backend/directus/.env."
    );
  }

  const data = await request("/auth/login", {
    method: "POST",
    auth: false,
    body: {
      email: adminEmail,
      password: adminPassword,
      mode: "json",
    },
  });
  accessToken = data.access_token;
};

const collections = {
  rsac_site_settings: {
    icon: "tune",
    note: "Homepage Prime Minister and Chief Minister portraits. Other legacy settings are hidden; use Website Text, Brand Logos, and Organisation Chart Roles for normal editing.",
    singleton: true,
    sort: 4,
  },
  rsac_content_blocks: {
    icon: "edit_note",
    note: "Open a row, change the English or Hindi words, then press Save. Website layout is handled automatically.",
    display_template: "{{section}} - {{label}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 1,
  },
  rsac_editor_map: {
    icon: "explore",
    note: "Start here when you do not know where to edit something. Each row tells editors which Directus collection and fields control a website area.",
    display_template: "{{website_area}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 1,
  },
  rsac_brand_logos: {
    icon: "verified",
    note: "Header logos and emblems. Add, order, publish, or remove logos without changing the website layout.",
    display_template: "{{title}} - {{placement}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 2,
  },
  rsac_organisation_roles: {
    icon: "account_tree",
    note: "Each person, division, and support function shown in the dynamic organisational chart.",
    display_template: "{{title}} - {{name}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 3,
  },
  rsac_quick_links: {
    icon: "link",
    note: "Homepage Quick Access cards. Edit labels, destinations, icons, colours, order, and publication status with normal form fields.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 4,
  },
  rsac_home_feature_tabs: {
    icon: "dashboard_customize",
    note: "Homepage editable rows for feature tabs, Operational Domains, Institution at a Glance, and Find the Centre. Use the Homepage Area dropdown; no JSON is needed.",
    display_template: "{{key}} - {{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 5,
  },
  rsac_mobile_apps: {
    icon: "phone_android",
    note: "Download cards on the Geo-Portal page. Upload a file or provide an approved URL.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 6,
  },
  rsac_gallery_items: {
    icon: "photo_library",
    note: "Website photo gallery. Upload, caption, order, publish, or archive each image here.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 7,
  },
  rsac_contact: {
    icon: "contact_mail",
    note: "Official address and public contact details.",
    singleton: true,
    sort: 2,
  },
  rsac_sections: {
    icon: "view_list",
    note: "Top-level directories used to build inner-page navigation.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 3,
  },
  rsac_pages: {
    icon: "article",
    note: "Website pages with simple labelled English and Hindi text rows. Layout templates are locked.",
    display_template: "{{title}} - {{section_key}}",
    preview_url: `${frontendUrl}/{{section_key}}/{{slug}}?lang={{edit_language}}`,
    sort_field: "sort",
    archive_field: "status",
    sort: 4,
  },
  rsac_page_images: {
    icon: "imagesmode",
    note: "Every photo shown inside a website page, named by the tab or section it appears under. Upload a new image into a row to replace that photo on the website; leave it empty to keep the current photo.",
    display_template: "{{label}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 4,
  },
  rsac_profiles: {
    icon: "groups",
    note: "Separate records for officials, leaders, scientists, former scientists, and staff. Check the profile type before editing people with similar names.",
    display_template: "{{name}} - {{profile_type}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 5,
  },
  rsac_divisions: {
    icon: "account_tree",
    note: "Scientific division summaries.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 6,
  },
  rsac_facilities: {
    icon: "science",
    note: "Facility summaries.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 7,
  },
  rsac_geoportals: {
    icon: "public",
    note: "External geo-portal service cards.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 8,
  },
  rsac_notices: {
    icon: "campaign",
    note: "Published notices, circulars, dates, links, and documents.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 9,
  },
  rsac_flood_reports: {
    icon: "flood",
    note: "Published flood-monitoring reports and downloadable PDF documents.",
    display_template: "{{title}} - {{date_label}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 10,
  },
  rsac_site_visits: {
    icon: "monitoring",
    note: "Privacy-friendly website visit counter. Stores only timestamp and source; no personal data.",
    display_template: "{{date_created}}",
    hidden: true,
    sort: 16,
  },
  rsac_policies: {
    icon: "policy",
    note: "Policy, help, disclaimer, and accessibility pages. Add sections with labelled form fields.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 11,
  },
  rsac_public_info: {
    icon: "info",
    note: "RTI, feedback, tenders, and other public-service pages. Add sections and links with simple forms.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 12,
  },
  rsac_hero_videos: {
    icon: "movie",
    note: "Homepage hero video and poster assets.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 13,
  },
  rsac_manpower_groups: {
    icon: "badge",
    note: "Manpower overview cards.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 14,
  },
  rsac_menu: {
    icon: "menu",
    note: "Fullscreen navigation domains and destination cards.",
    display_template: "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    sort: 15,
  },
};

const editorFolders = {
  editor_start_here: {
    icon: "explore",
    color: "#0b6fa4",
    label: "Start Here",
    note: "Plain-language map of where every website change is made.",
    sort: 0,
  },
  editor_homepage: {
    icon: "home",
    color: "#ef7d00",
    label: "Homepage",
    note: "Homepage words, images, logos, links, and video.",
    sort: 1,
  },
  editor_pages_navigation: {
    icon: "web",
    color: "#0b74b8",
    label: "Pages and Navigation",
    note: "Inner pages, divisions, facilities, portals, and menus.",
    sort: 2,
  },
  editor_people: {
    icon: "groups",
    color: "#15824b",
    label: "People and Organisation",
    note: "Officials, employees, scientific manpower, and organisation chart.",
    sort: 3,
  },
  editor_public_updates: {
    icon: "campaign",
    color: "#8b5cf6",
    label: "Public Information",
    note: "Notices, reports, policies, gallery, downloads, and contact details.",
    sort: 4,
  },
};

const collectionEditorMeta = {
  rsac_editor_map: ["Editing Map", "editor_start_here"],
  rsac_site_settings: ["Homepage Leaders", "editor_homepage"],
  rsac_content_blocks: ["Website Text Editor", "editor_homepage"],
  rsac_brand_logos: ["Header Logos", "editor_homepage"],
  rsac_quick_links: ["Homepage Quick Links", "editor_homepage"],
  rsac_home_feature_tabs: ["Homepage Sections", "editor_homepage"],
  rsac_hero_videos: ["Homepage Video", "editor_homepage"],
  rsac_sections: ["Website Sections", "editor_pages_navigation"],
  rsac_pages: ["Website Pages", "editor_pages_navigation"],
  rsac_page_images: ["Page Photos", "editor_pages_navigation"],
  rsac_divisions: ["Scientific Divisions", "editor_pages_navigation"],
  rsac_facilities: ["Facilities", "editor_pages_navigation"],
  rsac_geoportals: ["Geo-Portal Services", "editor_pages_navigation"],
  rsac_menu: ["Main Menu", "editor_pages_navigation"],
  rsac_profiles: ["People Profiles", "editor_people"],
  rsac_organisation_roles: ["Organisation Chart", "editor_people"],
  rsac_manpower_groups: ["Manpower Summary", "editor_people"],
  rsac_contact: ["Contact Details", "editor_public_updates"],
  rsac_notices: ["Notices and Circulars", "editor_public_updates"],
  rsac_flood_reports: ["Flood Reports", "editor_public_updates"],
  rsac_policies: ["Policies and Help", "editor_public_updates"],
  rsac_public_info: ["Public Information Pages", "editor_public_updates"],
  rsac_gallery_items: ["Photo Gallery", "editor_public_updates"],
  rsac_mobile_apps: ["App Downloads", "editor_public_updates"],
};

const editorLayouts = {
  rsac_content_blocks: {
    help: "Edit only **English Text** or **Hindi Text**, then press **Save**. Formatting and page layout are automatic.",
    groups: [
      ["editor_location", "Where This Text Appears", "location_on", "open", ["section", "label", "help_text"]],
      ["editor_english", "English Text", "language", "open", ["value"]],
      ["editor_hindi", "Hindi Text", "translate", "open", ["value_hi"]],
    ],
    hidden: ["key", "value_type", "status", "sort"],
  },
  rsac_editor_map: {
    help: "Use this first when you are unsure where to edit something. Search for the website area, open the row, and follow the plain steps.",
    groups: [
      ["editor_location", "What This Controls", "explore", "open", ["website_area", "edit_collection", "where_to_click", "public_effect"]],
      ["editor_fields", "Fields to Edit", "edit_note", "open", ["english_fields", "hindi_fields", "media_fields"]],
      ["editor_safety", "Safe Daily Steps", "shield", "open", ["daily_steps", "common_mistakes"]],
    ],
    hidden: ["key", "status", "sort"],
  },
  rsac_home_feature_tabs: {
    help: "This one collection controls homepage feature tabs, Operational Domains cards, Institution at a Glance stat cards, and the Find the Centre map card without JSON. Use the Internal Key prefixes explained below.",
    groups: [
      ["editor_type", "Where This Item Appears", "location_on", "open", ["key"]],
      ["editor_english", "English Text", "language", "open", ["title", "summary", "details", "button_label"]],
      ["editor_hindi", "Hindi Text", "translate", "closed", ["title_hi", "summary_hi", "details_hi", "button_label_hi"]],
      ["editor_link", "Icon and Link", "link", "open", ["icon_key", "button_path"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
  },
  rsac_site_settings: {
    help: "Replace a leader portrait here and press **Save**. Other homepage words are in **Website Text Editor**.",
    groups: [
      ["editor_media", "Leader Portraits", "photo_camera", "open", ["prime_minister_photo", "chief_minister_photo"]],
    ],
    hidden: [
      "brand_logo",
      "government_logo",
      "organisation_chart_file",
      "appearance",
      "layout",
      "branding",
      "hero",
      "mission_pulse",
      "home_sections",
      "about",
      "location",
      "footer",
      "organisation_chart",
      "accessibility",
      "page_content",
      "impact_stats",
      "services",
      "applications",
      "flood_section",
      "search",
      "ui",
      "cards",
      "translations",
    ],
  },
  rsac_brand_logos: {
    help: "Upload the logo, write accessible image text, choose its position, then publish.",
    groups: [
      ["editor_english", "Logo Details", "verified", "open", ["title", "alt_text", "link_url", "placement"]],
      ["editor_hindi", "Hindi Text", "translate", "closed", ["title_hi", "alt_text_hi"]],
      ["editor_media", "Logo Image", "image", "open", ["image"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
  },
  rsac_organisation_roles: {
    help: "The chart structure and arrows are locked. Change only the portrait, name, and designation, then press Save.",
    groups: [
      ["editor_english", "English Name and Designation", "language", "open", ["name", "role", "post"]],
      ["editor_hindi", "Hindi Name and Designation", "translate", "closed", ["name_hi", "role_hi", "post_hi"]],
      ["editor_media", "Photo", "photo_camera", "closed", ["photo", "object_position"]],
      ["editor_publish", "Visibility", "publish", "closed", ["status"]],
    ],
    hidden: ["role_key", "title", "title_hi", "group_key", "slot", "sort"],
  },
  rsac_quick_links: {
    help: "Change the card words and destination. Icons and colours use simple dropdown controls.",
    groups: [
      ["editor_english", "English Card", "language", "open", ["title", "description"]],
      ["editor_hindi", "Hindi Card", "translate", "closed", ["title_hi", "description_hi"]],
      ["editor_destination", "Link and Appearance", "link", "open", ["path", "icon_key", "accent"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
    hidden: ["key"],
  },
  rsac_mobile_apps: {
    help: "Upload the app file, or enter an approved external download link when no file is available.",
    groups: [
      ["editor_english", "English Card", "language", "open", ["title", "description"]],
      ["editor_hindi", "Hindi Card", "translate", "closed", ["title_hi", "description_hi"]],
      ["editor_media", "Download", "download", "open", ["download", "url"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
    hidden: ["key"],
  },
  rsac_gallery_items: {
    help: "Choose a photograph, add meaningful English and Hindi descriptions, then publish.",
    groups: [
      ["editor_media", "Photograph", "photo_library", "open", ["image"]],
      ["editor_english", "English Caption", "language", "open", ["title", "alt_text"]],
      ["editor_hindi", "Hindi Caption", "translate", "closed", ["title_hi", "alt_text_hi"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
    hidden: ["key"],
  },
  rsac_contact: {
    help: "Edit public contact information. Use **Add Item** to add another office contact.",
    groups: [
      ["editor_english", "English Contact Details", "language", "open", ["title", "address", "contacts"]],
      ["editor_hindi", "Hindi Contact Details", "translate", "closed", ["title_hi", "address_hi", "contacts_hi"]],
      ["editor_contact", "Phone and Email", "contact_phone", "open", ["email", "phone", "mobile"]],
    ],
  },
  rsac_sections: {
    help: "Edit section headings and introductions. Change Website Address only when a developer confirms it.",
    groups: [
      ["editor_english", "English Content", "language", "open", ["title", "eyebrow", "intro"]],
      ["editor_hindi", "Hindi Content", "translate", "closed", ["title_hi", "eyebrow_hi", "intro_hi"]],
      ["editor_advanced", "Website Address", "link", "closed", ["key", "route"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
  },
  rsac_pages: {
    help: "First choose English or Hindi below. Only that language opens for editing. Change labelled text rows, Save, then use Live Preview.",
    visible: ["edit_language"],
    groups: [
      ["editor_english", "English Page", "language", "open", ["title", "summary", "content_fields"]],
      ["editor_hindi", "Hindi Page", "translate", "open", ["title_hi", "summary_hi", "content_fields_hi"]],
      ["editor_photos", "Photos on This Page", "photo_library", "closed", ["page_photos"]],
      ["editor_card", "Card Look on Section Grid", "palette", "closed", ["card_icon", "card_color", "card_color_2"]],
      ["editor_media", "Page Image", "image", "closed", ["featured_image"]],
      ["editor_advanced", "Website Address", "link", "closed", ["section_key", "slug"]],
      ["editor_publish", "Publish and Review", "publish", "closed", ["content_owner", "date_published", "review_due_on", "status", "sort"]],
    ],
    hidden: ["html", "html_hi", "source_url", "language"],
  },
  rsac_page_images: {
    help: "Each row is one photo on a website page, named by the tab or section it appears under. Open a row, upload the replacement in **New Photo**, then Save. Leave **New Photo** empty to keep the original photo.",
    groups: [
      ["editor_location", "Where This Photo Appears", "location_on", "open", ["page", "label"]],
      ["editor_media", "New Photo", "photo_camera", "open", ["image"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
    hidden: ["page_slug", "original_src"],
  },
  rsac_profiles: {
    help: "First check **Profile Type** and **Employee ID**, especially for people with similar names. Then edit only this person's details.",
    groups: [
      ["editor_identity", "Person and Profile Type", "badge", "open", ["profile_type", "employee_id", "name"]],
      ["editor_english", "English Profile", "language", "open", ["role", "designation", "department", "deployment", "duration", "specialization", "experience", "publications", "category", "details"]],
      ["editor_hindi", "Hindi Profile", "translate", "closed", ["name_hi", "role_hi", "designation_hi", "department_hi", "deployment_hi", "duration_hi", "specialization_hi", "experience_hi", "publications_hi", "category_hi", "details_hi"]],
      ["editor_media", "Photo and Contact", "photo_camera", "closed", ["photo", "object_position", "contact", "email"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
    hidden: ["source_url"],
  },
  rsac_divisions: {
    help: "Edit the English and Hindi division summaries. Add each highlight separately, then save.",
    groups: [
      ["editor_english", "English Content", "language", "open", ["title", "lead", "highlights"]],
      ["editor_hindi", "Hindi Content", "translate", "closed", ["title_hi", "lead_hi", "highlights_hi"]],
      ["editor_advanced", "Website Address", "link", "closed", ["slug"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
    hidden: ["source_url"],
  },
  rsac_facilities: {
    help: "Edit the facility name and description in both languages, then publish.",
    groups: [
      ["editor_english", "English Content", "language", "open", ["title", "text"]],
      ["editor_hindi", "Hindi Content", "translate", "closed", ["title_hi", "text_hi"]],
      ["editor_advanced", "Website Address", "link", "closed", ["slug"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
  },
  rsac_geoportals: {
    help: "Edit the service card and approved external link. Choose icon and colour from the controls.",
    groups: [
      ["editor_english", "English Card", "language", "open", ["title", "description"]],
      ["editor_hindi", "Hindi Card", "translate", "closed", ["title_hi", "description_hi"]],
      ["editor_destination", "Link and Appearance", "public", "open", ["url", "icon_key", "accent"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
  },
  rsac_notices: {
    help: "Add the notice title and upload its PDF here. Do not paste a link from another website.",
    groups: [
      ["editor_english", "English Notice", "language", "open", ["title", "category", "meta"]],
      ["editor_hindi", "Hindi Notice", "translate", "closed", ["title_hi", "category_hi", "meta_hi"]],
      ["editor_media", "PDF Document", "attach_file", "open", ["document"]],
      ["editor_publish", "Dates and Publishing", "publish", "closed", ["last_date", "date_published", "review_due_on", "status", "sort"]],
    ],
    hidden: ["url"],
  },
  rsac_flood_reports: {
    help: "Add the report details and upload its PDF here. Do not paste a link from another website.",
    groups: [
      ["editor_english", "English Report", "language", "open", ["title", "date_label", "category", "coverage", "meta"]],
      ["editor_hindi", "Hindi Report", "translate", "closed", ["title_hi", "date_label_hi", "category_hi", "coverage_hi", "meta_hi"]],
      ["editor_media", "PDF Document", "picture_as_pdf", "open", ["document"]],
      ["editor_publish", "Date, Publish, and Order", "publish", "closed", ["date", "status", "sort"]],
    ],
    hidden: ["url"],
  },
  rsac_policies: {
    help: "Use **Add Item** to create a section, then fill the Heading and Body boxes like a normal form. No HTML is required.",
    groups: [
      ["editor_english", "English Page", "language", "open", ["title", "summary", "sections"]],
      ["editor_hindi", "Hindi Page", "translate", "closed", ["title_hi", "summary_hi", "sections_hi"]],
      ["editor_advanced", "Website Address", "link", "closed", ["slug"]],
      ["editor_publish", "Publish and Review", "publish", "closed", ["content_owner", "review_due_on", "status", "sort"]],
    ],
    hidden: ["source_url"],
  },
  rsac_public_info: {
    help: "Use **Add Item** for a content section or link, then fill the labelled text boxes. No HTML or JSON is required.",
    groups: [
      ["editor_english", "English Page", "language", "open", ["title", "eyebrow", "summary", "sections", "links"]],
      ["editor_hindi", "Hindi Page", "translate", "closed", ["title_hi", "eyebrow_hi", "summary_hi", "sections_hi", "links_hi"]],
      ["editor_advanced", "Website Address", "link", "closed", ["slug"]],
      ["editor_publish", "Publish and Review", "publish", "closed", ["content_owner", "review_due_on", "status", "sort"]],
    ],
    hidden: ["source_url"],
  },
  rsac_hero_videos: {
    help: "Upload a poster image first. Video is optional; when present, it plays over the poster automatically.",
    groups: [
      ["editor_english", "English Label", "language", "open", ["title"]],
      ["editor_hindi", "Hindi Label", "translate", "closed", ["title_hi"]],
      ["editor_media", "Poster and Video", "movie", "open", ["poster", "video"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
    hidden: ["file_name"],
  },
  rsac_manpower_groups: {
    help: "Edit the card title, number, short description, and destination.",
    groups: [
      ["editor_english", "English Card", "language", "open", ["title", "text"]],
      ["editor_hindi", "Hindi Card", "translate", "closed", ["title_hi", "text_hi"]],
      ["editor_details", "Number and Link", "badge", "open", ["count", "path"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
  },
  rsac_menu: {
    help: "Edit menu headings and destination cards. Use **Add Item** to add another clearly labelled link.",
    groups: [
      ["editor_english", "English Menu", "language", "open", ["title", "description", "links"]],
      ["editor_hindi", "Hindi Menu", "translate", "closed", ["title_hi", "description_hi", "links_hi"]],
      ["editor_destination", "Main Destination", "link", "closed", ["path"]],
      ["editor_publish", "Publish and Order", "publish", "closed", ["status", "sort"]],
    ],
  },
};

// Collections with both an English and a Hindi editing group get the same
// "Choose Language to Edit" switch as Website Pages: only the chosen
// language's fields stay visible, so editors never see the same content
// twice. Requires the collection to carry an `edit_language` column
// (postgres-schema.sql adds it to every bilingual table).
const hasLanguageSwitch = (layout) =>
  layout.groups.some(([field]) => field === "editor_english") &&
  layout.groups.some(([field]) => field === "editor_hindi");

const jsonFields = {
  rsac_site_settings: [
    "appearance",
    "layout",
    "branding",
    "hero",
    "mission_pulse",
    "home_sections",
    "about",
    "location",
    "footer",
    "organisation_chart",
    "accessibility",
    "page_content",
    "impact_stats",
    "services",
    "applications",
    "flood_section",
    "search",
    "ui",
    "cards",
    "translations",
  ],
  rsac_contact: ["contacts", "contacts_hi", "translations"],
  rsac_sections: ["translations"],
  rsac_pages: ["content_fields", "content_fields_hi", "translations"],
  rsac_profiles: ["details", "details_hi", "translations"],
  rsac_divisions: ["highlights", "highlights_hi", "translations"],
  rsac_facilities: ["translations"],
  rsac_geoportals: ["translations"],
  rsac_home_feature_tabs: ["translations"],
  rsac_notices: ["translations"],
  rsac_flood_reports: ["translations"],
  rsac_policies: ["sections", "sections_hi", "translations"],
  rsac_public_info: ["sections", "sections_hi", "links", "links_hi", "translations"],
  rsac_hero_videos: ["translations"],
  rsac_manpower_groups: ["translations"],
  rsac_menu: ["links", "links_hi", "translations"],
};

const fieldLabelOverrides = {
  "rsac_content_blocks.section": "Website Area",
  "rsac_content_blocks.label": "Text Name",
  "rsac_content_blocks.value": "English Text",
  "rsac_content_blocks.value_hi": "Hindi Text",
  "rsac_content_blocks.help_text": "Editor Note",
  "rsac_editor_map.website_area": "Website Area",
  "rsac_editor_map.edit_collection": "Open This Directus Collection",
  "rsac_editor_map.where_to_click": "Where to Click",
  "rsac_editor_map.english_fields": "English Fields",
  "rsac_editor_map.hindi_fields": "Hindi Fields",
  "rsac_editor_map.media_fields": "Image / File Fields",
  "rsac_editor_map.daily_steps": "Daily Editing Steps",
  "rsac_editor_map.common_mistakes": "Common Mistakes to Avoid",
  "rsac_editor_map.public_effect": "What Changes on the Website",
  "rsac_site_settings.prime_minister_photo": "Prime Minister Portrait",
  "rsac_site_settings.chief_minister_photo": "Chief Minister Portrait",
  "rsac_pages.content_fields": "English Page Text",
  "rsac_pages.content_fields_hi": "Hindi Page Text",
  "rsac_pages.edit_language": "Choose Language to Edit",
  "rsac_pages.html": "Locked English Layout Template",
  "rsac_pages.html_hi": "Locked Hindi Layout Template",
  "rsac_pages.section_key": "Website Section",
  "rsac_pages.slug": "Page Address",
  "rsac_pages.page_photos": "Photos on This Page",
  "rsac_pages.card_icon": "Card Icon",
  "rsac_pages.card_color": "Card Colour (Main)",
  "rsac_pages.card_color_2": "Card Colour (Second)",
  "rsac_page_images.page": "Website Page",
  "rsac_page_images.label": "Where This Photo Appears",
  "rsac_page_images.image": "New Photo",
  "rsac_sections.key": "Section Identifier",
  "rsac_sections.route": "Website Address",
  "rsac_profiles.profile_type": "Where This Person Appears",
  "rsac_profiles.employee_id": "Employee ID",
  "rsac_profiles.object_position": "Photo Crop Position",
  "rsac_organisation_roles.group_key": "Organisation Level",
  "rsac_organisation_roles.slot": "Position in Level",
  "rsac_organisation_roles.name": "Name",
  "rsac_organisation_roles.name_hi": "Name in Hindi",
  "rsac_organisation_roles.role": "Designation",
  "rsac_organisation_roles.role_hi": "Designation in Hindi",
  "rsac_organisation_roles.post": "Additional Designation",
  "rsac_organisation_roles.post_hi": "Additional Designation in Hindi",
  "rsac_organisation_roles.object_position": "Photo Alignment",
  "rsac_quick_links.path": "Page to Open",
  "rsac_home_feature_tabs.button_label": "English Button Text",
  "rsac_home_feature_tabs.button_label_hi": "Hindi Button Text",
  "rsac_home_feature_tabs.button_path": "Button Link",
  "rsac_home_feature_tabs.icon_key": "Icon",
  "rsac_home_feature_tabs.key": "Internal Key",
  "rsac_mobile_apps.download": "Download File",
  "rsac_mobile_apps.url": "External Download Link",
  "rsac_geoportals.url": "Portal Link",
  "rsac_notices.meta": "English Short Information",
  "rsac_notices.meta_hi": "Hindi Short Information",
  "rsac_notices.last_date": "Last Date",
  "rsac_flood_reports.meta": "English Short Information",
  "rsac_flood_reports.meta_hi": "Hindi Short Information",
  "rsac_flood_reports.date_label": "English Date Label",
  "rsac_flood_reports.date_label_hi": "Hindi Date Label",
  "rsac_policies.sections": "English Content Sections",
  "rsac_policies.sections_hi": "Hindi Content Sections",
  "rsac_public_info.sections": "English Content Sections",
  "rsac_public_info.sections_hi": "Hindi Content Sections",
  "rsac_public_info.links": "English Links",
  "rsac_public_info.links_hi": "Hindi Links",
  "rsac_menu.links": "English Menu Links",
  "rsac_menu.links_hi": "Hindi Menu Links",
  "rsac_hero_videos.poster": "Poster Image",
  "rsac_hero_videos.video": "Video File",
};

const friendlyWords = {
  alt_text: "Image Description",
  category: "Category",
  contact: "Public Contact",
  content_owner: "Responsible Officer",
  count: "Number",
  coverage: "Coverage",
  date: "Report Date",
  date_published: "Publish Date",
  department: "Department / Division",
  deployment: "Current Posting",
  description: "Description",
  designation: "Designation",
  details: "Additional Details",
  document: "PDF / Document",
  duration: "Service Duration",
  email: "Email Address",
  eyebrow: "Small Heading",
  experience: "Experience",
  highlights: "Highlights",
  icon_key: "Icon",
  image: "Image",
  intro: "Introduction",
  lead: "Introduction",
  link_url: "Optional Website Link",
  mobile: "Mobile Number",
  edit_language: "Choose Language to Edit",
  name: "Name",
  object_position: "Photo Crop Position",
  path: "Website Link",
  phone: "Phone Number",
  photo: "Photo",
  placement: "Logo Position",
  post: "Post / Position",
  publications: "Publications",
  review_due_on: "Review Due Date",
  role: "Role",
  slug: "Page Address",
  sort: "Display Order",
  specialization: "Specialisation",
  status: "Visibility",
  summary: "Short Introduction",
  text: "Description",
  title: "Title",
  url: "External Link",
};

const titleCase = (value) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getFieldLabel = (collection, field, collectionFieldNames) => {
  const exact = fieldLabelOverrides[`${collection}.${field}`];
  if (exact) return exact;

  const isHindi = field.endsWith("_hi");
  const base = isHindi ? field.slice(0, -3) : field;
  const label = friendlyWords[base] || titleCase(base);

  if (isHindi) return `Hindi ${label}`;
  if (collectionFieldNames.has(`${field}_hi`)) return `English ${label}`;
  return label;
};

const fileFields = [
  ["rsac_site_settings", "brand_logo", "image"],
  ["rsac_site_settings", "government_logo", "image"],
  ["rsac_site_settings", "prime_minister_photo", "image"],
  ["rsac_site_settings", "chief_minister_photo", "image"],
  ["rsac_site_settings", "organisation_chart_file", "image"],
  ["rsac_pages", "featured_image", "image"],
  ["rsac_page_images", "image", "image"],
  ["rsac_profiles", "photo", "image"],
  ["rsac_notices", "document", "file"],
  ["rsac_flood_reports", "document", "file"],
  ["rsac_hero_videos", "video", "file"],
  ["rsac_hero_videos", "poster", "image"],
  ["rsac_brand_logos", "image", "image"],
  ["rsac_organisation_roles", "photo", "image"],
  ["rsac_mobile_apps", "download", "file"],
  ["rsac_gallery_items", "image", "image"],
];

const studioFieldOrder = {
  rsac_content_blocks: [
    "section",
    "label",
    "value",
    "value_hi",
    "help_text",
    "key",
    "value_type",
    "status",
    "sort",
  ],
  rsac_editor_map: [
    "website_area",
    "edit_collection",
    "where_to_click",
    "english_fields",
    "hindi_fields",
    "media_fields",
    "daily_steps",
    "common_mistakes",
    "public_effect",
    "key",
    "status",
    "sort",
  ],
  rsac_brand_logos: [
    "title",
    "title_hi",
    "image",
    "alt_text",
    "alt_text_hi",
    "link_url",
    "placement",
    "status",
    "sort",
  ],
  rsac_organisation_roles: [
    "title",
    "title_hi",
    "name",
    "name_hi",
    "role",
    "role_hi",
    "post",
    "post_hi",
    "photo",
    "object_position",
    "group_key",
    "slot",
    "role_key",
    "status",
    "sort",
  ],
  rsac_quick_links: [
    "title",
    "title_hi",
    "description",
    "description_hi",
    "path",
    "icon_key",
    "accent",
    "key",
    "status",
    "sort",
  ],
  rsac_home_feature_tabs: [
    "key",
    "title",
    "title_hi",
    "summary",
    "summary_hi",
    "details",
    "details_hi",
    "button_label",
    "button_label_hi",
    "button_path",
    "icon_key",
    "status",
    "sort",
  ],
  rsac_mobile_apps: [
    "title",
    "title_hi",
    "description",
    "description_hi",
    "download",
    "url",
    "key",
    "status",
    "sort",
  ],
  rsac_gallery_items: [
    "image",
    "title",
    "title_hi",
    "alt_text",
    "alt_text_hi",
    "key",
    "status",
    "sort",
  ],
  rsac_site_settings: [
    "brand_logo",
    "government_logo",
    "prime_minister_photo",
    "chief_minister_photo",
    "organisation_chart_file",
    "branding",
    "hero",
    "mission_pulse",
    "home_sections",
    "about",
    "services",
    "applications",
    "impact_stats",
    "location",
    "flood_section",
    "organisation_chart",
    "page_content",
    "footer",
    "accessibility",
    "appearance",
    "layout",
    "search",
    "ui",
    "cards",
    "translations",
  ],
  rsac_contact: [
    "title",
    "title_hi",
    "address",
    "address_hi",
    "email",
    "phone",
    "mobile",
    "contacts",
    "contacts_hi",
    "translations",
  ],
  rsac_sections: [
    "title",
    "title_hi",
    "key",
    "route",
    "eyebrow",
    "eyebrow_hi",
    "intro",
    "intro_hi",
    "translations",
    "status",
    "sort",
  ],
  rsac_pages: [
    "edit_language",
    "title",
    "title_hi",
    "section_key",
    "slug",
    "summary",
    "summary_hi",
    "content_fields",
    "content_fields_hi",
    "html",
    "html_hi",
    "card_icon",
    "card_color",
    "card_color_2",
    "featured_image",
    "source_url",
    "language",
    "content_owner",
    "date_published",
    "review_due_on",
    "translations",
    "status",
    "sort",
  ],
  rsac_page_images: [
    "page",
    "label",
    "image",
    "original_src",
    "page_slug",
    "status",
    "sort",
  ],
  rsac_profiles: [
    "name",
    "name_hi",
    "profile_type",
    "role",
    "role_hi",
    "designation",
    "designation_hi",
    "department",
    "department_hi",
    "deployment",
    "deployment_hi",
    "employee_id",
    "duration",
    "duration_hi",
    "photo",
    "object_position",
    "specialization",
    "specialization_hi",
    "experience",
    "experience_hi",
    "publications",
    "publications_hi",
    "contact",
    "email",
    "source_url",
    "category",
    "category_hi",
    "details",
    "details_hi",
    "translations",
    "status",
    "sort",
  ],
  rsac_divisions: [
    "title",
    "title_hi",
    "slug",
    "lead",
    "lead_hi",
    "source_url",
    "highlights",
    "highlights_hi",
    "translations",
    "status",
    "sort",
  ],
  rsac_facilities: [
    "title",
    "title_hi",
    "slug",
    "text",
    "text_hi",
    "translations",
    "status",
    "sort",
  ],
  rsac_geoportals: [
    "title",
    "title_hi",
    "description",
    "description_hi",
    "url",
    "icon_key",
    "accent",
    "translations",
    "status",
    "sort",
  ],
  rsac_notices: [
    "title",
    "title_hi",
    "category",
    "category_hi",
    "meta",
    "meta_hi",
    "last_date",
    "document",
    "url",
    "date_published",
    "review_due_on",
    "translations",
    "status",
    "sort",
  ],
  rsac_flood_reports: [
    "title",
    "title_hi",
    "date",
    "date_label",
    "date_label_hi",
    "category",
    "category_hi",
    "coverage",
    "coverage_hi",
    "meta",
    "meta_hi",
    "document",
    "url",
    "translations",
    "status",
    "sort",
  ],
  rsac_policies: [
    "title",
    "title_hi",
    "slug",
    "summary",
    "summary_hi",
    "sections",
    "sections_hi",
    "source_url",
    "content_owner",
    "review_due_on",
    "translations",
    "status",
    "sort",
  ],
  rsac_public_info: [
    "title",
    "title_hi",
    "slug",
    "eyebrow",
    "eyebrow_hi",
    "summary",
    "summary_hi",
    "sections",
    "sections_hi",
    "links",
    "links_hi",
    "source_url",
    "content_owner",
    "review_due_on",
    "translations",
    "status",
    "sort",
  ],
  rsac_hero_videos: [
    "title",
    "title_hi",
    "poster",
    "video",
    "file_name",
    "translations",
    "status",
    "sort",
  ],
  rsac_manpower_groups: [
    "title",
    "title_hi",
    "count",
    "text",
    "text_hi",
    "path",
    "translations",
    "status",
    "sort",
  ],
  rsac_menu: [
    "title",
    "title_hi",
    "description",
    "description_hi",
    "path",
    "links",
    "links_hi",
    "translations",
    "status",
    "sort",
  ],
  rsac_site_visits: ["source"],
};

const fullWidthFields = new Set([
  "rsac_content_blocks.value",
  "rsac_content_blocks.value_hi",
  "rsac_content_blocks.help_text",
  "rsac_editor_map.website_area",
  "rsac_editor_map.edit_collection",
  "rsac_editor_map.where_to_click",
  "rsac_editor_map.english_fields",
  "rsac_editor_map.hindi_fields",
  "rsac_editor_map.media_fields",
  "rsac_editor_map.daily_steps",
  "rsac_editor_map.common_mistakes",
  "rsac_editor_map.public_effect",
  "rsac_organisation_roles.role",
  "rsac_organisation_roles.role_hi",
  "rsac_organisation_roles.post",
  "rsac_organisation_roles.post_hi",
  "rsac_quick_links.description",
  "rsac_quick_links.description_hi",
  "rsac_home_feature_tabs.title",
  "rsac_home_feature_tabs.summary",
  "rsac_home_feature_tabs.summary_hi",
  "rsac_home_feature_tabs.details",
  "rsac_home_feature_tabs.details_hi",
  "rsac_mobile_apps.description",
  "rsac_mobile_apps.description_hi",
  "rsac_contact.address",
  "rsac_contact.address_hi",
  "rsac_contact.contacts",
  "rsac_contact.contacts_hi",
  "rsac_sections.intro",
  "rsac_sections.intro_hi",
  "rsac_pages.title",
  "rsac_pages.edit_language",
  "rsac_pages.summary",
  "rsac_pages.summary_hi",
  "rsac_pages.content_fields",
  "rsac_pages.content_fields_hi",
  "rsac_pages.html",
  "rsac_pages.html_hi",
  "rsac_pages.source_url",
  "rsac_profiles.specialization",
  "rsac_profiles.specialization_hi",
  "rsac_profiles.experience",
  "rsac_profiles.experience_hi",
  "rsac_profiles.publications",
  "rsac_profiles.publications_hi",
  "rsac_profiles.source_url",
  "rsac_profiles.details",
  "rsac_profiles.details_hi",
  "rsac_divisions.title",
  "rsac_divisions.lead",
  "rsac_divisions.lead_hi",
  "rsac_divisions.source_url",
  "rsac_divisions.highlights",
  "rsac_divisions.highlights_hi",
  "rsac_facilities.title",
  "rsac_facilities.text",
  "rsac_facilities.text_hi",
  "rsac_geoportals.title",
  "rsac_geoportals.description",
  "rsac_geoportals.description_hi",
  "rsac_geoportals.url",
  "rsac_notices.title",
  "rsac_notices.meta",
  "rsac_notices.meta_hi",
  "rsac_notices.url",
  "rsac_flood_reports.title",
  "rsac_flood_reports.coverage",
  "rsac_flood_reports.coverage_hi",
  "rsac_flood_reports.meta",
  "rsac_flood_reports.meta_hi",
  "rsac_flood_reports.url",
  "rsac_policies.title",
  "rsac_policies.summary",
  "rsac_policies.summary_hi",
  "rsac_policies.sections",
  "rsac_policies.sections_hi",
  "rsac_policies.source_url",
  "rsac_public_info.title",
  "rsac_public_info.summary",
  "rsac_public_info.summary_hi",
  "rsac_public_info.sections",
  "rsac_public_info.sections_hi",
  "rsac_public_info.links",
  "rsac_public_info.links_hi",
  "rsac_public_info.source_url",
  "rsac_hero_videos.title",
  "rsac_manpower_groups.title",
  "rsac_manpower_groups.text",
  "rsac_manpower_groups.text_hi",
  "rsac_menu.title",
  "rsac_menu.description",
  "rsac_menu.description_hi",
  "rsac_menu.links",
  "rsac_menu.links_hi",
  ...Object.keys(jsonFields).map((collection) => `${collection}.translations`),
  ...jsonFields.rsac_site_settings.map(
    (field) => `rsac_site_settings.${field}`
  ),
]);

const multilineFields = new Set([
  "rsac_content_blocks.value",
  "rsac_content_blocks.value_hi",
  "rsac_content_blocks.help_text",
  "rsac_editor_map.where_to_click",
  "rsac_editor_map.english_fields",
  "rsac_editor_map.hindi_fields",
  "rsac_editor_map.media_fields",
  "rsac_editor_map.daily_steps",
  "rsac_editor_map.common_mistakes",
  "rsac_editor_map.public_effect",
  "rsac_organisation_roles.role",
  "rsac_organisation_roles.role_hi",
  "rsac_organisation_roles.post",
  "rsac_organisation_roles.post_hi",
  "rsac_quick_links.description",
  "rsac_quick_links.description_hi",
  "rsac_home_feature_tabs.summary",
  "rsac_home_feature_tabs.summary_hi",
  "rsac_home_feature_tabs.details",
  "rsac_home_feature_tabs.details_hi",
  "rsac_mobile_apps.description",
  "rsac_mobile_apps.description_hi",
  "rsac_contact.address",
  "rsac_contact.address_hi",
  "rsac_sections.intro",
  "rsac_sections.intro_hi",
  "rsac_pages.summary",
  "rsac_pages.summary_hi",
  "rsac_profiles.specialization",
  "rsac_profiles.specialization_hi",
  "rsac_profiles.experience",
  "rsac_profiles.experience_hi",
  "rsac_profiles.publications",
  "rsac_profiles.publications_hi",
  "rsac_divisions.lead",
  "rsac_divisions.lead_hi",
  "rsac_facilities.text",
  "rsac_facilities.text_hi",
  "rsac_geoportals.description",
  "rsac_geoportals.description_hi",
  "rsac_notices.meta",
  "rsac_notices.meta_hi",
  "rsac_flood_reports.coverage",
  "rsac_flood_reports.coverage_hi",
  "rsac_flood_reports.meta",
  "rsac_flood_reports.meta_hi",
  "rsac_policies.summary",
  "rsac_policies.summary_hi",
  "rsac_public_info.summary",
  "rsac_public_info.summary_hi",
  "rsac_manpower_groups.text",
  "rsac_manpower_groups.text_hi",
  "rsac_menu.description",
  "rsac_menu.description_hi",
]);

const fieldNotes = {
  "rsac_content_blocks.value":
    "English website text. Edit the words only; the Content Key is managed by the system.",
  "rsac_content_blocks.value_hi":
    "Hindi version of the same text. Leave blank only when an approved Hindi translation is unavailable.",
  "rsac_content_blocks.key":
    "System path used by the website (for example hero.title). Type it only when creating a new row, and only for a path the website already reads — unknown paths show nowhere. Never rename it afterwards.",
  "rsac_content_blocks.section":
    "Folder-style label that groups rows in this list (for example Homepage Hero). It does not move the text on the website.",
  "rsac_content_blocks.label":
    "Short name so editors can find this row. It does not appear on the website.",
  "rsac_editor_map.website_area":
    "Searchable name of the website area, for example Homepage hero, Notices, or Division page photos.",
  "rsac_editor_map.edit_collection":
    "The Directus collection to open from the left menu.",
  "rsac_editor_map.where_to_click":
    "Plain steps for finding the correct row or button inside Directus.",
  "rsac_editor_map.english_fields":
    "Fields to edit for English content.",
  "rsac_editor_map.hindi_fields":
    "Fields to edit for Hindi content. Hindi is typed manually and can be left blank to fall back to English.",
  "rsac_editor_map.media_fields":
    "Image, video, or document fields to use. Editors should not type file paths manually.",
  "rsac_editor_map.daily_steps":
    "Safe editing workflow for this website area.",
  "rsac_editor_map.common_mistakes":
    "Things that usually break content or cause confusion.",
  "rsac_editor_map.public_effect":
    "What visitors will see after the record is saved and published.",
  "rsac_brand_logos.image":
    "Upload the logo here, set Placement, set Status to Published, and save.",
  "rsac_brand_logos.placement":
    "Primary is the RSAC identity at the left. Supporting logos appear beside the menu and adapt automatically.",
  "rsac_organisation_roles.group_key":
    "Controls the chart tier. Use the dropdown; no code or JSON is required.",
  "rsac_organisation_roles.role_key":
    "Stable system key. Do not change it after the record is created.",
  "rsac_quick_links.key":
    "Stable internal key. Use lowercase words joined with hyphens; do not change it after publication.",
  "rsac_quick_links.path":
    "Website destination beginning with /, for example /gallery.",
  "rsac_home_feature_tabs.icon_key":
    "Choose an icon from the dropdown. Only some Homepage Areas use an icon.",
  "rsac_home_feature_tabs.key":
    "Stable internal key. Use feature-tab keys like objective, impact-stat-1 for stats, operational-domain-agriculture for sphere cards, or location-card for Find the Centre. Do not rename after publication.",
  "rsac_home_feature_tabs.title":
    "Visible title. For Institution stats this is the small label; for Operational Domains it is the card title; for Find the Centre it is the locality.",
  "rsac_home_feature_tabs.summary":
    "For feature tabs this is the intro. For stats this is the large value. For Operational Domains this is the card detail. For Find the Centre this is the address.",
  "rsac_home_feature_tabs.details":
    "For feature tabs and Operational Domains, write one line per point. For stats this is the supporting sentence. For Find the Centre this is the map search text.",
  "rsac_home_feature_tabs.button_path":
    "Optional website link beginning with /. Leave blank when the item should not open another page.",
  "rsac_mobile_apps.key":
    "Stable internal key. Use lowercase words joined with hyphens; do not change it after publication.",
  "rsac_mobile_apps.download":
    "Preferred option: upload or select the downloadable file. It overrides External URL.",
  "rsac_mobile_apps.url":
    "Optional approved external URL, used only when no file is selected.",
  "rsac_gallery_items.key":
    "Stable internal key. Use lowercase words joined with hyphens; do not change it after publication.",
  "rsac_gallery_items.image":
    "Upload/select the photograph. Add meaningful alternative text for accessibility.",
  "rsac_site_settings.brand_logo":
    "Main RSAC-UP logo. Upload/select the replacement here, then save Site Settings.",
  "rsac_site_settings.government_logo":
    "Government emblem used in the website header.",
  "rsac_site_settings.prime_minister_photo":
    "Prime Minister portrait. Use a centered portrait without a baked-in circular border.",
  "rsac_site_settings.chief_minister_photo":
    "Chief Minister portrait. Use a centered portrait without a baked-in circular border.",
  "rsac_site_settings.organisation_chart_file":
    "Used only on the Organisational Chart page. Upload a new dedicated file here; never replace a shared File Library item.",
  "rsac_site_settings.branding":
    "Header names, labels, and branding text. Keep existing JSON keys.",
  "rsac_site_settings.hero":
    "Homepage hero headings, body text, buttons, leaders, and labels. Media belongs in Hero Videos.",
  "rsac_site_settings.mission_pulse":
    "Homepage immersive satellite section text and labels.",
  "rsac_site_settings.home_sections":
    "Homepage section visibility, order, headings, and supporting text.",
  "rsac_site_settings.about": "Homepage and shared About content.",
  "rsac_site_settings.services":
    "Homepage service cards and related text.",
  "rsac_site_settings.applications":
    "Homepage application areas and related text.",
  "rsac_site_settings.impact_stats":
    "Homepage statistics. Preserve each item's existing keys.",
  "rsac_site_settings.location":
    "RSAC-UP location, map labels, address, and map URL.",
  "rsac_site_settings.flood_section":
    "Flood section heading, introduction, labels, and actions. PDFs belong in Flood Reports.",
  "rsac_site_settings.organisation_chart":
    "Organisational Chart page headings and accessibility text. Chart image uses Organisation Chart File above.",
  "rsac_site_settings.page_content":
    "Shared page headings and interface copy not stored in individual page records.",
  "rsac_site_settings.footer":
    "Footer policy links, related-institution links, ownership text, visitor/date labels, and contact labels. Footer logo, organisation intro, about text, and footer quick-links are intentionally not shown.",
  "rsac_site_settings.accessibility":
    "Skip-link, assistive labels, and accessibility interface text.",
  "rsac_site_settings.appearance":
    "Approved theme values used by the frontend. Change only documented keys.",
  "rsac_site_settings.layout":
    "Supported layout and responsive behavior values. Change only documented keys.",
  "rsac_site_settings.search":
    "Search headings, labels, empty states, and helper text.",
  "rsac_site_settings.ui": "Shared buttons, labels, and interface messages.",
  "rsac_site_settings.cards":
    "Shared card labels and supported card presentation values.",
  "rsac_pages.section_key":
    "Must match an existing RSAC Sections Key. Changing it moves the page to another section.",
  "rsac_pages.slug":
    "Route identifier. Do not change after publication unless frontend links are also updated.",
  "rsac_pages.featured_image":
    "Optional image for this generic inner page only. It does not control the homepage hero or organisational chart.",
  "rsac_profiles.photo":
    "Upload/select this person's portrait here. Shared photos change together if Replace File is used.",
  "rsac_notices.document":
    "Upload the notice PDF here. Uploading into File Library alone does not attach it.",
  "rsac_flood_reports.document":
    "Upload the flood-report PDF here. Uploading into File Library alone does not attach it.",
  "rsac_hero_videos.poster":
    "Homepage background image. Upload a new dedicated file here. If Video is filled, it covers Poster after loading.",
  "rsac_hero_videos.video":
    "Optional MP4. Clear this field when Poster should remain as a static homepage image.",
};

const publicFields = {
  rsac_content_blocks: [
    "id", "key", "section", "label", "value", "value_hi", "value_type",
    "status", "sort", "date_updated",
  ],
  rsac_editor_map: [
    "id", "key", "website_area", "edit_collection", "where_to_click",
    "english_fields", "hindi_fields", "media_fields", "daily_steps",
    "common_mistakes", "public_effect", "status", "sort", "date_updated",
  ],
  rsac_brand_logos: [
    "id", "title", "title_hi", "image", "alt_text", "alt_text_hi",
    "link_url", "placement", "status", "sort", "date_updated",
  ],
  rsac_organisation_roles: [
    "id", "role_key", "group_key", "slot", "title", "title_hi", "name",
    "name_hi", "role", "role_hi", "post", "post_hi", "photo",
    "object_position", "status", "sort", "date_updated",
  ],
  rsac_quick_links: [
    "id", "key", "title", "title_hi", "description", "description_hi",
    "path", "icon_key", "accent", "status", "sort", "date_updated",
  ],
  rsac_home_feature_tabs: [
    "id", "key", "title", "title_hi", "summary", "summary_hi", "details",
    "details_hi", "button_label", "button_label_hi", "button_path",
    "icon_key", "status", "sort", "translations", "date_updated",
  ],
  rsac_mobile_apps: [
    "id", "key", "title", "title_hi", "description", "description_hi",
    "download", "url", "status", "sort", "date_updated",
  ],
  rsac_gallery_items: [
    "id", "key", "title", "title_hi", "alt_text", "alt_text_hi",
    "image", "status", "sort", "date_updated",
  ],
  rsac_site_settings: [
    "id",
    "appearance",
    "layout",
    "branding",
    "hero",
    "mission_pulse",
    "home_sections",
    "about",
    "location",
    "footer",
    "organisation_chart",
    "accessibility",
    "page_content",
    "impact_stats",
    "services",
    "applications",
    "flood_section",
    "search",
    "ui",
    "cards",
    "brand_logo",
    "government_logo",
    "prime_minister_photo",
    "chief_minister_photo",
    "organisation_chart_file",
    "translations",
    "date_updated",
  ],
  rsac_contact: [
    "id",
    "title",
    "title_hi",
    "address",
    "address_hi",
    "email",
    "phone",
    "mobile",
    "contacts",
    "contacts_hi",
    "translations",
    "date_updated",
  ],
  rsac_sections: [
    "id",
    "key",
    "route",
    "title",
    "title_hi",
    "eyebrow",
    "eyebrow_hi",
    "intro",
    "intro_hi",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_pages: [
    "id",
    "section_key",
    "slug",
    "title",
    "title_hi",
    "summary",
    "summary_hi",
    "content_fields",
    "content_fields_hi",
    "html",
    "html_hi",
    "card_icon",
    "card_color",
    "card_color_2",
    "featured_image",
    "source_url",
    "status",
    "sort",
    "date_published",
    "review_due_on",
    "content_owner",
    "language",
    "translations",
    "date_updated",
  ],
  rsac_page_images: [
    "id",
    "page",
    "page_slug",
    "label",
    "original_src",
    "image",
    "status",
    "sort",
    "date_updated",
  ],
  rsac_profiles: [
    "id",
    "profile_type",
    "name",
    "name_hi",
    "role",
    "role_hi",
    "designation",
    "designation_hi",
    "department",
    "department_hi",
    "deployment",
    "deployment_hi",
    "employee_id",
    "duration",
    "duration_hi",
    "photo",
    "object_position",
    "specialization",
    "specialization_hi",
    "experience",
    "experience_hi",
    "publications",
    "publications_hi",
    "contact",
    "email",
    "source_url",
    "category",
    "category_hi",
    "details",
    "details_hi",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_divisions: [
    "id",
    "slug",
    "title",
    "title_hi",
    "lead",
    "lead_hi",
    "source_url",
    "highlights",
    "highlights_hi",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_facilities: [
    "id",
    "slug",
    "title",
    "title_hi",
    "text",
    "text_hi",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_geoportals: [
    "id",
    "title",
    "title_hi",
    "description",
    "description_hi",
    "url",
    "icon_key",
    "accent",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_notices: [
    "id",
    "title",
    "title_hi",
    "category",
    "category_hi",
    "meta",
    "meta_hi",
    "last_date",
    "document",
    "url",
    "status",
    "sort",
    "date_published",
    "review_due_on",
    "translations",
    "date_updated",
  ],
  rsac_flood_reports: [
    "id",
    "title",
    "title_hi",
    "date",
    "date_label",
    "date_label_hi",
    "category",
    "category_hi",
    "coverage",
    "coverage_hi",
    "meta",
    "meta_hi",
    "document",
    "url",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_site_visits: [
    "id",
    "source",
    "date_created",
  ],
  rsac_policies: [
    "id",
    "slug",
    "title",
    "title_hi",
    "summary",
    "summary_hi",
    "source_url",
    "sections",
    "sections_hi",
    "status",
    "sort",
    "review_due_on",
    "content_owner",
    "translations",
    "date_updated",
  ],
  rsac_public_info: [
    "id",
    "slug",
    "title",
    "title_hi",
    "eyebrow",
    "eyebrow_hi",
    "summary",
    "summary_hi",
    "source_url",
    "sections",
    "sections_hi",
    "links",
    "links_hi",
    "status",
    "sort",
    "review_due_on",
    "content_owner",
    "translations",
    "date_updated",
  ],
  rsac_hero_videos: [
    "id",
    "title",
    "title_hi",
    "file_name",
    "video",
    "poster",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_manpower_groups: [
    "id",
    "title",
    "title_hi",
    "count",
    "text",
    "text_hi",
    "path",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  rsac_menu: [
    "id",
    "title",
    "title_hi",
    "description",
    "description_hi",
    "path",
    "links",
    "links_hi",
    "status",
    "sort",
    "translations",
    "date_updated",
  ],
  directus_files: [
    "id",
    "title",
    "storage",
    "filename_disk",
    "filename_download",
    "type",
    "description",
    "filesize",
    "width",
    "height",
    "folder",
    "uploaded_on",
    "modified_on",
  ],
};

const ensurePublicFolder = async () => {
  if (publicFolderId) {
    return publicFolderId;
  }

  const folders = await request(
    "/folders?limit=1&filter[name][_eq]=RSAC Website Public Media"
  );
  const folder =
    folders[0] ||
    (await request("/folders", {
      method: "POST",
      body: { name: "RSAC Website Public Media" },
    }));
  publicFolderId = folder.id;
  return publicFolderId;
};

const configureStudio = async () => {
  const websiteMediaFolderId = await ensurePublicFolder();
  const knownCollections = await request("/collections?limit=-1");
  const knownNames = new Set(knownCollections.map((item) => item.collection));
  const optionalCollections = new Set(["rsac_editor_map"]);
  const optionalMissingCollections = new Set();

  // rsac_page_images arrived after the original SQL schema. When the table is
  // not there yet, create it through the API so `configure` works on its own;
  // postgres-schema.sql creates the same table for fresh psql installs.
  if (!knownNames.has("rsac_page_images")) {
    await request("/collections", {
      method: "POST",
      body: {
        collection: "rsac_page_images",
        meta: {},
        schema: {},
        fields: [
          { field: "id", type: "bigInteger", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true, readonly: true } },
          { field: "page", type: "bigInteger", schema: {}, meta: {} },
          { field: "page_slug", type: "string", schema: {}, meta: {} },
          { field: "label", type: "string", schema: {}, meta: {} },
          { field: "original_src", type: "text", schema: {}, meta: {} },
          { field: "image", type: "uuid", schema: {}, meta: {} },
          { field: "status", type: "string", schema: { default_value: "published" }, meta: {} },
          { field: "sort", type: "integer", schema: { default_value: 0 }, meta: {} },
          { field: "date_created", type: "timestamp", schema: {}, meta: { special: ["date-created"], hidden: true, readonly: true } },
          { field: "date_updated", type: "timestamp", schema: {}, meta: { special: ["date-updated"], hidden: true, readonly: true } },
          { field: "user_created", type: "uuid", schema: {}, meta: { special: ["user-created"], hidden: true, readonly: true } },
          { field: "user_updated", type: "uuid", schema: {}, meta: { special: ["user-updated"], hidden: true, readonly: true } },
        ],
      },
    });
    knownNames.add("rsac_page_images");
  }

  // rsac_feedback stores website feedback-form submissions (written by the
  // bundled /rsac-feedback endpoint, never by anonymous collection access).
  // Deliberately NOT in `collections`, so it gets no public read permission.
  if (!knownNames.has("rsac_feedback")) {
    await request("/collections", {
      method: "POST",
      body: {
        collection: "rsac_feedback",
        meta: {},
        schema: {},
        fields: [
          { field: "id", type: "bigInteger", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true, readonly: true } },
          { field: "name", type: "string", schema: {}, meta: { readonly: true } },
          { field: "email", type: "string", schema: {}, meta: { readonly: true } },
          { field: "address", type: "text", schema: {}, meta: { readonly: true } },
          { field: "country", type: "string", schema: {}, meta: { readonly: true } },
          { field: "state", type: "string", schema: {}, meta: { readonly: true } },
          { field: "district", type: "string", schema: {}, meta: { readonly: true } },
          { field: "phone", type: "string", schema: {}, meta: { readonly: true } },
          { field: "comments", type: "text", schema: {}, meta: { readonly: true } },
          { field: "date_created", type: "timestamp", schema: {}, meta: { special: ["date-created"], readonly: true } },
        ],
      },
    });
    knownNames.add("rsac_feedback");
  }
  if (!knownNames.has("rsac_editor_map")) {
    optionalMissingCollections.add("rsac_editor_map");
  }
  if (!knownNames.has("rsac_home_feature_tabs")) {
    await request("/collections", {
      method: "POST",
      body: {
        collection: "rsac_home_feature_tabs",
        meta: {},
        schema: {},
        fields: [
          { field: "id", type: "bigInteger", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true, readonly: true } },
          { field: "key", type: "string", schema: { is_unique: true }, meta: {} },
          { field: "title", type: "string", schema: {}, meta: {} },
          { field: "title_hi", type: "string", schema: {}, meta: {} },
          { field: "summary", type: "text", schema: {}, meta: {} },
          { field: "summary_hi", type: "text", schema: {}, meta: {} },
          { field: "details", type: "text", schema: {}, meta: {} },
          { field: "details_hi", type: "text", schema: {}, meta: {} },
          { field: "button_label", type: "string", schema: {}, meta: {} },
          { field: "button_label_hi", type: "string", schema: {}, meta: {} },
          { field: "button_path", type: "string", schema: {}, meta: {} },
          { field: "icon_key", type: "string", schema: { default_value: "building" }, meta: {} },
          { field: "translations", type: "json", schema: {}, meta: { hidden: true } },
          { field: "status", type: "string", schema: { default_value: "published" }, meta: {} },
          { field: "sort", type: "integer", schema: { default_value: 0 }, meta: {} },
          { field: "date_created", type: "timestamp", schema: {}, meta: { special: ["date-created"], hidden: true, readonly: true } },
          { field: "date_updated", type: "timestamp", schema: {}, meta: { special: ["date-updated"], hidden: true, readonly: true } },
          { field: "user_created", type: "uuid", schema: {}, meta: { special: ["user-created"], hidden: true, readonly: true } },
          { field: "user_updated", type: "uuid", schema: {}, meta: { special: ["user-updated"], hidden: true, readonly: true } },
          { field: "edit_language", type: "string", schema: { default_value: "en" }, meta: {} },
        ],
      },
    });
    knownNames.add("rsac_home_feature_tabs");
  }
  await request("/collections/rsac_feedback", {
    method: "PATCH",
    body: {
      meta: {
        icon: "rate_review",
        // Hidden from the editor sidebar on purpose. The table is owned by
        // `postgres` with no grants to the Directus DB role, so opening it in
        // the UI only ever errors ("permission denied for table rsac_feedback").
        // Submissions are still stored by the bundled feedback endpoint; they
        // are read directly from the database (privacy wall for citizen PII),
        // never through Directus.
        hidden: true,
        note: "Website visitor feedback. Stored for the record but not shown in the editor — it holds personal details and is read only from the database, never in Directus.",
        display_template: "{{name}} — {{comments}}",
        sort_field: null,
        accountability: "all",
        translations: [
          {
            language: "en-US",
            translation: "Website Feedback",
            singular: "Feedback entry",
            plural: "Website Feedback",
          },
        ],
      },
    },
  });

  for (const [collection, folder] of Object.entries(editorFolders)) {
    const meta = {
      icon: folder.icon,
      color: folder.color,
      note: folder.note,
      sort: folder.sort,
      collapse: "open",
      translations: [
        {
          language: "en-US",
          translation: folder.label,
          singular: folder.label,
          plural: folder.label,
        },
      ],
    };

    if (knownNames.has(collection)) {
      await request(`/collections/${collection}`, {
        method: "PATCH",
        body: { meta },
      });
    } else {
      await request("/collections", {
        method: "POST",
        body: { collection, meta, schema: null },
      });
      knownNames.add(collection);
    }
  }

  for (const [collection, meta] of Object.entries(collections)) {
    if (!knownNames.has(collection)) {
      if (optionalCollections.has(collection)) {
        optionalMissingCollections.add(collection);
        continue;
      }

      throw new Error(
        `${collection} is missing. Apply postgres-schema.sql and restart Directus.`
      );
    }

    const [editorLabel, editorGroup] = collectionEditorMeta[collection] || [];
    await request(`/collections/${collection}`, {
      method: "PATCH",
      body: {
        meta: {
          ...meta,
          group: editorGroup || null,
          translations: editorLabel
            ? [
                {
                  language: "en-US",
                  translation: editorLabel,
                  singular: editorLabel,
                  plural: editorLabel,
                },
              ]
            : undefined,
          archive_app_filter: Boolean(meta.archive_field),
          archive_value: meta.archive_field ? "archived" : null,
          unarchive_value: meta.archive_field ? "draft" : null,
          accountability: "all",
        },
      },
    });
  }

  const knownFields = await request("/fields?limit=-1");
  const knownFieldKeys = new Set(
    knownFields.map((field) => `${field.collection}.${field.field}`)
  );
  const ensureEditorField = async (collection, field, meta) => {
    const key = `${collection}.${field}`;

    if (knownFieldKeys.has(key)) {
      await request(`/fields/${collection}/${field}`, {
        method: "PATCH",
        body: { meta },
      });
      return;
    }

    try {
      await request(`/fields/${collection}`, {
        method: "POST",
        body: {
          field,
          type: "alias",
          schema: null,
          meta,
        },
      });
      knownFieldKeys.add(key);
    } catch (error) {
      if (!String(error.message || "").includes("POST /fields/")) {
        throw error;
      }
    }
  };

  for (const [collection, layout] of Object.entries(editorLayouts)) {
    if (!knownNames.has(collection)) {
      continue;
    }

    const helpText =
      hasLanguageSwitch(layout) && collection !== "rsac_pages"
        ? `First choose English or Hindi below — only that language's boxes stay open for editing. ${layout.help}`
        : layout.help;
    await ensureEditorField(collection, "editor_help", {
      interface: "presentation-notice",
      special: ["alias", "no-data"],
      options: {
        color: "info",
        icon: "edit_note",
        text: helpText,
      },
      sort: 1,
      width: "full",
    });

    for (const [index, [field, label, icon, start]] of layout.groups.entries()) {
      await ensureEditorField(collection, field, {
        interface: "group-detail",
        special: ["alias", "no-data", "group"],
        options: {
          start,
          headerIcon: icon,
          headerColor: "var(--theme--primary)",
        },
        sort: (index + 1) * 10,
        width: "full",
        translations: [
          {
            language: "en-US",
            translation: label,
          },
        ],
      });
    }
  }

  const systemFieldNames = new Set([
    "id",
    "date_created",
    "date_updated",
    "user_created",
    "user_updated",
  ]);

  for (const field of knownFields) {
    if (
      !field.collection.startsWith("rsac_") ||
      !systemFieldNames.has(field.field)
    ) {
      continue;
    }

    await request(`/fields/${field.collection}/${field.field}`, {
      method: "PATCH",
      body: {
        meta: {
          hidden: true,
          readonly: true,
        },
      },
    });
  }

  for (const [collection, fields] of Object.entries(studioFieldOrder)) {
    if (!knownNames.has(collection)) {
      continue;
    }

    for (const [index, field] of fields.entries()) {
      const key = `${collection}.${field}`;

      if (!knownFieldKeys.has(key)) {
        continue;
      }

      const meta = {
        sort: index + 1,
        width: fullWidthFields.has(key) ? "full" : "half",
      };

      if (fieldNotes[key]) {
        meta.note = fieldNotes[key];
      }

      if (multilineFields.has(key)) {
        meta.interface = "input-multiline";
      }

      await request(`/fields/${collection}/${field}`, {
        method: "PATCH",
        body: { meta },
      });
    }
  }

  for (const [collection, fields] of Object.entries(jsonFields)) {
    if (!knownNames.has(collection)) {
      continue;
    }

    for (const field of fields) {
      const key = `${collection}.${field}`;
      const hideFromEditors =
        field === "translations" || collection === "rsac_site_settings";

      const repeaters = {
        "rsac_contact.contacts": [
          ["role", "Role / office"],
          ["information", "Information"],
          ["name", "Name"],
          ["detail", "Phone / details"],
        ],
        "rsac_contact.contacts_hi": [
          ["role", "पद / कार्यालय"],
          ["information", "जानकारी"],
          ["name", "नाम"],
          ["detail", "फोन / विवरण"],
        ],
        "rsac_pages.content_fields": [
          ["key", "System text key", "input", true, true],
          ["label", "Section (fixed)", "input", true, false, "The website section this text belongs to. It is set automatically and cannot be edited. To rename a section tab, change the English text on that section's own row instead."],
          ["value", "English text", "input-multiline", false, false],
        ],
        "rsac_pages.content_fields_hi": [
          ["key", "System text key", "input", true, true],
          ["label", "अनुभाग (तय)", "input", true, false, "यह पाठ वेबसाइट के जिस अनुभाग में है उसका नाम। यह अपने आप तय होता है और बदला नहीं जा सकता। टैब का नाम बदलने के लिए उस अनुभाग की अपनी पंक्ति का हिंदी पाठ बदलें।"],
          ["value", "हिंदी पाठ (Hindi text)", "input-multiline", false, false],
        ],
        "rsac_profiles.details": [
          ["label", "Label"],
          ["value", "Value"],
        ],
        "rsac_profiles.details_hi": [
          ["label", "लेबल"],
          ["value", "विवरण"],
        ],
        "rsac_policies.sections": [
          ["heading", "Heading"],
          ["body", "Body"],
        ],
        "rsac_policies.sections_hi": [
          ["heading", "शीर्षक"],
          ["body", "विवरण"],
        ],
        "rsac_public_info.sections": [
          ["heading", "Heading"],
          ["body", "Body"],
        ],
        "rsac_public_info.sections_hi": [
          ["heading", "शीर्षक"],
          ["body", "विवरण"],
        ],
        "rsac_public_info.links": [
          ["label", "Link label"],
          ["path", "Website path"],
          ["url", "External URL"],
          ["description", "Description"],
        ],
        "rsac_public_info.links_hi": [
          ["label", "लिंक नाम"],
          ["path", "वेबसाइट पथ"],
          ["url", "बाहरी यूआरएल"],
          ["description", "विवरण"],
        ],
        "rsac_menu.links": [
          ["label", "Label"],
          ["path", "Website path"],
          ["description", "Description"],
        ],
        "rsac_menu.links_hi": [
          ["label", "लिंक नाम"],
          ["path", "वेबसाइट पथ"],
          ["description", "विवरण"],
        ],
      };
      const repeater = repeaters[key];
      const meta = hideFromEditors
        ? {
            hidden: true,
            interface: "input-code",
            options: { language: "json", lineNumber: true },
            note: "Legacy compatibility data. Edit the normal English/Hindi fields instead.",
          }
        : ["rsac_divisions.highlights", "rsac_divisions.highlights_hi"].includes(key)
          ? {
              interface: "tags",
              options: { placeholder: "Type one highlight, then press Enter" },
              note: "Add each highlight as a separate tag.",
            }
          : repeater
            ? (() => {
                const isPageText = key.startsWith("rsac_pages.content_fields");
                const leafFields = repeater.map(([
                  childField,
                  name,
                  configuredInterface,
                  readonly = false,
                  hidden = false,
                  note = undefined,
                ]) => ({
                  field: childField,
                  name,
                  type: "string",
                  meta: {
                    interface:
                      configuredInterface || (childField === "body"
                        ? "input-multiline"
                        : childField === "value" || childField === "description"
                          ? "input-multiline"
                          : "input"),
                    readonly,
                    hidden,
                    width: "full",
                    ...(note ? { note } : {}),
                  },
                }));
                // Page text is edited as a nested tree: each heading is a parent
                // row that expands to the text inside it (`children`). Child
                // rows differ from section rows: their name is editable (it is
                // only the label shown in this list) and new rows added with
                // "Add item" are appended to that section on the website.
                const childFields = leafFields.map((leaf) =>
                  leaf.field === "label"
                    ? {
                        ...leaf,
                        meta: {
                          ...leaf.meta,
                          readonly: false,
                          note: key.endsWith("_hi")
                            ? "इस सूची में दिखने वाला छोटा नाम (वैकल्पिक)। वेबसाइट पर नीचे का पाठ ही दिखता है।"
                            : "Short name shown in this editor list (optional). The website shows the text field below.",
                        },
                      }
                    : leaf
                );
                const listFields = isPageText
                  ? [
                      ...leafFields,
                      {
                        field: "children",
                        name: "Items in this section",
                        type: "json",
                        meta: {
                          interface: "list",
                          width: "full",
                          options: {
                            // Show the actual text of each row so editors
                            // recognise items at a glance (the internal label is
                            // a derived slot name and reads confusingly).
                            template: "{{value}}",
                            addLabel: "Add item",
                            fields: childFields,
                          },
                        },
                      },
                    ]
                  : leafFields;
                return {
                  interface: "list",
                  options: {
                    ...(isPageText ? { template: "{{label}}", addLabel: "Add item" } : {}),
                    fields: listFields,
                  },
                  note: isPageText
                    ? "Each section expands to the text inside it. Open a row, change only its text, and Save. Do not delete rows; the website keeps the page layout fixed."
                    : "Use Add Item and the labelled form fields. No JSON is required.",
                };
              })()
            : {
                interface: "list",
                note: "Use the form controls to add or reorder entries.",
              };

      await request(`/fields/${collection}/${field}`, {
        method: "PATCH",
        body: {
          meta: {
            width: "full",
            ...meta,
          },
        },
      });
    }
  }

  await request("/fields/rsac_pages/html", {
    method: "PATCH",
    body: {
      meta: {
        interface: "input-code",
        hidden: true,
        readonly: true,
        width: "full",
        note: "Locked layout template. Edit English Page Text instead.",
        translations: [
          {
            language: "en-US",
            translation: fieldLabelOverrides["rsac_pages.html"],
          },
        ],
      },
    },
  });

  await request("/fields/rsac_pages/html_hi", {
    method: "PATCH",
    body: {
      meta: {
        interface: "input-code",
        hidden: true,
        readonly: true,
        width: "full",
        note: "Locked layout template. Edit Hindi Page Text instead.",
        translations: [
          {
            language: "en-US",
            translation: fieldLabelOverrides["rsac_pages.html_hi"],
          },
        ],
      },
    },
  });

  // Every bilingual collection carries the same language switch as Website
  // Pages: pick English or Hindi and only that language's group stays open.
  for (const [collection, layout] of Object.entries(editorLayouts)) {
    if (!hasLanguageSwitch(layout)) continue;

    await request(`/fields/${collection}/edit_language`, {
      method: "PATCH",
      body: {
        meta: {
          interface: "select-radio",
          display: "labels",
          hidden: false,
          readonly: false,
          group: null,
          sort: 2,
          width: "full",
          options: {
            choices: [
              { text: "English", value: "en" },
              { text: "Hindi / हिन्दी", value: "hi" },
            ],
          },
          note: "Choose one language. Only its editable fields will be shown below.",
          translations: [
            {
              language: "en-US",
              translation: getFieldLabel(collection, "edit_language", new Set()),
            },
          ],
        },
      },
    });
  }

  // Card look pickers for section index grids. Icon values must stay in sync
  // with officialCardIconChoices in src/pages/OfficialContentPage.jsx.
  await request("/fields/rsac_pages/card_icon", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        display: "labels",
        width: "full",
        options: {
          allowNone: true,
          choices: [
            { text: "Plant / Agriculture", value: "sprout" },
            { text: "Computer / Technology", value: "cpu" },
            { text: "Mountain / Earth", value: "mountain" },
            { text: "Trees / Forest", value: "trees" },
            { text: "Water Drops / Groundwater", value: "droplets" },
            { text: "Database / Data Bank", value: "database" },
            { text: "Map / Land Use", value: "map" },
            { text: "Waves / Surface Water", value: "waves" },
            { text: "Graduation Cap / Training", value: "graduation-cap" },
            { text: "Building / Facility", value: "landmark" },
            { text: "Person / People", value: "user-round" },
            { text: "Satellite / Remote Sensing", value: "satellite" },
            { text: "Document / Report", value: "file-text" },
          ],
        },
        note: "Icon shown on this page's card in the section grid (both languages). Leave empty for the automatic icon.",
        translations: [
          {
            language: "en-US",
            translation: fieldLabelOverrides["rsac_pages.card_icon"],
          },
        ],
      },
    },
  });

  for (const [colorField, colorNote] of [
    [
      "card_color",
      "Main card colour (both languages). Leave empty for the automatic colour.",
    ],
    [
      "card_color_2",
      "Second card colour used in the gradient and dots. Leave empty for the automatic colour.",
    ],
  ]) {
    await request(`/fields/rsac_pages/${colorField}`, {
      method: "PATCH",
      body: {
        meta: {
          interface: "select-color",
          width: "half",
          options: { opacity: false },
          note: colorNote,
          translations: [
            {
              language: "en-US",
              translation: fieldLabelOverrides[`rsac_pages.${colorField}`],
            },
          ],
        },
      },
    });
  }

  // key/section/label are NOT NULL in the schema, so they must be typable on a
  // brand-new row or the create form can never save; once the row exists they
  // lock, because the website looks text up by Content Key. Studio's create
  // form fills id with the column default — the literal string
  // "nextval('…_id_seq'::regclass)" — while a saved row has a numeric id, so
  // matching on that string is the only condition rule that separates the two
  // forms (null/nnull rules cannot: the id is never null in either form).
  const unlockWhileCreating = (field) => [
    {
      name: "Unlocked while creating a new row",
      rule: { id: { _contains: "nextval" } },
      readonly: false,
      hidden: false,
      required: field !== "value_type",
    },
  ];
  await request(`/fields/rsac_content_blocks/help_text`, {
    method: "PATCH",
    body: { meta: { readonly: true, width: "full", conditions: null } },
  });
  for (const field of ["key", "label", "section", "value_type"]) {
    await request(`/fields/rsac_content_blocks/${field}`, {
      method: "PATCH",
      body: {
        meta: {
          readonly: true,
          width: "half",
          conditions: unlockWhileCreating(field),
        },
      },
    });
  }

  await request("/fields/rsac_brand_logos/placement", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Primary RSAC identity (left)", value: "primary" },
            { text: "Supporting emblem / logo (right)", value: "supporting" },
          ],
        },
      },
    },
  });

  await request("/fields/rsac_organisation_roles/group_key", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "General Body", value: "general_body" },
            { text: "Governing Body", value: "governing_body" },
            { text: "Executive", value: "executive" },
            { text: "Scientific Division", value: "division" },
            { text: "Support Function", value: "support" },
          ],
        },
      },
    },
  });

  await request("/fields/rsac_organisation_roles/slot", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          allowOther: true,
          choices: [
            { text: "Chief Minister / President", value: "president" },
            { text: "Minister / Vice President", value: "vice_president" },
            { text: "Chairman", value: "chairman" },
            { text: "Director", value: "director" },
            { text: "Division", value: "division" },
            { text: "Support", value: "support" },
          ],
        },
      },
    },
  });

  const statusCollections = Object.entries(collections)
    .filter(([collection, meta]) => knownNames.has(collection) && meta.archive_field)
    .map(([collection]) => collection);

  for (const collection of statusCollections) {
    await request(`/fields/${collection}/status`, {
      method: "PATCH",
      body: {
        meta: {
          interface: "select-dropdown",
          options: {
            choices: [
              { text: "Draft", value: "draft" },
              { text: "Under Review", value: "under_review" },
              { text: "Published", value: "published" },
              { text: "Archived", value: "archived" },
            ],
          },
          note: "Only Published records appear on the public website.",
          width: "half",
        },
      },
    });

    await request(`/fields/${collection}/sort`, {
      method: "PATCH",
      body: {
        meta: {
          note: "Lower numbers appear first unless the page uses date ordering.",
          width: "half",
        },
      },
    });
  }

  await request("/fields/rsac_geoportals/icon_key", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Network", value: "network" },
            { text: "Education", value: "education" },
            { text: "Globe", value: "globe" },
            { text: "Database", value: "database" },
            { text: "Radio tower", value: "radio" },
            { text: "Map", value: "map" },
          ],
        },
        width: "half",
      },
    },
  });

  await request("/fields/rsac_quick_links/icon_key", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Photo gallery", value: "images" },
            { text: "Help / FAQ", value: "help" },
            { text: "Notices", value: "notices" },
            { text: "Flood", value: "flood" },
            { text: "Map", value: "map" },
            { text: "Document", value: "document" },
            { text: "Shield / RTI", value: "shield" },
            { text: "Phone / Contact", value: "phone" },
          ],
        },
        width: "half",
      },
    },
  });

  await request("/fields/rsac_quick_links/accent", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-color",
        note: "Card accent colour. Keep sufficient contrast against white.",
        width: "half",
      },
    },
  });

  await request("/fields/rsac_home_feature_tabs/icon_key", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        display: "labels",
        options: {
          choices: [
            { text: "Objective / Building", value: "building" },
            { text: "Implementation / Clipboard", value: "clipboard" },
            { text: "Approach / Route", value: "route" },
            { text: "Sphere / Activity", value: "activity" },
            { text: "Mobile Apps / Phone", value: "phone" },
            { text: "Database", value: "database" },
            { text: "Water / Droplets", value: "droplets" },
            { text: "Agriculture / Sprout", value: "sprout" },
            { text: "Forest / Trees", value: "trees" },
            { text: "Earth / Mountain", value: "mountain" },
            { text: "Urban / Building", value: "building2" },
            { text: "Disaster / Shield", value: "shield" },
            { text: "Map", value: "map" },
          ],
        },
        width: "half",
      },
    },
  });

  await request("/fields/rsac_profiles/object_position", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          allowOther: true,
          choices: [
            { text: "Centre", value: "center" },
            { text: "Face slightly higher", value: "center 25%" },
            { text: "Face near top", value: "center top" },
            { text: "Face slightly lower", value: "center 65%" },
          ],
        },
        note: "Choose the portrait alignment that keeps the face clearly visible.",
        width: "half",
      },
    },
  });

  await request("/fields/rsac_organisation_roles/object_position", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          allowOther: true,
          choices: [
            { text: "Centre", value: "center" },
            { text: "Face slightly higher", value: "center 25%" },
            { text: "Face near top", value: "center top" },
            { text: "Face slightly lower", value: "center 65%" },
          ],
        },
        note: "Choose the alignment that keeps the face fully visible.",
        width: "half",
      },
    },
  });

  await request("/fields/rsac_profiles/duration", {
    method: "PATCH",
    body: {
      meta: {
        interface: "input",
        note: "Approved tenure or service duration. Use 'To be updated' until dates are confirmed.",
        width: "half",
      },
    },
  });

  await request("/fields/rsac_profiles/profile_type", {
    method: "PATCH",
    body: {
      meta: {
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Homepage Official", value: "official" },
            { text: "Leadership Page", value: "leadership" },
            { text: "Scientist Page", value: "scientist" },
            { text: "Former Scientist", value: "former" },
            { text: "Technical Staff", value: "technical" },
            { text: "Administration", value: "administration" },
          ],
        },
        note: "Controls which public page shows this record. Do not change it while editing a person's name or designation.",
        width: "half",
      },
    },
  });

  await request("/fields/rsac_profiles/name", {
    method: "PATCH",
    body: {
      meta: {
        interface: "input",
        note: "Use the approved full name and title. Example: Shri Anil Kumar is leadership; Dr. Anil Kumar is scientist E-294.",
        width: "half",
      },
    },
  });

  await request("/fields/rsac_profiles/employee_id", {
    method: "PATCH",
    body: {
      meta: {
        interface: "input",
        note: "Employee ID distinguishes staff with similar names. Dr. Anil Kumar is E-294.",
        width: "half",
      },
    },
  });

  await request("/fields/rsac_hero_videos/poster", {
    method: "PATCH",
    body: {
      meta: {
        note: fieldNotes["rsac_hero_videos.poster"],
      },
    },
  });

  await request("/fields/rsac_hero_videos/video", {
    method: "PATCH",
    body: {
      meta: {
        note: fieldNotes["rsac_hero_videos.video"],
      },
    },
  });

  await request("/fields/rsac_site_settings/organisation_chart_file", {
    method: "PATCH",
    body: {
      meta: {
        note: fieldNotes["rsac_site_settings.organisation_chart_file"],
      },
    },
  });

  const relations = await request("/relations?limit=-1");
  const relationKeys = new Set(
    relations.map(
      (relation) =>
        `${relation.meta?.many_collection || relation.collection}:${
          relation.meta?.many_field || relation.field
        }`
    )
  );

  for (const [collection, field, kind] of fileFields) {
    const relationKey = `${collection}:${field}`;

    if (!relationKeys.has(relationKey)) {
    await request("/relations", {
      method: "POST",
      body: {
        collection,
        field,
        related_collection: "directus_files",
        schema: {
          on_delete: "SET NULL",
        },
      },
    });
    }

    await request(`/fields/${collection}/${field}`, {
      method: "PATCH",
      body: {
        meta: {
          special: ["file"],
          interface: kind === "image" ? "file-image" : "file",
          options: { folder: websiteMediaFolderId },
          display: kind === "image" ? "image" : "file",
          width: "half",
        },
      },
    });
  }

  // Page photos: connect every photo row to its Website Page and show the list
  // inside the page editor ("Photos on This Page"). Create-once only: PATCHing
  // an existing relation makes Directus try to ALTER the column type, which
  // crashes the server, so an already-registered relation is left untouched.
  if (!relationKeys.has("rsac_page_images:page")) {
    try {
      await request("/relations", {
        method: "POST",
        body: {
          collection: "rsac_page_images",
          field: "page",
          related_collection: "rsac_pages",
          meta: { one_field: "page_photos", sort_field: "sort" },
          schema: { on_delete: "CASCADE" },
        },
      });
    } catch (error) {
      console.warn(
        `Could not register the page-photos relation automatically: ${error.message}`
      );
    }
  }
  await request("/fields/rsac_page_images/page", {
    method: "PATCH",
    body: {
      meta: {
        special: ["m2o"],
        interface: "select-dropdown-m2o",
        options: { template: "{{title}}" },
        display: "related-values",
        display_options: { template: "{{title}}" },
        readonly: true,
        width: "half",
      },
    },
  });
  await request("/fields/rsac_page_images/label", {
    method: "PATCH",
    body: {
      meta: {
        readonly: true,
        width: "half",
        note: "Filled automatically with the tab or section where the photo appears.",
      },
    },
  });
  await ensureEditorField("rsac_pages", "page_photos", {
    special: ["o2m"],
    interface: "list-o2m",
    options: {
      layout: "list",
      template: "{{label}}",
      enableCreate: false,
      enableSelect: false,
      enableLink: true,
    },
    display: "related-values",
    display_options: { template: "{{label}}" },
    width: "full",
    translations: [{ language: "en-US", translation: "Photos on This Page" }],
    note: "Open a photo row and upload its New Photo to replace it on the website. A row with no New Photo keeps the current photo.",
  });

  for (const field of ["brand_logo", "government_logo", "organisation_chart_file"]) {
    await request(`/fields/rsac_site_settings/${field}`, {
      method: "PATCH",
      body: {
        meta: {
          hidden: true,
          note: "Legacy compatibility field. Use Brand Logos or Organisation Chart Roles instead.",
        },
      },
    });
  }

  const fieldsByCollection = new Map();
  for (const field of knownFields) {
    if (!fieldsByCollection.has(field.collection)) {
      fieldsByCollection.set(field.collection, new Set());
    }
    fieldsByCollection.get(field.collection).add(field.field);
  }

  const simpleNotes = {
    "rsac_pages.html":
      "Locked layout template. Edit English Page Text instead.",
    "rsac_pages.html_hi":
      "Locked layout template. Edit Hindi Page Text instead.",
    "rsac_pages.slug":
      "The final part of this page's website address. Change only when links are also being updated.",
    "rsac_pages.section_key":
      "Choose the website section where this page belongs.",
    "rsac_profiles.object_position":
      "Choose how the portrait is centred inside its frame.",
    "rsac_sections.key":
      "Permanent section name used by the website. Do not change after publishing.",
    "rsac_sections.route":
      "Website address beginning with /, for example /about-us.",
  };

  for (const [collection, layout] of Object.entries(editorLayouts)) {
    if (!knownNames.has(collection)) {
      continue;
    }

    const collectionFieldNames = fieldsByCollection.get(collection) || new Set();
    const groupedFields = new Set();
    const visibleFields = new Set([
      ...(layout.visible || []),
      ...(hasLanguageSwitch(layout) ? ["edit_language"] : []),
    ]);
    const hiddenFields = new Set(["translations", ...(layout.hidden || [])]);
    const activeEditorFields = new Set([
      "editor_help",
      ...layout.groups.map(([groupField]) => groupField),
    ]);

    for (const [groupIndex, [groupField, , , , fields]] of layout.groups.entries()) {
      for (const [fieldIndex, field] of fields.entries()) {
        const key = `${collection}.${field}`;
        if (!knownFieldKeys.has(key)) {
          continue;
        }

        groupedFields.add(field);
        await request(`/fields/${collection}/${field}`, {
          method: "PATCH",
          body: {
            meta: {
              group: groupField,
              hidden: false,
              sort: fieldIndex + 1,
              translations: [
                {
                  language: "en-US",
                  translation: getFieldLabel(
                    collection,
                    field,
                    collectionFieldNames
                  ),
                },
              ],
              ...(simpleNotes[key] ? { note: simpleNotes[key] } : {}),
            },
          },
        });
      }
    }

    for (const field of studioFieldOrder[collection] || []) {
      if (!groupedFields.has(field) && !visibleFields.has(field)) {
        hiddenFields.add(field);
      }
    }

    for (const [index, field] of [...visibleFields].entries()) {
      const key = `${collection}.${field}`;
      if (!knownFieldKeys.has(key)) {
        continue;
      }

      await request(`/fields/${collection}/${field}`, {
        method: "PATCH",
        body: {
          meta: {
            group: null,
            hidden: false,
            sort: index + 2,
            translations: [
              {
                language: "en-US",
                translation: getFieldLabel(
                  collection,
                  field,
                  collectionFieldNames
                ),
              },
            ],
          },
        },
      });
    }

    for (const field of collectionFieldNames) {
      if (field.startsWith("editor_") && !activeEditorFields.has(field)) {
        hiddenFields.add(field);
      }
    }

    for (const field of hiddenFields) {
      const key = `${collection}.${field}`;
      if (!knownFieldKeys.has(key)) continue;

      await request(`/fields/${collection}/${field}`, {
        method: "PATCH",
        body: {
          meta: {
            group: null,
            hidden: true,
          },
        },
      });
    }

    if (hasLanguageSwitch(layout)) {
      const languageGroups = [
        ["editor_english", "hi"],
        ["editor_hindi", "en"],
      ];

      for (const [groupField, hiddenLanguage] of languageGroups) {
        const groupFields = layout.groups.find(
          ([field]) => field === groupField
        )?.[4] || [];
        const conditions = [
          {
            name: `Hide while editing ${hiddenLanguage === "hi" ? "Hindi" : "English"}`,
            rule: {
              _and: [{ edit_language: { _eq: hiddenLanguage } }],
            },
            hidden: true,
            readonly: false,
            required: false,
            options: {},
          },
        ];

        for (const field of [groupField, ...groupFields]) {
          if (!knownFieldKeys.has(`${collection}.${field}`)) {
            continue;
          }

          await request(`/fields/${collection}/${field}`, {
            method: "PATCH",
            body: { meta: { conditions } },
          });
        }
      }
    }
  }
};

const configurePublicPermissions = async () => {
  const folderId = await ensurePublicFolder();
  const knownCollections = await request("/collections?limit=-1");
  const knownNames = new Set(knownCollections.map((item) => item.collection));
  const existing = await request(
    `/permissions?limit=-1&filter[action][_eq]=read&filter[policy][_eq]=${publicPolicyId}`
  );
  const publicPermissions = new Map(
    existing.map((permission) => [permission.collection, permission])
  );

  const readableCollections = [
    ...Object.keys(collections).filter((collection) => knownNames.has(collection)),
    "directus_files",
  ];

  for (const collection of readableCollections) {
    const hasStatus = Boolean(collections[collection]?.archive_field);
    const body = {
      collection,
      action: "read",
      policy: publicPolicyId,
      permissions: strictPublicPermissions
        ? collection === "directus_files"
          ? { folder: { _eq: folderId } }
          : hasStatus
            ? { status: { _eq: "published" } }
            : {}
        : {},
      validation: {},
      presets: {},
      fields: strictPublicPermissions ? publicFields[collection] : ["*"],
    };
    const current = publicPermissions.get(collection);

    if (current) {
      await request(`/permissions/${current.id}`, {
        method: "PATCH",
        body,
      });
    } else {
      await request("/permissions", {
        method: "POST",
        body,
      });
    }
  }

  const existingVisitCreatePermissions = await request(
    `/permissions?limit=-1&filter[action][_eq]=create&filter[policy][_eq]=${publicPolicyId}&filter[collection][_eq]=rsac_site_visits`
  );

  // Visit writes go through the bundled `/rsac-visit-counter` endpoint. It
  // inserts only the fixed website source and works without paid custom-rule
  // entitlements, so anonymous collection-level create access is unnecessary.
  for (const permission of existingVisitCreatePermissions) {
    await request(`/permissions/${permission.id}`, { method: "DELETE" });
  }

  if (!strictPublicPermissions) {
    console.warn(
      "Directus strict public permission rules are disabled. The frontend still requests published records only, but production should activate the required Directus entitlement and set DIRECTUS_STRICT_PUBLIC_PERMISSIONS=true."
    );
  }
};

const clean = (value) =>
  JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "function" ? undefined : item
    )
  );

const refreshPageTextLabels = (rows, html) => {
  const currentRows = Array.isArray(rows) ? rows : [];
  if (!currentRows.length || !html) return currentRows;

  const labelsByKey = new Map(
    extractPageTextFields(html).map((field) => [field.key, field.label])
  );

  return currentRows.map((row) => {
    const label = labelsByKey.get(row?.key);
    return label && label !== row.label ? { ...row, label } : row;
  });
};

const buildQuery = (filters) => {
  const parameters = new URLSearchParams({ limit: "1" });

  Object.entries(filters).forEach(([field, value]) => {
    parameters.set(`filter[${field}][_eq]`, String(value));
  });

  return parameters.toString();
};

const findItem = async (collection, filters) => {
  const items = await request(
    `/items/${collection}?${buildQuery(filters)}`
  );
  return items[0] || null;
};

const upsert = async (collection, filters, data, counters) => {
  const existing = await findItem(collection, filters);

  if (existing && !force) {
    counters.skipped += 1;
    return existing;
  }

  const saved = await request(
    existing ? `/items/${collection}/${existing.id}` : `/items/${collection}`,
    {
      method: existing ? "PATCH" : "POST",
      body: data,
    }
  );
  counters[existing ? "updated" : "created"] += 1;
  return saved;
};

const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

const resolveLocalAsset = (assetUrl) => {
  if (!assetUrl || /^https?:/i.test(assetUrl)) {
    return null;
  }

  const normalized = String(assetUrl).split("?")[0].replace(/\\/g, "/");
  const relative = normalized.startsWith("/src/")
    ? normalized.slice(1)
    : normalized.startsWith("/")
      ? join("public", normalized.slice(1))
      : normalized;
  const absolute = resolve(repoRoot, relative);
  return existsSync(absolute) ? absolute : null;
};

const uploadCache = new Map();
const directusAssetHashCache = new Map();

const hashBytes = (value) =>
  createHash("sha256").update(value).digest("hex");

const getDirectusAssetHash = async (fileId) => {
  if (directusAssetHashCache.has(fileId)) {
    return directusAssetHashCache.get(fileId);
  }

  const response = await fetch(`${directusUrl}/assets/${fileId}`, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  });

  if (!response.ok) {
    return "";
  }

  const hash = hashBytes(Buffer.from(await response.arrayBuffer()));
  directusAssetHashCache.set(fileId, hash);
  return hash;
};

const uploadAsset = async (assetUrl, title) => {
  const path = resolveLocalAsset(assetUrl);

  if (!path) {
    return null;
  }

  if (uploadCache.has(path)) {
    return uploadCache.get(path);
  }

  const filename = basename(path);
  const folderId = await ensurePublicFolder();
  const contents = readFileSync(path);
  const sourceHash = hashBytes(contents);
  const sameNameFiles = await request(
    `/files?limit=-1&filter[filename_download][_eq]=${encodeURIComponent(
      filename
    )}&filter[folder][_eq]=${encodeURIComponent(folderId)}`
  );
  const sameSizeFiles = await request(
    `/files?limit=-1&filter[filesize][_eq]=${contents.length}&filter[folder][_eq]=${encodeURIComponent(
      folderId
    )}`
  );
  const candidates = [
    ...new Map(
      [...sameNameFiles, ...sameSizeFiles].map((file) => [file.id, file])
    ).values(),
  ];
  let existing = null;

  for (const candidate of candidates) {
    if ((await getDirectusAssetHash(candidate.id)) === sourceHash) {
      existing = candidate;
      break;
    }
  }

  if (existing) {
    uploadCache.set(path, existing.id);
    return existing.id;
  }

  const extension = extname(path).toLowerCase();
  const form = new FormData();
  form.append("title", title || filename);
  form.append("folder", folderId);
  form.append(
    "file",
    new Blob([contents], {
      type: mimeTypes[extension] || "application/octet-stream",
    }),
    filename
  );
  const uploaded = await request("/files", {
    method: "POST",
    body: form,
    form: true,
  });
  uploadCache.set(path, uploaded.id);
  return uploaded.id;
};

const loadDefaults = async () => {
  const vite = await createServer({
    root: repoRoot,
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true },
  });

  try {
    const [
      defaults,
      officialContent,
      officialHindiContent,
      hindiContent,
      visionMission,
    ] = await Promise.all([
      vite.ssrLoadModule("/src/data/defaultData.js"),
      vite.ssrLoadModule("/src/data/rsacOfficialContent.generated.js"),
      vite.ssrLoadModule("/src/data/rsacOfficialContent.hi.generated.js"),
      vite.ssrLoadModule("/src/data/hindiContent.js"),
      vite.ssrLoadModule("/src/pages/about/VisionMission.jsx"),
    ]);

    return {
      ...defaults,
      ...officialContent,
      rsacOfficialSectionsHi: officialHindiContent.rsacOfficialSections,
      siteSettingsHi: hindiContent.localizeSiteSettingsFallback(
        defaults.siteSettings,
        "hi"
      ),
      visionMissionContent: visionMission.visionMissionContent,
    };
  } finally {
    await vite.close();
  }
};

const buildSettingsPayload = async (defaults) => {
  const settings = clean(defaults.siteSettings);
  const brandLogo = await uploadAsset(
    settings.branding.logo,
    "RSAC-UP logo"
  );
  const governmentLogo = await uploadAsset(
    settings.branding.governmentLogo,
    "Government of Uttar Pradesh emblem"
  );
  const primeMinisterPhoto = await uploadAsset(
    settings.hero.leaders?.[0]?.image,
    settings.hero.leaders?.[0]?.name
  );
  const chiefMinisterPhoto = await uploadAsset(
    settings.hero.leaders?.[1]?.image,
    settings.hero.leaders?.[1]?.name
  );
  const organisationChartFile = await uploadAsset(
    settings.organisationChart.image,
    "RSAC-UP organisational chart"
  );

  delete settings.branding.logo;
  delete settings.branding.governmentLogo;
  settings.hero.leaders = (settings.hero.leaders || []).map((leader) => {
    const nextLeader = { ...leader };
    delete nextLeader.image;
    return nextLeader;
  });
  delete settings.organisationChart.image;

  return {
    appearance: settings.appearance,
    layout: settings.layout,
    branding: settings.branding,
    hero: settings.hero,
    mission_pulse: settings.missionPulse,
    home_sections: settings.homeSections,
    about: settings.about,
    location: settings.location,
    footer: settings.footer,
    organisation_chart: settings.organisationChart,
    accessibility: settings.accessibility,
    page_content: settings.pageContent,
    impact_stats: settings.impactStats,
    services: settings.services,
    applications: settings.applications,
    flood_section: clean(defaults.floodSection),
    search: settings.search,
    ui: settings.ui,
    cards: settings.cards,
    brand_logo: brandLogo,
    government_logo: governmentLogo,
    prime_minister_photo: primeMinisterPhoto,
    chief_minister_photo: chiefMinisterPhoto,
    organisation_chart_file: organisationChartFile,
  };
};

const CONTENT_BLOCK_SKIPPED_ROOTS = new Set(["appearance", "layout"]);
const CONTENT_BLOCK_SKIPPED_PATHS = new Set([
  "branding.logo",
  "branding.governmentLogo",
  "organisationChart.image",
]);

const humanizeContentKey = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\d+$/, (number) => `Item ${Number(number) + 1}`)
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const flattenContentBlocks = (value, translatedValue, path = [], output = []) => {
  const key = path.join(".");
  const root = path[0];

  if (
    CONTENT_BLOCK_SKIPPED_ROOTS.has(root) ||
    CONTENT_BLOCK_SKIPPED_PATHS.has(key) ||
    key.startsWith("organisationChart.tiers") ||
    key.startsWith("homeSections.featureTabs") ||
    /\.image$/.test(key)
  ) {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      flattenContentBlocks(item, translatedValue?.[index], [...path, index], output)
    );
    return output;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) =>
      flattenContentBlocks(
        childValue,
        translatedValue?.[childKey],
        [...path, childKey],
        output
      )
    );
    return output;
  }

  if (!["string", "number", "boolean"].includes(typeof value) || !path.length) {
    return output;
  }

  const labelParts = path.slice(-2).map(humanizeContentKey);
  const stringValue = String(value);
  const valueType =
    typeof value === "number"
      ? "number"
      : typeof value === "boolean"
        ? "boolean"
        : /^(?:https?:\/\/|\/)/i.test(stringValue)
          ? "url"
          : stringValue.length > 100
            ? "multiline"
            : "text";

  output.push({
    key,
    section: humanizeContentKey(root),
    label: labelParts.join(" - "),
    value: stringValue,
    value_hi:
      typeof translatedValue === "string" && translatedValue !== stringValue
        ? translatedValue
        : "",
    value_type: valueType,
    help_text: `Website content path: ${key}`,
  });
  return output;
};

const buildOrganisationRoles = (settings) => {
  const tiers = settings.organisationChart?.tiers || {};
  const roles = [];
  const legacySupportRoles = {
    Administration:
      "Smt. Sweta Pal · Shri Daya Shankar — Administrative Officers",
    "Technical Secretary to Director":
      "Dr. A. Uniyal (Additional Charge)",
    Accounts:
      "Shri Ravi Prakash Singh — Account Officer (Additional Charge)",
  };
  const addPerson = (roleKey, groupKey, slot, title, person, sort) => {
    if (!person) return;
    roles.push({
      role_key: roleKey,
      group_key: groupKey,
      slot,
      title: title || person.post || person.role || "Position",
      name: person.name || "",
      role: person.role || "",
      post: person.post || "",
      photo_source: person.photo || "",
      status: "published",
      sort,
    });
  };

  addPerson(
    "general-body-president",
    "general_body",
    "president",
    tiers.generalBody?.badge,
    tiers.generalBody?.president,
    10
  );
  (tiers.generalBody?.members || []).forEach((person, index) =>
    addPerson(
      `general-body-vice-president-${index + 1}`,
      "general_body",
      "vice_president",
      tiers.generalBody?.badge,
      person,
      20 + index
    )
  );
  addPerson(
    "governing-body-chairman",
    "governing_body",
    "chairman",
    tiers.governingBody?.badge,
    tiers.governingBody?.chairman,
    40
  );
  addPerson(
    "executive-director",
    "executive",
    "director",
    tiers.executive?.badge,
    tiers.executive?.director,
    50
  );

  (tiers.divisions?.items || []).forEach((item, index) =>
    roles.push({
      role_key: `division-${index + 1}`,
      group_key: "division",
      slot: "division",
      title: item.title,
      name: item.head || "",
      role: item.designation || "",
      post: item.post || "",
      legacy_post: tiers.divisions?.badge || "Scientific Divisions",
      status: "published",
      sort: 100 + index,
    })
  );
  (tiers.support?.items || []).forEach((item, index) =>
    roles.push({
      role_key: `support-${index + 1}`,
      group_key: "support",
      slot: "support",
      title: item.title,
      name: item.head || "",
      role: item.designation || item.detail || "",
      post: "",
      legacy_role: item.detail || legacySupportRoles[item.title] || "",
      legacy_post: tiers.support?.badge || "Support Functions",
      status: "published",
      sort: 200 + index,
    })
  );

  return roles;
};

const editorGuideItems = [
  {
    key: "start-here",
    website_area: "Start here when you do not know where to edit",
    edit_collection: "Editing Map",
    where_to_click:
      "Open Start Here -> Editing Map. Search the website area name, then open the matching row.",
    english_fields:
      "This guide tells you which English fields to edit in the real collection.",
    hindi_fields:
      "This guide tells you which Hindi fields to edit. Hindi is typed manually; blank Hindi falls back to English.",
    media_fields:
      "Use the file or image picker mentioned in the guide row. Do not type file paths.",
    daily_steps:
      "1. Find the website area here. 2. Open the collection named in this row. 3. Edit visible fields only. 4. Save. 5. Set Status to Published when final. 6. Refresh the website.",
    common_mistakes:
      "Do not edit IDs, raw JSON, raw HTML, Content Key, Section fixed labels, or file paths.",
    public_effect:
      "This collection is a guide only. It does not directly change the public website.",
    status: "published",
    sort: 0,
  },
  {
    key: "homepage-hero-text",
    website_area: "Homepage hero text, hero buttons, banners, and shared labels",
    edit_collection: "Website Text Editor",
    where_to_click:
      "Open Homepage -> Website Text Editor. Search words like Hero, Remote Sensing, button, footer, or the visible text you want to change.",
    english_fields:
      "English Text",
    hindi_fields:
      "Hindi Text",
    media_fields:
      "Hero image/video is not edited here. Use Homepage Video for poster/video and Header Logos for logos.",
    daily_steps:
      "Open the row, change only English Text or Hindi Text, then Save. If the row is missing, ask a developer to add the supported content key.",
    common_mistakes:
      "Do not rename Content Key or create random keys. Unknown keys do not appear on the website.",
    public_effect:
      "Updates visible text on the homepage, footer, buttons, labels, and shared page copy.",
    status: "published",
    sort: 10,
  },
  {
    key: "homepage-video",
    website_area: "Homepage hero poster image and background video",
    edit_collection: "Homepage Video",
    where_to_click:
      "Open Homepage -> Homepage Video. Open the published row at the top.",
    english_fields:
      "Title",
    hindi_fields:
      "Hindi Title",
    media_fields:
      "Poster Image and Video File",
    daily_steps:
      "Upload a poster first. Video is optional. If Video is filled, it plays over the poster after loading. Save and keep Status Published.",
    common_mistakes:
      "Do not upload only in File Library. Attach the file inside this row. Clear Video if you want a static poster.",
    public_effect:
      "Changes the large visual background at the top of the homepage.",
    status: "published",
    sort: 20,
  },
  {
    key: "header-logos",
    website_area: "Header logos, RSAC logo, UP emblem, and future extra logos",
    edit_collection: "Header Logos",
    where_to_click:
      "Open Homepage -> Header Logos. Create or edit one row per logo.",
    english_fields:
      "Title, Image Description, Optional Website Link, Logo Position",
    hindi_fields:
      "Hindi Title and Hindi Image Description",
    media_fields:
      "Image",
    daily_steps:
      "Upload/select the logo, write accessible image text, choose Primary or Supporting placement, set Display Order, Publish, and Save.",
    common_mistakes:
      "Do not replace a shared file from File Library if only one logo should change. Upload/select the logo in the row.",
    public_effect:
      "Header layout adapts automatically when more logos are added.",
    status: "published",
    sort: 30,
  },
  {
    key: "homepage-leader-portraits",
    website_area: "Homepage Prime Minister and Chief Minister portraits",
    edit_collection: "Homepage Leaders",
    where_to_click:
      "Open Homepage -> Homepage Leaders. Replace Prime Minister Portrait or Chief Minister Portrait.",
    english_fields:
      "Portrait labels come from Website Text Editor unless a developer exposes a new profile row.",
    hindi_fields:
      "Hindi labels come from Website Text Editor.",
    media_fields:
      "Prime Minister Portrait, Chief Minister Portrait",
    daily_steps:
      "Use a clean portrait without a baked-in border. Upload/select the portrait and Save.",
    common_mistakes:
      "Do not upload a square image with a white box around the face. The website makes the circular crop itself.",
    public_effect:
      "Changes the two circular leader photos in the homepage hero.",
    status: "published",
    sort: 40,
  },
  {
    key: "organisation-chart",
    website_area: "Organisational chart names, designations, photos, and division heads",
    edit_collection: "Organisation Chart",
    where_to_click:
      "Open People and Organisation -> Organisation Chart. Search the role or person's name.",
    english_fields:
      "Name, Designation, Additional Designation",
    hindi_fields:
      "Hindi Name, Hindi Designation, Hindi Additional Designation",
    media_fields:
      "Photo and Photo Alignment",
    daily_steps:
      "Change name/designation/photo only. Keep Organisation Level and Position in Level unchanged unless a developer confirms.",
    common_mistakes:
      "Do not change Role Key, Organisation Level, Slot, or Sort unless the chart structure is intentionally changing.",
    public_effect:
      "Updates the dynamic organisational chart while keeping its structure and arrows fixed.",
    status: "published",
    sort: 50,
  },
  {
    key: "navigation-menu",
    website_area: "Hamburger menu domains, menu cards, and navigation labels",
    edit_collection: "Main Menu",
    where_to_click:
      "Open Pages and Navigation -> Main Menu. Each row is one menu domain.",
    english_fields:
      "English Menu: Title, Description, Menu Links",
    hindi_fields:
      "Hindi Menu: Hindi Title, Hindi Description, Hindi Menu Links",
    media_fields:
      "No media fields. Menu icons are controlled by supported website styling.",
    daily_steps:
      "Edit labels and paths, reorder rows with Display Order, Publish, and Save.",
    common_mistakes:
      "Do not paste external URLs into Website path fields. Use internal paths starting with / for site pages.",
    public_effect:
      "Changes the fullscreen hamburger menu and navigation destinations.",
    status: "published",
    sort: 60,
  },
  {
    key: "inner-pages",
    website_area: "About, division, facility, academic, and other inner page text",
    edit_collection: "Website Pages",
    where_to_click:
      "Open Pages and Navigation -> Website Pages. Search the page title or slug, choose English or Hindi, then open the labelled text rows.",
    english_fields:
      "English Page: Title, Short Introduction, English Page Text",
    hindi_fields:
      "Hindi Page: Hindi Title, Hindi Short Introduction, Hindi Page Text",
    media_fields:
      "Photos on This Page and optional Page Image",
    daily_steps:
      "Choose Language to Edit. Open the correct section row. Change the text value only. Save. Use Live Preview if enabled.",
    common_mistakes:
      "Do not delete rows from fixed-layout pages. Do not edit locked HTML. Do not change Page Address unless links are being updated.",
    public_effect:
      "Changes text on inner pages while keeping tabs, layout, and formatting stable.",
    status: "published",
    sort: 70,
  },
  {
    key: "page-photos",
    website_area: "Photos inside division, facility, academic, and content pages",
    edit_collection: "Page Photos",
    where_to_click:
      "Open a Website Pages row and use Photos on This Page, or open Pages and Navigation -> Page Photos directly.",
    english_fields:
      "Where This Photo Appears is read-only.",
    hindi_fields:
      "Same photo is used for both languages unless the page has separate records.",
    media_fields:
      "New Photo",
    daily_steps:
      "Open the row named by the tab or section, upload New Photo, Save, and keep Status Published.",
    common_mistakes:
      "Uploading into File Library alone does nothing. The new image must be attached to the Page Photos row.",
    public_effect:
      "Replaces a specific photo inside a page without touching page text.",
    status: "published",
    sort: 80,
  },
  {
    key: "people-profiles",
    website_area: "Officials, leadership page, scientists, former scientists, staff, and administration",
    edit_collection: "People Profiles",
    where_to_click:
      "Open People and Organisation -> People Profiles. Filter by Where This Person Appears.",
    english_fields:
      "Name, Role, Designation, Department, Deployment, Duration, Specialisation, Experience, Publications, Additional Details",
    hindi_fields:
      "Matching Hindi fields for name, role, designation, department, deployment, duration, and details",
    media_fields:
      "Photo and Photo Crop Position",
    daily_steps:
      "Check Profile Type and Employee ID first, edit details, upload photo if needed, Publish, and Save.",
    common_mistakes:
      "Do not change Profile Type while only editing a person. Similar names must be checked by Employee ID.",
    public_effect:
      "Updates people cards and profile lists across the website.",
    status: "published",
    sort: 90,
  },
  {
    key: "notices",
    website_area: "Notices, circulars, tenders, and public PDFs",
    edit_collection: "Notices and Circulars",
    where_to_click:
      "Open Public Information -> Notices and Circulars. Create one row per notice.",
    english_fields:
      "Title, Category, English Short Information, Last Date, Date Published",
    hindi_fields:
      "Hindi Title, Hindi Category, Hindi Short Information",
    media_fields:
      "PDF Document",
    daily_steps:
      "Create row, fill fields, attach PDF, set Status Published when final, Save.",
    common_mistakes:
      "Do not redirect to the old RSAC website. Upload the PDF in this row.",
    public_effect:
      "Adds or updates notice cards and downloadable PDFs on the public site.",
    status: "published",
    sort: 100,
  },
  {
    key: "flood-reports",
    website_area: "Flood daily reports and flood PDFs",
    edit_collection: "Flood Reports",
    where_to_click:
      "Open Public Information -> Flood Reports. Create one row per report PDF.",
    english_fields:
      "Title, Date, English Date Label, Category, Coverage, English Short Information",
    hindi_fields:
      "Hindi Title, Hindi Date Label, Hindi Category, Hindi Coverage, Hindi Short Information",
    media_fields:
      "PDF Document",
    daily_steps:
      "Create row, attach the local PDF, set the report date, Publish, and Save.",
    common_mistakes:
      "Do not paste the live RSAC URL as the main source. Use the PDF Document picker.",
    public_effect:
      "Adds or updates downloadable flood reports. Newer dates show first unless Display Order is set.",
    status: "published",
    sort: 110,
  },
  {
    key: "policies-public-info",
    website_area: "RTI, feedback, tenders, policies, help, disclaimer, and accessibility pages",
    edit_collection: "Public Information Pages or Policies and Help",
    where_to_click:
      "Use Public Information Pages for RTI/feedback/tenders. Use Policies and Help for policy/help/accessibility pages.",
    english_fields:
      "Title, Summary, English Content Sections, English Links",
    hindi_fields:
      "Hindi Title, Hindi Summary, Hindi Content Sections, Hindi Links",
    media_fields:
      "Documents are usually added through Notices or Flood Reports; ask a developer if this page needs a new file field.",
    daily_steps:
      "Open the page row, add/edit section rows using labelled form fields, Save, and Publish.",
    common_mistakes:
      "Do not paste raw HTML. Use Add Item and fill Heading/Body fields.",
    public_effect:
      "Updates government information pages without changing layout.",
    status: "published",
    sort: 120,
  },
  {
    key: "gallery",
    website_area: "Photo gallery",
    edit_collection: "Photo Gallery",
    where_to_click:
      "Open Public Information -> Photo Gallery. Create one row per photo.",
    english_fields:
      "Title and Image Description",
    hindi_fields:
      "Hindi Title and Hindi Image Description",
    media_fields:
      "Image",
    daily_steps:
      "Upload/select photo, add captions, set Display Order if needed, Publish, Save.",
    common_mistakes:
      "Do not leave image description empty for important photos; it helps accessibility.",
    public_effect:
      "Adds or updates gallery photos.",
    status: "published",
    sort: 130,
  },
  {
    key: "contact-footer",
    website_area: "Contact details and footer contact information",
    edit_collection: "Contact Details and Website Text Editor",
    where_to_click:
      "Use Contact Details for address, phone, email, and office contacts. Use Website Text Editor for footer wording.",
    english_fields:
      "Title, Address, Contacts, Email, Phone, Mobile",
    hindi_fields:
      "Hindi Title, Hindi Address, Hindi Contacts",
    media_fields:
      "No media fields.",
    daily_steps:
      "Update contact row, Save, then refresh Contact page and footer.",
    common_mistakes:
      "Do not edit the same contact in fallback files when Directus is enabled.",
    public_effect:
      "Updates contact page, footer contact details, and public-facing email/phone text.",
    status: "published",
    sort: 140,
  },
  {
    key: "operational-domains",
    website_area: "Homepage Operational Domains / Mission Pulse cards",
    edit_collection: "Website Text Editor",
    where_to_click:
      "Open Homepage -> Website Text Editor. Search Operational Domains, Mission Pulse, or the exact card title you see on the homepage.",
    english_fields:
      "English Text rows for the section title, description, card titles, card descriptions, metric labels, and button labels.",
    hindi_fields:
      "Hindi Text rows for the same visible words. Type Hindi manually; blank Hindi falls back to English.",
    media_fields:
      "No normal media field. Icons and animation style are controlled by the website theme.",
    daily_steps:
      "Edit existing wording in Website Text Editor, Save, and refresh. For adding/removing/reordering cards without JSON, ask a developer to expose a dedicated Operational Domains collection first.",
    common_mistakes:
      "Do not edit the hidden site-settings JSON. Do not create random Content Keys; unsupported keys will not show.",
    public_effect:
      "Changes the visible Operational Domains / Mission Pulse text while keeping the existing animation and layout.",
    status: "published",
    sort: 145,
  },
  {
    key: "services-programmes",
    website_area: "Homepage Services and Programmes section",
    edit_collection: "Website Text Editor",
    where_to_click:
      "Open Homepage -> Website Text Editor. Search Services, Programmes, Scientific Services, or a visible service-card title.",
    english_fields:
      "English Text rows for tab labels, headings, descriptions, service card titles, and service card text.",
    hindi_fields:
      "Hindi Text rows for matching service text. Leave blank only when English fallback is acceptable.",
    media_fields:
      "No normal media field. Card icons are selected by supported website code.",
    daily_steps:
      "Edit existing labels/text and Save. If a new service card is needed, ask a developer to add a supported Website Text Editor key or a dedicated Services collection.",
    common_mistakes:
      "Do not paste HTML or JSON. Do not change Content Key values.",
    public_effect:
      "Updates homepage service/programme wording without disturbing the grid.",
    status: "published",
    sort: 146,
  },
  {
    key: "institution-at-glance",
    website_area: "Institution at a Glance / statistics cards",
    edit_collection: "Website Text Editor",
    where_to_click:
      "Open Homepage -> Website Text Editor. Search Institution, Glance, Established, Headquarters, or the statistic label.",
    english_fields:
      "English Text rows for statistic values, labels, small captions, and section headings.",
    hindi_fields:
      "Hindi Text rows for the same labels and captions.",
    media_fields:
      "No normal media field.",
    daily_steps:
      "Edit values and labels, Save, and refresh. For adding/removing/reordering statistic cards without JSON, ask a developer to expose a dedicated At-a-Glance collection.",
    common_mistakes:
      "Do not edit hidden JSON in Site Settings for routine changes.",
    public_effect:
      "Updates the small institutional facts and statistic cards shown on the homepage.",
    status: "published",
    sort: 147,
  },
  {
    key: "division-list-items",
    website_area: "Research papers, articles, technical reports, completed projects, and ongoing projects inside division pages",
    edit_collection: "Website Pages",
    where_to_click:
      "Open Pages and Navigation -> Website Pages. Search the division page, open English Page or Hindi Page, then open the matching section group.",
    english_fields:
      "Use Add item inside the section group for a new English list item. The website places editor-added items at the top of that section.",
    hindi_fields:
      "Use the Hindi Page tab for Hindi list text when the page reads Directus Hindi. Type Hindi manually.",
    media_fields:
      "Use Page Photos only for images. Documents should be attached through Notices, Flood Reports, or a dedicated document collection if added later.",
    daily_steps:
      "Add one clean list item per row, do not type serial numbers, Save, Publish, then refresh the page.",
    common_mistakes:
      "Do not edit raw HTML. Do not add 1., 2., 3. manually. Do not paste a full table into one text box.",
    public_effect:
      "Adds new research/report/project items above older ones while the frontend generates numbering/alignment.",
    status: "published",
    sort: 148,
  },
  {
    key: "cards-and-section-summaries",
    website_area: "Section cards, division summary cards, facility cards, geo-portal cards, app download cards",
    edit_collection: "Website Sections, Scientific Divisions, Facilities, Geo-Portal Services, App Downloads",
    where_to_click:
      "Open the collection matching the card type. Each row controls one card or summary.",
    english_fields:
      "Title, Description/Lead/Text/Highlights, Link fields where available",
    hindi_fields:
      "Matching Hindi Title, Description/Lead/Text/Highlights fields",
    media_fields:
      "App Downloads can use Download File. Other cards use icon/colour controls.",
    daily_steps:
      "Edit one row, choose icon/colour where available, set Display Order, Publish, Save.",
    common_mistakes:
      "Do not create duplicate cards with the same destination unless intentionally required.",
    public_effect:
      "Updates landing cards and service summaries across the website.",
    status: "published",
    sort: 150,
  },
];

const seedContent = async () => {
  const defaults = await loadDefaults();
  const counters = { created: 0, updated: 0, skipped: 0 };
  const geoportalIconKeys = [
    "network",
    "education",
    "globe",
    "database",
    "radio",
    "map",
  ];
  const hindiPagesByKey = new Map(
    (defaults.rsacOfficialSectionsHi || []).flatMap((section) =>
      (section.pages || []).map((page) => [
        `${section.key}:${page.slug}`,
        page,
      ])
    )
  );
  const parseStoredValue = (value, fallback) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const pageTranslationMap = {
    ...hiTranslations,
    ...divisionHindiPhrases,
  };
  const stableKey = (value, fallback) =>
    String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  const multilineList = (items) =>
    Array.isArray(items) ? items.filter(Boolean).join("\n") : items || "";

  const settingsContentBlocks = flattenContentBlocks(
    defaults.siteSettings,
    defaults.siteSettingsHi
  );
  const visionMissionContentBlocks = flattenContentBlocks(
    { pageContent: { visionMission: defaults.visionMissionContent.en } },
    { pageContent: { visionMission: defaults.visionMissionContent.hi } }
  );
  const contentBlocks = Array.from(
    new Map(
      [...settingsContentBlocks, ...visionMissionContentBlocks].map((block) => [
        block.key,
        block,
      ])
    ).values()
  );
  for (const [sort, block] of contentBlocks.entries()) {
    await upsert(
      "rsac_content_blocks",
      { key: block.key },
      { ...block, status: "published", sort },
      counters
    );
  }

  const availableSeedCollections = await request("/collections?limit=-1");
  const hasEditorMap = availableSeedCollections.some(
    (collection) => collection.collection === "rsac_editor_map"
  );
  if (hasEditorMap) {
    for (const item of editorGuideItems) {
      await upsert(
        "rsac_editor_map",
        { key: item.key },
        item,
        counters
      );
    }
  }

  const brandLogo = await uploadAsset(
    defaults.siteSettings.branding.logo,
    "RSAC-UP logo"
  );
  const governmentLogo = await uploadAsset(
    defaults.siteSettings.branding.governmentLogo,
    "Government of Uttar Pradesh emblem"
  );
  const logoSeeds = [
    {
      title: "RSAC-UP",
      image: brandLogo,
      alt_text: "RSAC-UP logo",
      link_url: "/",
      placement: "primary",
      status: "published",
      sort: 0,
    },
    {
      title: "Government of Uttar Pradesh",
      image: governmentLogo,
      alt_text: "Government of Uttar Pradesh emblem",
      link_url: "/",
      placement: "supporting",
      status: "published",
      sort: 1,
    },
  ];
  for (const logo of logoSeeds) {
    await upsert(
      "rsac_brand_logos",
      { title: logo.title },
      logo,
      counters
    );
  }

  for (const role of buildOrganisationRoles(defaults.siteSettings)) {
    const {
      photo_source: photoSource,
      legacy_role: legacyRole,
      legacy_post: legacyPost,
      ...roleData
    } = role;
    const photo = await uploadAsset(photoSource, `${role.name || role.title} chart portrait`);
    const saved = await upsert(
      "rsac_organisation_roles",
      { role_key: role.role_key },
      { ...roleData, photo },
      counters
    );

    if (saved && !force) {
      const repair = {};
      if (!saved.photo && photo) repair.photo = photo;
      if (!saved.name && role.name) repair.name = role.name;
      if (
        role.role &&
        (!saved.role || (legacyRole && saved.role === legacyRole))
      ) {
        repair.role = role.role;
      }
      if (
        saved.post === legacyPost ||
        (!saved.post && role.post)
      ) {
        repair.post = role.post;
      }

      if (Object.keys(repair).length) {
        await request(`/items/rsac_organisation_roles/${saved.id}`, {
          method: "PATCH",
          body: repair,
        });
        counters.updated += 1;
      }
    }

  }

  for (const [sort, item] of defaults.quickLinks.entries()) {
    await upsert(
      "rsac_quick_links",
      { key: item.key },
      {
        key: item.key,
        title: item.title,
        description: item.description || "",
        path: item.path || "/",
        icon_key: item.iconKey || "document",
        accent: item.accent || "#0b6fa4",
        status: "published",
        sort,
      },
      counters
    );
  }

  const siteSettingsHi = defaults.siteSettingsHi || {};
  const homepageSectionSeeds = [
    ...(defaults.siteSettings.impactStats || []).map((item, index) => {
      const itemHi = siteSettingsHi.impactStats?.[index] || {};
      return {
        filters: { key: `impact-stat-${index + 1}` },
        data: {
          key: `impact-stat-${index + 1}`,
          title: item.label || "",
          title_hi: itemHi.label || "",
          summary: item.value || "",
          summary_hi: itemHi.value || "",
          details: item.detail || "",
          details_hi: itemHi.detail || "",
          status: "published",
          sort: index,
        },
      };
    }),
    ...(defaults.siteSettings.missionPulse?.domains || []).map((item, index) => {
      const itemHi = siteSettingsHi.missionPulse?.domains?.[index] || {};
      const key = `operational-domain-${stableKey(
        item.id || item.label,
        `domain-${index + 1}`
      )}`;
      return {
        filters: { key },
        data: {
          key,
          title: item.label || "",
          title_hi: itemHi.label || "",
          summary: item.detail || "",
          summary_hi: itemHi.detail || "",
          icon_key: item.icon || "database",
          details: multilineList(item.deliverables),
          details_hi: multilineList(itemHi.deliverables),
          button_path: item.path || "",
          button_label: item.linkLabel || "",
          button_label_hi: itemHi.linkLabel || "",
          status: "published",
          sort: 100 + index,
        },
      };
    }),
    {
      filters: { key: "location-card" },
      data: {
        key: "location-card",
        title: defaults.siteSettings.location?.locality || "",
        title_hi: siteSettingsHi.location?.locality || "",
        summary: defaults.siteSettings.location?.address || "",
        summary_hi: siteSettingsHi.location?.address || "",
        details: defaults.siteSettings.location?.mapQuery || "",
        button_label: defaults.siteSettings.location?.directionsLabel || "",
        button_label_hi: siteSettingsHi.location?.directionsLabel || "",
        status: "published",
        sort: 200,
      },
    },
  ];

  for (const item of homepageSectionSeeds) {
    await upsert(
      "rsac_home_feature_tabs",
      item.filters,
      item.data,
      counters
    );
  }

  for (const [sort, item] of defaults.mobileApps.entries()) {
    await upsert(
      "rsac_mobile_apps",
      { key: item.key },
      {
        key: item.key,
        title: item.title,
        title_hi: item.titleHi || "",
        description: item.description || "",
        description_hi: item.descriptionHi || "",
        url: item.url || "",
        status: "published",
        sort,
      },
      counters
    );
  }

  for (const [sort, item] of defaults.galleryImages.entries()) {
    const image = await uploadAsset(
      item.src,
      item.caption || `RSAC-UP gallery photograph ${sort + 1}`
    );
    await upsert(
      "rsac_gallery_items",
      { key: item.id },
      {
        key: item.id,
        title: item.caption || "",
        title_hi: item.captionHi || "",
        alt_text: item.alt || item.caption || `RSAC-UP gallery photograph ${sort + 1}`,
        alt_text_hi: item.altHi || item.captionHi || "",
        image,
        status: "published",
        sort,
      },
      counters
    );
  }

  for (const [sort, section] of defaults.rsacOfficialSections.entries()) {
    await upsert(
      "rsac_sections",
      { key: section.key },
      {
        key: section.key,
        route: section.route,
        title: section.title,
        eyebrow: section.eyebrow || "",
        intro: section.intro || "",
        status: "published",
        sort,
      },
      counters
    );

    for (const [pageSort, page] of section.pages.entries()) {
      const savedPage = await upsert(
        "rsac_pages",
        { section_key: section.key, slug: page.slug },
        {
          section_key: section.key,
          slug: page.slug,
          title: page.title,
          summary: page.summary || page.preview || "",
          html: page.html || "",
          source_url: page.sourceUrl || "",
          status: "published",
          sort: pageSort,
          language: "en",
          content_owner: "RSAC-UP",
        },
        counters
      );

      const existingEnglishFields = parseStoredValue(
        savedPage?.content_fields,
        []
      );
      const existingHindiFields = parseStoredValue(
        savedPage?.content_fields_hi,
        []
      );

      // First migration only: recover any text edits from the current CMS HTML,
      // then put those values onto the canonical locked layout. Future seeds
      // leave the editor's form rows and templates untouched.
      if (!existingEnglishFields.length || !existingHindiFields.length) {
        const canonicalHtml = page.html || "";
        const canonicalEnglishFields = extractPageTextFields(canonicalHtml);
        const currentEnglishFields = extractPageTextFields(
          savedPage?.html || canonicalHtml
        );
        const englishFields = existingEnglishFields.length
          ? existingEnglishFields
          : mergePageTextFieldValues(
              canonicalEnglishFields,
              currentEnglishFields
            );
        const hindiFallback = hindiPagesByKey.get(
          `${section.key}:${page.slug}`
        );
        const translations = parseStoredValue(savedPage?.translations, {});
        const currentHindiHtml =
          savedPage?.html_hi || translations?.hi?.html || hindiFallback?.html || "";
        const fixedHindiHtml =
          section.key === "divisions"
            ? canonicalHtml
            : hindiFallback?.html || currentHindiHtml || canonicalHtml;
        const canonicalHindiFields =
          section.key === "divisions"
            ? translatePageTextFields(
                canonicalEnglishFields,
                pageTranslationMap
              )
            : extractPageTextFields(fixedHindiHtml);
        const currentHindiFields = extractPageTextFields(currentHindiHtml);
        const hindiFields = existingHindiFields.length
          ? existingHindiFields
          : section.key === "divisions"
            ? canonicalHindiFields
            : currentHindiFields.length
            ? mergePageTextFieldValues(
                canonicalHindiFields,
                currentHindiFields
              )
            : canonicalHindiFields;
        const patch = {};

        if (!existingEnglishFields.length) {
          patch.html = canonicalHtml;
          patch.content_fields = englishFields;
        }
        if (!existingHindiFields.length) {
          patch.html_hi = fixedHindiHtml;
          patch.content_fields_hi = hindiFields;
          if (!savedPage?.title_hi && hindiFallback?.title) {
            patch.title_hi = hindiFallback.title;
          }
          if (!savedPage?.summary_hi && hindiFallback?.summary) {
            patch.summary_hi = hindiFallback.summary;
          }
        }

        if (Object.keys(patch).length) {
          await request(`/items/rsac_pages/${savedPage.id}`, {
            method: "PATCH",
            body: patch,
          });
          counters.updated += 1;
        }
      }

      // Refresh editor-only row labels without changing keys, order, or text.
      // Existing user values remain byte-for-byte untouched.
      const labelPatch = {};
      if (existingEnglishFields.length) {
        const relabelled = refreshPageTextLabels(
          existingEnglishFields,
          savedPage?.html || page.html || ""
        );
        if (JSON.stringify(relabelled) !== JSON.stringify(existingEnglishFields)) {
          labelPatch.content_fields = relabelled;
        }
      }
      if (existingHindiFields.length) {
        const relabelled = refreshPageTextLabels(
          existingHindiFields,
          savedPage?.html_hi || savedPage?.html || page.html || ""
        );
        if (JSON.stringify(relabelled) !== JSON.stringify(existingHindiFields)) {
          labelPatch.content_fields_hi = relabelled;
        }
      }
      if (Object.keys(labelPatch).length) {
        await request(`/items/rsac_pages/${savedPage.id}`, {
          method: "PATCH",
          body: labelPatch,
        });
        counters.updated += 1;
      }

      // One "Page Photos" row per unique photo on this page, named after the
      // website tab/section it appears under. Existing rows are left alone, so
      // an editor's uploaded replacement is never overwritten.
      const photoHtml = savedPage?.html || page.html || "";
      for (const [imageSort, pageImage] of collectPageImages(
        photoHtml,
        page.title
      ).entries()) {
        await upsert(
          "rsac_page_images",
          { page: savedPage.id, original_src: pageImage.src },
          {
            page: savedPage.id,
            page_slug: page.slug,
            label: pageImage.label,
            original_src: pageImage.src,
            sort: imageSort,
            status: "published",
          },
          counters
        );
      }
    }
  }

  const profileGroups = [
    ["official", defaults.officials],
    ["leadership", defaults.leadershipProfiles],
    ["scientist", defaults.scientistProfiles],
    ["former", defaults.formerProfiles],
    ["technical", defaults.technicalProfiles],
    ["administration", defaults.administrationProfiles],
  ];

  for (const [profileType, profiles] of profileGroups) {
    for (const [sort, profile] of profiles.entries()) {
      const photo = await uploadAsset(
        profile.image || profile.photo,
        profile.name
      );
      await upsert(
        "rsac_profiles",
        { profile_type: profileType, name: profile.name },
        {
          profile_type: profileType,
          name: profile.name,
          role: profile.role || "",
          designation: profile.designation || "",
          department: profile.department || "",
          deployment: profile.deployment || "",
          employee_id: profile.employeeId || "",
          duration: profile.duration || "",
          photo,
          object_position: profile.objectPosition || "center 22%",
          specialization: profile.specialization || "",
          experience: profile.experience || "",
          publications: profile.publications || "",
          contact: profile.contact || "",
          email: profile.email || "",
          source_url: profile.source || "",
          category: profile.category || "",
          details: clean(profile.details || []),
          status: "published",
          sort,
        },
        counters
      );
    }
  }

  const simpleGroups = [
    [
      "rsac_divisions",
      defaults.divisions,
      (item, sort) => ({
        filters: { slug: item.id },
        data: {
          slug: item.id,
          title: item.title,
          lead: item.lead || "",
          source_url: item.source || "",
          highlights: clean(item.highlights || []),
          status: "published",
          sort,
        },
      }),
    ],
    [
      "rsac_facilities",
      defaults.facilities,
      (item, sort) => ({
        filters: { title: item.title },
        data: {
          title: item.title,
          text: item.text || "",
          status: "published",
          sort,
        },
      }),
    ],
    [
      "rsac_geoportals",
      defaults.geoportals,
      (item, sort) => ({
        filters: { title: item.title },
        data: {
          title: item.title,
          description: item.description || "",
          url: item.url,
          icon_key: geoportalIconKeys[sort] || "map",
          accent: item.accent || "",
          status: "published",
          sort,
        },
      }),
    ],
    [
      "rsac_home_feature_tabs",
      defaults.siteSettings.homeSections.featureTabs || [],
      (item, sort) => {
        const key = String(item.key || item.title || `feature-${sort + 1}`)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        return {
          filters: { key },
          data: {
            key,
            title: item.title,
            summary: item.summary || "",
            details: item.details || "",
            button_label: item.buttonLabel || "",
            button_path: item.buttonPath || "",
            icon_key: item.icon || "building",
            status: "published",
            sort,
          },
        };
      },
    ],
    [
      "rsac_notices",
      defaults.notices,
      (item, sort) => ({
        filters: { title: item.title },
        data: {
          title: item.title,
          category: item.category || "General",
          meta: item.meta || "",
          last_date: item.lastDate || "",
          url: item.url || "",
          status: "published",
          sort,
        },
      }),
    ],
    [
      "rsac_policies",
      defaults.policyPages,
      (item, sort) => ({
        filters: { slug: item.slug },
        data: {
          slug: item.slug,
          title: item.title,
          summary: item.summary || "",
          source_url: item.source || "",
          sections: clean(item.sections || []),
          content_owner: "RSAC-UP",
          status: "published",
          sort,
        },
      }),
    ],
    [
      "rsac_public_info",
      defaults.publicInfoPages,
      (item, sort) => ({
        filters: { slug: item.slug },
        data: {
          slug: item.slug,
          title: item.title,
          eyebrow: item.eyebrow || "Public Services",
          summary: item.summary || "",
          source_url: item.source || "",
          sections: clean(item.sections || []),
          links: clean(item.links || []),
          content_owner: "RSAC-UP",
          status: "published",
          sort,
        },
      }),
    ],
    [
      "rsac_manpower_groups",
      defaults.manpowerGroups,
      (item, sort) => ({
        filters: { title: item.title },
        data: {
          title: item.title,
          count: item.count || "",
          text: item.text || "",
          path: item.path || "/manpower",
          status: "published",
          sort,
        },
      }),
    ],
    [
      "rsac_menu",
      defaults.menuItems,
      (item, sort) => ({
        filters: { title: item.title },
        data: {
          title: item.title,
          description: item.description || "",
          path: item.path || "/",
          links: clean(item.links || []),
          status: "published",
          sort,
        },
      }),
    ],
  ];

  for (const [collection, items, mapItem] of simpleGroups) {
    for (const [sort, item] of items.entries()) {
      const mapped = mapItem(item, sort);
      await upsert(
        collection,
        mapped.filters,
        mapped.data,
        counters
      );
    }
  }

  // Documents are copied into Directus storage even when the text record
  // already existed. This removes any runtime dependency on rsac.up.gov.in.
  for (const notice of defaults.notices) {
    const document = await uploadAsset(notice.url, notice.title);
    const existing = await findItem("rsac_notices", { title: notice.title });

    if (existing && document && (!existing.document || existing.url)) {
      await request(`/items/rsac_notices/${existing.id}`, {
        method: "PATCH",
        body: { document, url: "" },
      });
      counters.updated += 1;
    }
  }

  for (const [sort, report] of defaults.floodReports.entries()) {
    const document = await uploadAsset(report.url, report.title);

    const saved = await upsert(
      "rsac_flood_reports",
      { title: report.title, date: report.date || null },
      {
        title: report.title,
        date: report.date || null,
        date_label: report.dateLabel || report.date || "",
        category: report.category || "Daily Report",
        coverage: report.coverage || "State-wide",
        meta: report.meta || "",
        document,
        url: document ? "" : report.url || "",
        status: "published",
        sort,
      },
      counters
    );

    if (saved && document && (!saved.document || saved.url)) {
      await request(`/items/rsac_flood_reports/${saved.id}`, {
        method: "PATCH",
        body: { document, url: "" },
      });
      counters.updated += 1;
    }
  }

  for (const [sort, heroVideo] of defaults.heroVideos.entries()) {
    const video = await uploadAsset(heroVideo.video, heroVideo.title);
    const poster = await uploadAsset(
      heroVideo.poster,
      `${heroVideo.title} poster`
    );
    await upsert(
      "rsac_hero_videos",
      { title: heroVideo.title },
      {
        title: heroVideo.title,
        file_name: heroVideo.fileName || "",
        video,
        poster,
        status: "published",
        sort,
      },
      counters
    );
  }

  const currentSettings = await request("/items/rsac_site_settings");
  const settingsAreEmpty =
    !currentSettings ||
    Object.keys(currentSettings.branding || {}).length === 0;

  if (force || settingsAreEmpty) {
    await request("/items/rsac_site_settings", {
      method: "PATCH",
      body: await buildSettingsPayload(defaults),
    });
  }

  const currentContact = await request("/items/rsac_contact");
  if (force || !currentContact?.address) {
    await request("/items/rsac_contact", {
      method: "PATCH",
      body: clean(defaults.contactDetails),
    });
  }

  console.log(
    `Seed complete: ${counters.created} created, ${counters.updated} updated, ${counters.skipped} preserved.`
  );
};

const syncSettings = async () => {
  const defaults = await loadDefaults();

  await request("/items/rsac_site_settings", {
    method: "PATCH",
    body: await buildSettingsPayload(defaults),
  });

  console.log("Synchronized all repository site settings and homepage content to Directus.");
};

const validate = async () => {
  const requiredCollections = Object.keys(collections);
  const available = await request("/collections?limit=-1");
  const availableByName = new Map(
    available.map((item) => [item.collection, item])
  );
  const availableNames = new Set(available.map((item) => item.collection));
  const missing = requiredCollections.filter(
    (collection) => !availableNames.has(collection)
  );

  if (missing.length) {
    throw new Error(`Missing Directus collections: ${missing.join(", ")}`);
  }

  const fieldMetadata = await request("/fields?limit=-1");
  const fieldMetadataByKey = new Map(
    fieldMetadata.map((field) => [
      `${field.collection}.${field.field}`,
      field,
    ])
  );
  const visibleSystemFields = fieldMetadata.filter(
    (field) =>
      field.collection.startsWith("rsac_") &&
      ["id", "date_created", "date_updated", "user_created", "user_updated"].includes(
        field.field
      ) &&
      (!field.meta?.hidden || !field.meta?.readonly)
  );

  if (visibleSystemFields.length) {
    throw new Error(
      `Directus Studio has visible technical fields: ${visibleSystemFields
        .map((field) => `${field.collection}.${field.field}`)
        .join(", ")}. Run npm run cms:configure.`
    );
  }

  for (const [folder, meta] of Object.entries(editorFolders)) {
    const current = availableByName.get(folder);
    const label = current?.meta?.translations?.find(
      (item) => item.language === "en-US"
    )?.translation;

    if (!current || label !== meta.label) {
      throw new Error(
        `Directus simple-editor folder ${meta.label} is missing. Run npm run cms:configure.`
      );
    }
  }

  for (const [collection, [expectedLabel, expectedGroup]] of Object.entries(
    collectionEditorMeta
  )) {
    const current = availableByName.get(collection);
    const label = current?.meta?.translations?.find(
      (item) => item.language === "en-US"
    )?.translation;

    if (current?.meta?.group !== expectedGroup || label !== expectedLabel) {
      throw new Error(
        `${collection} is not correctly named or filed in the simple editor.`
      );
    }
  }

  for (const [collection, layout] of Object.entries(editorLayouts)) {
    const help = fieldMetadataByKey.get(`${collection}.editor_help`);
    if (help?.meta?.interface !== "presentation-notice") {
      throw new Error(
        `${collection} is missing its simple editing instructions. Run npm run cms:configure.`
      );
    }

    for (const [groupField, , , , fields] of layout.groups) {
      const group = fieldMetadataByKey.get(`${collection}.${groupField}`);
      if (group?.meta?.interface !== "group-detail") {
        throw new Error(
          `${collection}.${groupField} is missing its simple editor group.`
        );
      }

      for (const field of fields) {
        const current = fieldMetadataByKey.get(`${collection}.${field}`);
        if (!current || current.meta?.group !== groupField || current.meta?.hidden) {
          throw new Error(
            `${collection}.${field} is not correctly placed in the simple editor.`
          );
        }
      }
    }

    for (const field of ["translations", ...(layout.hidden || [])]) {
      const current = fieldMetadataByKey.get(`${collection}.${field}`);
      if (current && !current.meta?.hidden) {
        throw new Error(
          `${collection}.${field} exposes technical data in the editor.`
        );
      }
    }

    for (const field of layout.visible || []) {
      const current = fieldMetadataByKey.get(`${collection}.${field}`);
      if (!current || current.meta?.hidden || current.meta?.group) {
        throw new Error(
          `${collection}.${field} is not visible in the simple editor.`
        );
      }
    }
  }

  for (const field of ["html", "html_hi"]) {
    const current = fieldMetadataByKey.get(`rsac_pages.${field}`);
    const label = current?.meta?.translations?.find(
      (item) => item.language === "en-US"
    )?.translation;
    if (
      current?.meta?.interface !== "input-code" ||
      !current?.meta?.hidden ||
      !current?.meta?.readonly ||
      label !== fieldLabelOverrides[`rsac_pages.${field}`]
    ) {
      throw new Error(
        `Website Pages ${field} is not a locked layout template.`
      );
    }
  }

  for (const field of ["content_fields", "content_fields_hi"]) {
    const current = fieldMetadataByKey.get(`rsac_pages.${field}`);
    if (current?.meta?.interface !== "list" || current.meta?.hidden) {
      throw new Error(
        `Website Pages ${field} is not using the simple text form.`
      );
    }
  }

  for (const [collection, layout] of Object.entries(editorLayouts)) {
    if (!hasLanguageSwitch(layout)) continue;

    const languageField = fieldMetadataByKey.get(
      `${collection}.edit_language`
    );
    if (
      languageField?.meta?.interface !== "select-radio" ||
      languageField.meta?.hidden
    ) {
      throw new Error(
        `${collection} is missing the simple English/Hindi selector.`
      );
    }

    for (const groupField of ["editor_english", "editor_hindi"]) {
      const group = fieldMetadataByKey.get(`${collection}.${groupField}`);
      if (!group?.meta?.conditions?.length) {
        throw new Error(
          `${collection} ${groupField} does not follow the language selector.`
        );
      }
    }
  }

  const pagePreviewUrl = availableByName.get("rsac_pages")?.meta?.preview_url;
  if (!pagePreviewUrl?.includes("{{edit_language}}")) {
    throw new Error("Website Pages Live Preview is not language-aware.");
  }

  const folderId = await ensurePublicFolder();
  const files = await request(
    "/files?limit=-1&fields=id,filename_download,type,folder"
  );
  const filesById = new Map(files.map((file) => [file.id, file]));
  const fileReferences = [];

  for (const [collection, field, kind] of fileFields) {
    const rawItems = await request(
      `/items/${collection}?limit=-1&fields=id,${field}`
    );
    const items = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : [];

    for (const item of items) {
      const fileId = item[field]?.id || item[field];

      if (fileId) {
        fileReferences.push({
          collection,
          item: item.id,
          field,
          kind,
          fileId,
        });
      }
    }
  }

  const brokenFiles = fileReferences.filter(
    (reference) => !filesById.has(reference.fileId)
  );

  if (brokenFiles.length) {
    throw new Error(
      `Broken Directus file relations: ${brokenFiles
        .map(
          (reference) =>
            `${reference.collection}.${reference.field} item ${reference.item}`
        )
        .join(", ")}.`
    );
  }

  const wrongFolderFiles = fileReferences.filter(
    (reference) => filesById.get(reference.fileId)?.folder !== folderId
  );

  if (wrongFolderFiles.length) {
    throw new Error(
      `Website media exists outside RSAC Website Public Media: ${wrongFolderFiles
        .map(
          (reference) =>
            `${reference.collection}.${reference.field} item ${reference.item}`
        )
        .join(", ")}.`
    );
  }

  const wrongMediaTypes = fileReferences.filter((reference) => {
    const type = filesById.get(reference.fileId)?.type || "";

    if (reference.kind === "image") {
      return !type.startsWith("image/");
    }

    if (reference.field === "video") {
      return !type.startsWith("video/");
    }

    return reference.field === "document" && type !== "application/pdf";
  });

  if (wrongMediaTypes.length) {
    throw new Error(
      `Wrong media type in CMS file fields: ${wrongMediaTypes
        .map(
          (reference) =>
            `${reference.collection}.${reference.field} item ${reference.item}`
        )
        .join(", ")}.`
    );
  }

  const settings = await request(
    "/items/rsac_site_settings?fields=organisation_chart_file"
  );
  const heroRecords = await request(
    "/items/rsac_hero_videos?limit=-1&fields=id,poster,status,sort"
  );
  const activeHero = heroRecords
    .filter((item) => item.status === "published")
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))[0];
  const chartFileId =
    settings?.organisation_chart_file?.id || settings?.organisation_chart_file;
  const heroPosterId = activeHero?.poster?.id || activeHero?.poster;

  if (chartFileId && heroPosterId && chartFileId === heroPosterId) {
    throw new Error(
      "Organisational chart and homepage hero share one Directus file. Upload separate dedicated files."
    );
  }

  const publicPermissions = await request(
    `/permissions?limit=-1&filter[policy][_eq]=${publicPolicyId}`
  );
  const unsafePublicWrites = publicPermissions.filter(
    (permission) =>
      ["create", "update", "delete"].includes(permission.action) &&
      !(
        permission.collection === "rsac_site_visits" &&
        permission.action === "create"
      )
  );

  if (unsafePublicWrites.length) {
    throw new Error(
      `Unsafe anonymous write permissions: ${unsafePublicWrites
        .map(
          (permission) =>
            `${permission.collection}.${permission.action}`
        )
        .join(", ")}.`
    );
  }

  for (const collection of requiredCollections) {
    await request(`/items/${collection}?limit=1`, { auth: false });
  }

  await request("/files?limit=1", { auth: false });

  if (strictPublicPermissions) {
    const draftPages = await request(
      "/items/rsac_pages?limit=1&filter[status][_eq]=draft",
      { auth: false }
    );

    if (Array.isArray(draftPages) && draftPages.length) {
      throw new Error("Public access exposed a draft rsac_pages record.");
    }
  }

  const usersResponse = await fetch(`${directusUrl}/users?limit=1`);

  if (usersResponse.ok) {
    throw new Error("Unauthenticated access to Directus users is enabled.");
  }

  const referencedFileIds = new Set(
    fileReferences.map((reference) => reference.fileId)
  );
  const orphanFileCount = files.filter(
    (file) => !referencedFileIds.has(file.id)
  ).length;

  console.log(
    `Validated ${requiredCollections.length} collections, Studio layout, ${fileReferences.length} media relations, public content, anonymous write safety, and protected user data at ${directusUrl}.`
  );

  if (orphanFileCount) {
    console.warn(
      `${orphanFileCount} unlinked File Library item(s) remain. They were not deleted because they may be retained media or backups.`
    );
  }

  if (strictPublicPermissions) {
    console.log("Published-only and field-limited public API rules are active.");
  } else {
    console.warn(
      "Published-only Directus API permission filters require the corresponding Directus entitlement. Frontend requests still filter Published records; enable DIRECTUS_STRICT_PUBLIC_PERMISSIONS in production after entitlement activation."
    );
  }
};

// Non-admin "Content Editor" role for day-to-day government editors: full
// content access (rsac_* collections + file library) and studio login, but no
// admin rights — they cannot alter the data model, roles, or settings.
// Idempotent; add editor accounts to this role in Settings -> User Roles.
const ensureEditorRole = async () => {
  const roleName = "Content Editor";
  const policyName = "Content Editor Policy";

  let [role] = await request(
    `/roles?filter[name][_eq]=${encodeURIComponent(roleName)}&limit=1`
  );
  if (!role) {
    role = await request("/roles", {
      method: "POST",
      body: {
        name: roleName,
        icon: "edit_note",
        description:
          "Edits website content and files. No data-model or settings access.",
      },
    });
  }

  let [policy] = await request(
    `/policies?filter[name][_eq]=${encodeURIComponent(policyName)}&limit=1`
  );
  if (!policy) {
    policy = await request("/policies", {
      method: "POST",
      body: {
        name: policyName,
        icon: "edit_note",
        app_access: true,
        admin_access: false,
        enforce_tfa: false,
      },
    });
  }

  const access = await request(
    `/access?filter[role][_eq]=${role.id}&filter[policy][_eq]=${policy.id}&limit=1`
  );
  if (!access.length) {
    await request("/access", {
      method: "POST",
      body: { role: role.id, policy: policy.id },
    });
  }

  const editorCollections = [
    ...Object.keys(collections),
    "rsac_page_images",
    "rsac_feedback",
    "directus_files",
    "directus_folders",
  ];
  const existingPermissions = await request(
    `/permissions?limit=-1&filter[policy][_eq]=${policy.id}`
  );
  const existingByKey = new Set(
    existingPermissions.map((p) => `${p.collection}:${p.action}`)
  );

  for (const collection of editorCollections) {
    // Citizen feedback is read-only for editors; everything else is full CRUD.
    const actions =
      collection === "rsac_feedback"
        ? ["read"]
        : ["create", "read", "update", "delete"];

    for (const action of actions) {
      if (existingByKey.has(`${collection}:${action}`)) {
        continue;
      }
      await request("/permissions", {
        method: "POST",
        body: {
          collection,
          action,
          policy: policy.id,
          permissions: {},
          validation: {},
          presets: {},
          fields: ["*"],
        },
      });
    }
  }
};

await waitForDirectus();
await login();

if (mode === "configure" || mode === "all") {
  await configureStudio();
  await configurePublicPermissions();
  await ensureEditorRole();
  console.log("Directus Studio metadata, file relations, and public permissions configured.");
}

if (mode === "seed" || mode === "all") {
  await seedContent();
}

if (mode === "sync-settings") {
  await syncSettings();
}

if (mode === "validate" || mode === "all") {
  await validate();
}
