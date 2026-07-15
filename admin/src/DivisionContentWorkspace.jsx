import { useMemo, useState } from "react";
import { ArrowLeft, Languages, Plus, Save, Search, Trash2, Undo2, UserRound } from "lucide-react";
import FieldInput from "./FieldInput";
import ImportedAssetEditor from "./ImportedAssetEditor";

const pageFields = [
  { name: "title", label: "Main page heading", type: "text", localized: true, required: true },
  { name: "eyebrow", label: "Small heading", type: "text", localized: true },
  { name: "summary", label: "Page introduction", type: "textarea", localized: true },
  { name: "featuredImage", label: "Featured image", type: "media", localized: false },
  { name: "headingSize", label: "Page heading size", type: "select", localized: false, options: [{ value: "compact", label: "Small" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" }] },
  { name: "contentSize", label: "Body text size", type: "select", localized: false, options: [{ value: "compact", label: "Small" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" }] },
  { name: "contentWidth", label: "Content width", type: "select", localized: false, options: [{ value: "compact", label: "Narrow" }, { value: "normal", label: "Normal" }, { value: "wide", label: "Wide" }, { value: "full", label: "Full width" }] },
  { name: "mediaSize", label: "Content image size", type: "select", localized: false, options: [{ value: "compact", label: "Small" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" }, { value: "full", label: "Full width" }] },
  { name: "contentSpacing", label: "Content spacing", type: "select", localized: false, options: [{ value: "compact", label: "Compact" }, { value: "normal", label: "Normal" }, { value: "relaxed", label: "Relaxed" }] },
  { name: "hiddenProfileNames", label: "Hide profile cards (one exact name per line)", type: "list", localized: false },
];

const cleanSourceLabel = (value) => String(value || "").replace(/^Section:\s*/i, "").trim();

const sourceLabel = (block) => {
  const ownLabel = [block?.heading, block?.value, block?.label].map(cleanSourceLabel).find((label) => label && label.length <= 80);
  if (ownLabel) return ownLabel;
  const childLabel = (block?.children || []).find((child) => child?.label)?.label || "";
  return childLabel.split(/\s*(?:\u2192|->)\s*/u)[0].trim() || block?.heading || block?.label || "Section";
};

const titleOf = (page) => page?.dataEn?.title || page?.entryKey || "Untitled division";
const isPeopleSection = (label) => /scientific manpower|वैज्ञानिक जनशक्ति/iu.test(label);

const visibleRows = (block) => (block?.children || []).filter((child) => !child.hidden);

const matchingBlockIndex = (data, referenceBlock, fallbackIndex) => {
  const blocks = data?.blocks || [];
  const referenceKeys = new Set((referenceBlock?.children || []).map((child) => child.key).filter(Boolean));
  if (referenceKeys.size) {
    let bestIndex = -1;
    let bestScore = 0;
    blocks.forEach((block, index) => {
      const score = (block.children || []).reduce((count, child) => count + (referenceKeys.has(child.key) ? 1 : 0), 0);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });
    if (bestIndex >= 0) return bestIndex;
  }
  return fallbackIndex < blocks.length ? fallbackIndex : -1;
};

export default function DivisionContentWorkspace({ pages, workspaceKind = "divisions", sectionFilter, onSave, onClose, onOpenPeople, notify }) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(null);
  const [sectionIndex, setSectionIndex] = useState(null);
  const [language, setLanguage] = useState("en");
  const [rowSearch, setRowSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredPages = useMemo(() => pages.filter((page) => `${titleOf(page)} ${page.entryKey}`.toLowerCase().includes(search.toLowerCase())), [pages, search]);
  const englishBlocks = draft?.dataEn?.blocks || [];
  const visibleSectionBlocks = englishBlocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => !sectionFilter || sectionFilter(block));
  const currentData = language === "hi" ? draft?.dataHi : draft?.dataEn;
  const blockSectionIndex = Number.isInteger(sectionIndex) ? sectionIndex : -1;
  const englishBlock = englishBlocks[blockSectionIndex];
  const currentBlockIndex = language === "hi" ? matchingBlockIndex(currentData, englishBlock, blockSectionIndex) : blockSectionIndex;
  const currentBlock = currentData?.blocks?.[currentBlockIndex];
  const label = sourceLabel(currentBlock || englishBlock);
  const rows = visibleRows(currentBlock);
  const sharedAssets = englishBlock?.assets || [];
  const sharedAssetSources = new Set(sharedAssets.map((asset) => `${asset.kind || "asset"}\u0000${asset.sourceValue || asset.value || asset.key}`));
  const localizedOnlyAssets = language === "hi"
    ? (currentBlock?.assets || []).filter((asset) => !sharedAssetSources.has(`${asset.kind || "asset"}\u0000${asset.sourceValue || asset.value || asset.key}`))
    : [];
  const filteredRows = rows.filter((child) => `${child.label || ""} ${child.value || ""}`.toLowerCase().includes(rowSearch.toLowerCase()));
  const removedCount = (currentBlock?.children || []).filter((child) => child.hidden).length;
  const numbered = currentBlock?.editorMode === "numbered_list" || /research|paper|report|project|publication|software|programme|शोध|रिपोर्ट|परियोजना|प्रकाशन/iu.test(label);
  const itemName = workspaceKind === "facilities" ? "facility" : workspaceKind === "about-us" ? "page" : workspaceKind === "academics" ? "training page" : "division";
  const searchPlaceholder = workspaceKind === "facilities" ? "Search laboratory, library, hostel..." : workspaceKind === "about-us" ? "Search chairman, vision, organisation..." : workspaceKind === "academics" ? "Search training or academics..." : "Search Computer Image, Agriculture, Training...";

  const openPage = (page) => {
    setDraft(structuredClone(page));
    setSectionIndex(null);
    setLanguage("en");
    setRowSearch("");
  };

  const updateLanguageBlocks = (updater) => setDraft((current) => {
    const target = language === "hi" ? "dataHi" : "dataEn";
    const data = structuredClone(current[target] || {});
    const fallbackBlocks = structuredClone(current.dataEn?.blocks || []);
    data.blocks = Array.isArray(data.blocks) ? data.blocks : fallbackBlocks.map((block) => ({ ...block, children: (block.children || []).map((child) => ({ ...child, value: "" })) }));
    const targetIndex = target === "dataHi" ? matchingBlockIndex(data, fallbackBlocks[sectionIndex], sectionIndex) : sectionIndex;
    const safeIndex = targetIndex >= 0 ? targetIndex : sectionIndex;
    data.blocks[safeIndex] = updater(data.blocks[safeIndex] || structuredClone(fallbackBlocks[sectionIndex] || {}));
    return { ...current, [target]: data };
  });

  const updateRow = (key, value) => updateLanguageBlocks((block) => ({
    ...block,
    children: (block.children || []).map((child) => child.key === key ? { ...child, value } : child),
  }));

  const updateBothLanguages = (updater) => setDraft((current) => {
    const next = structuredClone(current);
    const baseBlocks = structuredClone(current.dataEn?.blocks || []);
    for (const target of ["dataEn", "dataHi"]) {
      next[target] ||= {};
      next[target].blocks = Array.isArray(next[target].blocks) ? next[target].blocks : baseBlocks.map((block) => ({ ...block, children: (block.children || []).map((child) => ({ ...child, value: "" })) }));
      const targetIndex = target === "dataHi" ? matchingBlockIndex(next[target], baseBlocks[sectionIndex], sectionIndex) : sectionIndex;
      const safeIndex = targetIndex >= 0 ? targetIndex : sectionIndex;
      next[target].blocks[safeIndex] = updater(next[target].blocks[safeIndex] || structuredClone(baseBlocks[sectionIndex] || {}), target);
    }
    return next;
  });

  const addAtTop = () => {
    const key = `cms-${crypto.randomUUID()}`;
    updateBothLanguages((block, target) => ({
      ...block,
      children: [{
        key,
        label: `${sourceLabel(block)} -> New item`,
        value: "",
        isNew: true,
        language: target === "dataHi" ? "hi" : "en",
      }, ...(block.children || [])],
    }));
  };

  const removeRow = (key) => updateBothLanguages((block) => ({
    ...block,
    children: (block.children || []).flatMap((child) => {
      if (child.key !== key) return [child];
      return child.isNew || String(child.key || "").startsWith("cms-") ? [] : [{ ...child, hidden: true }];
    }),
  }));

  const restoreRows = () => updateBothLanguages((block) => ({
    ...block,
    children: (block.children || []).map((child) => ({ ...child, hidden: false })),
  }));

  const updatePageField = (field, value) => setDraft((current) => {
    const target = field.localized === false || language === "en" ? "dataEn" : "dataHi";
    return { ...current, [target]: { ...(current[target] || {}), [field.name]: value } };
  });

  const updateSectionHeading = (value) => updateLanguageBlocks((block) => ({ ...block, value }));

  const updateBlockAssets = (target, assets) => setDraft((current) => {
    const next = structuredClone(current);
    const targetData = target === "hi" ? "dataHi" : "dataEn";
    const referenceBlocks = next.dataEn?.blocks || [];
    next[targetData] ||= {};
    next[targetData].blocks = Array.isArray(next[targetData].blocks) ? next[targetData].blocks : [];
    const targetIndex = target === "hi"
      ? matchingBlockIndex(next[targetData], referenceBlocks[blockSectionIndex], blockSectionIndex)
      : blockSectionIndex;
    if (targetIndex < 0) return current;
    next[targetData].blocks[targetIndex] = {
      ...(next[targetData].blocks[targetIndex] || structuredClone(referenceBlocks[blockSectionIndex] || {})),
      assets,
    };
    return next;
  });
  const updateLocalizedOnlyAssets = (assets) => {
    const retainedSharedAssets = (currentBlock?.assets || []).filter((asset) =>
      sharedAssetSources.has(`${asset.kind || "asset"}\u0000${asset.sourceValue || asset.value || asset.key}`)
    );
    updateBlockAssets("hi", [...retainedSharedAssets, ...assets]);
  };

  const save = async () => {
    setBusy(true);
    try {
      const saved = await onSave(draft);
      setDraft(structuredClone(saved));
      notify("Published content saved. Website refreshes automatically within 2 seconds.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!draft) {
    return (
      <section className="division-workspace">
        <div className="division-workspace-head"><div><span>Step 1 of 3</span><h2>Choose a {itemName}</h2><p>No page HTML. Choose the {itemName} whose content you want to change.</p></div><button className="secondary" onClick={onClose}><ArrowLeft /> Collections</button></div>
        <label className="workspace-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} /></label>
        <div className="workspace-card-grid">{filteredPages.map((page) => <button type="button" className="workspace-card" key={page.id} onClick={() => openPage(page)}><strong>{titleOf(page)}</strong><span>Open sections</span></button>)}</div>
      </section>
    );
  }

  if (sectionIndex === null) {
    return (
      <section className="division-workspace">
        <div className="division-workspace-head"><div><span>Step 2 of 3</span><h2>{titleOf(draft)}</h2><p>Choose only the section you need. Other sections stay closed.</p></div><button className="secondary" onClick={() => setDraft(null)}><ArrowLeft /> {workspaceKind === "divisions" ? "Divisions" : "Pages"}</button></div>
        <div className="workspace-card-grid workspace-section-grid"><button type="button" className="workspace-card" onClick={() => { setSectionIndex("page-details"); setRowSearch(""); }}><strong>Page heading and layout</strong><span>Edit the title, image, text size, width, and spacing</span></button>{visibleSectionBlocks.map(({ block, index }) => {
          const sectionLabel = sourceLabel(block);
          const count = visibleRows(block).length;
          const mediaCount = (block.assets || []).filter((asset) => !asset.hidden).length;
          return <button type="button" className="workspace-card" key={block.id || `${sectionLabel}-${index}`} onClick={() => { setSectionIndex(index); setRowSearch(""); }}><strong>{sectionLabel}</strong><span>{isPeopleSection(sectionLabel) ? "Open people controls" : `${count} text ${count === 1 ? "row" : "rows"}${mediaCount ? `, ${mediaCount} media` : ""}`}</span></button>;
        })}</div>
      </section>
    );
  }

  if (sectionIndex === "page-details") {
    return (
      <section className="division-workspace division-workspace-editor">
        <div className="division-workspace-head workspace-sticky-head"><div><span>Step 3 of 3 · {titleOf(draft)}</span><h2>Page heading and layout</h2><p>Edit heading, introduction, media, sizing, or hide an unwanted repeated profile card by its exact visible name.</p></div><div className="workspace-head-actions"><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button><button className="primary" disabled={busy} onClick={save}><Save /> {busy ? "Saving..." : "Save"}</button></div></div>
        <div className="workspace-language-tabs" role="tablist" aria-label="Editing language"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}><Languages /> English</button><button className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}><Languages /> हिन्दी</button></div>
        <p className="workspace-language-note">{language === "hi" ? "Edit the approved Hindi heading and introduction here. The featured image is shared with English." : "Edit the English heading and introduction here. The featured image is shared with Hindi."}</p>
        <div className="editor-fields">
          {pageFields.map((field) => {
            const target = field.localized === false || language === "en" ? draft.dataEn : draft.dataHi;
            return <label className={`field-row field-${field.type}`} key={field.name}><span>{field.label}{field.required && " *"}{field.localized === false && <small>Shared by both languages</small>}</span><FieldInput field={field} value={target?.[field.name]} onChange={(value) => updatePageField(field, value)} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></label>;
          })}
        </div>
      </section>
    );
  }

  if (isPeopleSection(label)) {
    return (
      <section className="division-workspace">
        <div className="division-workspace-head"><div><span>Step 3 of 3</span><h2>{label}</h2><p>Names, roles, profile details, and photographs use one dedicated collection.</p></div><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button></div>
        <div className="workspace-reference"><UserRound /><h3>Scientists / Officials / Staff</h3><p>Open the people collection to add, edit, remove, reorder, or replace profile photographs without breaking cards.</p><button className="primary" onClick={onOpenPeople}>Open people collection</button></div>
      </section>
    );
  }

  return (
    <section className="division-workspace division-workspace-editor">
      <div className="division-workspace-head workspace-sticky-head"><div><span>Step 3 of 3 · {titleOf(draft)}</span><h2>{label}</h2><p>{numbered ? "New items appear first and become number 1." : "Edit one website line at a time."}</p></div><div className="workspace-head-actions"><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button><button className="primary" disabled={busy} onClick={save}><Save /> {busy ? "Saving..." : "Save"}</button></div></div>
      <div className="workspace-language-tabs" role="tablist" aria-label="Editing language"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}><Languages /> English</button><button className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}><Languages /> हिन्दी</button></div>
      <div className="workspace-editor-toolbar"><button className="primary" onClick={addAtTop}><Plus /> {numbered ? "Add item at top" : "Add line at top"}</button><label><Search /><input value={rowSearch} onChange={(event) => setRowSearch(event.target.value)} placeholder={`Search ${rows.length} rows`} /></label></div>
      <p className="workspace-language-note">{language === "hi" ? "Enter approved Hindi manually. Blank Hindi never copies English." : "Edit the official English version. Switch to Hindi before Save and enter Hindi separately."}</p>
      {currentBlock?.controlsSectionLabel !== false && typeof currentBlock?.value === "string" && <label className="field-row"><span>Section heading</span><input value={currentBlock.value} onChange={(event) => updateSectionHeading(event.target.value)} /></label>}
      <div className="workspace-row-list">
        {filteredRows.map((child) => {
          const number = rows.findIndex((row) => row.key === child.key) + 1;
          const fieldLabel = numbered
            ? child.groupLabel
              ? `${child.groupLabel} - Item ${number}`
              : `Item ${number}`
            : String(child.label || `Line ${number}`).split(/\s*(?:\u2192|->)\s*/u).slice(1).join(" -> ") || `Line ${number}`;
          return <label className="workspace-row" key={child.key}><span className="workspace-row-number">{number}</span><span><strong>{fieldLabel}</strong><textarea rows="3" value={child.value || ""} onChange={(event) => updateRow(child.key, event.target.value)} /></span><button type="button" className="danger-icon" title={`Remove ${fieldLabel}`} onClick={() => removeRow(child.key)}><Trash2 /></button></label>;
        })}
        {!filteredRows.length && <div className="empty-panel">No matching rows. Use Add at top.</div>}
      </div>
      {removedCount > 0 && <button className="secondary workspace-restore" onClick={restoreRows}><Undo2 /> Restore {removedCount} removed {removedCount === 1 ? "row" : "rows"}</button>}
      <ImportedAssetEditor assets={sharedAssets} onChange={(assets) => updateBlockAssets("en", assets)} onBusy={setBusy} onError={(message) => notify(message, "error")} />
      {localizedOnlyAssets.length > 0 && <><p className="workspace-language-note">These links or files exist only in the Hindi source.</p><ImportedAssetEditor assets={localizedOnlyAssets} onChange={updateLocalizedOnlyAssets} onBusy={setBusy} onError={(message) => notify(message, "error")} /></>}
    </section>
  );
}
