import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, ListPlus, Pencil, Trash2 } from "lucide-react";
import {
  addLatestSectionItem,
  inspectSectionItems,
  matchSectionListStructure,
  moveSectionItem,
  removeSectionItem,
} from "./sectionItemHtml";

const itemSectionPattern = /update|project|report|paper|publication|article|programme|program|activity|software|hardware|download|notice|tender|faq|\u092a\u0930\u093f\u092f\u094b\u091c\u0928\u093e|\u0930\u093f\u092a\u094b\u0930\u094d\u091f|\u0936\u094b\u0927|\u092a\u094d\u0930\u0915\u093e\u0936\u0928|\u0915\u093e\u0930\u094d\u092f\u0915\u094d\u0930\u092e|\u0917\u0924\u093f\u0935\u093f\u0927\u093f|\u0938\u0949\u092b\u094d\u091f\u0935\u0947\u092f\u0930|\u0939\u093e\u0930\u094d\u0921\u0935\u0947\u092f\u0930/iu;
const orderedSectionPattern = /update|project|report|paper|publication|article|programme|program|download|notice|tender|faq|\u092a\u0930\u093f\u092f\u094b\u091c\u0928\u093e|\u0930\u093f\u092a\u094b\u0930\u094d\u091f|\u0936\u094b\u0927|\u092a\u094d\u0930\u0915\u093e\u0936\u0928|\u0915\u093e\u0930\u094d\u092f\u0915\u094d\u0930\u092e/iu;

const supportsSectionItems = ({ html, referenceHtml, label, editorMode }) => {
  const inspected = inspectSectionItems(html);
  const referenceInspected = inspectSectionItems(referenceHtml || "");
  return Boolean(inspected.items.length || referenceInspected.items.length || editorMode === "numbered_list" || itemSectionPattern.test(String(label || "")));
};

export default function SectionItemManager({ html, referenceHtml = "", label, editorMode, onChange, onFocusItem }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const inspected = useMemo(() => inspectSectionItems(html), [html]);
  const layoutMatch = useMemo(
    () => matchSectionListStructure(html, referenceHtml),
    [html, referenceHtml]
  );
  const ordered = inspected.type ? inspected.type === "ordered" : editorMode === "numbered_list" || orderedSectionPattern.test(String(label || ""));

  if (!supportsSectionItems({ html, referenceHtml, label, editorMode })) return null;

  const move = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= inspected.items.length) return;
    onChange(moveSectionItem(html, fromIndex, toIndex));
    onFocusItem(toIndex);
  };

  return (
    <section className="section-item-manager" aria-labelledby="section-item-manager-title">
      {layoutMatch.changed && (
        <div className="section-layout-match">
          <div>
            <strong>Hindi list layout differs from English</strong>
            <p>Match the headings and list blocks while keeping every Hindi word unchanged.</p>
          </div>
          <button type="button" className="secondary" onClick={() => onChange(layoutMatch.html)}>Match English layout</button>
        </div>
      )}
      <div className="section-item-manager__head">
        <div>
          <h3 id="section-item-manager-title">List items</h3>
          <p>Newest item goes first. Numbered lists and serial tables update automatically. Use main editor below for text, styles, and sub-items.</p>
        </div>
        <button
          type="button"
          className="primary"
          onClick={() => {
            onChange(addLatestSectionItem(html, ordered));
            onFocusItem(0);
          }}
        >
          <ListPlus /> Add latest item
        </button>
      </div>
      {inspected.items.length > 0 && (
        <ol className="section-item-manager__list">
          {inspected.items.map((item) => (
            <li
              key={`${item.index}-${item.summary}`}
              className={draggedIndex === item.index ? "dragging" : ""}
              draggable
              onDragStart={() => setDraggedIndex(item.index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (Number.isInteger(draggedIndex)) move(draggedIndex, item.index);
                setDraggedIndex(null);
              }}
            >
              <span className="section-item-manager__number" aria-hidden="true">{item.index + 1}</span>
              <GripVertical className="section-item-manager__grip" aria-hidden="true" />
              <button type="button" className="section-item-manager__summary" onClick={() => onFocusItem(item.index)}>
                <span>{item.summary}</span>
                <small>Edit in main editor</small>
              </button>
              <div className="section-item-manager__actions">
                <button type="button" title="Edit item" aria-label={`Edit item ${item.index + 1}`} onClick={() => onFocusItem(item.index)}><Pencil /></button>
                <button type="button" title="Move up" aria-label={`Move item ${item.index + 1} up`} disabled={item.index === 0} onClick={() => move(item.index, item.index - 1)}><ArrowUp /></button>
                <button type="button" title="Move down" aria-label={`Move item ${item.index + 1} down`} disabled={item.index === inspected.items.length - 1} onClick={() => move(item.index, item.index + 1)}><ArrowDown /></button>
                <button
                  type="button"
                  className="danger-icon"
                  title="Delete item"
                  aria-label={`Delete item ${item.index + 1}`}
                  onClick={() => {
                    if (window.confirm(`Delete item ${item.index + 1}? Remaining numbers will update automatically.`)) {
                      onChange(removeSectionItem(html, item.index));
                    }
                  }}
                ><Trash2 /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
