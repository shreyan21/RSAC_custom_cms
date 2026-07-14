import { pool } from "../server/db.js";

const client = await pool.connect();

try {
  await client.query("BEGIN");
  const result = await client.query(
    "SELECT id,entry_key,data_en,data_hi FROM cms_entries WHERE collection='design_settings' AND status <> 'archived' ORDER BY sort_order LIMIT 1 FOR UPDATE"
  );
  const entry = result.rows[0];
  if (!entry) throw new Error("Website Design and Fonts record was not found. Run npm run cms:setup first.");

  const dataEn = {
    ...(entry.data_en || {}),
    siteFont: entry.data_en?.siteFont || entry.data_en?.bodyFont || "Inter",
    homeSectionTypography: entry.data_en?.homeSectionTypography || {},
  };
  const changed = JSON.stringify(dataEn) !== JSON.stringify(entry.data_en || {});

  if (changed) {
    await client.query(
      "UPDATE cms_entries SET data_en=$1,version=version+1,updated_at=now() WHERE id=$2",
      [dataEn, entry.id]
    );
    await client.query(
      `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
       VALUES ('ensure-typography-settings','design_settings',$1,$2,$3,$4)`,
      [entry.id, entry.entry_key, entry.data_en, dataEn]
    );
  }

  await client.query("COMMIT");
  console.log(changed ? "Website typography settings added." : "Website typography settings already present.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
