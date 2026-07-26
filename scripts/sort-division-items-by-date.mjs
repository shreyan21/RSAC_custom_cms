import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { pool } from "../server/db.js";
import { divisionSectionFamily } from "../src/data/divisionSectionLabels.js";

const applyChanges = process.argv.includes("--apply");
const selfTest = process.argv.includes("--self-test");
const targetFamilies = new Set([
  "Ongoing Projects",
  "Completed Projects",
  "Technical Reports",
  "Research Papers",
]);

const monthNames = [
  [12, ["december", "dec", "दिसंबर", "दिसम्बर"]],
  [11, ["november", "nov", "नवंबर", "नवम्बर"]],
  [10, ["october", "oct", "अक्टूबर"]],
  [9, ["september", "sept", "sep", "सितंबर", "सितम्बर"]],
  [8, ["august", "aug", "अगस्त"]],
  [7, ["july", "jul", "जुलाई"]],
  [6, ["june", "jun", "जून"]],
  [5, ["may", "मई"]],
  [4, ["april", "apr", "अप्रैल"]],
  [3, ["march", "mar", "मार्च"]],
  [2, ["february", "feb", "फरवरी"]],
  [1, ["january", "jan", "जनवरी"]],
];

const compactText = (value) => String(value || "").replace(/\s+/gu, " ").trim();

const textFromHtml = (value) => {
  const html = String(value || "");
  if (!html.includes("<")) return compactText(html);
  return compactText(new JSDOM(`<!doctype html><body>${html}</body>`).window.document.body.textContent);
};

export const trailingDateRank = (value) => {
  const text = compactText(value).toLowerCase();
  if (!text) return null;
  const match = text.match(/(?:^|[^\d])((?:19|20)\d{2})(?:\s*[-\u2013\u2014/]\s*((?:19|20)?\d{2}))?\s*[\s.,;:()[\]{}\-\u2013\u2014\u0964]*$/u);
  if (!match) return null;

  let year = Number(match[1]);
  if (match[2]) {
    const rangeEnd = Number(match[2]);
    year = match[2].length === 2
      ? Math.floor(year / 100) * 100 + rangeEnd
      : rangeEnd;
  }

  const tail = text.slice(-64);
  const numericDate = tail.match(/\b\d{1,2}[./-](\d{1,2})[./-](?:19|20)\d{2}\s*[\s.,;:()[\]{}\u0964]*$/u);
  let month = numericDate ? Math.min(12, Math.max(1, Number(numericDate[1]))) : 0;
  if (!numericDate) {
    for (const [number, names] of monthNames) {
      if (names.some((name) => tail.includes(name))) {
        month = number;
        break;
      }
    }
  }
  return year * 12 + month;
};

export const sortDatedSlots = (items, textOf = (item) => item) => {
  const ranked = items.map((item, index) => ({
    item,
    index,
    rank: trailingDateRank(textOf(item)),
  }));
  const datedSlots = ranked.filter(({ rank }) => rank !== null);
  if (datedSlots.length < 2) return { items: [...items], changed: false, dated: datedSlots.length };

  const sortedDated = [...datedSlots].sort((left, right) =>
    right.rank - left.rank || left.index - right.index
  );
  const next = [...items];
  datedSlots.forEach((slot, position) => {
    next[slot.index] = sortedDated[position].item;
  });
  return {
    items: next,
    changed: next.some((item, index) => item !== items[index]),
    dated: datedSlots.length,
  };
};

const serialHeaderPattern = /^(?:s\.?\s*no\.?|sl\.?\s*no\.?|sr\.?\s*no\.?|serial(?: number)?|क्रम(?: संख्या|ांक)?)(?:\.|\u0964)?$/iu;

export const sortSectionHtml = (html) => {
  const dom = new JSDOM(`<!doctype html><body>${String(html || "")}</body>`);
  const { document } = dom.window;
  let changed = false;
  let dated = 0;

  const managedLists = Array.from(document.querySelectorAll("ol, ul"))
    .filter((list) => !list.parentElement?.closest("li"));
  const listsByParent = new Map();
  managedLists.forEach((list) => {
    const parent = list.parentElement;
    if (!listsByParent.has(parent)) listsByParent.set(parent, []);
    listsByParent.get(parent).push(list);
  });
  listsByParent.forEach((lists, parent) => {
    if (lists.length !== 1) return;
    const list = lists[0];
    Array.from(parent.children)
      .filter((node) => node.tagName === "P" && trailingDateRank(node.textContent) !== null)
      .forEach((paragraph) => {
        const item = document.createElement("li");
        item.append(paragraph);
        list.append(item);
        changed = true;
      });
  });

  managedLists.forEach((list) => {
      const items = Array.from(list.children).filter((child) => child.tagName === "LI");
      const result = sortDatedSlots(items, (item) => item.textContent);
      dated += result.dated;
      if (!result.changed) return;
      result.items.forEach((item) => list.append(item));
      changed = true;
  });

  document.querySelectorAll("table").forEach((table) => {
    const rows = Array.from(table.querySelectorAll("tr"));
    const headerRow = rows.find((row) => Array.from(row.cells || []).some((cell) => serialHeaderPattern.test(compactText(cell.textContent))));
    const dataRows = rows.filter((row) => row !== headerRow && !row.querySelector("th"));
    const result = sortDatedSlots(dataRows, (row) => row.textContent);
    dated += result.dated;
    if (result.changed) {
      const rowsByParent = new Map();
      result.items.forEach((row) => {
        const parent = row.parentElement;
        if (!rowsByParent.has(parent)) rowsByParent.set(parent, []);
        rowsByParent.get(parent).push(row);
      });
      rowsByParent.forEach((orderedRows, parent) => orderedRows.forEach((row) => parent.append(row)));
      changed = true;
    }

    let serialIndex = headerRow
      ? Array.from(headerRow.cells || []).findIndex((cell) => serialHeaderPattern.test(compactText(cell.textContent)))
      : -1;
    if (serialIndex < 0 && dataRows.length && dataRows.every((row) => /^\d+$/u.test(compactText(row.cells?.[0]?.textContent)))) {
      serialIndex = 0;
    }
    if (serialIndex >= 0) {
      Array.from(table.querySelectorAll("tr"))
        .filter((row) => row !== headerRow && !row.querySelector("th"))
        .forEach((row, index) => {
          if (row.cells?.[serialIndex]) row.cells[serialIndex].textContent = String(index + 1);
        });
    }
  });

  return { html: document.body.innerHTML, changed, dated };
};

const blockFamily = (block) => divisionSectionFamily(
  block?.sourceLabel || block?.label || block?.value || block?.heading || ""
);

const sortBlock = (block) => {
  if (!block || !targetFamilies.has(blockFamily(block))) return { block, changed: false, dated: 0 };
  if (Object.hasOwn(block, "contentHtml")) {
    const result = sortSectionHtml(block.contentHtml);
    return {
      block: result.changed ? { ...block, contentHtml: result.html } : block,
      changed: result.changed,
      dated: result.dated,
    };
  }
  if (Array.isArray(block.children)) {
    const result = sortDatedSlots(block.children, (child) =>
      child?.value || textFromHtml(child?.richText)
    );
    return {
      block: result.changed ? { ...block, children: result.items } : block,
      changed: result.changed,
      dated: result.dated,
    };
  }
  return { block, changed: false, dated: 0 };
};

const sortPageLanguage = (data, targetIndexes) => {
  if (!Array.isArray(data?.blocks)) return { data, changed: false, reports: [] };
  let changed = false;
  const reports = [];
  const blocks = data.blocks.map((block, index) => {
    if (!targetIndexes.has(index) && !targetFamilies.has(blockFamily(block))) return block;
    const result = sortBlock(block);
    if (result.changed) changed = true;
    if (result.dated) reports.push({ label: block.value || block.label || `Section ${index + 1}`, dated: result.dated, changed: result.changed });
    return result.block;
  });
  return { data: changed ? { ...data, blocks } : data, changed, reports };
};

const managedItemRank = (row) => {
  const data = row.data_en || {};
  const explicit = [data.date, data.year].filter(Boolean).join(" ");
  if (explicit) {
    const rank = trailingDateRank(explicit);
    if (rank !== null) return rank;
  }
  return trailingDateRank([data.title, data.authors, data.publicationName, data.details].filter(Boolean).join(" "));
};

const runSelfTest = () => {
  assert.equal(trailingDateRank("Example; June 2016"), 2016 * 12 + 6);
  assert.equal(trailingDateRank("उदाहरण; जून 2016"), 2016 * 12 + 6);
  assert.equal(trailingDateRank("No ending year"), null);
  const list = sortSectionHtml("<ol><li>Old; 2018</li><li>Keep here</li><li>Newest; June 2024</li><li>Middle; 2021</li></ol>");
  assert.match(list.html, /Newest; June 2024<\/li><li>Keep here<\/li><li>Middle; 2021<\/li><li>Old; 2018/u);
  const loose = sortSectionHtml("<ol><li>Old; 2018</li><li>Newest; 2024</li></ol><p>Loose; June 2021</p>");
  assert.match(loose.html, /Newest; 2024<\/li><li><p>Loose; June 2021<\/p><\/li><li>Old; 2018/u);
  assert.doesNotMatch(loose.html, /<\/ol><p>Loose/u);
  const table = sortSectionHtml("<table><tr><th>S.No.</th><th>Report</th></tr><tr><td>1</td><td>Old 2019</td></tr><tr><td>2</td><td>New 2023</td></tr></table>");
  assert.match(table.html, /<td>1<\/td><td>New 2023<\/td>.*<td>2<\/td><td>Old 2019<\/td>/u);
  console.log("Division date sorter self-test passed.");
};

if (selfTest) {
  runSelfTest();
  await pool.end();
} else {
  const pageResult = await pool.query(
    `SELECT id, entry_key, status, version, data_en, data_hi
       FROM cms_entries
      WHERE collection='pages'
        AND status <> 'archived'
        AND data_en->>'sectionKey'='divisions'
      ORDER BY sort_order, entry_key`
  );
  const managedResult = await pool.query(
    `SELECT id, entry_key, status, version, sort_order, data_en, data_hi
       FROM cms_entries
      WHERE collection='division_section_items'
        AND status <> 'archived'
      ORDER BY sort_order, entry_key`
  );

  const pageUpdates = [];
  for (const row of pageResult.rows) {
    const englishBlocks = row.data_en?.blocks || [];
    const targetIds = new Set(englishBlocks.filter((block) => targetFamilies.has(blockFamily(block))).map((block) => String(block.id || "")).filter(Boolean));
    const englishIndexes = new Set(englishBlocks.map((block, index) => targetFamilies.has(blockFamily(block)) ? index : -1).filter((index) => index >= 0));
    const hindiIndexes = new Set((row.data_hi?.blocks || []).map((block, index) => targetIds.has(String(block.id || "")) ? index : -1).filter((index) => index >= 0));
    const english = sortPageLanguage(row.data_en, englishIndexes);
    const hindi = sortPageLanguage(row.data_hi, hindiIndexes);
    if (!english.changed && !hindi.changed) continue;
    pageUpdates.push({ row, dataEn: english.data, dataHi: hindi.data, english: english.reports, hindi: hindi.reports });
  }

  const managedGroups = new Map();
  for (const row of managedResult.rows) {
    const section = String(row.data_en?.sectionKey || "");
    if (!["ongoing-projects", "completed-projects", "technical-reports", "research-papers"].includes(section)) continue;
    const key = `${row.data_en?.divisionSlug || ""}\u0000${section}`;
    if (!managedGroups.has(key)) managedGroups.set(key, []);
    managedGroups.get(key).push(row);
  }
  const managedUpdates = [];
  managedGroups.forEach((rows) => {
    const result = sortDatedSlots(rows, managedItemRank);
    if (!result.changed) return;
    const slots = rows.map((row) => Number(row.sort_order));
    result.items.forEach((row, index) => {
      if (Number(row.sort_order) !== slots[index]) managedUpdates.push({ row, sortOrder: slots[index] });
    });
  });

  console.log(`Division pages to update: ${pageUpdates.length}`);
  pageUpdates.forEach((update) => console.log(update.row.entry_key, { english: update.english, hindi: update.hindi }));
  console.log(`Managed list rows to reorder: ${managedUpdates.length}`);

  if (applyChanges && (pageUpdates.length || managedUpdates.length)) {
    const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
    const backupDirectory = resolve(import.meta.dirname, "..", "backups");
    const backupPath = resolve(backupDirectory, `division-items-before-date-sort-${stamp}.json`);
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(backupPath, `${JSON.stringify({
      createdAt: new Date().toISOString(),
      pages: pageUpdates.map(({ row }) => row),
      managedItems: managedUpdates.map(({ row }) => row),
    }, null, 2)}\n`, "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const update of pageUpdates) {
        await client.query(
          `UPDATE cms_entries
              SET data_en=$2::jsonb, data_hi=$3::jsonb, version=version+1, updated_at=NOW()
            WHERE id=$1`,
          [update.row.id, JSON.stringify(update.dataEn), JSON.stringify(update.dataHi)]
        );
      }
      for (const update of managedUpdates) {
        await client.query(
          `UPDATE cms_entries SET sort_order=$2, version=version+1, updated_at=NOW() WHERE id=$1`,
          [update.row.id, update.sortOrder]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    console.log(`Applied date sorting. Backup: ${backupPath}`);
  } else if (applyChanges) {
    console.log("No database rows needed changes.");
  } else {
    console.log("Dry run only. Re-run with --apply to save these changes.");
  }
  await pool.end();
}
