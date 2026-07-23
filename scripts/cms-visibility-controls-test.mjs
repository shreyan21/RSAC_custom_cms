import { config as loadEnv } from "dotenv";
import pg from "pg";
import { assembleBootstrap, readPublishedEntries } from "../server/contentAssembler.js";

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
    "Draft and archived entries are excluded, including Geoportals."
  );
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end();
}
