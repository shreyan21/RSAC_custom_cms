import { useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import BlockEditor from "./BlockEditor";
import { api, mediaPreviewUrl } from "./api";

function JsonEditor({ field, value, onChange, onError }) {
  const [text, setText] = useState(() => typeof value === "string" ? value : JSON.stringify(value || {}, null, 2));
  const commit = () => {
    try {
      onChange(JSON.parse(text));
      onError("");
    } catch {
      onError(`${field.label}: invalid JSON`);
    }
  };
  return <textarea className="code-input" rows="14" value={text} onChange={(event) => setText(event.target.value)} onBlur={commit} />;
}

const settingsGroups = [
  {
    label: "Homepage hero",
    fields: [
      ["hero.eyebrow", "Small heading"],
      ["hero.title", "Main heading"],
      ["hero.accentTitle", "Highlighted heading"],
      ["hero.highlights", "Hero description lines", "list"],
      ["hero.stats", "Hero statistics", "rows", [["label", "Label"], ["value", "Value"]]],
      ["hero.domains", "Domain labels", "list"],
      ["hero.capabilityTags", "Capability labels", "rows", [["label", "Label"], ["icon", "Icon name"]]],
      ["hero.leaders", "Leader portraits", "rows", [["name", "Name"], ["role", "Role"], ["alt", "Image description"], ["image", "Portrait", "media"], ["objectPosition", "Photo position"]]],
      ["hero.primaryAction.label", "Primary button label"],
      ["hero.primaryAction.path", "Primary button path"],
      ["hero.secondaryAction.label", "Secondary button label"],
      ["hero.secondaryAction.path", "Secondary button path"],
    ],
  },
  {
    label: "Homepage text sizes",
    fields: [
      ["appearance.homeHeadingSize", "Section heading size", "select", [["compact", "Small"], ["normal", "Normal"], ["large", "Large"]]],
      ["appearance.homeBodySize", "Paragraph and card text size", "select", [["compact", "Small"], ["normal", "Normal"], ["large", "Large"]]],
    ],
  },
  {
    label: "Operational domains section",
    fields: [
      ["missionPulse.eyebrow", "Small heading"],
      ["missionPulse.title", "Main heading"],
      ["missionPulse.description", "Introduction", "textarea"],
      ["missionPulse.hint", "Editor hint shown on website", "textarea"],
      ["missionPulse.panelHeading", "Opened-card heading"],
      ["missionPulse.panelCloseLabel", "Close button label"],
      ["missionPulse.panelLinkLabel", "Division link label"],
      ["missionPulse.cardViewLabel", "Closed card label"],
      ["missionPulse.cardOpenLabel", "Open card label"],
      ["missionPulse.primaryAction.label", "Primary button label"],
      ["missionPulse.primaryAction.path", "Primary button path"],
      ["missionPulse.secondaryAction.label", "Secondary button label"],
      ["missionPulse.secondaryAction.path", "Secondary button path"],
    ],
  },
  {
    label: "About section",
    fields: [
      ["about.eyebrow", "Small heading"],
      ["about.title", "Section heading"],
      ["about.body", "Description", "textarea"],
      ["about.capabilities", "About cards", "rows", [["title", "Card heading"], ["text", "Card text", "textarea"], ["icon", "Icon name"]]],
      ["about.snapshotEyebrow", "Snapshot small heading"],
      ["about.snapshotTitle", "Snapshot heading"],
      ["about.facts", "Institution facts", "rows", [["label", "Label"], ["value", "Value"]]],
      ["about.note", "Highlighted note", "textarea"],
      ["about.primaryAction.label", "First button label"],
      ["about.primaryAction.path", "First button path"],
      ["about.secondaryAction.label", "Second button label"],
      ["about.secondaryAction.path", "Second button path"],
    ],
  },
  {
    label: "Services and applications",
    fields: [
      ["services.eyebrow", "Services small heading"],
      ["services.tabLabel", "Services tab label"],
      ["services.title", "Services heading"],
      ["services.description", "Services description", "textarea"],
      ["applications.eyebrow", "Applications small heading"],
      ["applications.tabLabel", "Applications tab label"],
      ["applications.title", "Applications heading"],
      ["applications.description", "Applications description", "textarea"],
    ],
  },
  {
    label: "Statistics section",
    fields: [
      ["impactStatsSection.eyebrow", "Small heading"],
      ["impactStatsSection.title", "Main heading"],
      ["impactStatsSection.description", "Introduction", "textarea"],
    ],
  },
  {
    label: "Location section",
    fields: [
      ["location.eyebrow", "Small heading"],
      ["location.eyebrowSize", "Small heading size", "select", [["small", "Small"], ["normal", "Normal"], ["large", "Large"]]],
      ["location.title", "Section heading"],
      ["location.intro", "Introduction", "textarea"],
      ["location.cardEyebrow", "Map card small heading"],
      ["location.cardEyebrowSize", "Map card small heading size", "select", [["small", "Small"], ["normal", "Normal"], ["large", "Large"]]],
      ["location.locality", "Locality"],
      ["location.address", "Address", "textarea"],
      ["location.mapQuery", "Map search text", "textarea"],
      ["location.directionsLabel", "Directions button label"],
    ],
  },
  {
    label: "Optional homepage sections",
    fields: [
      ["homeSections.leadershipUpdates.leadershipTitle", "Leadership heading"],
      ["homeSections.leadershipUpdates.updatesTitle", "Updates heading"],
      ["homeSections.leadershipUpdates.attribution", "Update attribution"],
      ["homeSections.geoportals.eyebrow", "Geoportal small heading"],
      ["homeSections.geoportals.title", "Geoportal heading"],
      ["homeSections.geoportals.description", "Geoportal introduction", "textarea"],
      ["pageContent.quickAccess.eyebrow", "Quick links small heading"],
      ["pageContent.quickAccess.title", "Quick links heading"],
      ["pageContent.quickAccess.openLabel", "Quick link action label"],
    ],
  },
  {
    label: "Photo gallery",
    fields: [
      ["pageContent.gallery.eyebrow", "Small heading"],
      ["pageContent.gallery.title", "Main heading"],
      ["pageContent.gallery.intro", "Introduction", "textarea"],
      ["pageContent.gallery.actionLabel", "View-all button label"],
      ["pageContent.gallery.emptyText", "Empty gallery message", "textarea"],
      ["pageContent.gallery.imageAlt", "Default image alt text"],
    ],
  },
  {
    label: "Footer",
    fields: [
      ["footer.contactHeading", "Contact heading"],
      ["footer.contactHeadingSize", "Contact heading size", "select", [["small", "Small"], ["normal", "Normal"], ["large", "Large"]]],
      ["footer.relatedLinks", "Related institution links", "rows", [["name", "Link name"], ["url", "Website URL"]]],
      ["footer.about", "Footer description", "textarea"],
      ["footer.ownership", "Ownership statement", "textarea"],
      ["footer.poweredBy", "Technology statement"],
      ["footer.reviewDate", "Fallback review date (used only without CMS history)"],
      ["footer.assuranceText", "Assurance statement"],
      ["footer.visitorCountLabel", "Visitor counter label"],
      ["footer.webInformationManagerLabel", "Web manager label"],
    ],
  },
];

const homepageSections = [
  ["mission", "Operational domains"],
  ["leadership", "Leadership and updates"],
  ["about", "About RSAC-UP"],
  ["services", "Services and applications"],
  ["geoportals", "Geoportal cards"],
  ["quickAccess", "Quick links"],
  ["stats", "Institution statistics"],
  ["gallery", "Photo gallery preview"],
  ["location", "Location and map"],
];

const homepageChrome = [
  ["announcementTicker", "What's New ticker"],
  ["homeSectionNav", "Five homepage navigation tabs"],
];

const getAtPath = (value, path) => path.split(".").reduce((item, key) => item?.[key], value);
const setAtPath = (value, path, nextValue) => {
  const output = structuredClone(value || {});
  const keys = path.split(".");
  let cursor = output;
  keys.slice(0, -1).forEach((key) => {
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = nextValue;
  return output;
};

function SettingsRowsEditor({ label, rows, columns, onChange, onBusy, onError }) {
  const items = Array.isArray(rows) ? rows : [];
  const update = (index, name, nextValue) => onChange(items.map((item, position) => position === index ? { ...item, [name]: nextValue } : item));

  return (
    <div className="nested-rows settings-rows">
      <strong>{label}</strong>
      {items.map((item, index) => (
        <section key={`${label}-${index}-${item.label || item.name || item.title || "row"}`}>
          <header>
            <strong>{index + 1}. {item.label || item.name || item.title || "New row"}</strong>
            <button type="button" title={`Remove ${label} row`} onClick={() => onChange(items.filter((_item, position) => position !== index))}><Trash2 /></button>
          </header>
          <div className="settings-row-fields">
            {columns.map(([name, fieldLabel, type = "text"]) => (
              <label key={name}>
                <span>{fieldLabel}</span>
                {type === "media"
                  ? <FieldInput field={{ name, label: fieldLabel, type: "media" }} value={item[name]} onChange={(nextValue) => update(index, name, nextValue)} onBusy={onBusy} onError={onError} />
                  : type === "textarea"
                    ? <textarea rows="3" value={item[name] || ""} onChange={(event) => update(index, name, event.target.value)} />
                    : <input value={item[name] || ""} onChange={(event) => update(index, name, event.target.value)} />}
              </label>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="add-item" onClick={() => onChange([...items, {}])}><Plus /> Add row</button>
    </div>
  );
}

function HomepageLayoutEditor({ value, onChange }) {
  const layout = value?.layout || {};
  const storedOrder = Array.isArray(layout.homeSections) ? layout.homeSections : [];
  const ordered = [...new Set([...storedOrder, ...homepageSections.map(([key]) => key)])];
  const hidden = new Set(Array.isArray(layout.hiddenHomeSections) ? layout.hiddenHomeSections : []);
  const setLayout = (patch) => onChange({ ...value, layout: { ...layout, ...patch } });
  const toggle = (key, visible) => {
    const nextHidden = new Set(hidden);
    if (visible) nextHidden.delete(key);
    else nextHidden.add(key);
    setLayout({ homeSections: ordered, hiddenHomeSections: [...nextHidden] });
  };
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    setLayout({ homeSections: next });
  };

  return (
    <fieldset className="settings-group homepage-layout-editor">
      <legend>Homepage section visibility and order</legend>
      <p className="settings-note">Checked sections appear on the homepage. Use Move up/down to change vertical order.</p>
      <div className="homepage-layout-list">
        {ordered.map((key, index) => {
          const label = homepageSections.find(([sectionKey]) => sectionKey === key)?.[1] || key;
          return (
            <div key={key}>
              <label className="inline-check"><input type="checkbox" checked={!hidden.has(key)} onChange={(event) => toggle(key, event.target.checked)} /> {label}</label>
              <span><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>Move up</button><button type="button" disabled={index === ordered.length - 1} onClick={() => move(index, 1)}>Move down</button></span>
            </div>
          );
        })}
      </div>
      <div className="homepage-chrome-list">
        {homepageChrome.map(([key, label]) => <label className="inline-check" key={key}><input type="checkbox" checked={!hidden.has(key)} onChange={(event) => toggle(key, event.target.checked)} /> {label}</label>)}
      </div>
    </fieldset>
  );
}

function SettingsEditor({ field, value, onChange, onBusy, onError }) {
  return (
    <div className="settings-editor">
      <p className="settings-note">Edit selected language only. Lists and cards below are structured; normal homepage work needs no JSON.</p>
      <HomepageLayoutEditor value={value} onChange={onChange} />
      {settingsGroups.map((group) => (
        <fieldset className="settings-group" key={group.label}>
          <legend>{group.label}</legend>
          <div className="settings-grid">
            {group.fields.map(([path, label, type, columns]) => type === "rows" ? (
              <SettingsRowsEditor
                key={path}
                label={label}
                rows={getAtPath(value, path)}
                columns={columns}
                onChange={(nextValue) => onChange(setAtPath(value, path, nextValue))}
                onBusy={onBusy}
                onError={onError}
              />
            ) : (
              <label key={path}>
                <span>{label}</span>
                {type === "select"
                  ? <select value={getAtPath(value, path) || "normal"} onChange={(event) => onChange(setAtPath(value, path, event.target.value))}>{columns.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select>
                  : type === "list"
                  ? <textarea rows="5" value={Array.isArray(getAtPath(value, path)) ? getAtPath(value, path).join("\n") : ""} onChange={(event) => onChange(setAtPath(value, path, event.target.value.split(/\r?\n/).filter(Boolean)))} />
                  : type === "textarea"
                  ? <textarea rows="4" value={getAtPath(value, path) || ""} onChange={(event) => onChange(setAtPath(value, path, event.target.value))} />
                  : <input value={getAtPath(value, path) || ""} onChange={(event) => onChange(setAtPath(value, path, event.target.value))} />}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <details className="advanced-settings">
        <summary>Advanced technical settings</summary>
        <p>Use only when instructed by developer. Invalid JSON will not save.</p>
        <JsonEditor key={JSON.stringify(value || {})} field={field} value={value} onChange={onChange} onError={onError} />
      </details>
    </div>
  );
}

const objectListFields = {
  links: [["label", "Link label"], ["path", "Website path or URL"], ["description", "Description"]],
  contacts: [["role", "Role"], ["information", "Purpose / information"], ["name", "Name"], ["detail", "Phone / email"]],
};

function ObjectListEditor({ field, value, onChange }) {
  const rows = Array.isArray(value) ? value : [];
  const fields = objectListFields[field.name];
  const update = (index, name, nextValue) => onChange(rows.map((row, position) => position === index ? { ...row, [name]: nextValue } : row));
  return <div className="object-list-editor">{rows.map((row, index) => <section key={`${index}-${row.label || row.name || "row"}`}><header><strong>{index + 1}. {row.label || row.name || "New row"}</strong><button type="button" title="Remove row" onClick={() => onChange(rows.filter((_row, position) => position !== index))}><Trash2 /></button></header><div>{fields.map(([name, label]) => <label key={name}>{label}{name === "description" || name === "information" ? <textarea rows="2" value={row[name] || ""} onChange={(event) => update(index, name, event.target.value)} /> : <input value={row[name] || ""} onChange={(event) => update(index, name, event.target.value)} />}</label>)}</div></section>)}<button type="button" className="add-item" onClick={() => onChange([...rows, {}])}><Plus /> Add row</button></div>;
}

function NestedSectionRows({ label, rows, fields, onChange }) {
  const items = Array.isArray(rows) ? rows : [];
  const update = (index, name, value) => onChange(items.map((item, position) => position === index ? { ...item, [name]: value } : item));
  return <div className="nested-rows"><strong>{label}</strong>{items.map((item, index) => <div key={index}>{fields.map(([name, fieldLabel]) => <label key={name}>{fieldLabel}<input value={item[name] || ""} onChange={(event) => update(index, name, event.target.value)} /></label>)}<button type="button" title={`Remove ${label.toLowerCase()} row`} onClick={() => onChange(items.filter((_item, position) => position !== index))}><Trash2 /></button></div>)}<button type="button" className="add-item" onClick={() => onChange([...items, {}])}><Plus /> Add {label.toLowerCase()} row</button></div>;
}

function SectionListEditor({ value, onChange }) {
  const sections = Array.isArray(value) ? value : [];
  const update = (index, patch) => onChange(sections.map((section, position) => position === index ? { ...section, ...patch } : section));
  return <div className="section-list-editor">{sections.map((section, index) => <section key={`${index}-${section.heading || "section"}`}><header><strong>{index + 1}. {section.heading || "New section"}</strong><button type="button" title="Remove section" onClick={() => onChange(sections.filter((_section, position) => position !== index))}><Trash2 /></button></header><div className="section-fields"><label>Section heading<input value={section.heading || ""} onChange={(event) => update(index, { heading: event.target.value })} /></label><label>Section text<textarea rows="4" value={section.body || ""} onChange={(event) => update(index, { body: event.target.value })} /></label><label>Address<input value={section.address || ""} onChange={(event) => update(index, { address: event.target.value })} /></label><label>External webpage URL<input value={section.externalUrl || ""} onChange={(event) => update(index, { externalUrl: event.target.value })} /></label><label>External button label<input value={section.actionLabel || ""} onChange={(event) => update(index, { actionLabel: event.target.value })} /></label></div><NestedSectionRows label="Officers" rows={section.officers} fields={[["name", "Name"], ["post", "Post"], ["phone", "Phone"]]} onChange={(officers) => update(index, { officers })} /><NestedSectionRows label="Documents" rows={section.documents} fields={[["title", "Document title"], ["meta", "Document details"], ["url", "Document URL"]]} onChange={(documents) => update(index, { documents })} /></section>)}<button type="button" className="add-item" onClick={() => onChange([...sections, { heading: "", body: "" }])}><Plus /> Add page section</button></div>;
}

export default function FieldInput({ field, value, onChange, onBusy, onError }) {
  const fileRef = useRef(null);
  const upload = async (file) => {
    if (!file) return;
    onBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api("/api/admin/media", { method: "POST", body });
      onChange(result.data.public_url);
    } catch (error) { onError(error.message); }
    finally { onBusy(false); }
  };
  if (field.type === "blocks") return <BlockEditor value={value} onChange={onChange} onBusy={onBusy} onError={onError} />;
  if (field.type === "boolean") return <label className="inline-check"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> {field.booleanLabel || "Enabled"}</label>;
  if (field.type === "select") return <select value={value || ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{field.options.map((option) => { const item = typeof option === "object" ? option : { value: option, label: option }; return <option value={item.value} key={item.value}>{item.label}</option>; })}</select>;
  if (field.type === "list") return <textarea rows="6" value={Array.isArray(value) ? value.join("\n") : value || ""} onChange={(event) => onChange(event.target.value.split(/\r?\n/).filter(Boolean))} />;
  if (field.type === "json" && field.name === "settings") return <SettingsEditor field={field} value={value} onChange={onChange} onBusy={onBusy} onError={onError} />;
  if (field.type === "json" && field.name === "sections") return <SectionListEditor value={value} onChange={onChange} />;
  if (field.type === "json" && objectListFields[field.name]) return <ObjectListEditor field={field} value={value} onChange={onChange} />;
  if (field.type === "json") return <JsonEditor key={JSON.stringify(value || {})} field={field} value={value} onChange={onChange} onError={onError} />;
  if (field.type === "media") return <div className="media-field"><input value={value || ""} placeholder="Uploaded file URL" onChange={(event) => onChange(event.target.value)} /><input ref={fileRef} hidden type="file" onChange={(event) => upload(event.target.files?.[0])} /><button type="button" className="secondary" onClick={() => fileRef.current?.click()}><Upload /> Upload</button>{value && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(value) && <img src={mediaPreviewUrl(value)} alt="Selected media preview" />}</div>;
  if (field.type === "richtext") return <div className="rich-field"><div className="rich-toolbar"><button type="button" onClick={() => document.execCommand("bold")}><strong>B</strong></button><button type="button" onClick={() => document.execCommand("italic")}><em>I</em></button><button type="button" onClick={() => document.execCommand("insertUnorderedList")}>List</button></div><div className="rich-editor" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: value || "" }} onBlur={(event) => onChange(event.currentTarget.innerHTML)} /></div>;
  if (["textarea"].includes(field.type)) return <textarea rows="6" value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  return <input type={["email", "number", "date"].includes(field.type) ? field.type : "text"} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />;
}
