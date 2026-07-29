import { pool } from "../server/db.js";
import {
  floodArchiveYears,
  floodReportsByYear,
} from "../src/data/floodReportsArchive.generated.js";

const archiveReports = Object.values(floodReportsByYear).flat();
const hindiCategory = {
  "Daily Report": "दैनिक रिपोर्ट",
  "District Report": "जिला रिपोर्ट",
};
const hindiCoverage = {
  "State-wide": "राज्यव्यापी",
  "Uttar Pradesh": "उत्तर प्रदेश",
};
const mobileAppDefaults = new Map([
  ["hrms", { thumbnail: "/images/mobile-apps/hrms.png", icon: "briefcase-business" }],
  ["field-survey", { thumbnail: "/images/mobile-apps/field-survey.jpg", icon: "map-pinned" }],
  ["corridor-survey", { thumbnail: "/images/mobile-apps/corridor-survey.png", icon: "route" }],
  ["orchard-mapping", { thumbnail: "/images/mobile-apps/orchard-mapping.jpg", icon: "sprout" }],
  ["tomato-leaf-disease", { thumbnail: "/images/mobile-apps/tomato-disease.png", icon: "scan-search" }],
]);

const client = await pool.connect();
let insertedReports = 0;
let updatedApps = 0;
let updatedHero = 0;
let updatedFloodArchives = 0;

const withCurrentFloodArchives = (data) => {
  const settings = data?.settings || {};
  const floodSection = settings.floodSection || {};
  const existingArchives = Array.isArray(floodSection.archives)
    ? floodSection.archives
    : [];
  const archivesByYear = new Map(
    existingArchives.map((archive) => [String(archive.year), archive])
  );
  const archives = floodArchiveYears.map((year) => {
    const yearKey = String(year);
    return (
      archivesByYear.get(yearKey) || {
        year: yearKey,
        url: `https://rsac.up.gov.in/en/page/flood-${yearKey}`,
      }
    );
  });

  return {
    ...(data || {}),
    settings: {
      ...settings,
      floodSection: {
        ...floodSection,
        archives,
      },
    },
  };
};

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

  const siteSettingsRows = await client.query(
    "SELECT id, data_en, data_hi FROM cms_entries WHERE collection='site_settings' AND entry_key='main' AND status <> 'archived' LIMIT 1 FOR UPDATE"
  );
  const siteSettings = siteSettingsRows.rows[0];
  if (siteSettings) {
    const nextDataEn = withCurrentFloodArchives(siteSettings.data_en);
    const nextDataHi = withCurrentFloodArchives(siteSettings.data_hi);
    if (
      JSON.stringify(nextDataEn) !== JSON.stringify(siteSettings.data_en) ||
      JSON.stringify(nextDataHi) !== JSON.stringify(siteSettings.data_hi)
    ) {
      await client.query(
        "UPDATE cms_entries SET data_en=$1, data_hi=$2, version=version+1, updated_at=now() WHERE id=$3",
        [nextDataEn, nextDataHi, siteSettings.id]
      );
      updatedFloodArchives = 1;
    }
  }

  const appRows = await client.query(
    "SELECT id, entry_key, data_en, data_hi FROM cms_entries WHERE collection='mobile_apps' AND status <> 'archived' FOR UPDATE"
  );
  for (const row of appRows.rows) {
    const defaults = mobileAppDefaults.get(row.entry_key);
    if (!defaults) continue;
    const nextDataEn = { ...(row.data_en || {}), ...defaults };
    if (JSON.stringify(nextDataEn) === JSON.stringify(row.data_en || {})) continue;
    await client.query(
      "UPDATE cms_entries SET data_en=$1, version=version+1 WHERE id=$2",
      [nextDataEn, row.id]
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
  console.log(
    `CMS runtime content synchronized: ${insertedReports} flood reports added, ${updatedFloodArchives} flood archive setting updated, ${updatedApps} mobile app defaults updated, ${updatedHero} hero record updated.`
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
