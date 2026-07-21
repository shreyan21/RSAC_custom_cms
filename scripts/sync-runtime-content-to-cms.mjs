import { pool } from "../server/db.js";
import { floodReportsByYear } from "../src/data/floodReportsArchive.generated.js";

const archiveReports = Object.values(floodReportsByYear).flat();
const hindiCategory = {
  "Daily Report": "दैनिक रिपोर्ट",
  "District Report": "जिला रिपोर्ट",
};
const hindiCoverage = {
  "State-wide": "राज्यव्यापी",
  "Uttar Pradesh": "उत्तर प्रदेश",
};
const mobileThumbnails = new Map([
  ["hrms", "/images/mobile-apps/hrms.png"],
  ["field-survey", "/images/mobile-apps/field-survey.jpg"],
  ["corridor-survey", "/images/mobile-apps/corridor-survey.png"],
  ["orchard-mapping", "/images/mobile-apps/orchard-mapping.jpg"],
  ["tomato-leaf-disease", "/images/mobile-apps/tomato-disease.png"],
]);

const client = await pool.connect();
let insertedReports = 0;
let updatedApps = 0;
let updatedHero = 0;

try {
  await client.query("BEGIN");

  for (const [index, report] of archiveReports.entries()) {
    const dataEn = { ...report, archiveOnly: true };
    const dataHi = {
      ...report,
      archiveOnly: true,
      category: hindiCategory[report.category] || report.category,
      coverage: hindiCoverage[report.coverage] || report.coverage,
      meta: "पीडीएफ | अंग्रेज़ी",
    };
    const result = await client.query(
      `INSERT INTO cms_entries (collection, entry_key, status, sort_order, data_en, data_hi)
       VALUES ('flood_reports', $1, 'published', $2, $3, $4)
       ON CONFLICT (collection, entry_key) DO NOTHING
       RETURNING id`,
      [report.id, 1000 + index, dataEn, dataHi]
    );
    insertedReports += result.rowCount;
  }

  const appRows = await client.query(
    "SELECT id, entry_key, data_en, data_hi FROM cms_entries WHERE collection='mobile_apps' AND status <> 'archived' FOR UPDATE"
  );
  for (const row of appRows.rows) {
    const thumbnail = mobileThumbnails.get(row.entry_key);
    if (!thumbnail || row.data_en?.thumbnail === thumbnail) continue;
    await client.query(
      "UPDATE cms_entries SET data_en=$1, version=version+1 WHERE id=$2",
      [{ ...(row.data_en || {}), thumbnail }, row.id]
    );
    updatedApps += 1;
  }

  const heroRows = await client.query(
    "SELECT id, data_en FROM cms_entries WHERE collection='hero_banners' AND status <> 'archived' ORDER BY sort_order, id LIMIT 1 FOR UPDATE"
  );
  const hero = heroRows.rows[0];
  if (hero) {
    const nextHero = {
      ...(hero.data_en || {}),
      video: hero.data_en?.video || "/cms-media/migrated/rsac-earth-studio-up.mp4",
      videoLarge: hero.data_en?.videoLarge || "/cms-media/migrated/rsac-earth-studio-up-1920.mp4",
      poster: hero.data_en?.poster || "/cms-media/migrated/rsac-earth-studio-up-poster.jpg",
    };
    if (JSON.stringify(nextHero) !== JSON.stringify(hero.data_en || {})) {
      await client.query(
        "UPDATE cms_entries SET data_en=$1, version=version+1, updated_at=now() WHERE id=$2",
        [nextHero, hero.id]
      );
      updatedHero = 1;
    }
  }

  await client.query("COMMIT");
  console.log(`CMS runtime content synchronized: ${insertedReports} flood reports added, ${updatedApps} mobile thumbnails updated, ${updatedHero} hero record updated.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
