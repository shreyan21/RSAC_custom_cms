import { config as loadEnv } from "dotenv";
import pg from "pg";
import { migrateDivisionAndFacilityRichContent } from "../server/sectionRichContentMigration.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is not configured.");

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
await client.query("BEGIN");
try {
  const result = await migrateDivisionAndFacilityRichContent(client);
  await client.query("COMMIT");
  console.log(`Section rich-content migration complete: ${result.entriesChanged} pages, ${result.sectionsChanged} localized sections updated.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

