import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import { extractPageAssetFieldsFromDocument, flattenPageAssetFields } from "../src/data/pageAssetFields.js";
import { collectPageImages } from "./lib/division-sections.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const profileOnlyPages = new Set([
  "our-chairman's-governing-body",
  "director's",
  "our-former",
  "scientific-manpower",
]);
const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();
const assetTarget = (asset) => asset?.target || String(asset?.key || "").match(/^asset-([a-z-]+)-\d+$/u)?.[1] || asset?.kind || "asset";
const identity = (asset) => `${assetTarget(asset)}\u0000${asset?.kind || "asset"}\u0000${compact(asset?.sourceValue || asset?.value)}`;

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
      ORDER BY sort_order, entry_key`
  );
  const missing = [];
  let expectedCount = 0;

  for (const row of rows) {
    for (const [language, data] of [["en", row.data_en], ["hi", row.data_hi]]) {
      if (!data?.html) continue;
      const pageSlug = row.data_en?.slug || row.entry_key;
      const imageMetadata = new Map(
        collectPageImages(data.html, data.title).map((image) => [compact(image.src), image])
      );
      const document = new JSDOM(`<!DOCTYPE html><html><body>${data.html}</body></html>`).window.document;
      const expected = extractPageAssetFieldsFromDocument(document).filter((asset) => {
        const metadata = asset.kind === "image" ? imageMetadata.get(asset.sourceValue) : null;
        return metadata?.sectionKey !== "scientific-manpower" && !profileOnlyPages.has(pageSlug);
      });
      const represented = new Set([
        ...flattenPageAssetFields(data.blocks),
        ...(language === "hi" ? flattenPageAssetFields(row.data_en?.blocks) : []),
      ].map(identity));
      expectedCount += expected.length;
      expected.forEach((asset) => {
        if (!represented.has(identity(asset))) {
          missing.push(`${row.entry_key} [${language}] ${asset.label} (${asset.sourceValue})`);
        }
      });
    }
  }

  if (missing.length) {
    console.error(`CMS asset coverage failed: ${missing.length} imported assets have no editor control.`);
    missing.slice(0, 100).forEach((item) => console.error(`- ${item}`));
    process.exitCode = 1;
  } else {
    console.log(`CMS asset coverage passed for ${rows.length} pages and ${expectedCount} imported images, files and links.`);
  }
} finally {
  await client.end();
}
