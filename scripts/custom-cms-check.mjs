import { config as loadEnv } from "dotenv";
import pg from "pg";
import { assembleBootstrap } from "../server/contentAssembler.js";
import { collections as collectionDefinitions } from "../shared/cmsCollections.js";

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
const divisionPages = english.rsacOfficialSections.find((section) => section.key === "divisions")?.pages || [];
const expectedDivisionOrder = ["computer-image-processing", "agriculture-resources"];
const actualDivisionOrder = english.divisions.slice(0, 2).map((item) => item.key);
if (JSON.stringify(actualDivisionOrder) !== JSON.stringify(expectedDivisionOrder)) {
  throw new Error(`Division sort mismatch: expected ${expectedDivisionOrder.join(", ")}; received ${actualDivisionOrder.join(", ")}`);
}
if (!divisionPages[0]?.slug?.startsWith("computer-image-processing")) {
  throw new Error("Division page list does not follow CMS division sort order.");
}
const facilityPages = english.rsacOfficialSections.find((section) => section.key === "facilities")?.pages || [];
if (facilityPages.length !== 10 || facilityPages[0]?.slug !== "computer-and-image-processing-lab1" || facilityPages.at(-1)?.slug !== "service-block1") {
  throw new Error("Facility pages are missing or incorrectly ordered.");
}
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
const hindiTraining = hindi.rsacOfficialSections
  .find((section) => section.key === "divisions")?.pages
  .find((page) => page.slug === "training-division");
if (!hindiTraining?.structureHtml?.includes("List of Research Papers")) {
  throw new Error("Hindi Training Division is missing English structural HTML for tab parity.");
}
const organisationRoles = hindi.siteSettings.organisationChart?.roles || [];
if (organisationRoles.length < 10 || organisationRoles.some((role) => !role.roleKey)) {
  throw new Error("Organisation chart roles are missing or lack shared role keys.");
}
const contactDisplay = english.siteSettings.pageDisplaySettings?.find((item) => item.path === "/contact");
if (!contactDisplay?.hideTitle || contactDisplay.headingSize !== "large") {
  throw new Error("Contact page heading display control is missing.");
}
const design = english.siteSettings.designSettings || {};
if (!design.bodyFont || !design.headingFont || !design.hindiFont || design.baseFontSize < 14 || design.baseFontSize > 20) {
  throw new Error("Safe global typography settings are missing or invalid.");
}
console.log(`Custom CMS valid: ${rows[0].entries} entries, ${rows[0].published} published, ${rows[0].hindi} bilingual, ${rows[0].collections} populated collections; sort and five-tab contracts passed.`);
