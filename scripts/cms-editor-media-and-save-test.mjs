import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { sectionEditorExtensions } from "../admin/src/richTextExtensions.js";
import { validateEntryPayload } from "../server/contentValidation.js";

// React's test helper is intentionally unavailable in production builds.
process.env.NODE_ENV = "test";

// This test is entirely in memory: no database, API, uploads, or live Vite server.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  DOMParser: dom.window.DOMParser,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: clearTimeout,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
// JSDOM does not implement rendered innerText; these fixtures contain plain text.
Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
  configurable: true,
  get() { return this.textContent; },
});
const { act, createElement, createRef } = await import("react");
const { createRoot } = await import("react-dom/client");

const save = (html) => validateEntryPayload("pages", {
  dataEn: {
    title: "Photo preservation test", slug: "photo-preservation-test", sectionKey: "about",
    blocks: [{ id: "photo-test", type: "rich_text", contentHtml: html }],
  },
  dataHi: {},
}).dataEn.blocks[0].contentHtml;

const originalHtml = '<h5>Portrait heading</h5><p>Before photograph</p><img src="/uploads/staff-portrait.jpg" alt="Staff portrait" title="Scientist" loading="lazy" width="240" height="320"><p>After photograph</p>';
const editor = new Editor({ extensions: sectionEditorExtensions, content: originalHtml });
editor.commands.insertContentAt(editor.state.doc.content.size - 1, " edited");
const reopened = new Editor({ extensions: sectionEditorExtensions, content: save(editor.getHTML()) });
const reopenedDocument = new JSDOM(reopened.getHTML()).window.document;
assert.equal(reopenedDocument.querySelector("h5")?.textContent, "Portrait heading");
const image = reopenedDocument.querySelector("img");
assert.ok(image, "Saving a text edit must preserve the section photograph.");
for (const [name, value] of Object.entries({
  src: "/uploads/staff-portrait.jpg", alt: "Staff portrait", title: "Scientist",
  loading: "lazy", width: "240", height: "320",
})) assert.equal(image.getAttribute(name), value, `The photograph ${name} was lost.`);
assert.match(reopened.getHTML(), /After photograph edited/u);
editor.destroy();
reopened.destroy();

// Transform the actual JSX components without opening a network listener.
const vite = await createServer({
  configFile: false, envDir: false,
  plugins: [react()],
  cacheDir: "node_modules/.vite-editor-regression",
  server: { middlewareMode: true, hmr: false, watch: null },
});
const roots = [];
const mount = () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  return { container, root };
};

try {
  const { default: SectionRichTextEditor } = await vite.ssrLoadModule("/admin/src/SectionRichTextEditor.jsx");
  const { default: InlineRichTextEditor } = await vite.ssrLoadModule("/admin/src/InlineRichTextEditor.jsx");
  const section = mount();
  let sectionDraft = "";
  const sectionRef = createRef();
  await act(async () => {
    section.root.render(createElement(SectionRichTextEditor, {
      ref: sectionRef, value: "<p>Original</p>", ariaLabel: "Section test",
      onChange: (html) => { sectionDraft = html; },
    }));
  });
  const surface = section.container.querySelector(".tiptap");
  assert.ok(surface?.editor, "The actual section editor did not mount.");
  await act(async () => {
    surface.editor.commands.setContent("<p>Latest section edit</p>", { emitUpdate: true });
    assert.equal(sectionDraft, "<p>Latest section edit</p>", "Immediate Save must see the latest section text before any timer.");
    section.root.unmount();
  });
  roots.splice(roots.indexOf(section.root), 1);
  assert.equal(sectionDraft, "<p>Latest section edit</p>", "Section navigation must retain the latest edit.");

  const inline = mount();
  let inlineDraft = null;
  await act(async () => {
    inline.root.render(createElement(InlineRichTextEditor, {
      value: "Original row", richText: "", ariaLabel: "Inline test",
      onChange: (next) => { inlineDraft = next; },
    }));
  });
  const row = inline.container.querySelector('[contenteditable="true"]');
  assert.ok(row, "The actual inline editor did not mount.");
  await act(async () => {
    row.innerHTML = "Latest inline edit";
    row.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    assert.deepEqual(inlineDraft, { value: "Latest inline edit", richText: "Latest inline edit" }, "Immediate Save must see the latest inline text before any timer.");
    inline.root.unmount();
  });
  roots.splice(roots.indexOf(inline.root), 1);

  const composing = mount();
  let composedDraft = null;
  await act(async () => {
    composing.root.render(createElement(InlineRichTextEditor, {
      value: "Original Hindi row", richText: "", ariaLabel: "Composition test",
      onChange: (next) => { composedDraft = next; },
    }));
  });
  const composingRow = composing.container.querySelector('[contenteditable="true"]');
  await act(async () => {
    composingRow.focus();
    composingRow.dispatchEvent(new dom.window.CompositionEvent("compositionstart", { bubbles: true }));
    composingRow.innerHTML = "नवीन हिन्दी सामग्री";
    composingRow.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    assert.equal(composedDraft, null, "An active IME composition must wait for commit.");
    composingRow.blur();
    assert.equal(composedDraft?.value, "नवीन हिन्दी सामग्री", "Leaving the editor must commit visible Hindi composition text.");
    composing.root.unmount();
  });
  roots.splice(roots.indexOf(composing.root), 1);
} finally {
  for (const root of roots) await act(async () => root.unmount());
  await vite.close();
  dom.window.close();
}

console.log("CMS editor regression passed: photograph attributes and h5 survive save/reopen; section and inline edits reach drafts immediately before Save or navigation; Hindi IME text commits on blur.");
