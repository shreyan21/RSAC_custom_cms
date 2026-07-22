import { useEffect, useRef } from "react";
import { Bold, Feather, Italic, RemoveFormatting } from "lucide-react";

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\n/g, "<br>");

const editorHtml = (value, richText) => richText || escapeHtml(value);

export default function InlineRichTextEditor({ value, richText, onChange, ariaLabel }) {
  const editorRef = useRef(null);

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

  const runCommand = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    emitChange();
  };

  const makeLight = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    span.dataset.rsacTone = "light";
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    emitChange();
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
        <button type="button" title="Bold selected text" aria-label="Bold selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bold")}><Bold /></button>
        <button type="button" title="Italic selected text" aria-label="Italic selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("italic")}><Italic /></button>
        <button type="button" title="Light selected text" aria-label="Light selected text" onMouseDown={(event) => event.preventDefault()} onClick={makeLight}><Feather /></button>
        <button type="button" title="Clear formatting from selected text" aria-label="Clear formatting from selected text" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("removeFormat")}><RemoveFormatting /></button>
        <span>Select text, then choose formatting.</span>
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
        onPaste={pastePlainText}
        onKeyDown={keepOneEditableRow}
        dangerouslySetInnerHTML={{ __html: editorHtml(value, richText) }}
      />
    </div>
  );
}
