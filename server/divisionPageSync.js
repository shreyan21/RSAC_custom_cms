const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();

const comparable = (value) => compact(value)
  .toLowerCase()
  .replace(/&amp;|&/gu, "and")
  .replace(/\bdivisions?\b/gu, "")
  .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const rowData = (row) => row?.data_en || row?.dataEn || row || {};

const identityValues = (value) => {
  const data = rowData(value);
  return [data.title, data.slug]
    .map(comparable)
    .filter(Boolean);
};

export const isDivisionPage = (row) =>
  String(rowData(row).sectionKey || "") === "divisions";

export const divisionMatchesPage = (division, page) => {
  if (!division || !page || !isDivisionPage(page)) return false;
  const divisionValues = identityValues(division);
  const pageValues = identityValues(page);
  return divisionValues.some((divisionValue) =>
    pageValues.some((pageValue) =>
      divisionValue === pageValue ||
      pageValue.startsWith(divisionValue) ||
      divisionValue.startsWith(pageValue)
    )
  );
};

const escapeHtml = (value) => String(value || "")
  .replace(/&/gu, "&amp;")
  .replace(/</gu, "&lt;")
  .replace(/>/gu, "&gt;")
  .replace(/"/gu, "&quot;")
  .replace(/'/gu, "&#39;");

const divisionBodyHtml = (data) => {
  const lead = compact(data?.lead);
  const highlights = Array.isArray(data?.highlights)
    ? data.highlights.map(compact).filter(Boolean)
    : [];
  return [
    lead ? `<p>${escapeHtml(lead)}</p>` : "",
    highlights.length
      ? `<ul>${highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "",
  ].join("");
};

const pageLanguageData = (divisionData, englishTitle, englishSlug, isHindi) => {
  const title = compact(divisionData?.title);
  const sourceLabel = englishTitle || title || "Division Overview";
  return {
    title,
    ...(isHindi ? {} : {
      slug: englishSlug,
      sectionKey: "divisions",
      sourceUrl: compact(divisionData?.sourceUrl),
      headingSize: "normal",
      contentSize: "normal",
      contentWidth: "normal",
      mediaSize: "normal",
      contentSpacing: "normal",
      hiddenProfileNames: [],
      featuredImage: "",
      cardIcon: "",
      cardColor: "",
      cardColor2: "",
    }),
    eyebrow: "",
    summary: compact(divisionData?.lead),
    html: "",
    blocks: [{
      id: `cms-division-overview-${englishSlug}`,
      type: "rich_text",
      label: sourceLabel,
      sourceLabel,
      value: title,
      contentHtml: divisionBodyHtml(divisionData),
      assets: [],
      legacyChildren: [],
      controlsSectionLabel: true,
    }],
    sectionContentVersion: 2,
  };
};

export const buildDivisionPageData = (divisionRow) => {
  const english = divisionRow?.data_en || {};
  const hindi = divisionRow?.data_hi || {};
  const slug = compact(english.slug || divisionRow?.entry_key)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "") || `division-${String(divisionRow?.id || "").slice(0, 8)}`;
  const title = compact(english.title) || "Division";
  return {
    entryKey: slug,
    dataEn: pageLanguageData(english, title, slug, false),
    dataHi: pageLanguageData(hindi, title, slug, true),
  };
};

const readDivisionPages = async (client, lock = false) => (
  await client.query(
    `SELECT *
       FROM cms_entries
      WHERE collection='pages'
        AND data_en->>'sectionKey'='divisions'
      ORDER BY status='archived', sort_order, entry_key
      ${lock ? "FOR UPDATE" : ""}`
  )
).rows;

const readDivisions = async (client, lock = false) => (
  await client.query(
    `SELECT *
       FROM cms_entries
      WHERE collection='divisions'
      ORDER BY status='archived', sort_order, entry_key
      ${lock ? "FOR UPDATE" : ""}`
  )
).rows;

const findPage = (pages, divisionRow, previousDivisionData) =>
  pages.find((page) =>
    divisionMatchesPage(divisionRow, page) ||
    (previousDivisionData && divisionMatchesPage(previousDivisionData, page))
  );

const findDivision = (divisions, pageRow, previousPageData) =>
  divisions.find((division) =>
    divisionMatchesPage(division, pageRow) ||
    (previousPageData && divisionMatchesPage(division, previousPageData))
  );

export const syncDivisionPage = async (
  client,
  divisionRow,
  { previousDivisionData = null, actorId = null } = {}
) => {
  const pages = await readDivisionPages(client, true);
  const page = findPage(pages, divisionRow, previousDivisionData);

  if (page) {
    const nextStatus = divisionRow.status;
    if (page.status === nextStatus) {
      return { row: page, before: page, created: false, changed: false };
    }
    const updated = (await client.query(
      `UPDATE cms_entries
          SET status=$1, version=version+1, updated_by=$2
        WHERE id=$3
        RETURNING *`,
      [nextStatus, actorId, page.id]
    )).rows[0];
    return { row: updated, before: page, created: false, changed: true };
  }

  if (divisionRow.status === "archived") {
    return { row: null, before: null, created: false, changed: false };
  }

  const generated = buildDivisionPageData(divisionRow);
  let entryKey = generated.entryKey;
  let suffix = 2;
  const occupied = new Set(
    (await client.query("SELECT entry_key FROM cms_entries WHERE collection='pages'")).rows
      .map((row) => row.entry_key)
  );
  while (occupied.has(entryKey)) {
    entryKey = `${generated.entryKey}-${suffix}`;
    suffix += 1;
  }

  const created = (await client.query(
    `INSERT INTO cms_entries
      (collection, entry_key, status, sort_order, data_en, data_hi, created_by, updated_by)
     VALUES ('pages',$1,$2,$3,$4,$5,$6,$6)
     RETURNING *`,
    [
      entryKey,
      divisionRow.status,
      Number(divisionRow.sort_order) || 0,
      generated.dataEn,
      generated.dataHi,
      actorId,
    ]
  )).rows[0];
  return { row: created, before: null, created: true, changed: true };
};

export const syncDivisionStatusFromPage = async (
  client,
  pageRow,
  { previousPageData = null, actorId = null } = {}
) => {
  if (!isDivisionPage(pageRow) && !isDivisionPage(previousPageData)) {
    return { row: null, before: null, changed: false };
  }
  const divisions = await readDivisions(client, true);
  const division = findDivision(divisions, pageRow, previousPageData);
  if (!division || division.status === pageRow.status) {
    return { row: division || null, before: division || null, changed: false };
  }
  const updated = (await client.query(
    `UPDATE cms_entries
        SET status=$1, version=version+1, updated_by=$2
      WHERE id=$3
      RETURNING *`,
    [pageRow.status, actorId, division.id]
  )).rows[0];
  return { row: updated, before: division, changed: true };
};

export const repairDivisionPageConsistency = async (client, actorId = null) => {
  const divisions = await readDivisions(client, false);
  const results = [];
  for (const division of divisions) {
    if (division.status === "archived") continue;
    results.push(await syncDivisionPage(client, division, { actorId }));
  }
  return {
    created: results.filter((result) => result.created).length,
    updated: results.filter((result) => result.changed && !result.created).length,
  };
};

export const liveDivisionOptions = async (client) => {
  const [divisions, pages] = await Promise.all([
    readDivisions(client, false),
    readDivisionPages(client, false),
  ]);
  return divisions
    .filter((division) => division.status !== "archived")
    .map((division) => {
      const page = findPage(pages, division, null);
      if (!page) return null;
      return {
        value: page.data_en?.slug || page.entry_key,
        label: division.data_en?.title || page.data_en?.title || page.entry_key,
      };
    })
    .filter(Boolean);
};
