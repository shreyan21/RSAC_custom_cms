// These pages have two public routes and one authoritative section-body record.
// Resolution happens in memory; the academic row keeps its route metadata and
// the database never needs a second write for a shared body edit.
export const pageBodyAliases = [
  {
    aliasKey: "school-of-geo-informatics-",
    ownerKey: "school-of-geo-informatics-division1",
    label: "School of Geo-Informatics",
  },
  {
    aliasKey: "training-division-",
    ownerKey: "training-division",
    label: "Training Division",
  },
];

const aliasMap = new Map(pageBodyAliases.map((alias) => [alias.aliasKey, alias]));
const ownerKeys = new Set(pageBodyAliases.map((alias) => alias.ownerKey));
const entryKeyOf = (entry) => String(entry?.entry_key || entry?.entryKey || entry?.key || "");
const englishDataOf = (entry) => entry?.data_en || entry?.dataEn || entry || {};

export const pageBodyOwnerForEntry = (entry) => aliasMap.get(entryKeyOf(entry)) || null;

export const isCanonicalAcademicPage = (entry) =>
  ownerKeys.has(entryKeyOf(entry)) && englishDataOf(entry).sectionKey === "divisions";

export const pageBodyFieldNames = ["html", "blocks", "sectionContentVersion"];
const languagePairs = [["dataEn", "data_en"], ["dataHi", "data_hi"]];
const bodyFieldDefault = (field) => field === "blocks" ? [] : field === "html" ? "" : undefined;
const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};

// Compare the original request before validation sanitizes its markup. Omitted
// fields are unchanged metadata-only input; array order remains meaningful.
export const getAliasPageBodyChanges = (storedEntry, requestEntry = {}) => {
  if (!pageBodyOwnerForEntry(storedEntry)) return [];
  const changes = [];
  for (const [camel, snake] of languagePairs) {
    const stored = storedEntry?.[snake] || storedEntry?.[camel] || {};
    const requested = requestEntry?.[camel] || requestEntry?.[snake] || {};
    for (const field of pageBodyFieldNames) {
      if (!Object.hasOwn(requested, field)) continue;
      const before = stored[field] ?? bodyFieldDefault(field);
      const after = requested[field] ?? bodyFieldDefault(field);
      if (JSON.stringify(stableValue(before)) !== JSON.stringify(stableValue(after))) {
        changes.push(`${camel}.${field}`);
      }
    }
  }
  return changes;
};

export const changedAliasBodyFields = getAliasPageBodyChanges;

export const preserveAliasStoredBody = (storedData = {}, validatedData = {}) => {
  const next = { ...validatedData };
  for (const field of pageBodyFieldNames) {
    if (Object.hasOwn(storedData, field)) next[field] = structuredClone(storedData[field]);
    else delete next[field];
  }
  return next;
};

export const preserveAliasPageBodyFields = (storedEntry, dataEn, dataHi) => {
  if (!pageBodyOwnerForEntry(storedEntry)) return { dataEn, dataHi };
  const next = { dataEn: { ...dataEn }, dataHi: { ...dataHi } };
  for (const [camel, snake] of languagePairs) {
    const stored = storedEntry?.[snake] || storedEntry?.[camel] || {};
    next[camel] = preserveAliasStoredBody(stored, next[camel]);
  }
  return next;
};

const compact = (value) => String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
const sectionIdentity = (block) => compact(block?.sourceLabel || block?.label || block?.value).toLowerCase();

const matchingBlock = (blocks, block, index) => {
  const list = Array.isArray(blocks) ? blocks : [];
  const id = String(block?.id || "");
  const identity = sectionIdentity(block);
  return (id && list.find((candidate) => String(candidate?.id || "") === id))
    || (identity && list.find((candidate) => sectionIdentity(candidate) === identity))
    || list[index];
};

// Imported links can share a key. The original source distinguishes those
// records, and stays stable when the canonical editor replaces their address.
const assetIdentity = (asset) => [
  asset?.kind || "asset",
  asset?.key || "",
  asset?.sourceValue || asset?.value || "",
].map(String).join("\u0000");

const preserveRouteAssets = (ownerAssets, routeAssets, routeOnlyAssetIdentities) => {
  const stored = Array.isArray(routeAssets) ? routeAssets : [];
  const used = new Set();
  const assets = (Array.isArray(ownerAssets) ? ownerAssets : []).map((asset) => {
    const identity = assetIdentity(asset);
    const index = stored.findIndex((candidate, position) =>
      !used.has(position) && assetIdentity(candidate) === identity
    );
    if (index >= 0) used.add(index);
    const routeAsset = stored[index];
    const isLink = asset?.kind === "link" || asset?.target === "link";
    return {
      ...structuredClone(asset),
      ...(isLink && routeAsset ? { hidden: Boolean(routeAsset.hidden) } : {}),
    };
  });
  // Only explicitly approved route-only media survives canonical deletion.
  // Appending every unmatched historical asset would resurrect removed photos.
  // The current four records have no unique Academic photo/document assets.
  stored.forEach((asset, index) => {
    if (!used.has(index) && routeOnlyAssetIdentities.has(assetIdentity(asset))) {
      assets.push(structuredClone(asset));
    }
  });
  return assets;
};

export const resolveOwnedPageBody = (ownerData = {}, routeData = {}, { routeOnlyAssets = [] } = {}) => {
  const routeOnlyAssetIdentities = new Set(routeOnlyAssets.map(assetIdentity));
  const next = { ...structuredClone(routeData) };
  next.html = String(ownerData.html || "");
  next.blocks = (Array.isArray(ownerData.blocks) ? ownerData.blocks : []).map((block, index) => {
    const routeBlock = matchingBlock(routeData.blocks, block, index);
    const resolved = structuredClone(block);
    if (Array.isArray(block?.assets) || Array.isArray(routeBlock?.assets)) {
      resolved.assets = preserveRouteAssets(block?.assets, routeBlock?.assets, routeOnlyAssetIdentities);
    }
    return resolved;
  });
  if (Object.hasOwn(ownerData, "sectionContentVersion")) next.sectionContentVersion = ownerData.sectionContentVersion;
  else delete next.sectionContentVersion;
  // The assembler can use this source slug for canonical managed list records.
  next.bodyOwnerSlug = String(ownerData.slug || "");
  return next;
};

// Call before localization so Hindi structural assets and English reference
// blocks are derived from the same resolved body. If a published body owner is
// absent (draft/archived), its aliases disappear too instead of showing stale
// copies. Other collections and unrelated pages retain their original records.
export const resolvePageBodyRows = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  const pages = new Map(list.filter((row) => row.collection === "pages")
    .map((row) => [entryKeyOf(row), row]));
  return list.flatMap((row) => {
    if (row.collection !== "pages") return [row];
    const reference = pageBodyOwnerForEntry(row);
    if (!reference) return [row];
    const owner = pages.get(reference.ownerKey);
    if (!owner) return [];
    const ownerSlug = String(owner.data_en?.slug || entryKeyOf(owner));
    return [{
      ...row,
      data_en: {
        ...resolveOwnedPageBody(owner.data_en, row.data_en),
        bodyOwnerKey: reference.ownerKey,
        bodyOwnerSlug: ownerSlug,
      },
      data_hi: {
        ...resolveOwnedPageBody(owner.data_hi, row.data_hi),
        bodyOwnerKey: reference.ownerKey,
        bodyOwnerSlug: ownerSlug,
      },
    }];
  });
};
