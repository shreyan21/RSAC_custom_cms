const getDocument = (documentRef) => documentRef || globalThis.document;

const parseContent = (html, documentRef) => {
  const document = getDocument(documentRef);
  if (!document?.createElement) throw new Error("Section item editor needs a DOM document.");
  const container = document.createElement("div");
  container.innerHTML = String(html || "");
  return container;
};

const headingTags = new Set(["H2", "H3", "H4"]);
const simpleContentTags = new Set(["P", "BLOCKQUOTE", "UL", "OL"]);

const hasVisibleContent = (node) =>
  String(node?.textContent || "").replace(/\u00a0/gu, " ").trim()
  || node?.querySelector?.("img,video,audio,iframe");

const contentUnit = (node) => {
  if (node.tagName === "LI" && node.children.length === 1 && node.firstElementChild?.tagName === "P") {
    return { html: node.firstElementChild.innerHTML, tagName: "P" };
  }
  return { html: node.innerHTML, tagName: node.tagName };
};

const nodeUnits = (node) => {
  if (node.tagName === "UL" || node.tagName === "OL") {
    return Array.from(node.children)
      .filter((child) => child.tagName === "LI" && hasVisibleContent(child))
      .map((child) => ({ ...contentUnit(child), containerTag: node.tagName }));
  }
  return hasVisibleContent(node) ? [{ ...contentUnit(node), containerTag: node.tagName }] : [];
};

const sectionSegments = (container) => {
  const segments = [{ heading: null, nodes: [] }];
  for (const node of Array.from(container.children)) {
    if (!hasVisibleContent(node)) continue;
    if (headingTags.has(node.tagName)) {
      segments.push({ heading: node, nodes: [] });
      continue;
    }
    if (!simpleContentTags.has(node.tagName)) return null;
    segments[segments.length - 1].nodes.push(node);
  }
  return segments;
};

const appendUnit = (parent, tagName, unit, referenceNode) => {
  const document = parent.ownerDocument;
  const element = document.createElement(tagName.toLowerCase());
  const referenceStrong = referenceNode?.children?.length === 1
    && referenceNode.firstElementChild?.tagName === "STRONG";
  element.innerHTML = referenceStrong && !/<strong\b/iu.test(unit.html)
    ? `<strong>${unit.html}</strong>`
    : unit.html;
  parent.append(element);
};

export const matchSectionListStructure = (localizedHtml, referenceHtml, documentRef) => {
  const original = String(localizedHtml || "");
  if (!original.trim() || !String(referenceHtml || "").trim()) {
    return { html: original, changed: false, compatible: false };
  }

  const localized = parseContent(original, documentRef);
  const reference = parseContent(referenceHtml, documentRef);
  if (localized.querySelector("table") || reference.querySelector("table")) {
    return { html: original, changed: false, compatible: false };
  }

  const localizedSegments = sectionSegments(localized);
  const referenceSegments = sectionSegments(reference);
  if (!localizedSegments || !referenceSegments || localizedSegments.length !== referenceSegments.length) {
    return { html: original, changed: false, compatible: false };
  }

  const output = localized.ownerDocument.createElement("div");
  for (let segmentIndex = 0; segmentIndex < referenceSegments.length; segmentIndex += 1) {
    const referenceSegment = referenceSegments[segmentIndex];
    const localizedSegment = localizedSegments[segmentIndex];
    if (Boolean(referenceSegment.heading) !== Boolean(localizedSegment.heading)) {
      return { html: original, changed: false, compatible: false };
    }
    if (referenceSegment.heading) {
      appendUnit(output, referenceSegment.heading.tagName, contentUnit(localizedSegment.heading), referenceSegment.heading);
    }

    const referenceCount = referenceSegment.nodes.reduce((total, node) => total + nodeUnits(node).length, 0);
    const localizedUnits = localizedSegment.nodes.flatMap(nodeUnits);
    const extraCount = localizedUnits.length - referenceCount;
    const canKeepLeadingIntroduction = segmentIndex === 0
      && extraCount > 0
      && extraCount <= 2
      && referenceSegment.nodes.some((node) => node.tagName === "UL" || node.tagName === "OL");
    const extraUnitsAreParagraphs = localizedUnits
      .slice(0, Math.max(0, extraCount))
      .every((unit) => unit.containerTag === "P" || unit.containerTag === "BLOCKQUOTE");
    if (extraCount < 0 || (extraCount > 0 && (!canKeepLeadingIntroduction || !extraUnitsAreParagraphs))) {
      return { html: original, changed: false, compatible: false };
    }

    localizedUnits.slice(0, extraCount).forEach((unit) => appendUnit(output, "P", unit));
    let cursor = extraCount;
    for (const referenceNode of referenceSegment.nodes) {
      if (referenceNode.tagName === "UL" || referenceNode.tagName === "OL") {
        const list = output.ownerDocument.createElement(referenceNode.tagName.toLowerCase());
        const referenceItems = Array.from(referenceNode.children).filter((child) => child.tagName === "LI" && hasVisibleContent(child));
        for (const referenceItem of referenceItems) {
          const item = output.ownerDocument.createElement("li");
          const unit = localizedUnits[cursor];
          if (!unit) return { html: original, changed: false, compatible: false };
          if (referenceItem.children.length === 1 && referenceItem.firstElementChild?.tagName === "P") {
            appendUnit(item, "P", unit, referenceItem.firstElementChild);
          } else {
            item.innerHTML = unit.html;
          }
          list.append(item);
          cursor += 1;
        }
        output.append(list);
      } else {
        const unit = localizedUnits[cursor];
        if (!unit) return { html: original, changed: false, compatible: false };
        appendUnit(output, referenceNode.tagName, unit, referenceNode);
        cursor += 1;
      }
    }
  }

  const html = output.innerHTML;
  return {
    html,
    changed: html !== original,
    compatible: true,
  };
};

const findManagedList = (container) => {
  const lists = Array.from(container.querySelectorAll("ol, ul"));
  return lists.find((list) => !list.closest("table") && !list.parentElement?.closest("ol, ul")) || null;
};

const directItems = (list) => Array.from(list?.children || [])
  .filter((child) => child.tagName === "LI");

const summarizeItem = (item) => String(item?.textContent || "")
  .replace(/\s+/gu, " ")
  .trim()
  .slice(0, 150);

const findManagedTable = (container) => container.querySelector("table");
const tableBodyRows = (table) => Array.from(table?.querySelectorAll("tr") || [])
  .filter((row) => !row.closest("thead") && !row.querySelector("th"));
const tableHasSerialColumn = (table) => {
  const firstHeader = table?.querySelector("thead th, tr th");
  if (/^(?:s\.?\s*no\.?|serial(?: number)?|\u0915\u094d\u0930\u092e(?: \u0938\u0902\u0916\u094d\u092f\u093e|\u093e\u0902\u0915)?)$/iu.test(String(firstHeader?.textContent || "").trim())) return true;
  const rows = tableBodyRows(table);
  return Boolean(rows.length && rows.every((row) => /^\d+$/u.test(String(row.cells?.[0]?.textContent || "").trim())));
};
const renumberTable = (table) => {
  if (!tableHasSerialColumn(table)) return;
  tableBodyRows(table).forEach((row, index) => {
    if (row.cells[0]) row.cells[0].textContent = String(index + 1);
  });
};

export const inspectSectionItems = (html, documentRef) => {
  const container = parseContent(html, documentRef);
  const list = findManagedList(container);
  if (list) {
    return {
      type: list.tagName === "OL" ? "ordered" : "bullet",
      items: directItems(list).map((item, index) => ({ index, summary: summarizeItem(item) || "Blank item" })),
    };
  }
  const table = findManagedTable(container);
  if (!table) return { type: "", items: [] };
  return {
    type: "table",
    items: tableBodyRows(table).map((row, index) => ({
      index,
      summary: Array.from(row.cells || []).slice(tableHasSerialColumn(table) ? 1 : 0).map(summarizeItem).filter(Boolean).join(" | ").slice(0, 150) || "Blank row",
    })),
  };
};

export const addLatestSectionItem = (html, ordered = true, documentRef) => {
  const container = parseContent(html, documentRef);
  let list = findManagedList(container);
  if (!list) {
    const table = findManagedTable(container);
    if (table) {
      const rows = tableBodyRows(table);
      const template = rows[0] || table.querySelector("tr");
      const columnCount = Math.max(1, template?.cells?.length || 1);
      const row = container.ownerDocument.createElement("tr");
      for (let index = 0; index < columnCount; index += 1) {
        const cell = container.ownerDocument.createElement("td");
        cell.append(container.ownerDocument.createElement("p"));
        row.append(cell);
      }
      let body = table.querySelector("tbody");
      if (!body) {
        body = container.ownerDocument.createElement("tbody");
        table.append(body);
      }
      if (rows[0]) rows[0].before(row);
      else body.append(row);
      renumberTable(table);
      return container.innerHTML;
    }
  }
  if (!list) {
    list = container.ownerDocument.createElement(ordered ? "ol" : "ul");
    container.append(list);
  }
  const item = container.ownerDocument.createElement("li");
  item.append(container.ownerDocument.createElement("p"));
  list.prepend(item);
  return container.innerHTML;
};

export const removeSectionItem = (html, index, documentRef) => {
  const container = parseContent(html, documentRef);
  const list = findManagedList(container);
  if (!list) {
    const table = findManagedTable(container);
    const rows = tableBodyRows(table);
    if (!rows[index]) return container.innerHTML;
    rows[index].remove();
    renumberTable(table);
    return container.innerHTML;
  }
  const items = directItems(list);
  if (!items[index]) return container.innerHTML;
  items[index].remove();
  if (!directItems(list).length) list.remove();
  return container.innerHTML;
};

export const moveSectionItem = (html, fromIndex, toIndex, documentRef) => {
  const container = parseContent(html, documentRef);
  const list = findManagedList(container);
  if (!list) {
    const table = findManagedTable(container);
    const rows = tableBodyRows(table);
    if (!rows[fromIndex] || !rows[toIndex] || fromIndex === toIndex) return container.innerHTML;
    const moving = rows[fromIndex];
    if (fromIndex < toIndex) rows[toIndex].after(moving);
    else rows[toIndex].before(moving);
    renumberTable(table);
    return container.innerHTML;
  }
  const items = directItems(list);
  if (!items[fromIndex] || !items[toIndex] || fromIndex === toIndex) return container.innerHTML;
  const moving = items[fromIndex];
  if (fromIndex < toIndex) items[toIndex].after(moving);
  else items[toIndex].before(moving);
  return container.innerHTML;
};
