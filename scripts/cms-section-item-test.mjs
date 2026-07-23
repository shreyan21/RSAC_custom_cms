import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  addLatestSectionItem,
  inspectSectionItems,
  matchSectionListStructure,
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

const referenceLayout = "<p><strong>Introduction</strong></p><ul><li><p>First</p></li><li><p>Second</p></li></ul><h4>Software</h4><ul><li>Third</li></ul>";
const localizedLayout = "<p>Extra introduction</p><p>Translated introduction</p><p>Translated first</p><p>Translated second</p><h3>Translated software</h3><p>Translated third</p>";
const matchedLayout = matchSectionListStructure(localizedLayout, referenceLayout, document);
assert.equal(matchedLayout.compatible, true);
assert.equal(matchedLayout.changed, true);
assert.match(matchedLayout.html, /^<p>Extra introduction<\/p><p><strong>Translated introduction<\/strong><\/p><ul>/u);
assert.match(matchedLayout.html, /<h4>Translated software<\/h4><ul><li>Translated third<\/li><\/ul>$/u);
assert.doesNotMatch(matchedLayout.html, /Introduction|First|Second|Third/u);

const tableLayout = matchSectionListStructure("<table><tr><td>Hindi</td></tr></table>", "<table><tr><td>English</td></tr></table>", document);
assert.equal(tableLayout.compatible, false);
assert.match(tableLayout.html, /Hindi/u);

console.log("Section item controls: add-first, reorder, delete, bilingual list matching, nested content, and automatic numbering passed.");

