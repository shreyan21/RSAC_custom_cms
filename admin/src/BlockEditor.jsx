import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Search, Trash2, Undo2, Upload } from "lucide-react";
import { blockTypes } from "../../shared/cmsCollections";
import {
  findImportedReferenceBlock,
  importedEditorRows,
  updateImportedEditorRow,
} from "../../shared/importedEditorRows";
import { api, mediaPreviewUrl } from "./api";
import ImportedAssetEditor from "./ImportedAssetEditor";

const newBlock = (type) => ({ id: crypto.randomUUID(), type, heading: "", text: "", html: "", items: [], rows: [], headers: [], textSize: "normal", mediaSize: "normal", spacing: "normal" });
const itemFields = {
  cards: [["title", "Card title"], ["text", "Description"], ["image", "Image URL"], ["alt", "Image alt text"], ["url", "Link URL"]],
  stats: [["value", "Value"], ["label", "Label"]],
  links: [["title", "Link label"], ["url", "Link URL"]],
  gallery: [["url", "Image URL"], ["alt", "Image alt text"], ["caption", "Caption"]],
};

const cleanSourceLabel = (value) => String(value || "").replace(/^Section:\s*/i, "").trim();

const importedSourceLabel = (block) => {
  const ownLabel = [block?.heading, block?.value, block?.label].map(cleanSourceLabel).find((label) => label && label.length <= 80);
  if (ownLabel) return ownLabel;
  const childLabel = (block.children || []).find((child) => child?.label)?.label || "";
  return childLabel.split(/\s*(?:\u2192|->)\s*/u)[0].trim() || block.heading || block.label || "Imported section";
};

const displayOptions = {
  textSize: [["compact", "Small"], ["normal", "Normal"], ["large", "Large"]],
  mediaSize: [["compact", "Small"], ["normal", "Normal"], ["large", "Large"], ["full", "Full width"]],
  spacing: [["compact", "Compact"], ["normal", "Normal"], ["relaxed", "Relaxed"]],
};

function BlockDisplayControls({ block, onChange }) {
  const supportsColumns = ["cards", "gallery", "stats"].includes(block.type);
  return (
    <fieldset className="block-display-controls">
      <legend>Section layout</legend>
      <label>Text size<select value={block.textSize || "normal"} onChange={(event) => onChange({ textSize: event.target.value })}>{displayOptions.textSize.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Image size<select value={block.mediaSize || "normal"} onChange={(event) => onChange({ mediaSize: event.target.value })}>{displayOptions.mediaSize.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Spacing<select value={block.spacing || "normal"} onChange={(event) => onChange({ spacing: event.target.value })}>{displayOptions.spacing.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      {supportsColumns && <label>Columns<select value={String(block.columns || "")} onChange={(event) => onChange({ columns: event.target.value ? Number(event.target.value) : "" })}><option value="">Automatic</option>{[1, 2, 3, 4].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>}
      <label>Frame<select value={block.variant || "framed"} onChange={(event) => onChange({ variant: event.target.value })}><option value="framed">Framed</option><option value="plain">Plain</option></select></label>
    </fieldset>
  );
}

function BlockMediaField({ label, value, onChange, onBusy, onError, accept = "image/*", showPreview = true }) {
  const fileRef = useRef(null);
  const upload = async (file) => {
    if (!file) return;
    onBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api("/api/admin/media", { method: "POST", body });
      onChange(result.data.public_url);
    } catch (error) {
      onError(error.message);
    } finally {
      onBusy(false);
    }
  };
  return (
    <label>{label}<div className="block-media-field"><input value={value || ""} placeholder="Uploaded file URL" onChange={(event) => onChange(event.target.value)} /><input ref={fileRef} hidden type="file" accept={accept} onChange={(event) => upload(event.target.files?.[0])} /><button type="button" className="secondary" title={`Upload ${label.toLowerCase()}`} onClick={() => fileRef.current?.click()}><Upload /> Upload</button>{showPreview && value && /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i.test(value) && <img src={mediaPreviewUrl(value)} alt="Selected media preview" />}</div></label>
  );
}

function RichBlockEditor({ value, onChange }) {
  return (
    <div className="rich-field">
      <div className="rich-toolbar">
        <button type="button" title="Bold" onClick={() => document.execCommand("bold")}><strong>B</strong></button>
        <button type="button" title="Italic" onClick={() => document.execCommand("italic")}><em>I</em></button>
        <button type="button" onClick={() => document.execCommand("insertUnorderedList")}>Bullet list</button>
        <button type="button" onClick={() => document.execCommand("insertOrderedList")}>Numbered list</button>
      </div>
      <div className="rich-editor" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: value || "" }} onBlur={(event) => onChange(event.currentTarget.innerHTML)} />
    </div>
  );
}

function ImportedNumberedItems({ block, referenceBlock, pageData, referencePageData, language, onChange }) {
  const [query, setQuery] = useState("");
  const children = Array.isArray(block.children) ? block.children : [];
  const sourceLabel = importedSourceLabel(block);
  const editorRows = importedEditorRows({ block, referenceBlock, pageData, referencePageData });
  const numbered = editorRows.reduce((result, row) => {
    if (!row.child.hidden) result.push({ ...row, number: result.length + 1 });
    return result;
  }, []);
  const visible = numbered.filter(({ child, referenceChild }) =>
    `${child.value || ""} ${referenceChild?.value || ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const removed = editorRows.filter(({ child }) => child.hidden).length;
  const updateItem = (row, patch) => onChange({ children: updateImportedEditorRow(children, row, patch) });
  const removeItem = (row) => {
    const item = row.index >= 0 ? children[row.index] : row.child;
    onChange({
      children: row.index >= 0 && (item?.isNew || String(item?.key || "").startsWith("cms-"))
        ? children.filter((_child, position) => position !== row.index)
        : updateImportedEditorRow(children, row, { hidden: true }),
    });
  };
  const addAtTop = () => onChange({
    children: [{
      key: `cms-${crypto.randomUUID()}`,
      label: `${sourceLabel} -> New item`,
      value: "",
      isNew: true,
    }, ...children],
  });

  return (
    <div className="imported-list-editor">
      <div className="imported-list-toolbar">
        <button type="button" className="primary" onClick={addAtTop}><Plus /> Add item at top</button>
        <label><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${numbered.length} items`} /></label>
      </div>
      <p className="imported-list-help">Edit one numbered row at a time. New items appear first on the website automatically.</p>
      <div className="imported-list-items">
        {visible.map((row) => {
          const { child, referenceChild, number } = row;
          const itemLabel = `Item ${number}`;
          return (
            <label className="imported-list-item" key={child.key || row.referenceChild?.key || row.referenceIndex}>
              <span>{number}</span>
              <span><strong>{itemLabel}</strong>{language === "hi" && referenceChild?.value && <small className="english-row-reference"><b>English reference</b>{referenceChild.value}</small>}<textarea rows="3" aria-label={`${language === "hi" ? "Hindi" : "English"} ${itemLabel}`} value={child.value || ""} onChange={(event) => updateItem(row, { value: event.target.value })} /></span>
              <button type="button" className="danger-icon" title={`Remove ${itemLabel}`} onClick={() => removeItem(row)}><Trash2 /></button>
            </label>
          );
        })}
        {!visible.length && <p className="empty-inline">No matching item.</p>}
      </div>
      {removed > 0 && (
        <button type="button" className="secondary restore-items" onClick={() => onChange({ children: children.map((child) => ({ ...child, hidden: false })) })}><Undo2 /> Restore {removed} removed item{removed === 1 ? "" : "s"}</button>
      )}
    </div>
  );
}

function ImportedContentFields({ block, referenceBlock, pageData, referencePageData, language, onChange }) {
  const [query, setQuery] = useState("");
  const children = Array.isArray(block.children) ? block.children : [];
  const sourceLabel = importedSourceLabel(block);
  const editorRows = importedEditorRows({ block, referenceBlock, pageData, referencePageData });
  const active = editorRows.reduce((result, row) => {
    if (!row.child.hidden) result.push({ ...row, number: result.length + 1 });
    return result;
  }, []);
  const visible = active.filter(({ child, referenceChild }) =>
    `${child.label || ""} ${child.value || ""} ${referenceChild?.label || ""} ${referenceChild?.value || ""}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const removed = editorRows.filter(({ child }) => child.hidden).length;
  const updateItem = (row, patch) => onChange({ children: updateImportedEditorRow(children, row, patch) });
  const removeItem = (row) => {
    const item = row.index >= 0 ? children[row.index] : row.child;
    onChange({ children: row.index >= 0 && (item?.isNew || String(item?.key || "").startsWith("cms-"))
      ? children.filter((_child, position) => position !== row.index)
      : updateImportedEditorRow(children, row, { hidden: true }) });
  };
  const addAtTop = () => onChange({ children: [{ key: `cms-${crypto.randomUUID()}`, label: `${sourceLabel} -> New line`, value: "", isNew: true }, ...children] });

  return (
    <div className="imported-list-editor">
      <div className="imported-list-toolbar">
        <button type="button" className="primary" onClick={addAtTop}><Plus /> Add line at top</button>
        <label><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active.length} fields`} /></label>
      </div>
      <p className="imported-list-help">Each row controls one visible line in this website section. Section-specific images, files and links are edited directly below.</p>
      <div className="imported-list-items">
        {visible.map((row) => {
          const { child, referenceChild, number } = row;
          const fieldName = String(child.label || `Line ${number}`).split(/\s*(?:\u2192|->)\s*/u).slice(1).join(" -> ") || `Line ${number}`;
          return <label className="imported-list-item" key={child.key || referenceChild?.key || row.referenceIndex}><span>{number}</span><span title={fieldName}><strong>{fieldName}</strong>{language === "hi" && referenceChild?.value && <small className="english-row-reference"><b>English reference</b>{referenceChild.value}</small>}<textarea rows="3" aria-label={`${language === "hi" ? "Hindi" : "English"} line ${number}`} value={child.value || ""} onChange={(event) => updateItem(row, { value: event.target.value })} /></span><button type="button" className="danger-icon" title={`Remove line ${number}`} onClick={() => removeItem(row)}><Trash2 /></button></label>;
        })}
        {!visible.length && <p className="empty-inline">No matching field.</p>}
      </div>
      {removed > 0 && <button type="button" className="secondary restore-items" onClick={() => onChange({ children: children.map((child) => ({ ...child, hidden: false })) })}><Undo2 /> Restore {removed} removed line{removed === 1 ? "" : "s"}</button>}
    </div>
  );
}

function StructuredItems({ block, onChange, onBusy, onError }) {
  if (block.type === "list") {
    const items = Array.isArray(block.items) ? block.items : [];
    return <div className="structured-items"><strong>List items</strong><button type="button" className="add-item" onClick={() => onChange({ items: ["", ...items] })}><Plus /> Add item at top</button>{items.map((item, index) => <div className="structured-item" key={`${index}-${String(item).slice(0, 20)}`}><span className="item-number">{index + 1}</span><textarea rows="2" aria-label={`List item ${index + 1}`} value={typeof item === "string" ? item : item.title || ""} onChange={(event) => onChange({ items: items.map((current, position) => position === index ? event.target.value : current) })} /><button type="button" className="danger-icon" title="Remove item" onClick={() => onChange({ items: items.filter((_item, position) => position !== index) })}><Trash2 /></button></div>)}</div>;
  }

  if (block.type === "table") {
    const rows = Array.isArray(block.rows) ? block.rows : [];
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const columnCount = Math.max(2, headers.length, ...rows.map((row) => Array.isArray(row) ? row.length : 0));
    const setCell = (rowIndex, columnIndex, value) => onChange({ rows: rows.map((row, index) => { if (index !== rowIndex) return row; const next = Array.from({ length: columnCount }, (_, position) => row?.[position] || ""); next[columnIndex] = value; return next; }) });
    const setHeader = (columnIndex, value) => { const next = Array.from({ length: columnCount }, (_, index) => headers[index] || ""); next[columnIndex] = value; onChange({ headers: next }); };
    return <div className="structured-items"><strong>Table columns</strong><div className="table-item-row">{Array.from({ length: columnCount }, (_, index) => <input key={index} aria-label={`Column ${index + 1} heading`} placeholder={`Column ${index + 1} heading`} value={headers[index] || ""} onChange={(event) => setHeader(index, event.target.value)} />)}</div><strong>Table rows</strong>{rows.map((row, rowIndex) => <div className="table-item-row" key={rowIndex}>{Array.from({ length: columnCount }, (_, columnIndex) => <input key={columnIndex} aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`} value={row?.[columnIndex] || ""} onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)} />)}<button type="button" className="danger-icon" title="Remove row" onClick={() => onChange({ rows: rows.filter((_row, index) => index !== rowIndex) })}><Trash2 /></button></div>)}<button type="button" className="add-item" onClick={() => onChange({ rows: [Array(columnCount).fill(""), ...rows] })}><Plus /> Add table row at top</button></div>;
  }

  const fields = itemFields[block.type];
  if (!fields) return null;
  const items = Array.isArray(block.items) ? block.items : [];
  const updateItem = (index, name, value) => onChange({ items: items.map((item, position) => position === index ? { ...(typeof item === "object" ? item : {}), [name]: value } : item) });
  return <div className="structured-items"><strong>{blockTypes.find((type) => type.value === block.type)?.label} items</strong><button type="button" className="add-item" onClick={() => onChange({ items: [{ id: crypto.randomUUID() }, ...items] })}><Plus /> Add item at top</button>{items.map((item, index) => <div className="structured-item structured-item--fields" key={item.id || index}><span className="item-number">{index + 1}</span><div>{fields.map(([name, label]) => ((block.type === "cards" && name === "image") || block.type === "gallery" || (block.type === "links" && name === "url")) ? <BlockMediaField key={name} label={block.type === "links" ? "File or link URL" : label} value={typeof item === "object" ? item[name] || "" : ""} onChange={(value) => updateItem(index, name, value)} onBusy={onBusy} onError={onError} accept={block.type === "links" ? ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx" : "image/*"} showPreview={block.type !== "links"} /> : <label key={name}>{label}<input value={typeof item === "object" ? item[name] || "" : name === "title" ? item : ""} onChange={(event) => updateItem(index, name, event.target.value)} /></label>)}</div><button type="button" className="danger-icon" title="Remove item" onClick={() => onChange({ items: items.filter((_item, position) => position !== index) })}><Trash2 /></button></div>)}</div>;
}

export default function BlockEditor({ value, referenceValue, pageData, referencePageData, language = "en", onChange, onBusy = () => {}, onError = () => {} }) {
  const blocks = Array.isArray(value) ? value : [];
  const referenceBlocks = Array.isArray(referenceValue) ? referenceValue : blocks;
  const [focusedIndex, setFocusedIndex] = useState(null);
  const update = (index, patch) => onChange(blocks.map((block, position) => position === index ? { ...block, ...patch } : block));
  const move = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    if (focusedIndex === index) setFocusedIndex(target);
  };

  return (
    <div className="block-editor">
      {focusedIndex === null
        ? <p className="block-editor-help">Choose one website section. Its editor opens alone, with other sections hidden.</p>
        : <div className="focused-section-bar"><button type="button" className="secondary" onClick={() => setFocusedIndex(null)}><ArrowUp /> Back to all sections</button><strong>Editing only: {importedSourceLabel(blocks[focusedIndex])}</strong></div>}
      {blocks.map((block, index) => {
        if (focusedIndex !== null && focusedIndex !== index) return null;
        const blockKey = block.id || index;
        const isOpen = focusedIndex === index;
        const referenceBlock = findImportedReferenceBlock(referenceBlocks, block, index) || block;
        const sourceLabel = importedSourceLabel(block);
        const isPeopleReference = /scientific manpower|वैज्ञानिक जनशक्ति/iu.test(sourceLabel);
        const isImported = Array.isArray(block.children);
        const importedCount = Array.isArray(block.children)
          ? importedEditorRows({ block, referenceBlock, pageData, referencePageData }).filter(({ child }) => !child.hidden).length
          : 0;
        const assetCount = (block.assets || []).filter((asset) => !asset.hidden).length;
        const itemCount = block.editorMode === "numbered_list" || importedCount ? importedCount : (block.items || []).length;
        return (
          <section className={`block-row${isOpen ? " open" : ""}`} key={blockKey}>
            <div className="block-row__head">
              <button type="button" className="block-toggle" aria-expanded={isOpen} onClick={() => setFocusedIndex(index)}><ChevronDown /><span><strong>{index + 1}. {sourceLabel}</strong><small>{isPeopleReference ? "Managed in Scientists / Officials / Staff" : block.editorMode === "numbered_list" ? `Numbered list - ${itemCount} items${assetCount ? `, ${assetCount} media` : ""}` : importedCount || assetCount ? `Editable section - ${itemCount} text fields${assetCount ? `, ${assetCount} media` : ""}` : blockTypes.find((type) => type.value === block.type)?.label || block.type}</small></span></button>
              <div className="icon-actions"><button type="button" title="Move up" onClick={() => move(index, -1)}><ArrowUp /></button><button type="button" title="Move down" onClick={() => move(index, 1)}><ArrowDown /></button><button type="button" title="Duplicate" onClick={() => onChange([...blocks.slice(0, index + 1), { ...structuredClone(block), id: crypto.randomUUID() }, ...blocks.slice(index + 1)])}><Copy /></button><button type="button" className="danger-icon" title="Remove block" onClick={() => { onChange(blocks.filter((_item, position) => position !== index)); setFocusedIndex(null); }}><Trash2 /></button></div>
            </div>
            {isOpen && <div className="block-row__body">
              {!isImported && !isPeopleReference && <BlockDisplayControls block={block} onChange={(patch) => update(index, patch)} />}
              {isPeopleReference ? (
                <div className="collection-reference"><strong>Use the dedicated people collection</strong><p>Open <b>Scientists / Officials / Staff</b> to add, edit, remove, reorder, or replace profile photographs. This prevents names, roles, and photos from becoming disconnected.</p></div>
              ) : block.editorMode === "numbered_list" ? (
                <><label>Section heading{language === "hi" && referenceBlock?.value && <small className="english-field-reference">English: {referenceBlock.value}</small>}<input value={block.value || ""} onChange={(event) => update(index, { value: event.target.value })} /></label><ImportedNumberedItems block={block} referenceBlock={referenceBlock} pageData={pageData} referencePageData={referencePageData} language={language} onChange={(patch) => update(index, patch)} /></>
              ) : isImported ? (
                <>{block.controlsSectionLabel !== false && <label>Section heading{language === "hi" && referenceBlock?.value && <small className="english-field-reference">English: {referenceBlock.value}</small>}<input value={block.value || ""} onChange={(event) => update(index, { value: event.target.value })} /></label>}<p className="imported-list-help">Every row below controls one visible website item. Imported page titles and tab labels stay out of this list.</p><ImportedContentFields block={block} referenceBlock={referenceBlock} pageData={pageData} referencePageData={referencePageData} language={language} onChange={(patch) => update(index, patch)} /></>
              ) : (
                <>
                  {block.type !== "divider" && <label>Section heading<input value={block.heading || ""} onChange={(event) => update(index, { heading: event.target.value })} /></label>}
                  {["hero", "callout"].includes(block.type) && <label>Text<textarea rows="3" value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} /></label>}
                  {block.type === "rich_text" && <label>Formatted paragraph<RichBlockEditor value={block.html} onChange={(html) => update(index, { html })} /></label>}
                  {["hero", "image"].includes(block.type) && <><BlockMediaField label="Image" value={block.image} onChange={(image) => update(index, { image })} onBusy={onBusy} onError={onError} /><label>Image alt text<input value={block.alt || ""} onChange={(event) => update(index, { alt: event.target.value })} /></label>{block.type === "image" && <label>Image caption<input value={block.caption || ""} onChange={(event) => update(index, { caption: event.target.value })} /></label>}</>}
                  <StructuredItems block={block} onChange={(patch) => update(index, patch)} onBusy={onBusy} onError={onError} />
                </>
              )}
              {isImported && !isPeopleReference && <ImportedAssetEditor assets={block.assets} onChange={(assets) => update(index, { assets })} onBusy={onBusy} onError={onError} />}
              <label className="inline-check"><input type="checkbox" checked={Boolean(block.hidden)} onChange={(event) => update(index, { hidden: event.target.checked })} /> Hide this block</label>
            </div>}
          </section>
        );
      })}
      {focusedIndex === null && <div className="add-block"><Plus aria-hidden="true" /><select defaultValue="" onChange={(event) => { if (event.target.value) onChange([...blocks, newBlock(event.target.value)]); event.target.value = ""; }}><option value="">Add page block</option>{blockTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>}
    </div>
  );
}
