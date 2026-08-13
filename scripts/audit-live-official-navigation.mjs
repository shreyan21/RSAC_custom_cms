import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const officialRoot = "https://rsac.up.gov.in/";
const response = await fetch(officialRoot, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Official RSAC-UP website returned ${response.status}.`);
const document = new JSDOM(await response.text(), { url: officialRoot }).window.document;

const relevantOfficialPath = (path) =>
  /^\/(?:en\/page\/|en\/article\/|article\/en\/|en\/(?:feedback|tenders|news)$)/u.test(path);
const officialPaths = new Set(
  [...document.querySelectorAll("a[href]")]
    .map((link) => new URL(link.getAttribute("href"), officialRoot))
    .filter((url) => url.hostname === "rsac.up.gov.in")
    .map((url) => url.pathname.replace(/\/$/u, ""))
    .filter(relevantOfficialPath)
);

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    "SELECT collection, entry_key, status, data_en FROM cms_entries WHERE status='published'"
  );
  const covered = new Set();
  const byCollection = new Map();
  for (const row of rows) {
    const items = byCollection.get(row.collection) || [];
    items.push(row);
    byCollection.set(row.collection, items);

    const sourceUrl = String(row.data_en?.sourceUrl || "").trim();
    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl, officialRoot);
        if (url.hostname === "rsac.up.gov.in") covered.add(url.pathname.replace(/\/$/u, ""));
      } catch {
        // Invalid legacy source URLs are covered by the asset and contract audits.
      }
    }
  }

  for (const row of byCollection.get("pages") || []) {
    const slug = String(row.data_en?.slug || row.entry_key || "").trim();
    if (slug) covered.add(`/en/page/${slug}`);
  }
  for (const row of byCollection.get("public_info") || []) {
    const slug = String(row.data_en?.slug || row.entry_key || "").trim();
    if (slug) covered.add(`/en/page/${slug}`);
  }
  for (const row of byCollection.get("policies") || []) {
    const slug = String(row.data_en?.slug || row.entry_key || "").trim();
    if (slug) covered.add(`/en/page/${slug}`);
  }

  const homepageKeys = new Set(
    (byCollection.get("homepage_features") || []).map((row) => String(row.data_en?.key || row.entry_key))
  );
  for (const key of homepageKeys) covered.add(`/en/article/${key}`);
  if ((byCollection.get("pages") || []).some((row) => row.data_en?.slug === "read-more-about-us")) {
    covered.add("/en/article/about-us");
  }

  const floodYears = new Set(
    (byCollection.get("flood_reports") || [])
      .map((row) => String(row.data_en?.date || row.data_en?.year || "").match(/^\d{4}/u)?.[0])
      .filter(Boolean)
  );
  for (const year of floodYears) covered.add(`/en/page/flood-${year}`);

  if ((byCollection.get("gallery") || []).length) covered.add("/en/page/photo-gallery");
  if ((byCollection.get("notices") || []).length) covered.add("/en/news");
  if ((byCollection.get("contact") || []).length) covered.add("/en/page/contact-details");
  if ((byCollection.get("public_info") || []).some((row) => row.data_en?.slug === "feedback")) {
    covered.add("/en/feedback");
  }
  if ((byCollection.get("public_info") || []).some((row) => row.data_en?.slug === "tenders")) {
    covered.add("/en/tenders");
  }
  covered.add("/article/en/sitemap");
  covered.add("/article/en/screen-reader-access");
  covered.add("/article/en/web-information-manager");

  const missing = [...officialPaths].filter((path) => !covered.has(path)).sort();
  if (missing.length) {
    throw new Error(`Official navigation paths missing from the CMS coverage map:\n- ${missing.join("\n- ")}`);
  }
  console.log(
    `Live official-navigation audit passed: all ${officialPaths.size} current RSAC-UP institutional paths are represented locally.`
  );
} finally {
  await client.end();
}
