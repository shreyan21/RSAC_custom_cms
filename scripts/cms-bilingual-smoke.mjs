import { config as loadEnv } from "dotenv";
import { assembleBootstrap } from "../server/contentAssembler.js";
import { validateEntryPayload } from "../server/contentValidation.js";

loadEnv({ path: ".env.local", quiet: true });
const base = process.env.VITE_API_URL || "http://localhost:3000";
let cookie = "";
let csrf = "";

const divisionItemPayload = {
  status: "published",
  dataEn: {
    divisionSlug: "training-division",
    sectionKey: "research-papers",
    title: "Newest structured research paper",
    authors: "Test Author",
    publicationName: "Test Journal",
    details: "Structured English citation",
    year: 2026,
    date: "2026-07-12",
    documentUrl: "/cms-media/test-paper.pdf",
    externalUrl: "https://example.gov.in/paper",
  },
  dataHi: { title: "नवीनतम संरचित शोध पत्र", details: "संरचित हिन्दी विवरण" },
};

let rejectedMissingHindi = false;
try {
  validateEntryPayload("division_section_items", { ...divisionItemPayload, dataHi: {} });
} catch (error) {
  rejectedMissingHindi = /required in Hindi/.test(error.message);
}
if (!rejectedMissingHindi) throw new Error("Published division items allowed a missing Hindi title.");
const blankHeading = validateEntryPayload("page_display_settings", { status: "published", dataEn: { path: "/verify-blank-heading", title: "", hideTitle: false }, dataHi: {} });
if (!blankHeading.dataEn.hideTitle) throw new Error("Blank CMS page heading did not become hidden.");
const validatedDivisionItem = validateEntryPayload("division_section_items", divisionItemPayload);
if (validatedDivisionItem.dataEn.divisionSlug !== "training-division" || validatedDivisionItem.dataHi.title !== divisionItemPayload.dataHi.title) {
  throw new Error("Structured division item validation changed bilingual or shared fields.");
}

const fakeRows = [
  { id: "section", collection: "page_sections", entry_key: "divisions", sort_order: 0, data_en: { key: "divisions", title: "Divisions" }, data_hi: { title: "प्रभाग" } },
  { id: "page", collection: "pages", entry_key: "training", sort_order: 0, data_en: { slug: "training-division", sectionKey: "divisions", title: "Training Division", html: "<p>Existing content</p>" }, data_hi: { title: "प्रशिक्षण प्रभाग", html: "<p>मौजूदा सामग्री</p>" } },
  { id: "new", collection: "division_section_items", entry_key: "new-paper", sort_order: -2, data_en: divisionItemPayload.dataEn, data_hi: divisionItemPayload.dataHi },
  { id: "old", collection: "division_section_items", entry_key: "old-paper", sort_order: -1, data_en: { ...divisionItemPayload.dataEn, title: "Older structured research paper" }, data_hi: { ...divisionItemPayload.dataHi, title: "पुराना संरचित शोध पत्र" } },
];
const assembledEnglish = assembleBootstrap(fakeRows, "en");
const assembledHindi = assembleBootstrap(fakeRows, "hi");
const englishManaged = assembledEnglish.rsacOfficialSections[0].pages[0].managedSectionItems["research-papers"];
const hindiManaged = assembledHindi.rsacOfficialSections[0].pages[0].managedSectionItems["research-papers"];
if (englishManaged[0].title !== divisionItemPayload.dataEn.title || hindiManaged[0].title !== divisionItemPayload.dataHi.title) {
  throw new Error("Division items were not assembled newest-first with separate English/Hindi text.");
}

const request = async (path, options = {}) => {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(csrf && options.method && options.method !== "GET" ? { "X-CSRF-Token": csrf } : {}) };
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${path} failed (${response.status})`);
  return { payload, response };
};

const login = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username: process.env.CMS_ADMIN_USERNAME, password: process.env.CMS_ADMIN_PASSWORD }),
});
cookie = login.response.headers.get("set-cookie")?.split(";")[0] || "";
csrf = login.payload.csrfToken;
if (!cookie || !csrf) throw new Error("CMS login did not return a secure session.");
const users = (await request("/api/admin/users")).payload.data;
if (!Array.isArray(users) || !users.some((user) => user.role === "admin" && user.active)) {
  throw new Error("Multi-user administration endpoint did not return an active administrator.");
}
const collectionDefinitions = (await request("/api/admin/collections")).payload.data;
const divisionListDefinition = collectionDefinitions.find((item) => item.id === "division_section_items");
const divisionField = divisionListDefinition?.fields?.find((field) => field.name === "divisionSlug");
const sectionField = divisionListDefinition?.fields?.find((field) => field.name === "sectionKey");
if (!divisionListDefinition?.autoNewestFirst || divisionField?.type !== "select" || sectionField?.type !== "select") {
  throw new Error("CMS portal does not expose structured division and section form controls.");
}

const entries = (await request("/api/admin/content/impact_stats")).payload.data;
const original = structuredClone(entries.find((item) => item.status === "published"));
if (!original?.entryKey) throw new Error("Admin entryKey contract is missing.");
const testEn = `${original.dataEn.label} [CMS VERIFY]`;
const testHi = `${original.dataHi.label} परीक्षण`;
let updated = null;
let facilityOriginal = null;
let facilityUpdated = null;
let divisionPageOriginal = null;
let divisionPageUpdated = null;
let verificationError = null;

try {
  const draft = structuredClone(original);
  draft.dataEn.label = testEn;
  draft.dataHi.label = testHi;
  updated = (await request(`/api/admin/content/impact_stats/${draft.id}`, { method: "PUT", body: JSON.stringify(draft) })).payload.data;
  const english = (await request("/api/content/impact_stats?lang=en")).payload.data;
  const hindi = (await request("/api/content/impact_stats?lang=hi")).payload.data;
  if (!english.some((item) => item.label === testEn) || !hindi.some((item) => item.label === testHi)) {
    throw new Error("English/Hindi public content did not reflect the CMS edit.");
  }
  const pages = (await request("/api/admin/content/pages")).payload.data;
  facilityOriginal = structuredClone(pages.find((item) => item.status === "published" && item.dataEn.sectionKey === "facilities"));
  if (!facilityOriginal) throw new Error("Facility page collection is empty.");
  const facilityDraft = structuredClone(facilityOriginal);
  facilityDraft.dataEn.title = `${facilityOriginal.dataEn.title} [FACILITY VERIFY]`;
  facilityDraft.dataHi.title = `${facilityOriginal.dataHi.title} परीक्षण`;
  const facilityEnglishBlock = facilityDraft.dataEn.blocks?.find((block) => block.children?.length);
  const facilityRowKey = facilityEnglishBlock?.children?.[0]?.key;
  const facilityHindiBlock = facilityDraft.dataHi.blocks?.find((block) => block.children?.some((child) => child.key === facilityRowKey));
  if (!facilityRowKey || !facilityHindiBlock) throw new Error("Facility section rows are not aligned between English and Hindi.");
  facilityEnglishBlock.children[0].value = `${facilityEnglishBlock.children[0].value} [ROW VERIFY]`;
  const facilityHindiRow = facilityHindiBlock.children.find((child) => child.key === facilityRowKey);
  facilityHindiRow.value = `${facilityHindiRow.value} पंक्ति-परीक्षण`;
  facilityUpdated = (await request(`/api/admin/content/pages/${facilityDraft.id}`, { method: "PUT", body: JSON.stringify(facilityDraft) })).payload.data;
  const facilityEnglish = (await request("/api/content/bootstrap?lang=en")).payload.data.rsacOfficialSections.find((section) => section.key === "facilities")?.pages;
  const facilityHindi = (await request("/api/content/bootstrap?lang=hi")).payload.data.rsacOfficialSections.find((section) => section.key === "facilities")?.pages;
  if (!facilityEnglish?.some((item) => item.title === facilityDraft.dataEn.title) || !facilityHindi?.some((item) => item.title === facilityDraft.dataHi.title)) {
    throw new Error("Facility CMS edit did not reach English and Hindi website payloads.");
  }
  const facilityEnglishSaved = facilityEnglish.find((item) => item.slug === facilityDraft.dataEn.slug);
  const facilityHindiSaved = facilityHindi.find((item) => item.slug === facilityDraft.dataEn.slug);
  if (!facilityEnglishSaved?.blocks?.some((block) => block.children?.some((child) => child.value?.endsWith("[ROW VERIFY]"))) || !facilityHindiSaved?.blocks?.some((block) => block.children?.some((child) => child.value?.endsWith("पंक्ति-परीक्षण")))) {
    throw new Error("Focused facility section row did not persist separately in English and Hindi.");
  }
  divisionPageOriginal = structuredClone(pages.find((item) => item.entryKey === "computer-image-processing-division"));
  const divisionDraft = structuredClone(divisionPageOriginal);
  const englishSoftware = divisionDraft.dataEn.blocks?.find((block) => block.children?.some((child) => /^Software\s/u.test(child.label || "")));
  const hindiSoftware = divisionDraft.dataHi.blocks?.[divisionDraft.dataEn.blocks.indexOf(englishSoftware)];
  if (!englishSoftware?.children?.[0] || !hindiSoftware?.children?.[0]) throw new Error("Focused division section fields are missing.");
  englishSoftware.children[0].value = `${englishSoftware.children[0].value} [SECTION VERIFY]`;
  hindiSoftware.children[0].value = `${hindiSoftware.children[0].value} परीक्षण`;
  englishSoftware.children[1].hidden = true;
  hindiSoftware.children[1].hidden = true;
  englishSoftware.children.unshift({ key: "cms-smoke-new-line", label: "Software -> New line", value: "Newest software test line", isNew: true });
  hindiSoftware.children.unshift({ key: "cms-smoke-new-line", label: "सॉफ्टवेयर -> नई पंक्ति", value: "नवीनतम सॉफ्टवेयर परीक्षण पंक्ति", isNew: true });
  divisionPageUpdated = (await request(`/api/admin/content/pages/${divisionDraft.id}`, { method: "PUT", body: JSON.stringify(divisionDraft) })).payload.data;
  const updatedEnglishPage = (await request("/api/content/bootstrap?lang=en")).payload.data.rsacOfficialSections.flatMap((section) => section.pages || []).find((page) => page.slug === "computer-image-processing-division");
  const updatedHindiPage = (await request("/api/content/bootstrap?lang=hi")).payload.data.rsacOfficialSections.flatMap((section) => section.pages || []).find((page) => page.slug === "computer-image-processing-division");
  const updatedEnglishSoftware = updatedEnglishPage.blocks.find((block) => block.children?.some((child) => child.key === "cms-smoke-new-line"));
  const updatedHindiSoftware = updatedHindiPage.blocks.find((block) => block.children?.some((child) => child.key === "cms-smoke-new-line"));
  if (updatedEnglishSoftware?.children?.[0]?.value !== "Newest software test line" || updatedHindiSoftware?.children?.[0]?.value !== "नवीनतम सॉफ्टवेयर परीक्षण पंक्ति") {
    throw new Error("Focused division section add-at-top did not persist separately in English and Hindi.");
  }
  if (!updatedEnglishSoftware.children.some((child) => child.value?.endsWith("[SECTION VERIFY]")) || !updatedHindiSoftware.children.some((child) => child.value?.endsWith("परीक्षण")) || !updatedEnglishSoftware.children.some((child) => child.hidden) || !updatedHindiSoftware.children.some((child) => child.hidden)) {
    throw new Error("Focused division section edit/remove state did not persist separately in English and Hindi.");
  }
} catch (error) {
  verificationError = error;
} finally {
  if (updated) {
    const restore = { ...updated, entryKey: original.entryKey, dataEn: original.dataEn, dataHi: original.dataHi, status: original.status, sortOrder: original.sortOrder };
    const restored = (await request(`/api/admin/content/impact_stats/${original.id}`, { method: "PUT", body: JSON.stringify(restore) })).payload.data;
    if (restored.entryKey !== original.entryKey) throw new Error("Internal key changed during restoration.");
  }
  if (facilityUpdated && facilityOriginal) {
    const restoreFacility = { ...facilityUpdated, entryKey: facilityOriginal.entryKey, dataEn: facilityOriginal.dataEn, dataHi: facilityOriginal.dataHi, status: facilityOriginal.status, sortOrder: facilityOriginal.sortOrder };
    await request(`/api/admin/content/pages/${facilityOriginal.id}`, { method: "PUT", body: JSON.stringify(restoreFacility) });
  }
  if (divisionPageUpdated && divisionPageOriginal) {
    const restoreDivisionPage = { ...divisionPageUpdated, entryKey: divisionPageOriginal.entryKey, dataEn: divisionPageOriginal.dataEn, dataHi: divisionPageOriginal.dataHi, status: divisionPageOriginal.status, sortOrder: divisionPageOriginal.sortOrder };
    await request(`/api/admin/content/pages/${divisionPageOriginal.id}`, { method: "PUT", body: JSON.stringify(restoreDivisionPage) });
  }
  await request("/api/auth/logout", { method: "POST" });
}

if (verificationError) throw verificationError;
const englishBootstrap = (await request("/api/content/bootstrap?lang=en")).payload.data;
const hindiBootstrap = (await request("/api/content/bootstrap?lang=hi")).payload.data;
const contentVersion = (await request("/api/content/version")).payload.version;
if (!contentVersion || contentVersion !== englishBootstrap.contentVersion) throw new Error("Website change-version endpoint does not match bootstrap content.");
const facilityPages = englishBootstrap.rsacOfficialSections.find((section) => section.key === "facilities")?.pages || [];
if (facilityPages.length !== 10 || facilityPages[0]?.slug !== "computer-and-image-processing-lab1" || facilityPages.at(-1)?.slug !== "service-block1") {
  throw new Error("CMS does not expose all ten facility pages in expected order.");
}
if (englishBootstrap.siteSettings.pageContent?.gallery?.title !== "" || hindiBootstrap.siteSettings.pageContent?.gallery?.title !== "") {
  throw new Error("Requested Gallery heading removal is not active in both languages.");
}
const expectedDivisionKeys = ["computer-image-processing", "agriculture-resources"];
if (JSON.stringify(englishBootstrap.divisions.slice(0, 2).map((item) => item.key)) !== JSON.stringify(expectedDivisionKeys)) {
  throw new Error("Live website bootstrap ignored CMS division sort order.");
}
if (englishBootstrap.siteSettings.homeSections.featureTabs.length !== 5 || hindiBootstrap.siteSettings.homeSections.featureTabs.length !== 5) {
  throw new Error("Live website bootstrap did not expose five bilingual homepage tabs.");
}
const hindiTraining = hindiBootstrap.rsacOfficialSections
  .find((section) => section.key === "divisions")?.pages
  .find((page) => page.slug === "training-division");
if (!hindiTraining?.structureHtml?.includes("List of Research Papers")) {
  throw new Error("Live Hindi Training Division lacks structural tab parity.");
}
const findCipdmPage = (bootstrap) => bootstrap.rsacOfficialSections
  .flatMap((section) => section.pages || [])
  .find((page) => page.slug === "computer-image-processing-division");
const englishCipdmResearch = findCipdmPage(englishBootstrap)?.blocks
  ?.find((block) => block.editorMode === "numbered_list");
const hindiCipdmResearch = findCipdmPage(hindiBootstrap)?.blocks
  ?.find((block) => block.editorMode === "numbered_list");
if ((englishCipdmResearch?.children || []).length < 20 || (hindiCipdmResearch?.children || []).length < 20) {
  throw new Error("CIPDM research papers are not exposed as structured CMS rows in both languages.");
}
if (!hindiCipdmResearch.children.some((item) => /[\u0900-\u097f]/u.test(item.value || ""))) {
  throw new Error("CIPDM Hindi research rows do not contain separate Hindi content.");
}
if ((hindiBootstrap.siteSettings.organisationChart?.roles || []).length < 10) {
  throw new Error("Live organisation chart roles are missing.");
}
const contactDisplay = englishBootstrap.siteSettings.pageDisplaySettings?.find((item) => item.path === "/contact");
if (!contactDisplay?.hideTitle || !englishBootstrap.siteSettings.designSettings?.bodyFont) {
  throw new Error("Live page-heading or typography controls are missing.");
}
console.log("CMS bilingual save, focused division/facility sections, facilities, instant versioning, blank headings, structured division forms/order and research rows, users, homepage tabs, organisation chart, and typography smoke tests passed; temporary edits were restored.");
