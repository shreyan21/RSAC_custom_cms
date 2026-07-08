const htmlEntityMap = {
  amp: "&",
  gt: ">",
  lt: "<",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "\u2013",
  mdash: "\u2014",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  hellip: "\u2026",
  times: "\u00d7",
  deg: "\u00b0",
  middot: "\u00b7",
  bull: "\u2022",
  laquo: "\u00ab",
  raquo: "\u00bb",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  zwj: "\u200d",
  zwnj: "\u200c",
};

const rawHtmlKeys = new Set(["html", "contentHtml", "bodyHtml"]);

export const isRawHtmlKey = (key = "") => rawHtmlKeys.has(key);

const decodeOnce = (value) =>
  String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }

    if (normalized.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }

    return htmlEntityMap[normalized] ?? match;
  });

// Loop so double-encoded text ("&amp;ndash;") decodes completely. For
// PLAIN-TEXT fields only \u2014 never call on raw HTML bodies.
export const decodeHtmlEntities = (value = "") => {
  let text = String(value);

  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeOnce(text);
    if (next === text) break;
    text = next;
  }

  return text.replace(/[ \t]+\n/g, "\n").trim();
};

export const decodeLocalizedValue = (value, key = "") => {
  if (typeof value === "string") {
    return isRawHtmlKey(key) ? value : decodeHtmlEntities(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => decodeLocalizedValue(item, key));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, item]) => [
        childKey,
        decodeLocalizedValue(item, childKey),
      ])
    );
  }

  return value;
};
