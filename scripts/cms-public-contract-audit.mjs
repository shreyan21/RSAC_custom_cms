import { config as loadEnv } from "dotenv";
import pg from "pg";
import { assembleBootstrap } from "../server/contentAssembler.js";
import { collections } from "../shared/cmsCollections.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");

const pages = (bootstrap) => (bootstrap.rsacOfficialSections || []).flatMap((section) => section.pages || []);
const divisionPages = (bootstrap) => bootstrap.rsacOfficialSections
  ?.find((section) => section.key === "divisions")?.pages || [];
const publicInfo = (bootstrap, slug) => (bootstrap.publicInfoPages || []).filter((item) => item.slug === slug);
const hasBlockLabel = (page, pattern) => (page.blocks || []).some((block) =>
  pattern.test(`${block.sourceLabel || ""} ${block.label || ""} ${block.value || ""}`)
);

const contracts = {
  pages: { route: "dynamic page routes", resolve: pages },
  page_sections: { route: "/about-us, /divisions, /facilities, /academics", resolve: (b) => b.rsacOfficialSections },
  divisions: { route: "/divisions", resolve: divisionPages },
  division_section_items: { route: "/divisions/:slug", resolve: (b) => divisionPages(b).flatMap((page) => Object.values(page.managedSectionItems || {})).flat() },
  facilities: { route: "/facilities ordering", resolve: (b) => b.facilities },
  profiles: { route: "people and leadership routes", resolve: (b) => [b.officials, b.leadershipProfiles, b.scientistProfiles, b.formerProfiles, b.technicalProfiles, b.administrationProfiles].flat() },
  projects: { route: "/divisions/:slug project sections", alias: "pages", resolve: (b) => divisionPages(b).filter((page) => hasBlockLabel(page, /projects?|परियोजन/iu)) },
  publications: { route: "/divisions/:slug publication sections", alias: "pages", resolve: (b) => divisionPages(b).filter((page) => hasBlockLabel(page, /research|paper|publication|technical reports?|atlas|शोध|प्रकाशन|तकनीकी|एटलस/iu)) },
  notices: { route: "/notices", resolve: (b) => b.notices },
  tenders: { route: "/tenders", alias: "public_info", resolve: (b) => publicInfo(b, "tenders") },
  faq: { route: "/faq", alias: "public_info", resolve: (b) => publicInfo(b, "faq") },
  gallery: { route: "/gallery", resolve: (b) => b.galleryItems },
  downloads: { route: "/downloads", resolve: (b) => b.downloads },
  flood_reports: { route: "/flood-reports", resolve: (b) => b.floodData?.floodReports || [] },
  mobile_apps: { route: "/mobile-apps", resolve: (b) => b.mobileApps },
  public_info: { route: "/rti, /feedback, /tenders, /faq", resolve: (b) => b.publicInfoPages },
  policies: { route: "policy routes", resolve: (b) => b.policyPages },
  menu_items: { route: "header and footer", resolve: (b) => b.menuItems },
  contact: { route: "/contact and footer", resolve: (b) => b.contactDetails },
  site_settings: { route: "homepage, sitemap and global chrome", resolve: (b) => b.siteSettings },
  page_display_settings: { route: "matching configured route", resolve: (b) => b.siteSettings?.pageDisplaySettings || [] },
  design_settings: { route: "all public routes", resolve: (b) => b.siteSettings?.designSettings || {} },
  hero_banners: { route: "/", resolve: (b) => b.heroVideos },
  logos: { route: "header and footer", resolve: (b) => b.siteSettings?.branding?.logos || [] },
  homepage_features: { route: "/ homepage section navigation", resolve: (b) => b.siteSettings?.homeSections?.featureTabs || [] },
  services: { route: "/#services", resolve: (b) => b.siteSettings?.services?.items || [] },
  applications: { route: "/#services", resolve: (b) => b.siteSettings?.applications?.items || [] },
  quick_links: { route: "/ homepage quick links", resolve: (b) => b.quickLinks },
  geoportals: { route: "/geoportals and homepage", resolve: (b) => b.geoportals },
  operational_domains: { route: "/ homepage mission section", resolve: (b) => b.siteSettings?.missionPulse?.domains || [] },
  impact_stats: { route: "/ homepage statistics", resolve: (b) => b.siteSettings?.impactStats || [] },
  manpower: { route: "/manpower", resolve: (b) => b.manpowerGroups },
  organisation_roles: { route: "/organisation-chart", resolve: (b) => b.siteSettings?.organisationChart?.roles || [] },
};

const definitionsById = new Map(collections.map((definition) => [definition.id, definition]));
const unmapped = collections.map((definition) => definition.id).filter((id) => !contracts[id]);
const stale = Object.keys(contracts).filter((id) => !definitionsById.has(id));
if (unmapped.length || stale.length) {
  throw new Error(`Public contract map mismatch. Unmapped: ${unmapped.join(", ") || "none"}; stale: ${stale.join(", ") || "none"}.`);
}

const sampleValue = (field, marker) => {
  if (field.type === "boolean") return true;
  if (field.type === "number") return 1;
  if (field.type === "select") return typeof field.options?.[0] === "object" ? field.options[0].value : field.options?.[0];
  if (field.type === "list") return [marker];
  if (field.type === "json") return { contractMarker: marker };
  if (field.type === "blocks") return [{ id: `audit-${marker}`, type: "rich_text", html: `<p>${marker}</p>` }];
  if (field.type === "email") return "audit@example.gov.in";
  if (field.type === "date") return "2026-01-01";
  if (["url", "media"].includes(field.type)) return "/audit-document.pdf";
  return marker;
};

const syntheticData = (definition, marker) => {
  const dataEn = {};
  const dataHi = {};
  for (const field of definition.fields || []) {
    if (!field.required) continue;
    dataEn[field.name] = sampleValue(field, marker);
    if (field.localized !== false) dataHi[field.name] = sampleValue(field, marker);
  }
  if (definition.id === "division_section_items") {
    dataEn.divisionSlug = "training-division";
    dataEn.sectionKey = "research-papers";
  }
  return { dataEn, dataHi };
};

const setMarker = (data, field, marker) => {
  const current = data[field.name];
  if (field.type === "json") return { ...((current && typeof current === "object") ? current : {}), contractMarker: marker };
  if (field.type === "list") return [marker];
  if (field.type === "blocks") return [...(Array.isArray(current) ? current : []), { id: `audit-${marker}`, type: "rich_text", html: `<p>${marker}</p>` }];
  return marker;
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
const rows = (await client.query(
  "SELECT id, collection, entry_key, sort_order, data_en, data_hi, version, updated_at FROM cms_entries WHERE status='published' ORDER BY collection, sort_order, entry_key"
)).rows;
await client.end();

const english = assembleBootstrap(rows, "en");
const hindi = assembleBootstrap(rows, "hi");
const problems = [];
const results = [];
for (const definition of collections) {
  const contract = contracts[definition.id];
  const enTarget = contract.resolve(english);
  const hiTarget = contract.resolve(hindi);
  if (contract.alias) {
    if (!JSON.stringify(enTarget).length || !JSON.stringify(hiTarget).length || ![].concat(enTarget || []).length || ![].concat(hiTarget || []).length) {
      problems.push(`${definition.id} canonical ${contract.alias} editor has no bilingual public target.`);
    }
    results.push(`${definition.id.padEnd(24)} alias:${contract.alias.padEnd(11)} ${contract.route}`);
    continue;
  }

  const localizedField = (definition.fields || []).find((field) => field.localized !== false);
  if (!localizedField) {
    if (!JSON.stringify(enTarget).length || !JSON.stringify(hiTarget).length) problems.push(`${definition.id} shared settings have no public target.`);
    results.push(`${definition.id.padEnd(24)} shared            ${contract.route}`);
    continue;
  }

  const selected = rows.find((row) => row.collection === definition.id && (
    definition.id === "profiles"
      ? row.data_en?.profileType === "scientist"
      : definition.id === "pages"
        ? row.data_en?.sectionKey !== "divisions"
        : true
  ));
  const markerBase = `CMS_CONTRACT_${definition.id.toUpperCase()}`;
  const sourceRows = structuredClone(rows);
  let source = selected && sourceRows.find((row) => String(row.id) === String(selected.id));
  if (!source) {
    const sample = syntheticData(definition, markerBase);
    source = {
      id: `audit-${definition.id}`,
      collection: definition.id,
      entry_key: `audit-${definition.id}`,
      sort_order: -1,
      data_en: sample.dataEn,
      data_hi: sample.dataHi,
      version: 1,
      updated_at: new Date(0),
    };
    sourceRows.push(source);
  }

  for (const language of ["en", "hi"]) {
    const marker = `${markerBase}_${language.toUpperCase()}`;
    const data = language === "hi" ? source.data_hi : source.data_en;
    data[localizedField.name] = setMarker(data, localizedField, marker);
    const target = contract.resolve(assembleBootstrap(sourceRows, language));
    if (!JSON.stringify(target).includes(marker)) {
      problems.push(`${definition.id}.${localizedField.name} ${language} edit does not reach ${contract.route}.`);
    }
  }
  results.push(`${definition.id.padEnd(24)} bilingual         ${contract.route}`);
}

const facilityRows = rows.filter((row) => row.collection === "facilities");
if (facilityRows.length) {
  const reorderedRows = structuredClone(rows);
  const facility = reorderedRows.find((row) => row.collection === "facilities");
  facility.sort_order = -1;
  const firstFacility = assembleBootstrap(reorderedRows, "en").rsacOfficialSections
    .find((section) => section.key === "facilities")?.pages?.[0];
  const expectedTitle = String(facility.data_en?.title || "").toLowerCase();
  if (!firstFacility || !String(firstFacility.title || "").toLowerCase().includes(expectedTitle)) {
    problems.push("Facility Ordering Data sort edit does not reorder public facility cards.");
  }
}

const hindiBytes = Buffer.byteLength(JSON.stringify({ data: hindi }));
if (hindiBytes > 5_000_000) problems.push(`Hindi bootstrap is too large after compaction: ${hindiBytes} bytes.`);
if (JSON.stringify(hindi).includes('"sharedAssetBlocks"') || JSON.stringify(hindi).includes('"profileStructureHtml"')) {
  problems.push("Hindi bootstrap still contains duplicated legacy structural fields.");
}

console.log(results.join("\n"));
console.log(`\nMapped ${results.length} CMS collections. Hindi bootstrap: ${(hindiBytes / 1024 / 1024).toFixed(2)} MiB raw.`);
if (problems.length) {
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exitCode = 1;
} else {
  console.log("CMS public contract audit passed: every collection has a bilingual or shared public target.");
}
