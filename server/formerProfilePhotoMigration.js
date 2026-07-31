const decodeHtmlText = (value) =>
  String(value || "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;|&#34;/giu, "\"")
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim();

const normalizeName = (value) =>
  decodeHtmlText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");

export const extractFormerRosterPhotos = (html) =>
  [...String(html || "").matchAll(
    /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/giu
  )]
    .map((match) => ({
      name: decodeHtmlText(match[1]),
      photo:
        match[2].match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/iu)?.[1] ||
        "",
    }))
    .filter((item) => item.name && item.photo);

export const migrateFormerRosterProfilePhotos = async (queryable) => {
  const { rows: pages } = await queryable.query(
    `SELECT data_en
       FROM cms_entries
      WHERE collection='pages' AND entry_key='our-former'
      LIMIT 1`
  );
  const page = pages[0]?.data_en;
  const cards = extractFormerRosterPhotos(page?.html);
  if (!cards.length) return [];

  const blocks = (Array.isArray(page?.blocks) ? page.blocks : []).filter(
    (block) => Array.isArray(block?.children) && block.children.length > 0
  );
  const photoByProfileKey = new Map();
  blocks.forEach((block, index) => {
    if (block.profileEntryKey && cards[index]?.photo) {
      photoByProfileKey.set(block.profileEntryKey, cards[index].photo);
    }
  });
  const photoByName = new Map(
    cards.map((card) => [normalizeName(card.name), card.photo])
  );
  const { rows: profiles } = await queryable.query(
    `SELECT *
       FROM cms_entries
      WHERE collection='profiles'
        AND status <> 'archived'
        AND data_en->>'profileType'='former'
      ORDER BY sort_order, entry_key`
  );
  const changed = [];

  for (const profile of profiles) {
    if (String(profile.data_en?.photo || "").trim()) continue;
    const photo =
      photoByProfileKey.get(profile.entry_key) ||
      photoByName.get(normalizeName(profile.data_en?.name));
    if (!photo) continue;

    const dataEn = { ...(profile.data_en || {}), photo };
    const { rows } = await queryable.query(
      `UPDATE cms_entries
          SET data_en=$1, version=version+1
        WHERE id=$2
        RETURNING *`,
      [dataEn, profile.id]
    );
    changed.push({
      before: profile,
      after: rows[0],
      entryKey: profile.entry_key,
      name: dataEn.name,
      photo,
    });
  }

  return changed;
};
