# RSAC Custom CMS Architecture and File Guide

This document explains what runs, how data moves, and what maintained source files do. Binary images, videos, PDFs, and generated archive entries are grouped because listing every asset would not help maintenance.

## 1. System Overview

The project has four parts:

| Part | Technology | Local address | Purpose |
|---|---|---|---|
| Public website | React + Vite | `http://localhost:5173` | Public bilingual RSAC-UP website |
| CMS portal | React + Vite | `http://localhost:5174` | Staff content editing and administration |
| CMS API | Express | `http://localhost:3000` | Authentication, content, media, feedback, and visits |
| Database | PostgreSQL | local/private network | Users, sessions, bilingual content, audit history, feedback |

Drupal and Directus are not runtime dependencies. The original project at `D:\rsac_website` is separate and must not be changed.

## 2. Runtime Flow

### Website read flow

1. `src/main.jsx` mounts the website.
2. `src/contexts/DataContext.jsx` asks `src/data/customCmsClient.js` for `/api/content/bootstrap?lang=en` or `lang=hi`.
3. `server/index.js` reads published rows from PostgreSQL.
4. `server/contentAssembler.js` selects `data_en` or `data_hi` and creates the payload expected by the existing website.
5. `src/hooks/useData.js` gives that content to pages and components.
6. `src/App.jsx` selects the page from the URL; page components render the same responsive UI.
7. The website polls `/api/content/version` and refreshes CMS data after published content changes.

### CMS write flow

1. Staff signs in through `admin/src/App.jsx`.
2. An editor form sends data through `admin/src/api.js` with session cookie and CSRF token.
3. `server/index.js` authenticates the request.
4. `server/contentValidation.js` validates and sanitises the bilingual payload.
5. Express writes `data_en`, `data_hi`, status, and sort order to `cms_entries`.
6. Express writes the change to `cms_audit_log`.
7. The website detects the new content version and reloads published content.

### Hindi and English flow

- English and Hindi are stored separately in `cms_entries.data_en` and `cms_entries.data_hi`.
- Editors switch language inside the CMS and enter translations manually. The system does not auto-translate.
- `server/contentAssembler.js` returns only the selected language to the website.
- Stable entry and row keys keep corresponding English/Hindi sections aligned even when their visible row counts differ.
- Public language state is managed by `LanguageContext`; changing language reloads the matching CMS payload.

### Media flow

- Migrated public CMS media lives in `public/cms-media/` and must be committed.
- New uploads are written to ignored `server/uploads/` and recorded in `cms_media`.
- `admin/src/FieldInput.jsx` previews selected media through URL helpers in `admin/src/api.js`.
- Public assets under `public/` are copied unchanged into the website build.
- Database backup and `server/uploads/` backup must match; Git alone does not transfer new uploads.

## 3. Database Model

Schema source: `server/schema.sql`.

| Table | Purpose |
|---|---|
| `cms_users` | Admin/editor accounts and roles |
| `cms_sessions` | Hashed login sessions and CSRF tokens |
| `cms_entries` | Collection, stable key, status, sort order, and separate EN/HI JSON |
| `cms_media` | Uploaded file metadata and bilingual alternative text |
| `cms_audit_log` | Who changed what and when |
| `cms_feedback` | Public feedback submissions and review status |
| `cms_site_visits` | Daily visitor count |

Content status values are `draft`, `published`, and `archived`. Only published entries are returned by public content endpoints. Lower `sort_order` values appear first unless a specialised collection intentionally uses newest-first ordering.

## 4. Root Files

| File | Responsibility |
|---|---|
| `.env.example` | Safe list of required environment variables; contains placeholders only |
| `.env.local` | Local secrets and machine settings; ignored and never committed |
| `.gitignore` | Excludes secrets, dependencies, builds, dumps, uploads, logs, tools, and large private archives |
| `package.json` | Dependencies and all start, setup, build, audit, and test commands |
| `package-lock.json` | Exact npm dependency versions for repeatable installation |
| `index.html` | Vite HTML entry for public website |
| `vite.config.js` | Public website Vite/Tailwind build configuration |
| `vite.admin.config.js` | CMS portal Vite build configuration and port `5174` |
| `eslint.config.js` | JavaScript/React lint rules |
| `how_to_edit.cmd` | Windows convenience launcher for local editing workflow |
| `README.md` | Short setup, start, and verification entry point |
| `CMS_USER_GUIDE.md` | Non-technical instructions for editing all CMS content |
| `PROJECT_ARCHITECTURE.md` | Technical architecture, flow, and file ownership guide |
| `PROJECT_TRANSFER_GUIDE.md` | GitHub, database, uploads, new-machine, and SDC handover guide |

## 5. CMS Portal Files

| File | Responsibility |
|---|---|
| `admin/index.html` | Vite HTML entry for CMS portal |
| `admin/src/main.jsx` | Mounts CMS React application |
| `admin/src/App.jsx` | Login, dashboard, collection navigation, users, feedback, audit, and editor screens |
| `admin/src/DivisionContentWorkspace.jsx` | Page -> expandable section -> row editing for divisions, facilities, About, and Training/Academics |
| `admin/src/BlockEditor.jsx` | Structured reusable content-block editor |
| `admin/src/FieldInput.jsx` | Text, number, rich text, selection, media, upload, and structured field controls |
| `admin/src/api.js` | Authenticated API requests, CSRF handling, and website/media URL resolution |
| `admin/src/styles.css` | Responsive CMS layout, controls, previews, accessibility, and print styling |

## 6. API and Database Files

| File | Responsibility |
|---|---|
| `server/index.js` | Express application and public/auth/admin/content/media/feedback/visit routes |
| `server/config.js` | Loads and validates environment configuration without hardcoded production secrets |
| `server/db.js` | PostgreSQL connection pool and query helpers |
| `server/auth.js` | Password hashing, sessions, cookies, roles, CSRF, and authentication middleware |
| `server/contentValidation.js` | Validates/sanitises CMS writes against collection definitions |
| `server/contentAssembler.js` | Converts database rows into the bilingual payload expected by the website |
| `server/schema.sql` | PostgreSQL tables, indexes, triggers, and extension setup |
| `server/setup.js` | Creates application role/database/schema/admin and seeds empty CMS content |
| `server/reset-admin.js` | Safely resets a CMS administrator password from local environment input |
| `server/seed-data.generated.json` | Committed starter bilingual content used only when setting up an empty CMS |
| `server/uploads/` | Runtime CMS uploads; ignored and transferred through private backup |
| `shared/cmsCollections.js` | Single collection/field definition shared by API validation and CMS forms |

Main public endpoints:

- `GET /api/health`
- `GET /api/content/bootstrap?lang=en|hi`
- `GET /api/content/version`
- `GET /api/content/:collection`
- `POST /api/feedback`
- `GET|POST /api/visits`

Admin endpoints under `/api/admin/` require authentication. Write endpoints also require CSRF protection and rate limiting.

## 7. Public Website Entry and State

| File | Responsibility |
|---|---|
| `src/main.jsx` | Mounts providers and public React application |
| `src/App.jsx` | Public route table, lazy page loading, and shared page composition |
| `src/index.css` | Global tokens, typography, responsive rules, accessibility, and component styles |
| `src/config/uiConfig.js` | Code-level UI behaviour defaults |
| `src/contexts/DataContext.jsx` | Loads CMS bootstrap, watches content version, refreshes on focus/visibility |
| `src/contexts/DataContextCore.js` | Data context definition kept separate for React refresh rules |
| `src/contexts/LanguageContext.jsx` | English/Hindi selection and persistence |
| `src/contexts/LanguageContextCore.js` | Language context definition |
| `src/contexts/DialogContext.jsx` | Shared accessible dialog state |
| `src/contexts/DialogContextCore.js` | Dialog context definition |
| `src/hooks/useData.js` | Safe access to CMS content from components |
| `src/hooks/useLanguage.js` | Safe access to language state |
| `src/hooks/useDialog.js` | Safe access to shared dialog state |
| `src/hooks/useVisitorCount.js` | Reads and records public visit counts through API |

## 8. Website Data Files

| File/group | Responsibility |
|---|---|
| `src/data/customCmsClient.js` | API request, timeout, bootstrap cache, content version, and cache clearing |
| `src/data/cmsService.js` | Compatibility service that maps CMS bootstrap into existing frontend getters |
| `src/data/cmsInteractions.js` | Feedback and other public write interactions |
| `src/data/contentUtils.js` | Shared content normalisation helpers |
| `src/data/divisionSectionLabels.js` | Stable division section labels/keys |
| `src/data/divisionHindiPhrases.js` | Hindi phrase support used by division rendering |
| `src/data/divisionHindiPhrasesGenerated.js` | Generated Hindi phrase data |
| `src/data/pageTextFields.js` | Structured page text field definitions/helpers |
| `src/data/translations.js`, `uiLabels.js` | Interface labels that are not editorial records |
| `src/data/siteContent.js`, `siteSettings.js` | Website content/settings compatibility defaults |
| `src/data/menuItems.js`, `quickLinks.js` | Navigation and quick-link compatibility data |
| `src/data/gallery.js`, `notices.js`, `publicInfo.js` | Public section compatibility selectors/defaults |
| `src/data/people.js`, `officials.js`, `formerProfiles.js` | People/profile compatibility data |
| `src/data/geoportals.js`, `mobileApps.js`, `policies.js` | Specialised public page compatibility data |
| `src/data/heroVideos.js`, `officialMedia.js` | Media catalogue helpers |
| `src/data/officialMediaManifest.generated.js` | Generated official-media index |
| `src/data/floodReports.js` | Flood report access/search helpers |
| `src/data/floodReportsArchive.generated.js` | Generated flood archive index; documents transfer separately |

Editorial changes belong in CMS/PostgreSQL, not these compatibility files. Code-level labels or rendering rules still require a developer.

## 9. Website Pages

| File/group | Responsibility |
|---|---|
| `src/pages/OfficialContentPage.jsx` | Main renderer for CMS-managed official pages, sections, tables, profiles, projects, papers, and facilities |
| `src/pages/about/DivisionsPage.jsx` | Division directory |
| `src/pages/about/OrganisationChartPage.jsx` | Organisation chart page |
| `src/pages/about/VisionMission.jsx` | Vision/mission presentation |
| `src/pages/about/VisionSectionPage.jsx` | Vision-family detail pages |
| `src/pages/people/*.jsx` | Leadership, scientists, technical staff, administration, and manpower pages |
| `src/pages/public/NoticesPage.jsx` | Notices/tenders-style listings |
| `src/pages/public/GalleryPage.jsx` | Gallery listing and lightbox entry |
| `src/pages/public/FloodReportsPage.jsx` | Flood archive/year views |
| `src/pages/public/PublicInfoPage.jsx` | RTI/FAQ/public-information content |
| `src/pages/policies/PolicyPage.jsx` | Policy and legal pages |
| `src/pages/policies/ScreenReaderAccessPage.jsx` | Screen-reader guidance |
| `src/pages/policies/SitemapPage.jsx` | Human-readable sitemap |
| `src/pages/ContactPage.jsx` | Contact details and map |
| `src/pages/GeoportalsPage.jsx` | Geoportal links |
| `src/pages/MobileAppsPage.jsx` | Mobile applications |
| `src/pages/PlaceholderPage.jsx` | Safe not-found/unavailable presentation |

Route definitions and existing public URLs live in `src/App.jsx`.

## 10. Website Components

| Folder | Responsibility |
|---|---|
| `src/components/hero/` | Homepage hero video/image, leaders, metrics, and scroll prompt |
| `src/components/sections/` | Homepage announcement, About, services, mission, geoportal, gallery, apps, location, and quick-access sections |
| `src/components/navbar/` | Top bar, navigation, menu overlay, and menu controls |
| `src/components/layout/` | Page shell, footer, loader, theme, scroll progress, and smooth scrolling |
| `src/components/navigation/` | Breadcrumb/trail, back controls, section navigation, route announcements, and read-aloud |
| `src/components/cards/` | Public profile card presentation |
| `src/components/organisation/` | Responsive organisation chart diagram |
| `src/components/media/` | Gallery/media lightbox |
| `src/components/motion/` | Reusable motion/reveal/count effects |
| `src/components/location/` | RSAC location map |
| `src/components/public/` | Public feedback form |
| `src/utils/` | HTML entity, speech, nested-scroll, and scroll helpers |

## 11. Scripts

| File | Responsibility |
|---|---|
| `scripts/start-custom-stack.mjs` | Starts API, public website, and CMS together |
| `scripts/export-custom-seed.mjs` | Exports current CMS entries to committed starter seed; excludes users/sessions/passwords |
| `scripts/custom-cms-check.mjs` | Checks API/database/content model health |
| `scripts/cms-content-audit.mjs` | Audits bilingual completeness, content shape, and media references |
| `scripts/cms-bilingual-smoke.mjs` | Reversible live test of EN/HI save, add, remove, order, and workspace behaviour |
| `scripts/flood-archive.mjs` | Maintains flood archive index/files |
| `scripts/lib/division-sections.mjs` | Parses and normalises division section structures |
| `scripts/lib/loader-extensionless.mjs` | Node compatibility loader for extensionless imports |
| `scripts/lib/use-extensionless-loader.mjs` | Helper for invoking that compatibility loader |
| `scripts/start-frontend-local.ps1` | Older Windows frontend-only helper; `npm run dev:all` is preferred |
| `scripts/*.py` | Offline generation of hero/video/organisation-chart assets; not used by runtime servers |
| `scripts/data/hero_boundaries.json` | Geographic input for offline hero generation |

## 12. Assets and Generated Content

| Path | Git policy | Purpose |
|---|---|---|
| `src/assets/` | Commit | Bundled logos, emblems, portraits, hero images/videos |
| `public/cms-media/` | Commit | Public migrated CMS files referenced by starter content |
| `public/official-media/` | Commit | Existing official media archive used by site |
| `public/images/`, `public/scientists/`, `public/officials/` | Commit | Public website images and profile photos |
| `public/organisation-chart-photos/` | Commit | Organisation chart portraits |
| `public/documents/flood/` | Do not use normal Git | Large flood-document archive; private transfer or Git LFS/object storage |
| `server/uploads/` | Do not commit | Runtime uploads; private backup with database |
| `dist/`, `dist-admin/` | Do not commit | Generated production builds |

## 13. Common Commands

```powershell
npm.cmd ci
npm.cmd run cms:setup
npm.cmd run dev:all
npm.cmd run cms:validate
npm.cmd run cms:audit
npm.cmd run cms:smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run build:admin
```

Use `npm.cmd install` only when intentionally changing dependencies. Use `npm.cmd ci` after cloning to reproduce `package-lock.json` exactly.

## 14. Change Ownership Rules

- Website words, cards, list rows, projects, research papers, facilities, menus, and media: edit through CMS.
- Layout, breakpoints, component behaviour, accessibility mechanics, and route code: edit in `src/`.
- CMS fields/forms and editor experience: edit in `admin/` and `shared/cmsCollections.js`.
- API/security/database behaviour: edit in `server/` and update `server/schema.sql` safely.
- Never put passwords in source, seed JSON, documentation, or Git history.
- Before deployment, run validation, audit, smoke test, lint, and both builds.

