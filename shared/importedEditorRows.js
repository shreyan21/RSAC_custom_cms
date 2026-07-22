const normalizeEditorText = (value) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/&amp;/giu, "&")
    .replace(/&nbsp;/giu, " ")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanBlockLabel = (value) =>
  String(value || "").replace(/^section\s*:\s*/iu, "").trim();

const blockLabels = (block) =>
  [block?.sourceLabel, block?.heading, block?.value, block?.label]
    .map(cleanBlockLabel)
    .map(normalizeEditorText)
    .filter(Boolean);

const pageTitles = (...pages) =>
  pages
    .flatMap((page) => [page?.title, page?.baseTitle])
    .map(normalizeEditorText)
    .filter(Boolean);

const childKey = (child) => String(child?.key || "");

const sourceKeysOverlap = (left, right) => {
  const leftKeys = new Set([childKey(left), ...(left?.sourceKeys || [])].filter(Boolean));
  return [childKey(right), ...(right?.sourceKeys || [])].some((key) => leftKeys.has(key));
};

export const findImportedReferenceBlock = (blocks, block, fallbackIndex = -1) => {
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return null;
  const id = String(block?.id || "");
  if (id) {
    const exact = list.find((candidate) => String(candidate?.id || "") === id);
    if (exact) return exact;
  }
  const labels = new Set(blockLabels(block));
  const labelMatch = list.find((candidate) => blockLabels(candidate).some((label) => labels.has(label)));
  return labelMatch || list[fallbackIndex] || null;
};

export const isImportedStructuralRow = ({
  child,
  referenceChild,
  block,
  referenceBlock,
  pageData,
  referencePageData,
}) => {
  if (child?.isNew || referenceChild?.isNew) return false;
  if (child?.editorVisible === false || referenceChild?.editorVisible === false) return true;
  if (child?.structural || referenceChild?.structural) return true;

  const values = [child?.value, referenceChild?.value]
    .map(normalizeEditorText)
    .filter(Boolean);
  const titles = new Set(pageTitles(pageData, referencePageData));
  const labels = new Set([...blockLabels(block), ...blockLabels(referenceBlock)]);

  // Duplicate imported headings can have a deliberately blank value while the
  // old editor label still reads "Section -> Section". Hide only those
  // structural blanks; ordinary blank body rows remain editable.
  if (!values.length) {
    const structuralNames = new Set([...titles, ...labels]);
    const rowLabelParts = [child?.label, referenceChild?.label]
      .map((label) => String(label || ""))
      .flatMap((label) => label.split(/\s*(?:\u2192|->)\s*/u))
      .map(normalizeEditorText)
      .filter(Boolean);
    return rowLabelParts.some((label) => structuralNames.has(label));
  }

  if (values.some((value) => titles.has(value))) return true;

  const controlsSectionLabel =
    block?.controlsSectionLabel !== false || referenceBlock?.controlsSectionLabel !== false;
  if (controlsSectionLabel) {
    if (values.some((value) => labels.has(value))) return true;
  }

  return false;
};

const matchCurrentChild = (children, used, referenceChild, referenceIndex) => {
  let index = children.findIndex((child, position) =>
    !used.has(position) && sourceKeysOverlap(child, referenceChild)
  );
  if (index >= 0) return index;
  if (referenceIndex < children.length && !used.has(referenceIndex)) return referenceIndex;
  index = children.findIndex((_child, position) => !used.has(position));
  return index;
};

export const importedEditorRows = ({
  block,
  referenceBlock = block,
  pageData,
  referencePageData = pageData,
}) => {
  const children = Array.isArray(block?.children) ? block.children : [];
  const referenceChildren = Array.isArray(referenceBlock?.children)
    ? referenceBlock.children
    : children;
  const used = new Set();
  const rows = [];

  referenceChildren.forEach((referenceChild, referenceIndex) => {
    const index = matchCurrentChild(children, used, referenceChild, referenceIndex);
    const child = index >= 0
      ? children[index]
      : { ...referenceChild, value: "", language: "hi" };
    if (index >= 0) used.add(index);
    if (isImportedStructuralRow({
      child,
      referenceChild,
      block,
      referenceBlock,
      pageData,
      referencePageData,
    })) return;
    rows.push({ child, referenceChild, index, referenceIndex, virtual: index < 0 });
  });

  children.forEach((child, index) => {
    if (used.has(index)) return;
    if (isImportedStructuralRow({
      child,
      referenceChild: null,
      block,
      referenceBlock,
      pageData,
      referencePageData,
    })) return;
    rows.push({ child, referenceChild: null, index, referenceIndex: -1, virtual: false });
  });

  return rows;
};

export const localizedImportedEditorRows = ({
  block,
  referenceBlock,
  pageData,
  referencePageData,
}) => {
  const rows = importedEditorRows({
    block,
    referenceBlock: block,
    pageData,
    referencePageData: pageData,
  });
  const references = importedEditorRows({
    block: referenceBlock,
    referenceBlock,
    pageData: referencePageData,
    referencePageData,
  });
  const used = new Set();

  return rows.map((row, index) => {
    let referenceIndex = references.findIndex((candidate, position) =>
      !used.has(position) && sourceKeysOverlap(row.child, candidate.child)
    );
    if (referenceIndex < 0 && index < references.length && !used.has(index)) {
      referenceIndex = index;
    }
    if (referenceIndex < 0) {
      referenceIndex = references.findIndex((_candidate, position) => !used.has(position));
    }
    if (referenceIndex < 0) return row;
    used.add(referenceIndex);
    return {
      ...row,
      referenceChild: references[referenceIndex].child,
      referenceIndex,
    };
  });
};

export const updateImportedEditorRow = (children, row, patch) => {
  const list = Array.isArray(children) ? children : [];
  if (row.index >= 0) {
    return list.map((child, index) => index === row.index ? { ...child, ...patch } : child);
  }
  const localized = {
    ...(row.referenceChild || row.child || {}),
    value: "",
    richText: "",
    language: "hi",
    ...patch,
  };
  const insertAt = Math.min(Math.max(row.referenceIndex, 0), list.length);
  return [...list.slice(0, insertAt), localized, ...list.slice(insertAt)];
};

export { normalizeEditorText };
