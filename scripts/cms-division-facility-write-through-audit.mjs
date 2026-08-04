import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import { addLatestSectionItem } from "../admin/src/sectionItemHtml.js";
import { assembleBootstrap } from "../server/contentAssembler.js";
import { validateEntryPayload } from "../server/contentValidation.js";
import { repairDivisionPageConsistency } from "../server/divisionPageSync.js";
import { appendNewPageAssets } from "../src/data/pageAssetFields.js";

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
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.DOMParser = dom.window.DOMParser;

const parseHtml = (html) => {
  const container = dom.window.document.createElement("div");
  container.innerHTML = String(html || "");
  return container;
};

const tableRows = (table) => Array.from(table?.querySelectorAll("tr") || [])
  .filter((row) => !row.closest("thead") && !row.querySelector("th"));

const addAuditedNewestItem = (html, value) => {
  const container = parseHtml(addLatestSectionItem(html, true, dom.window.document));
  const rootList = Array.from(container.querySelectorAll("ol, ul"))
    .find((list) => !list.closest("table") && !list.parentElement?.closest("ol, ul"));
  let paragraph;
  if (rootList) {
    const item = Array.from(rootList.children).find((child) => child.tagName === "LI");
    paragraph = item?.querySelector(":scope > p") || dom.window.document.createElement("p");
    if (item && !paragraph.parentElement) item.append(paragraph);
  } else {
    const firstRow = tableRows(container.querySelector("table"))[0];
    const cell = firstRow?.cells?.[Math.min(1, Math.max(0, (firstRow?.cells?.length || 1) - 1))];
    paragraph = cell?.querySelector("p") || dom.window.document.createElement("p");
    if (cell && !paragraph.parentElement) cell.append(paragraph);
  }
  assert.ok(paragraph, "Could not create a newest item in the section HTML.");
  paragraph.dataset.rsacAlign = "center";
  paragraph.innerHTML = `<strong><em><u><span data-rsac-color="#b91c1c" style="--rsac-text-color: #b91c1c; color: #b91c1c">${value}</span></u></em></strong>`;
  return container.innerHTML;
};

const firstManagedItemText = (html) => {
  const container = parseHtml(html);
  const rootList = Array.from(container.querySelectorAll("ol, ul"))
    .find((list) => !list.closest("table") && !list.parentElement?.closest("ol, ul"));
  if (rootList) {
    return String(Array.from(rootList.children).find((child) => child.tagName === "LI")?.textContent || "").trim();
  }
  return String(tableRows(container.querySelector("table"))[0]?.textContent || "").trim();
};

const auditAssets = (slug, blockId, language) => {
  const prefix = marker(slug, blockId, "asset").toLowerCase();
  const localized = marker(slug, blockId, "asset_label", language);
  return [
    { key: `${prefix}-image`, kind: "image", value: "/official-media/cms-write-through-audit.jpg", sourceValue: "/official-media/cms-write-through-audit.jpg", alt: localized, caption: localized, isNew: true, hidden: false },
    { key: `${prefix}-video`, kind: "video", value: "/official-media/cms-write-through-audit.mp4", sourceValue: "/official-media/cms-write-through-audit.mp4", title: localized, text: localized, isNew: true, hidden: false },
    { key: `${prefix}-document`, kind: "link", value: "/cms-media/cms-write-through-audit.pdf", sourceValue: "/cms-media/cms-write-through-audit.pdf", title: localized, text: localized, isNew: true, hidden: false },
  ];
};
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
let newestItemCount = 0;
let mediaRenderCount = 0;
let richStyleCount = 0;

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
      const assetsEn = auditAssets(slug, blockId, "en");
      const assetsHi = auditAssets(slug, blockId, "hi");
      dataEn.blocks[index] = {
        ...englishBlock,
        hidden: false,
        value: headingEn,
        contentHtml: addAuditedNewestItem(englishBlock.contentHtml, bodyEn),
        assets: [...(englishBlock.assets || []), ...assetsEn],
      };
      dataHi.blocks[hindiIndex] = {
        ...hindiBlocks[hindiIndex],
        hidden: false,
        value: headingHi,
        contentHtml: addAuditedNewestItem(hindiBlocks[hindiIndex]?.contentHtml, bodyHi),
        assets: [...(hindiBlocks[hindiIndex]?.assets || []), ...assetsHi],
      };
      blockExpectations.push({ blockId, headingEn, headingHi, bodyEn, bodyHi, assetsEn, assetsHi });
      sectionCount += 2;
      newestItemCount += 2;
      mediaRenderCount += 6;
      richStyleCount += 2;
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
      assert.match(String(englishBlock?.contentHtml || ""), /<strong><em><u><span[^>]+data-rsac-color="#b91c1c"/u, `${expected.slug} English rich-text styles were stripped.`);
      assert.match(String(hindiBlock?.contentHtml || ""), /<strong><em><u><span[^>]+data-rsac-color="#b91c1c"/u, `${expected.slug} Hindi rich-text styles were stripped.`);
      assert.match(String(englishBlock?.contentHtml || ""), /data-rsac-align="center"/u, `${expected.slug} English text alignment was stripped.`);
      assert.match(String(hindiBlock?.contentHtml || ""), /data-rsac-align="center"/u, `${expected.slug} Hindi text alignment was stripped.`);
      assert.ok(firstManagedItemText(englishBlock?.contentHtml).includes(blockExpected.bodyEn), `${expected.slug} English newest item was not first.`);
      assert.ok(firstManagedItemText(hindiBlock?.contentHtml).includes(blockExpected.bodyHi), `${expected.slug} Hindi newest item was not first.`);

      for (const [localizedBlock, expectedAssets, language] of [[englishBlock, blockExpected.assetsEn, "English"], [hindiBlock, blockExpected.assetsHi, "Hindi"]]) {
        expectedAssets.forEach((asset) => {
          assert.ok(localizedBlock?.assets?.some((candidate) => candidate.key === asset.key), `${expected.slug} ${language} ${asset.kind} did not reach the website payload.`);
        });
        const rendered = appendNewPageAssets(localizedBlock?.contentHtml || "", localizedBlock?.assets || []);
        const renderedContainer = parseHtml(rendered);
        assert.ok(renderedContainer.querySelector('figure[data-rsac-added-asset="true"] img'), `${expected.slug} ${language} added photo did not render.`);
        assert.ok(renderedContainer.querySelector('figure.rsac-video-figure[data-rsac-added-asset="true"] video'), `${expected.slug} ${language} added video did not render.`);
        assert.ok(renderedContainer.querySelector('p[data-rsac-added-asset="true"] a[href$=".pdf"]'), `${expected.slug} ${language} added document did not render.`);
      }
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
    `${newestItemCount} newest-first item checks, ${richStyleCount} rich-style checks, ${mediaRenderCount} media checks, ` +
    `and ${divisionCardCount} bilingual division cards. All temporary database changes were rolled back.`
  );
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
