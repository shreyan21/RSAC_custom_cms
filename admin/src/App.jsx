import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowLeft, BookOpen, Check, ChevronRight, FileText,
  Eye, History, Languages, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageSquare,
  Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Users, X,
} from "lucide-react";
import upEmblem from "../../src/assets/images/up-emblem.webp";
import rsacLogo from "../../src/assets/images/rsac-logo.webp";
import { api, setCsrfToken } from "./api";
import FieldInput from "./FieldInput";
import { fieldHelpText } from "./fieldHelpText";
import { cmsGroups } from "./cmsGroups";
import {
  hasMatchingSection,
  projectSection,
  publicationSection,
} from "./divisionSectionCounts";
import useLivePreview from "./useLivePreview";

const DivisionContentWorkspace = lazy(() => import("./DivisionContentWorkspace"));
const CONTENT_PAGE_SIZE = 50;

const emptyEntry = (definition) => ({
  entryKey: "",
  status: "published",
  sortOrder: 0,
  dataEn: { ...(definition?.presetDataEn || {}) },
  dataHi: {},
  version: 0,
});
const titleOf = (entry) => entry?.dataEn?.title || entry?.dataEn?.name || entry?.dataEn?.label || entry?.entryKey || "Untitled";
const hasLanguage = (entry, key) => Object.values(entry?.[key] || {}).some((value) => value !== "" && value !== null && value !== undefined);
const slugify = (value) => String(value || "page").normalize("NFKD").replace(/[^a-zA-Z0-9\s-]/g, "").trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-") || `page-${Date.now()}`;

const prepareEntryPayload = (definition, draft) => {
  const payload = structuredClone(draft);
  const storageId = definition.storageId || definition.id;
  if (storageId === "pages") {
    payload.dataEn ||= {};
    payload.dataEn.sectionKey ||= definition.presetDataEn?.sectionKey || "about-us";
    payload.dataEn.slug ||= slugify(payload.dataEn.title);
  }
  return { payload, storageId };
};

const profileIdentityKeys = (entry) => {
  const data = entry?.dataEn || {};
  const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/^(?:dr|prof|mr|mrs|ms|shri|sri|smt)\.?\s+/iu, "").replace(/[^\p{Letter}\p{Number}]+/gu, "");
  const keys = new Set();
  const employeeId = normalize(data.employeeId);
  const email = String(data.email || "").trim().toLowerCase();
  const name = normalize(data.name);
  const photo = String(data.photo || "").split(/[?#]/)[0].toLowerCase();
  const placeholder = /(?:^|[/\\])(?:\d+)?(?:no(?:[-_ ]*copy[-_ ]*\d*)?|placeholder|default[-_ ]*profile|profile[-_ ]*placeholder)\.(?:jpe?g|png|webp)$/i.test(photo);
  if (employeeId && employeeId !== "notlisted") keys.add(`employee:${employeeId}`);
  if (email) keys.add(`email:${email}`);
  if (name) keys.add(`name:${name}`);
  if (photo && !placeholder) keys.add(`photo:${photo}`);
  return keys;
};

const findDuplicateProfilePairs = (entries) => {
  const active = entries.filter((entry) => entry.status !== "archived");
  const pairs = [];
  for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
    const left = active[leftIndex];
    const leftKeys = profileIdentityKeys(left);
    for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
      const right = active[rightIndex];
      if (left.dataEn?.profileType !== right.dataEn?.profileType) continue;
      if ([...profileIdentityKeys(right)].some((key) => leftKeys.has(key))) pairs.push({ left, right });
    }
  }
  return pairs;
};

const pageViewDefinitions = [
  ["about_pages", "About and Institutional Pages", "about-us", "About RSAC-UP, Visitor's Book, and Administrative Staff content. People and the organisation chart use their dedicated editors."],
  ["division_pages", "Division Page Sections", "divisions", "Edit each division's sections. Create a new division in Divisions; its responsive page is created automatically."],
  ["facility_pages", "Facilities", "facilities", "All facility pages, descriptions, images and flexible page blocks."],
  ["academic_pages", "Training and Academics", "academics", "Training Division and School of Geo-Informatics pages."],
];

const dedicatedPageSections = new Set(pageViewDefinitions.map(([, , sectionKey]) => sectionKey));
const aboutPagesManagedElsewhere = new Set([
  "organisational-chart",
  "our-chairman's-governing-body",
  "director's",
  "our-former",
  "scientific-manpower",
]);

const ourFormerPageKeys = new Set([
  "our-chairman's-governing-body",
  "director's",
  "our-former",
]);

const profileViewDefinitions = [
  ["people_scientists", "Current Scientists", "scientist", "Names, photographs, roles and full bilingual profiles shown on Scientific Manpower and scientist cards."],
  ["people_leadership", "Leadership", "leadership", "People shown on the Leadership and Governance page."],
  ["people_officials", "Government Officials and Hero Portraits", "official", "Official records and portraits shared with the homepage leadership area."],
  ["people_former_scientists", "Our Formers: Former Scientists", "former", "Master photographs and bilingual details used by the Former Scientists cards."],
  ["people_technical_staff", "Technical Staff", "technical", "People shown on the Technical Staff page."],
  ["people_administration", "Administration Profiles", "administration", "People shown on the Administration profile page."],
];

const publicInfoPageViewDefinitions = [
  ["rti_page", "rti", "Right to Information (RTI)", "RTI"],
  ["appellate_authority_page", "appellate-authority", "Appellate Authority", "Appellate Authority"],
  ["memorandum_page", "memorandum-of-association", "Memorandum of Association", "Memorandum of Association"],
  ["general_service_rules_page", "general-service-rules", "General Service Rules", "General Service Rules"],
  ["feedback_page", "feedback", "Feedback Page", "Feedback"],
];

const belongsInPageView = (viewId, entry) =>
  viewId !== "about_pages" || !aboutPagesManagedElsewhere.has(entry.entryKey);

const buildPageViews = (definitions, pageEntries) => {
  const pages = definitions.find((item) => item.id === "pages");
  if (!pages) return definitions;
  const generalPages = pageEntries.filter((entry) =>
    !dedicatedPageSections.has(entry.dataEn?.sectionKey) && entry.status !== "archived"
  );
  const generalPagesDefinition = {
    ...pages,
    label: "Custom Standalone Pages",
    description: "Create a new independent website page when it does not belong to About, Divisions, Facilities, Training, Policies, or Public Information.",
    entryFilter: (entry) => !dedicatedPageSections.has(entry.dataEn?.sectionKey),
    counts: countsFor(generalPages),
  };
  const views = pageViewDefinitions.map(([id, label, sectionKey, description]) => {
    const matching = pageEntries.filter((entry) =>
      entry.dataEn?.sectionKey === sectionKey &&
      entry.status !== "archived" &&
      belongsInPageView(id, entry)
    );
    return {
      ...pages,
      id,
      storageId: "pages",
      label,
      description,
      filterField: "sectionKey",
      filterValue: sectionKey,
      entryFilter: (entry) => belongsInPageView(id, entry),
      presetDataEn: { sectionKey },
      allowCreate: id !== "division_pages",
      workspace: true,
      fields: pages.fields.map((field) => field.name === "sectionKey" ? { ...field, hidden: true } : field),
      counts: {
        total: matching.length,
        published: matching.filter((entry) => entry.status === "published").length,
        drafts: matching.filter((entry) => entry.status === "draft").length,
        hindi: matching.filter((entry) => hasLanguage(entry, "dataHi")).length,
      },
    };
  });
  return [
    ...definitions.map((definition) => definition.id === "pages" ? generalPagesDefinition : definition),
    ...views,
  ];
};

const countsFor = (entries) => {
  const active = entries.filter((entry) => entry.status !== "archived");
  return {
    total: active.length,
    published: active.filter((entry) => entry.status === "published").length,
    drafts: active.filter((entry) => entry.status === "draft").length,
    hindi: active.filter((entry) => hasLanguage(entry, "dataHi")).length,
  };
};

const buildPeopleViews = (definitions, pageEntries, profileEntries) => {
  const pages = definitions.find((item) => item.id === "pages");
  const profiles = definitions.find((item) => item.id === "profiles");
  const siteSettings = definitions.find((item) => item.id === "site_settings");
  if (!pages || !profiles || !siteSettings) return definitions;

  const profileViews = profileViewDefinitions.map(([id, label, profileType, description]) => {
    const matching = profileEntries.filter((entry) => entry.dataEn?.profileType === profileType);
    return {
      ...profiles,
      id,
      storageId: "profiles",
      label,
      description,
      entryFilter: (entry) => entry.dataEn?.profileType === profileType,
      presetDataEn: { profileType },
      fields: profiles.fields.map((field) =>
        field.name === "profileType" ? { ...field, hidden: true } : field
      ),
      counts: countsFor(matching),
    };
  });

  const peoplePageWorkspace = (id, label, description, entryFilter) => {
    const matching = pageEntries.filter(entryFilter);
    return {
      ...pages,
      id,
      storageId: "pages",
      label,
      description,
      workspace: true,
      workspaceKind: "people",
      entryFilter,
      allowCreate: false,
      counts: countsFor(matching),
    };
  };

  const peopleTextView = {
    ...siteSettings,
    id: "people_page_text",
    storageId: "site_settings",
    label: "People Page Headings and Labels",
    description: "Edit the English and Hindi headings, introductions, back buttons and group labels used across all People and Our Formers pages.",
    allowCreate: false,
    fields: siteSettings.fields.map((field) =>
      field.name === "settings"
        ? { ...field, settingsGroupFilter: ["People and Our Formers pages"] }
        : field
    ),
  };

  return [
    ...definitions.map((definition) => {
      if (definition.id !== "site_settings") return definition;
      return {
        ...definition,
        fields: definition.fields.map((field) =>
          field.name === "settings"
            ? { ...field, excludeSettingsGroups: ["People and Our Formers pages"] }
            : field
        ),
      };
    }),
    peopleTextView,
    peoplePageWorkspace(
      "our_formers_pages",
      "Our Formers: Card Rosters",
      "Edit the visible Former Chairmen, Former Directors and Former Scientists roster sections in English and Hindi.",
      (entry) => ourFormerPageKeys.has(entry.entryKey)
    ),
    peoplePageWorkspace(
      "scientific_manpower_page",
      "Scientific Manpower Page",
      "Edit the Scientific Manpower page roster and page-specific bilingual content. Master person details remain in Current Scientists.",
      (entry) => entry.entryKey === "scientific-manpower"
    ),
    ...profileViews,
  ];
};

const buildCanonicalViews = (definitions, pageEntries, publicInfoEntries) => {
  const pagesDefinition = definitions.find((item) => item.id === "pages");
  const publicInfoDefinition = definitions.find((item) => item.id === "public_info");
  const siteSettingsDefinition = definitions.find((item) => item.id === "site_settings");

  const divisionWorkspace = (definition, options) => {
    const entries = pageEntries.filter((entry) =>
      entry.dataEn?.sectionKey === "divisions" && hasMatchingSection(entry, options.sectionFilter)
    );
    return {
      ...definition,
      ...pagesDefinition,
      id: definition.id,
      storageId: "pages",
      label: options.label,
      description: options.description,
      workspace: true,
      workspaceKind: "divisions",
      filterField: "sectionKey",
      filterValue: "divisions",
      entryFilter: (entry) => hasMatchingSection(entry, options.sectionFilter),
      sectionFilter: options.sectionFilter,
      allowCreate: false,
      counts: countsFor(entries),
    };
  };

  const publicPageView = (definition, slug, label, contentName) => {
    const entries = publicInfoEntries.filter((entry) => entry.dataEn?.slug === slug);
    const sectionCount = entries[0]?.dataEn?.sections?.length || 0;
    return {
      ...definition,
      ...publicInfoDefinition,
      id: definition.id,
      storageId: "public_info",
      label,
      description: `Edit the ${contentName} page and its ${sectionCount} current ${sectionCount === 1 ? "section" : "sections"}.`,
      filterField: "slug",
      filterValue: slug,
      allowCreate: false,
      singleton: false,
      fields: (publicInfoDefinition?.fields || []).map((field) =>
        field.name === "slug" ? { ...field, hidden: true } : field
      ),
      counts: countsFor(entries),
    };
  };

  const canonicalDefinitions = definitions.map((definition) => {
    if (definition.id === "projects") {
      return divisionWorkspace(definition, {
        label: "Division Projects",
        description: "Edit the ongoing and completed project sections already shown on division pages.",
        sectionFilter: projectSection,
      });
    }
    if (definition.id === "publications") {
      return divisionWorkspace(definition, {
        label: "Publications, Research Papers and Reports",
        description: "Edit the publication, research-paper and technical-report sections already shown on division pages.",
        sectionFilter: publicationSection,
      });
    }
    if (definition.id === "tenders") {
      return publicPageView(definition, "tenders", "Tenders", "tenders");
    }
    if (definition.id === "faq") {
      return publicPageView(definition, "faq", "Frequently Asked Questions", "FAQ");
    }
    return definition;
  });

  const publicInfoViews = publicInfoPageViewDefinitions.map(
    ([id, slug, label, contentName]) =>
      publicPageView({ id }, slug, label, contentName)
  );
  const floodPageSettings = siteSettingsDefinition
    ? {
        ...siteSettingsDefinition,
        id: "flood_page_settings",
        storageId: "site_settings",
        label: "Flood Page Settings",
        description: "Edit the Flood page headings, programme cards, report table labels, archive years and related portals in English and Hindi.",
        allowCreate: false,
        fields: siteSettingsDefinition.fields.map((field) =>
          field.name === "settings"
            ? {
                ...field,
                settingsGroupFilter: ["Flood monitoring and reports"],
              }
            : field
        ),
      }
    : null;

  return [
    ...canonicalDefinitions,
    ...publicInfoViews,
    ...(floodPageSettings ? [floodPageSettings] : []),
  ];
};

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: "admin", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(form) });
      setCsrfToken(result.csrfToken); onLogin(result.user);
    } catch (nextError) { setError(nextError.message); }
    finally { setBusy(false); }
  };
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="cms-login-title">
        <img className="login-corner-logo" src={rsacLogo} alt="RSAC-UP logo" />
        <div className="government-identity"><img src={upEmblem} alt="Government of Uttar Pradesh emblem" /><span>Government of Uttar Pradesh</span></div>
        <div className="identity-mark"><div><strong>RSAC-UP</strong><span>Custom Content Management</span></div></div>
        <h1 id="cms-login-title">Editor sign in</h1>
        <p>Manage approved English and Hindi website content from one secure portal.</p>
        {error && <div className="alert error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Username<input autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
          <label>Password<input autoComplete="current-password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <button className="primary login-button" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <ShieldCheck />} Sign in</button>
        </form>
        <small>Authorised editors only. Sign-ins and content changes are auditable.</small>
      </section>
    </main>
  );
}

function EntryEditor({ definition, entry, onClose, onSaved, notify }) {
  const [draft, setDraft] = useState(() => structuredClone(entry || emptyEntry(definition)));
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const previewPayload = useMemo(() => prepareEntryPayload(definition, draft), [definition, draft]);
  const { openPreview } = useLivePreview({
    collection: previewPayload.storageId,
    draft: previewPayload.payload,
    language,
    notify,
  });
  const setField = (field, value) => {
    const target = field.localized === false || language === "en" ? "dataEn" : "dataHi";
    setDraft((current) => ({ ...current, [target]: { ...current[target], [field.name]: value } }));
  };
  const save = async () => {
    setBusy(true); notify("");
    try {
      const { payload, storageId } = prepareEntryPayload(definition, draft);
      const method = payload.id ? "PUT" : "POST";
      const path = payload.id ? `/api/admin/content/${storageId}/${payload.id}` : `/api/admin/content/${storageId}`;
      const result = await api(path, { method, body: JSON.stringify(payload) });
      const statusMessage = payload.status === "published"
        ? "Published. Open live website tabs are updating now."
        : payload.status === "archived"
          ? "Archived. It has been removed from the live website."
          : "Saved as Draft. It is hidden from the live website; a private Preview can still show it.";
      notify(statusMessage, "success");
      onSaved(result.data);
    } catch (error) { notify(error.message, "error"); }
    finally { setBusy(false); }
  };
  const preview = async () => {
    setBusy(true); notify("");
    try {
      await openPreview();
    } catch (error) { notify(error.message, "error"); }
    finally { setBusy(false); }
  };
  return (
    <div className="editor-shell">
      <header className="editor-head">
        <button type="button" className="back-button" onClick={onClose}><ArrowLeft /> Back</button>
        <div><span>{definition.label}</span><h2>{draft.id ? titleOf(draft) : `Add ${definition.label}`}</h2></div>
        <div className="editor-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="secondary" disabled={busy} onClick={preview}><Eye /> Private preview {language === "hi" ? "हिन्दी" : "English"}</button><button type="button" className="primary" disabled={busy} onClick={save}>{busy ? <LoaderCircle className="spin" /> : <Save />} {draft.status === "published" ? "Publish changes" : draft.status === "archived" ? "Save as archived" : "Save as draft"}</button></div>
      </header>
      <div className="editor-body">
        <aside className="editor-meta">
          <h3>Publishing</h3>
          <label>Visibility<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="published">Published - visible</option><option value="draft">Draft - hidden</option><option value="archived">Archived - hidden</option></select></label>
          <p>{draft.status === "published" ? "Changes become public after Save." : "This stays hidden from the live website after Save. Private preview remains available for checking."}</p>
          <details className="editor-advanced"><summary>Advanced options</summary>{!definition.autoNewestFirst && <label>Sort order<input type="number" value={draft.sortOrder ?? 0} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></label>}{!definition.autoNewestFirst && <label>Internal key<input value={draft.entryKey || ""} onChange={(event) => setDraft({ ...draft, entryKey: event.target.value })} placeholder="Generated automatically" /></label>}<small>Lower order appears first. Do not change existing internal keys.</small></details>
        </aside>
        <section className="editor-fields">
          <div className="language-tabs" role="tablist" aria-label="Editing language">
            <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}><Languages /> English <span className={hasLanguage(draft, "dataEn") ? "language-dot ready" : "language-dot"} /></button>
            <button type="button" className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}><Languages /> हिन्दी <span className={hasLanguage(draft, "dataHi") ? "language-dot ready" : "language-dot"} /></button>
          </div>
          <div className="alert info">{language === "hi" ? "Hindi is stored separately. Blank Hindi remains blank and never copies English text." : "Edit the official English version here. Shared URLs and media are used in both languages."}</div>
          {definition.fields.filter((field) => !field.hidden && !field.advanced).map((field) => {
            const target = field.localized === false || language === "en" ? draft.dataEn : draft.dataHi;
            const referenceValue = language === "hi" && field.localized !== false ? draft.dataEn?.[field.name] : undefined;
            const sharedSettingsValue = (definition.storageId || definition.id) === "site_settings" && field.name === "settings" ? draft.dataEn?.settings : undefined;
            const setSharedSettingsValue = sharedSettingsValue === undefined ? undefined : (value) => setDraft((current) => ({ ...current, dataEn: { ...current.dataEn, settings: value } }));
            return <label className={`field-row field-${field.type}`} key={field.name}><span>{field.label}{field.required && " *"}{field.localized === false && <small>Shared by both languages</small>}</span><small className="field-help">{fieldHelpText(field)}</small><FieldInput field={field} value={target?.[field.name]} referenceValue={referenceValue} language={language} pageData={target} referencePageData={draft.dataEn} onChange={(value) => setField(field, value)} sharedValue={sharedSettingsValue} onSharedChange={setSharedSettingsValue} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></label>;
          })}
          {definition.fields.some((field) => !field.hidden && field.advanced) && <details className="field-advanced"><summary>Advanced page settings</summary><p>Legacy imported body, routes, source links and card appearance. Normal editing does not need these fields.</p>{definition.fields.filter((field) => !field.hidden && field.advanced).map((field) => { const target = field.localized === false || language === "en" ? draft.dataEn : draft.dataHi; const referenceValue = language === "hi" && field.localized !== false ? draft.dataEn?.[field.name] : undefined; return <label className={`field-row field-${field.type}`} key={field.name}><span>{field.label}{field.required && " *"}</span><small className="field-help">{fieldHelpText(field)}</small><FieldInput field={field} value={target?.[field.name]} referenceValue={referenceValue} language={language} pageData={target} referencePageData={draft.dataEn} onChange={(value) => setField(field, value)} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></label>; })}</details>}
        </section>
      </div>
    </div>
  );
}

function GuideView() {
  const tasks = [
    ["Edit one division section", "Open Division Page Sections, select a division, then open Research Papers, Projects, Reports, Software, Hardware, Photos, or another section. Edit its complete content in one rich-text box."],
    ["Add a division section", "Open Division Page Sections, choose the division, then select Add a new section. Enter the English heading and content, switch to Hindi for its translation, preview, then Save."],
    ["Add division research or projects", "Open the required division section. Add a paragraph or list item in its rich-text box, complete English and Hindi separately, then Save."],
    ["Change text", "Open the matching collection, search the item, edit English, then हिन्दी, and Save."],
    ["Rename a homepage tab", "Open Homepage Navigation Tabs under Homepage, select the tab, change Visible tab name in English or Hindi, and Save. Its destination page path stays unchanged."],
    ["Change card order", "Open Advanced options and set Sort order: 0 first, 1 second, 2 third. Open website tabs update automatically after Save."],
    ["Hide content", "Change Status to Draft. Archive only when the item should leave normal editing lists."],
    ["Edit a person or fix a repeated card", "Open People and Our Formers, then choose the exact public group such as Current Scientists, Leadership, or Former Scientists. Search the name, keep the correct record and archive the extra."],
    ["Edit Our Formers", "Open Our Formers: Card Rosters for the visible Chairman, Director and Former Scientist source cards. Use Our Formers: Former Scientists for master photos and full bilingual former-scientist details."],
    ["Add division-only profile information", "Open Division Page Sections, choose the division and Scientific Manpower. The photo and master profile remain shared; write extra English or Hindi content beside that person and Save."],
    ["Add page sections", "Open the matching page collection. Flexible page blocks provide Add item buttons for text, cards, images, galleries, tables, links, or dividers."],
    ["Change page headings", "Open Page Headings and Subheadings. Hide, rename or resize a heading or introduction for an exact route such as /gallery or a route group such as /divisions/*."],
    ["Change homepage text sizes", "Open Homepage, Sitemap and Global Text. Use Homepage default text sizes for all sections, or Homepage section size overrides for one section."],
    ["Change website fonts", "Open Website Design and Fonts. Choose a bundled font and base size from 14 to 20, then verify English, Hindi and mobile."],
    ["Upload media", "Use Upload, add meaningful alt text, and verify the result at mobile and desktop width."],
    ["Preview before publishing", "Open an item or page section, choose English or हिन्दी, then click Preview. One private preview tab stays open and updates automatically as you type, without saving or changing live content."],
    ["Publish safely", "Check spelling, dates, URLs, English, Hindi, keyboard access and mobile layout before publishing."],
  ];
  return (
    <section className="guide-view">
      <div className="guide-hero"><BookOpen /><div><span>Editor handbook</span><h2>How to update the RSAC-UP website</h2><p>Simple workflows for authorised nontechnical editors.</p></div></div>
      <div className="guide-warning"><ShieldCheck /><p><strong>Golden rule:</strong> edit English and Hindi separately. Never paste passwords, personal files, or unapproved documents into public content.</p></div>
      <div className="guide-grid">{tasks.map(([title, text], index) => <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      <div className="guide-detail"><h3>Which collection should I open?</h3><dl><div><dt>Homepage layout, text and section sizes</dt><dd>Homepage, Sitemap and Global Text controls section visibility/order, per-section sizes, Hero, About, Services, Statistics, Location, Gallery and Footer text.</dd></div><div><dt>Homepage cards</dt><dd>Use Homepage Feature Tabs, Services, Applications, Operational Domains, Statistics, Quick Links and Geoportals for individual rows.</dd></div><div><dt>Facilities</dt><dd>Use Facilities only. It contains every facility detail page, section editor and shared photograph.</dd></div><div><dt>Create a division</dt><dd>Use Divisions. Saving a new division card automatically creates its responsive page in Division Page Sections.</dd></div><div><dt>Division sections</dt><dd>Use Division Projects or Publications, Research Papers and Reports for a focused view. Division Page Sections shows every section with separate English and Hindi rich editors.</dd></div><div><dt>Full pages</dt><dd>Use About and Institutional Pages, Division Page Sections, Facilities, Training and Academics, or Custom Standalone Pages. A body page appears in only one of these editors.</dd></div><div><dt>Gallery heading</dt><dd>Open Page Headings and Subheadings, then Photo Gallery. The Hide subheading / introduction control removes or restores the text below the gallery heading.</dd></div><div><dt>Heading visibility</dt><dd>Page Headings and Subheadings controls small heading, main title, introduction and heading size by route.</dd></div><div><dt>Website font and base size</dt><dd>Website Design and Fonts controls safe bundled English/Hindi fonts and the responsive site-wide base size.</dd></div><div><dt>People page headings</dt><dd>People Page Headings and Labels contains the English and Hindi headings, introductions, back buttons and group labels used across all People and Our Formers pages.</dd></div><div><dt>People profiles</dt><dd>Under People and Our Formers, open the exact group shown on the website: Current Scientists, Leadership, Government Officials, Former Scientists, Technical Staff, or Administration Profiles.</dd></div><div><dt>Our Formers source cards</dt><dd>Our Formers: Card Rosters contains the visible Former Chairmen, Former Directors and Former Scientists page sections.</dd></div><div><dt>Official public pages</dt><dd>RTI, Appellate Authority, Memorandum of Association, General Service Rules, Feedback, Tenders and FAQ each have their own editor card. Page documents can be uploaded or replaced inside their section.</dd></div><div><dt>Flood content</dt><dd>Flood Page Settings controls headings, table labels and archive years. Flood Reports contains every report and PDF; search a year such as 2026 to edit that season.</dd></div><div><dt>Site-wide content</dt><dd>Header / Footer Menu, Contact, Logos and Homepage, Sitemap and Global Text.</dd></div><div><dt>More editors</dt><dd>Administrators use Users to create, reset, deactivate and assign Editor or Administrator roles.</dd></div></dl></div>
      <div className="guide-checklist"><h3>Before clicking Save</h3><ul><li>English and Hindi are in the correct language tabs.</li><li>Sort order does not duplicate another important item unnecessarily.</li><li>Links and documents open.</li><li>Images have useful alt text.</li><li>Draft or Published status is intentional.</li><li>The website still works on phone and desktop.</li></ul></div>
    </section>
  );
}

function UsersView({ currentUser, notify }) {
  const blank = { username: "", displayName: "", role: "editor", active: true, password: "" };
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => { setBusy(true); try { setUsers((await api("/api/admin/users")).data); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } }, [notify]);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const save = async () => {
    try {
      const method = form.id ? "PUT" : "POST";
      const path = form.id ? `/api/admin/users/${form.id}` : "/api/admin/users";
      await api(path, { method, body: JSON.stringify(form) });
      notify(form.id ? "User updated." : "User created.", "success"); setForm(null); await load();
    } catch (error) { notify(error.message, "error"); }
  };
  return (
    <section className="users-view">
      <div className="section-intro"><div><h2>CMS users</h2><p>Create editor accounts, assign roles, reset passwords, or deactivate access.</p></div><button className="primary" onClick={() => setForm(blank)}><Plus /> Add user</button></div>
      {form && <div className="user-form"><div><h3>{form.id ? "Edit user" : "Create user"}</h3><button onClick={() => setForm(null)}><X /></button></div><div className="user-form-grid"><label>Display name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label><label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label><label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="editor">Editor</option><option value="admin">Administrator</option></select></label><label>{form.id ? "New password (optional)" : "Temporary password"}<input type="password" autoComplete="new-password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label className="inline-check"><input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active account</label></div><p>Passwords need 12+ characters, upper-case, lower-case and a number.</p><div className="editor-actions"><button className="secondary" onClick={() => setForm(null)}>Cancel</button><button className="primary" onClick={save}><Save /> Save user</button></div></div>}
      <div className="content-table-wrap"><table className="content-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last updated</th><th /></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td><strong>{item.displayName}</strong>{item.id === currentUser.id && <small>Current account</small>}</td><td>{item.username}</td><td><span className="status published">{item.role}</span></td><td>{item.active ? <span className="language-ready"><Check /> Active</span> : <span className="language-missing">Inactive</span>}</td><td>{new Date(item.updatedAt).toLocaleString()}</td><td><button className="table-action" onClick={() => setForm({ ...item, password: "" })}>Edit</button></td></tr>)}</tbody></table></div>
      {busy && <div className="loading-bar"><LoaderCircle className="spin" /> Loading users</div>}
    </section>
  );
}

function FeedbackView({ notify }) {
  const [items, setItems] = useState([]);
  const [sendingId, setSendingId] = useState("");
  const load = useCallback(
    () => api("/api/admin/feedback")
      .then((result) => setItems(result.data))
      .catch((error) => notify(error.message, "error")),
    [notify]
  );
  useEffect(() => { load(); }, [load]);
  const send = async (item) => {
    setSendingId(item.id);
    try {
      await api(`/api/admin/feedback/${item.id}/send`, { method: "POST" });
      notify("Feedback email sent.", "success");
      await load();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSendingId("");
    }
  };
  return (
    <section className="feedback-view">
      <div className="section-intro">
        <div>
          <h2>Website feedback</h2>
          <p>Every response is saved here. SMTP-configured servers also notify approved recipients.</p>
        </div>
      </div>
      <div className="feedback-list">
        {items.map((item) => (
          <article key={item.id}>
            <header>
              <div>
                <strong>{item.name}</strong>
                <span className={`feedback-delivery feedback-delivery--${item.delivery_status || "pending"}`}>
                  {item.delivery_status === "sent"
                    ? "Email sent"
                    : item.delivery_status === "failed"
                      ? "Email failed"
                      : item.delivery_status === "disabled"
                        ? "Saved - email not configured"
                        : "Pending"}
                </span>
              </div>
              <span>{new Date(item.created_at).toLocaleString()}</span>
            </header>
            <p>{item.comments}</p>
            <dl className="feedback-contact">
              <div><dt>Email</dt><dd><a href={`mailto:${item.email}`}>{item.email}</a></dd></div>
              <div><dt>Phone</dt><dd>{item.phone}</dd></div>
              <div><dt>Location</dt><dd>{[item.district, item.state, item.country].filter(Boolean).join(", ")}</dd></div>
              <div><dt>Address</dt><dd>{item.address}</dd></div>
            </dl>
            <footer>
              <span>{item.language === "hi" ? "Hindi submission" : "English submission"} · Delivery attempts: {item.delivery_attempts || 0}</span>
              {item.delivery_status !== "sent" && (
                <button className="secondary" disabled={sendingId === item.id} onClick={() => send(item)}>
                  <RefreshCw className={sendingId === item.id ? "spin" : ""} />
                  {sendingId === item.id ? "Sending..." : "Send email"}
                </button>
              )}
            </footer>
          </article>
        ))}
        {!items.length && <div className="empty-panel">No feedback received.</div>}
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [profileEntries, setProfileEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audit, setAudit] = useState([]);
  const notify = useCallback((message, type = "info") => setNotice(message ? { message, type } : null), []);
  const loadCollections = useCallback(async () => {
    const [collectionResult, pageResult, publicInfoResult, profileResult] = await Promise.all([
      api("/api/admin/collections"),
      api("/api/admin/content/pages"),
      api("/api/admin/content/public_info"),
      api("/api/admin/content/profiles"),
    ]);
    setCollections(buildPeopleViews(
      buildCanonicalViews(
        buildPageViews(collectionResult.data, pageResult.data),
        pageResult.data,
        publicInfoResult.data
      ),
      pageResult.data,
      profileResult.data
    ));
  }, []);

  useEffect(() => { api("/api/auth/me").then((result) => { setCsrfToken(result.csrfToken); setUser(result.user); return loadCollections(); }).catch(() => {}).finally(() => setBooting(false)); }, [loadCollections]);
  const openView = (next) => { setView(next); setSelected(null); setEditing(null); setMenuOpen(false); };
  const openCollection = async (definition) => { setBusy(true); setSelected(definition); setEditing(null); setView(definition.workspace ? "content_workspace" : "collection"); setSearch(""); setListPage(1); setMenuOpen(false); try { const [result, peopleResult] = await Promise.all([api(`/api/admin/content/${definition.storageId || definition.id}`), definition.workspace ? api("/api/admin/content/profiles") : Promise.resolve({ data: [] })]); const fieldFiltered = definition.filterField ? result.data.filter((entry) => entry.dataEn?.[definition.filterField] === definition.filterValue) : result.data; setEntries(definition.entryFilter ? fieldFiltered.filter(definition.entryFilter) : fieldFiltered); setProfileEntries(peopleResult.data.filter((entry) => entry.status !== "archived")); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } };
  const addNew = (definition) => { setSelected(definition); setView("collection"); setEditing("new"); setMenuOpen(false); };
  const refreshCollection = async () => { if (selected) await openCollection(selected); await loadCollections(); };
  const archive = async (entry) => { if (!window.confirm(`Archive "${titleOf(entry)}"? It will disappear from the public website.`)) return; try { await api(`/api/admin/content/${selected.storageId || selected.id}/${entry.id}`, { method: "DELETE" }); notify("Item archived.", "success"); await refreshCollection(); } catch (error) { notify(error.message, "error"); } };
  const logout = async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch { /* expired */ } setUser(null); setCsrfToken(""); };
  const showAudit = async () => { setBusy(true); openView("audit"); try { setAudit((await api("/api/admin/audit")).data); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } };
  const saveDivisionPage = async (draft) => {
    const result = await api(`/api/admin/content/pages/${draft.id}`, { method: "PUT", body: JSON.stringify(draft) });
    setEntries((current) => current.map((entry) => entry.id === result.data.id ? result.data : entry));
    await loadCollections();
    return result.data;
  };
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      `${titleOf(entry)} ${entry.entryKey} ${JSON.stringify(entry.dataEn || {})} ${JSON.stringify(entry.dataHi || {})}`
        .toLowerCase()
        .includes(query)
    );
  }, [entries, search]);
  const totalListPages = Math.max(1, Math.ceil(filteredEntries.length / CONTENT_PAGE_SIZE));
  const safeListPage = Math.min(listPage, totalListPages);
  const pagedEntries = useMemo(
    () => filteredEntries.slice(
      (safeListPage - 1) * CONTENT_PAGE_SIZE,
      safeListPage * CONTENT_PAGE_SIZE
    ),
    [filteredEntries, safeListPage]
  );
  const profileDuplicatePairs = useMemo(() => selected?.storageId === "profiles" ? findDuplicateProfilePairs(entries) : [], [entries, selected]);
  const visibleGroups = useMemo(() => cmsGroups.map((group) => ({ ...group, items: group.ids.map((id) => collections.find((item) => item.id === id)).filter(Boolean).filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(collectionSearch.toLowerCase())) })).filter((group) => group.items.length), [collections, collectionSearch]);

  if (booting) return <div className="full-loader"><LoaderCircle className="spin" /><span>Opening secure CMS...</span></div>;
  if (!user) return <Login onLogin={(nextUser) => { setUser(nextUser); loadCollections(); }} />;
  if (editing) return <><EntryEditor definition={selected} entry={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refreshCollection(); }} notify={notify} />{notice && <div className={`toast ${notice.type}`}><span>{notice.message}</span><button onClick={() => setNotice(null)}><X /></button></div>}</>;

  const divisionWorkspaceDefinition = collections.find((item) => item.id === "division_pages");
  const navButton = (id, icon, label, action = () => openView(id)) => <button className={view === id ? "active" : ""} onClick={action}>{icon}{label}</button>;
  return (
    <div className="admin-app">
      <aside className={menuOpen ? "main-sidebar open" : "main-sidebar"}>
        <div className="government-brand"><img src={upEmblem} alt="Uttar Pradesh emblem" /><span>उत्तर प्रदेश सरकार<br />Government of Uttar Pradesh</span></div>
        <div className="brand"><div><strong>RSAC-UP</strong><span>Content Management</span></div></div>
        <nav>{navButton("dashboard", <LayoutDashboard />, "Collections")}{divisionWorkspaceDefinition && navButton("content_workspace", <FileText />, "Division page sections", () => openCollection(divisionWorkspaceDefinition))}{navButton("guide", <BookOpen />, "Editor guide")}{navButton("feedback", <MessageSquare />, "Website feedback")}{navButton("audit", <History />, "Audit history", showAudit)}{user.role === "admin" && navButton("users", <Users />, "CMS users")}</nav>
        <div className="compliance-note"><ShieldCheck /><span>Accessible editing<br />Audit enabled</span></div>
        <div className="sidebar-user"><span>{user.displayName}</span><small>{user.role}</small><button onClick={logout}><LogOut /> Sign out</button></div>
      </aside>
      <main className="main-content">
        <header className="top-header"><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button><div><span>RSAC-UP Custom CMS</span><h1>{view === "dashboard" ? "Website collections" : view === "content_workspace" ? selected?.label : view === "collection" ? selected?.label : view === "guide" ? "Editor guide" : view === "feedback" ? "Website feedback" : view === "users" ? "User management" : "Audit history"}</h1></div><img className="top-header-logo" src={rsacLogo} alt="RSAC-UP logo" /></header>
        {notice && <div className={`page-notice ${notice.type}`}><span>{notice.message}</span><button onClick={() => setNotice(null)}><X /></button></div>}
        {view === "collection" && selected?.storageId === "profiles" && profileDuplicatePairs.length > 0 && <div className="page-notice error" role="alert"><span><strong>{profileDuplicatePairs.length} possible duplicate profile pair(s).</strong> Search these names, edit the correct record, then archive the extra: {profileDuplicatePairs.map(({ left, right }) => `${titleOf(left)} / ${titleOf(right)}`).join("; ")}</span></div>}
        {busy && <div className="loading-bar"><LoaderCircle className="spin" /> Loading</div>}
        {view === "dashboard" && <section className="dashboard"><div className="section-intro"><div><h2>What do you want to edit?</h2><p>Choose website area, then edit an item or add new content.</p></div></div><div className="collection-search"><Search /><input value={collectionSearch} onChange={(event) => setCollectionSearch(event.target.value)} placeholder="Search: facilities, gallery, division, footer..." /></div>{visibleGroups.map((group) => <section className="collection-group" key={group.title}><h3>{group.title}</h3><div className="collection-grid">{group.items.map((collection) => <article className="collection-card" key={collection.id}><div><FileText /><span className={collection.counts?.drafts ? "count draft" : "count"}>{collection.counts?.total || 0}</span></div><h4>{collection.label}</h4><p>{collection.description}</p><footer><span>{collection.counts?.hindi || 0} Hindi</span><span>{collection.counts?.published || 0} visible</span></footer><div className="collection-card__actions"><button className="secondary" onClick={() => openCollection(collection)}>{collection.workspace ? collection.workspaceKind === "divisions" || collection.id === "division_pages" ? "Choose division" : "Choose page" : "View and edit"} <ChevronRight /></button>{collection.allowCreate !== false && (!collection.singleton || !collection.counts?.total) && <button className="primary" onClick={() => addNew(collection)}><Plus /> Add new</button>}</div></article>)}</div></section>)}</section>}
        {view === "content_workspace" && selected && <Suspense fallback={<div className="loading-state"><LoaderCircle className="spin" /> Opening section editor</div>}><DivisionContentWorkspace key={selected.id} pages={entries} profiles={profileEntries} workspaceKind={selected.workspaceKind || selected.filterValue} sectionFilter={selected.sectionFilter} onSave={saveDivisionPage} onClose={() => openView("dashboard")} onOpenPeople={() => { const definition = collections.find((item) => item.id === "people_scientists"); if (definition) openCollection(definition); }} notify={notify} /></Suspense>}
        {view === "collection" && selected && <section className="collection-view"><div className="collection-tools"><button className="back-button" onClick={() => openView("dashboard")}><ArrowLeft /> Collections</button><div className="search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setListPage(1); }} placeholder={(selected.storageId || selected.id) === "flood_reports" ? "Search title, district, date or year" : "Search English, Hindi, title or key"} /></div>{selected.allowCreate !== false && (!selected.singleton || !entries.some((entry) => entry.status !== "archived")) && <button className="primary" onClick={() => setEditing("new")}><Plus /> Add new</button>}</div><div className="sort-help"><RefreshCw /> {selected.id === "division_pages" ? "Choose a division, then open one section. English and Hindi remain separate." : (selected.storageId || selected.id) === "flood_reports" ? "Search a year such as 2026 to edit that season's report text, visibility and local PDFs." : selected.autoNewestFirst ? "New items appear first automatically and are numbered from 1." : "Lower Sort order appears first."} Open website tabs update automatically after published changes.</div><div className="content-table-wrap"><table className="content-table"><thead><tr><th>Content</th><th>English</th><th>Hindi</th><th>Status</th><th>Order</th><th /></tr></thead><tbody>{pagedEntries.map((entry) => <tr key={entry.id}><td data-label="Content"><strong>{titleOf(entry)}</strong><small>{entry.entryKey}{(selected.storageId || selected.id) === "flood_reports" && entry.dataEn?.dateLabel ? ` · ${entry.dataEn.dateLabel}${entry.dataEn?.coverage ? ` · ${entry.dataEn.coverage}` : ""}` : ""}</small></td><td data-label="English">{hasLanguage(entry, "dataEn") ? <span className="language-ready"><Check /> Ready</span> : <span className="language-missing">Missing</span>}</td><td data-label="Hindi">{hasLanguage(entry, "dataHi") ? <span className="language-ready"><Check /> Ready</span> : <span className="language-missing">Missing</span>}</td><td data-label="Status"><span className={`status ${entry.status}`}>{entry.status}</span></td><td data-label="Order">{selected.autoNewestFirst ? "Auto" : entry.sortOrder}</td><td className="content-actions"><div className="row-actions"><button onClick={() => setEditing(entry)}>{selected.id === "division_pages" ? <><ChevronRight /> Open sections</> : <><Pencil /> Edit</>}</button>{selected.id !== "division_pages" && entry.status !== "archived" && <button className="archive" aria-label={`Archive ${titleOf(entry)}`} title="Archive" onClick={() => archive(entry)}><Archive /></button>}</div></td></tr>)}{!filteredEntries.length && <tr><td colSpan="6" className="empty-row">No content found.</td></tr>}</tbody></table></div>{filteredEntries.length > CONTENT_PAGE_SIZE && <nav className="content-pagination" aria-label="Content pages"><button className="secondary" disabled={safeListPage === 1} onClick={() => setListPage((current) => Math.max(1, current - 1))}><ArrowLeft /> Previous</button><span>Page {safeListPage} of {totalListPages} · {filteredEntries.length} items</span><button className="secondary" disabled={safeListPage === totalListPages} onClick={() => setListPage((current) => Math.min(totalListPages, current + 1))}>Next <ChevronRight /></button></nav>}</section>}
        {view === "guide" && <GuideView />}
        {view === "feedback" && <FeedbackView notify={notify} />}
        {view === "users" && user.role === "admin" && <UsersView currentUser={user} notify={notify} />}
        {view === "audit" && <section className="audit-view"><div className="section-intro"><div><h2>Recent editor activity</h2><p>Who changed which website area and when.</p></div></div><div className="content-table-wrap"><table className="content-table"><thead><tr><th>Time</th><th>Editor</th><th>Action</th><th>Collection</th><th>Item key</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.display_name || item.username || "System"}</td><td><span className="status published">{item.action}</span></td><td>{item.collection || "-"}</td><td>{item.entry_key || "-"}</td></tr>)}</tbody></table></div></section>}
      </main>
    </div>
  );
}
