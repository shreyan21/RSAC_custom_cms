import { config as loadEnv } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const apply = process.argv.includes("--apply");
const imageTags = (html) => String(html || "").match(/<img\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/giu) || [];
const imageSource = (tag) => tag.match(/\bsrc\s*=\s*["']([^"']+)["']/iu)?.[1] || "";
const escapeAttribute = (value) => String(value || "")
  .replace(/&/gu, "&amp;")
  .replace(/"/gu, "&quot;")
  .replace(/</gu, "&lt;")
  .replace(/>/gu, "&gt;");

const localizeImageTag = (tag, title) => {
  const withoutLabels = tag.replace(/\s+(?:alt|title)\s*=\s*(?:"[^"]*"|'[^']*')/giu, "");
  return withoutLabels.replace(/<img\b/iu, `<img alt="${escapeAttribute(title)}"`);
};

const missingImageTags = (localizedHtml, englishHtml) => {
  const localizedSources = new Set(imageTags(localizedHtml).map(imageSource));
  const queuedSources = new Set();

  return imageTags(englishHtml).filter((tag) => {
    const source = imageSource(tag);
    if (!source || localizedSources.has(source) || queuedSources.has(source)) return false;
    queuedSources.add(source);
    return true;
  });
};

const invalidImages = (html) => {
  const document = new JSDOM(String(html || "")).window.document;
  return [...document.querySelectorAll("img")].filter((image) => !String(image.getAttribute("src") || "").trim());
};

const repairLocalizedHtml = (localizedHtml, englishHtml, title) => {
  const missing = missingImageTags(localizedHtml, englishHtml);
  const sharedMedia = missing.map((tag) => localizeImageTag(tag, title)).join("");
  const combined = sharedMedia
    ? `${localizedHtml || ""}<div data-rsac-shared-media="true">${sharedMedia}</div>`
    : localizedHtml || "";
  const document = new JSDOM(combined).window.document;
  [...document.querySelectorAll("img")]
    .filter((image) => !String(image.getAttribute("src") || "").trim())
    .forEach((image) => image.remove());
  return { html: document.body.innerHTML, missing };
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT id,entry_key,data_en,data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND status='published'
        AND COALESCE(data_en->>'html','') <> ''
      ORDER BY sort_order,entry_key`
  );
  const changes = rows.flatMap((row) => {
    const invalid = invalidImages(row.data_hi?.html);
    const repaired = repairLocalizedHtml(
      row.data_hi?.html,
      row.data_en?.html,
      row.data_hi?.title || row.data_en?.title || ""
    );
    if (!repaired.missing.length && !invalid.length) return [];
    return [{ row, invalid, repaired }];
  });
  const report = changes.map(({ row, invalid, repaired }) => ({
    entryKey: row.entry_key,
    missingImages: repaired.missing.length,
    invalidImages: invalid.length,
    sources: repaired.missing.map(imageSource),
    invalidExamples: invalid.slice(0, 3).map((image) => image.outerHTML),
  }));

  if (!apply || !changes.length) {
    console.log(JSON.stringify({ mode: apply ? "no-changes" : "dry-run", pages: report }, null, 2));
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
    const backupDirectory = path.resolve("backups");
    const backupPath = path.join(backupDirectory, `pre_media_parity_${timestamp}.json`);
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(
      backupPath,
      `${JSON.stringify({ createdAt: new Date().toISOString(), entries: changes.map(({ row }) => row) }, null, 2)}\n`,
      "utf8"
    );

    await client.query("BEGIN");
    try {
      for (const { row, repaired } of changes) {
        const nextHindi = structuredClone(row.data_hi || {});
        nextHindi.html = repaired.html;
        await client.query(
          "UPDATE cms_entries SET data_hi=$1,version=version+1,updated_at=now() WHERE id=$2",
          [nextHindi, row.id]
        );
        await client.query(
          `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
           VALUES ('sync-page-media-parity','pages',$1,$2,$3,$4)`,
          [row.id, row.entry_key, row.data_hi, nextHindi]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log(JSON.stringify({ mode: "applied", backupPath, pages: report }, null, 2));
  }
} finally {
  await client.end();
}
