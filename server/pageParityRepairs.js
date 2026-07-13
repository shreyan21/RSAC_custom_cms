const pageRepairs = new Map([
  ["training-hostels", {
    visibleBlockLabels: new Set(["Training Hostel"]),
    hiddenChildKeys: new Set(),
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
  }],
]);

const isSupplementalEditorBlock = (block) =>
  block?.controlsSectionLabel === false || String(block?.id || "").startsWith("cms-text-");

const mergeTrainingBlocks = (canonicalBlocks = [], academicBlocks = []) => {
  const canonical = structuredClone(canonicalBlocks);
  const supplemental = structuredClone(academicBlocks.filter(isSupplementalEditorBlock));
  const representedKeys = new Set();

  [...canonical, ...supplemental].forEach((block) => {
    if (block?.key) representedKeys.add(block.key);
    (block?.children || []).forEach((child) => {
      if (child?.key) representedKeys.add(child.key);
    });
  });

  academicBlocks.filter((block) => !isSupplementalEditorBlock(block)).forEach((block, index) => {
    const children = (block.children || []).filter((child) => {
      if (!child?.key || representedKeys.has(child.key)) return false;
      representedKeys.add(child.key);
      return true;
    });
    if (!children.length) return;

    supplemental.push({
      id: `parity-preserved-${block.id || index}`,
      label: `${block.label || block.value || "Section"} additional text`,
      value: `${block.value || block.label || "Section"} additional text`,
      sourceLabel: block.sourceLabel || block.label || block.value || "Page content",
      controlsSectionLabel: false,
      children: structuredClone(children),
    });
  });

  return [...canonical, ...supplemental];
};

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
    const repairBlocks = (blocks, allowBlockVisibilityRepair) => (blocks || []).map((block) => {
      let next = block;
      if (allowBlockVisibilityRepair && repair.visibleBlockLabels.has(block.label) && block.hidden === true) {
        next = { ...next, hidden: false };
        changed = true;
      }
      const children = (next.children || []).map((child) => {
        if (!repair.hiddenChildKeys.has(child.key) || child.hidden === true) return child;
        changed = true;
        return { ...child, hidden: true };
      });
      return { ...next, children };
    });
    dataEn.blocks = repairBlocks(dataEn.blocks, true);
    dataHi.blocks = repairBlocks(dataHi.blocks, false);
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
      blocks: mergeTrainingBlocks(
        canonicalTraining.data_en?.blocks,
        academicTraining.data_en?.blocks
      ),
    };
    const dataHi = {
      ...(academicTraining.data_hi || {}),
      blocks: mergeTrainingBlocks(
        canonicalTraining.data_hi?.blocks,
        academicTraining.data_hi?.blocks
      ),
    };
    const changed = JSON.stringify(dataEn.blocks) !== JSON.stringify(academicTraining.data_en?.blocks || [])
      || JSON.stringify(dataHi.blocks) !== JSON.stringify(academicTraining.data_hi?.blocks || []);
    if (changed) {
      await db.query(
        "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
        [dataEn, dataHi, academicTraining.id]
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
