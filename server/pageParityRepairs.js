const pageRepairs = new Map([
  ["agriculture-resources-division1", {
    visibleBlockLabels: new Set(),
    hiddenChildKeys: new Set(),
    maxHindiImportedChildByBlockId: new Map([
      ["official-agriculture-resources-division1-02", 24],
    ]),
  }],
  ["training-hostels", {
    visibleBlockLabels: new Set(["Training Hostel"]),
    hiddenChildKeys: new Set(),
    removedChildKeys: new Set(["text-0004"]),
    redundantHeadings: {
      en: ["Training Hostels"],
      hi: ["प्रशिक्षण छात्रावास"],
    },
  }],
  ["soil-analysis-lab1", {
    visibleBlockLabels: new Set(),
    hiddenChildKeys: new Set(),
    removedChildKeys: new Set(["text-0005"]),
    redundantHeadings: {
      en: ["Soil Analysis Lab"],
      hi: ["मृदा विश्लेषण प्रयोगशाला"],
    },
  }],
  ["forest-resources-ecology-division", {
    visibleBlockLabels: new Set(),
    hiddenChildKeys: new Set([
      "text-0067",
      "text-0068",
      "text-0069",
      "text-0070",
      "text-0071",
      "text-0072",
    ]),
    hiddenHindiChildKeys: new Set([
      "text-0065",
      "text-0066",
      "text-0067",
      "text-0068",
      "text-0069",
      "text-0070",
    ]),
  }],
]);

const escapeRegularExpression = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removeRedundantH3Headings = (html, headings = []) => headings.reduce(
  (result, heading) => result.replace(
    new RegExp(`<h3\\b[^>]*>\\s*${escapeRegularExpression(heading)}\\s*<\\/h3>`, "giu"),
    ""
  ),
  String(html || "")
);

const cipdmPosterVideoLinks = new Map([
  [
    "/official-media/siteContent/2021121511494624503d.jpg",
    "http://14.139.43.115:8090/rsac_MODEL_vIDEOS/rsac_build_02.mp4",
  ],
  [
    "/official-media/siteContent/202311071735322233CHARBAGH.jpg",
    "http://14.139.43.115:8090/rsac_MODEL_vIDEOS/CHARBAGH2.mp4",
  ],
  [
    "/official-media/siteContent/202311071735322233BADSHAHNAGAR.jpg",
    "http://14.139.43.115:8090/rsac_MODEL_vIDEOS/badshahnagar.mp4",
  ],
  [
    "/official-media/siteContent/202311071734557743AISHBAGH.jpg",
    "http://14.139.43.115:8090/rsac_MODEL_vIDEOS/AISHBAGH2.mp4",
  ],
]);

const restoreCipdmVideoLinks = (value) => {
  if (typeof value === "string") {
    let restored = value;
    for (const [poster, video] of cipdmPosterVideoLinks) {
      restored = restored
        .replaceAll(`href="${poster}"`, `href="${video}"`)
        .replaceAll(`href='${poster}'`, `href='${video}'`);
    }
    return restored;
  }
  if (Array.isArray(value)) return value.map(restoreCipdmVideoLinks);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, restoreCipdmVideoLinks(child)])
    );
  }
  return value;
};

const mergeTrainingBlocks = (canonicalBlocks = []) => structuredClone(canonicalBlocks);

export const repairCmsPageParity = async (db) => {
  const { rows } = await db.query(
    "SELECT id, entry_key, data_en, data_hi FROM cms_entries WHERE collection='pages' AND entry_key = ANY($1::text[])",
    [[...pageRepairs.keys()]]
  );
  let repaired = 0;

  const galleryDisplaySettings = await db.query(
    `INSERT INTO cms_entries (collection, entry_key, status, sort_order, data_en, data_hi)
     VALUES ('page_display_settings', 'photo-gallery', 'published', 2, $1, $2)
     ON CONFLICT (collection, entry_key) DO NOTHING`,
    [
      {
        path: "/gallery",
        eyebrow: "Photo Gallery",
        title: "Photo Gallery",
        intro: "",
        hideEyebrow: false,
        hideTitle: false,
        hideIntro: true,
        headingSize: "normal",
        contentSize: "normal",
        contentWidth: "normal",
        mediaSize: "normal",
        contentSpacing: "normal",
      },
      {
        eyebrow: "फोटो गैलरी",
        title: "फोटो गैलरी",
        intro: "",
      },
    ]
  );
  repaired += galleryDisplaySettings.rowCount;

  for (const row of rows) {
    const repair = pageRepairs.get(row.entry_key);
    const dataEn = structuredClone(row.data_en || {});
    const dataHi = structuredClone(row.data_hi || {});
    let changed = false;
    const repairBlocks = (
      blocks,
      allowBlockVisibilityRepair,
      hiddenChildKeys,
      maxImportedChildByBlockId = new Map()
    ) => (blocks || []).map((block) => {
      let next = block;
      if (allowBlockVisibilityRepair && repair.visibleBlockLabels.has(block.label) && block.hidden === true) {
        next = { ...next, hidden: false };
        changed = true;
      }
      const maxImportedChild = maxImportedChildByBlockId.get(String(block.id || ""));
      const children = (next.children || []).filter((child) => {
        if (repair.removedChildKeys?.has(child.key)) {
          changed = true;
          return false;
        }
        if (!Number.isInteger(maxImportedChild)) return true;
        const keyMatch = String(child.key || "").match(/^text-(\d+)$/);
        if (!keyMatch || Number(keyMatch[1]) <= maxImportedChild) return true;
        changed = true;
        return false;
      }).map((child) => {
        if (!hiddenChildKeys.has(child.key) || child.hidden === true) return child;
        changed = true;
        return { ...child, hidden: true };
      });
      return { ...next, children };
    });
    dataEn.blocks = repairBlocks(dataEn.blocks, true, repair.hiddenChildKeys);
    dataHi.blocks = repairBlocks(
      dataHi.blocks,
      false,
      repair.hiddenHindiChildKeys || repair.hiddenChildKeys,
      repair.maxHindiImportedChildByBlockId
    );
    const cleanedEnglishHtml = removeRedundantH3Headings(dataEn.html, repair.redundantHeadings?.en);
    const cleanedHindiHtml = removeRedundantH3Headings(dataHi.html, repair.redundantHeadings?.hi);
    if (cleanedEnglishHtml !== String(dataEn.html || "")) {
      dataEn.html = cleanedEnglishHtml;
      changed = true;
    }
    if (cleanedHindiHtml !== String(dataHi.html || "")) {
      dataHi.html = cleanedHindiHtml;
      changed = true;
    }
    if (!changed) continue;

    await db.query(
      "UPDATE cms_entries SET data_en=$1, data_hi=$2, version=version+1, updated_at=now() WHERE id=$3",
      [dataEn, dataHi, row.id]
    );
    repaired += 1;
  }

  const trainingRows = await db.query(
    `SELECT id,entry_key,data_en,data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND entry_key = ANY($1::text[])`,
    [["training-division", "training-division-"]]
  );
  const canonicalTraining = trainingRows.rows.find((row) => row.entry_key === "training-division");
  const academicTraining = trainingRows.rows.find((row) => row.entry_key === "training-division-");
  if (canonicalTraining && academicTraining) {
    const dataEn = {
      ...(academicTraining.data_en || {}),
      html: canonicalTraining.data_en?.html || academicTraining.data_en?.html || "",
      blocks: mergeTrainingBlocks(
        canonicalTraining.data_en?.blocks,
        academicTraining.data_en?.blocks
      ),
    };
    const dataHi = {
      ...(academicTraining.data_hi || {}),
      html: canonicalTraining.data_hi?.html || academicTraining.data_hi?.html || "",
      blocks: mergeTrainingBlocks(
        canonicalTraining.data_hi?.blocks,
        academicTraining.data_hi?.blocks
      ),
    };
    const changed = JSON.stringify(dataEn) !== JSON.stringify(academicTraining.data_en || {})
      || JSON.stringify(dataHi) !== JSON.stringify(academicTraining.data_hi || {});
    if (changed) {
      await db.query(
        "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
        [dataEn, dataHi, academicTraining.id]
      );
      repaired += 1;
    }
  }

  const cipdmPage = await db.query(
    `SELECT id,data_en,data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND entry_key='computer-image-processing-division'
      LIMIT 1`
  );
  if (cipdmPage.rows[0]) {
    const row = cipdmPage.rows[0];
    const dataEn = restoreCipdmVideoLinks(row.data_en || {});
    const dataHi = restoreCipdmVideoLinks(row.data_hi || {});
    const changed = JSON.stringify(dataEn) !== JSON.stringify(row.data_en || {})
      || JSON.stringify(dataHi) !== JSON.stringify(row.data_hi || {});
    if (changed) {
      await db.query(
        "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
        [dataEn, dataHi, row.id]
      );
      repaired += 1;
    }
  }

  const staleHero = await db.query(
    `UPDATE cms_entries
     SET data_en=jsonb_set(data_en, '{video}', '""'::jsonb), version=version+1, updated_at=now()
     WHERE collection='hero_banners'
       AND data_en->>'fileName'='rsac-earth-studio-up.mp4'
       AND data_en->>'video'='/cms-media/migrated/205fab16-1774-4b36-90be-02bea43ff33a.mp4'`
  );

  return repaired + staleHero.rowCount;
};
