const visibleAssets = (block) => Array.isArray(block?.assets)
  ? block.assets.filter((asset) =>
      !asset?.hidden && Boolean(String(asset?.value || asset?.sourceValue || "").trim())
    )
  : [];

const hasRenderableHtml = (html) => {
  const source = String(html || "");
  if (/<(?:img|video|audio|iframe|source|table|hr)\b/iu.test(source)) return true;
  return source
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/\s+/gu, " ")
    .trim().length > 0;
};

export const isCmsCreatedSection = (block) =>
  String(block?.id || "").startsWith("cms-section-");

export const resolveCanonicalSectionPresentation = (
  block,
  index,
  language = "en",
  { tabbed = false, allowHeadingOnly = false } = {}
) => {
  if (!block || block.hidden || !Object.hasOwn(block, "contentHtml")) return null;

  const editorCreated = isCmsCreatedSection(block);
  const heading = String(block.value || "").trim();
  const hasBody = hasRenderableHtml(block.contentHtml);
  const hasMedia = visibleAssets(block).length > 0;

  if (!hasBody && !hasMedia && !(heading && (editorCreated || allowHeadingOnly))) {
    return null;
  }

  let label = heading;
  if (tabbed && !label) {
    label = editorCreated
      ? `${language === "hi" ? "अनुभाग" : "Section"} ${index + 1}`
      : String(block.sourceLabel || block.label || "").trim();
  }
  if (tabbed && !label) return null;

  return {
    editorCreated,
    hasBody,
    hasMedia,
    heading,
    label,
  };
};
