import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const clean = process.argv.includes("--clean");
const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  if (clean) {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM cms_audit_log
       WHERE coalesce(before_data::text, '') || coalesce(after_data::text, '')
         LIKE '%CMS English rich test%'`
    );
    await client.query("DELETE FROM cms_feedback WHERE comments LIKE 'CMS feedback audit %'");
    await client.query("DELETE FROM cms_media WHERE original_name LIKE 'cms-smoke-%'");
    await client.query("DELETE FROM cms_users WHERE username LIKE 'cms-audit-%'");
    await client.query("COMMIT");
  }

  const { rows } = await client.query(`
    SELECT
      (SELECT count(*)::integer FROM cms_users
        WHERE username LIKE 'cms-audit-%') AS users,
      (SELECT count(*)::integer FROM cms_feedback
        WHERE comments LIKE 'CMS feedback audit %') AS feedback,
      (SELECT count(*)::integer FROM cms_media
        WHERE original_name LIKE 'cms-smoke-%') AS media,
      (SELECT count(*)::integer FROM cms_audit_log
        WHERE coalesce(before_data::text, '') || coalesce(after_data::text, '')
          LIKE '%CMS English rich test%') AS audit_rows
  `);
  const counts = rows[0];
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  if (total) {
    throw new Error(`Temporary CMS test artifacts remain: ${JSON.stringify(counts)}`);
  }
  console.log("CMS test-artifact audit passed: no temporary users, feedback, media, or audit rows remain.");
} catch (error) {
  if (clean) await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
