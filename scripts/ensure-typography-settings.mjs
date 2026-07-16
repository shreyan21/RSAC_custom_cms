import { pool } from "../server/db.js";

const client = await pool.connect();

const mergeHomepageTypography = (siteTypography, legacyTypography) => {
  const current = siteTypography && typeof siteTypography === "object" ? siteTypography : {};
  const legacy = legacyTypography && typeof legacyTypography === "object" ? legacyTypography : {};
  const merged = {};
  for (const sectionKey of new Set([...Object.keys(current), ...Object.keys(legacy)])) {
    const section = { ...(current[sectionKey] || {}), ...(legacy[sectionKey] || {}) };
    if (Object.keys(section).length) merged[sectionKey] = section;
  }
  return merged;
};

try {
  await client.query("BEGIN");
  const designResult = await client.query(
    "SELECT id,entry_key,data_en,data_hi FROM cms_entries WHERE collection='design_settings' AND status <> 'archived' ORDER BY sort_order LIMIT 1 FOR UPDATE"
  );
  const siteResult = await client.query(
    "SELECT id,entry_key,data_en,data_hi FROM cms_entries WHERE collection='site_settings' AND status <> 'archived' ORDER BY sort_order LIMIT 1 FOR UPDATE"
  );
  const designEntry = designResult.rows[0];
  const siteEntry = siteResult.rows[0];
  if (!designEntry || !siteEntry) throw new Error("Website Design and Fonts or Homepage, Sitemap and Global Text record was not found. Run npm run cms:setup first.");

  const designEn = {
    ...(designEntry.data_en || {}),
    siteFont: designEntry.data_en?.siteFont || designEntry.data_en?.bodyFont || "Inter",
  };
  const designHi = { ...(designEntry.data_hi || {}) };
  const legacyTypography = designEn.homeSectionTypography;
  delete designEn.homeSectionTypography;
  delete designHi.homeSectionTypography;

  const siteEn = structuredClone(siteEntry.data_en || {});
  siteEn.settings = {
    ...(siteEn.settings || {}),
    homeSectionTypography: mergeHomepageTypography(
      siteEn.settings?.homeSectionTypography,
      legacyTypography
    ),
  };
  const siteHi = structuredClone(siteEntry.data_hi || {});
  if (siteHi.settings && typeof siteHi.settings === "object") {
    delete siteHi.settings.homeSectionTypography;
  }

  const designChanged = JSON.stringify(designEn) !== JSON.stringify(designEntry.data_en || {}) ||
    JSON.stringify(designHi) !== JSON.stringify(designEntry.data_hi || {});
  const siteChanged = JSON.stringify(siteEn) !== JSON.stringify(siteEntry.data_en || {}) ||
    JSON.stringify(siteHi) !== JSON.stringify(siteEntry.data_hi || {});

  if (designChanged) {
    await client.query(
      "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
      [designEn, designHi, designEntry.id]
    );
    await client.query(
      `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
       VALUES ('ensure-typography-settings','design_settings',$1,$2,$3,$4)`,
      [designEntry.id, designEntry.entry_key, designEntry.data_en, designEn]
    );
  }

  if (siteChanged) {
    await client.query(
      "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
      [siteEn, siteHi, siteEntry.id]
    );
    await client.query(
      `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
       VALUES ('consolidate-homepage-typography','site_settings',$1,$2,$3,$4)`,
      [siteEntry.id, siteEntry.entry_key, siteEntry.data_en, siteEn]
    );
  }

  await client.query("COMMIT");
  console.log(designChanged || siteChanged
    ? "Website typography settings consolidated without changing the visible sizes."
    : "Website typography settings are already consolidated.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
