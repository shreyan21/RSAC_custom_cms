import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Languages, Plus, Save, Search, Trash2, UserRound } from "lucide-react";
import FieldInput from "./FieldInput";
import { usesCompositeFieldContainer } from "./fieldContainer";
import ImportedAssetEditor from "./ImportedAssetEditor";
import { ImportedContentFields } from "./BlockEditor";
import SectionRichTextEditor from "./SectionRichTextEditor";
import SectionItemManager from "./SectionItemManager";
import { reorderDivisionPageSections } from "./divisionSectionOrder";
import { fieldHelpText } from "./fieldHelpText";
import { pageCardIconOptions } from "../../shared/cmsCollections";
import useLivePreview from "./useLivePreview";
import { mediaPreviewUrl } from "./api";
import {
  createLocalizedDivisionBlock,
  findLocalizedDivisionBlockIndex,
} from "../../src/data/divisionSectionLabels";
import {
  findProfileSectionContent,
  profileSectionContentKey,
} from "../../shared/profileSectionContent";

const typographySizeOptions = [
  { value: "tiny", label: "Extra small" },
  { value: "compact", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra large" },
];

const typographyFontOptions = [
  { value: "Inter", label: "Inter - Clean and modern" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans - Friendly and modern" },
  { value: "System Sans", label: "System Sans - Simple" },
  { value: "System Serif", label: "System Serif - Traditional" },
];

const pageFields = [
  { name: "title", label: "Main page heading", type: "text", localized: true, required: true },
  { name: "eyebrow", label: "Small heading", type: "text", localized: true },
  { name: "summary", label: "Page introduction", type: "textarea", localized: true },
  { name: "featuredImage", label: "Featured image", type: "media", localized: false },
  { name: "cardIcon", label: "Index card icon", type: "select", localized: false, options: pageCardIconOptions },
  { name: "cardColor", label: "Index card primary colour", type: "color", localized: false },
  { name: "cardColor2", label: "Index card secondary colour", type: "color", localized: false },
  { name: "eyebrowSize", label: "Small heading size", type: "select", localized: false, options: typographySizeOptions },
  { name: "headingSize", label: "Page heading size", type: "select", localized: false, options: typographySizeOptions },
  { name: "contentSize", label: "Body text size", type: "select", localized: false, options: typographySizeOptions },
  { name: "pageFont", label: "Page font family", type: "select", localized: false, options: typographyFontOptions },
  { name: "headingFont", label: "Heading font family", type: "select", localized: false, options: typographyFontOptions },
  { name: "bodyFontSize", label: "Exact body font size (13-22 px, optional)", type: "number", localized: false },
  { name: "headingFontSize", label: "Exact main heading size (24-72 px, optional)", type: "number", localized: false },
  { name: "eyebrowFontSize", label: "Exact small heading size (11-28 px, optional)", type: "number", localized: false },
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

const peoplePageTitles = {
  "our-chairman's-governing-body": "Former Chairmen, Governing Body",
  "director's": "Former Directors",
  "our-former": "Former Scientists",
  "scientific-manpower": "Scientific Manpower",
};
const titleOf = (page) => peoplePageTitles[page?.entryKey] || page?.dataEn?.title || page?.entryKey || "Untitled division";
const orderOf = (page) => Number.isFinite(Number(page?.sortOrder)) ? Number(page.sortOrder) : 0;
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

const usesImportedRows = (usesCanonicalSections, block) =>
  !usesCanonicalSections && Array.isArray(block?.children);

const contentTextLength = (usesCanonicalSections, block) => {
  const richTextLength = String(block?.contentHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/\s+/g, " ")
    .trim().length;
  if (richTextLength || !usesImportedRows(usesCanonicalSections, block)) return richTextLength;
  return (block.children || [])
    .filter((child) => !child?.hidden && child?.editorVisible !== false && !child?.structural)
    .map((child) => String(child?.value || "").trim())
    .join(" ")
    .length;
};

const normalizePlacement = (value) => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/&amp;|&/g, " and ")
  .replace(/\b(?:and|amp|division|department|section|studies)\b/g, " ")
  .replace(/\bresources?\b/g, "resource")
  .replace(/[^a-z0-9\p{Script=Devanagari}]+/gu, "");

const profileBelongsToPage = (entry, page) => {
  const data = entry?.dataEn || {};
  if (data.profileType !== "scientist") return false;
  const pageKeys = [page?.dataEn?.title, page?.dataEn?.slug, page?.entryKey]
    .map(normalizePlacement)
    .filter((value) => value.length >= 8);
  const profileKeys = [data.deployment, data.department]
    .map(normalizePlacement)
    .filter(Boolean);
  return pageKeys.some((pageKey) => profileKeys.some((profileKey) =>
    pageKey.includes(profileKey) || profileKey.includes(pageKey)
  ));
};

const profileContentIdentity = (entry) => ({
  employeeId: entry?.dataEn?.employeeId,
  name: entry?.dataEn?.name || entry?.entryKey,
});

const isCmsCreatedSection = (block) => String(block?.id || "").startsWith("cms-section-");

export default function DivisionContentWorkspace({ pages, profiles = [], workspaceKind = "divisions", sectionFilter, onSave, onClose, onOpenPeople, notify }) {
  const [search, setSearch] = useState("");
  const [draft, setDraftState] = useState(null);
  const draftRef = useRef(null);
  const [sectionIndex, setSectionIndex] = useState(null);
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const richEditorRef = useRef(null);
  const { openPreview } = useLivePreview({ collection: "pages", draft, language, notify });

  const setDraft = (updater) => {
    const next = typeof updater === "function" ? updater(draftRef.current) : updater;
    draftRef.current = next;
    setDraftState(next);
    return next;
  };

  const filteredPages = useMemo(() => pages
    .filter((page) => `${titleOf(page)} ${page.entryKey}`.toLowerCase().includes(search.toLowerCase()))
    .sort((left, right) => orderOf(left) - orderOf(right) || titleOf(left).localeCompare(titleOf(right))), [pages, search]);
  const englishBlocks = draft?.dataEn?.blocks || [];
  const usesCanonicalSections = englishBlocks.some((block) =>
    block && Object.hasOwn(block, "contentHtml")
  );
  const visibleSectionBlocks = englishBlocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => !sectionFilter || sectionFilter(block));
  const currentData = language === "hi" ? draft?.dataHi : draft?.dataEn;
  const blockSectionIndex = Number.isInteger(sectionIndex) ? sectionIndex : -1;
  const englishBlock = englishBlocks[blockSectionIndex];
  const currentBlockIndex = language === "hi" ? findLocalizedDivisionBlockIndex(currentData, englishBlock, blockSectionIndex) : blockSectionIndex;
  const currentBlock = currentData?.blocks?.[currentBlockIndex]
    || (language === "hi" && englishBlock ? createLocalizedDivisionBlock(englishBlock) : undefined);
  const usesImportedContentEditor = usesImportedRows(usesCanonicalSections, currentBlock);
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
  const itemName = workspaceKind === "facilities" ? "facility" : workspaceKind === "about-us" ? "page" : workspaceKind === "academics" ? "training page" : workspaceKind === "people" ? "people page" : "division";
  const searchPlaceholder = workspaceKind === "facilities" ? "Search laboratory, library, hostel..." : workspaceKind === "about-us" ? "Search chairman, vision, organisation..." : workspaceKind === "academics" ? "Search training or academics..." : workspaceKind === "people" ? "Search Former Chairmen or Former Directors..." : "Search Computer Image, Agriculture, Training...";
  const visibilityLabel = (status) => status === "archived"
    ? "Archived"
    : status === "draft"
      ? "Hidden draft"
      : "Visible";
  const pageProfiles = useMemo(
    () => profiles.filter((profile) => profileBelongsToPage(profile, draft)),
    [profiles, draft]
  );

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

  const updateSectionHeading = (value) => updateLanguageBlocks((block) => ({
    ...block,
    value,
    ...(language === "en" && isCmsCreatedSection(block) ? { label: value, sourceLabel: value } : {}),
  }));
  const updateSectionContent = (contentHtml) => updateLanguageBlocks((block) => ({
    ...block,
    contentHtml,
  }));
  const updateImportedSection = (patch) => updateLanguageBlocks((block) => ({
    ...block,
    ...patch,
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

  const addSection = () => {
    const id = `cms-section-${crypto.randomUUID()}`;
    const englishBlock = {
      id,
      type: "rich_text",
      sourceLabel: "New section",
      value: "New section",
      contentHtml: "",
      assets: [],
      controlsSectionLabel: true,
      language: "en",
    };
    const hindiBlock = {
      ...structuredClone(englishBlock),
      value: "",
      sourceLabel: "New section",
      language: "hi",
    };
    const nextIndex = englishBlocks.length;
    setDraft((current) => ({
      ...current,
      dataEn: {
        ...(current.dataEn || {}),
        blocks: [...(current.dataEn?.blocks || []), englishBlock],
      },
      dataHi: {
        ...(current.dataHi || {}),
        blocks: [...(current.dataHi?.blocks || []), hindiBlock],
      },
    }));
    setLanguage("en");
    setSectionIndex(nextIndex);
  };

  const removeSection = (englishIndex) => {
    const referenceBlock = draft?.dataEn?.blocks?.[englishIndex];
    if (!isCmsCreatedSection(referenceBlock)) return;
    if (!window.confirm(`Remove "${sourceLabel(referenceBlock)}" from both languages?`)) return;
    setDraft((current) => {
      const next = structuredClone(current);
      const localizedIndex = findLocalizedDivisionBlockIndex(next.dataHi, referenceBlock, englishIndex);
      next.dataEn.blocks.splice(englishIndex, 1);
      if (localizedIndex >= 0) next.dataHi?.blocks?.splice(localizedIndex, 1);
      return next;
    });
    setSectionIndex(null);
  };

  const setSectionVisibilityBoth = (englishIndex, hidden) => setDraft((current) => {
    const next = structuredClone(current);
    const referenceBlock = next.dataEn?.blocks?.[englishIndex];
    if (!referenceBlock) return current;
    next.dataEn.blocks[englishIndex] = { ...referenceBlock, hidden };
    next.dataHi ||= {};
    next.dataHi.blocks = Array.isArray(next.dataHi.blocks) ? next.dataHi.blocks : [];
    const localizedIndex = ensureLocalizedBlock(next.dataHi, referenceBlock, englishIndex);
    next.dataHi.blocks[localizedIndex] = {
      ...next.dataHi.blocks[localizedIndex],
      hidden,
    };
    return next;
  });

  const updateProfileSectionContent = (entry, html) => setDraft((current) => {
    const target = language === "hi" ? "dataHi" : "dataEn";
    const next = structuredClone(current);
    next[target] ||= {};
    const targetBlockIndex = language === "hi"
      ? ensureLocalizedBlock(next[target], next.dataEn.blocks[blockSectionIndex], blockSectionIndex)
      : blockSectionIndex;
    const block = next[target].blocks[targetBlockIndex];
    block.children ||= [];
    const key = profileSectionContentKey(profileContentIdentity(entry));
    const childIndex = block.children.findIndex((child) => child?.key === key);
    if (String(html || "").trim()) {
      const child = {
        key,
        label: entry?.dataEn?.name || entry?.entryKey || "Profile",
        value: "",
        richText: html,
        hidden: false,
        isNew: true,
      };
      if (childIndex >= 0) block.children[childIndex] = child;
      else block.children.push(child);
    } else if (childIndex >= 0) {
      block.children.splice(childIndex, 1);
    }
    return next;
  });

  const save = async () => {
    setBusy(true);
    try {
      richEditorRef.current?.flush?.();
      const saved = await onSave(draftRef.current);
      setDraft(structuredClone(saved));
      notify(
        saved.status === "published"
          ? "Published content saved. Open website tabs are updating now."
          : saved.status === "archived"
            ? "Archived. This page is no longer visible on the website."
            : "Saved as a hidden draft. This page is not visible on the website.",
        "success"
      );
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    setBusy(true);
    try {
      richEditorRef.current?.flush?.();
      await openPreview(draftRef.current);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const moveSection = (sourceIndex, direction) => {
    const visibleIndex = visibleSectionBlocks.findIndex(({ index }) => index === sourceIndex);
    const target = visibleSectionBlocks[visibleIndex + direction];
    if (!target) return;
    setDraft((current) => reorderDivisionPageSections(current, sourceIndex, target.index));
  };

  if (!draft) {
    return (
      <section className="division-workspace">
        <div className="division-workspace-head"><div><span>Step 1 of 3</span><h2>Choose a {itemName}</h2><p>Choose the {itemName} whose visible page content you want to change.</p></div><button className="secondary" onClick={onClose}><ArrowLeft /> All website areas</button></div>
        <label className="workspace-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} /></label>
        <div className="workspace-card-grid">{filteredPages.map((page) => <button type="button" className="workspace-card" key={page.id} onClick={() => openPage(page)}><strong>{titleOf(page)}</strong><span className="workspace-card__meta"><span>Order {orderOf(page)} · Open sections</span><span className={`status ${page.status || "published"}`}>{visibilityLabel(page.status)}</span></span></button>)}</div>
      </section>
    );
  }

  if (sectionIndex === null) {
    return (
      <section className="division-workspace">
        <div className="division-workspace-head"><div><span>Step 2 of 3</span><h2>{titleOf(draft)}</h2><p>Choose one section. Each section has one complete editor per language.</p></div><div className="workspace-head-actions"><button className="secondary" onClick={() => setDraft(null)}><ArrowLeft /> {workspaceKind === "divisions" ? "Divisions" : workspaceKind === "people" ? "People pages" : "Pages"}</button><button className="primary" disabled={busy} onClick={save}><Save /> {busy ? "Saving..." : "Save order"}</button></div></div>
        <p className="workspace-order-note">Use the arrow buttons to change the section order on the website. The same order is kept for English and Hindi; select Save order when finished.</p>
        <div className="workspace-card-grid workspace-section-grid"><button type="button" className="workspace-card" onClick={() => setSectionIndex("page-details")}><strong>Page heading and layout</strong><span>Edit the title, display order, index image and card, text size, width, and spacing</span></button>{visibleSectionBlocks.map(({ block, index }) => {
          const sectionLabel = sourceLabel(block);
          const localizedIndex = findLocalizedDivisionBlockIndex(draft.dataHi, block, index);
          const localizedBlock = localizedIndex >= 0 ? draft.dataHi?.blocks?.[localizedIndex] : null;
          const mediaCount = (block.assets || []).filter((asset) => !asset.hidden).length;
          const hiddenBoth = Boolean(block.hidden && localizedBlock?.hidden);
          const status = hiddenBoth
            ? "Hidden in English and Hindi"
            : isPeopleSection(block) ? "Open people controls" : `${contentTextLength(usesCanonicalSections, block) ? "English ready" : "English blank"} | ${contentTextLength(usesCanonicalSections, localizedBlock) ? "Hindi ready" : "Hindi blank"}${mediaCount ? ` | ${mediaCount} media` : ""}`;
          const visibleIndex = visibleSectionBlocks.findIndex((item) => item.index === index);
          return <article className="workspace-card workspace-section-card" key={block.id || index}><button type="button" className="workspace-section-card__open" onClick={() => setSectionIndex(index)}><strong>{sectionLabel}</strong><span>{status}</span></button><div className="workspace-section-card__order"><span>Position {visibleIndex + 1}</span><div className="workspace-order-buttons"><button type="button" disabled={visibleIndex === 0} title={`Move ${sectionLabel} up`} aria-label={`Move ${sectionLabel} up`} onClick={() => moveSection(index, -1)}><ArrowUp /></button><button type="button" disabled={visibleIndex === visibleSectionBlocks.length - 1} title={`Move ${sectionLabel} down`} aria-label={`Move ${sectionLabel} down`} onClick={() => moveSection(index, 1)}><ArrowDown /></button><button type="button" title={`${hiddenBoth ? "Show" : "Hide"} ${sectionLabel} in both languages`} aria-label={`${hiddenBoth ? "Show" : "Hide"} ${sectionLabel} in both languages`} onClick={() => setSectionVisibilityBoth(index, !hiddenBoth)}>{hiddenBoth ? <Eye /> : <EyeOff />}</button>{isCmsCreatedSection(block) && <button type="button" className="danger-icon" title={`Remove ${sectionLabel}`} aria-label={`Remove ${sectionLabel}`} onClick={() => removeSection(index)}><Trash2 /></button>}</div></div></article>;
        })}{!sectionFilter && <button type="button" className="workspace-card workspace-add-section" onClick={addSection}><Plus /><strong>Add a new section</strong><span>Create a responsive section with separate English and Hindi text, media, and visibility.</span></button>}</div>
      </section>
    );
  }

  if (sectionIndex === "page-details") {
    return (
      <section className="division-workspace division-workspace-editor">
        <div className="division-workspace-head workspace-sticky-head"><div><span>Step 3 of 3 · {titleOf(draft)}</span><h2>Page heading and layout</h2><p>{workspaceKind === "divisions" ? "The main heading controls the opened division page. Its directory-card name is edited separately in Divisions." : "Edit the page heading, introduction, media, sizing, and layout."}</p></div><div className="workspace-head-actions"><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button><button className="secondary" disabled={busy} onClick={preview}><Eye /> Preview {language === "hi" ? "हिन्दी" : "English"}</button><button className="primary" disabled={busy} onClick={save}><Save /> {busy ? "Saving..." : "Save"}</button></div></div>
        <div className="workspace-publishing"><label>{itemName.charAt(0).toUpperCase() + itemName.slice(1)} visibility<select value={draft.status || "published"} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="published">Visible on website</option><option value="draft">Hidden draft</option><option value="archived">Archived</option></select></label><label className="display-order-field">Display order<input type="number" step="1" value={draft.sortOrder ?? ""} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value === "" ? "" : Number(event.target.value) }))} /><small>Use 0 first, then 1, 2, 3, and so on.</small></label><div><span className={`status ${draft.status || "published"}`}>{visibilityLabel(draft.status)}</span><p>{draft.status === "published" ? `The ${itemName} is public after Save.` : draft.status === "archived" ? `The ${itemName} stays stored in CMS but is removed from the public website.` : `The ${itemName} stays editable here but is hidden from the public website.`}</p></div></div>
        <div className="workspace-language-tabs" role="tablist" aria-label="Editing language"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}><Languages /> English</button><button className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}><Languages /> हिन्दी</button></div>
        <p className="workspace-language-note">{language === "hi" ? "Edit the approved Hindi heading and introduction here. The featured image is shared with English." : "Edit the English heading and introduction here. The featured image is shared with Hindi."}</p>
        <div className="editor-fields">
          {pageFields.map((field) => {
            const target = field.localized === false || language === "en" ? draft.dataEn : draft.dataHi;
            const FieldContainer = usesCompositeFieldContainer(field) ? "div" : "label";
            return <FieldContainer className={`field-row field-${field.type}${usesCompositeFieldContainer(field) ? " field-row--composite" : ""}`} key={field.name}><span>{field.label}{field.required && " *"}{field.localized === false && <small>Shared by both languages</small>}</span><small className="field-help">{fieldHelpText(field)}</small>{language === "hi" && field.localized !== false && draft.dataEn?.[field.name] && <small className="english-field-reference">English: {draft.dataEn[field.name]}</small>}<FieldInput field={field} value={target?.[field.name]} referenceValue={language === "hi" ? draft.dataEn?.[field.name] : undefined} language={language} pageData={target} referencePageData={draft.dataEn} onChange={(value) => updatePageField(field, value)} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></FieldContainer>;
          })}
        </div>
      </section>
    );
  }

  if (isPeopleSection(englishBlock) && pageProfiles.length) {
    return (
      <section className="division-workspace division-workspace-editor">
        <div className="division-workspace-head workspace-sticky-head"><div><span>Step 3 of 3</span><h2>{label}</h2><p>Shared people details stay consistent everywhere. Optional changes below affect only this {itemName}.</p></div><div className="workspace-head-actions"><button className="secondary" onClick={() => setSectionIndex(null)}><ArrowLeft /> Sections</button><button className="secondary" disabled={busy} onClick={preview}><Eye /> Preview {language === "hi" ? "Hindi" : "English"}</button><button className="primary" disabled={busy} onClick={save}><Save /> {busy ? "Saving..." : "Save"}</button></div></div>
        <div className="workspace-language-tabs" role="tablist" aria-label="Editing language"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}><Languages /> English</button><button className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}><Languages /> Hindi</button></div>
        <p className="workspace-language-note">The photograph and master profile stay shared everywhere. When extra content is entered, it appears left of the photograph on desktop and below it on mobile for this {itemName} only.</p>
        <div className="workspace-reference workspace-reference--wide"><UserRound /><h3>Shared people profiles</h3><p>Edit the master name, photograph, and full profile once when the change should appear everywhere.</p><button className="secondary" onClick={onOpenPeople}>Open people profiles</button></div>
        <div className="profile-section-content-list">
          {pageProfiles.map((entry) => {
            const localized = language === "hi" ? entry.dataHi || {} : entry.dataEn || {};
            const reference = entry.dataEn || {};
            const displayName = localized.name || reference.name || entry.entryKey;
            const additionalContent = findProfileSectionContent(currentBlock, profileContentIdentity(entry));
            const englishReference = language === "hi"
              ? findProfileSectionContent(englishBlock, profileContentIdentity(entry))
              : "";
            return (
              <article className="profile-section-content-editor" key={entry.id}>
                <header><div className="profile-section-content-editor__photo">{reference.photo ? <img src={mediaPreviewUrl(reference.photo)} alt="" /> : <UserRound />}</div><div><strong>{displayName}</strong><span>{localized.designation || reference.designation || "Scientist profile"}</span><small>Photo and master details come from Shared People Profiles.</small></div></header>
                {englishReference && <details className="profile-section-reference"><summary>View English reference</summary><div dangerouslySetInnerHTML={{ __html: englishReference }} /></details>}
                <label className="profile-section-content-label">Additional content shown only in this {itemName} ({language === "hi" ? "Hindi" : "English"})</label>
                <SectionRichTextEditor value={additionalContent} onChange={(html) => updateProfileSectionContent(entry, html)} ariaLabel={`${displayName} additional ${language === "hi" ? "Hindi" : "English"} content`} />
              </article>
            );
          })}
          {!pageProfiles.length && <div className="empty-panel">No scientist is assigned to this {itemName}. Open Shared People Profiles and set the correct Deployment / division.</div>}
        </div>
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
      {controlsVisibleSectionLabel(currentBlock) && <label className="field-row"><span>Section heading</span><small className="field-help">Controls the heading shown directly above this section's text and media.</small>{language === "hi" && englishBlock?.value && <small className="english-field-reference">English: {englishBlock.value}</small>}<input value={typeof currentBlock?.value === "string" ? currentBlock.value : ""} onChange={(event) => updateSectionHeading(event.target.value)} /></label>}
      {usesImportedContentEditor ? (
        <div className="workspace-imported-content">
          <p className="workspace-language-note">These are the exact text rows used by the current website layout. Editing a row updates that same heading, table cell, paragraph, or list item without rebuilding the page.</p>
          <ImportedContentFields
            block={currentBlock}
            referenceBlock={englishBlock}
            pageData={currentData}
            referencePageData={draft.dataEn}
            language={language}
            onChange={updateImportedSection}
          />
        </div>
      ) : (
        <>
          <SectionItemManager
            html={String(currentBlock?.contentHtml || "")}
            referenceHtml={language === "hi" ? String(englishBlock?.contentHtml || "") : ""}
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
        </>
      )}
      <ImportedAssetEditor assets={editorAssets} language={language} onChange={updateSectionAssets} onBusy={setBusy} onError={(message) => notify(message, "error")} />
    </section>
  );
}
