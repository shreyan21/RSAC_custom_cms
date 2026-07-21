import { decodeHtmlEntities } from "../utils/htmlEntities.js";
import { canonicalDivisionSection } from "./divisionSectionLabels.js";

const TOKEN_PATTERN = /<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g;
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const IGNORED_ELEMENTS = new Set(["script", "style", "noscript", "template"]);
const KIND_LABELS = {
  a: "Link text",
  caption: "Table caption",
  figcaption: "Image caption",
  h1: "Main heading",
  h2: "Heading",
  h3: "Subheading",
  h4: "Small heading",
  h5: "Small heading",
  h6: "Small heading",
  li: "List item",
  p: "Paragraph",
  td: "Table cell",
  th: "Table heading",
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const canonicalText = (value) =>
  decodeHtmlEntities(value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[:：]$/, "")
    .trim();

const parseTag = (token) => {
  const closing = token.match(/^<\s*\/\s*([a-z0-9:-]+)/i);
  if (closing) {
    return { closing: true, name: closing[1].toLowerCase(), selfClosing: false };
  }

  const opening = token.match(/^<\s*([a-z0-9:-]+)/i);
  if (!opening) return null;

  const name = opening[1].toLowerCase();
  return {
    closing: false,
    name,
    selfClosing: VOID_ELEMENTS.has(name) || /\/\s*>$/.test(token),
  };
};

const processHtmlText = (html, visitor) => {
  const source = String(html || "");
  const tokens = source.match(TOKEN_PATTERN) || [];
  const stack = [];
  let editableIndex = 0;

  const output = tokens.map((token) => {
    if (token.startsWith("<")) {
      const tag = parseTag(token);
      if (!tag) return token;

      if (tag.closing) {
        const matchingIndex = stack.lastIndexOf(tag.name);
        if (matchingIndex >= 0) stack.splice(matchingIndex);
      } else if (!tag.selfClosing) {
        stack.push(tag.name);
      }
      return token;
    }

    if (stack.some((tag) => IGNORED_ELEMENTS.has(tag))) return token;

    const decoded = decodeHtmlEntities(token);
    const value = decoded.trim();
    if (!value) return token;

    editableIndex += 1;
    return visitor({
      key: `text-${String(editableIndex).padStart(4, "0")}`,
      kind: stack.at(-1) || "text",
      stack: stack.slice(),
      raw: token,
      value,
    });
  });

  return output.join("");
};

const HEADING_TAG = /^h[1-6]$/;
const clip = (value, max) => {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

// Human-friendly row labels for CMS editors: instead of "Paragraph 1"
// or "Text 11", each row is named by the page section it sits under plus a
// preview of its own text, e.g. "Ongoing Projects → Space Based Information…".
// The label is cosmetic (editors read it); rendering uses key + value only.
export const extractPageTextFields = (html) => {
  const fields = [];
  let currentSection = "";
  let headingBuffer = [];

  processHtmlText(html, ({ key, stack, raw, value }) => {
    const inHeading = stack.some((tag) => HEADING_TAG.test(tag));
    if (inHeading) {
      headingBuffer.push(value);
    } else if (headingBuffer.length) {
      const headingText = headingBuffer.join(" ");
      currentSection = canonicalDivisionSection(headingText) || clip(headingText, 38);
      headingBuffer = [];
    }

    const preview = clip(value, 60);
    let label;
    if (inHeading) {
      const category = canonicalDivisionSection(value);
      label = category ? category : `Section: ${preview}`;
    } else if (currentSection) {
      label = `${currentSection} → ${preview}`;
    } else {
      label = `Intro → ${preview}`;
    }

    fields.push({ key, label, value });
    return raw;
  });

  return fields;
};

// Row content-type per key ("Paragraph", "List item", "Table cell", "Heading",
// "Text", …), derived straight from the locked HTML. Used to decide which rows
// are worth editing without depending on the human label text.
export const extractPageTextKinds = (html) => {
  const kinds = new Map();
  processHtmlText(html, ({ key, kind, raw }) => {
    kinds.set(key, KIND_LABELS[kind] || "Text");
    return raw;
  });
  return kinds;
};

const TABLE_TAGS = new Set(["table", "thead", "tbody", "tfoot", "tr", "td", "th"]);
const LIST_TAGS = new Set(["ul", "ol", "li", "dl", "dt", "dd", "menu"]);

// Per-key context: content type plus whether the text sits inside a data table
// or a list. Lets the row-trimmer keep section headers / tab labels / prose
// while dropping bulk data (table cells, long citation lists).
export const extractPageTextContext = (html) => {
  const context = new Map();
  processHtmlText(html, ({ key, kind, stack, raw }) => {
    context.set(key, {
      type: KIND_LABELS[kind] || "Text",
      inTable: stack.some((tag) => TABLE_TAGS.has(tag)),
      inList: stack.some((tag) => LIST_TAGS.has(tag)),
    });
    return raw;
  });
  return context;
};

// Imported division HTML contains an original tab strip that the React page
// replaces with accessible CMS-driven tabs. Those source labels are structural
// duplicates, not visible body copy, so coverage checks must not require a
// second editor field for them.
export const extractPageStructuralTextKeys = (html) => {
  const nodes = [];
  processHtmlText(html, ({ key, value, stack, raw }) => {
    nodes.push({
      key,
      value,
      inTable: stack.some((tag) => TABLE_TAGS.has(tag)),
      inList: stack.some((tag) => LIST_TAGS.has(tag)),
    });
    return raw;
  });
  const markerOf = (node) =>
    !node.inTable && !node.inList && node.value.length <= 140
      ? canonicalDivisionSection(node.value)
      : null;
  const keys = new Set();
  for (let index = 0; index + 1 < nodes.length; index += 1) {
    if (!markerOf(nodes[index]) || !markerOf(nodes[index + 1])) continue;
    let cursor = index;
    while (cursor < nodes.length && markerOf(nodes[cursor])) {
      keys.add(nodes[cursor].key);
      cursor += 1;
    }
    break;
  }
  return keys;
};

// Group the flat text rows into collapsible sections for CMS editors:
// each heading becomes a parent row whose `children` hold the text that follows
// it (until the next heading). Rows before the first heading go under an "Intro"
// group. Keys and values are unchanged — only nesting + labels are added; the
// render side flattens this back with flattenContentFields().
// Honorific-led text = a person profile (scientific manpower), e.g. "Dr. …",
// "Shri …". Used to route profile blocks into a "Scientific Manpower" section.
const PERSON_RE = /^(dr|shri|sri|mr|mrs|ms|smt|kum|km|ku|prof|er)\b\.?\s+\S/i;
const looksLikePerson = (value) => PERSON_RE.test(String(value || "").trim());

export const extractPageTextTree = (html) => {
  const nodes = [];
  processHtmlText(html, ({ key, stack, raw, value }) => {
    nodes.push({
      key,
      value,
      inHeading: stack.some((tag) => HEADING_TAG.test(tag)),
      inTable: stack.some((tag) => TABLE_TAGS.has(tag)),
      inList: stack.some((tag) => LIST_TAGS.has(tag)),
    });
    return raw;
  });

  // A "section marker" = short standalone text (heading, label, span) that names
  // a division tab category and is not table/list data. Mirrors the website's
  // isDivisionCategoryMarker so editor sections read like the page's tabs.
  const markerOf = (node) =>
    !node.inTable && !node.inList && node.value.length <= 140
      ? canonicalDivisionSection(node.value)
      : null;

  // The tab strip is the first run of >= 2 consecutive marker text nodes; it is
  // the on-screen tab bar and is skipped (the website removes it too).
  const stripSkip = new Set();
  for (let i = 0; i + 1 < nodes.length; i += 1) {
    if (markerOf(nodes[i]) && markerOf(nodes[i + 1])) {
      let j = i;
      while (j < nodes.length && markerOf(nodes[j])) {
        stripSkip.add(j);
        j += 1;
      }
      break;
    }
  }

  const divisionMode =
    stripSkip.size > 0 || nodes.some((n, i) => !stripSkip.has(i) && markerOf(n));

  const tree = [];
  let current = null;
  // Section headers are synthetic (key: null) so their tab names stay stable and
  // never get overwritten by key-based relabeling; the actual
  // heading/marker text sits inside as an editable child row. Sections are keyed
  // by label so a tab that recurs later in the page (e.g. two "Training
  // Programmes" markers) folds into one section instead of duplicating.
  const byLabel = new Map();
  const openBucket = (label) => {
    if (current && current.label === label) return current;
    if (byLabel.has(label)) {
      current = byLabel.get(label);
      return current;
    }
    current = { key: null, label, value: label, children: [] };
    tree.push(current);
    byLabel.set(label, current);
    return current;
  };

  if (divisionMode) {
    nodes.forEach((node, index) => {
      if (stripSkip.has(index)) return;
      const preview = clip(node.value, 60);
      const category = markerOf(node);
      const bucket =
        category
          ? openBucket(category)
          : node.inHeading && looksLikePerson(node.value)
            ? openBucket("Scientific Manpower")
            : current || openBucket("Overview");
      bucket.children.push({ key: node.key, label: `${bucket.label} → ${preview}`, value: node.value });
    });
    return tree;
  }

  // Non-division page: one section per heading, "Intro" before the first.
  nodes.forEach((node) => {
    const preview = clip(node.value, 60);
    if (node.inHeading) {
      current = { key: node.key, label: `Section: ${preview}`, value: node.value, children: [] };
      tree.push(current);
    } else if (current && current.key !== null) {
      current.children.push({ key: node.key, label: `${clip(current.value, 38)} → ${preview}`, value: node.value });
    } else {
      const bucket = current && current.key === null ? current : (() => {
        current = { key: null, label: "Intro", value: "Intro", children: [] };
        tree.push(current);
        return current;
      })();
      bucket.children.push({ key: node.key, label: `Intro → ${preview}`, value: node.value });
    }
  });

  return tree;
};

// Flatten a nested content_fields tree (section groups with `children`) back to
// the flat { key, value } rows the renderer applies. Accepts an already-flat
// array unchanged, so old and new shapes both render correctly.
export const flattenContentFields = (fields) => {
  const list = Array.isArray(fields) ? fields : [];
  const flat = [];
  for (const node of list) {
    if (!node || typeof node !== "object") continue;
    if (node.key) flat.push(node);
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child?.key) flat.push(child);
      }
    }
  }
  return flat;
};

const controlsImportedSectionLabel = (block) =>
  block?.controlsSectionLabel !== false ||
  (
    block?.assetOnly === true &&
    canonicalDivisionSection(block.sourceLabel || block.value || block.label) === "Map/Photos"
  );

// Convert the section-oriented CMS editor shape into exact source-text keys.
// Blank or hidden values stay authoritative: they remove the corresponding
// legacy HTML text instead of allowing that source text to reappear.
export const flattenImportedPageTextFields = (blocks) => {
  const fields = (Array.isArray(blocks) ? blocks : [])
    .filter((block) => block && (Array.isArray(block.children) || block.key))
    .flatMap((block) => {
      const headingField = controlsImportedSectionLabel(block) && /^text-\d+$/u.test(String(block.key || ""))
        ? [{ key: block.key, value: block.hidden ? "" : String(block.value || "") }]
        : [];
      const childFields = (Array.isArray(block.children) ? block.children : [])
        .filter((child) =>
          (child?.key || child?.sourceKeys?.length) &&
          !child.isNew &&
          !String(child.key || "").startsWith("cms-")
        )
        .flatMap((child) => {
          const sourceKeys = Array.isArray(child.sourceKeys)
            ? child.sourceKeys.filter(Boolean)
            : [];
          const keys = sourceKeys.length ? sourceKeys : [child.key];
          return keys.map((key, index) => ({
            key,
            value: block.hidden || child.hidden || index > 0
              ? ""
              : String(child.value || ""),
          }));
      });
      return [...headingField, ...childFields];
    });

  const claimedKeys = new Set();
  return fields.filter((field) => {
    if (!field.key || claimedKeys.has(field.key)) return false;
    claimedKeys.add(field.key);
    return true;
  });
};

export const translatePageTextFields = (fields, translations = {}) => {
  const lookup = new Map(
    Object.entries(translations)
      .filter(([english, hindi]) => english && hindi)
      .map(([english, hindi]) => [canonicalText(english), hindi])
  );

  return (fields || []).map((field) => ({
    ...field,
    value: lookup.get(canonicalText(field.value)) || field.value,
  }));
};

// Move ordinary text edits from an editor-saved HTML document onto the locked
// canonical template. An LCS keeps matching rows aligned even when a rich-text
// editor previously merged or removed harmless wrapper tags. A single changed
// row between two matching anchors is treated as an intentional text edit.
export const mergePageTextFieldValues = (templateFields, editedFields) => {
  const template = Array.isArray(templateFields) ? templateFields : [];
  const edited = Array.isArray(editedFields) ? editedFields : [];
  const rows = template.length + 1;
  const columns = edited.length + 1;
  const lengths = Array.from({ length: rows }, () =>
    new Uint16Array(columns)
  );

  for (let left = template.length - 1; left >= 0; left -= 1) {
    for (let right = edited.length - 1; right >= 0; right -= 1) {
      lengths[left][right] =
        template[left].value === edited[right].value
          ? lengths[left + 1][right + 1] + 1
          : Math.max(lengths[left + 1][right], lengths[left][right + 1]);
    }
  }

  const matches = [];
  let left = 0;
  let right = 0;
  while (left < template.length && right < edited.length) {
    if (template[left].value === edited[right].value) {
      matches.push([left, right]);
      left += 1;
      right += 1;
    } else if (lengths[left + 1][right] >= lengths[left][right + 1]) {
      left += 1;
    } else {
      right += 1;
    }
  }

  const output = template.map((field) => ({ ...field }));
  const anchors = [[-1, -1], ...matches, [template.length, edited.length]];

  for (let index = 1; index < anchors.length; index += 1) {
    const [previousLeft, previousRight] = anchors[index - 1];
    const [nextLeft, nextRight] = anchors[index];
    const templateStart = previousLeft + 1;
    const editedStart = previousRight + 1;
    const templateCount = nextLeft - templateStart;
    const editedCount = nextRight - editedStart;

    if (templateCount === editedCount && templateCount > 0) {
      for (let offset = 0; offset < templateCount; offset += 1) {
        output[templateStart + offset].value = edited[editedStart + offset].value;
      }
    }
  }

  return output;
};

export const applyPageTextFields = (html, fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return html || "";

  const values = new Map(
    fields
      .filter((field) => field?.key && field.value !== undefined)
      .map((field) => [field.key, String(field.value)])
  );

  return processHtmlText(html, ({ key, raw }) => {
    if (!values.has(key)) return raw;

    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    return `${leading}${escapeHtml(values.get(key))}${trailing}`;
  });
};
