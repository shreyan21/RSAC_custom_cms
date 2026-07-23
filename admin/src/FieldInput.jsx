import { useId, useRef, useState } from "react";
import { Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import BlockEditor from "./BlockEditor";
import EditorTooltipButton from "./EditorTooltipButton";
import { api, mediaPreviewUrl } from "./api";
import { formatRichTextHtml } from "./formatRichText";
import { cmsButtonLabelSuggestions, cmsIconOptions } from "../../shared/cmsCollections";
import { uiLabelDefaults } from "../../src/data/uiLabels";

const iconColumns = cmsIconOptions.map(({ value, label }) => [value, label]);
const buttonSuggestions = cmsButtonLabelSuggestions;

function SuggestionInput({ id, value, options = [], language = "en", onChange }) {
  const generatedId = useId();
  const listId = id || generatedId;
  const values = options.map((option) => {
    if (typeof option === "string") return option;
    if (Array.isArray(option)) return option[0];
    return language === "hi" ? option.hi : option.en;
  }).filter(Boolean);

  return (
    <>
      <input list={listId} value={value || ""} onChange={(event) => onChange(event.target.value)} />
      <datalist id={listId}>
        {values.map((option) => <option value={option} key={option} />)}
      </datalist>
    </>
  );
}

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
      ["hero.capabilityTags", "Capability labels", "rows", [["label", "Label"], ["icon", "Icon", "shared-select", iconColumns]]],
      ["hero.leaders", "Leader portraits", "rows", [["name", "Name"], ["role", "Role"], ["alt", "Image description"], ["image", "Portrait", "media"], ["objectPosition", "Photo position"]]],
      ["hero.primaryAction.label", "Primary button label", "suggestions", buttonSuggestions],
      ["hero.primaryAction.path", "Primary button path"],
      ["hero.primaryAction.icon", "Primary button icon", "select", iconColumns],
      ["hero.secondaryAction.label", "Secondary button label", "suggestions", buttonSuggestions],
      ["hero.secondaryAction.path", "Secondary button path"],
      ["hero.secondaryAction.icon", "Secondary button icon", "select", iconColumns],
    ],
  },
  {
    label: "Homepage default text sizes",
    fields: [
      ["appearance.homeHeadingSize", "Default section heading size", "select", [["compact", "Small"], ["normal", "Normal"], ["large", "Large"]]],
      ["appearance.homeBodySize", "Default paragraph and card text size", "select", [["compact", "Small"], ["normal", "Normal"], ["large", "Large"]]],
    ],
  },
  {
    label: "Header, menu and shared controls",
    fields: [
      ["branding.organisationName", "Organisation name"],
      ["branding.subtitle", "Organisation subtitle", "textarea"],
      ["branding.shortName", "Short organisation name"],
      ["ui.skipToContent", "Skip-to-content label"],
      ["ui.skipToContentShort", "Short skip label"],
      ["ui.openMenu", "Open menu label"],
      ["ui.closeMenu", "Close menu label"],
      ["ui.menuHeading", "Menu heading"],
      ["ui.menuHint", "Menu instruction", "textarea"],
      ["ui.menuCurrentPage", "Current-page label"],
      ["ui.menuOpenSection", "Open-section label"],
      ["ui.menuSelectedDomain", "Selected-domain label"],
      ["ui.menuDestinations", "Menu destinations label"],
      ["ui.openSearch", "Open search label"],
      ["ui.searchButtonLabel", "Search button label"],
      ["ui.displayOptions", "Display options label"],
      ["ui.backToTop", "Back-to-top label"],
      ["ui.scrollHint", "Scroll hint"],
      ["cards.profileDetails", "Profile details heading"],
      ["cards.profileFallback", "Missing profile information text", "textarea"],
      ["cards.additionalInformation", "Additional information heading"],
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
      ["missionPulse.primaryAction.label", "Primary button label", "suggestions", buttonSuggestions],
      ["missionPulse.primaryAction.path", "Primary button path"],
      ["missionPulse.primaryAction.icon", "Primary button icon", "select", iconColumns],
      ["missionPulse.secondaryAction.label", "Secondary button label", "suggestions", buttonSuggestions],
      ["missionPulse.secondaryAction.path", "Secondary button path"],
      ["missionPulse.secondaryAction.icon", "Secondary button icon", "select", iconColumns],
    ],
  },
  {
    label: "About section",
    fields: [
      ["about.eyebrow", "Small heading"],
      ["about.title", "Section heading"],
      ["about.body", "Description", "textarea"],
      ["about.capabilities", "About cards", "rows", [["title", "Card heading"], ["text", "Card text", "textarea"], ["icon", "Icon", "shared-select", iconColumns]]],
      ["about.snapshotEyebrow", "Snapshot small heading"],
      ["about.snapshotTitle", "Snapshot heading"],
      ["about.facts", "Institution facts", "rows", [["label", "Label"], ["value", "Value"]]],
      ["about.note", "Highlighted note", "textarea"],
      ["about.primaryAction.label", "First button label", "suggestions", buttonSuggestions],
      ["about.primaryAction.path", "First button path"],
      ["about.primaryAction.icon", "First button icon", "select", iconColumns],
      ["about.secondaryAction.label", "Second button label", "suggestions", buttonSuggestions],
      ["about.secondaryAction.path", "Second button path"],
      ["about.secondaryAction.icon", "Second button icon", "select", iconColumns],
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
      ["location.title", "Section heading"],
      ["location.intro", "Introduction", "textarea"],
      ["location.cardEyebrow", "Map card small heading"],
      ["location.cardEyebrowSize", "Map card small heading size", "select", [["small", "Small"], ["normal", "Normal"], ["large", "Large"]]],
      ["location.locality", "Locality"],
      ["location.address", "Address", "textarea"],
      ["location.mapQuery", "Map search text", "textarea"],
      ["location.directionsLabel", "Directions button label", "suggestions", buttonSuggestions],
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
    label: "Website search",
    fields: [
      ["search.title", "Search heading"],
      ["search.subtitle", "Search introduction", "textarea"],
      ["search.inputLabel", "Search input label", "textarea"],
      ["search.placeholder", "Search placeholder"],
      ["search.resultsLabel", "Results heading"],
      ["search.foundSuffix", "Result-count suffix"],
      ["search.minCharsHint", "Minimum-character hint", "textarea"],
      ["search.emptyTitle", "No-results heading"],
      ["search.emptyHint", "No-results help", "textarea"],
      ["search.quickLinksLabel", "Quick links heading"],
      ["search.languageLabels.primary", "Primary language badge"],
      ["search.languageLabels.secondary", "Secondary language badge"],
      ["search.quickLinks", "Search quick links", "rows", [["title", "Title"], ["type", "Type"], ["path", "Website path"], ["description", "Description", "textarea"]]],
      ["search.institutionalItems", "Additional searchable entries", "rows", [["title", "Title"], ["type", "Type"], ["path", "Website path"], ["description", "Description", "textarea"], ["keywords", "Search keywords (one per line)", "list"]]],
    ],
  },
  {
    label: "Photo gallery",
    fields: [
      ["pageContent.gallery.eyebrow", "Small heading"],
      ["pageContent.gallery.title", "Main heading"],
      ["pageContent.gallery.intro", "Gallery page subheading (clear or hide in Page Headings)", "textarea"],
      ["pageContent.gallery.actionLabel", "View-all button label", "suggestions", buttonSuggestions],
      ["pageContent.gallery.emptyText", "Empty gallery message", "textarea"],
      ["pageContent.gallery.imageAlt", "Default image alt text"],
      ["pageContent.gallery.backLabel", "Back button label"],
    ],
  },
  {
    label: "Sitemap page",
    fields: [
      ["pageContent.sitemap.eyebrow", "Small heading"],
      ["pageContent.sitemap.title", "Main heading"],
      ["pageContent.sitemap.intro", "Introduction", "textarea"],
      ["pageContent.sitemap.sectionTitles.primary", "Primary section heading"],
      ["pageContent.sitemap.primaryLinks", "Primary links", "rows", [["label", "Link name"], ["path", "Website path"]]],
      ["pageContent.sitemap.sectionTitles.aboutPeople", "About and people heading"],
      ["pageContent.sitemap.peopleLinks", "About and people links", "rows", [["label", "Link name"], ["path", "Website path"]]],
      ["pageContent.sitemap.sectionTitles.divisions", "Divisions section heading"],
      ["pageContent.sitemap.allDivisionsLabel", "All divisions link name"],
      ["pageContent.sitemap.sectionTitles.facilities", "Facilities section heading"],
      ["pageContent.sitemap.allFacilitiesLabel", "All facilities link name"],
      ["pageContent.sitemap.sectionTitles.academics", "Academics section heading"],
      ["pageContent.sitemap.academicsLabel", "Academic programmes link name"],
      ["pageContent.sitemap.sectionTitles.publicInformation", "Public information heading"],
      ["pageContent.sitemap.publicLinks", "Public information links", "rows", [["label", "Link name"], ["path", "Website path"]]],
      ["pageContent.sitemap.sectionTitles.policiesHelp", "Policies and help heading"],
      ["pageContent.sitemap.screenReaderLabel", "Screen reader link name"],
      ["pageContent.sitemap.backLabel", "Back to sitemap label"],
      ["pageContent.sitemap.sitemapLabel", "Sitemap link label (leave blank to hide)"],
    ],
  },
  {
    label: "Contact, apps, notices and portal page labels",
    fields: [
      ["pageContent.downloads.eyebrow", "Downloads page small heading"],
      ["pageContent.downloads.title", "Downloads page heading"],
      ["pageContent.downloads.intro", "Downloads page introduction", "textarea"],
      ["pageContent.downloads.emptyText", "Empty downloads message", "textarea"],
      ["pageContent.downloads.openLabel", "Open document button label", "suggestions", buttonSuggestions],
      ["pageContent.downloads.backLabel", "Downloads page back label"],
      ["pageContent.contact.backLabel", "Contact page back label"],
      ["pageContent.contact.downloadLabel", "Mobile app download label", "suggestions", buttonSuggestions],
      ["pageContent.contact.mobileAppsHeading", "Mobile apps section heading"],
      ["pageContent.contact.mobileAppsIntro", "Mobile apps section introduction", "textarea"],
      ["pageContent.contact.unavailableLabel", "Unavailable app message", "textarea"],
      ["pageContent.notices.backLabel", "Notices page back label"],
      ["pageContent.notices.columns.serial", "Notices serial column"],
      ["pageContent.notices.columns.notice", "Notices title column"],
      ["pageContent.notices.columns.category", "Notices category column"],
      ["pageContent.notices.columns.action", "Notices action column"],
      ["pageContent.geoportals.backLabel", "Geoportals page back label"],
      ["pageContent.leadership.backLabel", "Leadership page back label"],
      ["pageContent.manpower.backLabel", "Manpower page back label"],
      ["pageContent.screenReader.backLabel", "Screen-reader page back label"],
    ],
  },
  {
    label: "People pages and fallback page",
    fields: [
      ["pageContent.ourFormers.backLabel", "Our Formers back label"],
      ["pageContent.ourFormers.profilesLabel", "Profile count label"],
      ["pageContent.ourFormers.navigationLabel", "Our Formers navigation label"],
      ["pageContent.ourFormers.sections", "Our Formers groups", "rows", [["title", "Group heading"], ["intro", "Group introduction", "textarea"], ["slug", "Group key"]]],
      ["pageContent.scientists.backLabel", "Scientists page back label"],
      ["pageContent.administration.backLabel", "Administration page back label"],
      ["pageContent.technicalStaff.backLabel", "Technical staff page back label"],
      ["pageContent.organisationChart.backLabel", "Organisation chart back label"],
      ["pageContent.placeholder.body", "Missing-page message", "textarea"],
      ["pageContent.placeholder.links", "Missing-page helpful links", "rows", [["label", "Link label"], ["path", "Website path"], ["icon", "Icon", "shared-select", iconColumns]]],
    ],
  },
  {
    label: "Vision, objectives, implementation and activities",
    fields: [
      ["pageContent.visionMission.back", "Back button label"],
      ["pageContent.visionMission.cards", "Vision and mission cards", "rows", [["label", "Small label"], ["title", "Card heading"], ["text", "Card text", "textarea"]]],
      ["pageContent.visionMission.objectivesHeading", "Objectives heading"],
      ["pageContent.visionMission.objectives", "Objectives", "list"],
      ["pageContent.visionMission.implementationHeading", "Implementation heading"],
      ["pageContent.visionMission.implementationIntro", "Implementation introduction", "textarea"],
      ["pageContent.visionMission.implementation", "Implementation points", "list"],
      ["pageContent.visionMission.approachHeading", "Approach heading"],
      ["pageContent.visionMission.approach", "Approach points", "list"],
      ["pageContent.visionMission.sphereHeading", "Sphere of Activities heading"],
      ["pageContent.visionMission.sphereIntro", "Sphere of Activities introduction", "textarea"],
      ["pageContent.visionMission.sphere", "Sphere of Activities groups", "rows", [["name", "Group heading"], ["items", "Items (one per line)", "list"]]],
    ],
  },
  {
    label: "Flood monitoring and reports",
    fields: [
      ["floodSection.eyebrow", "Flood page small heading"],
      ["floodSection.title", "Flood page heading"],
      ["floodSection.intro", "Flood page introduction", "textarea"],
      ["floodSection.note", "Season note", "textarea"],
      ["floodSection.programmeHeading", "Programme heading"],
      ["floodSection.programmes", "Flood programmes", "rows", [["title", "Title"], ["description", "Description", "textarea"], ["icon", "Icon", "shared-select", iconColumns]]],
      ["floodSection.archiveHeading", "Archive heading"],
      ["floodSection.archiveNote", "Archive note", "textarea"],
      ["floodSection.archives", "Flood archive years", "rows", [["year", "Year"], ["url", "Archive URL"]]],
      ["floodSection.resourcesHeading", "Related portals heading"],
      ["floodSection.resources", "Related flood portals", "rows", [["label", "Name"], ["description", "Description", "textarea"], ["url", "Website URL"]]],
      ["pageContent.floodReports.heading", "Daily reports heading"],
      ["pageContent.floodReports.backLabel", "Flood reports back label"],
      ["pageContent.floodReports.columns.date", "Date column"],
      ["pageContent.floodReports.columns.report", "Report column"],
      ["pageContent.floodReports.columns.coverage", "Coverage column"],
      ["pageContent.floodReports.columns.action", "Action column"],
    ],
  },
  {
    label: "Accessibility and organisation chart media",
    fields: [
      ["accessibility.screenReaders", "Screen-reader software", "rows", [["name", "Software name"], ["type", "Type"], ["website", "Website URL"]]],
      ["organisationChart.intro", "Organisation chart introduction", "textarea"],
      ["organisationChart.image", "Organisation chart image", "media"],
      ["organisationChart.downloadName", "Downloaded chart file name"],
    ],
  },
  {
    label: "Footer",
    fields: [
      ["footer.contactHeading", "Contact heading"],
      ["footer.contactHeadingSize", "Contact heading size", "select", [["small", "Small"], ["normal", "Normal"], ["large", "Large"]]],
      ["footer.socialLinks", "Social links", "rows", [["name", "Name"], ["url", "Website URL"], ["icon", "Icon", "shared-select", [["facebook", "Facebook"], ["twitter", "X / Twitter"]]]]],
      ["footer.relatedLinks", "Related institution links", "rows", [["name", "Link name"], ["url", "Website URL"]]],
      ["footer.about", "Footer description", "textarea"],
      ["footer.ownership", "Ownership statement", "textarea"],
      ["footer.poweredBy", "Technology statement"],
      ["footer.reviewDate", "Fallback review date (used only without CMS history)"],
      ["footer.assuranceText", "Assurance statement"],
      ["footer.visitorCountLabel", "Visitor counter label"],
      ["footer.webInformationManagerLabel", "Web manager label"],
      ["footer.allRightsReserved", "Copyright wording"],
      ["footer.lastUpdatedLabel", "Last updated label"],
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

const sharedSettingsPaths = new Set([
  "appearance.homeHeadingSize",
  "appearance.homeBodySize",
  "hero.primaryAction.icon",
  "hero.secondaryAction.icon",
  "missionPulse.primaryAction.icon",
  "missionPulse.secondaryAction.icon",
  "about.primaryAction.icon",
  "about.secondaryAction.icon",
  "location.cardEyebrowSize",
  "footer.contactHeadingSize",
  "organisationChart.image",
  "organisationChart.downloadName",
]);

const homepageTypographySections = [
  ["hero", "Hero banner"],
  ["mission", "Operational domains"],
  ["leadership", "Leadership and updates"],
  ["about", "About RSAC-UP"],
  ["services", "Services and applications"],
  ["geoportals", "Geoportal cards"],
  ["quickAccess", "Quick links"],
  ["stats", "Institution at a Glance / statistics"],
  ["gallery", "Photo gallery preview"],
  ["location", "Location and map / Find the Centre"],
];

const typographySizeOptions = [
  ["inherit", "Use homepage default"],
  ["compact", "Small"],
  ["normal", "Normal"],
  ["large", "Large"],
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

function SettingsRowsEditor({ label, rows, sharedRows, columns, onChange, onSharedRowsChange, onBusy, onError }) {
  const items = Array.isArray(rows) ? rows : [];
  const sharedItems = Array.isArray(sharedRows) ? sharedRows : items;
  const update = (index, name, nextValue) => onChange(items.map((item, position) => position === index ? { ...item, [name]: nextValue } : item));
  const updateColumn = (index, name, nextValue, type) => {
    update(index, name, nextValue);
    if (type !== "shared-select" || !onSharedRowsChange) return;
    const length = Math.max(items.length, sharedItems.length);
    onSharedRowsChange(Array.from({ length }, (_unused, position) => {
      const item = sharedItems[position] || items[position] || {};
      return position === index ? { ...item, [name]: nextValue } : item;
    }));
  };

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
            {columns.map(([name, fieldLabel, type = "text", options = []]) => (
              <label key={name}>
                <span>{fieldLabel}</span>
                {type === "media"
                  ? <FieldInput field={{ name, label: fieldLabel, type: "media" }} value={item[name]} onChange={(nextValue) => updateColumn(index, name, nextValue, type)} onBusy={onBusy} onError={onError} />
                  : type === "list"
                    ? <textarea rows="4" value={Array.isArray(item[name]) ? item[name].join("\n") : ""} onChange={(event) => updateColumn(index, name, event.target.value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean), type)} />
                  : type === "textarea"
                    ? <textarea rows="3" value={item[name] || ""} onChange={(event) => updateColumn(index, name, event.target.value, type)} />
                    : type === "select" || type === "shared-select"
                      ? <select value={(type === "shared-select" ? sharedItems[index]?.[name] : item[name]) || ""} onChange={(event) => updateColumn(index, name, event.target.value, type)}><option value="">Select</option>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select>
                      : <input value={item[name] || ""} onChange={(event) => updateColumn(index, name, event.target.value, type)} />}
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

function InterfaceLabelsEditor({ value, onChange }) {
  const [query, setQuery] = useState("");
  const current = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const labels = { ...uiLabelDefaults, ...current };
  const visible = Object.entries(labels).filter(([key, label]) => `${key} ${label} ${uiLabelDefaults[key] || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const update = (key, nextValue) => onChange({ ...current, [key]: nextValue });

  return (
    <fieldset className="settings-group interface-labels-editor">
      <legend>Buttons, badges and short interface text</legend>
      <p className="settings-note">Search for the wording visible on the website, then edit it in the selected language.</p>
      <label className="interface-label-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${Object.keys(labels).length} labels`} /></label>
      <div className="interface-label-list">
        {visible.map(([key]) => (
          <label key={key}>
            <span>{uiLabelDefaults[key] || key}<small>{key}</small></span>
            <input value={current[key] || ""} placeholder={uiLabelDefaults[key] || key} onChange={(event) => update(key, event.target.value)} />
          </label>
        ))}
      </div>
      {!visible.length && <p className="empty-inline">No matching interface text.</p>}
    </fieldset>
  );
}

function HomepageTypographyEditor({ value, onChange }) {
  const settings = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const update = (sectionKey, property, nextValue) => {
    const nextSettings = structuredClone(settings);
    const section = { ...(nextSettings[sectionKey] || {}) };
    if (nextValue === "inherit") delete section[property];
    else section[property] = nextValue;
    if (Object.keys(section).length) nextSettings[sectionKey] = section;
    else delete nextSettings[sectionKey];
    onChange(nextSettings);
  };

  return (
    <div className="homepage-typography-list">
      {homepageTypographySections.map(([sectionKey, label]) => {
        const section = settings[sectionKey] || {};
        return (
          <div key={sectionKey}>
            <strong>{label}</strong>
            <label>
              <span>Small heading size</span>
              <select value={section.eyebrowSize || "inherit"} onChange={(event) => update(sectionKey, "eyebrowSize", event.target.value)}>
                {typographySizeOptions.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
              </select>
            </label>
            <label>
              <span>Main heading size</span>
              <select value={section.headingSize || "inherit"} onChange={(event) => update(sectionKey, "headingSize", event.target.value)}>
                {typographySizeOptions.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
              </select>
            </label>
            <label>
              <span>Paragraph size</span>
              <select value={section.bodySize || "inherit"} onChange={(event) => update(sectionKey, "bodySize", event.target.value)}>
                {typographySizeOptions.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
              </select>
            </label>
          </div>
        );
      })}
    </div>
  );
}

function SettingsEditor({ field, value, language, onChange, sharedValue, onSharedChange, onBusy, onError }) {
  const sharedSettings = sharedValue && typeof sharedValue === "object" ? sharedValue : value;
  const updateSharedSettings = onSharedChange || onChange;
  return (
    <div className="settings-editor">
      <p className="settings-note">Text edits apply to the selected language. Homepage layout and size controls are shared by English and Hindi. Use Page Headings and Subheadings for the main heading of any inner route.</p>
      <HomepageLayoutEditor value={sharedSettings} onChange={updateSharedSettings} />
      <fieldset className="settings-group homepage-typography-editor">
        <legend>Homepage section size overrides</legend>
        <p className="settings-note">This is the only place for changing one homepage section independently. For example, change Institution at a Glance / statistics here; use Homepage default text sizes below for all sections.</p>
        <HomepageTypographyEditor
          value={sharedSettings?.homeSectionTypography}
          onChange={(nextValue) => updateSharedSettings({ ...(sharedSettings || {}), homeSectionTypography: nextValue })}
        />
      </fieldset>
      {settingsGroups.map((group) => (
        <fieldset className="settings-group" key={group.label}>
          <legend>{group.label}</legend>
          <div className="settings-grid">
            {group.fields.map(([path, label, type, columns]) => type === "rows" ? (
              <SettingsRowsEditor
                key={path}
                label={label}
                rows={getAtPath(value, path)}
                sharedRows={getAtPath(sharedSettings, path)}
                columns={columns}
                onChange={(nextValue) => onChange(setAtPath(value, path, nextValue))}
                onSharedRowsChange={(nextValue) => updateSharedSettings(setAtPath(sharedSettings, path, nextValue))}
                onBusy={onBusy}
                onError={onError}
              />
            ) : (() => {
              const isShared = sharedSettingsPaths.has(path);
              const source = isShared ? sharedSettings : value;
              const updateSource = isShared ? updateSharedSettings : onChange;
              return (
              <label key={path}>
                <span>{label}{isShared && <small>Shared by both languages</small>}</span>
                {type === "select"
                  ? <select value={getAtPath(source, path) || ""} onChange={(event) => updateSource(setAtPath(source, path, event.target.value))}><option value="">Select</option>{columns.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select>
                  : type === "suggestions"
                  ? <SuggestionInput value={getAtPath(source, path)} options={columns} language={language} onChange={(nextValue) => updateSource(setAtPath(source, path, nextValue))} />
                  : type === "media"
                  ? <FieldInput field={{ name: path, label, type: "media" }} value={getAtPath(source, path)} onChange={(nextValue) => updateSource(setAtPath(source, path, nextValue))} onBusy={onBusy} onError={onError} />
                  : type === "list"
                  ? <textarea rows="5" value={Array.isArray(getAtPath(source, path)) ? getAtPath(source, path).join("\n") : ""} onChange={(event) => updateSource(setAtPath(source, path, event.target.value.split(/\r?\n/).filter(Boolean)))} />
                  : type === "textarea"
                  ? <textarea rows="4" value={getAtPath(source, path) || ""} onChange={(event) => updateSource(setAtPath(source, path, event.target.value))} />
                  : <input value={getAtPath(source, path) || ""} onChange={(event) => updateSource(setAtPath(source, path, event.target.value))} />}
              </label>
              );
            })())}
          </div>
        </fieldset>
      ))}
      <InterfaceLabelsEditor value={value?.interfaceLabels} onChange={(nextValue) => onChange(setAtPath(value, "interfaceLabels", nextValue))} />
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

function NestedSectionRows({ label, rows, fields, onChange, onBusy, onError }) {
  const items = Array.isArray(rows) ? rows : [];
  const update = (index, name, value) => onChange(items.map((item, position) => position === index ? { ...item, [name]: value } : item));
  return <div className="nested-rows"><strong>{label}</strong>{items.map((item, index) => <div key={index}>{fields.map(([name, fieldLabel, fieldType = "text"]) => fieldType === "media" ? <div className="nested-field" key={name}><span>{fieldLabel}</span><FieldInput field={{ name, label: fieldLabel, type: "media", localized: false }} value={item[name] || ""} onChange={(nextValue) => update(index, name, nextValue)} onBusy={onBusy} onError={onError} /></div> : <label key={name}>{fieldLabel}<input value={item[name] || ""} onChange={(event) => update(index, name, event.target.value)} /></label>)}<button type="button" title={`Remove ${label.toLowerCase()} row`} onClick={() => onChange(items.filter((_item, position) => position !== index))}><Trash2 /></button></div>)}<button type="button" className="add-item" onClick={() => onChange([...items, {}])}><Plus /> Add {label.toLowerCase()} row</button></div>;
}

function SectionListEditor({ value, onChange, onBusy, onError }) {
  const sections = Array.isArray(value) ? value : [];
  const update = (index, patch) => onChange(sections.map((section, position) => position === index ? { ...section, ...patch } : section));
  return <div className="section-list-editor">{sections.map((section, index) => <section key={`${index}-${section.heading || "section"}`}><header><strong>{index + 1}. {section.heading || "New section"}</strong><button type="button" title="Remove section" onClick={() => onChange(sections.filter((_section, position) => position !== index))}><Trash2 /></button></header><div className="section-fields"><label>Section heading<input value={section.heading || ""} onChange={(event) => update(index, { heading: event.target.value })} /></label><label>Section text<textarea rows="4" value={section.body || ""} onChange={(event) => update(index, { body: event.target.value })} /></label><label>Address<input value={section.address || ""} onChange={(event) => update(index, { address: event.target.value })} /></label><label>External webpage URL<input value={section.externalUrl || ""} onChange={(event) => update(index, { externalUrl: event.target.value })} /></label><label>External button label<input value={section.actionLabel || ""} onChange={(event) => update(index, { actionLabel: event.target.value })} /></label></div><NestedSectionRows label="Officers" rows={section.officers} fields={[["name", "Name"], ["post", "Post"], ["phone", "Phone"]]} onChange={(officers) => update(index, { officers })} onBusy={onBusy} onError={onError} /><NestedSectionRows label="Documents" rows={section.documents} fields={[["title", "Document title"], ["meta", "Document details"], ["url", "Upload / replace document", "media"]]} onChange={(documents) => update(index, { documents })} onBusy={onBusy} onError={onError} /></section>)}<button type="button" className="add-item" onClick={() => onChange([...sections, { heading: "", body: "" }])}><Plus /> Add page section</button></div>;
}

function RichTextField({ value, onChange }) {
  const editorRef = useRef(null);
  const runCommand = (command) => {
    editorRef.current?.focus();
    document.execCommand(command);
  };
  const formatText = () => {
    if (!editorRef.current) return;
    const formatted = formatRichTextHtml(editorRef.current.innerHTML);
    editorRef.current.innerHTML = formatted;
    onChange(formatted);
    editorRef.current.focus();
  };
  return (
    <div className="rich-field">
      <div className="rich-toolbar">
        <EditorTooltipButton label="Bold" description="Makes the selected text thicker for emphasis." onClick={() => runCommand("bold")}><strong>B</strong></EditorTooltipButton>
        <EditorTooltipButton label="Italic" description="Slants the selected text for gentle emphasis." onClick={() => runCommand("italic")}><em>I</em></EditorTooltipButton>
        <EditorTooltipButton label="Bullet list" description="Turns the selected lines into a bulleted list." onClick={() => runCommand("insertUnorderedList")}>List</EditorTooltipButton>
        <EditorTooltipButton label="Format text" description="Cleans spacing and empty formatting without changing the wording." onClick={formatText}><Sparkles /> Format text</EditorTooltipButton>
      </div>
      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value || "" }}
        onBlur={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}

export default function FieldInput({ field, value, referenceValue, language = "en", pageData, referencePageData, onChange, sharedValue, onSharedChange, onBusy = () => {}, onError = () => {} }) {
  const fileRef = useRef(null);
  const suggestionId = useId();
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
  if (field.type === "blocks") return <BlockEditor value={value} referenceValue={referenceValue} language={language} pageData={pageData} referencePageData={referencePageData} onChange={onChange} onBusy={onBusy} onError={onError} />;
  if (field.type === "boolean") return <label className="inline-check"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> {field.booleanLabel || "Enabled"}</label>;
  if (field.type === "select") return <select value={value || field.defaultValue || ""} onChange={(event) => onChange(event.target.value)}><option value="">Select</option>{field.options.map((option) => { const item = typeof option === "object" ? option : { value: option, label: option }; return <option value={item.value} key={item.value}>{item.label}</option>; })}</select>;
  if (field.type === "suggestions") return <SuggestionInput id={suggestionId} value={value} options={field.options} language={language} onChange={onChange} />;
  if (field.type === "list") return <textarea rows="6" value={Array.isArray(value) ? value.join("\n") : value || ""} onChange={(event) => onChange(event.target.value.split(/\r?\n/).filter(Boolean))} />;
  if (field.type === "json" && field.name === "settings") return <SettingsEditor field={field} value={value} language={language} onChange={onChange} sharedValue={sharedValue} onSharedChange={onSharedChange} onBusy={onBusy} onError={onError} />;
  if (field.type === "json" && field.name === "sections") return <SectionListEditor value={value} onChange={onChange} onBusy={onBusy} onError={onError} />;
  if (field.type === "json" && objectListFields[field.name]) return <ObjectListEditor field={field} value={value} onChange={onChange} />;
  if (field.type === "json") return <JsonEditor key={JSON.stringify(value || {})} field={field} value={value} onChange={onChange} onError={onError} />;
  if (field.type === "media") return <div className="media-field"><input value={value || ""} placeholder="Uploaded file URL" onChange={(event) => onChange(event.target.value)} /><input ref={fileRef} hidden type="file" onChange={(event) => upload(event.target.files?.[0])} /><button type="button" className="secondary" onClick={() => fileRef.current?.click()}><Upload /> Upload</button>{value && /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i.test(value) && <img src={mediaPreviewUrl(value)} alt="Selected media preview" />}</div>;
  if (field.type === "color") {
    const color = /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#0f6f42";
    return <div className="color-field"><input type="color" value={color} aria-label={`${field.label} colour picker`} onChange={(event) => onChange(event.target.value)} /><input value={value || ""} placeholder="#0f6f42" pattern="#[0-9a-fA-F]{6}" onChange={(event) => onChange(event.target.value)} /></div>;
  }
  if (field.type === "richtext") return <RichTextField value={value} onChange={onChange} />;
  if (["textarea"].includes(field.type)) return <textarea rows="6" value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  return <input type={["email", "number", "date"].includes(field.type) ? field.type : "text"} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />;
}
