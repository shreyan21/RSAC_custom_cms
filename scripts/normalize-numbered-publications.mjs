import { JSDOM } from "jsdom";
import { pool } from "../server/db.js";

const dryRun = process.argv.includes("--dry-run");
const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
const researchLabelPattern = /research|paper|\u0936\u094b\u0927\s*\u092a\u0924\u094d\u0930/iu;
const trainingStartPattern = /list of research papers|\u0936\u094b\u0927\s*\u092a\u0924\u094d\u0930\u094b\u0902\s*\u0915\u0940\s*\u0938\u0942\u091a\u0940/iu;
const trainingEndPattern = /list of technical reports|\u0924\u0915\u0928\u0940\u0915\u0940\s*\u0930\u093f\u092a\u094b\u0930\u094d\u091f/iu;
const punctuationOnlyPattern = /^[\s,.;:|/()[\]{}\-\u2013\u2014\u2022\u00b7\u0964]+$/u;

const compactText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const assignTextKeys = (document) => {
  const keyByNode = new Map();
  const nodeByKey = new Map();
  const walker = document.createTreeWalker(document.body, 0x4);
  let index = 0;
  let node = walker.nextNode();

  while (node) {
    let ignored = false;
    for (let parent = node.parentNode; parent?.nodeType === 1; parent = parent.parentNode) {
      if (ignoredTags.has(parent.tagName)) {
        ignored = true;
        break;
      }
    }
    if (!ignored && compactText(node.data)) {
      const key = `text-${String(++index).padStart(4, "0")}`;
      keyByNode.set(node, key);
      nodeByKey.set(key, node);
    }
    node = walker.nextNode();
  }

  return { keyByNode, nodeByKey };
};

const keysWithin = (document, element, keyByNode, wantedKeys) => {
  const keys = [];
  const walker = document.createTreeWalker(element, 0x4);
  let node = walker.nextNode();
  while (node) {
    const key = keyByNode.get(node);
    if (key && wantedKeys.has(key)) keys.push(key);
    node = walker.nextNode();
  }
  return keys;
};

const decodeText = (document, value) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.textContent || "";
};

const nearestHeading = (document, element) => {
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const followingFlag = document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING;
  return headings
    .filter((heading) => heading.compareDocumentPosition(element) & followingFlag)
    .at(-1);
};

const trainingResearchItems = (document) => {
  const elements = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6, li")
  );
  const startIndex = elements.findIndex((element) =>
    trainingStartPattern.test(compactText(element.textContent))
  );
  const endIndex = elements.findIndex(
    (element, index) =>
      index > startIndex && trainingEndPattern.test(compactText(element.textContent))
  );

  if (startIndex === -1) return [];
  return elements
    .slice(startIndex + 1, endIndex === -1 ? undefined : endIndex)
    .filter((element) => element.tagName === "LI" && !element.parentElement?.closest("li"));
};

const normalizeBlock = (data, block, pageSlug) => {
  if (block.normalizedItemRows) {
    return { block, changed: false };
  }

  const dom = new JSDOM(`<!doctype html><body>${data.html || ""}</body>`);
  const { document } = dom.window;
  const { keyByNode, nodeByKey } = assignTextKeys(document);
  const children = Array.isArray(block.children) ? block.children : [];
  const importedChildren = children.filter(
    (child) => !child.isNew && !String(child.key || "").startsWith("cms-")
  );
  const newChildren = children.filter(
    (child) => child.isNew || String(child.key || "").startsWith("cms-")
  );
  const childByKey = new Map(importedChildren.map((child) => [child.key, child]));
  const wantedKeys = new Set(childByKey.keys());

  importedChildren.forEach((child) => {
    if (child.hidden) return;
    const node = nodeByKey.get(child.key);
    if (node && String(child.value || "").trim()) {
      node.data = decodeText(document, child.value);
    }
  });

  const listItems = pageSlug === "training-division"
    ? trainingResearchItems(document)
    : Array.from(document.querySelectorAll("li")).filter(
        (item) =>
          !item.parentElement?.closest("li") &&
          keysWithin(document, item, keyByNode, wantedKeys).length
      );

  const label = compactText(block.value || block.label || "Research papers");
  const normalizedChildren = listItems.flatMap((item) => {
    const sourceKeys = keysWithin(document, item, keyByNode, wantedKeys);
    if (!sourceKeys.length) return [];
    const value = compactText(item.textContent);
    if (!value || punctuationOnlyPattern.test(value)) return [];
    const sourceRows = sourceKeys.map((key) => childByKey.get(key)).filter(Boolean);
    const groupLabel = compactText(nearestHeading(document, item)?.textContent);
    const preview = value.length > 92 ? `${value.slice(0, 89)}...` : value;
    return [{
      key: sourceKeys[0],
      label: `${label} -> ${preview}`,
      value,
      sourceKeys,
      ...(groupLabel && compactText(groupLabel).toLowerCase() !== label.toLowerCase()
        ? { groupLabel }
        : {}),
      ...(sourceRows.length && sourceRows.every((row) => row.hidden)
        ? { hidden: true }
        : {}),
    }];
  });

  if (!normalizedChildren.length) return { block, changed: false };
  return {
    block: {
      ...block,
      children: [...newChildren, ...normalizedChildren],
      editorMode: "numbered_list",
      normalizedItemRows: true,
      sourceFieldCount: importedChildren.length,
    },
    changed:
      normalizedChildren.length !== importedChildren.length ||
      !block.normalizedItemRows,
  };
};

const normalizePageData = (data, pageSlug) => {
  if (!data?.html || !Array.isArray(data.blocks)) {
    return { data, changed: false, reports: [] };
  }
  let changed = false;
  const reports = [];
  const blocks = data.blocks.map((block) => {
    if (
      block.editorMode !== "numbered_list" ||
      !researchLabelPattern.test(`${block.label || ""} ${block.value || ""}`)
    ) {
      return block;
    }
    const result = normalizeBlock(data, block, pageSlug);
    if (result.changed) {
      changed = true;
      reports.push({
        label: block.value || block.label,
        before: block.children?.length || 0,
        after: result.block.children?.length || 0,
      });
    }
    return result.block;
  });
  return { data: changed ? { ...data, blocks } : data, changed, reports };
};

let updatedPages = 0;
try {
  const { rows } = await pool.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status = 'published'
      ORDER BY sort_order, entry_key`
  );

  for (const row of rows) {
    if (row.data_en?.sectionKey !== "divisions") continue;
    const pageSlug = row.data_en?.slug || row.entry_key;
    const english = normalizePageData(row.data_en, pageSlug);
    const hindi = normalizePageData(row.data_hi, pageSlug);
    if (!english.changed && !hindi.changed) continue;

    updatedPages += 1;
    console.log(row.entry_key, {
      english: english.reports,
      hindi: hindi.reports,
    });
    if (!dryRun) {
      await pool.query(
        `UPDATE cms_entries
            SET data_en = $2::jsonb,
                data_hi = $3::jsonb,
                version = version + 1,
                updated_at = NOW()
          WHERE id = $1`,
        [row.id, JSON.stringify(english.data), JSON.stringify(hindi.data)]
      );
    }
  }

  console.log(`${dryRun ? "Would normalize" : "Normalized"} ${updatedPages} division pages.`);
} finally {
  await pool.end();
}
