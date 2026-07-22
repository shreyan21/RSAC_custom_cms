import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Languages, Save, Search, UserRound } from "lucide-react";
import FieldInput from "./FieldInput";
import ImportedAssetEditor from "./ImportedAssetEditor";
import SectionRichTextEditor from "./SectionRichTextEditor";
import SectionItemManager from "./SectionItemManager";
import { pageCardIconOptions } from "../../shared/cmsCollections";
import useLivePreview from "./useLivePreview";
import {
  createLocalizedDivisionBlock,
  findLocalizedDivisionBlockIndex,
} from "../../src/data/divisionSectionLabels";

const pageFields = [
  { name: "title", label: "Main page heading", type: "text", localized: true, required: true },
  { name: "eyebrow", label: "Small heading", type: "text", localized: true },
  { name: "summary", label: "Page introduction", type: "textarea", localized: true },
  { name: "featuredImage", label: "Featured image", type: "media", localized: false },
  { name: "cardIcon", label: "Index card icon", type: "select", localized: false, options: pageCardIconOptions },
  { name: "cardColor", label: "Index card primary colour", type: "color", localized: false },
  { name: "cardColor2", label: "Index card secondary colour", type: "color", localized: false },
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
const isPeopleSection = (block) => /scientific manpower|वैज्ञानिक जनशक्ति/iu.test(
  `${block?.sourceLabel || ""} ${block?.value || ""} ${block?.label || ""}`
);

const controlsVisibleSectionLabel = (block) =>
  block?.controlsSectionLabel !== false || block?.assetOnly === true;

const ensureLocalizedBlock = (data, referenceBlock, fallbackIndex) => {
  let index = findLocalizedDivisionBlockIndex(data, referenceBlock, fallbackIndex);
  if (index >= 0) return index;
  data.blocks ||= [];
  data.blocks.push(createLocalizedDivisionBlock(referenceBlock));
  index = data.blocks.length - 1;
  return index;
};

const localizedAssetFields = ["alt", "title", "caption", "text"];
const assetIdentity = (asset) => String(
  asset?.key || `${asset?.kind || "asset"}\u0000${asset?.sourceValue || asset?.value || ""}`
);
const assetMetadata = (asset) => Object.fromEntries(
  localizedAssetFields.map((field) => [field, String(asset?.[field] || "")])
);
const assetStructure = (asset) => {
  const next = { ...(asset || {}) };
  localizedAssetFields.forEach((field) => delete next[field]);
  return next;
};
const findAsset = (assets, asset) => {
  const identity = assetIdentity(asset);
  return (assets || []).find((candidate) => assetIdentity(candidate) === identity);
};
const mergeSharedAssetLists = (englishAssets, hindiAssets) => {
  const merged = [...(englishAssets || [])];
  const identities = new Set(merged.map(assetIdentity));
  (hindiAssets || []).forEach((asset) => {
    const identity = assetIdentity(asset);
    if (!identities.has(identity)) {
      merged.push(asset);
      identities.add(identity);
    }
  });
  return merged;
};
const assetsForLanguage = (sharedAssets, localizedAssets) => sharedAssets.map((asset) => ({
  ...assetStructure(asset),
  ...assetMetadata(findAsset(localizedAssets, asset)),
}));
const synchronizeAssets = (editedAssets, storedAssets, useEditedMetadata) => editedAssets.map((asset) => ({
  ...assetStructure(asset),
  ...assetMetadata(useEditedMetadata ? asset : findAsset(storedAssets, asset)),
}));

const sectionLabelForReference = (block, referenceBlock) => {
  return sourceLabel(block || referenceBlock);
};

const contentTextLength = (block) => String(block?.contentHtml || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/giu, " ")
  .replace(/\s+/g, " ")
  .trim().length;

export default function DivisionContentWorkspace({ pages, workspaceKind = "divisions", sectionFilter, onSave, onClose, onOpenPeople, notify }) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(null);
  const [sectionIndex, setSectionIndex] = useState(null);
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const richEditorRef = useRef(null);
  const { openPreview } = useLivePreview({ collection: "pages", draft, language, notify });

  const filteredPages = useMemo(() => pages.filter((page) => `${titleOf(page)} ${page.entryKey}`.toLowerCase().includes(search.toLowerCase())), [pages, search]);
  const englishBlocks = draft?.dataEn?.blocks || [];
  const visibleSectionBlocks = englishBlocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => !sectionFilter || sectionFilter(block));
  const currentData = language === "hi" ? draft?.dataHi : draft?.dataEn;
  const blockSectionIndex = Number.isInteger(sectionIndex) ? sectionIndex : -1;
  const englishBlock = englishBlocks[blockSectionIndex];
  const currentBlockIndex = language === "hi" ? findLocalizedDivisionBlockIndex(currentData, englishBlock, blockSectionIndex) : blockSectionIndex;
  const currentBlock = currentData?.blocks?.[currentBlockIndex]
    || (language === "hi" && englishBlock ? createLocalizedDivisionBlock(englishBlock) : undefined);
  const label = sectionLabelForReference(currentBlock, englishBlock);
  const hindiBlockIndex = draft?.dataHi && englishBlock
    ? findLocalizedDivisionBlockIndex(draft.dataHi, englishBlock, blockSectionIndex)
    : -1;
  const hindiBlock = hindiBlockIndex >= 0 ? draft?.dataHi?.blocks?.[hindiBlockIndex] : null;
  const englishAssets = englishBlock?.assets || [];
  const hindiAssets = hindiBlock?.assets || [];
  const sharedAssets = mergeSharedAssetLists(englishAssets, hindiAssets);
  const editorAssets = assetsForLanguage(
    sharedAssets,
    language === "hi" ? hindiAssets : englishAssets
  );
  const itemName = workspaceKind === "facilities" ? "facility" : workspaceKind === "about-us" ? "page" : workspaceKind === "academics" ? "training page" : "division";
  const searchPlaceholder = workspaceKind === "facilities" ? "Search laboratory, library, hostel..." : workspaceKind === "about-us" ? "Search chairman, vision, organisation..." : workspaceKind === "academics" ? "Search training or academics..." : "Search Computer Image, Agriculture, Training...";

  const openPage = (page) => {
    setDraft(structuredClone(page));
    setSectionIndex(null);
    setLanguage("en");
  };

  const updateLanguageBlocks = (updater) => setDraft((current) => {
    const target = language === "hi" ? "dataHi" : "dataEn";
    const data = structuredClone(current[target] || {});
    const fallbackBlocks = structuredClone(current.dataEn?.blocks || []);
    data.blocks = Array.isArray(data.blocks) ? data.blocks : [];
    const targetIndex = target === "dataHi"
      ? ensureLocalizedBlock(data, fallbackBlocks[sectionIndex], sectionIndex)
      : sectionIndex;
    data.blocks[targetIndex] = updater(data.blocks[targetIndex] || createLocalizedDivisionBlock(fallbackBlocks[sectionIndex], language));
    return { ...current, [target]: data };
  });

  const toggleSectionVisibility = () => updateLanguageBlocks((block) => ({
    ...block,
    hidden: !block.hidden,
  }));

  const updatePageField = (field, value) => setDraft((current) => {
    const target = field.localized === false || language === "en" ? "dataEn" : "dataHi";
    return { ...current, [target]: { ...(current[target] || {}), [field.name]: value } };
  });

  const updateSectionHeading = (value) => updateLanguageBlocks((block) => ({ ...block, value }));
  const updateSectionContent = (contentHtml) => updateLanguageBlocks((block) => ({
    ...block,
    contentHtml,
  }));

  const updateSectionAssets = (assets) => setDraft((current) => {
    const next = structuredClone(current);
    const referenceBlocks = next.dataEn?.blocks || [];
    if (blockSectionIndex < 0 || !referenceBlocks[blockSectionIndex]) return current;
    next.dataHi ||= {};
    next.dataHi.blocks = Array.isArray(next.dataHi.blocks) ? next.dataHi.blocks : [];
    const localizedIndex = ensureLocalizedBlock(next.dataHi, referenceBlocks[blockSectionIndex], blockSectionIndex);
    const storedEnglishAssets = referenceBlocks[blockSectionIndex]?.assets || [];
    const storedHindiAssets = next.dataHi.blocks[localizedIndex]?.assets || [];
    next.dataEn.blocks[blockSectionIndex] = {
      ...next.dataEn.blocks[blockSectionIndex],
      assets: synchronizeAssets(assets, storedEnglishAssets, language === "en"),
    };
    next.dataHi.blocks[localizedIndex] = {
      ...next.dataHi.blocks[localizedIndex],
      assets: synchronizeAssets(assets, storedHindiAssets, language === "hi"),
    };
    return next;
  });

  const save = async () => {
    setBusy(true);
    try {
      const saved = await onSave(draft);
      setDraft(structuredClone(saved));
      notify("Published content saved. Open website tabs are updating now.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    setBusy(true);
    try {
      await openPreview();
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
        <div className="division-workspace-head"><div><span>Step 2 of 3</span><h2>{titleOf(draft)}</h2><p>Choose one section. Each section has one complete editor per language.</p></div><button className="secondary" onClick={() => setDraft(null)}><ArrowLeft /> {workspaceKind === "divisions" ? "Divisions" : "Pages"}</button></div>
        <div className="workspace-card-grid workspace-section-grid"><button type="button" className="workspace-card" onClick={() => setSectionIndex("page-details")}><strong>Page heading and layout</strong><span>Edit the title, index image and card, text size, width, and spacing</span></button>{visibleSectionBlocks.map(({ block, index }) => {
          const sectionLabel = sourceLabel(block);
          const localizedIndex = findLocalizedDivisionBlockIndex(draft.dataHi, block, index);
          const localizedBlock = localizedIndex >= 0 ? draft.dataHi?.blocks?.[localizedIndex] : null;
          const mediaCount = (block.assets || []).filter((asset) => !asset.hidden).length;
          const status = isPeopleSection(block) ? "Open people controls" : `${contentTextLength(block) ? "English ready" : "English blank"} | ${contentTextLength(localizedBlock) ? "Hindi ready" : "Hindi blank"}${mediaCount ? ` | ${mediaCount} media` : ""}`;
          return <button type="button" className="workspace-card" key={block.id || `${sectionLabel}-${index}`} onClick={() => setSectionIndex(index)}><strong>{sectionLabel}</strong><span>{status}</span></button>;
        })}</div>
      </section>
    );
  }

  if (sectionIndex === "page-details") {
    return (
      <section className="division-workspace division-workspace-editor">
        <div className="division-workspace-head workspace-sticky-head"><div><span>Step 3 of 3 · {titleOf(draft)}</span><h2>Page heading and layout</h2><p>Edit heading, introduction, media, sizing, or hide an unwanted repeated profile card by its exact visible name.</p></div><div className="workspace-head-actions"><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button><button className="secondary" disabled={busy} onClick={preview}><Eye /> Preview {language === "hi" ? "हिन्दी" : "English"}</button><button className="primary" disabled={busy} onClick={save}><Save /> {busy ? "Saving..." : "Save"}</button></div></div>
        <div className="workspace-language-tabs" role="tablist" aria-label="Editing language"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}><Languages /> English</button><button className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}><Languages /> हिन्दी</button></div>
        <p className="workspace-language-note">{language === "hi" ? "Edit the approved Hindi heading and introduction here. The featured image is shared with English." : "Edit the English heading and introduction here. The featured image is shared with Hindi."}</p>
        <div className="editor-fields">
          {pageFields.map((field) => {
            const target = field.localized === false || language === "en" ? draft.dataEn : draft.dataHi;
            return <label className={`field-row field-${field.type}`} key={field.name}><span>{field.label}{field.required && " *"}{field.localized === false && <small>Shared by both languages</small>}</span>{language === "hi" && field.localized !== false && draft.dataEn?.[field.name] && <small className="english-field-reference">English: {draft.dataEn[field.name]}</small>}<FieldInput field={field} value={target?.[field.name]} referenceValue={language === "hi" ? draft.dataEn?.[field.name] : undefined} language={language} pageData={target} referencePageData={draft.dataEn} onChange={(value) => updatePageField(field, value)} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></label>;
          })}
        </div>
      </section>
    );
  }

  if (isPeopleSection(englishBlock)) {
    return (
      <section className="division-workspace">
        <div className="division-workspace-head"><div><span>Step 3 of 3</span><h2>{label}</h2><p>Names, roles, profile details, and photographs use one dedicated collection.</p></div><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button></div>
        <div className="workspace-reference"><UserRound /><h3>Scientists / Officials / Staff</h3><p>Open the people collection to add, edit, remove, reorder, or replace profile photographs without breaking cards.</p><button className="primary" onClick={onOpenPeople}>Open people collection</button></div>
      </section>
    );
  }

  return (
    <section className="division-workspace division-workspace-editor">
      <div className="division-workspace-head workspace-sticky-head"><div><span>Step 3 of 3 · {titleOf(draft)}</span><h2>{label}</h2><p>Write the complete section here. Press Enter for another paragraph; no extra blocks are needed.</p></div><div className="workspace-head-actions"><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button><button className="secondary" disabled={busy} onClick={preview}><Eye /> Preview {language === "hi" ? "हिन्दी" : "English"}</button><button className="primary" disabled={busy} onClick={save}><Save /> {busy ? "Saving..." : "Save"}</button></div></div>
      <div className="workspace-language-tabs" role="tablist" aria-label="Editing language"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}><Languages /> English</button><button className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}><Languages /> हिन्दी</button></div>
      <div className="workspace-editor-toolbar"><button className="secondary" type="button" onClick={toggleSectionVisibility}>{currentBlock?.hidden ? <Eye /> : <EyeOff />} {currentBlock?.hidden ? "Show section" : "Hide section"} in {language === "hi" ? "Hindi" : "English"}</button></div>
      <p className="workspace-language-note">{language === "hi" ? "Enter approved Hindi manually. Blank Hindi never copies English." : "Edit the official English version. Switch to Hindi before Save and enter Hindi separately."}</p>
      {currentBlock?.hidden && <p className="workspace-language-note workspace-language-note--hidden">This section is hidden only in {language === "hi" ? "Hindi" : "English"}. Other language remains unchanged.</p>}
      {controlsVisibleSectionLabel(currentBlock) && <label className="field-row"><span>Section heading</span>{language === "hi" && englishBlock?.value && <small className="english-field-reference">English: {englishBlock.value}</small>}<input value={typeof currentBlock?.value === "string" ? currentBlock.value : ""} onChange={(event) => updateSectionHeading(event.target.value)} /></label>}
      <SectionItemManager
        html={String(currentBlock?.contentHtml || "")}
        label={label}
        editorMode={currentBlock?.editorMode}
        onChange={updateSectionContent}
        onFocusItem={(index) => window.setTimeout(() => richEditorRef.current?.focusListItem(index), 0)}
      />
      <SectionRichTextEditor
        ref={richEditorRef}
        key={`${draft.id}-${blockSectionIndex}-${language}`}
        ariaLabel={`${language === "hi" ? "Hindi" : "English"} ${label} content`}
        value={String(currentBlock?.contentHtml || "")}
        onChange={updateSectionContent}
      />
      <ImportedAssetEditor assets={editorAssets} language={language} onChange={updateSectionAssets} onBusy={setBusy} onError={(message) => notify(message, "error")} />
    </section>
  );
}
