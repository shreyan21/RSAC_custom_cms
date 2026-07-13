import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowLeft, BookOpen, Check, ChevronRight, ExternalLink, FileText,
  History, Languages, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageSquare,
  Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Users, X,
} from "lucide-react";
import upEmblem from "../../src/assets/images/up-emblem.webp";
import { api, setCsrfToken, websiteUrl } from "./api";
import DivisionContentWorkspace from "./DivisionContentWorkspace";
import FieldInput from "./FieldInput";

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
  ["about_pages", "About Pages", "about-us", "Chairman, vision, organisation and institutional pages."],
  ["division_pages", "Division Content", "divisions", "Choose a division, then open only Research Papers, Projects, Reports, Software, Hardware, Photos, or another section."],
  ["facility_pages", "Facilities", "facilities", "All facility pages, descriptions, images and flexible page blocks."],
  ["academic_pages", "Training and Academics", "academics", "Training Division and School of Geo-Informatics pages."],
];

const buildPageViews = (definitions, pageEntries) => {
  const pages = definitions.find((item) => item.id === "pages");
  if (!pages) return definitions;
  const views = pageViewDefinitions.map(([id, label, sectionKey, description]) => {
    const matching = pageEntries.filter((entry) => entry.dataEn?.sectionKey === sectionKey && entry.status !== "archived");
    return {
      ...pages,
      id,
      storageId: "pages",
      label,
      description,
      filterField: "sectionKey",
      filterValue: sectionKey,
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
  return [...definitions, ...views];
};

const groups = [
  { title: "Homepage", ids: ["site_settings", "hero_banners", "homepage_features", "services", "applications", "operational_domains", "impact_stats", "quick_links", "geoportals"] },
  { title: "Pages", ids: ["about_pages", "division_pages", "facility_pages", "academic_pages", "pages"] },
  { title: "Navigation and appearance", ids: ["page_sections", "page_display_settings", "design_settings", "menu_items", "contact", "logos"] },
  { title: "Divisions and people", ids: ["divisions", "facilities", "division_section_items", "projects", "publications", "profiles", "manpower", "organisation_roles"] },
  { title: "Public information", ids: ["public_info", "policies", "notices", "tenders", "faq", "downloads", "flood_reports", "gallery", "mobile_apps"] },
];

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
        <div className="government-identity"><img src={upEmblem} alt="Government of Uttar Pradesh emblem" /><span>Government of Uttar Pradesh</span></div>
        <div className="identity-mark"><ShieldCheck /><div><strong>RSAC-UP</strong><span>Custom Content Management</span></div></div>
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
  const setField = (field, value) => {
    const target = field.localized === false || language === "en" ? "dataEn" : "dataHi";
    setDraft((current) => ({ ...current, [target]: { ...current[target], [field.name]: value } }));
  };
  const save = async () => {
    setBusy(true); notify("");
    try {
      const payload = structuredClone(draft);
      if ((definition.storageId || definition.id) === "pages") {
        payload.dataEn.sectionKey ||= definition.presetDataEn?.sectionKey || "about-us";
        payload.dataEn.slug ||= slugify(payload.dataEn.title);
      }
      const storageId = definition.storageId || definition.id;
      const method = payload.id ? "PUT" : "POST";
      const path = payload.id ? `/api/admin/content/${storageId}/${payload.id}` : `/api/admin/content/${storageId}`;
      const result = await api(path, { method, body: JSON.stringify(payload) });
      notify(payload.status === "published" ? "Published. Website will refresh within a few seconds." : "Saved as Draft. It is not visible on website.", "success");
      onSaved(result.data);
    } catch (error) { notify(error.message, "error"); }
    finally { setBusy(false); }
  };
  return (
    <div className="editor-shell">
      <header className="editor-head">
        <button type="button" className="back-button" onClick={onClose}><ArrowLeft /> Back</button>
        <div><span>{definition.label}</span><h2>{draft.id ? titleOf(draft) : `Add ${definition.label}`}</h2></div>
        <div className="editor-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={busy} onClick={save}>{busy ? <LoaderCircle className="spin" /> : <Save />} Save</button></div>
      </header>
      <div className="editor-body">
        <aside className="editor-meta">
          <h3>Publishing</h3>
          <label>Visibility<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="published">Published - visible</option><option value="draft">Draft - hidden</option><option value="archived">Archived</option></select></label>
          <p>{draft.status === "published" ? "Changes become public after Save." : "Draft content stays hidden from website."}</p>
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
            return <label className={`field-row field-${field.type}`} key={field.name}><span>{field.label}{field.required && " *"}{field.localized === false && <small>Shared by both languages</small>}</span><FieldInput field={field} value={target?.[field.name]} onChange={(value) => setField(field, value)} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></label>;
          })}
          {definition.fields.some((field) => !field.hidden && field.advanced) && <details className="field-advanced"><summary>Advanced page settings</summary><p>Legacy imported body, routes, source links and card appearance. Normal editing does not need these fields.</p>{definition.fields.filter((field) => !field.hidden && field.advanced).map((field) => { const target = field.localized === false || language === "en" ? draft.dataEn : draft.dataHi; return <label className={`field-row field-${field.type}`} key={field.name}><span>{field.label}{field.required && " *"}</span><FieldInput field={field} value={target?.[field.name]} onChange={(value) => setField(field, value)} onBusy={setBusy} onError={(message) => notify(message, message ? "error" : "")} /></label>; })}</details>}
        </section>
      </div>
    </div>
  );
}

function GuideView() {
  const tasks = [
    ["Edit one division section", "Open Division Content, select a division, then open only Research Papers, Projects, Reports, Software, Hardware, Photos, or another section. Search, edit, remove, restore, or add a row at the top."],
    ["Add division research or projects", "Open Division List Items, click Add new, choose the division and website section, complete English and Hindi, set Published, then Save. New items become number 1 automatically."],
    ["Change text", "Open the matching collection, search the item, edit English, then हिन्दी, and Save."],
    ["Change card order", "Open Advanced options and set Sort order: 0 first, 1 second, 2 third. Website refreshes within a few seconds."],
    ["Hide content", "Change Status to Draft. Archive only when the item should leave normal editing lists."],
    ["Fix a repeated person card", "Open Scientists / Officials / Staff, search the name, keep the correct record and archive the extra. For an imported Our Formers card, open About Pages, choose that page, open Page heading and layout, then enter the exact unwanted name under Hide profile cards."],
    ["Add page sections", "Open the matching page collection. Flexible page blocks provide Add item buttons for text, cards, images, galleries, tables, links, or dividers."],
    ["Change page headings", "Open Page Headings and Subheadings. Hide, rename or resize a heading or introduction for an exact route such as /gallery or a route group such as /divisions/*."],
    ["Change website fonts", "Open Design Settings. Choose bundled fonts and a base size from 14 to 20, then verify English, Hindi and mobile."],
    ["Upload media", "Use Upload, add meaningful alt text, and verify the result at mobile and desktop width."],
    ["Publish safely", "Check spelling, dates, URLs, English, Hindi, keyboard access and mobile layout before publishing."],
  ];
  return (
    <section className="guide-view">
      <div className="guide-hero"><BookOpen /><div><span>Editor handbook</span><h2>How to update the RSAC-UP website</h2><p>Simple workflows for authorised nontechnical editors.</p></div></div>
      <div className="guide-warning"><ShieldCheck /><p><strong>Golden rule:</strong> edit English and Hindi separately. Never paste passwords, personal files, or unapproved documents into public content.</p></div>
      <div className="guide-grid">{tasks.map(([title, text], index) => <article key={title}><span>{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      <div className="guide-detail"><h3>Which collection should I open?</h3><dl><div><dt>Homepage layout and text</dt><dd>Homepage and Global Text controls section visibility/order, Hero, About, Services, Statistics, Location, Gallery and Footer text.</dd></div><div><dt>Homepage cards</dt><dd>Use Homepage Feature Tabs, Services, Applications, Operational Domains, Statistics, Quick Links and Geoportals for individual rows.</dd></div><div><dt>Facilities</dt><dd>Facilities under Pages contains all ten facility detail pages. Use Add new for another facility.</dd></div><div><dt>Division cards</dt><dd>Divisions. Sort order also controls the division page cards.</dd></div><div><dt>Existing division sections</dt><dd>Division Content. Choose one division and open only the exact section you need.</dd></div><div><dt>New division list record</dt><dd>Division List Items. It provides a detailed form for research papers, completed projects, ongoing projects, technical reports, publications and training lists.</dd></div><div><dt>Full pages</dt><dd>About Pages, Division Content, Facilities, Training and Academics, or All Website Pages.</dd></div><div><dt>Gallery heading</dt><dd>Open Page Headings and Subheadings, then Photo Gallery. The Hide subheading / introduction control removes or restores the text below the gallery heading.</dd></div><div><dt>Heading visibility</dt><dd>Page Headings and Subheadings controls small heading, main title, introduction and heading size by route.</dd></div><div><dt>Fonts and text size</dt><dd>Design Settings controls safe bundled English/Hindi fonts and responsive base size.</dd></div><div><dt>People</dt><dd>Scientists / Officials / Staff, Manpower and Organisation Chart.</dd></div><div><dt>Public updates</dt><dd>Notices, Tenders, FAQ, Downloads, Flood Reports and Gallery.</dd></div><div><dt>Site-wide content</dt><dd>Header / Footer Menu, Contact, Logos and Homepage and Global Text.</dd></div><div><dt>More editors</dt><dd>Administrators use Users to create, reset, deactivate and assign Editor or Administrator roles.</dd></div></dl></div>
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
  useEffect(() => { api("/api/admin/feedback").then((result) => setItems(result.data)).catch((error) => notify(error.message, "error")); }, [notify]);
  return <section className="feedback-view"><div className="section-intro"><div><h2>Website feedback</h2><p>Responses submitted through the public feedback form.</p></div></div><div className="feedback-list">{items.map((item) => <article key={item.id}><header><strong>{item.name}</strong><span>{new Date(item.created_at).toLocaleString()}</span></header><p>{item.comments}</p><footer>{[item.email, item.phone, item.district, item.state].filter(Boolean).join(" · ")}</footer></article>)}{!items.length && <div className="empty-panel">No feedback received.</div>}</div></section>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [audit, setAudit] = useState([]);
  const notify = useCallback((message, type = "info") => setNotice(message ? { message, type } : null), []);
  const loadCollections = useCallback(async () => {
    const [collectionResult, pageResult] = await Promise.all([
      api("/api/admin/collections"),
      api("/api/admin/content/pages"),
    ]);
    setCollections(buildPageViews(collectionResult.data, pageResult.data));
  }, []);

  useEffect(() => { api("/api/auth/me").then((result) => { setCsrfToken(result.csrfToken); setUser(result.user); return loadCollections(); }).catch(() => {}).finally(() => setBooting(false)); }, [loadCollections]);
  const openView = (next) => { setView(next); setSelected(null); setEditing(null); setMenuOpen(false); };
  const openCollection = async (definition) => { setBusy(true); setSelected(definition); setEditing(null); setView(definition.workspace ? "content_workspace" : "collection"); setSearch(""); setMenuOpen(false); try { const result = (await api(`/api/admin/content/${definition.storageId || definition.id}`)).data; setEntries(definition.filterField ? result.filter((entry) => entry.dataEn?.[definition.filterField] === definition.filterValue) : result); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } };
  const addNew = (definition) => { setSelected(definition); setView("collection"); setEditing("new"); setMenuOpen(false); };
  const refreshCollection = async () => { if (selected) await openCollection(selected); await loadCollections(); };
  const archive = async (entry) => { if (!window.confirm(`Archive "${titleOf(entry)}"? It will disappear from the public website.`)) return; try { await api(`/api/admin/content/${selected.storageId || selected.id}/${entry.id}`, { method: "DELETE" }); notify("Item archived.", "success"); await refreshCollection(); } catch (error) { notify(error.message, "error"); } };
  const logout = async () => { try { await api("/api/auth/logout", { method: "POST" }); } catch { /* expired */ } setUser(null); setCsrfToken(""); };
  const showAudit = async () => { setBusy(true); openView("audit"); try { setAudit((await api("/api/admin/audit")).data); } catch (error) { notify(error.message, "error"); } finally { setBusy(false); } };
  const saveDivisionPage = async (draft) => {
    const result = await api(`/api/admin/content/pages/${draft.id}`, { method: "PUT", body: JSON.stringify(draft) });
    setEntries((current) => current.map((entry) => entry.id === result.data.id ? result.data : entry));
    return result.data;
  };
  const filteredEntries = useMemo(() => entries.filter((entry) => `${titleOf(entry)} ${entry.entryKey}`.toLowerCase().includes(search.toLowerCase())), [entries, search]);
  const profileDuplicatePairs = useMemo(() => selected?.id === "profiles" ? findDuplicateProfilePairs(entries) : [], [entries, selected]);
  const visibleGroups = useMemo(() => groups.map((group) => ({ ...group, items: group.ids.map((id) => collections.find((item) => item.id === id)).filter(Boolean).filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(collectionSearch.toLowerCase())) })).filter((group) => group.items.length), [collections, collectionSearch]);

  if (booting) return <div className="full-loader"><LoaderCircle className="spin" /><span>Opening secure CMS...</span></div>;
  if (!user) return <Login onLogin={(nextUser) => { setUser(nextUser); loadCollections(); }} />;
  if (editing) return <><EntryEditor definition={selected} entry={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refreshCollection(); }} notify={notify} />{notice && <div className={`toast ${notice.type}`}><span>{notice.message}</span><button onClick={() => setNotice(null)}><X /></button></div>}</>;

  const divisionWorkspaceDefinition = collections.find((item) => item.id === "division_pages");
  const navButton = (id, icon, label, action = () => openView(id)) => <button className={view === id ? "active" : ""} onClick={action}>{icon}{label}</button>;
  return (
    <div className="admin-app">
      <aside className={menuOpen ? "main-sidebar open" : "main-sidebar"}>
        <div className="government-brand"><img src={upEmblem} alt="Uttar Pradesh emblem" /><span>उत्तर प्रदेश सरकार<br />Government of Uttar Pradesh</span></div>
        <div className="brand"><ShieldCheck /><div><strong>RSAC-UP</strong><span>Content Management</span></div></div>
        <nav>{navButton("dashboard", <LayoutDashboard />, "Collections")}{divisionWorkspaceDefinition && navButton("content_workspace", <FileText />, "Division content", () => openCollection(divisionWorkspaceDefinition))}{navButton("guide", <BookOpen />, "Editor guide")}{navButton("feedback", <MessageSquare />, "Website feedback")}{navButton("audit", <History />, "Audit history", showAudit)}{user.role === "admin" && navButton("users", <Users />, "CMS users")}</nav>
        <div className="compliance-note"><ShieldCheck /><span>Accessible editing<br />Audit enabled</span></div>
        <div className="sidebar-user"><span>{user.displayName}</span><small>{user.role}</small><button onClick={logout}><LogOut /> Sign out</button></div>
      </aside>
      <main className="main-content">
        <header className="top-header"><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button><div><span>RSAC-UP Custom CMS</span><h1>{view === "dashboard" ? "Website collections" : view === "content_workspace" ? selected?.label : view === "collection" ? selected?.label : view === "guide" ? "Editor guide" : view === "feedback" ? "Website feedback" : view === "users" ? "User management" : "Audit history"}</h1></div><a className="website-link" href={websiteUrl} target="_blank" rel="noreferrer">Open website <ExternalLink /></a></header>
        {notice && <div className={`page-notice ${notice.type}`}><span>{notice.message}</span><button onClick={() => setNotice(null)}><X /></button></div>}
        {view === "collection" && selected?.id === "profiles" && profileDuplicatePairs.length > 0 && <div className="page-notice error" role="alert"><span><strong>{profileDuplicatePairs.length} possible duplicate profile pair(s).</strong> Search these names, edit the correct record, then archive the extra: {profileDuplicatePairs.map(({ left, right }) => `${titleOf(left)} / ${titleOf(right)}`).join("; ")}</span></div>}
        {busy && <div className="loading-bar"><LoaderCircle className="spin" /> Loading</div>}
        {view === "dashboard" && <section className="dashboard"><div className="section-intro"><div><h2>What do you want to edit?</h2><p>Choose website area, then edit an item or add new content.</p></div><button className="secondary" onClick={loadCollections}><RefreshCw /> Refresh</button></div><div className="collection-search"><Search /><input value={collectionSearch} onChange={(event) => setCollectionSearch(event.target.value)} placeholder="Search: facilities, gallery, division, footer..." /></div>{visibleGroups.map((group) => <section className="collection-group" key={group.title}><h3>{group.title}</h3><div className="collection-grid">{group.items.map((collection) => <article className="collection-card" key={collection.id}><div><FileText /><span className={collection.counts?.drafts ? "count draft" : "count"}>{collection.counts?.total || 0}</span></div><h4>{collection.label}</h4><p>{collection.description}</p><footer><span>{collection.counts?.hindi || 0} Hindi</span><span>{collection.counts?.published || 0} visible</span></footer><div className="collection-card__actions"><button className="secondary" onClick={() => openCollection(collection)}>{collection.workspace ? collection.id === "division_pages" ? "Choose division" : "Choose page" : "View and edit"} <ChevronRight /></button>{collection.allowCreate !== false && (!collection.singleton || !collection.counts?.total) && <button className="primary" onClick={() => addNew(collection)}><Plus /> Add new</button>}</div></article>)}</div></section>)}</section>}
        {view === "content_workspace" && selected && <DivisionContentWorkspace pages={entries} workspaceKind={selected.filterValue} onSave={saveDivisionPage} onClose={() => openView("dashboard")} onOpenPeople={() => { const definition = collections.find((item) => item.id === "profiles"); if (definition) openCollection(definition); }} onOpenGallery={() => { const definition = collections.find((item) => item.id === "gallery"); if (definition) openCollection(definition); }} notify={notify} />}
        {view === "collection" && selected && <section className="collection-view"><div className="collection-tools"><button className="back-button" onClick={() => openView("dashboard")}><ArrowLeft /> Collections</button><div className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or key" /></div>{selected.allowCreate !== false && (!selected.singleton || !entries.some((entry) => entry.status !== "archived")) && <button className="primary" onClick={() => setEditing("new")}><Plus /> Add new</button>}</div><div className="sort-help"><RefreshCw /> {selected.id === "division_pages" ? "Choose a division, then open one section. English and Hindi remain separate." : selected.autoNewestFirst ? "New items appear first automatically and are numbered from 1." : "Lower Sort order appears first."} Published changes appear on website within a few seconds.</div><div className="content-table-wrap"><table className="content-table"><thead><tr><th>Content</th><th>English</th><th>Hindi</th><th>Status</th><th>Order</th><th /></tr></thead><tbody>{filteredEntries.map((entry) => <tr key={entry.id}><td data-label="Content"><strong>{titleOf(entry)}</strong><small>{entry.entryKey}</small></td><td data-label="English">{hasLanguage(entry, "dataEn") ? <span className="language-ready"><Check /> Ready</span> : <span className="language-missing">Missing</span>}</td><td data-label="Hindi">{hasLanguage(entry, "dataHi") ? <span className="language-ready"><Check /> Ready</span> : <span className="language-missing">Missing</span>}</td><td data-label="Status"><span className={`status ${entry.status}`}>{entry.status}</span></td><td data-label="Order">{selected.autoNewestFirst ? "Auto" : entry.sortOrder}</td><td className="content-actions"><div className="row-actions"><button onClick={() => setEditing(entry)}>{selected.id === "division_pages" ? <><ChevronRight /> Open sections</> : <><Pencil /> Edit</>}</button>{selected.id !== "division_pages" && entry.status !== "archived" && <button className="archive" aria-label={`Archive ${titleOf(entry)}`} title="Archive" onClick={() => archive(entry)}><Archive /></button>}</div></td></tr>)}{!filteredEntries.length && <tr><td colSpan="6" className="empty-row">No content found.</td></tr>}</tbody></table></div></section>}
        {view === "guide" && <GuideView />}
        {view === "feedback" && <FeedbackView notify={notify} />}
        {view === "users" && user.role === "admin" && <UsersView currentUser={user} notify={notify} />}
        {view === "audit" && <section className="audit-view"><div className="section-intro"><div><h2>Recent editor activity</h2><p>Who changed which website area and when.</p></div></div><div className="content-table-wrap"><table className="content-table"><thead><tr><th>Time</th><th>Editor</th><th>Action</th><th>Collection</th><th>Item key</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.display_name || item.username || "System"}</td><td><span className="status published">{item.action}</span></td><td>{item.collection || "-"}</td><td>{item.entry_key || "-"}</td></tr>)}</tbody></table></div></section>}
      </main>
    </div>
  );
}
