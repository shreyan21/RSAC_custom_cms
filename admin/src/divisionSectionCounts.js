const structuralContentKeys = new Set([
  "id", "key", "hidden", "isNew", "sortOrder", "sourceFieldCount",
]);

const hasMeaningfulSectionValue = (value, key = "") => {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return Boolean(value.replace(/<[^>]+>/gu, " ").trim());
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulSectionValue(item));
  if (typeof value !== "object" || value.hidden === true) return false;
  return Object.entries(value).some(([childKey, childValue]) =>
    !structuralContentKeys.has(childKey) &&
    childKey !== key &&
    hasMeaningfulSectionValue(childValue, childKey)
  );
};

export const blockLabel = (block) => String(
  block?.sourceLabel || block?.heading || block?.value || block?.label || ""
).replace(/^Section:\s*/iu, "").trim();

export const hasVisibleBlockContent = (block) => {
  if (!block || block.hidden === true) return false;
  if (hasMeaningfulSectionValue(block.contentHtml)) return true;
  if (hasMeaningfulSectionValue(block.normalizedItemRows)) return true;
  if (hasMeaningfulSectionValue(block.children)) return true;
  if (hasMeaningfulSectionValue(block.legacyChildren)) return true;
  return hasMeaningfulSectionValue(block.assets);
};

export const projectSection = (block) => /\bprojects?\b/iu.test(blockLabel(block));

export const publicationSection = (block) =>
  /research|paper|publication|reports?|atlas/iu.test(blockLabel(block));

export const hasMatchingSection = (entry, sectionFilter) =>
  (entry.dataEn?.blocks || entry.data_en?.blocks || [])
    .some((block) => sectionFilter(block) && hasVisibleBlockContent(block));
