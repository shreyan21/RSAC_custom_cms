import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { JSDOM } from "jsdom";
import { toggleEditorQuote } from "../admin/src/richTextQuote.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;

const createEditor = (content) => new Editor({
  extensions: [StarterKit],
  content,
});

const selectText = (editor, text, cursorOnly = false) => {
  let range = null;
  editor.state.doc.descendants((node, position) => {
    if (range || !node.isText) return;
    const offset = String(node.text || "").indexOf(text);
    if (offset < 0) return;
    const from = position + offset;
    range = { from, to: cursorOnly ? from : from + text.length };
  });
  assert.ok(range, `Could not find editor text: ${text}`);
  editor.commands.setTextSelection(range);
};

const quoteText = (editor) => Array.from(
  new JSDOM(editor.getHTML()).window.document.querySelectorAll("blockquote")
).map((quote) => quote.textContent.trim());

const paragraphEditor = createEditor("<p>Ordinary paragraph</p>");
selectText(paragraphEditor, "Ordinary paragraph");
assert.equal(toggleEditorQuote(paragraphEditor), true);
assert.deepEqual(quoteText(paragraphEditor), ["Ordinary paragraph"]);
assert.equal(toggleEditorQuote(paragraphEditor), true);
assert.deepEqual(quoteText(paragraphEditor), []);
paragraphEditor.destroy();

const bulletEditor = createEditor("<ul><li><p>Alpha</p></li><li><p>Earth resource bullet</p></li><li><p>Gamma</p></li></ul>");
selectText(bulletEditor, "Earth resource bullet", true);
assert.equal(toggleEditorQuote(bulletEditor), true);
assert.deepEqual(quoteText(bulletEditor), ["Earth resource bullet"]);
assert.match(bulletEditor.getHTML(), /<ul><li><p>Alpha<\/p><\/li><\/ul>/u);
assert.match(bulletEditor.getHTML(), /<ul><li><p>Gamma<\/p><\/li><\/ul>/u);
bulletEditor.destroy();

const numberedEditor = createEditor("<ol><li><p>First</p></li><li><p>Quoted number</p></li></ol>");
selectText(numberedEditor, "Quoted number");
assert.equal(toggleEditorQuote(numberedEditor), true);
assert.deepEqual(quoteText(numberedEditor), ["Quoted number"]);
numberedEditor.destroy();

console.log("CMS Quote command passed for paragraphs, bullet items, numbered items, and quote removal.");
