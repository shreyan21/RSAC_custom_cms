# Drupal Runtime Verification

Date: 2026-07-08
Project audited: `D:/RSAC-Drupal-Test`
Source project `D:/rsac_website`: not touched.

## Verdict

Drupal migration is partly runtime-ready.

The frontend does respect `VITE_CMS_PROVIDER=drupal`, and several sections do call Drupal JSON:API before Directus/static fallback. The migration is not complete for every content area. Some areas are Drupal-ready, some are only editable through Drupal site settings JSON, and some still depend on Directus or static files.

## Actual Runtime CMS Flow

1. `src/data/cmsConfig.js` reads:
   - `VITE_CMS_ENABLED`
   - `VITE_CMS_PROVIDER`
   - `VITE_CMS_URL` / `VITE_DRUPAL_URL`
   - `VITE_DIRECTUS_FALLBACK_ENABLED`

2. If `VITE_CMS_PROVIDER=drupal`, Drupal base URL becomes the active CMS URL.

3. `src/contexts/DataContext.jsx` calls CMS service functions from `src/data/cmsService.js`.

4. Most `cmsService` functions follow this order:
   - Try Drupal first when `isDrupalCms()` is true.
   - If Drupal returns usable data, use Drupal data.
   - If Drupal returns `null` or empty, try Directus.
   - If Directus is disabled/unavailable, use bundled static fallback.

5. `src/data/directusClient.js` allows Directus calls only when:
   - provider is `directus`, or
   - provider is `drupal` and `VITE_DIRECTUS_FALLBACK_ENABLED=true`.

6. With `VITE_DIRECTUS_FALLBACK_ENABLED=false`, Directus fetch functions return `null`; site still falls back to static data.

## Sections Truly Connected To Drupal

These have real runtime Drupal calls:

- Site settings
  - Function: `getDrupalSiteSettings`
  - Bundle: `rsac_site_setting`
  - Used by header labels, footer labels, homepage settings, layout, branding values, page content blocks when placed in `field_settings_json`.

- Official content pages
  - Function: `getDrupalRsacOfficialSections`
  - Bundles: `rsac_page_section`, `rsac_page`
  - Used by:
    - About Us
    - Divisions detail pages
    - Facilities detail pages
    - Academics pages
    - services/programme-style official pages if `field_section_key` exists.

- Divisions list
  - Function: `getDrupalDivisions`
  - Bundle: `rsac_division`

- Facilities short list
  - Function: `getDrupalFacilities`
  - Bundle: `rsac_page`
  - Requires `field_section_key=facilities`.

- Quick links
  - Function: `getDrupalQuickLinks`
  - Bundle: `rsac_section_item`
  - Requires `field_section_key=quick_links`.

- Geoportals
  - Function: `getDrupalGeoportals`
  - Bundle: `rsac_section_item`
  - Requires `field_section_key=geoportals`.

- Mobile apps/download cards
  - Function: `getDrupalMobileApps`
  - Bundle: `rsac_download`
  - Requires `field_kind=mobile_app` or `field_kind=app`.

- Gallery items
  - Function: `getDrupalGalleryItems`
  - Bundle: `rsac_gallery_item`

- Flood latest reports
  - Function: `getDrupalFloodData`
  - Bundle: `rsac_download`
  - Requires `field_kind=flood_report`.

- Notices/circulars
  - Function: `getDrupalNotices`
  - Bundle: `rsac_notice_tender_faq`
  - Uses all non-FAQ rows.

- Policies and Help pages
  - Function: `getDrupalPolicies`
  - Bundle: `rsac_page`
  - Requires `field_section_key=policies`.

- Public info pages
  - Function: `getDrupalPublicInfoPages`
  - Bundle: `rsac_page`
  - Requires `field_section_key=public_info`.
  - Used by RTI, feedback, tenders, FAQ style pages.

- Main menu
  - Function: `getDrupalMenuItems`
  - Bundle: `rsac_menu_item`

- Feedback submit
  - Function: `submitDrupalFeedback`
  - Only active when `VITE_DRUPAL_FEEDBACK_PATH` is set.
  - Falls back to Directus, then mailto behavior.

- Visitor count
  - Functions: `recordDrupalVisit`, `readDrupalVisitCount`
  - Only active when `VITE_DRUPAL_VISIT_PATH` / `VITE_DRUPAL_VISIT_COUNT_PATH` are set.
  - Falls back to Directus count when enabled.

## Sections Partially Connected

- Homepage
  - Runtime is connected through `rsac_site_setting.field_settings_json`.
  - Some separate card/list data comes through `rsac_section_item`, gallery, geoportals, mobile apps, notices.
  - Mission, about, services, stats, location, footer text, UI labels are not separate friendly Drupal fields yet; they live inside `field_settings_json`.

- Tenders
  - `/tenders` route uses `PublicInfoPage slug="tenders"`, so Drupal can provide it through `rsac_page` with `field_section_key=public_info`.
  - Dedicated tender listing from `rsac_notice_tender_faq` is not separately wired.
  - If rows with `field_kind=tender` are added to `rsac_notice_tender_faq`, current `getDrupalNotices` may show them in the notices list because it includes every non-FAQ row.

- FAQ
  - `/faq` route can be supplied as a public info page through `rsac_page`.
  - `field_kind=faq` rows in `rsac_notice_tender_faq` are currently ignored by runtime.

- Projects
  - `rsac_project` bundle is documented.
  - Runtime does not read it as a dedicated list.
  - Projects display only when included inside `rsac_page.body` or structured page content.

- Publications
  - `rsac_publication` bundle is documented.
  - Runtime does not read it as a dedicated list.
  - Publications display only when included inside `rsac_page.body` or structured page content.

- Flood archive years
  - Latest/current flood reports can come from Drupal.
  - Year-wise archive data still comes from `src/data/floodReportsArchive.generated.js` and local `/public/documents/flood/...` files.

- Gallery section heading/intro
  - Gallery items come from Drupal.
  - Heading/intro comes from site settings page content or static `src/data/gallery.js` fallback.

## Sections Not Connected To Drupal Yet

These still use Directus first, then static fallback:

- Contact details
  - `getContactDetails`
  - Uses Directus collection `rsac_contact` or site settings/static fallback.

- Officials
  - `getOfficials`
  - Uses Directus profiles/static fallback.

- Leadership profiles
  - `getLeadershipProfiles`
  - Uses Directus profiles/static fallback.

- Scientist profiles
  - `getScientistProfiles`
  - Uses Directus profiles/static fallback.

- Former scientist profiles
  - `getFormerProfiles`
  - Uses Directus profiles/static fallback.

- Technical staff profiles
  - `getTechnicalProfiles`
  - Uses Directus profiles/static fallback.

- Administration profiles
  - `getAdministrationProfiles`
  - Uses Directus profiles/static fallback.

- Manpower groups
  - `getManpowerGroups`
  - Uses Directus/static fallback.

- Hero videos
  - `getHeroVideos`
  - Uses Directus hero video rows or static bundled hero videos.
  - Drupal does not have a dedicated hero media reader yet.

- Brand logos and organisation roles as media relations
  - Directus path supports uploaded logo/role media.
  - Drupal site settings can provide values through JSON, but there is no dedicated Drupal media relationship reader for these yet.

- Organisation chart uploaded image
  - Directus supports file relation.
  - Drupal can only supply it through `field_settings_json` URL unless a future media field is wired.

## Directus Dependencies Still Remaining

Network-level Directus dependency remains optional and gated by `VITE_DIRECTUS_FALLBACK_ENABLED`.

Runtime functions still containing Directus fallback logic:

- `getSiteSettings`
- `getDivisions`
- `getFacilities`
- `getQuickLinks`
- `getMobileApps`
- `getGalleryItems`
- `getContactDetails`
- `getOfficials`
- `getLeadershipProfiles`
- `getScientistProfiles`
- `getFormerProfiles`
- `getTechnicalProfiles`
- `getAdministrationProfiles`
- `getManpowerGroups`
- `getHeroVideos`
- `getGeoportals`
- `getFloodData`
- `getNotices`
- `getPolicies`
- `getPublicInfoPages`
- `getMenuItems`
- `getRsacOfficialSections`

Directus is not required for build when fallback is disabled. It is still useful while Drupal content is incomplete.

## Static Fallback Dependencies Still Remaining

Static fallback remains necessary for safe public rendering:

- `src/data/defaultData.js`
- `src/data/siteSettings.js`
- `src/data/rsacOfficialContent.generated.js`
- `src/data/rsacOfficialContent.hi.generated.js`
- `src/data/policies.hi.generated.js`
- `src/data/floodReportsArchive.generated.js`
- local assets under `public/`
- local official media under `public/official-media/`
- local flood documents under `public/documents/flood/`

Static fallback is used when Drupal is disabled, unreachable, empty, or missing a section.

## Exact Drupal Endpoints Expected

Base English path:

```text
{VITE_CMS_URL}{VITE_DRUPAL_JSONAPI_PATH}/node/{bundle}
```

Base Hindi path when `VITE_DRUPAL_LANGUAGE_PREFIX_MODE=path`:

```text
{VITE_CMS_URL}/hi{VITE_DRUPAL_JSONAPI_PATH}/node/{bundle}
```

The client tries Hindi path first for Hindi mode, then unprefixed English path.

Expected JSON:API endpoints:

```text
/jsonapi/node/rsac_site_setting
/jsonapi/node/rsac_page_section
/jsonapi/node/rsac_page
/jsonapi/node/rsac_section_item
/jsonapi/node/rsac_division
/jsonapi/node/rsac_download
/jsonapi/node/rsac_gallery_item
/jsonapi/node/rsac_notice_tender_faq
/jsonapi/node/rsac_menu_item
```

Documented but not dedicated runtime feeds yet:

```text
/jsonapi/node/rsac_project
/jsonapi/node/rsac_publication
```

Optional custom endpoints:

```text
POST {VITE_DRUPAL_FEEDBACK_PATH}
POST {VITE_DRUPAL_VISIT_PATH}
GET  {VITE_DRUPAL_VISIT_COUNT_PATH}
```

## Exact Drupal Content Type And Field Expectations

### `rsac_site_setting`

Required:

- `title`
- `field_settings_json`

Runtime expects JSON matching existing `src/data/siteSettings.js` shape.

### `rsac_page_section`

Required:

- `title`
- `field_key`
- `field_route`
- `field_eyebrow`
- `field_intro`
- `field_sort`

### `rsac_page`

Required/used:

- `title`
- `body`
- `field_slug` or path alias
- `field_section_key`
- `field_summary`
- `field_featured_image`
- `field_source_url`
- `field_sort`
- `field_card_icon`
- `field_card_color`
- `field_card_color_2`
- `field_sections_json`
- `field_links_json`

Important `field_section_key` values:

- `about-us`
- `divisions`
- `facilities`
- `academics`
- `policies`
- `public_info`

### `rsac_section_item`

Required/used:

- `title`
- `field_key`
- `field_section_key`
- `field_summary`
- `field_path`
- `field_url`
- `field_icon_key`
- `field_accent`
- `field_sort`

Important `field_section_key` values:

- `quick_links`
- `geoportals`

### `rsac_division`

Required/used:

- `title`
- `field_slug`
- `field_lead`
- `field_highlights`
- `field_source_url`
- `field_sort`

### `rsac_download`

Required/used:

- `title`
- `field_kind`
- `field_category`
- `field_date`
- `field_date_label`
- `field_coverage`
- `field_meta`
- `field_file`
- `field_document`
- `field_url`
- `field_summary`
- `field_sort`

Important `field_kind` values:

- `mobile_app`
- `app`
- `flood_report`

### `rsac_gallery_item`

Required/used:

- `title`
- `field_key`
- `field_image`
- `field_alt_text`
- `field_sort`

### `rsac_notice_tender_faq`

Required/used:

- `title`
- `field_kind`
- `field_category`
- `field_date`
- `field_last_date`
- `field_meta`
- `field_file`
- `field_document`
- `body`
- `field_sort`

Current runtime uses non-FAQ rows for notices. FAQ rows are not rendered as a dedicated FAQ list.

### `rsac_menu_item`

Required/used:

- `title`
- `field_summary`
- `field_path`
- `field_links_json`
- `field_sort`

## Media Handling Status

Works for:

- `field_image`
- `field_media`
- `field_file`
- `field_document`
- `field_featured_image`
- media entity `field_media_file`
- media entity `field_media_image`
- media entity `thumbnail`

URL handling:

- Absolute `http`, `https`, `data`, and `blob` URLs are kept.
- Root-relative URLs from Drupal are prefixed with Drupal base URL.
- Missing media returns empty string and should not crash rendering.
- Gallery items without image URL are filtered out.

Limitations:

- No Drupal image transform/resize support yet.
- Hero video, leader portraits, brand logos, and organisation chart are not dedicated Drupal media relations yet.
- Site settings can still point to URLs through JSON.

## Hindi / English Handling Status

Runtime behavior:

- Hindi mode calls `/hi/jsonapi/...` first.
- If that fails, English `/jsonapi/...` is tried.
- Missing Hindi therefore falls back safely to English.
- Drupal translations must be manually entered in Drupal.
- No AI translation exists.
- Manual Drupal Hindi with Devanagari wins where merge helpers are used.

Sections with extra bundled Hindi fallback:

- divisions list
- facilities list
- policies
- public info pages
- menu
- site settings
- flood section labels
- generated official content when Drupal/Directus page data is missing

Limitations:

- Official Drupal page bodies depend on Drupal translated `body`.
- If Drupal returns English body for Hindi mode, frontend displays English body rather than auto-translating.
- `field_settings_json`, `field_sections_json`, and `field_links_json` are still technical for non-technical editors.

## Empty / Missing Drupal Response Safety

Safe cases:

- Drupal disabled: static fallback loads.
- Drupal provider selected but base URL missing: functions return null/static fallback.
- Drupal endpoint unavailable: request returns null after timeout/failure.
- Drupal collection empty: Directus/static fallback remains.
- Directus fallback disabled: Directus calls return null and static fallback remains.
- Missing media URL: item is skipped or renders without document button.

## Small Fix Applied During Audit

`getDrupalSiteSettings` now sorts `rsac_site_setting` by `title` instead of default `field_sort,title`.

Reason:

- Documented `rsac_site_setting` content type has no `field_sort`.
- Sorting by a missing field can make Drupal JSON:API reject the request.
- Fix is small and does not change UI.

## Risks Before SDC Handover

- Drupal backend content types must exactly match expected machine names or env overrides.
- JSON fields are still too technical for normal editors.
- Contact/profile/hero media areas are not Drupal-native yet.
- Projects and publications bundles are documented but not runtime-read as dedicated feeds.
- FAQ and tender bundle behavior is partial.
- Site settings JSON is powerful but risky for non-technical editors.
- Visitor count and feedback need real Drupal custom endpoints.
- No live Drupal server was available in this audit, so JSON:API shape was verified from code, not by HTTP response.

## Next Required Fixes

Safest next order:

1. Create Drupal content types and fields exactly as above.
2. Add one sample item per bundle.
3. Point `.env.local` to Drupal with:
   - `VITE_CMS_ENABLED=true`
   - `VITE_CMS_PROVIDER=drupal`
   - `VITE_DIRECTUS_FALLBACK_ENABLED=false`
4. Verify browser Network tab calls `/jsonapi/node/...`.
5. Add dedicated Drupal readers for:
   - contact details
   - people/profiles
   - hero videos
   - leader portraits/logos
   - organisation chart file
6. Later, replace technical JSON fields with friendlier Drupal paragraph/reference fields.
7. Add dedicated runtime readers for:
   - `rsac_project`
   - `rsac_publication`
   - FAQ rows
   - tender rows

## Final Runtime Readiness

Runtime Drupal readiness: partial, not complete.

Safe for staged handover if Directus/static fallback remains enabled during content migration.

Not safe to remove Directus yet.

Not safe to promise every CMS area is Drupal-native yet.
