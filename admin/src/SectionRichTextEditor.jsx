import { forwardRef, useEffect, useImperativeHandle } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Bold, Heading2, Heading3, Heading4, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Table2, Underline, Undo2, Unlink } from "lucide-react";

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: { autolink: true, defaultProtocol: "https", openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } },
  }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
];

const ToolbarButton = ({ active = false, disabled = false, label, onClick, children }) => (
  <button type="button" className={active ? "active" : ""} disabled={disabled} title={label} aria-label={label} onClick={onClick}>{children}</button>
);

const SectionRichTextEditor = forwardRef(function SectionRichTextEditor({ value, onChange, ariaLabel }, ref) {
  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "section-rich-editor__surface", role: "textbox", "aria-label": ariaLabel, "aria-multiline": "true" } },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (editor.getHTML() !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  useImperativeHandle(ref, () => ({
    focusListItem(index) {
      if (!editor) return;
      const rootList = Array.from(editor.view.dom.querySelectorAll("ol, ul"))
        .find((list) => !list.closest("table") && !list.parentElement?.closest("ol, ul"));
      const tableRows = Array.from(editor.view.dom.querySelectorAll("table tr"))
        .filter((row) => !row.closest("thead") && !row.querySelector("th"));
      const item = rootList
        ? Array.from(rootList.children || []).filter((child) => child.tagName === "LI")[index]
        : tableRows[index];
      if (!item) {
        editor.commands.focus("start");
        return;
      }
      const position = editor.view.posAtDOM(item, 0);
      editor.chain().focus().setTextSelection(Math.max(1, position + 1)).run();
      item.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  }), [editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") || false,
      italic: current?.isActive("italic") || false,
      underline: current?.isActive("underline") || false,
      h2: current?.isActive("heading", { level: 2 }) || false,
      h3: current?.isActive("heading", { level: 3 }) || false,
      h4: current?.isActive("heading", { level: 4 }) || false,
      bulletList: current?.isActive("bulletList") || false,
      orderedList: current?.isActive("orderedList") || false,
      blockquote: current?.isActive("blockquote") || false,
      link: current?.isActive("link") || false,
      table: current?.isActive("table") || false,
      canUndo: current?.can().chain().focus().undo().run() || false,
      canRedo: current?.can().chain().focus().redo().run() || false,
    }),
  });

  if (!editor) return <div className="section-rich-editor section-rich-editor--loading">Opening editor...</div>;

  const setLink = () => {
    const href = window.prompt("Paste the link address", editor.getAttributes("link").href || "");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  return (
    <div className="section-rich-editor">
      <div className="section-rich-editor__toolbar" role="toolbar" aria-label={`${ariaLabel} formatting`}>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></ToolbarButton><ToolbarButton label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></ToolbarButton><ToolbarButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></ToolbarButton><ToolbarButton label="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Heading 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolbarButton><ToolbarButton label="Heading 3" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolbarButton><ToolbarButton label="Heading 4" active={state.h4} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Bullet list" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></ToolbarButton><ToolbarButton label="Numbered list" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolbarButton><ToolbarButton label="Quote" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Add or edit link" active={state.link} onClick={setLink}><Link2 /></ToolbarButton><ToolbarButton label="Remove link" disabled={!state.link} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink /></ToolbarButton><ToolbarButton label="Insert 3 by 3 table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 /></ToolbarButton></div>
        {state.table && <div className="section-rich-editor__table-tools" aria-label="Table tools"><button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>Add row</button><button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>Add column</button><button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</button><button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</button><button type="button" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</button></div>}
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting /></ToolbarButton></div>
      </div>
      <EditorContent editor={editor} />
      <p className="section-rich-editor__help">Press Enter for a new paragraph. Select text before applying a heading, style, or link.</p>
    </div>
  );
});

export default SectionRichTextEditor;
