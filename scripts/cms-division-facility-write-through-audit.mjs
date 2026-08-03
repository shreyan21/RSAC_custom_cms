import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { assembleBootstrap } from "../server/contentAssembler.js";
import { validateEntryPayload } from "../server/contentValidation.js";
import { repairDivisionPageConsistency } from "../server/divisionPageSync.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const pageSections = new Set(["divisions", "facilities"]);
const localizedPageFields = ["title", "eyebrow", "summary"];
const sharedPageSamples = {
  featuredImage: "/official-media/cms-write-through-audit.webp",
  cardIcon: "satellite",
  cardColor: "#13579b",
  cardColor2: "#2468ac",
  eyebrowSize: "large",
  headingSize: "compact",
  contentSize: "large",
  pageFont: "Inter",
  headingFont: "Plus Jakarta Sans",
  bodyFontSize: 17,
  headingFontSize: 42,
  eyebrowFontSize: 15,
  contentWidth: "wide",
  mediaSize: "large",
  contentSpacing: "relaxed",
  hiddenProfileNames: ["CMS WRITE THROUGH AUDIT"],
};

const marker = (...parts) => `CMS_WRITE_${parts.join("_").replace(/[^a-z0-9]+/giu, "_").toUpperCase()}`;
const clone = (value) => structuredClone(value || {});
const publicRows = async (client) => (
  await client.query(
    `SELECT id, collection, entry_key, sort_order, data_en, data_hi, version, updated_at,
            (SELECT max(updated_at) FROM cms_entries) AS content_version
       FROM cms_entries
      WHERE status='published'
      ORDER BY collection, sort_order, entry_key`
  )
).rows;

const pageFrom = (bootstrap, sectionKey, slug) => bootstrap.rsacOfficialSections
  .find((section) => section.key === sectionKey)?.pages
  .find((page) => page.slug === slug);

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

let pageCount = 0;
let localizedFieldCount = 0;
let sharedFieldCount = 0;
let sectionCount = 0;
let divisionCardCount = 0;

try {
  await client.query("BEGIN");
  await repairDivisionPageConsistency(client);
  const pages = (await client.query(
    `SELECT *
       FROM cms_entries
      WHERE collection='pages'
        AND status='published'
        AND data_en->>'sectionKey' = ANY($1::text[])
      ORDER BY sort_order, entry_key
      FOR UPDATE`,
    [[...pageSections]]
  )).rows;
  assert.ok(pages.length, "No published division or facility pages were found.");

  const expectations = [];
  for (const row of pages) {
    pageCount += 1;
    const dataEn = clone(row.data_en);
    const dataHi = clone(row.data_hi);
    const sectionKey = dataEn.sectionKey;
    const slug = dataEn.slug || row.entry_key;

    for (const field of localizedPageFields) {
      dataEn[field] = marker(sectionKey, slug, field, "en");
      dataHi[field] = marker(sectionKey, slug, field, "hi");
      localizedFieldCount += 2;
    }
    Object.assign(dataEn, clone(sharedPageSamples));
    sharedFieldCount += Object.keys(sharedPageSamples).length;

    const englishBlocks = Array.isArray(dataEn.blocks) ? dataEn.blocks : [];
    const hindiBlocks = Array.isArray(dataHi.blocks) ? dataHi.blocks : [];
    const blockExpectations = [];
    englishBlocks.forEach((englishBlock, index) => {
      if (!englishBlock || !Object.hasOwn(englishBlock, "contentHtml")) return;
      const blockId = String(englishBlock.id || `section-${index + 1}`);
      const hindiIndex = hindiBlocks.findIndex((block) => String(block?.id || "") === blockId);
      assert.notEqual(hindiIndex, -1, `${slug} section ${blockId} is missing its Hindi CMS block.`);
      const headingEn = marker(slug, blockId, "heading", "en");
      const headingHi = marker(slug, blockId, "heading", "hi");
      const bodyEn = marker(slug, blockId, "body", "en");
      const bodyHi = marker(slug, blockId, "body", "hi");
      dataEn.blocks[index] = {
        ...englishBlock,
        hidden: false,
        value: headingEn,
        contentHtml: `<p>${bodyEn}</p>`,
      };
      dataHi.blocks[hindiIndex] = {
        ...hindiBlocks[hindiIndex],
        hidden: false,
        value: headingHi,
        contentHtml: `<p>${bodyHi}</p>`,
      };
      blockExpectations.push({ blockId, headingEn, headingHi, bodyEn, bodyHi });
      sectionCount += 2;
    });

    const validated = validateEntryPayload("pages", {
      entryKey: row.entry_key,
      status: row.status,
      sortOrder: row.sort_order,
      dataEn,
      dataHi,
    });
    const updated = (await client.query(
      `UPDATE cms_entries
          SET data_en=$1, data_hi=$2, version=version+1, updated_at=now()
        WHERE id=$3
        RETURNING data_en, data_hi`,
      [validated.dataEn, validated.dataHi, row.id]
    )).rows[0];

    localizedPageFields.forEach((field) => {
      assert.equal(updated.data_en[field], dataEn[field], `${slug} English ${field} did not persist.`);
      assert.equal(updated.data_hi[field], dataHi[field], `${slug} Hindi ${field} did not persist.`);
    });
    Object.entries(sharedPageSamples).forEach(([field, value]) => {
      assert.deepEqual(updated.data_en[field], value, `${slug} shared ${field} did not persist.`);
    });
    expectations.push({ sectionKey, slug, dataEn, dataHi, blockExpectations });
  }

  const divisionRows = (await client.query(
    "SELECT * FROM cms_entries WHERE collection='divisions' AND status='published' ORDER BY sort_order, entry_key FOR UPDATE"
  )).rows;
  const divisionExpectations = [];
  for (const row of divisionRows) {
    const dataEn = clone(row.data_en);
    const dataHi = clone(row.data_hi);
    const slug = dataEn.slug || row.entry_key;
    dataEn.title = marker(slug, "card_title", "en");
    dataHi.title = marker(slug, "card_title", "hi");
    dataEn.lead = marker(slug, "card_summary", "en");
    dataHi.lead = marker(slug, "card_summary", "hi");
    dataEn.highlights = [marker(slug, "highlight", "en")];
    dataHi.highlights = [marker(slug, "highlight", "hi")];
    const validated = validateEntryPayload("divisions", {
      entryKey: row.entry_key,
      status: row.status,
      sortOrder: row.sort_order,
      dataEn,
      dataHi,
    });
    const updated = (await client.query(
      `UPDATE cms_entries
          SET data_en=$1, data_hi=$2, version=version+1, updated_at=now()
        WHERE id=$3
        RETURNING data_en, data_hi`,
      [validated.dataEn, validated.dataHi, row.id]
    )).rows[0];
    assert.equal(updated.data_en.title, dataEn.title, `${slug} English card title did not persist.`);
    assert.equal(updated.data_hi.title, dataHi.title, `${slug} Hindi card title did not persist.`);
    divisionExpectations.push({ key: row.entry_key, slug, dataEn, dataHi });
    divisionCardCount += 1;
  }

  const rows = await publicRows(client);
  const english = assembleBootstrap(rows, "en");
  const hindi = assembleBootstrap(rows, "hi");

  for (const expected of expectations) {
    const englishPage = pageFrom(english, expected.sectionKey, expected.slug);
    const hindiPage = pageFrom(hindi, expected.sectionKey, expected.slug);
    assert.ok(englishPage, `${expected.slug} disappeared from the English website payload.`);
    assert.ok(hindiPage, `${expected.slug} disappeared from the Hindi website payload.`);
    localizedPageFields.forEach((field) => {
      assert.equal(englishPage[field], expected.dataEn[field], `${expected.slug} English ${field} did not reach the website.`);
      assert.equal(hindiPage[field], expected.dataHi[field], `${expected.slug} Hindi ${field} did not reach the website.`);
    });
    Object.entries(sharedPageSamples).forEach(([field, value]) => {
      assert.deepEqual(englishPage[field], value, `${expected.slug} shared ${field} did not reach English.`);
      assert.deepEqual(hindiPage[field], value, `${expected.slug} shared ${field} did not reach Hindi.`);
    });
    expected.blockExpectations.forEach((blockExpected) => {
      const englishBlock = englishPage.blocks?.find((block) => String(block?.id || "") === blockExpected.blockId);
      const hindiBlock = hindiPage.blocks?.find((block) => String(block?.id || "") === blockExpected.blockId);
      assert.equal(englishBlock?.value, blockExpected.headingEn, `${expected.slug} English section heading did not reach the website.`);
      assert.match(String(englishBlock?.contentHtml || ""), new RegExp(blockExpected.bodyEn), `${expected.slug} English section body did not reach the website.`);
      assert.equal(hindiBlock?.value, blockExpected.headingHi, `${expected.slug} Hindi section heading did not reach the website.`);
      assert.match(String(hindiBlock?.contentHtml || ""), new RegExp(blockExpected.bodyHi), `${expected.slug} Hindi section body did not reach the website.`);
    });
  }

  const englishDivisionPages = english.rsacOfficialSections.find((section) => section.key === "divisions")?.pages || [];
  const hindiDivisionPages = hindi.rsacOfficialSections.find((section) => section.key === "divisions")?.pages || [];
  for (const expected of divisionExpectations) {
    const englishPage = englishDivisionPages.find((page) => page.divisionKey === expected.key);
    const hindiPage = hindiDivisionPages.find((page) => page.divisionKey === expected.key);
    assert.equal(englishPage?.cardTitle, expected.dataEn.title, `${expected.slug} English division card title did not reach the website.`);
    assert.equal(hindiPage?.cardTitle, expected.dataHi.title, `${expected.slug} Hindi division card title did not reach the website.`);
    assert.equal(englishPage?.cardSummary, expected.dataEn.lead, `${expected.slug} English division card summary did not reach the website.`);
    assert.equal(hindiPage?.cardSummary, expected.dataHi.lead, `${expected.slug} Hindi division card summary did not reach the website.`);
    assert.deepEqual(englishPage?.highlights, expected.dataEn.highlights, `${expected.slug} English division highlights did not reach the website.`);
    assert.deepEqual(hindiPage?.highlights, expected.dataHi.highlights, `${expected.slug} Hindi division highlights did not reach the website.`);
  }

  console.log(
    `Division/facility write-through passed for ${pageCount} pages, ${localizedFieldCount} localized page fields, ` +
    `${sharedFieldCount} shared layout/media fields, ${sectionCount} localized section heading/body fields, ` +
    `and ${divisionCardCount} bilingual division cards. All temporary database changes were rolled back.`
  );
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
