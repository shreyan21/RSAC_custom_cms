import { config as loadEnv } from "dotenv";
import pg from "pg";
import { assembleBootstrap, mergePreviewRow, readPublishedEntries } from "../server/contentAssembler.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  const selected = (await client.query(
    `SELECT DISTINCT ON (collection)
            id, collection, entry_key, data_en
       FROM cms_entries
      WHERE status = 'published'
      ORDER BY collection, sort_order, entry_key`
  )).rows;
  const ids = selected.map((row) => row.id);

  if (!ids.length) {
    throw new Error("No published CMS entries are available for the visibility test.");
  }

  const operationalDomain = selected.find((row) => row.collection === "operational_domains");
  if (!operationalDomain) {
    throw new Error("No published Operational Domain is available for the preview visibility test.");
  }

  for (const hiddenStatus of ["draft", "archived"]) {
    const previewRows = mergePreviewRow(await readPublishedEntries(client), {
      entryId: hiddenStatus === "draft" ? "stale-preview-identity" : String(operationalDomain.id),
      row: { ...operationalDomain, status: hiddenStatus },
    });
    const previewDomains = assembleBootstrap(previewRows, "en").siteSettings?.missionPulse?.domains || [];
    if (previewDomains.some((domain) => String(domain.id) === String(operationalDomain.id))) {
      throw new Error(`${hiddenStatus} Operational Domain remained visible in private preview.`);
    }
  }

  const previewLabel = `Preview visibility ${Date.now()}`;
  const publishedPreviewRows = mergePreviewRow(await readPublishedEntries(client), {
    entryId: String(operationalDomain.id),
    row: {
      ...operationalDomain,
      status: "published",
      data_en: { ...operationalDomain.data_en, label: previewLabel },
    },
  });
  const publishedPreviewDomains = assembleBootstrap(publishedPreviewRows, "en").siteSettings?.missionPulse?.domains || [];
  if (!publishedPreviewDomains.some((domain) => domain.label === previewLabel)) {
    throw new Error("Published Operational Domain edits did not reach private preview.");
  }

  for (const hiddenStatus of ["draft", "archived"]) {
    await client.query(
      "UPDATE cms_entries SET status=$1 WHERE id = ANY($2::uuid[])",
      [hiddenStatus, ids]
    );

    const publishedRows = await readPublishedEntries(client);
    const visibleIds = new Set(publishedRows.map((row) => String(row.id)));
    const leaked = selected.filter((row) => visibleIds.has(String(row.id)));
    if (leaked.length) {
      throw new Error(
        `${hiddenStatus} entries leaked into public data: ` +
        leaked.map((row) => `${row.collection}/${row.entry_key}`).join(", ")
      );
    }

    const bootstrap = assembleBootstrap(publishedRows, "en");
    const hiddenGeoportals = selected
      .filter((row) => row.collection === "geoportals")
      .map((row) => String(row.data_en?.title || ""));
    const visibleGeoportalTitles = new Set(
      (bootstrap.geoportals || []).map((portal) => String(portal.title || ""))
    );
    const leakedGeoportals = hiddenGeoportals.filter((title) =>
      title && visibleGeoportalTitles.has(title)
    );
    if (leakedGeoportals.length) {
      throw new Error(`${hiddenStatus} Geoportal remained visible: ${leakedGeoportals.join(", ")}`);
    }

    await client.query(
      "UPDATE cms_entries SET status='published' WHERE id = ANY($1::uuid[])",
      [ids]
    );
  }

  console.log(
    `Visibility controls passed for ${selected.length} public collections. ` +
    "Draft and archived entries are excluded from the website and private preview, including Operational Domains and Geoportals."
  );
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end();
}
