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

export const repairCmsPageParity = async (db) => {
  const { rows } = await db.query(
    "SELECT id, entry_key, data_en, data_hi FROM cms_entries WHERE collection='pages' AND entry_key = ANY($1::text[])",
    [[...pageRepairs.keys()]]
  );
  let repaired = 0;

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

  const staleHero = await db.query(
    `UPDATE cms_entries
     SET data_en=jsonb_set(data_en, '{video}', '""'::jsonb), version=version+1, updated_at=now()
     WHERE collection='hero_banners'
       AND data_en->>'fileName'='rsac-earth-studio-up.mp4'
       AND data_en->>'video'='/cms-media/migrated/205fab16-1774-4b36-90be-02bea43ff33a.mp4'`
  );

  return repaired + staleHero.rowCount;
};
