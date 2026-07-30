const normalizeName = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const rosterBlocks = (data) =>
  (Array.isArray(data?.blocks) ? data.blocks : []).filter(
    (block) => Array.isArray(block?.children) && block.children.length > 0
  );

const blockName = (block) => String(block?.value || "").trim();

const sourceName = (block) =>
  String(block?.sourceLabel || block?.label || "")
    .replace(/^section\s*:\s*/iu, "")
    .trim();

const matchingLocalizedBlock = (blocks, englishBlock, index) => {
  const key = String(englishBlock?.key || "").trim();
  if (key) {
    const keyed = blocks.find((block) => String(block?.key || "").trim() === key);
    if (keyed) return keyed;
  }
  return blocks[index] || null;
};

const profileMatchesNames = (profile, names) => {
  const profileNames = [
    profile?.data_en?.name,
    profile?.data_hi?.name,
  ].map(normalizeName).filter(Boolean);
  return names.some((name) => profileNames.includes(normalizeName(name)));
};

const changedName = (beforeBlock, afterBlock) => {
  const before = blockName(beforeBlock);
  const after = blockName(afterBlock);
  return before !== after && after ? after : "";
};

export const prepareFormerRosterSave = async (
  client,
  beforePage,
  nextDataEn,
  nextDataHi,
  { actorId } = {}
) => {
  if (beforePage?.entry_key !== "our-former") {
    return { dataEn: nextDataEn, dataHi: nextDataHi, profileChanges: [] };
  }

  const dataEn = structuredClone(nextDataEn || {});
  const dataHi = structuredClone(nextDataHi || {});
  const beforeEnglishBlocks = rosterBlocks(beforePage.data_en);
  const beforeHindiBlocks = rosterBlocks(beforePage.data_hi);
  const nextEnglishBlocks = rosterBlocks(dataEn);
  const nextHindiBlocks = rosterBlocks(dataHi);
  const { rows: profiles } = await client.query(
    `SELECT *
       FROM cms_entries
      WHERE collection='profiles'
        AND status <> 'archived'
        AND data_en->>'profileType'='former'
      FOR UPDATE`
  );
  const profileChanges = [];
  const changedProfileIds = new Set();

  for (const [index, englishBlock] of nextEnglishBlocks.entries()) {
    const beforeEnglish = matchingLocalizedBlock(beforeEnglishBlocks, englishBlock, index);
    const hindiBlock = matchingLocalizedBlock(nextHindiBlocks, englishBlock, index);
    const beforeHindi = matchingLocalizedBlock(beforeHindiBlocks, englishBlock, index);
    const linkedKey =
      englishBlock.profileEntryKey ||
      beforeEnglish?.profileEntryKey ||
      hindiBlock?.profileEntryKey ||
      beforeHindi?.profileEntryKey;
    const candidateNames = [
      blockName(beforeEnglish),
      sourceName(beforeEnglish),
      blockName(beforeHindi),
      sourceName(beforeHindi),
      sourceName(englishBlock),
      sourceName(hindiBlock),
    ].filter(Boolean);
    const profile = profiles.find((entry) => linkedKey && entry.entry_key === linkedKey)
      || profiles.find((entry) => profileMatchesNames(entry, candidateNames));

    if (!profile) continue;

    englishBlock.profileEntryKey = profile.entry_key;
    if (hindiBlock) hindiBlock.profileEntryKey = profile.entry_key;

    const nextEnglishName = changedName(beforeEnglish, englishBlock);
    const nextHindiName = changedName(beforeHindi, hindiBlock);
    if (
      (!nextEnglishName && !nextHindiName) ||
      changedProfileIds.has(profile.id)
    ) {
      continue;
    }

    const beforeProfile = structuredClone(profile);
    const updatedDataEn = {
      ...(profile.data_en || {}),
      ...(nextEnglishName ? { name: nextEnglishName } : {}),
    };
    const updatedDataHi = {
      ...(profile.data_hi || {}),
      ...(nextHindiName ? { name: nextHindiName } : {}),
    };
    const { rows } = await client.query(
      `UPDATE cms_entries
          SET data_en=$1,
              data_hi=$2,
              version=version+1,
              updated_by=$3
        WHERE id=$4
        RETURNING *`,
      [updatedDataEn, updatedDataHi, actorId || profile.updated_by, profile.id]
    );
    const updatedProfile = rows[0];
    Object.assign(profile, updatedProfile);
    changedProfileIds.add(profile.id);
    profileChanges.push({ before: beforeProfile, after: updatedProfile });
  }

  return { dataEn, dataHi, profileChanges };
};
