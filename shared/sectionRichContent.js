import { importedEditorRows } from "./importedEditorRows.js";

export const SECTION_CONTENT_VERSION = 2;
export const SECTION_CONTENT_FIELD = "contentHtml";

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const blockMarkupPattern = /<(?:p|h[2-4]|ul|ol|li|blockquote|table|thead|tbody|tr|th|td)\b/iu;
const numberedSectionPattern = /research|papers?|reports?|projects?|publications?|\u0936\u094b\u0927|\u0930\u093f\u092a\u094b\u0930\u094d\u091f|\u092a\u0930\u093f\u092f\u094b\u091c\u0928\u093e|\u092a\u094d\u0930\u0915\u093e\u0936\u0928/iu;
const bulletedSectionPattern = /software|hardware|facilit(?:y|ies)|\u0938\u0949\u092b\u094d\u091f\u0935\u0947\u092f\u0930|\u0939\u093e\u0930\u094d\u0921\u0935\u0947\u092f\u0930|\u0938\u0941\u0935\u093f\u0927\u093e/iu;
const peopleSectionPattern = /scientific manpower|\u0935\u0948\u091c\u094d\u091e\u093e\u0928\u093f\u0915 \u091c\u0928\u0936\u0915\u094d\u0924\u093f/iu;

const sectionLabel = (block) => String(
  block?.sourceLabel || block?.heading || block?.value || block?.label || ""
).replace(/^section\s*:\s*/iu, "").trim();

const inlineMarkup = (child) => {
  const value = String(child?.value || "").trim();
  if (!value) return "";
  const richText = String(child?.richText || "").trim();
  if (!richText) return escapeHtml(value).replace(/\r?\n/g, "<br>");
  return richText;
};

export const hasCanonicalSectionContent = (block) =>
  Boolean(block && Object.hasOwn(block, SECTION_CONTENT_FIELD));

export const isPeopleSectionBlock = (block) => peopleSectionPattern.test(sectionLabel(block));

export const legacySectionRows = (block, pageData) => importedEditorRows({
  block,
  referenceBlock: block,
  pageData,
  referencePageData: pageData,
}).filter(({ child }) => !child?.hidden && String(child?.value || "").trim());

export const legacyRowsToRichHtml = (block, pageData) => {
  if (!block || isPeopleSectionBlock(block)) return "";

  const directHtml = [block.html, block.body, block.text]
    .find((value) => typeof value === "string" && value.trim());
  if (directHtml) return directHtml.trim();

  const rows = legacySectionRows(block, pageData);
  if (!rows.length) return "";

  const items = rows.map(({ child }) => inlineMarkup(child)).filter(Boolean);
  if (!items.length) return "";

  const label = sectionLabel(block);
  if (block.editorMode === "numbered_list" || numberedSectionPattern.test(label)) {
    return `<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>`;
  }
  if (bulletedSectionPattern.test(label) && items.length > 1) {
    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }
  return items
    .map((item) => blockMarkupPattern.test(item) ? item : `<p>${item}</p>`)
    .join("");
};

export const migrateSectionBlock = (block, pageData) => {
  if (!block || typeof block !== "object") return { block, changed: false };
  const hasChildren = Array.isArray(block.children);
  const hasCanonical = hasCanonicalSectionContent(block);
  if (hasCanonical && !hasChildren) return { block, changed: false };

  const next = {
    ...block,
    [SECTION_CONTENT_FIELD]: hasCanonical
      ? String(block[SECTION_CONTENT_FIELD] || "")
      : legacyRowsToRichHtml(block, pageData),
  };
  if (hasChildren) {
    next.legacyChildren = Array.isArray(next.legacyChildren)
      ? next.legacyChildren
      : block.children;
    delete next.children;
  }
  return { block: next, changed: true };
};

export const migrateSectionData = (data) => {
  if (!data || typeof data !== "object") return { data: data || {}, changed: false };
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  let changed = data.sectionContentVersion !== SECTION_CONTENT_VERSION;
  const migratedBlocks = blocks.map((block) => {
    const migrated = migrateSectionBlock(block, data);
    changed ||= migrated.changed;
    return migrated.block;
  });
  return {
    data: {
      ...data,
      blocks: migratedBlocks,
      sectionContentVersion: SECTION_CONTENT_VERSION,
    },
    changed,
  };
};
