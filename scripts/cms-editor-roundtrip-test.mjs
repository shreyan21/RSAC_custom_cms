import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { JSDOM } from "jsdom";
import { sectionEditorExtensions } from "../admin/src/richTextExtensions.js";
import { validateEntryPayload } from "../server/contentValidation.js";
import { addLatestSectionItem, inspectSectionItems } from "../admin/src/sectionItemHtml.js";
import { toggleEditorQuote } from "../admin/src/richTextQuote.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: clearTimeout,
});
const createEditor = (content) => new Editor({ extensions: sectionEditorExtensions, content });
const save = (html) => validateEntryPayload("pages", {
  dataEn: { title: "Editor audit", slug: "editor-audit", sectionKey: "divisions", blocks: [{ id: "audit", type: "rich_text", contentHtml: html }] }, dataHi: {},
}).dataEn.blocks[0].contentHtml;
const selectText = (editor, text) => {
  let range;
  editor.state.doc.descendants((node, position) => {
    if (range || !node.isText) return;
    const offset = node.text.indexOf(text);
    if (offset >= 0) range = { from: position + offset, to: position + offset + text.length };
  });
  assert.ok(range, `Missing text ${text}`);
  editor.commands.setTextSelection(range);
};

for (const text of ["Research project", "\u0936\u094b\u0927 \u092a\u0930\u093f\u092f\u094b\u091c\u0928\u093e"]) {
  const editor = createEditor(`<p>${text}</p>`);
  selectText(editor, text);
  assert.equal(editor.chain().toggleBold().toggleItalic().toggleUnderline().toggleStrike().run(), true);
  assert.equal(editor.commands.setMark("rsacTextStyle", { color: "#b91c1c", fontFamily: "system-serif", fontSize: "large" }), true);
  assert.equal(editor.commands.setLink({ href: "https://example.gov.in/research" }), true);
  assert.equal(editor.commands.setRsacTextAlign("center"), true);
  const stored = save(editor.getHTML());
  const reopened = createEditor(stored);
  selectText(reopened, text);
  for (const mark of ["bold", "italic", "underline", "strike", "link"]) assert.ok(reopened.isActive(mark), `${mark} was lost`);
  assert.deepEqual(reopened.getAttributes("rsacTextStyle"), { fontFamily: "system-serif", fontSize: "large", color: "#b91c1c" });
  assert.match(reopened.getHTML(), /data-rsac-align="center"/);
  assert.equal(reopened.chain().unsetAllMarks().clearNodes().unsetRsacTextAlign().run(), true);
  assert.equal(reopened.getHTML(), `<p>${text}</p>`);
  reopened.destroy(); editor.destroy();
}

const inline = save('<p><b>Bold</b> <i>Italic</i> <strike>Strike</strike><script>alert(1)</script><a href="javascript:alert(1)">Safe</a></p>');
assert.match(inline, /<strong>Bold<\/strong> <em>Italic<\/em> <s>Strike<\/s>/);
assert.doesNotMatch(inline, /javascript:|<script/);

for (const content of [
  '<ol><li><p>Existing project</p></li></ol>',
  '<table><tbody><tr><th><p>S.No.</p></th><th><p>Report</p></th></tr><tr><td><p>1</p></td><td><p>Existing report</p></td></tr></tbody></table>',
]) {
  const added = addLatestSectionItem(content, true, dom.window.document);
  const editor = createEditor(added);
  const stored = save(editor.getHTML());
  assert.match(stored, /data-rsac-added-item="true"/);
  const reopened = createEditor(stored);
  assert.match(reopened.getHTML(), /data-rsac-added-item="true"/);
  assert.equal(inspectSectionItems(reopened.getHTML(), dom.window.document).items.length, 2);
  reopened.destroy(); editor.destroy();
}

const editor = createEditor('<p>Heading</p><p>Quote</p>');
for (const level of [2, 3, 4]) {
  selectText(editor, "Heading"); editor.commands.toggleHeading({ level });
  assert.match(save(editor.getHTML()), new RegExp(`<h${level}>Heading</h${level}>`));
}
selectText(editor, "Quote"); assert.equal(toggleEditorQuote(editor), true);
assert.match(save(editor.getHTML()), /<blockquote><p>Quote<\/p><\/blockquote>/);
editor.destroy();

const history = createEditor('<p>Before</p>');
selectText(history, 'Before'); history.commands.toggleBold();
assert.equal(history.commands.undo(), true); assert.equal(history.getHTML(), '<p>Before</p>');
assert.equal(history.commands.redo(), true); assert.match(history.getHTML(), /<strong>Before<\/strong>/);
history.destroy(); dom.window.close();
console.log('CMS editor commands and save/reopen passed: English/Hindi styles, colours, fonts, links, alignment, headings, quote, clear formatting, undo/redo, list/table item identity and unsafe-markup removal.');
