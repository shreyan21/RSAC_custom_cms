import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Feather,
  Italic,
  Link2,
  Palette,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { DEFAULT_TEXT_COLOR, normalizeTextColor } from "../../shared/richTextColor.js";

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

const EMPTY_FORMAT_STATE = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  link: false,
  textColor: "",
};

const selectionOnlyCommands = new Set([
  "bold",
  "italic",
  "underline",
  "strikeThrough",
  "createLink",
  "unlink",
  "removeFormat",
]);

export default function InlineRichTextEditor({ value, richText, onChange, ariaLabel }) {
  const rootRef = useRef(null);
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const composingRef = useRef(false);
  const changeTimerRef = useRef(null);
  const [formatState, setFormatState] = useState(EMPTY_FORMAT_STATE);

  const currentEditorRange = useCallback((allowSaved = false) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (editor && selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) return range;
    }
    const saved = selectionRef.current;
    if (
      allowSaved
      && editor
      && saved
      && editor.contains(saved.startContainer)
      && editor.contains(saved.endContainer)
    ) return saved;
    return null;
  }, []);

  const updateFormatState = useCallback(() => {
    const editor = editorRef.current;
    const range = currentEditorRange();
    if (!editor || !range) {
      if (rootRef.current?.contains(document.activeElement)) return;
      setFormatState(EMPTY_FORMAT_STATE);
      return;
    }

    const queryState = (command) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    };
    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;
    const links = startElement?.closest("a[href]");
    const colorSpan = startElement?.closest("span[data-rsac-color]");
    const activeColor = editor.contains(colorSpan)
      ? normalizeTextColor(colorSpan?.getAttribute("data-rsac-color"))
      : "";

    const next = {
      bold: queryState("bold"),
      italic: queryState("italic"),
      underline: queryState("underline"),
      strike: queryState("strikeThrough"),
      link: Boolean(links && editor.contains(links)),
      textColor: activeColor,
    };
    setFormatState((current) => Object.keys(next).every((key) => current[key] === next[key]) ? current : next);
  }, [currentEditorRange]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const next = editorHtml(value, richText);
    if (editor.innerHTML !== next) {
      editor.innerHTML = next;
      selectionRef.current = null;
    }
    updateFormatState();
  }, [richText, updateFormatState, value]);

  useEffect(() => () => clearTimeout(changeTimerRef.current), []);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor || composingRef.current) return;
    const plain = editor.innerText.replace(/\u00a0/g, " ").trim();
    onChange({
      value: plain,
      richText: plain ? editor.innerHTML : "",
    });
  };

  const scheduleChange = () => {
    clearTimeout(changeTimerRef.current);
    changeTimerRef.current = setTimeout(() => {
      changeTimerRef.current = null;
      emitChange();
    }, 140);
  };

  const flushChange = () => {
    clearTimeout(changeTimerRef.current);
    changeTimerRef.current = null;
    emitChange();
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
    const range = currentEditorRange(true);
    if (selectionOnlyCommands.has(command) && (!range || range.collapsed)) return;
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
    updateFormatState();
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
    updateFormatState();
  };

  const applyTextColor = (nextValue) => {
    const color = normalizeTextColor(nextValue);
    const editor = editorRef.current;
    if (!editor || !color) return;
    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return;

    const span = document.createElement("span");
    span.setAttribute("data-rsac-color", color);
    span.style.setProperty("--rsac-text-color", color);
    span.style.color = color;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    selectionRef.current = nextRange.cloneRange();
    emitChange();
    updateFormatState();
  };

  const removeTextColor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    const range = currentEditorRange(true);
    if (!range || range.collapsed) return;
    const offsets = captureSelectionOffsets();
    const colorSpans = Array.from(editor.querySelectorAll("span[data-rsac-color]"))
      .filter((span) => {
        try {
          return range.intersectsNode(span);
        } catch {
          return false;
        }
      });
    colorSpans.forEach((span) => {
      span.removeAttribute("data-rsac-color");
      span.style.removeProperty("--rsac-text-color");
      span.style.removeProperty("color");
      if (!span.attributes.length) span.replaceWith(...Array.from(span.childNodes));
    });
    editor.normalize();
    restoreSelectionOffsets(offsets);
    emitChange();
    updateFormatState();
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
    updateFormatState();
  };

  const setLink = () => {
    saveSelection();
    const range = currentEditorRange(true);
    if (!range || range.collapsed) return;
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
    <div className="inline-rich-editor" ref={rootRef}>
      <div className="inline-rich-editor__toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" title="Undo" aria-label="Undo" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("undo")}><Undo2 /></button>
        <button type="button" title="Redo" aria-label="Redo" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("redo")}><Redo2 /></button>
        <button type="button" className={formatState.bold ? "active" : ""} aria-pressed={formatState.bold} title="Bold selected text" aria-label="Bold selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bold")}><Bold /></button>
        <button type="button" className={formatState.italic ? "active" : ""} aria-pressed={formatState.italic} title="Italic selected text" aria-label="Italic selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("italic")}><Italic /></button>
        <button type="button" className={formatState.underline ? "active" : ""} aria-pressed={formatState.underline} title="Underline selected text" aria-label="Underline selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("underline")}><Underline /></button>
        <button type="button" className={formatState.strike ? "active" : ""} aria-pressed={formatState.strike} title="Strikethrough selected text" aria-label="Strikethrough selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("strikeThrough")}><Strikethrough /></button>
        <button type="button" title="Use a lighter weight for selected text" aria-label="Light selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => applySpanAttribute("data-rsac-tone", "light")}><Feather /></button>
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
        <label className="editor-color-control" title="Choose the foreground colour of the selected text.">
          <span><Palette /> Text colour</span>
          <input type="color" aria-label="Selected text colour" value={formatState.textColor || DEFAULT_TEXT_COLOR} onMouseDown={saveSelection} onInput={(event) => applyTextColor(event.currentTarget.value)} />
        </label>
        <button type="button" className={formatState.textColor ? "active" : ""} aria-pressed={Boolean(formatState.textColor)} title="Remove text colour from selected text" aria-label="Remove text colour from selected text" onMouseDown={(event) => event.preventDefault()} onClick={removeTextColor}><Eraser /></button>
        <button type="button" title="Align row left" aria-label="Align row left" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("start")}><AlignLeft /></button>
        <button type="button" title="Align row centre" aria-label="Align row centre" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("center")}><AlignCenter /></button>
        <button type="button" title="Align row right" aria-label="Align row right" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("end")}><AlignRight /></button>
        <button type="button" title="Justify row" aria-label="Justify row" onMouseDown={(event) => event.preventDefault()} onClick={() => applyRowAlignment("justify")}><AlignJustify /></button>
        <button type="button" title="Add or edit link on selected text" aria-label="Add or edit link on selected text" onMouseDown={(event) => event.preventDefault()} onClick={setLink}><Link2 /></button>
        <button type="button" className={formatState.link ? "active" : ""} aria-pressed={formatState.link} title="Remove link from selected text" aria-label="Remove link from selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("unlink")}><Unlink /></button>
        <button type="button" title="Clear formatting from selected text" aria-label="Clear formatting from selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("removeFormat")}><RemoveFormatting /></button>
        <span>Select text for emphasis, font, size, colour, or links. Alignment applies to the complete row.</span>
      </div>
      <div
        ref={editorRef}
        className="inline-rich-editor__surface"
        contentEditable
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={() => { scheduleChange(); }}
        onBlur={() => { flushChange(); updateFormatState(); }}
        onFocus={updateFormatState}
        onSelect={() => { saveSelection(); updateFormatState(); }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          flushChange();
        }}
        onKeyUp={() => { saveSelection(); updateFormatState(); }}
        onMouseUp={() => { saveSelection(); updateFormatState(); }}
        onPaste={pastePlainText}
        onKeyDown={keepOneEditableRow}
      />
    </div>
  );
}
