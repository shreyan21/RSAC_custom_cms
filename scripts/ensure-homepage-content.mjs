import { pool } from "../server/db.js";

const sectionOrder = [
  "mission",
  "leadership",
  "about",
  "services",
  "geoportals",
  "quickAccess",
  "stats",
  "gallery",
  "location",
];

const defaultHidden = ["leadership", "quickAccess", "geoportals", "gallery"];

const languageDefaults = {
  en: {
    eyebrow: "Geospatial Intelligence for Uttar Pradesh",
    primaryAction: { label: "About RSAC-UP", path: "/about-us/read-more-about-us" },
    secondaryAction: { label: "Organisation Chart", path: "/organisation-chart" },
  },
  hi: {
    eyebrow: "उत्तर प्रदेश के लिए भू-स्थानिक आसूचना",
    primaryAction: { label: "आरएसएसी-यूपी के बारे में", path: "/about-us/read-more-about-us" },
    secondaryAction: { label: "संगठनात्मक चार्ट", path: "/organisation-chart" },
  },
};

const patchLanguage = (payload, language) => {
  const output = structuredClone(payload || {});
  const settings = structuredClone(output.settings || {});
  const defaults = languageDefaults[language];

  settings.layout = {
    ...(settings.layout || {}),
    homeSections: sectionOrder,
    hiddenHomeSections: Array.isArray(settings.layout?.hiddenHomeSections)
      ? settings.layout.hiddenHomeSections
      : defaultHidden,
  };
  settings.hero = {
    ...(settings.hero || {}),
    eyebrow: settings.hero?.eyebrow || defaults.eyebrow,
  };
  settings.about = {
    ...(settings.about || {}),
    primaryAction: settings.about?.primaryAction ?? defaults.primaryAction,
    secondaryAction: settings.about?.secondaryAction ?? defaults.secondaryAction,
  };

  output.settings = settings;
  return output;
};

const client = await pool.connect();

try {
  await client.query("BEGIN");
  const result = await client.query(
    "SELECT id, entry_key, data_en, data_hi FROM cms_entries WHERE collection='site_settings' AND status <> 'archived' ORDER BY sort_order LIMIT 1 FOR UPDATE"
  );
  const entry = result.rows[0];

  if (!entry) {
    throw new Error("Homepage and Global Text record was not found. Run npm run cms:setup first.");
  }

  const dataEn = patchLanguage(entry.data_en, "en");
  const dataHi = patchLanguage(entry.data_hi, "hi");

  await client.query(
    "UPDATE cms_entries SET data_en=$1, data_hi=$2, version=version+1 WHERE id=$3",
    [dataEn, dataHi, entry.id]
  );
  await client.query(
    "INSERT INTO cms_audit_log (action, collection, entry_id, entry_key, before_data, after_data) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      "homepage_content_sync",
      "site_settings",
      entry.id,
      entry.entry_key,
      { dataEn: entry.data_en, dataHi: entry.data_hi },
      { dataEn, dataHi },
    ]
  );
  await client.query("COMMIT");
  console.log("Homepage content and editor fields are synchronized.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
