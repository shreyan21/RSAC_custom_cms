import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiBase = String(process.env.CMS_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const loadBootstrap = async (language) => {
  const response = await fetch(`${apiBase}/api/content/bootstrap?lang=${language}`);
  if (!response.ok) throw new Error(`CMS API returned ${response.status} for ${language}.`);
  return (await response.json()).data;
};

const [english, hindi] = await Promise.all([
  loadBootstrap("en"),
  loadBootstrap("hi"),
]);

const aboutSlugs = [
  "read-more-about-us",
  "en-visitors-book",
  "organisational-chart",
  "our-chairman's-governing-body",
  "director's",
  "our-former",
  "scientific-manpower",
  "administrative-and-auxiliary-staff",
];
const publicInfoSlugs = [
  "rti",
  "appellate-authority",
  "memorandum-of-association",
  "general-service-rules",
  "feedback",
  "tenders",
  "faq",
];
const officialPolicySlugs = [
  "terms-and-conditions",
  "copyright-policy",
  "privacy-policy",
  "hyperlinking-policy",
  "disclaimer",
  "help",
];
const featureKeys = [
  "objective",
  "implementation",
  "approach",
  "sphere-of-activities",
  "mobile-apps",
];

for (const [language, bootstrap] of [["English", english], ["Hindi", hindi]]) {
  const about = bootstrap.rsacOfficialSections.find((section) => section.key === "about-us");
  assert(about, `${language}: About Us collection is missing.`);
  for (const slug of aboutSlugs) {
    const page = about?.pages?.find((item) => item.slug === slug);
    assert(page, `${language}: About Us page "${slug}" is missing.`);
    assert(page?.title?.trim(), `${language}: About Us page "${slug}" has no title.`);
    assert(page?.blocks?.length > 0, `${language}: About Us page "${slug}" has no CMS blocks.`);
  }

  for (const slug of publicInfoSlugs) {
    const page = bootstrap.publicInfoPages.find((item) => item.slug === slug);
    assert(page, `${language}: public-service page "${slug}" is missing.`);
    assert(page?.title?.trim(), `${language}: public-service page "${slug}" has no title.`);
  }

  for (const slug of officialPolicySlugs) {
    const page = bootstrap.policyPages.find((item) => item.slug === slug);
    assert(page, `${language}: policy page "${slug}" is missing.`);
    assert(page?.sections?.length > 0, `${language}: policy page "${slug}" has no CMS content.`);
    assert(
      page?.sections?.some((section) => String(section.body || "").replace(/<[^>]+>/g, "").trim()),
      `${language}: policy page "${slug}" has empty CMS text.`
    );
  }

  const features = bootstrap.siteSettings?.homeSections?.featureTabs || [];
  for (const key of featureKeys) {
    const feature = features.find((item) => item.key === key);
    assert(feature, `${language}: homepage tab "${key}" is missing.`);
    assert(feature?.title?.trim(), `${language}: homepage tab "${key}" has no editable title.`);
  }

  const vision = bootstrap.siteSettings?.pageContent?.visionMission;
  assert(vision?.objectives?.length === 9, `${language}: official Objectives content is incomplete.`);
  assert(vision?.implementation?.length === 2, `${language}: official Implementation content is incomplete.`);
  assert(vision?.approach?.length === 3, `${language}: official Approach content is incomplete.`);
  assert(vision?.sphere?.length === 9, `${language}: official Sphere of Activities content is incomplete.`);
  assert(bootstrap.contactDetails?.address?.trim(), `${language}: contact address is missing.`);
  assert(bootstrap.contactDetails?.contacts?.length >= 2, `${language}: contact table is incomplete.`);
}

for (const slug of publicInfoSlugs) {
  const enPage = english.publicInfoPages.find((item) => item.slug === slug);
  const hiPage = hindi.publicInfoPages.find((item) => item.slug === slug);
  assert(
    (enPage?.sections?.length || 0) === (hiPage?.sections?.length || 0),
    `${slug}: English and Hindi section counts differ.`
  );
}

const rtiMenu = english.menuItems.find((item) => item.path === "/rti");
for (const route of [
  "/rti",
  "/appellate-authority",
  "/memorandum-of-association",
  "/general-service-rules",
]) {
  assert(rtiMenu?.links?.some((item) => item.path === route), `RTI menu is missing "${route}".`);
}

const localDocuments = [];
for (const bootstrap of [english, hindi]) {
  for (const page of bootstrap.publicInfoPages) {
    for (const section of page.sections || []) {
      for (const document of section.documents || []) {
        if (!document.url) continue;
        assert(
          document.url.startsWith("/official-media/"),
          `${bootstrap.language}/${page.slug}: document is not local (${document.url}).`
        );
        if (document.url.startsWith("/official-media/")) localDocuments.push(document.url);
      }
    }
  }
}

for (const documentUrl of new Set(localDocuments)) {
  const filePath = path.join(projectRoot, "public", ...documentUrl.split("/").filter(Boolean));
  try {
    await access(filePath);
  } catch {
    failures.push(`Local document file is missing: ${documentUrl}`);
  }
}

if (failures.length) {
  console.error("Official core-content audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Official core-content audit passed: ${aboutSlugs.length} About pages, `
    + `${publicInfoSlugs.length} public-service pages, ${officialPolicySlugs.length} official policies, `
    + `${featureKeys.length} homepage tabs, and ${new Set(localDocuments).size} local documents checked in both languages.`
  );
}
