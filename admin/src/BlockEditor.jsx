import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { blockTypes } from "../../shared/cmsCollections";

const newBlock = (type) => ({ id: crypto.randomUUID(), type, heading: "", text: "", html: "", items: [], rows: [], headers: [] });
const itemFields = {
  cards: [["title", "Card title"], ["text", "Description"], ["url", "Link URL"]],
  stats: [["value", "Value"], ["label", "Label"]],
  links: [["title", "Link label"], ["url", "Link URL"]],
  gallery: [["url", "Image URL"], ["alt", "Image alt text"]],
};

const importedSourceLabel = (block) => {
  const childLabel = (block.children || []).find((child) => child?.label)?.label || "";
  return childLabel.split(/\s*(?:\u2192|->)\s*/u)[0].trim() || block.heading || block.label || "Imported section";
};

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

function ImportedNumberedItems({ block, onChange }) {
  const [query, setQuery] = useState("");
  const children = Array.isArray(block.children) ? block.children : [];
  const sourceLabel = importedSourceLabel(block);
  const numbered = children.reduce((result, child, index) => {
    if (!child.hidden) result.push({ child, index, number: result.length + 1 });
    return result;
  }, []);
  const visible = numbered.filter(({ child }) => String(child.value || "").toLowerCase().includes(query.trim().toLowerCase()));
  const removed = children.reduce((count, child) => count + (child.hidden ? 1 : 0), 0);
  const updateItem = (index, patch) => onChange({ children: children.map((child, position) => position === index ? { ...child, ...patch } : child) });
  const removeItem = (index) => {
    const item = children[index];
    onChange({
      children: item?.isNew || String(item?.key || "").startsWith("cms-")
        ? children.filter((_child, position) => position !== index)
        : children.map((child, position) => position === index ? { ...child, hidden: true } : child),
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
        {visible.map(({ child, index, number }) => (
          <label className="imported-list-item" key={child.key || index}>
            <span>{number}</span>
            <span>Item {number}<textarea rows="3" value={child.value || ""} onChange={(event) => updateItem(index, { value: event.target.value })} /></span>
            <button type="button" className="danger-icon" title={`Remove item ${number}`} onClick={() => removeItem(index)}><Trash2 /></button>
          </label>
        ))}
        {!visible.length && <p className="empty-inline">No matching item.</p>}
      </div>
      {removed > 0 && (
        <button type="button" className="secondary restore-items" onClick={() => onChange({ children: children.map((child) => ({ ...child, hidden: false })) })}><Undo2 /> Restore {removed} removed item{removed === 1 ? "" : "s"}</button>
      )}
    </div>
  );
}

function ImportedContentFields({ block, onChange }) {
  const [query, setQuery] = useState("");
  const children = Array.isArray(block.children) ? block.children : [];
  const sourceLabel = importedSourceLabel(block);
  const active = children.reduce((result, child, index) => {
    if (!child.hidden) result.push({ child, index, number: result.length + 1 });
    return result;
  }, []);
  const visible = active.filter(({ child }) => `${child.label || ""} ${child.value || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const removed = children.filter((child) => child.hidden).length;
  const updateItem = (index, patch) => onChange({ children: children.map((child, position) => position === index ? { ...child, ...patch } : child) });
  const removeItem = (index) => {
    const item = children[index];
    onChange({ children: item?.isNew || String(item?.key || "").startsWith("cms-")
      ? children.filter((_child, position) => position !== index)
      : children.map((child, position) => position === index ? { ...child, hidden: true } : child) });
  };
  const addAtTop = () => onChange({ children: [{ key: `cms-${crypto.randomUUID()}`, label: `${sourceLabel} -> New line`, value: "", isNew: true }, ...children] });

  return (
    <div className="imported-list-editor">
      <div className="imported-list-toolbar">
        <button type="button" className="primary" onClick={addAtTop}><Plus /> Add line at top</button>
        <label><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active.length} fields`} /></label>
      </div>
      <p className="imported-list-help">Each row controls one visible line in this website section. Use dedicated People and Gallery collections for profile photos and gallery uploads.</p>
      <div className="imported-list-items">
        {visible.map(({ child, index, number }) => {
          const fieldName = String(child.label || `Line ${number}`).split(/\s*(?:\u2192|->)\s*/u).slice(1).join(" -> ") || `Line ${number}`;
          return <label className="imported-list-item" key={child.key || index}><span>{number}</span><span title={fieldName}>{fieldName}<textarea rows="3" value={child.value || ""} onChange={(event) => updateItem(index, { value: event.target.value })} /></span><button type="button" className="danger-icon" title={`Remove line ${number}`} onClick={() => removeItem(index)}><Trash2 /></button></label>;
        })}
        {!visible.length && <p className="empty-inline">No matching field.</p>}
      </div>
      {removed > 0 && <button type="button" className="secondary restore-items" onClick={() => onChange({ children: children.map((child) => ({ ...child, hidden: false })) })}><Undo2 /> Restore {removed} removed line{removed === 1 ? "" : "s"}</button>}
    </div>
  );
}

function StructuredItems({ block, onChange }) {
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
  return <div className="structured-items"><strong>{blockTypes.find((type) => type.value === block.type)?.label} items</strong><button type="button" className="add-item" onClick={() => onChange({ items: [{ id: crypto.randomUUID() }, ...items] })}><Plus /> Add item at top</button>{items.map((item, index) => <div className="structured-item structured-item--fields" key={item.id || index}><span className="item-number">{index + 1}</span><div>{fields.map(([name, label]) => <label key={name}>{label}<input value={typeof item === "object" ? item[name] || "" : name === "title" ? item : ""} onChange={(event) => updateItem(index, name, event.target.value)} /></label>)}</div><button type="button" className="danger-icon" title="Remove item" onClick={() => onChange({ items: items.filter((_item, position) => position !== index) })}><Trash2 /></button></div>)}</div>;
}

export default function BlockEditor({ value, onChange }) {
  const blocks = Array.isArray(value) ? value : [];
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
        const sourceLabel = importedSourceLabel(block);
        const isPeopleReference = /scientific manpower|वैज्ञानिक जनशक्ति/iu.test(sourceLabel);
        const importedCount = (block.children || []).filter((child) => !child.hidden).length;
        const itemCount = block.editorMode === "numbered_list" || importedCount ? importedCount : (block.items || []).length;
        return (
          <section className={`block-row${isOpen ? " open" : ""}`} key={blockKey}>
            <div className="block-row__head">
              <button type="button" className="block-toggle" aria-expanded={isOpen} onClick={() => setFocusedIndex(index)}><ChevronDown /><span><strong>{index + 1}. {sourceLabel}</strong><small>{isPeopleReference ? "Managed in Scientists / Officials / Staff" : block.editorMode === "numbered_list" ? `Numbered list - ${itemCount} items` : importedCount ? `Editable section - ${itemCount} fields` : blockTypes.find((type) => type.value === block.type)?.label || block.type}</small></span></button>
              <div className="icon-actions"><button type="button" title="Move up" onClick={() => move(index, -1)}><ArrowUp /></button><button type="button" title="Move down" onClick={() => move(index, 1)}><ArrowDown /></button><button type="button" title="Duplicate" onClick={() => onChange([...blocks.slice(0, index + 1), { ...structuredClone(block), id: crypto.randomUUID() }, ...blocks.slice(index + 1)])}><Copy /></button><button type="button" className="danger-icon" title="Remove block" onClick={() => { onChange(blocks.filter((_item, position) => position !== index)); setFocusedIndex(null); }}><Trash2 /></button></div>
            </div>
            {isOpen && <div className="block-row__body">
              {isPeopleReference ? (
                <div className="collection-reference"><strong>Use the dedicated people collection</strong><p>Open <b>Scientists / Officials / Staff</b> to add, edit, remove, reorder, or replace profile photographs. This prevents names, roles, and photos from becoming disconnected.</p></div>
              ) : block.editorMode === "numbered_list" ? (
                <><div className="locked-section-name"><strong>Website section</strong><span>{sourceLabel}</span><small>Kept fixed so content cannot move into the wrong division tab.</small></div><ImportedNumberedItems block={block} onChange={(patch) => update(index, patch)} /></>
              ) : importedCount ? (
                <><div className="locked-section-name"><strong>Website section</strong><span>{sourceLabel}</span><small>Open one field, edit it, then save the page.</small></div><ImportedContentFields block={block} onChange={(patch) => update(index, patch)} /></>
              ) : (
                <>
                  {block.type !== "divider" && <label>Section heading<input value={block.heading || ""} onChange={(event) => update(index, { heading: event.target.value })} /></label>}
                  {["hero", "callout"].includes(block.type) && <label>Text<textarea rows="3" value={block.text || ""} onChange={(event) => update(index, { text: event.target.value })} /></label>}
                  {block.type === "rich_text" && <label>Formatted paragraph<RichBlockEditor value={block.html} onChange={(html) => update(index, { html })} /></label>}
                  {["hero", "image"].includes(block.type) && <><label>Image URL<input value={block.image || ""} onChange={(event) => update(index, { image: event.target.value })} /></label><label>Image alt text<input value={block.alt || ""} onChange={(event) => update(index, { alt: event.target.value })} /></label></>}
                  <StructuredItems block={block} onChange={(patch) => update(index, patch)} />
                </>
              )}
              <label className="inline-check"><input type="checkbox" checked={Boolean(block.hidden)} onChange={(event) => update(index, { hidden: event.target.checked })} /> Hide this block</label>
            </div>}
          </section>
        );
      })}
      {focusedIndex === null && <div className="add-block"><Plus aria-hidden="true" /><select defaultValue="" onChange={(event) => { if (event.target.value) onChange([...blocks, newBlock(event.target.value)]); event.target.value = ""; }}><option value="">Add page block</option>{blockTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>}
    </div>
  );
}
