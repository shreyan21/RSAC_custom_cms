import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowLeft, BookOpen, Building2, Check, ChevronRight, ContactRound,
  Eye, FileText, GraduationCap, History, Images, Landmark, Languages, LayoutDashboard,
  KeyRound, LibraryBig, LoaderCircle, LogOut, MapPinned, Menu, MessageSquare, Microscope,
  Pencil, Plus, RefreshCw, Satellite, Save, Scale, Search, ShieldCheck,
  Smartphone, Trash2, UserCog, Users, UsersRound, Waves, Wrench, X,
} from "lucide-react";
import upEmblem from "../../src/assets/images/up-emblem.webp";
import rsacLogo from "../../src/assets/images/rsac-logo.webp";
import { api, setCsrfToken } from "./api";
import FieldInput from "./FieldInput";
import { usesCompositeFieldContainer } from "./fieldContainer";
import { fieldHelpText } from "./fieldHelpText";
import { cmsGroups } from "./cmsGroups";
import {
  cmsPermissionAreas,
  createCmsPermissions,
  hasCmsPermission,
  pagePermissionKeys,
  permissionForCmsView,
  publicInfoPermissionKeys,
} from "../../shared/cmsPermissions";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../../shared/passwordPolicy";
import {
  floodSettingsGroupLabels,
  homepageTabPageSettingsGroupLabel,
} from "./settingsGroupLabels";
import useLivePreview from "./useLivePreview";

const DivisionContentWorkspace = lazy(() => import("./DivisionContentWorkspace"));
const CONTENT_PAGE_SIZE = 50;
const FLOOD_REPORT_PAGE_SIZE = 20;

const emptyEntry = (definition) => ({
  entryKey: "",
  status: "published",
  sortOrder: "",
  dataEn: { ...(definition?.presetDataEn || {}) },
  dataHi: {},
  version: 0,
});
const titleOf = (entry) => entry?.dataEn?.title || entry?.dataEn?.name || entry?.dataEn?.label || entry?.entryKey || "Untitled";
const hasLanguage = (entry, key) => Object.values(entry?.[key] || {}).some((value) => value !== "" && value !== null && value !== undefined);
const slugify = (value) => String(value || "page").normalize("NFKD").replace(/[^a-zA-Z0-9\s-]/g, "").trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-") || `page-${Date.now()}`;
const collectionIconFor = (collection) => {
  const text = `${collection?.id || ""} ${collection?.label || ""}`.toLowerCase();
  const rules = [
    [/former/, <History aria-hidden="true" />],
    [/administration|administrative|auxiliary|staff/, <UserCog aria-hidden="true" />],
    [/scientist|people|leadership|official|profile|manpower/, <UsersRound aria-hidden="true" />],
    [/about|institution|memorandum/, <Landmark aria-hidden="true" />],
    [/organisation|organization|chart/, <MapPinned aria-hidden="true" />],
    [/division/, <Satellite aria-hidden="true" />],
    [/facilit|laborator|workshop/, <Building2 aria-hidden="true" />],
    [/academic|training|student|thesis/, <GraduationCap aria-hidden="true" />],
    [/gallery|photo|media/, <Images aria-hidden="true" />],
    [/mobile app/, <Smartphone aria-hidden="true" />],
    [/flood|surface water/, <Waves aria-hidden="true" />],
    [/policy|rules|terms|disclaimer|rti/, <Scale aria-hidden="true" />],
    [/contact|feedback/, <ContactRound aria-hidden="true" />],
    [/library|publication|research|report|document|notice|tender/, <LibraryBig aria-hidden="true" />],
    [/menu|navigation|sitemap|quick link|geoportal/, <MapPinned aria-hidden="true" />],
    [/scientific/, <Microscope aria-hidden="true" />],
    [/setting|homepage|design|font|heading/, <LayoutDashboard aria-hidden="true" />],
    [/help|guide|faq/, <BookOpen aria-hidden="true" />],
    [/service/, <Wrench aria-hidden="true" />],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || <FileText aria-hidden="true" />;
};
const CollectionCardIcon = ({ collection }) => collectionIconFor(collection);
const collectionKindFor = (collection) => {
  if (collection.workspace) return "Guided page editor";
  if (collection.allowCreate === false || collection.singleton) return "Page settings";
  return "Content list";
};
const collectionActionFor = (collection) => {
  if (collection.workspace) {
    return collection.workspaceKind === "divisions" || collection.id === "division_pages"
      ? "Choose division"
      : "Choose page";
  }
  return collection.allowCreate === false || collection.singleton ? "Open editor" : "View and edit";
};

function CollectionCard({ collection, onOpen, onAdd }) {
  const total = collection.counts?.total || 0;
  const published = collection.counts?.published || 0;
  const hindi = collection.counts?.hindi || 0;
  const drafts = collection.counts?.drafts || 0;
  const canAdd = collection.allowCreate !== false && (!collection.singleton || !total);

  return (
    <article className="collection-card">
      <header className="collection-card__heading">
        <span className="collection-card__icon"><CollectionCardIcon collection={collection} /></span>
        <div>
          <span className="collection-card__kind">{collectionKindFor(collection)}</span>
          <h5>{collection.label}</h5>
        </div>
        <span className={drafts ? "count draft" : "count"} aria-label={`${total} records`}>{total}</span>
      </header>
      <p>{collection.description}</p>
      <footer>
        {total ? (
          <>
            <span>{published} visible</span>
            <span>{hindi} Hindi ready</span>
            {drafts > 0 && <span className="draft-text">{drafts} draft</span>}
          </>
        ) : <span>No items yet</span>}
      </footer>
      <div className="collection-card__actions">
        <button className="secondary" onClick={() => onOpen(collection)}>{collectionActionFor(collection)} <ChevronRight /></button>
        {canAdd && <button className="primary" onClick={() => onAdd(collection)}><Plus /> Add new</button>}
      </div>
    </article>
  );
}
const floodReportYearOf = (entry) =>
  `${entry?.dataEn?.date || ""} ${entry?.dataEn?.dateLabel || ""} ${entry?.entryKey || ""}`
    .match(/\b(?:19|20)\d{2}\b/)?.[0] || "";

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
  ["division_pages", "Division Pages and Sections", "divisions", "Choose a division, then edit the sections, lists and media shown inside its page. Create and order division directory cards separately in Division Directory Cards."],
  ["facility_pages", "Facility Pages and Sections", "facilities", "Choose a facility, then edit its descriptions, sections, images and documents."],
  ["academic_pages", "Training and Academic Pages", "academics", "Edit the Training Division and School of Geo-Informatics pages."],
];

const dedicatedPageSections = new Set(pageViewDefinitions.map(([, , sectionKey]) => sectionKey));
const aboutPagesManagedElsewhere = new Set([
  "organisational-chart",
  "our-chairman's-governing-body",
  "director's",
  "our-former",
  "scientific-manpower",
]);

const formerLeadershipRosterPageKeys = new Set([
  "our-chairman's-governing-body",
  "director's",
]);

const profileViewDefinitions = [
  ["people_scientists", "Current Scientists", "scientist", "Names, photographs, roles and full bilingual profiles shown on Scientific Manpower and scientist cards."],
  ["people_leadership", "Leadership", "leadership", "People shown on the Leadership and Governance page."],
  ["people_officials", "Government Officials", "official", "Official records and photographs shown on government-official and leadership-update cards."],
  ["people_former_scientists", "Our Formers: Former Scientists", "former", "The single editor for former-scientist cards: names, photographs, bilingual details, order, adding, and visibility."],
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
    label: "Shared People Page Text",
    description: "Edit the English and Hindi headings, introductions, back buttons and group labels used across all People and Our Formers pages.",
    allowCreate: false,
        fields: siteSettings.fields.map((field) =>
          field.name === "settings"
            ? {
                ...field,
                settingsGroupFilter: ["People and Our Formers pages"],
                settingsIntro: "Every field below controls visible text on a People or Our Formers page. Edit English and Hindi separately; shared layout values apply to both.",
              }
            : field
        ),
  };

  return [
    ...definitions.map((definition) => {
      if (definition.id !== "site_settings") return definition;
      return {
        ...definition,
        label: "Homepage, Sitemap and Shared Text",
        description: "Edit homepage section text and layout, Sitemap content, footer wording and other labels shared across the website.",
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
      "Our Formers: Chairmen and Directors",
      "Edit only the historical Former Chairmen and Former Directors cards. Former Scientists have one separate, complete editor.",
      (entry) => formerLeadershipRosterPageKeys.has(entry.entryKey)
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

const buildCanonicalViews = (definitions, publicInfoEntries) => {
  const publicInfoDefinition = definitions.find((item) => item.id === "public_info");
  const siteSettingsDefinition = definitions.find((item) => item.id === "site_settings");

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

  const canonicalDefinitions = definitions
    .filter((definition) => !["projects", "publications"].includes(definition.id))
    .map((definition) => {
    if (definition.id === "site_settings") {
      return {
        ...definition,
        fields: definition.fields.map((field) =>
          field.name === "settings"
            ? {
                ...field,
                excludeSettingsGroups: [
                  ...(field.excludeSettingsGroups || []),
                  homepageTabPageSettingsGroupLabel,
                  ...Object.values(floodSettingsGroupLabels),
                ],
              }
            : field
        ),
      };
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
        description: "Edit the official Flood report table labels, compact list controls, year menu and Flood Critical Map.",
        allowCreate: false,
        fields: siteSettingsDefinition.fields.map((field) =>
          field.name === "settings"
            ? {
                ...field,
                settingsGroupFilter: Object.values(floodSettingsGroupLabels),
                settingsIntro: "Only controls used by the official-style Flood year pages are shown here. The report table comes first; the menu years and Critical Map follow.",
              }
            : field
        ),
      }
    : null;
  const homepageTabPages = siteSettingsDefinition
    ? {
        ...siteSettingsDefinition,
        id: "homepage_tab_pages",
        storageId: "site_settings",
        label: "Objective, Approach and Activity Page Content",
        description: "Edit every heading, introduction, list and activity group shown after opening the Objective, Implementation, Approach or Sphere of Activities homepage tab.",
        allowCreate: false,
        fields: siteSettingsDefinition.fields.map((field) =>
          field.name === "settings"
            ? {
                ...field,
                settingsGroupFilter: [homepageTabPageSettingsGroupLabel],
                settingsIntro: "These fields are the live English and Hindi page content. The separate Homepage Tab Names, Icons and Order card controls only the five compact tabs on the homepage.",
              }
            : field
        ),
      }
    : null;

  return [
    ...canonicalDefinitions,
    ...(homepageTabPages ? [homepageTabPages] : []),
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
          : "Saved as Draft. It is hidden from the live website and private Preview reflects that hidden state.";
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
        <div><span>{definition.label}</span><h2>{draft.id ? definition.singleton ? `Edit ${definition.label}` : titleOf(draft) : `Add ${definition.label}`}</h2></div>
        <div className="editor-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="secondary" disabled={busy} onClick={preview}><Eye /> Private preview {language === "hi" ? "हिन्दी" : "English"}</button><button type="button" className="primary" disabled={busy} onClick={save}>{busy ? <LoaderCircle className="spin" /> : <Save />} {draft.status === "published" ? "Publish changes" : draft.status === "archived" ? "Save as archived" : "Save as draft"}</button></div>
      </header>
      <div className="editor-body">
        <aside className="editor-meta">
          <div className="editor-meta__intro"><h3>Publishing and order</h3><p>Choose whether this item is visible and where it appears before saving.</p></div>
          <div className="editor-meta__control"><label>Visibility<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="published">Published - visible</option><option value="draft">Draft - hidden</option><option value="archived">Archived - hidden</option></select></label><p>{draft.status === "published" ? "Visible on the public website after Save." : "Hidden from the public website after Save."}</p></div>
          {!definition.singleton && !definition.autoNewestFirst && <label className="display-order-field">Display order<input type="number" step="1" value={draft.sortOrder ?? ""} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value === "" ? "" : Number(event.target.value) }))} /><small>Use 0 for the first item, 1 for the second, then 2, 3, and so on. Use a different number for each item.</small></label>}
          {!definition.autoNewestFirst && <details className="editor-advanced"><summary>Advanced options</summary><label>Internal key<input value={draft.entryKey || ""} onChange={(event) => setDraft((current) => ({ ...current, entryKey: event.target.value }))} placeholder="Generated automatically" /></label><small>Internal keys connect saved content to the website. Do not change an existing key.</small></details>}
        </aside>
        <section className="editor-fields">
          <div className="editor-context">
            <span className="collection-card__icon"><Pencil /></span>
            <div><span>You are editing</span><strong>{definition.label}</strong><p>{definition.description}</p></div>
          </div>
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
            const FieldContainer = usesCompositeFieldContainer(field) ? "div" : "label";
            return <FieldContainer className={`field-row field-${field.type}${usesCompositeFieldContainer(field) ? " field-row--composite" : ""}`} key={field.name}><span>{field.label}{field.required && " *"}{field.localized === false && <small>Shared by both languages</small>}</span><small className="field-help">{fieldHelpText(field)}</small><FieldInput field={field} value={target?.[field.name]} referenceValue={referenceValue} language={language} pageData={target} referencePageData={draft.dataEn} onChange={(value) => setField(field, value)} sharedValue={sharedSettingsValue} onSharedChange={setSharedSettingsValue} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></FieldContainer>;
          })}
          {definition.fields.some((field) => !field.hidden && field.advanced) && <details className="field-advanced"><summary>Advanced page settings</summary><p>Legacy imported body, routes, source links and card appearance. Normal editing does not need these fields.</p>{definition.fields.filter((field) => !field.hidden && field.advanced).map((field) => { const target = field.localized === false || language === "en" ? draft.dataEn : draft.dataHi; const referenceValue = language === "hi" && field.localized !== false ? draft.dataEn?.[field.name] : undefined; const FieldContainer = usesCompositeFieldContainer(field) ? "div" : "label"; return <FieldContainer className={`field-row field-${field.type}${usesCompositeFieldContainer(field) ? " field-row--composite" : ""}`} key={field.name}><span>{field.label}{field.required && " *"}</span><small className="field-help">{fieldHelpText(field)}</small><FieldInput field={field} value={target?.[field.name]} referenceValue={referenceValue} language={language} pageData={target} referencePageData={draft.dataEn} onChange={(value) => setField(field, value)} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></FieldContainer>; })}</details>}
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
    ["Rename a homepage tab", "Open Homepage Tab Names, Icons and Order under Homepage, select the tab, change Visible tab name in English or Hindi, and Save. Its destination page path stays unchanged."],
    ["Edit a homepage tab page", "Open Objective, Approach and Activity Page Content under Homepage. This edits the complete English and Hindi content shown after opening Objective, Implementation, Approach or Sphere of Activities."],
    ["Change card order", "Open the item and set Display order: 0 first, 1 second, 2 third. Open website tabs update automatically after Save."],
    ["Hide content", "Change Status to Draft. Archive only when the item should leave normal editing lists."],
    ["Edit a person or fix a repeated card", "Open People and Our Formers, then choose the exact public group such as Current Scientists, Leadership, or Former Scientists. Search the name, keep the correct record and archive the extra."],
    ["Edit Our Formers", "Use Our Formers: Chairmen and Directors for those two historical groups. Use Our Formers: Former Scientists as the only place to add, edit, reorder, hide, archive, or replace a former scientist and photograph."],
    ["Add division-only profile information", "Open Division Page Sections, choose the division and Scientific Manpower. The photo and master profile remain shared; write extra English or Hindi content beside that person and Save."],
    ["Add page sections", "Open the matching page collection. Flexible page blocks provide Add item buttons for text, cards, images, galleries, tables, links, or dividers."],
    ["Change page headings", "Open Page Headings and Subheadings. Hide, rename or resize a heading or introduction for an exact route such as /gallery or a route group such as /divisions/*."],
    ["Change homepage text sizes", "Open Homepage, Sitemap and Global Text. Use Homepage default text sizes for all sections, or Homepage section size overrides for one section."],
    ["Change website fonts", "Open Website Design and Fonts. Choose a bundled font and base size from 14 to 20, then verify English, Hindi and mobile."],
    ["Upload media", "Use Upload, add meaningful alt text, and verify the result at mobile and desktop width."],
    ["Preview before publishing", "Open an item or page section, choose English or हिन्दी, then click Preview. One private preview tab stays open and updates automatically as you type, without saving or changing live content."],
    ["Publish safely", "Check spelling, dates, URLs, English, Hindi, keyboard access and mobile layout before publishing."],
  ];
  const collectionGuide = [
    ["Homepage layout, text and section sizes", "Homepage, Sitemap and Global Text controls section visibility/order, per-section sizes, Hero, About, Services, Statistics, Location, Gallery and Footer text."],
    ["Homepage cards", "Use Homepage Tab Names, Icons and Order, Services, Applications, Operational Domains, Statistics, Quick Links and Geoportals for individual rows."],
    ["Facilities", "Use Facilities only. It contains every facility detail page, section editor and shared photograph."],
    ["Create a division", "Use Divisions. Saving a new division card automatically creates its responsive page in Division Page Sections."],
    ["Division sections", "Use Division Page Sections as the single place for Projects, Publications, Research Papers, Technical Reports, Software, Hardware, Photos and every other division section."],
    ["Full pages", "Use About and Institutional Pages, Division Page Sections, Facilities, Training and Academics, or Custom Standalone Pages. A body page appears in only one of these editors."],
    ["Gallery heading", "Open Page Headings and Subheadings, then Photo Gallery. The Hide subheading / introduction control removes or restores the text below the gallery heading."],
    ["Heading visibility", "Page Headings and Subheadings controls small heading, main title, introduction and heading size by route."],
    ["Website font and base size", "Website Design and Fonts controls safe bundled English/Hindi fonts and the responsive site-wide base size."],
    ["People page headings", "People Page Headings and Labels contains the English and Hindi headings, introductions, back buttons and group labels used across all People and Our Formers pages."],
    ["People profiles", "Open the exact group shown on the website: Current Scientists, Leadership, Government Officials, Former Scientists, Technical Staff, or Administration Profiles."],
    ["Former Scientists", "Use Our Formers: Former Scientists only. It controls cards, names, photographs, bilingual details, order, adding, Draft, and Archive."],
    ["Former Chairmen and Directors", "Use Our Formers: Chairmen and Directors for these two historical card groups only."],
    ["Official public pages", "RTI, Appellate Authority, Memorandum of Association, General Service Rules, Feedback, Tenders and FAQ each have their own editor card. Page documents can be uploaded or replaced inside their section."],
    ["Flood content", "Flood Page Settings controls the official Flood report table labels, compact list controls, year menu and Flood Critical Map. Flood Reports contains every report and PDF; search a year such as 2026 to edit that season."],
    ["Site-wide content", "Header / Footer Menu, Contact, Logos and Homepage, Sitemap and Global Text."],
    ["More editors", "Administrators use Users to create, reset, deactivate and assign Editor or Administrator roles."],
  ];
  return (
    <section className="guide-view">
      <div className="guide-hero"><BookOpen /><div><span>Editor handbook</span><h2>How to update the RSAC-UP website</h2><p>Simple workflows for authorised nontechnical editors.</p></div></div>
      <div className="guide-warning"><ShieldCheck /><p><strong>Golden rule:</strong> edit English and Hindi separately. Never paste passwords, personal files, or unapproved documents into public content.</p></div>
      <div className="guide-grid">{tasks.map(([title, text], index) => <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      <div className="guide-detail"><h3>Which collection should I open?</h3><dl>{collectionGuide.map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl></div>
      <div className="guide-checklist"><h3>Before clicking Save</h3><ul><li>English and Hindi are in the correct language tabs.</li><li>Display order uses a different number for each important item.</li><li>Links and documents open.</li><li>Images have useful alt text.</li><li>Draft or Published status is intentional.</li><li>The website still works on phone and desktop.</li></ul></div>
    </section>
  );
}

const permissionGroups = [...new Set(cmsPermissionAreas.map((area) => area.group))].map((group) => ({
  group,
  areas: cmsPermissionAreas.filter((area) => area.group === group),
}));

function UsersView({ currentUser, notify }) {
  const newUserForm = () => ({
    username: "",
    displayName: "",
    role: "editor",
    active: true,
    password: "",
    permissions: createCmsPermissions(false),
  });
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const normalizedUsername = String(form?.username || "").trim().toLowerCase();
  const duplicateUsername = users.find((item) =>
    item.id !== form?.id && item.username.toLowerCase() === normalizedUsername
  );
  const load = useCallback(async () => { setBusy(true); try { setUsers((await api("/api/admin/users")).data); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } }, [notify]);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const save = async () => {
    const displayName = String(form?.displayName || "").trim();
    const password = String(form?.password || "");
    if (!displayName) {
      notify("Full name is required.", "error");
      return;
    }
    if (!normalizedUsername) {
      notify("Username is required.", "error");
      return;
    }
    if (!/^[a-z0-9._-]{3,50}$/.test(normalizedUsername)) {
      notify("Username must be 3-50 letters, numbers, dots, underscores or hyphens.", "error");
      return;
    }
    if (duplicateUsername) {
      notify(`Username '${normalizedUsername}' is already used by ${duplicateUsername.displayName}. Choose another username.`, "error");
      return;
    }
    if (!form?.role) {
      notify("Account role is required.", "error");
      return;
    }
    if (!form.id && !password) {
      notify("Password is required.", "error");
      return;
    }
    if (password && !isStrongPassword(password)) {
      notify(PASSWORD_POLICY_MESSAGE, "error");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const method = form.id ? "PUT" : "POST";
      const path = form.id ? `/api/admin/users/${form.id}` : "/api/admin/users";
      await api(path, {
        method,
        body: JSON.stringify({ ...form, username: normalizedUsername, displayName }),
      });
      notify(form.id ? "User updated." : "User created.", "success"); setForm(null); await load();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const removeUser = async (item) => {
    if (item.id === currentUser.id) {
      notify("You cannot delete the administrator account you are currently using.", "error");
      return;
    }
    const confirmed = window.confirm(
      `Delete the CMS account for ${item.displayName} (${item.username})?\n\nThis permanently removes the login. Published website content and audit history are preserved.`
    );
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await api(`/api/admin/users/${item.id}`, { method: "DELETE" });
      setForm((current) => current?.id === item.id ? null : current);
      notify(`User ${item.displayName} deleted.`, "success");
      await load();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setDeletingId("");
    }
  };
  const updateRole = (role) => {
    if (form?.id === currentUser.id && form.role === "admin" && role !== "admin") {
      notify("You cannot change your own administrator account to Editor.", "error");
      return;
    }
    if (role === "admin") {
      const existingAdministrator = users.find((item) =>
        item.role === "admin" && item.id !== form?.id
      );
      if (existingAdministrator) {
        notify(`Only one administrator is allowed. ${existingAdministrator.displayName} is already the administrator. Keep this user as an Editor.`, "error");
        return;
      }
    }
    setForm((current) => ({
      ...current,
      role,
      permissions: role === "admin" ? createCmsPermissions(true) : current.permissions,
    }));
  };
  const updatePermission = (key, checked) => setForm((current) => ({
    ...current,
    permissions: { ...current.permissions, [key]: checked },
  }));
  const setAllPermissions = (enabled) => setForm((current) => ({
    ...current,
    permissions: createCmsPermissions(enabled),
  }));
  return (
    <section className="users-view">
      <div className="section-intro"><div><h2>CMS users and permissions</h2><p>Create an account, set its first password, and choose exactly which website areas it can change. Deactivate an account temporarily, or permanently delete it when it is no longer required.</p></div><button className="primary" onClick={() => setForm(newUserForm())}><Plus /> Add user</button></div>
      {form && (
        <div className="user-form">
          <div className="user-form__heading"><div><span>Account details</span><h3>{form.id ? "Edit user" : "Create user"}</h3></div><button type="button" aria-label="Close user form" onClick={() => setForm(null)}><X /></button></div>
          {!form.id && <p className="required-fields-note"><strong>An administrator creates every new CMS user.</strong> Complete all fields marked <sup className="required-mark" aria-hidden="true">*</sup> before saving. No technical setup is needed by the new user.</p>}
          <div className="user-form-grid">
            <label><span>Full name<sup className="required-mark" aria-hidden="true">*</sup></span><small>The person's name shown in audit history.</small><input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label>
            <label><span>Username<sup className="required-mark" aria-hidden="true">*</sup></span><small>Used when signing in. It must be unique. Use letters, numbers, dots, underscores or hyphens.</small><input required minLength={3} maxLength={50} autoCapitalize="none" aria-invalid={Boolean(duplicateUsername)} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />{duplicateUsername && <small className="user-field-error" role="alert">Already used by {duplicateUsername.displayName}. Choose another username.</small>}</label>
            <label><span>Account role<sup className="required-mark" aria-hidden="true">*</sup></span><small>Only one administrator is allowed. Other accounts must use Editor permissions.</small><select required value={form.role} onChange={(event) => updateRole(event.target.value)}><option value="editor">Editor</option><option value="admin">Administrator (one account only)</option></select></label>
            <label><span>{form.id ? "Reset password (optional)" : <>First temporary password<sup className="required-mark" aria-hidden="true">*</sup></>}</span><small>{form.id ? "Leave blank to keep the current password." : "Give this password securely to the new user. They can change it after signing in."}</small><input required={!form.id} minLength={form.id ? undefined : 12} type="password" autoComplete="new-password" value={form.password || ""} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          </div>
          <label className="account-status-control"><input type="checkbox" checked={form.active !== false} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span><strong>Active account</strong><small>Turn this off to prevent sign-in without deleting the account history.</small></span></label>
          <section className="permission-editor" aria-labelledby="permission-editor-title">
            <header><div><span>Access permissions</span><h3 id="permission-editor-title">What can this user edit?</h3><p>Check Yes only for the areas this person is responsible for. Unchecked areas are hidden and blocked by the server.</p></div>{form.role === "editor" && <div className="permission-bulk-actions"><button type="button" className="secondary" onClick={() => setAllPermissions(true)}>Select all</button><button type="button" className="secondary" onClick={() => setAllPermissions(false)}>Clear all</button></div>}</header>
            {form.role === "admin" && <div className="permission-admin-note"><ShieldCheck /><span><strong>Administrator: full access</strong> All permissions are always enabled for administrator accounts.</span></div>}
            {permissionGroups.map(({ group, areas }) => (
              <fieldset key={group} disabled={form.role === "admin"}>
                <legend>{group}</legend>
                <div className="permission-grid">
                  {areas.map((area) => {
                    const checked = form.role === "admin" || form.permissions?.[area.key] === true;
                    return (
                      <label className={checked ? "permission-card selected" : "permission-card"} key={area.key}>
                        <input type="checkbox" checked={checked} onChange={(event) => updatePermission(area.key, event.target.checked)} />
                        <span><strong>{area.label}</strong><small>{area.description}</small></span>
                        <b>{checked ? "Yes" : "No"}</b>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </section>
          <p className="password-requirements">{PASSWORD_POLICY_MESSAGE}</p>
          <div className="editor-actions"><button className="secondary" onClick={() => setForm(null)}>Cancel</button><button className="primary" disabled={saving || Boolean(duplicateUsername)} onClick={save}><Save /> {saving ? "Saving..." : "Save user"}</button></div>
        </div>
      )}
      <div className="content-table-wrap">
        <table className="content-table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Access</th><th>Status</th><th>Last updated</th><th>Actions</th></tr></thead>
          <tbody>{users.map((item) => {
            const permissionCount = item.role === "admin"
              ? cmsPermissionAreas.length
              : cmsPermissionAreas.filter((area) => item.permissions?.[area.key]).length;
            return (
              <tr key={item.id}>
                <td><strong>{item.displayName}</strong>{item.id === currentUser.id && <small>Current account</small>}</td>
                <td>{item.username}</td>
                <td><span className="status published">{item.role}</span></td>
                <td><strong>{item.role === "admin" ? "All areas" : `${permissionCount} of ${cmsPermissionAreas.length}`}</strong></td>
                <td>{item.active ? <span className="language-ready"><Check /> Active</span> : <span className="language-missing">Inactive</span>}</td>
                <td>{new Date(item.updatedAt).toLocaleString()}</td>
                <td>
                  <div className="user-table-actions">
                    <button className="table-action" onClick={() => setForm({ ...item, password: "", permissions: { ...item.permissions } })}>Edit</button>
                    {item.id !== currentUser.id && (
                      <button
                        className="table-action table-action--danger"
                        disabled={deletingId === item.id}
                        onClick={() => removeUser(item)}
                        title={`Permanently delete ${item.displayName}`}
                      >
                        <Trash2 /> {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {busy && <div className="loading-bar"><LoaderCircle className="spin" /> Loading users</div>}
    </section>
  );
}

function PasswordView({ notify }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      notify("The new password and confirmation do not match.", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      notify("Your password has been changed.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="password-view">
      <div className="section-intro"><div><h2>Change my password</h2><p>Update your own sign-in password. Other signed-in sessions for your account will be closed.</p></div></div>
      <form className="password-panel" onSubmit={submit}>
        <div className="password-panel__icon"><KeyRound /></div>
        <label><span>Current password</span><input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></label>
        <label><span>New password</span><small>{PASSWORD_POLICY_MESSAGE}</small><input required minLength={12} type="password" autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /></label>
        <label><span>Confirm new password</span><input required type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
        <button className="primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Save />} Change password</button>
      </form>
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
  const [floodYear, setFloodYear] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audit, setAudit] = useState([]);
  const notify = useCallback((message, type = "info") => setNotice(message ? { message, type } : null), []);
  const loadCollections = useCallback(async (activeUser) => {
    if (!activeUser) return;
    const needsPages = pagePermissionKeys.some((key) => hasCmsPermission(activeUser, key));
    const needsPublicInfo = publicInfoPermissionKeys.some((key) => hasCmsPermission(activeUser, key));
    const needsProfiles = hasCmsPermission(activeUser, "people");
    const [collectionResult, pageResult, publicInfoResult, profileResult] = await Promise.all([
      api("/api/admin/collections"),
      needsPages ? api("/api/admin/content/pages") : Promise.resolve({ data: [] }),
      needsPublicInfo ? api("/api/admin/content/public_info") : Promise.resolve({ data: [] }),
      needsProfiles ? api("/api/admin/content/profiles") : Promise.resolve({ data: [] }),
    ]);
    const prepared = buildPeopleViews(
      buildCanonicalViews(
        buildPageViews(collectionResult.data, pageResult.data),
        publicInfoResult.data
      ),
      pageResult.data,
      profileResult.data
    );
    setCollections(prepared.filter((definition) => {
      const permission = permissionForCmsView(definition.id);
      return permission ? hasCmsPermission(activeUser, permission) : activeUser.role === "admin";
    }));
  }, []);

  useEffect(() => { api("/api/auth/me").then((result) => { setCsrfToken(result.csrfToken); setUser(result.user); return loadCollections(result.user); }).catch(() => {}).finally(() => setBooting(false)); }, [loadCollections]);
  const openView = (next) => { setView(next); setSelected(null); setEditing(null); setMenuOpen(false); };
  const openCollection = async (definition) => { setBusy(true); setSelected(definition); setEditing(null); setView(definition.workspace ? "content_workspace" : "collection"); setSearch(""); setFloodYear(""); setListPage(1); setMenuOpen(false); try { const canReadProfiles = definition.workspace && hasCmsPermission(user, "people"); const [result, peopleResult] = await Promise.all([api(`/api/admin/content/${definition.storageId || definition.id}`), canReadProfiles ? api("/api/admin/content/profiles") : Promise.resolve({ data: [] })]); const fieldFiltered = definition.filterField ? result.data.filter((entry) => entry.dataEn?.[definition.filterField] === definition.filterValue) : result.data; setEntries(definition.entryFilter ? fieldFiltered.filter(definition.entryFilter) : fieldFiltered); setProfileEntries(peopleResult.data.filter((entry) => entry.status !== "archived")); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } };
  const addNew = (definition) => { setSelected(definition); setView("collection"); setEditing("new"); setMenuOpen(false); };
  const refreshCollection = async () => { if (selected) await openCollection(selected); await loadCollections(user); };
  const archive = async (entry) => { if (!window.confirm(`Archive "${titleOf(entry)}"? It will disappear from the public website.`)) return; try { await api(`/api/admin/content/${selected.storageId || selected.id}/${entry.id}`, { method: "DELETE" }); notify("Item archived.", "success"); await refreshCollection(); } catch (error) { notify(error.message, "error"); } };
  const logout = async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch { /* expired */ } setUser(null); setCsrfToken(""); };
  const showAudit = async () => { setBusy(true); openView("audit"); try { setAudit((await api("/api/admin/audit")).data); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } };
  const saveDivisionPage = async (draft) => {
    const result = await api(`/api/admin/content/pages/${draft.id}`, { method: "PUT", body: JSON.stringify(draft) });
    setEntries((current) => current.map((entry) => entry.id === result.data.id ? result.data : entry));
    await loadCollections(user);
    return result.data;
  };
  const isFloodReportCollection =
    (selected?.storageId || selected?.id) === "flood_reports";
  const floodYears = useMemo(
    () =>
      isFloodReportCollection
        ? [...new Set(entries.map(floodReportYearOf).filter(Boolean))].sort(
            (left, right) => Number(right) - Number(left)
          )
        : [],
    [entries, isFloodReportCollection]
  );
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) =>
      (!floodYear || floodReportYearOf(entry) === floodYear) &&
      (!query ||
        `${titleOf(entry)} ${entry.entryKey} ${JSON.stringify(entry.dataEn || {})} ${JSON.stringify(entry.dataHi || {})}`
          .toLowerCase()
          .includes(query))
    );
  }, [entries, floodYear, search]);
  const activePageSize = isFloodReportCollection
    ? FLOOD_REPORT_PAGE_SIZE
    : CONTENT_PAGE_SIZE;
  const totalListPages = Math.max(1, Math.ceil(filteredEntries.length / activePageSize));
  const safeListPage = Math.min(listPage, totalListPages);
  const pagedEntries = useMemo(
    () => filteredEntries.slice(
      (safeListPage - 1) * activePageSize,
      safeListPage * activePageSize
    ),
    [activePageSize, filteredEntries, safeListPage]
  );
  const profileDuplicatePairs = useMemo(() => selected?.storageId === "profiles" ? findDuplicateProfilePairs(entries) : [], [entries, selected]);
  const visibleGroups = useMemo(() => {
    const query = collectionSearch.trim().toLowerCase();
    return cmsGroups
      .map((group) => {
        const sections = group.sections
          .map((section) => ({
            ...section,
            items: section.ids
              .map((id) => collections.find((item) => item.id === id))
              .filter(Boolean)
              .filter((item) => !query || `${item.label} ${item.description} ${group.title} ${section.title}`.toLowerCase().includes(query)),
          }))
          .filter((section) => section.items.length);
        return { ...group, sections, items: sections.flatMap((section) => section.items) };
      })
      .filter((group) => group.items.length);
  }, [collections, collectionSearch]);

  if (booting) return <div className="full-loader"><LoaderCircle className="spin" /><span>Opening secure CMS...</span></div>;
  if (!user) return <Login onLogin={(nextUser) => { setUser(nextUser); loadCollections(nextUser); }} />;
  if (editing) return <><EntryEditor definition={selected} entry={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refreshCollection(); }} notify={notify} />{notice && <div className={`toast ${notice.type}`}><span>{notice.message}</span><button onClick={() => setNotice(null)}><X /></button></div>}</>;

  const navButton = (id, icon, label, action = () => openView(id)) => (
    <button
      className={view === id ? "active" : ""}
      onClick={() => {
        action();
        setMenuOpen(false);
      }}
    >
      {icon}{label}
    </button>
  );
  return (
    <div className="admin-app">
      <aside className={menuOpen ? "main-sidebar open" : "main-sidebar"}>
        <div className="government-brand"><img src={upEmblem} alt="Uttar Pradesh emblem" /><span>उत्तर प्रदेश सरकार<br />Government of Uttar Pradesh</span></div>
        <div className="brand"><div><strong>RSAC-UP</strong><span>Content Management</span></div></div>
        <nav>{navButton("dashboard", <LayoutDashboard />, "Edit website")}{navButton("guide", <BookOpen />, "Editor guide")}{hasCmsPermission(user, "feedback") && navButton("feedback", <MessageSquare />, "Website feedback")}{hasCmsPermission(user, "audit") && navButton("audit", <History />, "Audit history", showAudit)}{user.role === "admin" && navButton("users", <Users />, "CMS users")}{navButton("password", <KeyRound />, "My password")}</nav>
        <div className="compliance-note"><ShieldCheck /><span>Accessible editing<br />Audit enabled</span></div>
        <div className="sidebar-user"><span>{user.displayName}</span><small>{user.role}</small><button onClick={logout}><LogOut /> Sign out</button></div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" type="button" aria-label="Close CMS navigation" onClick={() => setMenuOpen(false)} />}
      <main className="main-content">
        <header className="top-header"><button className="menu-button" aria-label={menuOpen ? "Close CMS navigation" : "Open CMS navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu /></button><div><span>RSAC-UP Content Management</span><h1>{view === "dashboard" ? "Edit website" : view === "content_workspace" ? selected?.label : view === "collection" ? selected?.label : view === "guide" ? "Editor guide" : view === "feedback" ? "Website feedback" : view === "users" ? "User management" : view === "password" ? "My password" : "Audit history"}</h1></div><img className="top-header-logo" src={rsacLogo} alt="RSAC-UP logo" /></header>
        {notice && <div className={`page-notice ${notice.type}`}><span>{notice.message}</span><button onClick={() => setNotice(null)}><X /></button></div>}
        {view === "collection" && selected?.storageId === "profiles" && profileDuplicatePairs.length > 0 && <div className="page-notice error" role="alert"><span><strong>{profileDuplicatePairs.length} possible duplicate profile pair(s).</strong> Search these names, edit the correct record, then archive the extra: {profileDuplicatePairs.map(({ left, right }) => `${titleOf(left)} / ${titleOf(right)}`).join("; ")}</span></div>}
        {busy && <div className="loading-bar"><LoaderCircle className="spin" /> Loading</div>}
        {view === "dashboard" && (
          <section className="dashboard">
            <div className="section-intro dashboard-intro">
              <div>
                <span className="section-kicker">Website editor</span>
                <h2>What do you want to change?</h2>
                <p>Choose the website area first, then open the clearly named editor for that content.</p>
              </div>
            </div>
            <div className="dashboard-find">
              <div className="collection-search">
                <Search />
                <input
                  value={collectionSearch}
                  onChange={(event) => setCollectionSearch(event.target.value)}
                  placeholder="Search website areas..."
                  aria-label="Search website editing areas"
                />
              </div>
              {!collectionSearch && (
                <nav className="collection-directory" aria-label="Website editing areas">
                  {visibleGroups.map((group) => (
                    <a href={`#cms-group-${group.id}`} key={group.id}>
                      <span>{group.title}</span>
                      <small>{group.items.length}</small>
                    </a>
                  ))}
                </nav>
              )}
            </div>
            {visibleGroups.map((group) => (
              <section className="collection-group" id={`cms-group-${group.id}`} key={group.id}>
                <header className="collection-group__header">
                  <span>{group.items.length} editing {group.items.length === 1 ? "area" : "areas"}</span>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </header>
                {group.sections.map((section) => (
                  <div className="collection-subgroup" key={section.title}>
                    <div className="collection-subgroup__heading">
                      <h4>{section.title}</h4>
                      <p>{section.description}</p>
                    </div>
                    <div className="collection-grid">
                      {section.items.map((collection) => (
                        <CollectionCard collection={collection} onOpen={openCollection} onAdd={addNew} key={collection.id} />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
            {!visibleGroups.length && <div className="empty-panel">No matching website area was found. Try a shorter search, or ask an administrator to check your editing permissions.</div>}
          </section>
        )}
        {view === "content_workspace" && selected && <Suspense fallback={<div className="loading-state"><LoaderCircle className="spin" /> Opening section editor</div>}><DivisionContentWorkspace key={selected.id} pages={entries} profiles={profileEntries} workspaceKind={selected.workspaceKind || selected.filterValue} sectionFilter={selected.sectionFilter} onSave={saveDivisionPage} onClose={() => openView("dashboard")} onOpenPeople={() => { const definition = collections.find((item) => item.id === "people_scientists"); if (definition) openCollection(definition); }} notify={notify} /></Suspense>}
        {view === "collection" && selected && (
          <section className={`collection-view ${isFloodReportCollection ? "collection-view--flood" : ""}`}>
            <div className="collection-view__intro">
              <span className="collection-card__icon"><CollectionCardIcon collection={selected} /></span>
              <div><span>{collectionKindFor(selected)}</span><h2>{selected.label}</h2><p>{selected.description}</p></div>
            </div>
            <div className="collection-tools">
              <button className="back-button" onClick={() => openView("dashboard")}>
                <ArrowLeft /> All website areas
              </button>
              <div className="search">
                <Search />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setListPage(1);
                  }}
                  placeholder={
                    isFloodReportCollection
                      ? "Search title, district, date or year"
                      : "Search title or text in English or Hindi"
                  }
                />
              </div>
              {isFloodReportCollection && (
                <label className="flood-year-filter">
                  <span>Report year</span>
                  <select
                    value={floodYear}
                    onChange={(event) => {
                      setFloodYear(event.target.value);
                      setListPage(1);
                    }}
                  >
                    <option value="">All years</option>
                    {floodYears.map((year) => (
                      <option value={year} key={year}>{year}</option>
                    ))}
                  </select>
                </label>
              )}
              {selected.allowCreate !== false &&
                (!selected.singleton ||
                  !entries.some((entry) => entry.status !== "archived")) && (
                  <button className="primary" onClick={() => setEditing("new")}>
                    <Plus /> Add new
                  </button>
                )}
            </div>
            <div className="sort-help">
              <RefreshCw />
              {selected.id === "division_pages"
                ? "Choose a division, then open one section. English and Hindi remain separate."
                : isFloodReportCollection
                  ? "Choose a year or search for a report. Only 20 records are shown at once, and each PDF remains in its own editable record."
                  : selected.autoNewestFirst
                    ? "New items appear first automatically and are numbered from 1."
                    : "Display order controls the sequence: 0 first, then 1, 2, 3, and so on."}
              {" "}Open website tabs update automatically after published changes.
            </div>
            <div className="content-table-wrap">
              <table className="content-table">
                <thead>
                  <tr>
                    <th>Content</th>
                    <th>English</th>
                    <th>Hindi</th>
                    <th>Status</th>
                    <th>Display order</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pagedEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td data-label="Content">
                        <strong>{titleOf(entry)}</strong>
                        {isFloodReportCollection && entry.dataEn?.dateLabel && (
                          <small>{entry.dataEn.dateLabel}{entry.dataEn?.coverage ? ` · ${entry.dataEn.coverage}` : ""}</small>
                        )}
                      </td>
                      <td data-label="English">
                        {hasLanguage(entry, "dataEn")
                          ? <span className="language-ready"><Check /> Ready</span>
                          : <span className="language-missing">Missing</span>}
                      </td>
                      <td data-label="Hindi">
                        {hasLanguage(entry, "dataHi")
                          ? <span className="language-ready"><Check /> Ready</span>
                          : <span className="language-missing">Missing</span>}
                      </td>
                      <td data-label="Status">
                        <span className={`status ${entry.status}`}>{entry.status}</span>
                      </td>
                      <td data-label="Display order">
                        {selected.autoNewestFirst ? "Auto" : entry.sortOrder}
                      </td>
                      <td className="content-actions">
                        <div className="row-actions">
                          <button onClick={() => setEditing(entry)}>
                            {selected.id === "division_pages"
                              ? <><ChevronRight /> Open sections</>
                              : <><Pencil /> Edit</>}
                          </button>
                          {selected.id !== "division_pages" &&
                            entry.status !== "archived" && (
                              <button
                                className="archive"
                                aria-label={`Archive ${titleOf(entry)}`}
                                title="Archive"
                                onClick={() => archive(entry)}
                              >
                                <Archive />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredEntries.length && (
                    <tr>
                      <td colSpan="6" className="empty-row">No content found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredEntries.length > activePageSize && (
              <nav className="content-pagination" aria-label="Content pages">
                <button
                  className="secondary"
                  disabled={safeListPage === 1}
                  onClick={() => setListPage((current) => Math.max(1, current - 1))}
                >
                  <ArrowLeft /> Previous
                </button>
                <span>
                  Page {safeListPage} of {totalListPages} · {filteredEntries.length} items
                </span>
                <button
                  className="secondary"
                  disabled={safeListPage === totalListPages}
                  onClick={() =>
                    setListPage((current) =>
                      Math.min(totalListPages, current + 1)
                    )
                  }
                >
                  Next <ChevronRight />
                </button>
              </nav>
            )}
          </section>
        )}
        {view === "guide" && <GuideView />}
        {view === "feedback" && <FeedbackView notify={notify} />}
        {view === "users" && user.role === "admin" && <UsersView currentUser={user} notify={notify} />}
        {view === "password" && <PasswordView notify={notify} />}
        {view === "audit" && <section className="audit-view"><div className="section-intro"><div><h2>Recent editor activity</h2><p>Who changed which website area and when.</p></div></div><div className="content-table-wrap"><table className="content-table"><thead><tr><th>Time</th><th>Editor</th><th>Action</th><th>Collection</th><th>Item key</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.display_name || item.username || "System"}</td><td><span className="status published">{item.action}</span></td><td>{item.collection || "-"}</td><td>{item.entry_key || "-"}</td></tr>)}</tbody></table></div></section>}
      </main>
    </div>
  );
}
