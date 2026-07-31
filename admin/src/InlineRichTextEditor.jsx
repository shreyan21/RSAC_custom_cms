import { useLayoutEffect, useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Feather,
  Italic,
  Link2,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\n/g, "<br>");

const editorHtml = (value, richText) => richText || escapeHtml(value);

const fontOptions = [
  ["", "Default font"],
  ["inter", "Inter"],
  ["jakarta", "Plus Jakarta Sans"],
  ["system-sans", "System Sans"],
  ["system-serif", "System Serif"],
];

const sizeOptions = [
  ["", "Default size"],
  ["small", "Small"],
  ["normal", "Normal"],
  ["large", "Large"],
  ["xlarge", "Extra large"],
];

export default function InlineRichTextEditor({ value, richText, onChange, ariaLabel }) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const composingRef = useRef(false);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const next = editorHtml(value, richText);
    if (editor.innerHTML !== next) {
      editor.innerHTML = next;
      selectionRef.current = null;
    }
  }, [richText, value]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor || composingRef.current) return;
    const plain = editor.innerText.replace(/\u00a0/g, " ").trim();
    onChange({
      value: plain,
      richText: plain ? editor.innerHTML : "",
    });
  };

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) selectionRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const range = selectionRef.current;
    if (
      !editor
      || !range
      || !editor.contains(range.startContainer)
      || !editor.contains(range.endContainer)
    ) {
      selectionRef.current = null;
      return;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const captureSelectionOffsets = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
    const startRange = document.createRange();
    const endRange = document.createRange();
    startRange.selectNodeContents(editor);
    endRange.selectNodeContents(editor);
    startRange.setEnd(range.startContainer, range.startOffset);
    endRange.setEnd(range.endContainer, range.endOffset);
    return {
      start: startRange.toString().length,
      end: endRange.toString().length,
    };
  };

  const restoreSelectionOffsets = (offsets) => {
    const editor = editorRef.current;
    if (!editor || !offsets) return false;
    const textNodes = [];
    const visit = (node) => {
      if (node.nodeType === Node.TEXT_NODE) textNodes.push(node);
      else node.childNodes.forEach(visit);
    };
    visit(editor);
    if (!textNodes.length) return false;

    const locate = (target) => {
      let consumed = 0;
      for (const node of textNodes) {
        const length = node.textContent.length;
        if (target <= consumed + length) {
          return { node, offset: Math.max(0, target - consumed) };
        }
        consumed += length;
      }
      const node = textNodes[textNodes.length - 1];
      return { node, offset: node.textContent.length };
    };
    const start = locate(offsets.start);
    const end = locate(offsets.end);
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
    return true;
  };

  const runCommand = (command, commandValue = null) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
  };

  const applySpanAttribute = (attribute, nextValue) => {
    const editor = editorRef.current;
    editor?.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    span.setAttribute(attribute, nextValue);
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    saveSelection();
    emitChange();
  };

  const applyRowAlignment = (nextValue) => {
    const editor = editorRef.current;
    if (!editor) return;
    saveSelection();
    const offsets = captureSelectionOffsets();
    editor.focus();

    const existingWrapper = editor.children.length === 1
      && editor.firstElementChild?.hasAttribute("data-rsac-inline-align")
      ? editor.firstElementChild
      : null;
    const wrapper = existingWrapper || document.createElement("span");

    if (!existingWrapper) {
      while (editor.firstChild) wrapper.appendChild(editor.firstChild);
      editor.appendChild(wrapper);
    }

    wrapper.setAttribute("data-rsac-inline-align", nextValue);
    if (!restoreSelectionOffsets(offsets)) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(wrapper);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      saveSelection();
    }
    emitChange();
  };

  const setLink = () => {
    saveSelection();
    const href = window.prompt("Paste the link address", "");
    if (href === null) return;
    if (!href.trim()) runCommand("unlink");
    else runCommand("createLink", href.trim());
  };

  const pastePlainText = (event) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    emitChange();
  };

  const keepOneEditableRow = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    document.execCommand("insertLineBreak", false);
    emitChange();
  };

  return (
    <div className="inline-rich-editor">
      <div className="inline-rich-editor__toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" title="Undo" aria-label="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("undo")}><Undo2 /></button>
        <button type="button" title="Redo" aria-label="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("redo")}><Redo2 /></button>
        <button type="button" title="Bold selected text" aria-label="Bold selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bold")}><Bold /></button>
        <button type="button" title="Italic selected text" aria-label="Italic selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("italic")}><Italic /></button>
        <button type="button" title="Underline selected text" aria-label="Underline selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("underline")}><Underline /></button>
        <button type="button" title="Strikethrough selected text" aria-label="Strikethrough selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("strikeThrough")}><Strikethrough /></button>
        <button type="button" title="Light selected text" aria-label="Light selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => applySpanAttribute("data-rsac-tone", "light")}><Feather /></button>
        <label className="inline-rich-editor__select">
          <span>Font</span>
          <select aria-label="Selected text font family" defaultValue="" onMouseDown={saveSelection} onChange={(event) => { if (event.target.value) applySpanAttribute("data-rsac-font", event.target.value); event.target.value = ""; }}>
            {fontOptions.map(([optionValue, label]) => <option value={optionValue} key={label}>{label}</option>)}
          </select>
        </label>
        <label className="inline-rich-editor__select">
          <span>Size</span>
          <select aria-label="Selected text size" defaultValue="" onMouseDown={saveSelection} onChange={(event) => { if (event.target.value) applySpanAttribute("data-rsac-size", event.target.value); event.target.value = ""; }}>
            {sizeOptions.map(([optionValue, label]) => <option value={optionValue} key={label}>{label}</option>)}
          </select>
        </label>
        <button type="button" title="Align row left" aria-label="Align row left" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("start")}><AlignLeft /></button>
        <button type="button" title="Align row centre" aria-label="Align row centre" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("center")}><AlignCenter /></button>
        <button type="button" title="Align row right" aria-label="Align row right" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("end")}><AlignRight /></button>
        <button type="button" title="Justify row" aria-label="Justify row" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("justify")}><AlignJustify /></button>
        <button type="button" title="Add or edit link" aria-label="Add or edit link" onMouseDown={(event) => event.preventDefault()} onClick={setLink}><Link2 /></button>
        <button type="button" title="Remove link" aria-label="Remove link" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("unlink")}><Unlink /></button>
        <button type="button" title="Clear formatting from selected text" aria-label="Clear formatting from selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("removeFormat")}><RemoveFormatting /></button>
        <span>One website row. Select text, then format it.</span>
      </div>
      <div
        ref={editorRef}
        className="inline-rich-editor__surface"
        contentEditable
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          emitChange();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPaste={pastePlainText}
        onKeyDown={keepOneEditableRow}
      />
    </div>
  );
}
