import { config as loadEnv } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const apply = process.argv.includes("--apply");
const devanagari = /[\u0900-\u097f]/u;
const helperLabels = new Map([
  ["page content", "पृष्ठ सामग्री"],
  ["overview", "अवलोकन"],
  ["additional text", "अतिरिक्त पाठ"],
  ["headings", "शीर्षक"],
  ["section", "अनुभाग"],
]);

const normalize = (value) => String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
const clip = (value, max = 60) => {
  const text = normalize(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const translateHelperLabel = (value) => {
  let text = normalize(value).replace(/^section\s*:\s*/iu, "");
  if (!text) return "";
  const exact = helperLabels.get(text.toLocaleLowerCase("en"));
  if (exact) return exact;
  for (const [english, hindi] of helperLabels) {
    text = text.replace(new RegExp(`\\b${english.replace(/\s+/gu, "\\s+")}\\b`, "giu"), hindi);
  }
  return text;
};

const localizedOwner = (block) => {
  const candidates = [block.value, block.label, block.sourceLabel]
    .map(normalize)
    .filter(Boolean);
  const hindi = candidates.find((value) => devanagari.test(value));
  if (hindi) return translateHelperLabel(hindi);
  return translateHelperLabel(block.sourceLabel || block.value || block.label);
};

const localizeBlockMetadata = (block) => {
  const next = structuredClone(block);
  const owner = localizedOwner(next);
  if (!owner || !devanagari.test(owner)) return next;

  next.label = owner;
  if (next.sourceLabel !== undefined) next.sourceLabel = owner;
  if (next.controlsSectionLabel === false && typeof next.value === "string") next.value = owner;
  next.children = (next.children || []).map((child) => {
    if (typeof child?.value !== "string" || !normalize(child.value)) return child;
    return { ...child, label: `${owner} → ${clip(child.value)}` };
  });
  return next;
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT id,entry_key,data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND status='published'
        AND jsonb_typeof(data_hi->'blocks')='array'
      ORDER BY sort_order,entry_key`
  );
  const changes = rows.flatMap((row) => {
    const nextHindi = structuredClone(row.data_hi || {});
    nextHindi.blocks = (nextHindi.blocks || []).map(localizeBlockMetadata);
    if (JSON.stringify(nextHindi) === JSON.stringify(row.data_hi || {})) return [];
    const changedBlocks = nextHindi.blocks.reduce((count, block, index) =>
      count + (JSON.stringify(block) === JSON.stringify(row.data_hi.blocks[index]) ? 0 : 1), 0);
    const changedLabels = nextHindi.blocks.reduce((count, block, index) => {
      const original = row.data_hi.blocks[index] || {};
      const blockChanges = ["label", "value", "sourceLabel"].reduce(
        (total, key) => total + (block[key] === original[key] ? 0 : 1),
        0
      );
      const childChanges = (block.children || []).reduce(
        (total, child, childIndex) => total + (child.label === original.children?.[childIndex]?.label ? 0 : 1),
        0
      );
      return count + blockChanges + childChanges;
    }, 0);
    return [{ row, nextHindi, changedBlocks, changedLabels }];
  });
  const report = changes.map(({ row, changedBlocks, changedLabels }) => ({
    entryKey: row.entry_key,
    changedBlocks,
    changedLabels,
  }));

  if (!apply || !changes.length) {
    console.log(JSON.stringify({
      mode: apply ? "no-changes" : "dry-run",
      entries: changes.length,
      labels: changes.reduce((total, change) => total + change.changedLabels, 0),
      pages: report,
    }, null, 2));
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
    const backupDirectory = path.resolve("backups");
    const backupPath = path.join(backupDirectory, `pre_editor_labels_${timestamp}.json`);
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(
      backupPath,
      `${JSON.stringify({ createdAt: new Date().toISOString(), entries: changes.map(({ row }) => row) }, null, 2)}\n`,
      "utf8"
    );

    await client.query("BEGIN");
    try {
      for (const { row, nextHindi } of changes) {
        await client.query(
          "UPDATE cms_entries SET data_hi=$1,version=version+1,updated_at=now() WHERE id=$2",
          [nextHindi, row.id]
        );
        await client.query(
          `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
           VALUES ('sync-cms-editor-labels','pages',$1,$2,$3,$4)`,
          [row.id, row.entry_key, row.data_hi, nextHindi]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log(JSON.stringify({
      mode: "applied",
      backupPath,
      entries: changes.length,
      labels: changes.reduce((total, change) => total + change.changedLabels, 0),
      pages: report,
    }, null, 2));
  }
} finally {
  await client.end();
}
