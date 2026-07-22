import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const aliases = [
  ["school-of-geo-informatics-division1", "school-of-geo-informatics-"],
];
const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
let changed = 0;
try {
  await client.query("BEGIN");
  for (const [canonicalKey, academicKey] of aliases) {
    const { rows } = await client.query(
      "SELECT id,entry_key,data_en,data_hi FROM cms_entries WHERE collection='pages' AND entry_key=ANY($1::text[]) FOR UPDATE",
      [[canonicalKey, academicKey]]
    );
    const canonical = rows.find((row) => row.entry_key === canonicalKey);
    const academic = rows.find((row) => row.entry_key === academicKey);
    if (!canonical || !academic) throw new Error(`Missing canonical or academic page for ${canonicalKey}.`);
    const dataEn = {
      ...(academic.data_en || {}),
      html: canonical.data_en?.html || "",
      blocks: structuredClone(canonical.data_en?.blocks || []),
      sectionContentVersion: 2,
    };
    const dataHi = {
      ...(academic.data_hi || {}),
      html: canonical.data_hi?.html || "",
      blocks: structuredClone(canonical.data_hi?.blocks || []),
      sectionContentVersion: 2,
    };
    if (JSON.stringify(dataEn) === JSON.stringify(academic.data_en || {}) && JSON.stringify(dataHi) === JSON.stringify(academic.data_hi || {})) continue;
    await client.query(
      "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
      [dataEn, dataHi, academic.id]
    );
    changed += 1;
  }
  await client.query("COMMIT");
  console.log(`Aligned ${changed} Academics page with its canonical bilingual section structure.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

