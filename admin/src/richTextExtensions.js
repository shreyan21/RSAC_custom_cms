import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { normalizeTextColor, textColorStyle } from "../../shared/richTextColor.js";

export const fontOptions = [
  ["", "Default font"], ["inter", "Inter"], ["jakarta", "Plus Jakarta Sans"],
  ["system-sans", "System Sans"], ["system-serif", "System Serif"],
];
export const sizeOptions = [
  ["", "Default size"], ["small", "Small"], ["normal", "Normal"],
  ["large", "Large"], ["xlarge", "Extra large"],
];
const safeFonts = new Set(fontOptions.map(([value]) => value).filter(Boolean));
const safeSizes = new Set(sizeOptions.map(([value]) => value).filter(Boolean));
const safeAlignments = new Set(["start", "center", "end", "justify"]);

const RsacTextAlignment = Extension.create({
  name: "rsacTextAlignment",
  addOptions: () => ({ types: ["heading", "paragraph"] }),
  addGlobalAttributes() {
    return [{ types: this.options.types, attributes: {
      textAlign: {
        default: "start",
        parseHTML: (element) => safeAlignments.has(element.getAttribute("data-rsac-align"))
          ? element.getAttribute("data-rsac-align") : "start",
        renderHTML: ({ textAlign }) => textAlign && textAlign !== "start"
          ? { "data-rsac-align": textAlign } : {},
      },
    } }];
  },
  addCommands() {
    return {
      setRsacTextAlign: (textAlign) => ({ commands }) => {
        if (!safeAlignments.has(textAlign)) return false;
        this.options.types.forEach((type) => commands.updateAttributes(type, { textAlign }));
        return true;
      },
      unsetRsacTextAlign: () => ({ commands }) => {
        this.options.types.forEach((type) => commands.resetAttributes(type, "textAlign"));
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
          ? element.getAttribute("data-rsac-font") : null,
        renderHTML: ({ fontFamily }) => safeFonts.has(fontFamily) ? { "data-rsac-font": fontFamily } : {},
      },
      fontSize: {
        default: null,
        parseHTML: (element) => safeSizes.has(element.getAttribute("data-rsac-size"))
          ? element.getAttribute("data-rsac-size") : null,
        renderHTML: ({ fontSize }) => safeSizes.has(fontSize) ? { "data-rsac-size": fontSize } : {},
      },
      color: {
        default: null,
        parseHTML: (element) => normalizeTextColor(element.getAttribute("data-rsac-color")) || null,
        renderHTML: ({ color }) => {
          const safeColor = normalizeTextColor(color);
          return safeColor ? { "data-rsac-color": safeColor, style: textColorStyle(safeColor) } : {};
        },
      },
    };
  },
});

// Keep the new-item identity when the visual editor parses and saves a list or table.
const RsacAddedItem = Extension.create({
  name: "rsacAddedItem",
  addGlobalAttributes() {
    return [{ types: ["listItem", "tableRow"], attributes: {
      rsacAddedItem: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-rsac-added-item") === "true",
        renderHTML: ({ rsacAddedItem }) => rsacAddedItem ? { "data-rsac-added-item": "true" } : {},
      },
    } }];
  },
});

// Imported rich sections can include portraits and other photographs.
// Keep their nodes when opening and saving a section, even without an upload toolbar.
const RsacImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return Object.fromEntries(
      ["src", "alt", "title", "loading", "width", "height"]
        .map((name) => [name, { default: null }])
    );
  },
  parseHTML: () => [{ tag: "img[src]" }],
  renderHTML: ({ HTMLAttributes }) => ["img", mergeAttributes(HTMLAttributes)],
});

export const sectionEditorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4, 5] }, code: false, codeBlock: false,
    link: { autolink: true, defaultProtocol: "https", openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } },
  }),
  RsacTextAlignment, RsacTextStyle, RsacAddedItem,
  RsacImage,
  Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
];
