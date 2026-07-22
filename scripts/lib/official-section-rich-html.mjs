import sanitizeHtml from "sanitize-html";
import { JSDOM } from "jsdom";
import { getDivisionLiveSections } from "../../shared/divisionLiveSections.js";
import { collectDivisionSectionKeys } from "./division-sections.mjs";

const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
const semanticTags = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"]);
const richTextOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4",
    "ul", "ol", "li", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td", "caption", "span",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    span: ["data-rsac-tone"],
    "*": ["lang"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    h1: "h2",
    h5: "h4",
    h6: "h4",
  },
};

const compactText = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const normalizedLabel = (value) => compactText(value)
  .replace(/&amp;/giu, "&")
  .replace(/[^a-z0-9\p{Script=Devanagari}]+/giu, " ")
  .trim()
  .toLowerCase();

const assignTextKeys = (document) => {
  const byKey = new Map();
  const byNode = new Map();
  const walker = document.createTreeWalker(document.body, 4);
  let index = 0;
  let node = walker.nextNode();
  while (node) {
    let ignored = false;
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (ignoredTags.has(parent.tagName)) {
        ignored = true;
        break;
      }
    }
    if (!ignored && String(node.data || "").trim()) {
      index += 1;
      const key = `text-${String(index).padStart(4, "0")}`;
      byKey.set(key, node);
      byNode.set(node, key);
    }
    node = walker.nextNode();
  }
  return { byKey, byNode };
};

const semanticRoot = (node) => {
  const element = node?.parentElement;
  if (!element) return null;
  const table = element.closest("table");
  if (table) return table;
  const list = element.closest("ol, ul");
  if (list) {
    let root = list;
    while (root.parentElement?.closest("ol, ul")) root = root.parentElement.closest("ol, ul");
    return root;
  }
  let current = element;
  while (current && current.tagName !== "BODY") {
    if (semanticTags.has(current.tagName)) return current;
    current = current.parentElement;
  }
  return element;
};

const headingLikeParagraph = (element, position) => {
  if (position !== 0 || element.tagName !== "P") return false;
  const text = compactText(element.textContent);
  if (!text || text.length > 190) return false;
  const letters = text.match(/[A-Za-z]/gu) || [];
  const uppercase = text.match(/[A-Z]/gu) || [];
  return /general brief|brief description|activities|facilities available|\u0938\u093e\u092e\u093e\u0928\u094d\u092f \u0917\u0924\u093f\u0935\u093f\u0927\u093f|\u0938\u0902\u0915\u094d\u0937\u093f\u092a\u094d\u0924 \u0935\u093f\u0935\u0930\u0923|\u0909\u092a\u0932\u092c\u094d\u0927 \u0938\u0941\u0935\u093f\u0927\u093e/iu.test(text)
    || (letters.length >= 8 && uppercase.length / letters.length > 0.82);
};

const cleanRootHtml = (root, position) => {
  const clone = root.cloneNode(true);
  clone.querySelectorAll("img, picture, video, audio, iframe, source, script, style, noscript").forEach((node) => node.remove());
  if (headingLikeParagraph(clone, position)) {
    const heading = clone.ownerDocument.createElement("h3");
    while (clone.firstChild) heading.append(clone.firstChild);
    return sanitizeHtml(heading.outerHTML, richTextOptions);
  }
  if (semanticTags.has(clone.tagName) || ["TABLE", "UL", "OL"].includes(clone.tagName)) {
    return sanitizeHtml(clone.outerHTML, richTextOptions);
  }
  const paragraph = clone.ownerDocument.createElement("p");
  while (clone.firstChild) paragraph.append(clone.firstChild);
  return sanitizeHtml(paragraph.outerHTML, richTextOptions);
};

const mediaHeadingPattern = /^(?:related\s+(?:photos?|pictures?)|\u0938\u0902\u092c\u0902\u0927\u093f\u0924\s+(?:\u0924\u0938\u094d\u0935\u0940\u0930\u0947\u0902|\u092b\u094b\u091f\u094b))$/iu;

const isRepeatedMediaHeading = (root, sectionKey, pageTitle) => {
  if (sectionKey !== "map-photos" || !/^H[1-6]$/u.test(root.tagName)) return false;
  const heading = normalizedLabel(root.textContent);
  if (!heading) return false;
  if (mediaHeadingPattern.test(heading)) return true;
  const headingTokens = heading.split(" ").filter(Boolean);
  const titleTokens = new Set(normalizedLabel(pageTitle).split(" ").filter(Boolean));
  return headingTokens.length >= 3 && headingTokens.filter((token) => titleTokens.has(token)).length >= 3;
};

const htmlForKeys = (keys, textMap, sectionLabel, { sectionKey = "", pageTitle = "" } = {}) => {
  const roots = [];
  const seen = new Set();
  keys.forEach((key) => {
    const root = semanticRoot(textMap.byKey.get(key));
    if (root && !seen.has(root)) {
      roots.push(root);
      seen.add(root);
    }
  });

  const normalizedSectionLabel = normalizedLabel(sectionLabel);
  return roots.map((root, index) => ({ root, html: cleanRootHtml(root, index) }))
    .filter(({ root, html }) => html && !(
      (sectionKey === "map-photos" && !/^H[1-6]$/u.test(root.tagName))
      ||
      (/^H[1-6]$/u.test(root.tagName)
        && normalizedSectionLabel
        && normalizedLabel(root.textContent) === normalizedSectionLabel)
      || isRepeatedMediaHeading(root, sectionKey, pageTitle)
    ))
    .map(({ html }) => html)
    .join("");
};

const liveSectionKey = (slug, block, index) => {
  const definitions = getDivisionLiveSections(slug);
  const candidates = [block?.sourceLabel, block?.label, block?.value].map(normalizedLabel).filter(Boolean);
  const matched = definitions.find((definition) => [definition.englishLabel, definition.hindiLabel]
    .map(normalizedLabel)
    .some((label) => candidates.includes(label)));
  return matched?.key || definitions[index]?.key || "";
};

export const buildOfficialSectionRichHtml = ({ data, fallbackSlug = "" }) => {
  const html = String(data?.html || "");
  const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
  if (!html || !blocks.length) return new Map();

  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const document = dom.window.document;
  const textMap = assignTextKeys(document);
  const slug = String(data?.slug || fallbackSlug || "");
  const divisionSections = collectDivisionSectionKeys(html, data?.title || "", slug)?.sections || [];
  const bySectionKey = new Map(divisionSections.map((section) => [section.key, section.textKeys]));
  const result = new Map();

  blocks.forEach((block, index) => {
    const sectionKey = liveSectionKey(slug, block, index);
    if (sectionKey === "scientific-manpower" || /scientific manpower/iu.test(String(block?.sourceLabel || ""))) return;
    const keys = bySectionKey.get(sectionKey)
      || (block?.legacyChildren || []).filter((child) => !child?.hidden).map((child) => child?.key).filter(Boolean);
    if (!keys?.length) return;
    const richHtml = htmlForKeys(
      keys,
      textMap,
      block?.value || block?.sourceLabel || block?.label,
      { sectionKey, pageTitle: data?.title || "" }
    );
    if (richHtml) result.set(String(block.id || index), richHtml);
  });
  return result;
};
