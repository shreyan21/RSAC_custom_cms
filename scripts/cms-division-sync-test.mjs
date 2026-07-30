import { pool } from "../server/db.js";
import { assembleBootstrap } from "../server/contentAssembler.js";
import {
  divisionMatchesPage,
  syncDivisionPage,
  syncDivisionStatusFromPage,
} from "../server/divisionPageSync.js";
import {
  hasMatchingSection,
  projectSection,
  publicationSection,
} from "../admin/src/divisionSectionCounts.js";

const client = await pool.connect();

const publishedRows = async () => (
  await client.query(
    `SELECT id, collection, entry_key, sort_order, data_en, data_hi, version, updated_at,
            (SELECT max(updated_at) FROM cms_entries) AS content_version
       FROM cms_entries
      WHERE status='published'
      ORDER BY collection, sort_order, entry_key`
  )
).rows;

const hasDivisionPage = (bootstrap, slug) => bootstrap.rsacOfficialSections
  .find((section) => section.key === "divisions")?.pages
  .some((page) => page.slug === slug);

try {
  await client.query("BEGIN");
  const divisions = (await client.query(
    "SELECT * FROM cms_entries WHERE collection='divisions' AND status='published' ORDER BY sort_order, entry_key FOR UPDATE"
  )).rows;
  const pages = (await client.query(
    "SELECT * FROM cms_entries WHERE collection='pages' AND status='published' AND data_en->>'sectionKey'='divisions' ORDER BY sort_order, entry_key FOR UPDATE"
  )).rows;
  const division = divisions.find((candidate) =>
    pages.some((pageCandidate) => divisionMatchesPage(candidate, pageCandidate))
  );
  const page = pages.find((candidate) => divisionMatchesPage(division, candidate));
  const targetSlug = page?.data_en?.slug || page?.entry_key;
  if (!division || !page || !targetSlug) {
    throw new Error("No published division card/page pair is available for the sync test.");
  }

  const initialBootstrap = assembleBootstrap(await publishedRows(), "en");
  if (!hasDivisionPage(initialBootstrap, targetSlug)) {
    throw new Error(`Published division page ${targetSlug} is missing.`);
  }

  const draftedDivision = (await client.query(
    "UPDATE cms_entries SET status='draft', sort_order=$2, version=version+1 WHERE id=$1 RETURNING *",
    [division.id, Number(division.sort_order) + 100]
  )).rows[0];
  await syncDivisionPage(client, draftedDivision);
  const draftedPage = (await client.query(
    "SELECT * FROM cms_entries WHERE id=$1",
    [page.id]
  )).rows[0];
  if (draftedPage.status !== "draft") throw new Error("Draft division did not draft its page.");
  if (Number(draftedPage.sort_order) !== Number(draftedDivision.sort_order)) {
    throw new Error("Changing a division display order did not update its page.");
  }
  if (hasDivisionPage(assembleBootstrap(await publishedRows(), "en"), targetSlug)) {
    throw new Error(`Draft division ${targetSlug} is still visible on the website.`);
  }

  const publishedPage = (await client.query(
    "UPDATE cms_entries SET status='published', sort_order=$2, version=version+1 WHERE id=$1 RETURNING *",
    [page.id, Number(page.sort_order) + 200]
  )).rows[0];
  await syncDivisionStatusFromPage(client, publishedPage);
  const publishedDivision = (await client.query(
    "SELECT * FROM cms_entries WHERE id=$1",
    [division.id]
  )).rows[0];
  if (publishedDivision.status !== "published") {
    throw new Error("Publishing a division page did not publish its card.");
  }
  if (Number(publishedDivision.sort_order) !== Number(publishedPage.sort_order)) {
    throw new Error("Changing a division page display order did not update its card.");
  }
  if (!hasDivisionPage(assembleBootstrap(await publishedRows(), "en"), targetSlug)) {
    throw new Error(`Republished division ${targetSlug} did not return to the website.`);
  }

  const facilityDatabaseOrder = (await client.query(
    `SELECT data_en->>'slug' AS slug
       FROM cms_entries
      WHERE collection='pages'
        AND status='published'
        AND data_en->>'sectionKey'='facilities'
      ORDER BY sort_order, entry_key`
  )).rows.map((row) => row.slug);
  const facilityWebsiteOrder = assembleBootstrap(await publishedRows(), "en")
    .rsacOfficialSections
    .find((section) => section.key === "facilities")
    ?.pages.map((facilityPage) => facilityPage.slug) || [];
  if (JSON.stringify(facilityDatabaseOrder) !== JSON.stringify(facilityWebsiteOrder)) {
    throw new Error("Facility page display order in CMS does not match the public website.");
  }

  const divisionPages = (await client.query(
    "SELECT data_en, data_hi, status FROM cms_entries WHERE collection='pages' AND data_en->>'sectionKey'='divisions'"
  )).rows;
  const projectCount = divisionPages.filter((entry) =>
    hasMatchingSection(entry, projectSection)
  ).length;
  const publicationCount = divisionPages.filter((entry) =>
    hasMatchingSection(entry, publicationSection)
  ).length;
  if (!projectCount || !publicationCount) {
    throw new Error(
      `Derived division counters are invalid: ${projectCount} projects, ${publicationCount} publications.`
    );
  }

  console.log(
    `Division sync passed with ${targetSlug}; ${facilityWebsiteOrder.length} facilities follow CMS display order; derived CMS cards find ${projectCount} project pages and ${publicationCount} publication/report pages.`
  );
} finally {
  await client.query("ROLLBACK").catch(() => {});
  client.release();
  await pool.end();
}
