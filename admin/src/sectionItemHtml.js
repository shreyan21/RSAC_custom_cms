const getDocument = (documentRef) => documentRef || globalThis.document;

const parseContent = (html, documentRef) => {
  const document = getDocument(documentRef);
  if (!document?.createElement) throw new Error("Section item editor needs a DOM document.");
  const container = document.createElement("div");
  container.innerHTML = String(html || "");
  return container;
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
