import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    "SELECT collection,entry_key,status,sort_order,data_en,data_hi FROM cms_entries ORDER BY collection,sort_order,entry_key"
  );
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries: rows.map((row) => ({
      collection: row.collection,
      entryKey: row.entry_key,
      status: row.status,
      sortOrder: row.sort_order,
      dataEn: row.data_en,
      dataHi: row.data_hi,
    })),
  };
  await writeFile(resolve("server/seed-data.generated.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Exported ${rows.length} CMS entries to server/seed-data.generated.json.`);
} finally {
  await client.end();
}
