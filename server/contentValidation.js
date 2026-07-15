import sanitizeHtml from "sanitize-html";
import { getCollection } from "../shared/cmsCollections.js";

const richTextOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "h2", "h3", "h4", "h5",
    "ul", "ol", "li", "blockquote", "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td", "caption", "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "title", "loading", "width", "height"],
    "*": ["lang"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }, true),
  },
};

const cleanUrl = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("/") || text.startsWith("#")) return text;
  try {
    const url = new URL(text);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? text : "";
  } catch {
    return "";
  }
};

const cleanBlocks = (blocks) => {
  if (!Array.isArray(blocks)) return [];
  return blocks.slice(0, 100).map((block) => {
    const next = { ...block, id: String(block.id || crypto.randomUUID()), type: String(block.type || "rich_text") };
    for (const key of ["html", "text"]) {
      if (typeof next[key] === "string") next[key] = sanitizeHtml(next[key], richTextOptions);
    }
    if (Array.isArray(next.assets)) {
      const allowedKinds = new Set(["image", "document", "video", "audio", "embed", "link"]);
      next.assets = next.assets.slice(0, 1000).map((asset) => ({
        ...asset,
        key: String(asset?.key || crypto.randomUUID()).slice(0, 160),
        kind: allowedKinds.has(String(asset?.kind)) ? String(asset.kind) : "link",
        label: String(asset?.label || "Media").trim().slice(0, 1000),
        value: cleanUrl(asset?.value),
        sourceValue: cleanUrl(asset?.sourceValue),
        linkedHref: cleanUrl(asset?.linkedHref),
        alt: String(asset?.alt || "").trim().slice(0, 1000),
        title: String(asset?.title || "").trim().slice(0, 1000),
        caption: String(asset?.caption || "").trim().slice(0, 5000),
        text: String(asset?.text || "").trim().slice(0, 1000),
        hidden: Boolean(asset?.hidden),
        isNew: Boolean(asset?.isNew),
      }));
    }
    return next;
  });
};

const cleanValue = (field, value) => {
  if (value === undefined || value === null) return field.type === "boolean" ? false : "";
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "number") return Number.isFinite(Number(value)) ? Number(value) : 0;
  if (field.type === "select") {
    const allowed = (field.options || []).map((option) => String(typeof option === "object" ? option.value : option));
    return allowed.includes(String(value)) ? String(value) : "";
  }
  if (field.type === "list") return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 200) : String(value).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (field.type === "json") return typeof value === "object" ? value : JSON.parse(String(value || "{}"));
  if (field.type === "blocks") return cleanBlocks(value);
  if (field.type === "richtext") return sanitizeHtml(String(value), richTextOptions);
  if (["url", "media"].includes(field.type)) return cleanUrl(value);
  return String(value).trim().slice(0, field.type === "textarea" ? 50000 : 1000);
};

export const validateEntryPayload = (collectionId, payload) => {
  const definition = getCollection(collectionId);
  if (!definition) throw Object.assign(new Error("Unknown collection"), { status: 404 });
  const sourceEn = payload.dataEn && typeof payload.dataEn === "object" ? payload.dataEn : {};
  const sourceHi = payload.dataHi && typeof payload.dataHi === "object" ? payload.dataHi : {};
  const dataEn = {};
  const dataHi = {};
  for (const field of definition.fields) {
    try {
      dataEn[field.name] = cleanValue(field, sourceEn[field.name]);
      if (field.localized !== false) dataHi[field.name] = cleanValue(field, sourceHi[field.name]);
    } catch {
      throw Object.assign(new Error(`Invalid value for ${field.label}`), { status: 400 });
    }
    if (field.required && !dataEn[field.name]) {
      throw Object.assign(new Error(`${field.label} is required`), { status: 400 });
    }
  }
  const status = ["draft", "published", "archived"].includes(payload.status) ? payload.status : "draft";
  if (status === "published" && definition.requireHindiWhenPublished) {
    const missingHindi = definition.fields.find((field) => field.required && field.localized !== false && !dataHi[field.name]);
    if (missingHindi) throw Object.assign(new Error(`${missingHindi.label} is required in Hindi before publishing`), { status: 400 });
  }
  const sortOrder = Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0;
  return { definition, dataEn, dataHi, status, sortOrder };
};
