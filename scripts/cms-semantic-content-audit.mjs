import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(`
    SELECT entry_key, data_en, data_hi
      FROM cms_entries
     WHERE collection='pages'
       AND status='published'
       AND data_en->>'sectionKey' IN ('divisions', 'facilities', 'academics')
     ORDER BY entry_key
  `);
  let localizedSections = 0;
  let headings = 0;
  let lists = 0;
  let tables = 0;
  let activeLegacyRows = 0;
  let peopleBodies = 0;

  for (const row of rows) {
    for (const data of [row.data_en, row.data_hi]) {
      assert.equal(data?.sectionContentVersion, 2, `${row.entry_key} has an old section content version.`);
      for (const block of data?.blocks || []) {
        localizedSections += 1;
        const html = String(block?.contentHtml || "");
        headings += (html.match(/<h[2-4]\b/giu) || []).length;
        lists += (html.match(/<[ou]l\b/giu) || []).length;
        tables += (html.match(/<table\b/giu) || []).length;
        if (Object.hasOwn(block || {}, "children")) activeLegacyRows += 1;
        if (/scientific manpower/iu.test(String(block?.sourceLabel || "")) && html.trim()) peopleBodies += 1;
      }
    }
  }

  const earth = rows.find((row) => row.entry_key === "earth-resources-division1");
  assert.match(String(earth?.data_hi?.blocks?.[0]?.contentHtml || ""), /^<h[2-4][^>]*>[\s\S]*\u092d\u0942-\u0938\u0902\u0938\u093e\u0927\u0928/iu, "Known Hindi activity heading is not semantic.");
  assert.equal(activeLegacyRows, 0, "Legacy item rows are still active.");
  assert.equal(peopleBodies, 0, "Profile content leaked into section rich text.");
  assert.ok(headings > 0 && lists > 0 && tables > 0, "Semantic headings, lists, or tables are missing.");

  console.log(JSON.stringify({ pages: rows.length, localizedSections, headings, lists, tables, activeLegacyRows, peopleBodies }, null, 2));
} finally {
  await client.end();
}
