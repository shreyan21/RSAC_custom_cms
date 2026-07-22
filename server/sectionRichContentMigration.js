import { migrateSectionData } from "../shared/sectionRichContent.js";

export const migrateDivisionAndFacilityRichContent = async (client) => {
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND data_en->>'sectionKey' IN ('divisions', 'facilities', 'academics')
      ORDER BY entry_key
      FOR UPDATE`
  );
  let entriesChanged = 0;
  let sectionsChanged = 0;

  for (const row of rows) {
    const english = migrateSectionData(row.data_en);
    const hindi = migrateSectionData(row.data_hi);
    if (!english.changed && !hindi.changed) continue;
    sectionsChanged += [...(english.data.blocks || []), ...(hindi.data.blocks || [])]
      .filter((block) => Object.hasOwn(block || {}, "contentHtml")).length;
    await client.query(
      `UPDATE cms_entries
          SET data_en=$1, data_hi=$2, version=version+1
        WHERE id=$3`,
      [english.data, hindi.data, row.id]
    );
    entriesChanged += 1;
  }

  return { entriesChanged, sectionsChanged };
};
