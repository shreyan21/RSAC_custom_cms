# RSAC-UP Directus to Drupal Phase 1 Migration Plan

Phase 1 scope: audit current Directus usage, document a Drupal migration path, and add only an isolated Drupal foundation. No frontend behavior is changed in this phase.

## 1. Current Directus Usage Map

The copied project is a React/Vite frontend with a decoupled Directus CMS and static fallback data.

- Frontend entry: `src/App.jsx`
- Data orchestration: `src/contexts/DataContext.jsx`
- CMS config: `src/data/cmsConfig.js`
- Directus API client: `src/data/directusClient.js`
- Directus normalizers/media/localization helpers: `src/data/directusAdapter.js`
- CMS domain fetchers: `src/data/cmsService.js`
- Consumer hooks: `src/hooks/useData.js`
- Static fallback data: `src/data/defaultData.js` plus generated/static files under `src/data/`
- Existing Directus service: `backend/directus/`
- Existing deployment docs/templates: `DEPLOYMENT_NGINX.md`, `DEPLOYMENT_AND_TRANSFER_GUIDE.md`, `backend/directus/deployment/`

Directus collections currently used by the frontend:

| Current Directus collection | Frontend purpose |
| --- | --- |
| `rsac_pages` | Website pages for about, divisions, facilities, academics, services/programmes style pages |
| `rsac_sections` | Section grouping and route metadata for page collections |
| `rsac_page_images` | Editor image overrides inside locked page HTML |
| `rsac_divisions` | Scientific division cards |
| `rsac_facilities` | Facility cards |
| `rsac_profiles` | Officials, leadership, scientists, former, technical, administration profiles |
| `rsac_geoportals` | Geoportal cards and links |
| `rsac_notices` | Notices, circulars, tender-style PDF rows |
| `rsac_flood_reports` | Flood report PDF rows |
| `rsac_policies` | Policy/help pages |
| `rsac_public_info` | RTI, feedback, tenders, FAQ public pages |
| `rsac_contact` | Contact details |
| `rsac_hero_videos` | Homepage hero video/poster |
| `rsac_manpower_groups` | Manpower summary cards |
| `rsac_menu` | Main menu/navigation tree |
| `rsac_site_settings` | Branding, homepage content, footer, layout, labels, appearance |
| `rsac_content_blocks` | Editable homepage/shared text blocks |
| `rsac_brand_logos` | Header/branding logos |
| `rsac_home_feature_tabs` | Homepage tabs/section items and mobile app style items |
| `rsac_organisation_roles` | Organisation chart roles |
| `rsac_quick_links` | Homepage quick links/cards |
| `rsac_mobile_apps` | Mobile app/download cards |
| `rsac_gallery_items` | Photo gallery |
| `rsac_site_visits` | Visitor count endpoint extension |

## 2. Files Currently Depending on Directus

Primary runtime files:

- `src/data/cmsConfig.js`
- `src/data/directusClient.js`
- `src/data/directusAdapter.js`
- `src/data/cmsService.js`
- `src/contexts/DataContext.jsx`
- `src/App.jsx` for CMS preview banner and CMS loading gate
- `src/hooks/useVisitorCount.js`
- `src/components/public/FeedbackForm.jsx`

Indirect consumer files read CMS-backed data through `src/hooks/useData.js`, not directly through Directus. Important consumers include:

- Homepage sections: `src/components/hero/*`, `src/components/sections/*`, `src/components/navigation/HomeSectionNav.jsx`
- Navigation/footer: `src/components/navbar/*`, `src/components/layout/Footer.jsx`, `src/components/navigation/RouteAnnouncer.jsx`
- Public pages: `src/pages/public/NoticesPage.jsx`, `src/pages/public/FloodReportsPage.jsx`, `src/pages/public/GalleryPage.jsx`, `src/pages/public/PublicInfoPage.jsx`
- Official content: `src/pages/OfficialContentPage.jsx`
- People pages: `src/pages/people/*`
- Policy pages: `src/pages/policies/*`
- Contact, geoportals, mobile apps, organisation chart pages

CMS scripts/docs also depend on Directus and should stay untouched until later phases:

- `scripts/directus-setup.mjs`
- `scripts/setup-cms.mjs`
- `scripts/prepare-local-cms.mjs`
- `scripts/cms-*.mjs`
- `scripts/sync-rsac-hindi-content.mjs`
- `scripts/export-cms-to-generated.mjs`
- `scripts/localize-media.mjs`
- `backend/directus/**`
- `DIRECTUS_COLLECTIONS_GUIDE.md`, `CMS_*`, `FALLBACK_DATA_GUIDE.md`, `HINDI_CONTENT_GUIDE.md`

## 3. Existing Content/Fallback Flow

Current flow:

1. `LanguageProvider` decides `en` or `hi` from `?lang=`, local storage, or default English.
2. `DataProvider` creates static fallback data for the active language.
3. If `VITE_CMS_ENABLED=true`, `DataProvider` calls all `get*()` functions from `src/data/cmsService.js`.
4. `cmsService.js` fetches Directus rows through `readPublishedItems()` / `readDirectusSingleton()`.
5. `directusAdapter.js` localizes, normalizes, rewrites media URLs, and applies fallback rules.
6. If CMS data is missing or request fails, existing previous/static fallback remains.

Important invariant: CMS wins when present. Static fallback protects the public website when CMS is down or content is missing.

List behavior:

- Directus non-empty list wins over fallback list.
- Empty/missing list falls back to static list.
- Single missing value can fall back value-by-value.
- Empty string is treated as deliberate editor clearing, not fallback.

## 4. Existing Hindi/English Flow

Current language flow:

- `src/contexts/LanguageContext.jsx` supports `en` and `hi`.
- `?lang=hi` or `?lang=en` can force language.
- The selected language is stored in local storage.
- `document.documentElement.lang` becomes `hi` or `en-IN`.
- Static UI uses `hiTranslations` plus optional CMS interface labels.
- Most Directus rows use `_hi` fields or `translations.hi`.
- Missing Hindi field falls back to English for that field.

Known exception:

- Old division and some academic body content preserve a locked English HTML structure and use `src/data/divisionHindiPhrases.js` / generated phrase maps at render time.
- This keeps tabs, tables, profile grouping, media, and layout stable.
- Drupal migration must preserve this behavior first, then later decide whether to structure those long page bodies more deeply.

## 5. Existing Media/File Flow

Current Directus media flow:

- `directusAssetUrl()` converts file IDs to `${VITE_CMS_URL}/assets/{id}`.
- `directusImageUrl()` adds image transform params such as width, quality, format, fit.
- `rewriteOfficialMedia()` maps old official media references to local mirrored files under `public/official-media`.
- Page image overrides swap specific image sources inside locked HTML.
- Missing media should not crash pages; slots are skipped or safe fallback media is used.
- Existing static media remains in `public/`, `public/official-media/`, `public/images/`, `public/documents/`, and bundled `src/assets/`.

Drupal must keep absolute/relative media URL safety, PDF preview behavior, lazy image handling, and fallback for missing files.

## 6. Recommended Drupal Architecture for SDC

Use Drupal as a decoupled/headless CMS, not as a Drupal theme.

Recommended architecture:

- Public frontend: existing React/Vite static build, served by Nginx/Apache from SDC web root.
- CMS: Drupal admin/API service on a separate private or protected host/subpath.
- Database: PostgreSQL dedicated to Drupal.
- API: Drupal JSON:API for regular content reads; REST/custom controller only for special endpoints.
- Files: Drupal public/private files directory backed up with PostgreSQL.
- Security: public API exposes only published content; admin paths protected by HTTPS, firewall/VPN/IP allowlist if SDC policy allows.
- Frontend adapter: later replace Directus-specific client/normalizer with a Drupal adapter that returns the same shape `DataProvider` already expects.

Do not rebuild the frontend as a Drupal theme unless SDC policy rejects decoupled deployment.

## 7. Drupal + PostgreSQL Setup Approach

Local Phase 1 foundation:

- Add isolated `cms-drupal/`.
- Use Docker Compose for local proof of concept only.
- Use Drupal + PostgreSQL.
- Do not connect frontend yet.
- Do not import Directus data yet.

Production/SDC approach:

- Prefer SDC-approved package/container pattern.
- Pin exact Drupal, PHP, PostgreSQL versions after SDC confirms supported stack.
- Enable required PostgreSQL extension `pg_trgm`.
- Store secrets outside git.
- Back up database and Drupal files together.

Note from Drupal docs checked during this audit: Drupal JSON:API is a core module, and Drupal 11 PostgreSQL requirements list PostgreSQL 16+ plus `pg_trgm`. Verify exact version policy again in Phase 2 before production pinning.

## 8. JSON:API vs REST Recommendation

Recommendation: JSON:API first.

Why:

- JSON:API is in Drupal core.
- It exposes Drupal entities and fields with predictable include/filter/sort behavior.
- It is better for a decoupled React frontend consuming many content types.
- It reduces custom backend code.

Use REST/custom endpoints only when needed for:

- Visitor count write endpoint replacement.
- Feedback form write endpoint replacement.
- A flattened navigation/settings endpoint if JSON:API responses become too verbose.
- Any SDC security rule requiring a custom read-only facade.

## 9. Drupal Media/File Handling Approach

Recommended Drupal media model:

- Enable Media and Media Library.
- Use media reference fields for image/PDF/video fields.
- Keep public files for website-visible PDFs/images.
- Use private files only for restricted documents.
- Store alt text, title, caption, and language-specific captions.
- Preserve original filename where needed for traceability.
- Add image styles for common frontend sizes, but keep frontend able to handle original URLs.
- Keep a migration manifest for old `public/official-media` and Directus file IDs.

Frontend adapter should return:

- `src`, `url`, `poster`, `caption`, `alt`, `meta`, and `isLocalFile` in the same shape used today.
- PDF URLs safe for existing `Lightbox` / document dialog behavior.

## 10. Hindi/English Content Strategy

Recommended Drupal multilingual setup:

- Enable Language, Content Translation, Configuration Translation, Interface Translation.
- Add English and Hindi.
- Make each content type translatable where public copy is stored.
- Keep slugs/path aliases stable across languages where route compatibility matters.
- Store title/body/summary/links/media captions per language.
- Missing Hindi should fall back to English in the frontend adapter, matching current behavior.
- Do not auto-translate official content.
- Keep existing Hindi phrase-map exception during first Drupal adapter phase for division/academic locked bodies.

## 11. Fallback Strategy

Keep current fallback strategy during migration:

- Phase 2 Drupal adapter should return `null` on API failure so existing fallback continues.
- Existing generated/static fallback files remain untouched until Drupal parity is proven.
- Add a feature flag such as `VITE_CMS_PROVIDER=drupal` only after adapter tests pass.
- Keep `VITE_CMS_PROVIDER=directus` as rollback until final cutover.
- Do not delete Directus code or data until Drupal has been verified on staging and backups exist.

## 12. Recommended Drupal Content Types and Fields

Keep it simple and government-friendly.

### Page

- Title
- Slug/path alias
- Section reference
- Summary
- Body HTML
- Hindi translation
- Featured image/media
- Content fields JSON or structured child references
- Card icon/color fields if current card look must remain editor-controlled
- Status/published
- Sort/display order

### Page Section

- Key
- Route
- Title
- Eyebrow
- Intro
- Sort
- Status

### Section Item

- Internal key
- Section key/group
- Title
- Summary/body
- Icon key
- Link/path
- Media
- Sort
- Status

### Division

- Title
- Slug/key
- Lead/summary
- Highlights
- Source URL
- Sort
- Status

### Project

- Title
- Project type: ongoing/completed
- Division reference
- Year/date range
- Funding/client
- Summary
- Report/document media
- Sort
- Status

### Publication

- Title
- Publication type: research paper, technical report, atlas, article
- Division reference
- Year/date
- Authors
- Citation/summary
- Document/link
- Sort
- Status

### Download

- Title
- Category
- File media
- External URL
- Meta/size/language
- Sort
- Status

### Gallery Item

- Image media
- Caption
- Alt text
- Event/date
- Sort
- Status

### Notice/Tender/FAQ

- Content kind: notice, circular, tender, FAQ
- Title/question
- Body/answer
- Category
- Published date
- Last date
- Document media
- Meta
- Sort
- Status

### Menu Item

- Title
- Description
- Path
- Parent/menu group
- Child links or menu link content
- Sort
- Status

### Site Setting

- Branding
- Contact details
- Footer
- Homepage layout
- Interface labels
- Accessibility text
- Search labels
- Organisation chart settings
- Hero settings
- Appearance/layout settings

## 13. Directus-to-Drupal Mapping

| Directus | Drupal target |
| --- | --- |
| `rsac_pages` | Page |
| `rsac_sections` | Page Section |
| `rsac_page_images` | Page media override field or Page Section Item media references |
| `rsac_divisions` | Division |
| `rsac_facilities` | Page or Section Item |
| `rsac_profiles` | Page/Section Item initially, later optional Person type if needed |
| `rsac_geoportals` | Section Item or Download/Link style item |
| `rsac_notices` | Notice/Tender/FAQ |
| `rsac_flood_reports` | Download or Notice/Tender/FAQ with `kind=flood_report` |
| `rsac_policies` | Page |
| `rsac_public_info` | Page or Notice/Tender/FAQ for FAQ rows |
| `rsac_contact` | Site Setting |
| `rsac_hero_videos` | Section Item or Site Setting media field |
| `rsac_manpower_groups` | Section Item |
| `rsac_menu` | Menu Item |
| `rsac_site_settings` | Site Setting |
| `rsac_content_blocks` | Section Item or Site Setting fields |
| `rsac_brand_logos` | Site Setting media references |
| `rsac_home_feature_tabs` | Section Item |
| `rsac_organisation_roles` | Section Item or Page structured field |
| `rsac_quick_links` | Section Item |
| `rsac_mobile_apps` | Download |
| `rsac_gallery_items` | Gallery Item |
| `rsac_site_visits` | Custom Drupal endpoint or lightweight separate counter service |

## 14. Migration Phases

### Phase 1 - Current work

- Audit current Directus integration.
- Write migration plan.
- Add isolated Drupal + PostgreSQL foundation.
- Stop. No frontend connection.

### Phase 2 - Drupal schema proof

- Install Drupal locally.
- Enable multilingual, media, JSON:API, REST only if needed.
- Create content types and fields.
- Add only 2-3 sample rows: one Page, one Notice/Tender/FAQ, one Gallery Item.
- Test JSON:API read output.

### Phase 3 - Frontend adapter prototype

- Add a new `drupalClient` and `drupalAdapter`.
- Keep Directus adapter untouched.
- Add `VITE_CMS_PROVIDER=drupal` behind feature flag.
- Map only one low-risk area first, such as notices or gallery.

### Phase 4 - Content migration scripts

- Export Directus content safely.
- Build deterministic import scripts into Drupal.
- Migrate media with manifest.
- Preserve slugs, sort order, publish state, Hindi fields, and file references.

### Phase 5 - Parity testing

- Compare routes, menus, homepage sections, Hindi/English, PDFs, images, mobile layout, keyboard navigation, GIGW-friendly pages.
- Keep Directus available for rollback.

### Phase 6 - Staging cutover

- Deploy Drupal on staging.
- Point frontend staging to Drupal provider.
- Run full checklist and editor training.

### Phase 7 - Production cutover

- Freeze Directus edits.
- Run final delta migration.
- Back up Directus DB/uploads.
- Point production frontend to Drupal.
- Monitor API errors and public routes.

### Phase 8 - Decommission Directus

- Only after acceptance, archive Directus code/data.
- Keep final Directus backup offline for audit/rollback window.

## 15. Risks

- Division/academic pages use locked HTML plus phrase-map Hindi; naive Drupal body migration can break tabs/tables/profile parsing.
- Current `cmsService.js` encodes Directus-specific collection names and field names deeply.
- Drupal JSON:API payload shape differs from Directus; adapter must normalize carefully.
- Media references differ: Directus file IDs vs Drupal file/media entities.
- Visitor count and feedback currently use Directus custom endpoints; Drupal needs replacements.
- Public API permissions must be published-only, read-only for anonymous users.
- PostgreSQL versions/extensions must match Drupal version and SDC approval.
- Current docs mention some env naming drift (`VITE_DIRECTUS_URL` in one guide vs current `VITE_CMS_URL` in code).
- Existing `.env.local` exists and must not be copied or exposed.
- Directus uploads/database and Drupal files/database must not be mixed.

## 16. Rollback Plan

Phase 1 rollback:

- Delete `DRUPAL_MIGRATION_PLAN.md`.
- Delete `cms-drupal/`.
- No frontend rollback needed because no frontend behavior was changed.

Later phase rollback:

- Keep `VITE_CMS_PROVIDER=directus` until Drupal parity is proven.
- Keep Directus DB dump and uploads backup.
- Keep Drupal DB/files backup before each import.
- If Drupal adapter fails, switch frontend env back to Directus and rebuild.
- If content import fails, drop/recreate local Drupal database and re-run import from source export.
- Never delete Directus production data before accepted production cutover and backup verification.

## 17. Testing Checklist

Before any frontend cutover:

- Build and lint still pass.
- Homepage hero, ticker, mission, services, stats, location, gallery preview remain unchanged.
- Main menu, mobile menu, footer, search/route announcements remain unchanged.
- English/Hindi toggle works.
- `?lang=hi` and `?lang=en` work.
- Missing Hindi falls back to English.
- Division pages preserve tabs, left nav, profiles, tables, research papers, technical reports, ongoing/completed projects, maps/photos.
- Notices/tenders/FAQ render with latest-first/manual sort behavior.
- Gallery opens images in lightbox.
- Downloads/PDFs open through existing dialog.
- Public info pages RTI/feedback/tenders/FAQ still route correctly.
- Policies and sitemap still route correctly.
- Media URLs resolve under SDC CSP.
- Keyboard navigation and focus states remain usable.
- Mobile layout has no overlap/clipping.
- CMS API returns only published content anonymously.
- Draft preview is disabled on public unless approved.
- No secrets in `VITE_*` env values.

## 18. SDC Deployment Notes

- Keep frontend and CMS decoupled unless SDC policy explicitly requires another model.
- Serve React build as static files.
- Run Drupal behind HTTPS with SDC-approved web server/container stack.
- Keep PostgreSQL private; do not expose database port publicly.
- Restrict Drupal admin access by network/IP/VPN where possible.
- Configure CSP to include Drupal media/API origin.
- Repeat security headers already used in existing Nginx templates.
- Back up Drupal database and files directory together.
- Keep logs, update process, and security advisory monitoring documented.
- Pin exact Drupal/PHP/PostgreSQL versions only after SDC confirms supported versions.
- For Drupal 11 with PostgreSQL, plan for PostgreSQL 16+ and `pg_trgm` unless Phase 2 version verification changes target.

## References Checked

- Drupal JSON:API core module documentation: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module
- Drupal database server requirements: https://www.drupal.org/docs/getting-started/system-requirements/database-server-requirements
- Drupal Composer installation documentation: https://www.drupal.org/docs/develop/using-composer/manage-dependencies
