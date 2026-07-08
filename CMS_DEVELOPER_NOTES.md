# CMS Developer Notes

## English
- Keep Directus content as the primary source.
- Keep fallback data separate and safe.
- Do not add AI translation or auto-rewrite Hindi.
- Prefer simple form fields over raw technical fields.
- If a field is missing, allow the UI to fall back instead of crashing.
- For list sections, sort by display order, sort order, then date and title.

## 2026-07 safe update: menu, latest-first lists, preview

### English
- Hamburger menu cleanup is in `src/components/navbar/MenuOverlay.jsx`.
- The menu filters the Home domain out of the left list at render time. It does not mutate `rsac_menu` or fallback `menuItems`.
- The top-right menu control is a `Link` to `/` with `aria-label="Go to homepage"`. Escape still closes the menu.
- Directus live fetches still use `readPublishedItems`, which applies `filter[status][_eq]=published`.
- Preview mode is implemented in `src/data/directusClient.js` through `isCmsPreviewMode()`.
- Preview is disabled unless `VITE_CMS_PREVIEW_ENABLED=true`. With `VITE_CMS_PREVIEW_TOKEN`, the URL must be `?preview=<token>`.
- When `VITE_DIRECTUS_PREVIEW_TOKEN` is set, preview fetches use that token instead of the normal live `VITE_DIRECTUS_TOKEN`.
- In preview mode, `readPublishedItems` removes the published-status filter. Directus permissions/token still decide whether drafts are readable.
- `src/App.jsx` shows a small `CMS Preview` banner whenever preview mode is active.
- Rich division lists/tables are normalized in `OfficialContentPage.jsx`. Dated rows in Research Papers, Technical Reports, Completed Projects, Ongoing Projects, Reports, Publications, and similar lists sort newest year first.
- Table serial cells are rewritten in the rendered DOM after sorting. This does not edit Directus or fallback files.
- Extra editor-added `content_fields` rows are prepended newest-first to the matching list, because Directus usually stores newly added rows at the end.
- `rsac_gallery_items` now sorts by `sort`, then `-date_created`, then `title`; notices and flood reports already had newest-first date sorting.

### Simple Hindi
- Hamburger menu change `src/components/navbar/MenuOverlay.jsx` में है।
- Home left domain list से render time पर हटता है। Directus data change नहीं होता।
- Top-right button homepage `/` पर जाता है और keyboard accessible है।
- Live fetch अभी भी केवल `published` rows पढ़ता है।
- Preview `src/data/directusClient.js` में `isCmsPreviewMode()` से चलता है।
- Preview तभी active है जब `VITE_CMS_PREVIEW_ENABLED=true` हो और URL में सही `?preview=<token>` हो।
- `VITE_DIRECTUS_PREVIEW_TOKEN` set हो तो preview fetch normal live token की जगह वही token use करता है।
- Preview mode में published filter हटता है, लेकिन Directus permission/token अभी भी जरूरी है।
- Active preview में `src/App.jsx` छोटा `CMS Preview` banner दिखाता है।
- Research Papers, Technical Reports, Completed Projects, Ongoing Projects जैसी dated rich lists newest year first दिखती हैं।
- Serial numbers rendered DOM में बनते हैं; Directus data edit नहीं होता।
- Extra editor-added rows list के ऊपर आते हैं, ताकि नया item पहले दिखे।

### Two content shapes
- **Collections** (`rsac_notices`, `rsac_gallery_items`, `rsac_flood_reports`,
  `rsac_geoportals`, `rsac_profiles`, …): one row = one structured item. These
  already have proper labelled fields and `sort`/`display_order`. Frontend reads
  them with `sort: ["sort", …]` so manual drag-order wins, date/title is the
  fallback (`src/data/cmsService.js`).
- **Page text** (`rsac_pages.content_fields` / `_hi`): a locked HTML layout
  scraped from the old site, plus flat text rows patched into it
  (`normalizeDirectusContentPage`, `applyPageTextFields` in
  `src/data/directusAdapter.js`). Each `children` row is one text slot (often one
  table cell), which is why one project can span many rows. The `label` field is
  a derived "Section (fixed)" slot name and is read-only in Studio; the editor
  list shows `{{value}}` so rows read as their real text.

### Serial numbers and lists
- Serials are generated in the frontend, never stored. Non-paginated serial =
  `index + 1` after sorting; paginated serial =
  `(currentPage - 1) * pageSize + index + 1`.
- WYSIWYG / page-text lists are classified in
  `enhanceRichContentHtml` (`OfficialContentPage.jsx`): a long, citation-like
  list becomes `rsac-numbered-list` (CSS `::before` counter), else
  `rsac-bullet-list` / `rsac-ordered-list`. Editor-added rows join the section's
  existing last list via `appendExtraItemsToSection` so they inherit numbering
  and alignment.

### Division-page Hindi (render-time term map, not Directus)
Division pages (`section_key === "divisions"`, plus the two `training-division-` /
`school-of-geo-informatics-` academic pages) render **one locked English body in
both languages**. In `getRsacOfficialSections` (`cmsService.js`) the Hindi branch
forces `html: englishItem.html` for divisions and `backfillHiPage` skips them.
At render, `OfficialHtmlContent` calls `translateRichTextHtml`
(`OfficialContentPage.jsx`), which swaps each text node whose canonicalised text
matches `hindiLookup` — built from `src/data/divisionHindiPhrases.js`, which
spreads in the bulk machine-translated `divisionHindiPhrasesGenerated.js`.

Consequence: a division's `content_fields_hi` in Directus is **not** shown; the
term map wins. To fix a division's Hindi wording, edit the phrase map in
`src/data`, not Directus. Every non-division collection reads Hindi from Directus
(`localizeDirectusItem` picks the `_hi` field), so those edits are live.

### Cleaning scraped junk rows
`scripts/clean-punctuation-only-page-rows.mjs` removes `content_fields` /
`content_fields_hi` child rows whose text is only punctuation (a stray "," ":"
"/" ")." that the scrape split into its own editor row). Safe: the character
stays in the locked `html` template, so the page render is unchanged. Dry run by
default; `--apply` writes a timestamped backup to `backups/` first, then patches.
The renderer also cleans these live — see `enhanceRichContentHtml` (unwraps
punctuation-only `<strong>/<em>` and drops punctuation-only `<li>`/`<p>`).

### Migrating scraped page tables to structured records (optional, manual)
Turning a scraped Ongoing/Completed Projects table into one record per project
is a schema + rendering change, so do it deliberately, not as a live data edit:
1. Create a collection, e.g. `rsac_projects`, with fields: `title`, `title_hi`,
   `funding_agency`, `duration`, `study_area`, `objectives` (textarea),
   `status` (dropdown: ongoing/completed), `division` (relation to
   `rsac_divisions`), `display_order`, publish status. Mirror any Hindi field as
   `*_hi`.
2. Add a reader in `cmsService.js` (`sort: ["sort", "title"]`) and a card/table
   renderer that generates serials with `index + 1`.
3. Keep the existing page-text rendering as fallback: only replace a division's
   scraped table once its projects exist as records, so no data is lost.
4. Do not delete `content_fields` rows until the structured version is verified
   on the live page in both English and Hindi.

### Homepage feature tabs → dedicated pages
The homepage no longer renders the feature "boxes" grid. The five items
(Objective / Implementation / Approach / Sphere of Activities / Mobile Apps) show
only as the sticky tab bar (`HomeSectionNav`), and **each tab opens its own
route**:

- `/objectives`, `/implementation`, `/approach`, `/sphere-of-activities` →
  `src/pages/about/VisionSectionPage.jsx` (one section of the shared
  `visionMissionContent` per page; same source as `/vision`).
- `/mobile-apps` → `src/pages/MobileAppsPage.jsx`, which reuses
  `src/components/sections/MobileAppsGrid.jsx` (also used inside `GeoportalsPage`).

The tab list (label / link / order / icon) comes from
`homeSections.featureTabs`. It is now the Directus collection
`rsac_home_feature_tabs` (5 published rows, public read granted), so editors
change tabs in **Homepage → Homepage Feature Tabs**; `src/data/siteSettings.js`
stays as the fallback if the collection is empty/unreachable. `button_path`
values must match the routes above.

Provisioning history / gotcha: this Directus install enforces a **licensed
25-collection cap** (`EntitlementManager` → `collections limit exceeded`), which
is why the collection was missing and why `directus-setup.mjs` could not add it.
To make room, the unused in-Directus helper table `rsac_editor_map` (never read
by the frontend, regenerable from the setup script) was deleted after backing up
its rows to `backups/rsac_editor_map-before-delete-*.json`. If you re-run the full
`directus-setup.mjs` it will try to recreate `rsac_editor_map` and hit the cap
again — expected. Do **not** run the full setup against live content without
checking its seed upserts won't overwrite edited rows.

Current correction: `rsac_editor_map` is the friendly **Start Here -> Editing
Map** collection for non-technical editors. It is not read by the React
frontend, but it is useful because it tells editors where each visible website
area is edited. If a Directus collection/license limit blocks creating this
helper collection, the public website still works, but editors must use
`CMS_EDITING_GUIDE.md` and `DIRECTUS_COLLECTIONS_GUIDE.md` instead. Do **not**
delete live website content collections just to make room for this guide.

### Programmatic scrolling is instant, not "auto"
`scrollToTarget(..., { immediate: true })` uses `behavior: "instant"`, not
`"auto"`. `"auto"` defers to the CSS `html { scroll-behavior: smooth }`, so an
"immediate" jump would still animate the whole way down a tall page — rendering
every `content-visibility` section on the path and janking on slow machines. The
sticky-header offset for in-page anchors is handled by CSS
`scroll-padding-top` on `<html>` (150px desktop / 112px ≤640px), applied by the
browser at scroll time so it survives late image/font reflow. `ScrollToTop`'s
hash handler jumps instantly and retries across the CMS data-load window.

### Mega-menu right panel + Hindi links
- `getMenuItems` (`cmsService.js`) keeps the **English `links` set as canonical**
  and overlays Hindi per link `path` from `links_hi`. A partial/empty `links_hi`
  no longer wholesale-replaces the list (that dropped untranslated links — About
  Us showed 6 of 8; Flood/RTI/Contact showed none). `localizeMenuItems`
  (`hindiContent.js`) then overlays the term-map Hindi labels by path.
- `MenuOverlay` sections without sub-links (Gallery, Tenders, FAQ) now also call
  `selectSection` on hover/focus, and the right panel renders a fallback card
  (section description + "Open <section>" link) when `activeSection.children` is
  empty — so switching to them never leaves the previous section's links showing.

### Hiding homepage parts from the CMS
- The scrolling notices strip (`AnnouncementTicker`) and the tab bar
  (`HomeSectionNav`) are chrome rendered outside the section map, but `HomePage`
  now gates them on the same `layout.hiddenHomeSections` set: add
  `"announcementTicker"` or `"homeSectionNav"` to hide either. Default (absent) =
  shown.
- Home section headings are removable by blanking their CMS text: `AboutSection`,
  `ServicesSection`, `LocationSection`, and `MissionPulse` render the eyebrow and
  title only when non-empty. `GeoStats` uses fixed interface labels (`t(...)`),
  so its heading is not blank-removable without a code change.

## हिन्दी
- Directus content को primary source मानें।
- Fallback data को अलग और safe रखें।
- AI translation या auto-rewrite Hindi न जोड़ें।
- Raw technical field के बजाय simple form field का उपयोग करें।
- यदि field missing हो तो crash के बजाय UI fallback करे।
- List section के लिए display order, sort order, फिर date और title से sort करें।

### दो content shapes
- **Collection** (`rsac_notices`, `rsac_gallery_items`, `rsac_flood_reports`, …):
  एक row = एक structured item, सही labelled fields और `sort` के साथ। Frontend
  `sort: ["sort", …]` से पढ़ता है — manual drag-order पहले, date/title fallback।
- **Page text** (`rsac_pages.content_fields`): पुरानी साइट से scraped locked HTML
  layout + उसमें patch होने वाली flat text rows। हर `children` row एक text slot
  (अक्सर एक table cell) है, इसलिए एक project कई rows में फैलता है। `label` एक
  derived "अनुभाग (तय)" slot name है, Studio में read-only; list `{{value}}`
  दिखाती है।

### Serial number
- Serial frontend में बनते हैं, store नहीं होते। बिना pagination: `index + 1`;
  pagination के साथ: `(currentPage - 1) * pageSize + index + 1`।
- Editor-added rows `appendExtraItemsToSection` से मौजूदा list में जुड़ती हैं,
  ताकि numbering और alignment एक जैसी रहे।

### Scraped table को structured record में migrate करना (वैकल्पिक, manual)
सोच-समझकर करें, live data edit की तरह नहीं:
1. नया collection बनाएं (जैसे `rsac_projects`) fields: `title`, `title_hi`,
   `funding_agency`, `duration`, `study_area`, `objectives`, `status` (dropdown),
   `division` (relation), `display_order`, publish status।
2. `cmsService.js` में reader (`sort: ["sort", "title"]`) और card/table renderer
   जोड़ें (`index + 1` से serial)।
3. पुराना page-text rendering fallback रखें; record बनने पर ही उस division की
   scraped table बदलें।
4. दोनों भाषाओं में verify होने तक `content_fields` rows delete न करें।

## Recent fixes & safe extension points (2026-07-08)

### English

**CMS priority over fallback (implemented).**
- `deepMerge` (`src/data/directusAdapter.js`) now falls back **only** on
  `undefined`/`null`. An empty string `""` is treated as a deliberate editor
  clear and is kept. Directus stores untouched fields as `null`, so fallback
  safety for never-filled fields is preserved. Empty arrays still fall back.
- `withFallback` (`src/data/cmsService.js`) follows the same single-field rule:
  missing values fall back, empty strings do not. Contact text and hero video
  titles therefore respect an intentional editor clear.
- Content blocks (`applyContentBlocks`, `cmsService.js`): a row that **exists**
  but whose text was cleared (Directus stores it as `null` **or** `""`) now
  overrides to empty, so the default text does not return. This is the real fix
  for Website-Text-Editor edits — a cleared text field (e.g. `location.eyebrow`
  "Find the Centre") hides on the site. Only `text`/`multiline` clear this way;
  `number`/`boolean`/`url` still skip-on-empty (a blanked number never becomes 0,
  a blanked link never yields a broken href). Deleting the **row** still removes
  the override, so the default tree value returns. "Clear to blank" ≠ "delete row".

**Menu left rows are selectors (implemented).**
- `MenuOverlay.jsx`: every left section row is a `<button>` selector (reveals the
  right-side card on desktop / links on mobile), never a direct `<a>`. Childless
  sections (Gallery, Tender, FAQ) reveal a single link to their own page; the
  right-side card is the real navigation target. Rows use `cursor-default`.

**Reveal-on-scroll boxes stuck hidden — fixed (`RevealStagger.jsx`).**
- Symptom: "Institution at a Glance" (and any `RevealStagger` grid) sometimes
  showed no boxes. Cause: children start at `opacity:0` and only reveal when the
  container's single IntersectionObserver fires; on fast scroll / load-scrolled-
  past / observer race it could miss, leaving all children invisible.
- Fix: drive the reveal with `useInView` **plus** a 1.2 s mount fallback timer
  (`forceShow`) so the group always reaches the `show` state. Animation and
  `once`/`amount` behaviour unchanged; only adds a guarantee it can never stay
  hidden. Reduced-motion path still renders plain visible markup.

**Per-section fonts (NOT wired — do this manually, do not inject raw CSS).**
1. In Directus, on each target section group (Facilities, Divisions, Operational
   Domains, Services and Programmes, Institution at a Glance) add optional
   **Dropdown (select)** fields: `font_family`, `heading_font_family`,
   `body_font_family` with a short safe list only (e.g. `Inter`, `Poppins`,
   `Mukta` for Devanagari, `Noto Sans`, `System default`); and `font_weight`,
   `heading_font_weight`, `body_font_weight` as Dropdown `400/500/600/700`. All
   nullable, no forced default.
2. Frontend: read via the existing settings/pageContent path. Map the dropdown
   VALUE to a whitelisted CSS stack in JS (never inject the raw string). Apply as
   inline `style` (`fontFamily`,`fontWeight`) on that section's wrapper only —
   section-scoped, never global.
3. Missing/unknown value ⇒ use the section's current default (no-op). Whitelist
   only legible fonts + weights 400–700 for GIGW/readability.

**Fully editable homepage sections (add/delete/reorder — manual Directus steps).**
Operational Domains (`mission_pulse.domains`), Services and Programmes
(`services`), Institution at a Glance (`impact_stats`) live as JSON on the
`settings` singleton — fine for text edits, but per-item add/delete/reorder means
editing JSON (not for normal users). To make them normal-user CRUD, mirror the
existing repeatable-collection pattern (`home_feature_tabs` / `brand_logos` /
`organisation_roles`):
1. Create one collection per section, e.g. `home_operational_domains`,
   `home_services`, `home_institution_stats`, with simple fields only: `title`,
   `description`, `icon` (dropdown), `image` (file), `link_label`, `link_url`,
   `stat_value`, `stat_label`, `sort` (integer), `status` (draft/published), plus
   `translations` (hi). No JSON/HTML/CSS/path fields for editors.
2. In `cmsService.js` add `readPublishedItems(collections.<new>, {sort:["sort"]})`,
   map with `localizeDirectusItem`, use the CMS list when non-empty else the
   current fallback array (mirror `cmsFeatureTabs`/`cmsLogos`).
3. Keep the section render defensive: guard missing `icon`/`image`/`link`, skip
   `status !== 'published'`, order by `sort`. Ship behind "use CMS list if
   present, else fallback" so nothing breaks before the collection is populated.

### हिन्दी (सार)
- **CMS > fallback:** अब Website Text Editor में text field **खाली** करने पर वह
  खाली रहेगा — भले Directus उसे `null` रखे या `""` (`applyContentBlocks` अब मौजूद
  row को खाली मानता है)। जैसे `location.eyebrow` "Find the Centre" खाली करने पर
  छिप जाएगा। सिर्फ text/multiline; number/boolean/url अब भी skip। **row delete**
  करने पर default लौटता है — text छिपाना हो तो row delete न करें, field खाली करें।
- **Reveal boxes:** "Institution at a Glance" के box कभी-कभी नहीं दिखते थे
  (`RevealStagger` observer miss)। अब `useInView` + 1.2s fallback timer से box हमेशा
  दिखते हैं।
- **Menu:** बाएँ सब rows अब selector button हैं (Gallery/Tender/FAQ भी); असली link
  दाईं ओर card है।
- **Fonts:** Directus में हर section पर **Dropdown** fields जोड़ें (`font_family`
  आदि, safe list), फिर frontend में value को whitelist CSS से map करके सिर्फ उस
  section पर लगाएँ। raw CSS कभी न लें। missing value = default.
- **Homepage sections पूरी तरह editable:** हर section के लिए अलग collection बनाएँ
  (जैसे `home_operational_domains`) — simple fields + `sort` + `status` + Hindi।
  `cmsService.js` में reader जोड़ें; list खाली हो तो fallback चले।
