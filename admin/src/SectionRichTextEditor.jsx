import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eraser, Heading2, Heading3, Heading4, Italic, Link2, List, ListOrdered, Minus, Palette, Quote, Redo2, RemoveFormatting, Sparkles, Strikethrough, Table2, Underline, Undo2, Unlink } from "lucide-react";
import EditorTooltipButton from "./EditorTooltipButton";
import { formatRichTextHtml } from "./formatRichText";
import { DEFAULT_TEXT_COLOR, normalizeTextColor, textColorStyle } from "../../shared/richTextColor.js";

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

const safeFonts = new Set(fontOptions.map(([value]) => value).filter(Boolean));
const safeSizes = new Set(sizeOptions.map(([value]) => value).filter(Boolean));
const safeAlignments = new Set(["start", "center", "end", "justify"]);

const RsacTextAlignment = Extension.create({
  name: "rsacTextAlignment",
  addOptions: () => ({ types: ["heading", "paragraph"] }),
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        textAlign: {
          default: "start",
          parseHTML: (element) => safeAlignments.has(element.getAttribute("data-rsac-align"))
            ? element.getAttribute("data-rsac-align")
            : "start",
          renderHTML: ({ textAlign }) => textAlign && textAlign !== "start"
            ? { "data-rsac-align": textAlign }
            : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setRsacTextAlign: (textAlign) => ({ commands }) => {
        if (!safeAlignments.has(textAlign)) return false;
        this.options.types.forEach((type) => {
          commands.updateAttributes(type, { textAlign });
        });
        return true;
      },
      unsetRsacTextAlign: () => ({ commands }) => {
        this.options.types.forEach((type) => {
          commands.resetAttributes(type, "textAlign");
        });
        return true;
      },
    };
  },
});

const RsacTextStyle = Mark.create({
  name: "rsacTextStyle",
  parseHTML: () => [{ tag: "span[data-rsac-font], span[data-rsac-size], span[data-rsac-color]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes), 0],
  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element) => safeFonts.has(element.getAttribute("data-rsac-font"))
          ? element.getAttribute("data-rsac-font")
          : null,
        renderHTML: ({ fontFamily }) => safeFonts.has(fontFamily) ? { "data-rsac-font": fontFamily } : {},
      },
      fontSize: {
        default: null,
        parseHTML: (element) => safeSizes.has(element.getAttribute("data-rsac-size"))
          ? element.getAttribute("data-rsac-size")
          : null,
        renderHTML: ({ fontSize }) => safeSizes.has(fontSize) ? { "data-rsac-size": fontSize } : {},
      },
      color: {
        default: null,
        parseHTML: (element) => normalizeTextColor(element.getAttribute("data-rsac-color")) || null,
        renderHTML: ({ color }) => {
          const safeColor = normalizeTextColor(color);
          return safeColor
            ? { "data-rsac-color": safeColor, style: textColorStyle(safeColor) }
            : {};
        },
      },
    };
  },
});

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    link: { autolink: true, defaultProtocol: "https", openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } },
  }),
  RsacTextAlignment,
  RsacTextStyle,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
];

const toolDescriptions = {
  "Add column": "Adds a new column immediately after the selected table cell.",
  "Add or edit link": "Adds or changes a clickable web, file, email, or page link.",
  "Add row above": "Adds a new row immediately above the selected table row.",
  "Add row below": "Adds a new row immediately below the selected table row.",
  Bold: "Makes the selected text thicker for emphasis.",
  "Bullet list": "Turns the selected lines into a bulleted list.",
  "Clear formatting": "Removes headings and text styles while keeping the wording.",
  "Delete column": "Removes the table column containing the selected cell.",
  "Delete row": "Removes the table row containing the selected cell.",
  "Delete table": "Removes the complete table and its cells.",
  "Format text": "Cleans spacing and empty formatting without changing the wording.",
  "Horizontal divider": "Adds a clean divider between two parts of the section.",
  "Remove text colour": "Returns the selected text to the website's normal colour.",
  "Heading 2": "Turns the current line into a main section heading.",
  "Heading 3": "Turns the current line into a subsection heading.",
  "Heading 4": "Turns the current line into a smaller heading.",
  "Insert 3 by 3 table": "Adds a three-column table with a header row.",
  Italic: "Slants the selected text for gentle emphasis.",
  "Numbered list": "Turns the selected lines into a numbered list.",
  Quote: "Formats the selected text as a quotation.",
  Redo: "Restores the most recently undone change.",
  "Remove link": "Removes the link but keeps its visible text.",
  Underline: "Adds a line below the selected text.",
  Undo: "Reverses the most recent editor change.",
  "Align left": "Aligns the current paragraph or heading to the reading start edge.",
  "Align centre": "Centres the current paragraph or heading.",
  "Align right": "Aligns the current paragraph or heading to the opposite edge.",
  Justify: "Spaces words so both paragraph edges align.",
  Strikethrough: "Draws a line through selected text.",
};

const ToolbarButton = ({ label, ...props }) => (
  <EditorTooltipButton label={label} description={toolDescriptions[label]} {...props} />
);

const SectionRichTextEditor = forwardRef(function SectionRichTextEditor({ value, onChange, ariaLabel }, ref) {
  const onChangeRef = useRef(onChange);
  const latestValueRef = useRef(value || "");
  const lastEmittedHtmlRef = useRef(null);
  const pendingHtmlRef = useRef(null);
  const updateTimerRef = useRef(null);
  const selectedTextRangeRef = useRef(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    latestValueRef.current = value || "";
  }, [onChange, value]);

  useEffect(() => () => clearTimeout(updateTimerRef.current), []);

  const emitEditorHtml = (html) => {
    clearTimeout(updateTimerRef.current);
    updateTimerRef.current = null;
    pendingHtmlRef.current = null;
    lastEmittedHtmlRef.current = html;
    onChangeRef.current(html);
  };

  const scheduleEditorHtml = (html) => {
    clearTimeout(updateTimerRef.current);
    pendingHtmlRef.current = html;
    lastEmittedHtmlRef.current = html;
    updateTimerRef.current = setTimeout(() => emitEditorHtml(pendingHtmlRef.current ?? html), 140);
  };

  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "section-rich-editor__surface", role: "textbox", "aria-label": ariaLabel, "aria-multiline": "true" } },
    onUpdate: ({ editor: current }) => {
      const html = current.isEmpty ? "" : current.getHTML();
      scheduleEditorHtml(html);
    },
    onSelectionUpdate: ({ editor: current }) => {
      const { from, to } = current.state.selection;
      if (from !== to) selectedTextRangeRef.current = { from, to };
    },
    onBlur: ({ editor: current }) => {
      const currentHtml = current.isEmpty ? "" : current.getHTML();
      if (pendingHtmlRef.current !== null || currentHtml !== latestValueRef.current) emitEditorHtml(currentHtml);
    },
    shouldRerenderOnTransaction: false,
  });

  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (
      !editor.isFocused
      && next !== lastEmittedHtmlRef.current
      && current !== next
    ) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
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
      strike: current?.isActive("strike") || false,
      h2: current?.isActive("heading", { level: 2 }) || false,
      h3: current?.isActive("heading", { level: 3 }) || false,
      h4: current?.isActive("heading", { level: 4 }) || false,
      bulletList: current?.isActive("bulletList") || false,
      orderedList: current?.isActive("orderedList") || false,
      blockquote: current?.isActive("blockquote") || false,
      link: current?.isActive("link") || false,
      table: current?.isActive("table") || false,
      alignment: current?.isActive({ textAlign: "center" })
        ? "center"
        : current?.isActive({ textAlign: "end" })
          ? "end"
          : current?.isActive({ textAlign: "justify" })
            ? "justify"
            : "start",
      fontFamily: current?.getAttributes("rsacTextStyle")?.fontFamily || "",
      fontSize: current?.getAttributes("rsacTextStyle")?.fontSize || "",
      textColor: current?.getAttributes("rsacTextStyle")?.color || "",
      canUndo: current?.can().chain().focus().undo().run() || false,
      canRedo: current?.can().chain().focus().redo().run() || false,
    }),
  });

  if (!editor) return <div className="section-rich-editor section-rich-editor--loading">Opening editor...</div>;

  const setLink = () => {
    if (!restoreSelectedText()) return;
    const href = window.prompt("Paste the link address", editor.getAttributes("link").href || "");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  const formatText = () => {
    const position = editor.state.selection.from;
    const formatted = formatRichTextHtml(editor.getHTML());
    editor.commands.setContent(formatted, { emitUpdate: true });
    const maximumPosition = Math.max(1, editor.state.doc.content.size);
    editor.chain()
      .focus()
      .setTextSelection(Math.min(position, maximumPosition))
      .run();
  };

  const rememberSelectedText = () => {
    const { from, to } = editor.state.selection;
    if (from !== to) selectedTextRangeRef.current = { from, to };
  };

  const restoreSelectedText = () => {
    const { from, to } = editor.state.selection;
    if (from !== to) {
      selectedTextRangeRef.current = { from, to };
      return true;
    }
    const saved = selectedTextRangeRef.current;
    const maximumPosition = editor.state.doc.content.size;
    if (!saved || saved.from < 1 || saved.to > maximumPosition || saved.from === saved.to) return false;
    editor.commands.setTextSelection(saved);
    return true;
  };

  const updateTextStyle = (name, nextValue) => {
    if (!restoreSelectedText()) return;
    const current = editor.getAttributes("rsacTextStyle");
    const next = { ...current, [name]: nextValue || null };
    if (!next.fontFamily && !next.fontSize && !next.color) editor.chain().focus().unsetMark("rsacTextStyle").run();
    else editor.chain().focus().setMark("rsacTextStyle", next).run();
  };

  const runOnSelectedText = (command) => {
    if (!restoreSelectedText()) return;
    command();
  };

  return (
    <div className="section-rich-editor">
      <div className="section-rich-editor__toolbar" role="toolbar" aria-label={`${ariaLabel} formatting`}>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></ToolbarButton><ToolbarButton label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Bold" active={state.bold} onClick={() => runOnSelectedText(() => editor.chain().focus().toggleBold().run())}><Bold /></ToolbarButton><ToolbarButton label="Italic" active={state.italic} onClick={() => runOnSelectedText(() => editor.chain().focus().toggleItalic().run())}><Italic /></ToolbarButton><ToolbarButton label="Underline" active={state.underline} onClick={() => runOnSelectedText(() => editor.chain().focus().toggleUnderline().run())}><Underline /></ToolbarButton><ToolbarButton label="Strikethrough" active={state.strike} onClick={() => runOnSelectedText(() => editor.chain().focus().toggleStrike().run())}><Strikethrough /></ToolbarButton></div>
        <div className="section-rich-editor__selectgroup"><label><span>Font</span><select aria-label="Selected text font family" value={state.fontFamily} onPointerDown={rememberSelectedText} onFocus={rememberSelectedText} onChange={(event) => updateTextStyle("fontFamily", event.target.value)}>{fontOptions.map(([optionValue, label]) => <option value={optionValue} key={label}>{label}</option>)}</select></label><label><span>Size</span><select aria-label="Selected text size" value={state.fontSize} onPointerDown={rememberSelectedText} onFocus={rememberSelectedText} onChange={(event) => updateTextStyle("fontSize", event.target.value)}>{sizeOptions.map(([optionValue, label]) => <option value={optionValue} key={label}>{label}</option>)}</select></label></div>
        <div className="section-rich-editor__colorgroup">
          <label className="editor-color-control" title="Choose the foreground colour of the selected text.">
            <span><Palette /> Text colour</span>
            <input type="color" aria-label="Selected text colour" value={state.textColor || DEFAULT_TEXT_COLOR} onPointerDown={rememberSelectedText} onFocus={rememberSelectedText} onInput={(event) => updateTextStyle("color", normalizeTextColor(event.currentTarget.value))} />
          </label>
          <ToolbarButton label="Remove text colour" active={Boolean(state.textColor)} onClick={() => updateTextStyle("color", "")}><Eraser /></ToolbarButton>
        </div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Heading 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolbarButton><ToolbarButton label="Heading 3" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolbarButton><ToolbarButton label="Heading 4" active={state.h4} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Bullet list" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></ToolbarButton><ToolbarButton label="Numbered list" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolbarButton><ToolbarButton label="Quote" active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Align left" active={state.alignment === "start"} onClick={() => editor.chain().focus().setRsacTextAlign("start").run()}><AlignLeft /></ToolbarButton><ToolbarButton label="Align centre" active={state.alignment === "center"} onClick={() => editor.chain().focus().setRsacTextAlign("center").run()}><AlignCenter /></ToolbarButton><ToolbarButton label="Align right" active={state.alignment === "end"} onClick={() => editor.chain().focus().setRsacTextAlign("end").run()}><AlignRight /></ToolbarButton><ToolbarButton label="Justify" active={state.alignment === "justify"} onClick={() => editor.chain().focus().setRsacTextAlign("justify").run()}><AlignJustify /></ToolbarButton></div>
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Add or edit link" active={state.link} onClick={setLink}><Link2 /></ToolbarButton><ToolbarButton label="Remove link" onClick={() => runOnSelectedText(() => editor.chain().focus().unsetLink().run())}><Unlink /></ToolbarButton><ToolbarButton label="Insert 3 by 3 table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 /></ToolbarButton></div>
        {state.table && <div className="section-rich-editor__table-tools" aria-label="Table tools"><ToolbarButton label="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>Row above</ToolbarButton><ToolbarButton label="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>Row below</ToolbarButton><ToolbarButton label="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>Add column</ToolbarButton><ToolbarButton label="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</ToolbarButton><ToolbarButton label="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</ToolbarButton><ToolbarButton label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</ToolbarButton></div>}
        <div className="section-rich-editor__toolgroup"><ToolbarButton label="Horizontal divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus /></ToolbarButton><ToolbarButton label="Clear formatting" onClick={() => runOnSelectedText(() => editor.chain().focus().unsetAllMarks().clearNodes().unsetRsacTextAlign().run())}><RemoveFormatting /></ToolbarButton><ToolbarButton label="Format text" disabled={editor.isEmpty} onClick={formatText}><Sparkles /><span>Format text</span></ToolbarButton></div>
      </div>
      <EditorContent editor={editor} />
      <p className="section-rich-editor__help">Select text before using bold, italic, underline, font, size, text colour, or clear formatting. Headings, lists, alignment, and tables work on the current paragraph or section.</p>
    </div>
  );
});

export default SectionRichTextEditor;
