import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  addLatestSectionItem,
  inspectSectionItems,
  moveSectionItem,
  removeSectionItem,
} from "../admin/src/sectionItemHtml.js";

const document = new JSDOM("<!doctype html>").window.document;

let listHtml = "<ol><li><p>Older</p><ul><li>Nested detail</li></ul></li><li><p>Oldest</p></li></ol>";
listHtml = addLatestSectionItem(listHtml, true, document);
assert.deepEqual(inspectSectionItems(listHtml, document).items.map((item) => item.summary), ["Blank item", "OlderNested detail", "Oldest"]);
listHtml = moveSectionItem(listHtml, 0, 2, document);
assert.deepEqual(inspectSectionItems(listHtml, document).items.map((item) => item.summary), ["OlderNested detail", "Oldest", "Blank item"]);
assert.match(listHtml, /<ul><li>Nested detail<\/li><\/ul>/u);
listHtml = removeSectionItem(listHtml, 1, document);
assert.deepEqual(inspectSectionItems(listHtml, document).items.map((item) => item.summary), ["OlderNested detail", "Blank item"]);

let tableHtml = "<table><thead><tr><th>S.No.</th><th>Project</th></tr></thead><tbody><tr><td>1</td><td>Older</td></tr><tr><td>2</td><td>Oldest</td></tr></tbody></table>";
tableHtml = addLatestSectionItem(tableHtml, true, document);
assert.deepEqual(inspectSectionItems(tableHtml, document).items.map((item) => item.summary), ["Blank row", "Older", "Oldest"]);
tableHtml = moveSectionItem(tableHtml, 2, 0, document);
assert.deepEqual(inspectSectionItems(tableHtml, document).items.map((item) => item.summary), ["Oldest", "Blank row", "Older"]);
tableHtml = removeSectionItem(tableHtml, 1, document);
assert.deepEqual(inspectSectionItems(tableHtml, document).items.map((item) => item.summary), ["Oldest", "Older"]);
assert.deepEqual(Array.from(document.createRange().createContextualFragment(tableHtml).querySelectorAll("tbody td:first-child")).map((cell) => cell.textContent), ["1", "2"]);

console.log("Section item controls: add-first, reorder, delete, nested content, and automatic numbering passed.");

