import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import { assembleBootstrap } from "../server/contentAssembler.js";
import { collections as collectionDefinitions } from "../shared/cmsCollections.js";
import {
  canonicalDivisionSection,
  createLocalizedDivisionBlock,
  divisionBlockPrimarySection,
  divisionBlockSections,
  divisionChildSection,
  divisionRowsForSection,
  divisionSectionFamily,
  findLocalizedDivisionBlockIndex,
} from "../src/data/divisionSectionLabels.js";
import {
  findLegacyImportedTabStrips,
  removeLegacyImportedTabStrips,
} from "../src/data/importedHtmlCleanup.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  `SELECT count(*)::int AS entries,
          count(*) FILTER (WHERE status='published')::int AS published,
          count(*) FILTER (WHERE data_hi <> '{}'::jsonb)::int AS hindi,
          count(DISTINCT collection)::int AS collections
   FROM cms_entries`
);
const users = Number((await client.query("SELECT count(*) AS count FROM cms_users WHERE active=true")).rows[0].count);
const contentRows = (await client.query(
  "SELECT id, collection, entry_key, sort_order, data_en, data_hi, version, updated_at FROM cms_entries WHERE status='published' ORDER BY collection, sort_order, entry_key"
)).rows;
const databaseCollections = [...new Set(contentRows.map((row) => row.collection))];
await client.end();

if (!rows[0].published || !users) throw new Error("CMS has no published content or active admin user.");
const definedCollections = new Set(collectionDefinitions.map((item) => item.id));
const missingEditorSchemas = databaseCollections.filter((collection) => !definedCollections.has(collection));
if (missingEditorSchemas.length) throw new Error(`CMS editor schemas missing for: ${missingEditorSchemas.join(", ")}`);
const english = assembleBootstrap(contentRows, "en");
const hindi = assembleBootstrap(contentRows, "hi");
for (const [language, payload] of [["English", english], ["Hindi", hindi]]) {
  if (payload.officials.length !== payload.leadershipProfiles.length || !payload.officials.length) {
    throw new Error(`${language} official and leadership profile sets are not linked.`);
  }
  payload.officials.forEach((official, index) => {
    const leader = payload.leadershipProfiles[index];
    for (const field of ["name", "role", "designation", "department", "photo"]) {
      if ((official[field] || "") !== (leader[field] || "")) {
        throw new Error(`${language} official/leadership ${index + 1} differs in ${field}.`);
      }
    }
    if ("__cmsUpdatedAt" in official || "__cmsSortOrder" in leader) {
      throw new Error("Internal profile-link metadata leaked into public content.");
    }
  });
}
const divisionPages = english.rsacOfficialSections.find((section) => section.key === "divisions")?.pages || [];
if (canonicalDivisionSection("Publications and Technical Reports") !== "Publications") {
  throw new Error("Combined groundwater publications/report section has the wrong CMS owner.");
}
const expectedDivisionOrder = ["computer-image-processing", "agriculture-resources"];
const actualDivisionOrder = english.divisions.slice(0, 2).map((item) => item.key);
if (JSON.stringify(actualDivisionOrder) !== JSON.stringify(expectedDivisionOrder)) {
  throw new Error(`Division sort mismatch: expected ${expectedDivisionOrder.join(", ")}; received ${actualDivisionOrder.join(", ")}`);
}
if (!divisionPages[0]?.slug?.startsWith("computer-image-processing")) {
  throw new Error("Division page list does not follow CMS division sort order.");
}
const cipdmPage = divisionPages.find((page) => page.slug === "computer-image-processing-division");
const expectedCipdmVideos = [
  "rsac_build_02.mp4",
  "CHARBAGH2.mp4",
  "badshahnagar.mp4",
  "AISHBAGH2.mp4",
];
if (!cipdmPage || expectedCipdmVideos.some((fileName) => !cipdmPage.html?.includes(fileName))) {
  throw new Error("CIPDM 3D-model links must remain MP4 videos instead of JPG poster links.");
}
const cipdmMapBlock = (cipdmPage.blocks || []).find((block) =>
  String(block.value || block.label || "").toLowerCase().replace(/\s+/gu, "").includes("map/photos")
);
const cipdmMediaAssets = cipdmMapBlock?.assets || [];
const cipdmVideoValues = cipdmMediaAssets
  .filter((asset) => asset.kind === "video")
  .map((asset) => String(asset.value || ""));
const expectedCipdmVideoValues = expectedCipdmVideos.map(
  (fileName) => `/official-media/legacy-rsac/rsac_MODEL_vIDEOS/${fileName}`
);
if (
  cipdmVideoValues.length !== expectedCipdmVideoValues.length ||
  expectedCipdmVideoValues.some((value) => !cipdmVideoValues.includes(value))
) {
  throw new Error("CIPDM must expose exactly the four locally mirrored official videos in its CMS section.");
}
const cipdmInteractiveModel = cipdmMediaAssets.find(
  (asset) => asset.value === "/official-media/legacy-rsac/dam/index.html"
);
if (
  !cipdmInteractiveModel ||
  cipdmInteractiveModel.title !== "RSAC-UP 3D Model" ||
  cipdmInteractiveModel.text !== "RSAC-UP 3D Model"
) {
  throw new Error("CIPDM page-turning model must remain a clearly titled local CMS link.");
}
const facilityPages = english.rsacOfficialSections.find((section) => section.key === "facilities")?.pages || [];
if (facilityPages.length !== 10 || facilityPages[0]?.slug !== "computer-and-image-processing-lab1" || facilityPages.at(-1)?.slug !== "service-block1") {
  throw new Error("Facility pages are missing or incorrectly ordered.");
}
const hindiFacilityPages = hindi.rsacOfficialSections.find((section) => section.key === "facilities")?.pages || [];
const hindiSoilLab = hindiFacilityPages.find((page) => page.slug === "soil-analysis-lab1");
const hindiSoilOverview = hindiSoilLab?.blocks?.[0];
const hindiSoilPhotos = (hindiSoilOverview?.children || []).find((child) => child.key === "text-0003");
const hindiSoilMapPhotos = (hindiSoilLab?.blocks || []).find(
  (block) => canonicalDivisionSection(block.sourceLabel || block.value || block.label) === "Map/Photos"
);
if (
  hindiSoilPhotos?.value !== "तस्वीरें" ||
  !hindiSoilPhotos.structural ||
  hindiSoilPhotos.editorVisible !== false
) {
  throw new Error("Soil Analysis Lab duplicate legacy Hindi tabs must remain structural and excluded from the editor.");
}
if (
  !hindiSoilMapPhotos ||
  hindiSoilMapPhotos.label !== "मानचित्र/तस्वीरें" ||
  hindiSoilMapPhotos.editorVisible === false ||
  hindiSoilMapPhotos.controlsSectionLabel === false
) {
  throw new Error("Soil Analysis Lab Hindi Map/Photos heading must be visible and editable in the CMS.");
}
let removedLegacyTabStrips = 0;
for (const [language, payload] of [["English", english], ["Hindi", hindi]]) {
  for (const section of payload.rsacOfficialSections || []) {
    for (const page of section.pages || []) {
      if (!page.html) continue;
      const document = new JSDOM(page.html).window.document;
      const before = findLegacyImportedTabStrips(document).length;
      removedLegacyTabStrips += removeLegacyImportedTabStrips(document);
      if (findLegacyImportedTabStrips(document).length) {
        throw new Error(`${language} ${page.slug} retains a duplicate imported tab strip after cleanup.`);
      }
      if (page.slug === "soil-analysis-lab1" && before !== 1) {
        throw new Error(`${language} Soil Analysis Lab must contain exactly one removable legacy tab strip.`);
      }
    }
  }
}
if (!removedLegacyTabStrips) throw new Error("Legacy imported tab-strip cleanup is not covering any CMS pages.");
if (english.publicInfoPages.length !== 4 || english.policyPages.length !== 7) {
  throw new Error("Public-service or policy page collections are incomplete.");
}
if (english.siteSettings.pageContent?.gallery?.title !== "" || hindi.siteSettings.pageContent?.gallery?.title !== "") {
  throw new Error("Gallery main heading should remain hidden in English and Hindi.");
}
const englishTabs = english.siteSettings.homeSections?.featureTabs || [];
const hindiTabs = hindi.siteSettings.homeSections?.featureTabs || [];
if (englishTabs.length !== 5 || hindiTabs.length !== 5) throw new Error("Homepage must expose five bilingual feature tabs.");
const englishTabTitles = englishTabs.map((item) => item.title).join("|");
if (englishTabTitles !== "Objective|Implementation|Approach|Sphere of Activities|Mobile Apps") {
  throw new Error(`Homepage English feature tabs do not match approved content: ${englishTabTitles}`);
}
const devanagari = /[\u0900-\u097f]/u;
if (englishTabs.some((item) => devanagari.test(item.title || ""))) throw new Error("Hindi text leaked into English homepage tabs.");
if (hindiTabs.some((item) => !devanagari.test(item.title || ""))) throw new Error("Hindi homepage tab translation is missing.");
const englishImpactStats = new Map((english.siteSettings.impactStats || []).map((item) => [item.key, String(item.value || "")]));
for (const item of hindi.siteSettings.impactStats || []) {
  if (englishImpactStats.has(item.key) && englishImpactStats.get(item.key) !== String(item.value || "")) {
    throw new Error(`Impact statistic ${item.key} differs between English (${englishImpactStats.get(item.key)}) and Hindi (${item.value}).`);
  }
}
const hindiTraining = hindi.rsacOfficialSections
  .find((section) => section.key === "divisions")?.pages
  .find((page) => page.slug === "training-division");
if (
  !hindiTraining?.html ||
  (
    !(hindiTraining.blocks || []).some((block) => String(block?.id || "").startsWith("official-")) &&
    !hindiTraining.structureHtml?.includes("List of Research Papers")
  )
) {
  throw new Error("Hindi Training Division is missing a validated content structure.");
}
const sectionBlockSignature = (page) => (page?.blocks || [])
  .filter((block) => block.controlsSectionLabel !== false && !String(block.id || "").startsWith("cms-text-"))
  .map((block) => `${block.label || block.value}:${(block.children || []).length}`);
const englishAcademicTraining = english.rsacOfficialSections
  .find((section) => section.key === "academics")?.pages
  .find((page) => page.slug === "training-division-");
const hindiAcademicTraining = hindi.rsacOfficialSections
  .find((section) => section.key === "academics")?.pages
  .find((page) => page.slug === "training-division-");
const englishTraining = divisionPages.find((page) => page.slug === "training-division");
if (
  JSON.stringify(sectionBlockSignature(englishAcademicTraining)) !== JSON.stringify(sectionBlockSignature(englishTraining))
  || JSON.stringify(sectionBlockSignature(hindiAcademicTraining)) !== JSON.stringify(sectionBlockSignature(hindiTraining))
) {
  throw new Error("Academics Training page does not match canonical Training Division section ownership.");
}
const hindiDivisionPages = hindi.rsacOfficialSections.find((section) => section.key === "divisions")?.pages || [];
const hindiDivisionBySlug = new Map(hindiDivisionPages.map((page) => [page.slug, page]));
const hindiCipdm = hindiDivisionBySlug.get("computer-image-processing-division");
const hindiCipdmMapBlock = (hindiCipdm?.blocks || []).find((block) =>
  (block.children || []).some((child) => child.key === "text-0186")
);
const hindiCipdmDivisionHeading = (hindiCipdmMapBlock?.children || []).find((child) => child.key === "text-0185");
const hindiCipdmRelatedLinks = (hindiCipdmMapBlock?.children || []).find((child) => child.key === "text-0186");
const hindiCipdmRelatedPhotos = (hindiCipdmMapBlock?.children || []).find((child) => child.key === "text-0187");
if (
  hindiCipdmDivisionHeading?.value !== "कंप्यूटर इमेज प्रोसेसिंग डिवीजन" ||
  hindiCipdmDivisionHeading.hidden ||
  hindiCipdmRelatedLinks?.value !== "" ||
  !hindiCipdmRelatedLinks.hidden ||
  !hindiCipdmRelatedLinks.sourceKeys?.includes("text-0205") ||
  hindiCipdmRelatedPhotos?.value !== "संबंधित तस्वीरें" ||
  hindiCipdmRelatedPhotos.hidden ||
  !hindiCipdmRelatedPhotos.sourceKeys?.includes("text-0206")
) {
  throw new Error("CIPDM Hindi media headings do not match the English section structure.");
}
const hindiAgriculture = hindiDivisionBySlug.get("agriculture-resources-division1");
const agricultureScientistBlock = (hindiAgriculture?.blocks || []).find(
  (block) => block.id === "official-agriculture-resources-division1-02"
);
const leakedAgricultureFields = (agricultureScientistBlock?.children || []).filter((child) => {
  const match = String(child.key || "").match(/^text-(\d+)$/);
  return match && Number(match[1]) > 24;
});
if (!agricultureScientistBlock || leakedAgricultureFields.length) {
  throw new Error("Hindi Agriculture Scientific Manpower owns duplicated project or publication fields.");
}
const sectionSequence = (page) => {
  const seen = new Set();
  return (page.blocks || [])
    .map((block) => canonicalDivisionSection(block.sourceLabel || block.label || block.value))
    .map((label) => ["Research Paper Published", "Research Paper/ Articles"].includes(label) ? "Research Papers" : label)
    .filter((label) => label && !seen.has(label) && seen.add(label));
};
const blockOwnersByChildKey = (page) => {
  const owners = new Map();
  for (const block of page.blocks || []) {
    const owner = block.sourceLabel || block.label || block.value || "";
    for (const child of block.children || []) {
      if (child?.key && owner) owners.set(child.key, owner);
    }
  }
  return owners;
};
for (const englishPage of divisionPages) {
  const hindiPage = hindiDivisionBySlug.get(englishPage.slug);
  const hasIndependentOfficialHindi =
    (hindiPage?.blocks || []).some((block) => String(block?.id || "").startsWith("official-"));
  if (!hindiPage?.structureHtml || hindiPage.structureHtml !== englishPage.html) {
    throw new Error(`${englishPage.slug} lacks shared English structural HTML in Hindi mode.`);
  }
  (englishPage.blocks || []).forEach((englishBlock, englishIndex) => {
    const targetSection = divisionBlockPrimarySection(englishBlock);
    if (!targetSection) return;
    const targetFamily = divisionSectionFamily(targetSection);
    const hindiIndex = findLocalizedDivisionBlockIndex(hindiPage, englishBlock, englishIndex);
    if (hindiIndex < 0) {
      const fallbackBlock = createLocalizedDivisionBlock(englishBlock);
      const fallbackPage = { blocks: [...(hindiPage.blocks || []), fallbackBlock] };
      const fallbackIndex = findLocalizedDivisionBlockIndex(fallbackPage, englishBlock, englishIndex);
      if (
        fallbackIndex < 0 ||
        (!divisionRowsForSection(fallbackBlock, englishBlock).length && (englishBlock.children || []).length)
      ) {
        throw new Error(`${englishPage.slug}/${targetSection} cannot create a safe Hindi CMS section.`);
      }
      return;
    }
    const hindiBlock = hindiPage.blocks[hindiIndex];
    const hindiFamilies = new Set(divisionBlockSections(hindiBlock).map(divisionSectionFamily));
    if (!hindiFamilies.has(targetFamily)) {
      throw new Error(`${englishPage.slug}/${targetSection} opens an unrelated Hindi CMS block.`);
    }
    if (
      (englishBlock.children || []).some((child) => !child.hidden) &&
      (hindiBlock.children || []).some((child) => !child.hidden) &&
      !divisionRowsForSection(hindiBlock, englishBlock).some((child) => !child.hidden)
    ) {
      throw new Error(`${englishPage.slug}/${targetSection} exposes no matching Hindi CMS rows.`);
    }
  });
  for (const [language, page] of [["English", englishPage], ["Hindi", hindiPage]]) {
    for (const block of page.blocks || []) {
      for (const child of block.children || []) {
        const childSection = divisionChildSection(child);
        const groupSection = canonicalDivisionSection(child.groupLabel);
        if (
          childSection &&
          groupSection &&
          divisionSectionFamily(childSection) !== divisionSectionFamily(groupSection)
        ) {
          throw new Error(`${englishPage.slug}/${language} has ${groupSection} metadata inside ${childSection}.`);
        }
      }
    }
  }
  const hindiCmsOwners = new Map();
  for (const block of hindiPage.blocks || []) {
    for (const child of block.children || []) {
      if (String(child.key || "").startsWith("cms-")) {
        hindiCmsOwners.set(child.key, child.sectionKey || divisionBlockPrimarySection(block));
      }
    }
  }
  for (const block of englishPage.blocks || []) {
    for (const child of block.children || []) {
      if (!String(child.key || "").startsWith("cms-")) continue;
      if (!hindiCmsOwners.has(child.key)) {
        throw new Error(`${englishPage.slug}/${child.key} exists in English CMS only.`);
      }
      const englishOwner = divisionSectionFamily(child.sectionKey || divisionBlockPrimarySection(block));
      const hindiOwner = divisionSectionFamily(hindiCmsOwners.get(child.key));
      if (englishOwner && hindiOwner && englishOwner !== hindiOwner) {
        throw new Error(`${englishPage.slug}/${child.key} belongs to different English and Hindi sections.`);
      }
    }
  }
  if (hindiPage.html?.includes("data-rsac-shared-media")) {
    throw new Error(`${englishPage.slug} appends shared media at page end instead of its owning section.`);
  }
  const englishSections = sectionSequence(englishPage);
  const hindiSections = sectionSequence(hindiPage);
  if (
    !hasIndependentOfficialHindi &&
    JSON.stringify(englishSections) !== JSON.stringify(hindiSections)
  ) {
    throw new Error(`${englishPage.slug} section mismatch: English [${englishSections.join(", ")}], Hindi [${hindiSections.join(", ")}].`);
  }
  const englishOwners = blockOwnersByChildKey(englishPage);
  const hindiOwners = blockOwnersByChildKey(hindiPage);
  if (!hasIndependentOfficialHindi) {
    for (const [key, owner] of englishOwners) {
      if (hindiOwners.has(key) && hindiOwners.get(key) !== owner) {
        throw new Error(`${englishPage.slug}/${key} belongs to ${owner} in English but ${hindiOwners.get(key)} in Hindi.`);
      }
    }
  }
  const managedKeys = new Set([
    ...Object.keys(englishPage.managedSectionItems || {}),
    ...Object.keys(hindiPage.managedSectionItems || {}),
  ]);
  for (const key of managedKeys) {
    if ((englishPage.managedSectionItems?.[key]?.length || 0) !== (hindiPage.managedSectionItems?.[key]?.length || 0)) {
      throw new Error(`${englishPage.slug}/${key} managed-item count differs between English and Hindi.`);
    }
  }
}
const organisationRoles = hindi.siteSettings.organisationChart?.roles || [];
if (organisationRoles.length < 10 || organisationRoles.some((role) => !role.roleKey)) {
  throw new Error("Organisation chart roles are missing or lack shared role keys.");
}
const contactDisplay = english.siteSettings.pageDisplaySettings?.find((item) => item.path === "/contact");
if (!contactDisplay?.hideTitle || contactDisplay.headingSize !== "large") {
  throw new Error("Contact page heading display control is missing.");
}
const geoportalDisplay = english.siteSettings.pageDisplaySettings?.find((item) => item.path === "/geoportals");
if (geoportalDisplay?.eyebrowSize !== "large") {
  throw new Error("Geoportal small-heading size control is missing.");
}
for (const display of english.siteSettings.pageDisplaySettings || []) {
  if (display.eyebrowSize && !["compact", "normal", "large"].includes(display.eyebrowSize)) {
    throw new Error(`${display.path || display.key} has an invalid small-heading size.`);
  }
}
const design = english.siteSettings.designSettings || {};
if (!design.bodyFont || !design.headingFont || !design.hindiFont || design.baseFontSize < 14 || design.baseFontSize > 20) {
  throw new Error("Safe global typography settings are missing or invalid.");
}
const allowedHomeTypographySizes = new Set(["compact", "normal", "large"]);
const englishHomeTypography = english.siteSettings.homeSectionTypography || {};
const hindiHomeTypography = hindi.siteSettings.homeSectionTypography || {};
if (JSON.stringify(englishHomeTypography) !== JSON.stringify(hindiHomeTypography)) {
  throw new Error("Shared homepage typography differs between English and Hindi.");
}
for (const [sectionKey, section] of Object.entries(englishHomeTypography)) {
  for (const property of ["eyebrowSize", "headingSize", "bodySize"]) {
    if (section?.[property] && !allowedHomeTypographySizes.has(section[property])) {
      throw new Error(`${sectionKey}.${property} has an invalid homepage typography size.`);
    }
  }
}
if (english.siteSettings.location?.eyebrowSize !== undefined || hindi.siteSettings.location?.eyebrowSize !== undefined) {
  throw new Error("Legacy location eyebrow sizing conflicts with canonical homepage typography.");
}
console.log(`Custom CMS valid: ${rows[0].entries} entries, ${rows[0].published} published, ${rows[0].hindi} bilingual, ${rows[0].collections} populated collections; sort, five-tab and all-division bilingual contracts passed.`);
