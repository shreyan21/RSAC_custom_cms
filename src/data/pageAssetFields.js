const DOCUMENT_EXTENSION = /\.(?:pdf|docx?|xlsx?|csv|pptx?|zip|rar|apk)(?:[?#].*)?$/i;
const VIDEO_EXTENSION = /\.(?:mp4|webm|mov|m4v)(?:[?#].*)?$/i;
const AUDIO_EXTENSION = /\.(?:mp3|wav|ogg|m4a)(?:[?#].*)?$/i;

const assetDefinitions = [
  { selector: "img[src]", prefix: "image", attribute: "src", fixedKind: "image" },
  { selector: "a[href]", prefix: "link", attribute: "href" },
  { selector: "video[src]", prefix: "video", attribute: "src", fixedKind: "video" },
  { selector: "video[poster]", prefix: "poster", attribute: "poster", fixedKind: "image", attributeOnly: true },
  { selector: "audio[src]", prefix: "audio", attribute: "src", fixedKind: "audio" },
  { selector: "source[src]", prefix: "source", attribute: "src" },
  { selector: "iframe[src]", prefix: "embed", attribute: "src", fixedKind: "embed" },
  { selector: "object[data]", prefix: "object", attribute: "data", fixedKind: "embed" },
  { selector: "embed[src]", prefix: "embedded-file", attribute: "src", fixedKind: "embed" },
];

const compactText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const fileNameFromUrl = (value) => {
  const clean = String(value || "").split(/[?#]/)[0];
  const fileName = clean.split("/").at(-1) || clean;
  try {
    return decodeURIComponent(fileName).replace(/[_-]+/g, " ").trim();
  } catch {
    return fileName.replace(/[_-]+/g, " ").trim();
  }
};

const kindFor = (value, element, fixedKind) => {
  if (fixedKind) return fixedKind;
  if (element?.tagName === "SOURCE") {
    if (element.closest("video")) return "video";
    if (element.closest("audio")) return "audio";
  }
  if (DOCUMENT_EXTENSION.test(value)) return "document";
  if (VIDEO_EXTENSION.test(value)) return "video";
  if (AUDIO_EXTENSION.test(value)) return "audio";
  return "link";
};

const isEditableLink = (element, value) => {
  if (!value || value === "#" || /^(?:javascript|mailto|tel):/i.test(value)) return false;
  const image = element.querySelector("img[src]");
  return !(
    image &&
    !compactText(element.textContent) &&
    compactText(image.getAttribute("src")) === compactText(value)
  );
};

const defaultLabel = ({ kind, value, element, index }) => {
  const visibleText = compactText(element?.textContent);
  const description = compactText(
    element?.getAttribute?.("alt") ||
    element?.getAttribute?.("title") ||
    visibleText ||
    fileNameFromUrl(value)
  );
  const prefix = {
    image: "Image",
    document: "Document",
    video: "Video",
    audio: "Audio",
    embed: "Embedded content",
    link: "Web link",
  }[kind] || "Media";
  return `${prefix} ${index}${description ? `: ${description}` : ""}`;
};

const scanAssetElements = (document) => {
  const entries = [];

  assetDefinitions.forEach((definition) => {
    const byValue = new Map();
    let uniqueIndex = 0;
    Array.from(document.querySelectorAll(definition.selector)).forEach((element) => {
      const sourceValue = compactText(element.getAttribute(definition.attribute));
      if (!sourceValue) return;
      if (element.tagName === "A" && !isEditableLink(element, sourceValue)) return;

      const identity = sourceValue;
      const existing = byValue.get(identity);
      if (existing) {
        existing.elements.push(element);
        return;
      }

      uniqueIndex += 1;
      const kind = kindFor(sourceValue, element, definition.fixedKind);
      const linkedImageAnchor = element.tagName === "IMG"
        ? element.closest("a[href]")
        : null;
      const linkedHref = linkedImageAnchor && !compactText(linkedImageAnchor.textContent) &&
        compactText(linkedImageAnchor.getAttribute("href")) === sourceValue
        ? sourceValue
        : "";
      const entry = {
        key: `asset-${definition.prefix}-${String(uniqueIndex).padStart(4, "0")}`,
        target: definition.prefix,
        kind,
        sourceValue,
        value: sourceValue,
        attribute: definition.attribute,
        attributeOnly: Boolean(definition.attributeOnly),
        element,
        elements: [element],
        linkedHref,
      };
      entry.label = defaultLabel({ ...entry, index: uniqueIndex });
      byValue.set(identity, entry);
      entries.push(entry);
    });
  });

  return entries;
};

export const extractPageAssetFieldsFromDocument = (document) =>
  scanAssetElements(document).map((entry) => ({
    key: entry.key,
    target: entry.target,
    kind: entry.kind,
    label: entry.label,
    value: entry.value,
    sourceValue: entry.sourceValue,
    ...(entry.kind === "image" ? { alt: compactText(entry.element.getAttribute("alt")) } : {}),
    ...(entry.element.getAttribute("title") ? { title: compactText(entry.element.getAttribute("title")) } : {}),
    ...(entry.linkedHref ? { linkedHref: entry.linkedHref } : {}),
  }));

export const extractPageAssetFields = (html) => {
  if (typeof DOMParser === "undefined") return [];
  const document = new DOMParser().parseFromString(html || "", "text/html");
  return extractPageAssetFieldsFromDocument(document);
};

export const flattenPageAssetFields = (blocks) =>
  (Array.isArray(blocks) ? blocks : []).flatMap((block) =>
    Array.isArray(block?.assets) ? block.assets : []
  );

const safeAssetUrl = (value, kind) => {
  const text = compactText(value);
  if (!text || /^javascript:/i.test(text)) return "";
  if (text.startsWith("/") || text.startsWith("#")) return text;
  if (kind === "image" && /^data:image\//i.test(text)) return text;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  try {
    const url = new URL(text);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? text : "";
  } catch {
    return "";
  }
};

const unwrap = (element) => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  element.remove();
};

const removeAssetElement = (element, entry) => {
  if (!element?.isConnected) return;
  if (entry.attributeOnly) {
    element.removeAttribute(entry.attribute);
    return;
  }
  if (element.tagName === "A") {
    unwrap(element);
    return;
  }
  const parentLink = element.parentElement?.closest("a[href]");
  element.remove();
  if (parentLink && !compactText(parentLink.textContent) && !parentLink.querySelector("img, video, audio, iframe, object, embed")) {
    parentLink.remove();
  }
};

export const applyPageAssetFields = (html, fields, { applyLabels = true } = {}) => {
  if (typeof DOMParser === "undefined" || !Array.isArray(fields) || !fields.length) return html || "";
  const document = new DOMParser().parseFromString(html || "", "text/html");
  const entries = scanAssetElements(document);

  fields.filter((field) => !field?.isNew).forEach((field) => {
    const sourceValue = compactText(field.sourceValue);
    const entry = entries.find((candidate) =>
      candidate.target === field.target &&
      candidate.kind === field.kind &&
      sourceValue &&
      candidate.sourceValue === sourceValue
    ) || entries.find((candidate) => candidate.key === field.key)
      || entries.find((candidate) => candidate.kind === field.kind && sourceValue && candidate.sourceValue === sourceValue);
    if (!entry) return;

    const nextValue = safeAssetUrl(field.value, field.kind);
    entry.elements.forEach((element) => {
      if (field.hidden || !nextValue) {
        removeAssetElement(element, entry);
        return;
      }
      element.setAttribute(entry.attribute, nextValue);
      if (field.kind === "image" && applyLabels && field.alt !== undefined) {
        element.setAttribute("alt", compactText(field.alt));
      }
      if (applyLabels && field.title !== undefined) {
        const title = compactText(field.title);
        if (title) element.setAttribute("title", title);
        else element.removeAttribute("title");
      }
      if (entry.linkedHref) {
        const anchor = element.closest("a[href]");
        if (anchor && compactText(anchor.getAttribute("href")) === entry.linkedHref) {
          anchor.setAttribute("href", nextValue);
        }
      }
    });
  });

  return document.body.innerHTML;
};

export const appendNewPageAssets = (html, fields) => {
  if (typeof DOMParser === "undefined") return html || "";
  const additions = (Array.isArray(fields) ? fields : []).filter((field) => field?.isNew && !field.hidden);
  if (!additions.length) return html || "";
  const document = new DOMParser().parseFromString(html || "", "text/html");

  additions.forEach((field) => {
    const value = safeAssetUrl(field.value, field.kind);
    if (!value) return;
    if (field.kind === "image") {
      const figure = document.createElement("figure");
      figure.dataset.rsacAddedAsset = "true";
      const image = document.createElement("img");
      image.src = value;
      image.alt = compactText(field.alt);
      figure.append(image);
      if (compactText(field.caption)) {
        const caption = document.createElement("figcaption");
        caption.textContent = compactText(field.caption);
        figure.append(caption);
      }
      document.body.append(figure);
      return;
    }
    if (field.kind === "video" || field.kind === "audio") {
      const media = document.createElement(field.kind);
      media.controls = true;
      media.src = value;
      media.dataset.rsacAddedAsset = "true";
      document.body.append(media);
      return;
    }
    const paragraph = document.createElement("p");
    paragraph.dataset.rsacAddedAsset = "true";
    const link = document.createElement("a");
    link.href = value;
    link.textContent = compactText(field.text) || fileNameFromUrl(value) || "Open file";
    if (/^https?:/i.test(value)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    paragraph.append(link);
    document.body.append(paragraph);
  });

  return document.body.innerHTML;
};
