import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const next = editorHtml(value, richText);
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [richText, value]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
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
    if (!selectionRef.current) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
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
        <button type="button" title="Align selected row left" aria-label="Align selected row left" onMouseDown={(event) => event.preventDefault()} onClick={() => applySpanAttribute("data-rsac-inline-align", "start")}><AlignLeft /></button>
        <button type="button" title="Align selected row centre" aria-label="Align selected row centre" onMouseDown={(event) => event.preventDefault()} onClick={() => applySpanAttribute("data-rsac-inline-align", "center")}><AlignCenter /></button>
        <button type="button" title="Align selected row right" aria-label="Align selected row right" onMouseDown={(event) => event.preventDefault()} onClick={() => applySpanAttribute("data-rsac-inline-align", "end")}><AlignRight /></button>
        <button type="button" title="Justify selected row" aria-label="Justify selected row" onMouseDown={(event) => event.preventDefault()} onClick={() => applySpanAttribute("data-rsac-inline-align", "justify")}><AlignJustify /></button>
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
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPaste={pastePlainText}
        onKeyDown={keepOneEditableRow}
        dangerouslySetInnerHTML={{ __html: editorHtml(value, richText) }}
      />
    </div>
  );
}
