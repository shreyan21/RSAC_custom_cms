import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import {
  getOfficialMediaLocalPath,
  normalizeOfficialMediaUrl,
  officialMediaManifest,
} from "../src/data/officialMedia.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const apply = process.argv.includes("--apply");
const officialUrlPattern = /https?:\/\/(?:www\.)?(?:rsac\.up\.gov\.in|14\.139\.43\.115:8090)\/[^\s"'<>\\)]+/giu;
const mediaExtensionPattern = /\.(?:avif|gif|jpe?g|png|svg|webp|tiff?|pdf|docx?|xlsx?|pptx?|csv|zip|mp4|webm|mov|m4v|mp3|wav|apk|kml|kmz|html?)(?:$|[?#])/iu;
const existsCache = new Map();
const unavailableVideoPosters = new Map([
  ["http://14.139.43.115:8090/rsac_MODEL_vIDEOS/rsac_build_02.mp4", "/official-media/siteContent/2021121511494624503d.jpg"],
  ["http://14.139.43.115:8090/rsac_MODEL_vIDEOS/CHARBAGH2.mp4", "/official-media/siteContent/202311071735322233CHARBAGH.jpg"],
  ["http://14.139.43.115:8090/rsac_MODEL_vIDEOS/badshahnagar.mp4", "/official-media/siteContent/202311071735322233BADSHAHNAGAR.jpg"],
  ["http://14.139.43.115:8090/rsac_MODEL_vIDEOS/AISHBAGH2.mp4", "/official-media/siteContent/202311071734557743AISHBAGH.jpg"],
]);
const unavailableLocalVideoPosters = new Map(
  [...unavailableVideoPosters].map(([url, poster]) => [officialMediaManifest[url], poster])
);

const localFileExists = async (publicPath) => {
  if (!publicPath?.startsWith("/")) return false;
  if (!existsCache.has(publicPath)) {
    existsCache.set(publicPath, access(resolve("public", publicPath.slice(1))).then(() => true, () => false));
  }
  return existsCache.get(publicPath);
};

const cleanMatchedUrl = (value) => String(value || "").replace(/(?:&amp;|[.,;:])+$/iu, "");

const isMediaUrl = (value) => {
  try {
    const url = new URL(value);
    return mediaExtensionPattern.test(`${url.pathname}${url.search}`);
  } catch {
    return mediaExtensionPattern.test(value);
  }
};

const localPathFor = async (value) => {
  const normalized = normalizeOfficialMediaUrl(value);
  const manifested = officialMediaManifest[normalized];
  if (manifested && await localFileExists(manifested)) return manifested;

  const poster = unavailableVideoPosters.get(normalized);
  if (poster && await localFileExists(poster)) return poster;

  const predicted = getOfficialMediaLocalPath(value);
  if (predicted && await localFileExists(predicted)) return predicted;
  return "";
};

const unresolved = new Map();
const replacements = new Map();

const rewriteString = async (value, context) => {
  let output = String(value);
  for (const [videoPath, poster] of unavailableLocalVideoPosters) {
    if (!videoPath || !output.includes(videoPath) || !await localFileExists(poster)) continue;
    output = output.split(videoPath).join(poster);
    replacements.set(videoPath, poster);
  }

  const matches = [...output.matchAll(officialUrlPattern)];
  if (!matches.length) return output;

  for (const match of matches) {
    const matched = cleanMatchedUrl(match[0]);
    if (!isMediaUrl(matched)) continue;
    const localPath = await localPathFor(matched);
    if (!localPath) {
      if (!unresolved.has(matched)) unresolved.set(matched, new Set());
      unresolved.get(matched).add(context);
      continue;
    }
    output = output.split(matched).join(localPath);
    replacements.set(matched, localPath);
  }
  return output;
};

const rewriteDeep = async (value, context) => {
  if (typeof value === "string") return rewriteString(value, context);
  if (Array.isArray(value)) {
    return Promise.all(value.map((child, index) => rewriteDeep(child, `${context}[${index}]`)));
  }
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = await rewriteDeep(child, `${context}.${key}`);
    }
    return output;
  }
  return value;
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

let changedEntries = 0;
try {
  const { rows } = await client.query(
    "SELECT id, collection, entry_key, data_en, data_hi FROM cms_entries WHERE status <> 'archived' ORDER BY collection, entry_key"
  );
  if (apply) await client.query("BEGIN");

  for (const row of rows) {
    const context = `${row.collection}/${row.entry_key}`;
    const dataEn = await rewriteDeep(row.data_en || {}, `${context}.en`);
    const dataHi = await rewriteDeep(row.data_hi || {}, `${context}.hi`);
    const changed = JSON.stringify(dataEn) !== JSON.stringify(row.data_en || {})
      || JSON.stringify(dataHi) !== JSON.stringify(row.data_hi || {});
    if (!changed) continue;
    changedEntries += 1;
    if (apply) {
      await client.query(
        "UPDATE cms_entries SET data_en=$1, data_hi=$2, version=version+1, updated_at=now() WHERE id=$3",
        [dataEn, dataHi, row.id]
      );
    }
  }

  if (apply) await client.query("COMMIT");
} catch (error) {
  if (apply) await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(`${apply ? "Updated" : "Would update"} ${changedEntries} CMS entries with ${replacements.size} verified local media mappings.`);
if (unresolved.size) {
  console.error(`Unresolved RSAC media URLs: ${unresolved.size}`);
  for (const [url, contexts] of unresolved) {
    console.error(`- ${url} (${[...contexts].slice(0, 3).join(", ")})`);
  }
  process.exitCode = 1;
}
