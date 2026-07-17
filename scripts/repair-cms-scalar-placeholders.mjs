import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const toIsoDate = (value) => {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/u);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en
     FROM cms_entries
     WHERE collection='flood_reports'
       AND jsonb_typeof(data_en->'date') IS DISTINCT FROM 'string'`
  );

  let repaired = 0;
  for (const row of rows) {
    const date = toIsoDate(row.data_en?.dateLabel);
    if (!date) throw new Error(`Cannot derive a date for flood report ${row.entry_key}.`);
    await client.query(
      "UPDATE cms_entries SET data_en=jsonb_set(data_en,'{date}',to_jsonb($2::text),true) WHERE id=$1",
      [row.id, date]
    );
    repaired += 1;
  }

  await client.query("COMMIT");
  console.log(`Normalized ${repaired} flood-report date value(s).`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
