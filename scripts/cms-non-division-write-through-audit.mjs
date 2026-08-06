import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { assembleBootstrap, localize } from "../server/contentAssembler.js";
import {
  preserveStoredUndeclaredFields,
  validateEntryPayload,
} from "../server/contentValidation.js";
import { getCollection } from "../shared/cmsCollections.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const excludedCollections = new Set([
  "divisions",
  "facilities",
  "division_section_items",
  "projects",
  "publications",
]);

const internalSharedFields = new Set([
  "divisionKey",
  "sectionKey",
  "key",
  "profileType",
  "employeeId",
  "roleKey",
  "groupKey",
  "slot",
  "placement",
]);

const internalReferenceFields = new Set(["sourceUrl"]);

const formattingFixture = [
  '<h2 data-rsac-align="center">Formatted heading</h2>',
  '<p data-rsac-align="justify"><strong>Bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> ',
  '<span data-rsac-font="jakarta" data-rsac-size="large" data-rsac-color="#b42318" ',
  'style="--rsac-text-color: #b42318; color: #b42318">coloured text</span></p>',
  '<blockquote><p>Quoted text</p></blockquote>',
  '<ul><li>Bullet</li></ul><ol><li>Numbered</li></ol>',
  '<p><a href="https://example.gov.in">Official link</a></p>',
  '<table><thead><tr><th>Heading</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>',
].join("");

const validatedFormattingFixture = validateEntryPayload("public_info", {
  status: "published",
  dataEn: {
    title: "Formatting audit",
    slug: "formatting-audit",
    sections: [{ heading: "Formatting", body: formattingFixture }],
  },
  dataHi: {
    title: "Formatting audit Hindi",
    slug: "formatting-audit",
    sections: [{ heading: "Formatting", body: formattingFixture }],
  },
});
const preservedFormatting = validatedFormattingFixture.dataEn.sections[0].body;
for (const expectedMarkup of [
  "<strong>", "<em>", "<u>", "<s>", "<blockquote>", "<ul>", "<ol>",
  "<table>", 'data-rsac-align="center"', 'data-rsac-align="justify"',
  'data-rsac-font="jakarta"', 'data-rsac-size="large"',
  'data-rsac-color="#b42318"', 'href="https://example.gov.in"',
]) {
  assert.ok(
    preservedFormatting.includes(expectedMarkup),
    `Rich-text validation removed ${expectedMarkup}.`
  );
}

const safeKey = (value) => String(value || "entry")
  .replace(/[^a-z0-9]+/giu, "_")
  .replace(/^_+|_+$/gu, "")
  .slice(0, 48);

const markerFor = (row, field, language) =>
  `CMS_WRITE_${safeKey(row.collection)}_${safeKey(row.entry_key)}_${safeKey(field.name)}_${language.toUpperCase()}`;

const visibleJson = (value) => JSON.stringify(value, (key, item) =>
  [
    "baseTitle",
    "baseName",
    "baseDeployment",
    "structureHtml",
    "structureAssetBlocks",
    "structureSectionOrder",
  ].includes(key) ? undefined : item
);

const localizedValue = (row, field, marker, currentValue) => {
  if (field.type === "list") return [marker];
  if (field.type === "richtext") {
    return `<p><strong>${marker}</strong></p><blockquote><p>${marker}_QUOTE</p></blockquote>`;
  }
  if (field.type === "json") {
    if (field.name === "sections") {
      return [{
        heading: marker,
        body: `<p><strong>${marker}</strong></p><blockquote><p>${marker}_QUOTE</p></blockquote>`,
        documents: [{ title: marker, meta: marker, url: `/official-media/${safeKey(marker)}.pdf` }],
      }];
    }
    if (Array.isArray(currentValue)) {
      return [...currentValue, { title: marker, label: marker, text: marker }];
    }
    return {
      ...(currentValue && typeof currentValue === "object" ? currentValue : {}),
      cmsWriteMarker: marker,
    };
  }
  if (field.type === "blocks") {
    const id = row.collection === "pages"
      ? `cms-section-${safeKey(row.entry_key)}-audit`
      : `cms-write-${safeKey(row.entry_key)}-${field.name}`;
    return row.collection === "pages"
      ? [{
          id,
          value: marker,
          sourceLabel: marker,
          contentHtml: `<p><strong>${marker}</strong></p><blockquote><p>${marker}_QUOTE</p></blockquote>`,
          assets: [],
        }]
      : [{ id, type: "rich_text", html: `<p><strong>${marker}</strong></p>` }];
  }
  return marker;
};

const sharedValue = (row, field, currentValue) => {
  if (internalSharedFields.has(field.name)) return currentValue;
  if (field.type === "boolean") {
    if (["active", "archiveOnly"].includes(field.name)) return currentValue;
    return !Boolean(currentValue);
  }
  if (field.type === "number") return 17;
  if (field.type === "date") return "2026-02-03";
  if (field.type === "email") {
    return `${safeKey(row.entry_key).toLowerCase()}-cms-write-through@example.gov.in`;
  }
  if (field.type === "color") return "#13579b";
  if (["url", "media"].includes(field.type)) {
    return `/official-media/cms-write-${safeKey(row.collection)}-${safeKey(row.entry_key)}-${field.name}.pdf`;
  }
  if (field.type === "select") {
    const options = (field.options || []).map((option) =>
      String(typeof option === "object" ? option.value : option)
    );
    return options.find((option) => option !== String(currentValue || ""))
      || currentValue
      || options[0]
      || "";
  }
  if (field.name === "objectPosition") return "50% 40%";
  if (field.name === "path") return `/cms-write-${safeKey(row.collection)}-${safeKey(row.entry_key)}`;
  if (field.name === "slug") return `cms-write-${safeKey(row.entry_key).toLowerCase()}`;
  if (["phone", "mobile", "contact"].includes(field.name)) return "+91 522 000 0000";
  return `CMS_SHARED_${safeKey(row.collection)}_${safeKey(row.entry_key)}_${safeKey(field.name)}`;
};

const allPages = (bootstrap) => (bootstrap.rsacOfficialSections || [])
  .flatMap((section) => section.pages || []);

const outputFor = (collection, bootstrap, localizedRows) => {
  const outputs = {
    pages: () => allPages(bootstrap),
    page_sections: () => bootstrap.rsacOfficialSections || [],
    profiles: () => [
      bootstrap.officials,
      bootstrap.leadershipProfiles,
      bootstrap.scientistProfiles,
      bootstrap.formerProfiles,
      bootstrap.technicalProfiles,
      bootstrap.administrationProfiles,
    ].flat().filter(Boolean),
    notices: () => bootstrap.notices || [],
    gallery: () => bootstrap.galleryItems || [],
    downloads: () => bootstrap.downloads || [],
    flood_reports: () => localizedRows.filter((row) => row.collection === "flood_reports"),
    mobile_apps: () => bootstrap.mobileApps || [],
    public_info: () => bootstrap.publicInfoPages || [],
    policies: () => bootstrap.policyPages || [],
    menu_items: () => bootstrap.menuItems || [],
    contact: () => [bootstrap.contactDetails].filter(Boolean),
    site_settings: () => [bootstrap.siteSettings].filter(Boolean),
    page_display_settings: () => bootstrap.siteSettings?.pageDisplaySettings || [],
    design_settings: () => [bootstrap.siteSettings?.designSettings].filter(Boolean),
    hero_banners: () => bootstrap.heroVideos || [],
    logos: () => bootstrap.siteSettings?.branding?.logos || [],
    homepage_features: () => bootstrap.siteSettings?.homeSections?.featureTabs || [],
    services: () => bootstrap.siteSettings?.services?.items || [],
    applications: () => bootstrap.siteSettings?.applications?.items || [],
    quick_links: () => bootstrap.quickLinks || [],
    geoportals: () => bootstrap.geoportals || [],
    operational_domains: () => bootstrap.siteSettings?.missionPulse?.domains || [],
    impact_stats: () => bootstrap.siteSettings?.impactStats || [],
    manpower: () => bootstrap.manpowerGroups || [],
    organisation_roles: () => bootstrap.siteSettings?.organisationChart?.roles || [],
  };
  return outputs[collection]?.() || [];
};

const matchesExpectedRow = (item, row) =>
  String(item?.id) === String(row.id)
  || String(item?.id) === String(row.entry_key)
  || String(item?.key) === String(row.entry_key);

const orderingGroupFor = ({ row, nextDataEn }) => {
  if (row.collection === "pages") return `pages:${nextDataEn.sectionKey || "standalone"}`;
  if (row.collection === "profiles") return `profiles:${nextDataEn.profileType || "profile"}`;
  return row.collection;
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

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

let selectedCount = 0;
let localizedFieldCount = 0;
let sharedFieldCount = 0;
const collectionsCovered = new Set();

try {
  await client.query("BEGIN");
  const originalRows = await publicRows(client);
  const floodRows = originalRows.filter((row) => row.collection === "flood_reports");
  const selectedFloodIds = new Set([
    floodRows.find((row) => !row.data_en?.archiveOnly)?.id,
    floodRows.find((row) => row.data_en?.archiveOnly)?.id,
  ].filter(Boolean).map(String));

  const selectedRows = originalRows.filter((row) => {
    if (excludedCollections.has(row.collection)) return false;
    if (row.collection === "pages") {
      return !["divisions", "facilities"].includes(row.data_en?.sectionKey);
    }
    if (row.collection === "flood_reports") return selectedFloodIds.has(String(row.id));
    if (row.collection === "hero_banners") return row.data_en?.active !== false;
    return Boolean(getCollection(row.collection));
  });

  assert.ok(selectedRows.length, "No non-Division/Facility CMS entries were found.");
  const expectations = [];

  for (const row of selectedRows) {
    const definition = getCollection(row.collection);
    if (!definition) continue;
    const dataEn = structuredClone(row.data_en || {});
    const dataHi = structuredClone(row.data_hi || {});
    const markers = { en: [], hi: [] };
    const shared = [];

    for (const field of definition.fields || []) {
      if (field.hidden) continue;
      if (field.localized !== false) {
        const markerEn = markerFor(row, field, "en");
        const markerHi = markerFor(row, field, "hi");
        dataEn[field.name] = localizedValue(row, field, markerEn, dataEn[field.name]);
        dataHi[field.name] = localizedValue(row, field, markerHi, dataHi[field.name]);
        markers.en.push(markerEn);
        markers.hi.push(markerHi);
        localizedFieldCount += 2;
      } else {
        const value = sharedValue(row, field, dataEn[field.name]);
        dataEn[field.name] = value;
        shared.push({
          field: field.name,
          value,
          verifyPublicDelivery: !internalReferenceFields.has(field.name),
        });
        sharedFieldCount += 1;
      }
    }

    const validated = validateEntryPayload(row.collection, {
      entryKey: row.entry_key,
      status: "published",
      sortOrder: row.sort_order,
      dataEn,
      dataHi,
    });
    shared.forEach((item) => {
      item.value = validated.dataEn[item.field];
    });
    const nextDataEn = preserveStoredUndeclaredFields(
      definition,
      row.data_en,
      validated.dataEn
    );
    const nextDataHi = preserveStoredUndeclaredFields(
      definition,
      row.data_hi,
      validated.dataHi
    );
    const updated = (await client.query(
      `UPDATE cms_entries
          SET data_en=$1, data_hi=$2, version=version+1, updated_at=now()
        WHERE id=$3
        RETURNING data_en, data_hi`,
      [nextDataEn, nextDataHi, row.id]
    )).rows[0];
    assert.deepEqual(updated.data_en, nextDataEn, `${row.collection}/${row.entry_key} English data did not persist.`);
    assert.deepEqual(updated.data_hi, nextDataHi, `${row.collection}/${row.entry_key} Hindi data did not persist.`);

    expectations.push({ row, markers, shared, nextDataEn });
    collectionsCovered.add(row.collection);
    selectedCount += 1;
  }

  const changedRows = await publicRows(client);
  const localizedEnglishRows = changedRows.map((row) => ({
    id: row.id,
    key: row.entry_key,
    collection: row.collection,
    ...localize(row, "en"),
  }));
  const localizedHindiRows = changedRows.map((row) => ({
    id: row.id,
    key: row.entry_key,
    collection: row.collection,
    ...localize(row, "hi"),
  }));
  const english = assembleBootstrap(changedRows, "en");
  const hindi = assembleBootstrap(changedRows, "hi");

  for (const expected of expectations) {
    const englishOutput = outputFor(expected.row.collection, english, localizedEnglishRows);
    const hindiOutput = outputFor(expected.row.collection, hindi, localizedHindiRows);
    const englishItem = expected.row.collection === "site_settings"
      ? englishOutput[0]
      : englishOutput.find((item) => matchesExpectedRow(item, expected.row));
    const hindiItem = expected.row.collection === "site_settings"
      ? hindiOutput[0]
      : hindiOutput.find((item) => matchesExpectedRow(item, expected.row));

    assert.ok(englishItem, `${expected.row.collection}/${expected.row.entry_key} disappeared from English website data.`);
    assert.ok(hindiItem, `${expected.row.collection}/${expected.row.entry_key} disappeared from Hindi website data.`);
    const englishJson = visibleJson(englishItem);
    const hindiJson = visibleJson(hindiItem);
    expected.markers.en.forEach((marker) => {
      assert.ok(englishJson.includes(marker), `${expected.row.collection}/${expected.row.entry_key} English ${marker} did not reach the website.`);
      assert.ok(!hindiJson.includes(marker), `${expected.row.collection}/${expected.row.entry_key} English ${marker} leaked into Hindi.`);
    });
    expected.markers.hi.forEach((marker) => {
      assert.ok(hindiJson.includes(marker), `${expected.row.collection}/${expected.row.entry_key} Hindi ${marker} did not reach the website.`);
      assert.ok(!englishJson.includes(marker), `${expected.row.collection}/${expected.row.entry_key} Hindi ${marker} leaked into English.`);
    });

    if (expected.row.collection !== "site_settings") {
      expected.shared
        .filter(({ verifyPublicDelivery }) => verifyPublicDelivery)
        .forEach(({ field, value }) => {
        assert.deepEqual(
          englishItem[field],
          value,
          `${expected.row.collection}/${expected.row.entry_key} shared ${field} did not reach English.`
        );
        assert.deepEqual(
          hindiItem[field],
          value,
          `${expected.row.collection}/${expected.row.entry_key} shared ${field} did not reach Hindi.`
        );
      });
    }
  }

  const orderingGroups = new Map();
  for (const expected of expectations) {
    const group = orderingGroupFor(expected);
    if (!orderingGroups.has(group)) orderingGroups.set(group, []);
    orderingGroups.get(group).push(expected);
  }
  let orderingGroupCount = 0;
  for (const [group, groupExpectations] of orderingGroups) {
    if (groupExpectations.length < 2 || group === "site_settings") continue;
    const collection = groupExpectations[0].row.collection;
    const output = outputFor(collection, english, localizedEnglishRows);
    const ordered = [...groupExpectations].sort((left, right) =>
      Number(left.row.sort_order) - Number(right.row.sort_order)
      || String(left.row.entry_key).localeCompare(String(right.row.entry_key))
    );
    const positions = ordered.map((expected) =>
      output.findIndex((item) => matchesExpectedRow(item, expected.row))
    );
    assert.ok(
      positions.every((position) => position >= 0),
      `${group} lost an item while checking display order.`
    );
    assert.deepEqual(
      positions,
      [...positions].sort((left, right) => left - right),
      `${group} website order does not match CMS display order.`
    );
    orderingGroupCount += 1;
  }

  console.log(
    `Non-Division/Facility write-through passed for ${selectedCount} records across ` +
    `${collectionsCovered.size} collections, ${localizedFieldCount} localized fields and ` +
    `${sharedFieldCount} shared fields. ${orderingGroupCount} ordered website groups and ` +
    `all supported rich-text formatting passed. English/Hindi isolation and public delivery passed. ` +
    "All temporary database changes were rolled back."
  );
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end();
}
