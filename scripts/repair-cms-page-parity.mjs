import { pool } from "../server/db.js";
import { repairCmsPageParity } from "../server/pageParityRepairs.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

try {
  const forestKey = "forest-resources-ecology-division";
  const { rows } = await pool.query(
    "SELECT id, data_hi FROM cms_entries WHERE collection='pages' AND entry_key=$1",
    [forestKey]
  );
  if (rows[0] && (!rows[0].data_hi?.title || !Array.isArray(rows[0].data_hi?.blocks))) {
    const seed = JSON.parse(await readFile(resolve("server/seed-data.generated.json"), "utf8"));
    const fallback = seed.entries.find((entry) => entry.collection === "pages" && entry.entryKey === forestKey)?.dataHi;
    if (!fallback) throw new Error("Forest Resources Hindi seed content is missing.");
    await pool.query("UPDATE cms_entries SET data_hi=$1 WHERE id=$2", [fallback, rows[0].id]);
  }
  const repaired = await repairCmsPageParity(pool);
  console.log(`Repaired ${repaired} CMS content ${repaired === 1 ? "entry" : "entries"}.`);
} finally {
  await pool.end();
}
