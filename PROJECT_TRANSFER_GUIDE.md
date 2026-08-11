# RSAC-UP Complete Project Handover Guide

This is the main technical guide for transferring, installing, updating,
backing up, restoring, building, and understanding this project. Use Windows
Command Prompt (`cmd`) for the commands in this document.

Use these other documents only for their separate purposes:

- `README.md`: short project entry point.
- `CMS_USER_GUIDE.md`: instructions for non-technical website editors.
- `LIBRARIES_BY_SECTION.md`: list of important third-party libraries.

## 1. What Must Be Handed Over

A complete handover has four parts. Git alone is not a complete handover.

| Part | What it contains | How it moves |
|---|---|---|
| Source repository | React website, React CMS, Express API, schema, starter seed, bundled public media, scripts, configuration templates | GitHub or a source ZIP |
| PostgreSQL backup | Current CMS text, users, English/Hindi records, status, order, audit history, feedback, visits, and media metadata | Latest private `.sql` backup |
| CMS uploads | Images, PDFs, and videos uploaded after installation | Private copy of `server\uploads\` |
| Flood archive | Large imported year-wise flood PDFs | Private copy of `public\documents\flood\` |

The receiving person also needs the approved production domain, PostgreSQL
administrator access, CMS administrator password, and SMTP details. Send those
secrets through an approved private method, never through public GitHub.

### Exact source files that Git transfers

The most reliable list is the list tracked by Git:

```cmd
git ls-files
```

Important tracked paths include:

```text
src/                         Public React website source
admin/                       React CMS portal source
server/                      Express API, PostgreSQL schema, and starter seed
shared/                      Definitions shared by the CMS and API
scripts/                     Setup, backup, restore, audit, and start scripts
public/                      Bundled public images, PDFs, videos, and web files
package.json                 Commands and dependency requirements
package-lock.json            Exact dependency versions
index.html                   Public React HTML entry
vite.config.js               Public website Vite configuration
vite.admin.config.js         CMS Vite configuration
eslint.config.js             Lint configuration
.env.example                 Safe environment-variable template
.gitignore                   Files that must not be committed
README.md                    Short project introduction
PROJECT_TRANSFER_GUIDE.md    This complete handover guide
CMS_USER_GUIDE.md            CMS editing guide
LIBRARIES_BY_SECTION.md      Library inventory
```

`server/seed-data.generated.json` and `public/cms-media/` are intentionally
tracked. They allow a new empty installation to receive starter content and its
bundled media. They do not replace a current PostgreSQL backup.

### Files that must not be committed

These are generated, secret, machine-specific, private, or too large for normal
Git. The project `.gitignore` excludes them:

```text
.env.local                   Real passwords and machine settings
node_modules/                Installed packages; recreated with npm ci
dist/                        Generated public production build
dist-admin/                  Generated CMS production build
backups/                     SQL backups and safety dumps
server/uploads/              Files uploaded through the running CMS
public/documents/flood/      Large flood PDF archive
*.log and .tmp-*             Logs and temporary files
output/ and coverage/        Generated reports
```

Do not manually force ignored files into Git with `git add -f`.

### Why uploads and the database must stay together

PostgreSQL normally stores a media record and its URL, not the image or PDF
bytes. For example, the database may contain `/uploads/abc123.pdf`, while the
real file is `server\uploads\abc123.pdf`. Restoring only the database leaves a
broken link. Copying only uploads leaves files that no CMS record uses.

The same rule applies to `public\documents\flood\`: the database and generated
archive index identify reports, while the large PDFs are transferred separately.

## 2. Project Architecture

This is one Node.js repository containing two React applications and one
Express application. One `package.json`, one `package-lock.json`, and one
`node_modules` folder are intentional and safe.

```text
Public browser
    -> React website from src/
    -> Express /api/content endpoints
    -> PostgreSQL rsac_custom_cms

CMS editor browser
    -> React CMS from admin/src/
    -> protected Express /api/admin endpoints
    -> PostgreSQL rsac_custom_cms
    -> server/uploads for new media
```

### Development addresses

```text
Website: http://localhost:5173
CMS:     http://localhost:5174
API:     http://localhost:3000/api/health
```

`npm run dev:all` starts all three development services.

### Production build and addresses

```text
src/       -> Vite -> dist/       -> Express at /
admin/src/ -> Vite -> dist-admin/ -> Express at /cms/
server/             -> Express    -> /api/ and /uploads/
```

`npm run build:all` builds both React applications. `npm start` starts one
Express process that serves the public build, CMS build, API, uploads, and React
route fallbacks. This is not an Express server-rendered HTML project.

Typical production paths are:

```text
https://YOUR-DOMAIN/             Public React website
https://YOUR-DOMAIN/cms/         React CMS portal
https://YOUR-DOMAIN/api/health   Express health endpoint
https://YOUR-DOMAIN/uploads/...  CMS uploads
```

## 3. How Content Moves

### Public website read flow

1. `src/main.jsx` mounts the React website.
2. `src/contexts/DataContext.jsx` requests the selected language.
3. `src/data/customCmsClient.js` calls the Express content API.
4. `server/index.js` reads published PostgreSQL rows.
5. `server/contentAssembler.js` builds the public content payload.
6. `src/App.jsx` selects the route and the page renders it.
7. The website checks the content version and refreshes after CMS changes.

### CMS save flow

1. A user signs in through `admin/src/App.jsx`.
2. CMS forms send data through `admin/src/api.js`.
3. Express checks the session, permission, CSRF token, and rate limits.
4. `server/contentValidation.js` validates and sanitises the record.
5. PostgreSQL saves English in `data_en` and Hindi in `data_hi`.
6. PostgreSQL also saves status, order, version, and audit information.
7. Published content becomes available to the public website.

Draft and archived entries are not returned by normal public endpoints.

### Media flow

```text
Bundled media       public/ and src/assets/   -> Git -> production build
New CMS uploads     server/uploads/           -> private file backup
Media metadata      PostgreSQL cms_media      -> SQL database backup
Large flood PDFs    public/documents/flood/   -> private archive transfer
```

## 4. Database Structure

Database name: `rsac_custom_cms`.

Schema source: `server/schema.sql`.

| Table | Purpose |
|---|---|
| `cms_users` | Administrator/editor accounts, roles, password hashes, and active state |
| `cms_entries` | CMS collections, stable keys, English/Hindi JSON, order, status, and version |
| `cms_sessions` | Hashed login sessions, CSRF tokens, and expiry |
| `cms_media` | Uploaded media metadata and bilingual descriptions |
| `cms_feedback` | Public feedback, email-delivery state, and review state |
| `cms_site_visits` | Daily visitor records used by the public counter |
| `cms_audit_log` | Who changed which record and when |

`postgres` is the powerful setup/restore administrator. `rsac_custom_app` is
the restricted daily application user used by Express. Keeping them separate
reduces risk.

### CMS accounts and permissions

- An **Administrator** always has access to every CMS area. Administrators can
  create users, change roles and permissions, deactivate accounts, view audit
  history, and edit content.
- An **Editor** sees and can change only the areas selected by an administrator.
  Unchecked areas are hidden in the CMS and blocked again by Express, so hiding
  a menu item is not the only protection.
- Permission areas include Homepage, About, Divisions, Facilities, Academics,
  People, Geoportals, Flood Reports, Gallery, Mobile Apps, Public Information,
  Tenders, FAQ, Notices, Navigation/Appearance, Standalone Pages, Feedback, and
  Audit History.
- Every person should have a separate account. Do not share the administrator
  account or password.
- At least one active administrator must remain. The CMS prevents the last
  administrator from deactivating or demoting their own account.
- Users can change their own password in **My password**. Administrators set a
  first or replacement password from **CMS users**.

The shared password rule is: at least 12 characters, first character uppercase,
and at least one lowercase letter and one number.

### Website feedback and email

Feedback follows this path:

```text
Public feedback form
    -> Express validation and rate limit
    -> PostgreSQL cms_feedback
    -> optional SMTP email to approved recipients
    -> CMS Website feedback screen
```

The database save does not depend on email. If SMTP is missing or temporarily
fails, the feedback remains visible in the authorised CMS feedback screen. A
user with Feedback permission can retry delivery after SMTP is fixed.

Ask the approved mail administrator for these production values and put the
real values only in `.env.local`:

```env
FEEDBACK_RECIPIENTS=approved-recipient@department.gov.in
FEEDBACK_FROM_NAME=RSAC-UP Website
FEEDBACK_FROM_EMAIL=approved-sender@department.gov.in
FEEDBACK_SMTP_HOST=approved-smtp-host
FEEDBACK_SMTP_PORT=587
FEEDBACK_SMTP_SECURE=false
FEEDBACK_SMTP_REQUIRE_TLS=true
FEEDBACK_SMTP_USER=provided-user
FEEDBACK_SMTP_PASSWORD=provided-password
```

Separate multiple recipients with commas. Restart the Express process after
changing SMTP settings.

## 5. Important Root Files

| File | What it does |
|---|---|
| `.env.example` | Lists safe placeholder environment variables for a new machine |
| `.env.local` | Stores real local database, CMS, URL, cookie, and SMTP settings; never commit it |
| `.gitignore` | Prevents secrets, builds, packages, dumps, uploads, and temporary files from entering Git |
| `package.json` | Defines dependencies and all `npm run` commands |
| `package-lock.json` | Locks exact package versions for repeatable `npm ci` installation |
| `index.html` | HTML shell for the public React application and early theme setup |
| `vite.config.js` | Builds/serves the public React app and proxies local API/upload requests |
| `vite.admin.config.js` | Builds/serves the CMS at development port `5174` and production path `/cms/` |
| `eslint.config.js` | JavaScript and React lint rules |
| `how_to_edit.cmd` | Optional Windows helper for the local editing workflow |
| `README.md` | Short start page pointing to the detailed guides |

## 6. Public React Website Files

### Entry, routes, state, and styling

| Path | What it does |
|---|---|
| `src/main.jsx` | Mounts React providers and the website application |
| `src/App.jsx` | Defines public routes, lazy-loaded pages, and shared composition |
| `src/index.css` | Global tokens, typography, responsive layout, accessibility, light/dark styling |
| `src/civic-atlas.css` | Domain-specific RSAC visual presentation and section/card themes |
| `src/config/uiConfig.js` | Code-level UI behaviour defaults |
| `src/contexts/DataContext.jsx` | Loads, caches, previews, and refreshes CMS data |
| `src/contexts/DataContextCore.js` | Data-context definition separated for React refresh rules |
| `src/contexts/LanguageContext.jsx` | English/Hindi state and persistence |
| `src/contexts/LanguageContextCore.js` | Language-context definition |
| `src/contexts/DialogContext.jsx` | Shared accessible dialog state |
| `src/contexts/DialogContextCore.js` | Dialog-context definition |
| `src/hooks/useData.js` | Safe access to public CMS data |
| `src/hooks/useLanguage.js` | Safe access to current language |
| `src/hooks/useDialog.js` | Safe access to shared dialogs |
| `src/hooks/useVisitorCount.js` | Records and reads the public visitor count |

### Main public pages

| Path | What it does |
|---|---|
| `src/pages/OfficialContentPage.jsx` | Main renderer for CMS-managed divisions, facilities, academics, sections, tables, papers, projects, profiles, and media |
| `src/pages/about/DivisionsPage.jsx` | Division directory cards |
| `src/pages/about/OrganisationChartPage.jsx` | Organisation hierarchy page |
| `src/pages/about/VisionMission.jsx` | Vision and mission presentation |
| `src/pages/about/VisionSectionPage.jsx` | Objective, implementation, approach, and sphere pages |
| `src/pages/people/*.jsx` | Leadership, scientists, manpower, technical staff, and administration pages |
| `src/pages/public/NoticesPage.jsx` | Notices and listing-style public records |
| `src/pages/public/GalleryPage.jsx` | Photo gallery and lightbox entry |
| `src/pages/public/FloodReportsPage.jsx` | Flood years, reports, PDFs, search, and responsive wrapping |
| `src/pages/public/DownloadsPage.jsx` | Downloadable document listing |
| `src/pages/public/PublicInfoPage.jsx` | RTI, FAQ, memorandum, service rules, feedback, tenders, and public-information pages |
| `src/pages/policies/PolicyPage.jsx` | Terms, privacy, copyright, accessibility, disclaimer, help, and hyperlinking pages |
| `src/pages/policies/SitemapPage.jsx` | Human-readable sitemap |
| `src/pages/policies/ScreenReaderAccessPage.jsx` | Screen-reader instructions |
| `src/pages/ContactPage.jsx` | Contact information and location |
| `src/pages/GeoportalsPage.jsx` | Geoportal cards and links |
| `src/pages/MobileAppsPage.jsx` | Mobile application cards |
| `src/pages/PlaceholderPage.jsx` | Safe unavailable/not-found presentation |

### Public component folders

| Path | What it does |
|---|---|
| `src/components/hero/` | Hero video/poster, heading, portraits, metrics, and scroll indicator |
| `src/components/sections/` | Homepage announcements, domains, About, services, apps, geoportals, gallery, quick links, and location |
| `src/components/navbar/` | Accessibility bar, header, menu button, and menu overlay |
| `src/components/layout/` | Page shell, theme controller, loader, footer, smooth scroll, progress, and scroll reset |
| `src/components/navigation/` | Breadcrumbs, back buttons, back-to-top, section navigation, route announcements, and read-aloud |
| `src/components/content/CmsRouteBlocks.jsx` | Renders flexible CMS blocks added before/after normal route content |
| `src/components/cards/ProfileFlipCard.jsx` | Shared profile-card presentation where flipping is enabled |
| `src/components/icons/cmsIconRegistry.js` | Approved CMS-selectable icon names and React icons |
| `src/components/organisation/` | Responsive organisation chart diagram |
| `src/components/media/` | Gallery/media lightbox |
| `src/components/motion/` | Reusable reveal, mask, scale, stagger, and count animation helpers |
| `src/components/location/` | RSAC map/location component |
| `src/components/public/FeedbackForm.jsx` | Public feedback form |
| `src/utils/` | Scroll, nested-scroll, speech, and HTML-entity helpers |

### Public data adapters

| Path/group | What it does |
|---|---|
| `src/data/customCmsClient.js` | API URL resolution, requests, timeouts, bootstrap cache, version checks, and live update subscription |
| `src/data/cmsService.js` | Maps CMS bootstrap data into public getter functions |
| `src/data/cmsInteractions.js` | Public write actions such as feedback |
| `src/data/contentUtils.js` | Shared content normalisation helpers |
| `src/data/pageTextFields.js`, `pageAssetFields.js` | Structured text and media field mappings |
| `src/data/canonicalSectionPresentation.js` | Normalises rich section presentation |
| `src/data/importedHtmlCleanup.js` | Cleans imported official HTML before rendering |
| `src/data/divisionSectionLabels.js` | Stable labels and keys for division sections |
| `src/data/divisionHindiPhrases*.js` | Hindi phrase support used by division content |
| `src/data/translations.js`, `uiLabels.js` | Non-editorial interface labels |
| `src/data/siteContent.js`, `siteSettings.js` | Compatibility selectors and settings adapters |
| `src/data/menuItems.js`, `quickLinks.js` | Navigation/quick-link adapters |
| `src/data/gallery.js`, `notices.js`, `publicInfo.js` | Public collection adapters |
| `src/data/people.js`, `officials.js`, `formerProfiles.js` | People/profile adapters |
| `src/data/geoportals.js`, `mobileApps.js`, `policies.js` | Specialised page adapters |
| `src/data/heroVideos.js`, `officialMedia.js` | Hero and official-media helpers |
| `src/data/officialMediaManifest.generated.js` | Generated index of bundled official media |
| `src/data/floodReports.js` | Flood report access helpers |
| `src/data/floodReportsArchive.generated.js` | Generated flood archive index; PDFs are transferred separately |

Editorial content should be changed in the CMS. These files mainly define
rendering, mapping, stable keys, and interface behaviour.

## 7. CMS React Portal Files

| Path | What it does |
|---|---|
| `admin/index.html` | HTML shell for the CMS React application |
| `admin/src/main.jsx` | Mounts the CMS React application |
| `admin/src/App.jsx` | Sign-in, dashboard, collections, users, permissions, feedback, audit, password, and editor screens |
| `admin/src/api.js` | Authenticated API requests, cookies, CSRF, website URLs, and media preview URLs |
| `admin/src/DivisionContentWorkspace.jsx` | Guided division/facility/About/academics page and section workspace |
| `admin/src/BlockEditor.jsx` | Flexible structured page-block editor |
| `admin/src/FieldInput.jsx` | Text, number, select, status, media, file upload, rich text, and structured controls |
| `admin/src/InlineRichTextEditor.jsx` | General TipTap rich-text editor |
| `admin/src/SectionRichTextEditor.jsx` | Section-focused rich-text editor |
| `admin/src/SectionItemManager.jsx` | Adds, removes, edits, and reorders section list items |
| `admin/src/ImportedAssetEditor.jsx` | Edits imported images, videos, documents, captions, and alt text |
| `admin/src/EditorTooltipButton.jsx` | Accessible toolbar button with explanatory tooltip |
| `admin/src/formatRichText.js` | Cleans and formats editor content |
| `admin/src/richTextQuote.js` | Quote-command rules for paragraphs and list items |
| `admin/src/sectionItemHtml.js` | Converts section items to/from canonical rich HTML |
| `admin/src/cmsGroups.js` | CMS dashboard group names and ordering |
| `admin/src/settingsGroupLabels.js` | Friendly labels for grouped settings |
| `admin/src/fieldHelpText.js` | Plain-language descriptions below CMS fields |
| `admin/src/fieldContainer.js` | Shared field layout helpers |
| `admin/src/divisionSectionOrder.js` | Division-section order controls |
| `admin/src/divisionSectionCounts.js` | Counts visible section items |
| `admin/src/useLivePreview.js` | Sends unsaved preview data to the matching website tab |
| `admin/src/styles.css` | Responsive CMS layout, forms, editor, accessibility, and print styles |

## 8. Express and PostgreSQL Files

| Path | What it does |
|---|---|
| `server/index.js` | Express app, security middleware, API routes, uploads, feedback, visits, SSE updates, and production React serving |
| `server/config.js` | Loads `.env.local` and resolves ports, host, origins, cookies, uploads, database, and SMTP settings |
| `server/db.js` | PostgreSQL connection pool and query helpers |
| `server/auth.js` | Password hashing, sessions, roles, permissions, cookies, CSRF, and authentication middleware |
| `server/contentValidation.js` | Validates and sanitises CMS payloads using shared collection definitions |
| `server/contentAssembler.js` | Converts database rows into the public bilingual bootstrap payload |
| `server/entryKeys.js` | Stable entry-key generation and duplicate prevention |
| `server/feedbackMailer.js` | SMTP delivery and retry support for website feedback |
| `server/schema.sql` | Tables, indexes, functions, triggers, and constraints |
| `server/setup.js` | Creates/updates the database role, database, schema, CMS admin, seed, and known migrations |
| `server/reset-admin.js` | Applies the shared password policy and resets the CMS admin password from `.env.local` |
| `server/seed-data.generated.json` | Starter bilingual content for an empty database; not the live database |
| `server/divisionPageSync.js` | Keeps division cards and division pages structurally aligned |
| `server/pageParityRepairs.js` | Repairs known page/CMS parity issues during setup |
| `server/sectionRichContentMigration.js` | Migrates older division/facility sections into canonical rich content |
| `server/formerRosterSync.js` | Synchronises historical people roster data |
| `server/formerProfilePhotoMigration.js` | Links former-scientist records to their photos |
| `server/uploads/` | Runtime uploads; private, writable, ignored, and backed up separately |

## 9. Shared Contract Files

| Path | What it does |
|---|---|
| `shared/cmsCollections.js` | Single collection/field contract used by CMS forms and API validation |
| `shared/cmsPermissions.js` | Permission keys and role checks for each CMS area |
| `shared/passwordPolicy.js` | One password rule used by CMS password screens, setup, and reset command |
| `shared/sectionRichContent.js` | Canonical rich section parsing and serialisation |
| `shared/richTextColor.js` | Allowed foreground text colours and sanitisation |
| `shared/divisionLiveSections.js` | Stable public division section definitions |
| `shared/importedEditorRows.js` | Converts imported rows into editor-friendly records |
| `shared/profileSectionContent.js` | Profile section content helpers |

## 10. Scripts and Commands

### Start, build, setup, and transfer scripts

| Script | npm command | What it does |
|---|---|---|
| `scripts/start-custom-stack.mjs` | `npm run dev:all` | Starts API, website Vite server, and CMS Vite server together |
| `scripts/start-production.mjs` | `npm start` | Enables production mode and starts Express with both built React apps |
| `scripts/production-smoke.mjs` | `npm run smoke:production` | Uses a temporary port to verify API, public routes, CMS, and built assets |
| `server/setup.js` | `npm run cms:setup` | Creates/updates local database structure and seeds only an empty CMS |
| `scripts/backup-custom-cms.mjs` | `npm run cms:backup` | Creates one validated full plain SQL backup and removes older generated SQL backups |
| `scripts/restore-custom-cms-backup.mjs` | `npm run cms:restore -- backups\FILE.sql` | Creates a safety dump, then restores schema and data transactionally |
| `server/reset-admin.js` | `npm run cms:reset-admin` | Resets admin password using `.env.local` |
| `scripts/export-custom-seed.mjs` | `npm run cms:export-seed` | Replaces committed starter seed from current CMS entries; excludes passwords/sessions |
| `scripts/verify-flood-archive.mjs` | `npm run cms:flood-check` | Checks the local flood index and PDF files |

### Validation and reversible tests

| Command/group | Purpose |
|---|---|
| `npm run cms:validate` | Validates database records, bilingual contracts, keys, and ordering |
| `npm run cms:portal-audit` | Opens and validates every CMS collection endpoint |
| `npm run cms:contract-audit` | Confirms every CMS collection has a public website target |
| `npm run cms:no-fallback-audit` | Confirms Hindi output comes from Hindi CMS fields without visible fallback |
| `npm run cms:text-coverage` | Measures editable text coverage |
| `npm run cms:asset-coverage` | Measures editable media coverage |
| `npm run cms:editor-live-parity` | Compares CMS editor sections and public sections |
| `npm run cms:test-site-write-through` | Reversible non-division save/render test |
| `npm run cms:test-divisions` | Reversible division synchronisation test |
| `npm run cms:test-editor-quote` | Tests rich-editor quote behaviour |
| `npm run cms:test-visibility` | Tests draft/archive exclusion from public output |
| `npm run cms:media-smoke` | Tests upload/replace/delete flow and cleans its test files |
| `npm run lint` | Checks JavaScript and React source |
| `npm run build:all` | Builds both React applications |
| `npm run smoke:production` | Tests the deployable Express build |

Other `scripts/cms-*`, `scripts/repair-*`, `scripts/sync-*`,
`scripts/migrate-*`, `scripts/normalize-*`, `scripts/ensure-*`, and
`scripts/clean-*` files are focused audit or repair tools. Run them only when
their exact npm command is required by a documented repair. Do not run every
repair script as routine maintenance.

## 11. Public and Generated Assets

| Path | Git rule | Purpose |
|---|---|---|
| `src/assets/images/` | Commit | Images imported by React and bundled by Vite |
| `src/assets/videos/` | Commit approved files | Hero/source videos imported by React |
| `public/theme-init.js` | Commit | Applies saved theme before React paints to avoid a flash |
| `public/.well-known/` | Commit | Security/standards files |
| `public/cms-media/` | Commit | Migrated public CMS media used by starter records |
| `public/official-media/` | Commit | Approved official media used by the website |
| `public/images/`, `officials/`, `scientists/` | Commit | Public and profile images |
| `public/organisation-chart-photos/` | Commit | Organisation chart portraits |
| `public/icons.svg` | Commit | Public icon sprite |
| `public/robots.txt`, `sitemap.xml` | Commit | Search-engine files |
| `public/documents/flood/` | Do not use normal Git | Large flood PDF archive transferred privately |
| `server/uploads/` | Do not commit | New runtime CMS uploads |
| `dist/`, `dist-admin/` | Do not commit | Recreated production builds |

## 12. What Setup, Seed, Backup, and Restore Mean

### `npm run cms:setup`

On a new computer it:

1. connects to PostgreSQL with the administrator credentials;
2. creates or updates restricted role `rsac_custom_app`;
3. creates database `rsac_custom_cms` if missing;
4. executes `server/schema.sql`;
5. creates or updates the CMS administrator;
6. inserts `server/seed-data.generated.json` only when `cms_entries` is empty;
7. runs known compatibility migrations and repairs;
8. writes local settings to ignored `.env.local`.

It is not a structure-only command. On an empty database it creates structure
and starter data. On a populated database it keeps normal entries, updates the
schema, and runs migrations. Do not set `CMS_FORCE_SEED=true` on a working
database unless a developer explicitly requires it.

Do not run setup every day. Run it on first installation, or after a project
update only when its release instructions require a schema/migration update.
Make a backup first.

### Seed data

`server/seed-data.generated.json` is prepared starter content for an empty CMS.
It is not the live PostgreSQL database and is not a current backup. Later CMS
edits do not automatically update it. `npm run cms:export-seed` updates it only
when intentionally preparing a new starter snapshot for Git.

### `npm run cms:backup`

This command uses `pg_dump --format=plain` and creates:

```text
backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

The SQL contains this project's database structure and data. After validating
the new file, the command removes older automatically named SQL backups and
keeps the new one. It does not remove safety `.dump` files or unrelated files.

The SQL does not contain `.env.local`, PostgreSQL installation/global roles,
`server\uploads\`, bundled `public\` files, or the flood archive.

### `npm run cms:restore`

```cmd
npm run cms:restore -- backups\YOUR_BACKUP.sql
```

The command:

1. accepts only a plain PostgreSQL `.sql` inside `backups\`;
2. verifies it targets this CMS structure;
3. creates `pre-restore-...dump` from the current target database;
4. replaces only this project's CMS tables/functions;
5. restores structure and data in one transaction;
6. returns ownership to the restricted application role;
7. verifies restored entry, published, and collection counts.

Restore replaces the target CMS state; it does not merge two sets of CMS edits.

### `.sql` compared with `.dump`

| File | Format | Created by | Normal use |
|---|---|---|---|
| `rsac_custom_cms_....sql` | Readable plain SQL | `npm run cms:backup` | Normal transfer and `cms:restore` |
| `pre-restore-....dump` | PostgreSQL custom archive | Automatically before restore | Emergency rollback with PostgreSQL `pg_restore` tools |

Both can contain structure and data, but they usually represent different
machines or times. The project restore command accepts the normal `.sql`, not
the custom `.dump`.

## 13. Prepare the Source Computer

Open CMD in the project:

```cmd
cd /d D:\RSAC_custom_cms
```

### Check the source before handover

```cmd
git status
npm run cms:validate
npm run cms:flood-check
npm run lint
npm run build:all
npm run smoke:production
```

Fix failures before transferring. `git status` must be reviewed so accidental
logs, secrets, backups, or unrelated files are not committed.

### Back up current CMS data

```cmd
npm run cms:backup
```

Record the exact new SQL filename printed by the command.

### Copy private runtime data

Replace `X:` with an approved USB or private transfer drive:

```cmd
if not exist X:\RSAC_TRANSFER mkdir X:\RSAC_TRANSFER
copy /Y "backups\YOUR_NEW_BACKUP.sql" "X:\RSAC_TRANSFER\"
xcopy "server\uploads" "X:\RSAC_TRANSFER\uploads" /E /I /Y
xcopy "public\documents\flood" "X:\RSAC_TRANSFER\flood" /E /I /Y
```

If an optional source folder does not exist, skip only its `xcopy` line.

## 14. First GitHub Push

Create an empty private/approved GitHub repository first. Then:

```cmd
cd /d D:\RSAC_custom_cms
git status
git add .
git diff --cached --check
git status
git commit -m "Prepare RSAC website handover"
git remote -v
```

If `origin` is not listed:

```cmd
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
```

Push the current branch without assuming its name is `main` or `master`:

```cmd
git push -u origin HEAD
```

Never push `.env.local`, SQL/dump files, uploads, or the flood archive.

## 15. Later Git Pushes from the Source Computer

After testing code changes:

```cmd
cd /d D:\RSAC_custom_cms
git status
git add .
git diff --cached --check
git status
git commit -m "Describe the RSAC update"
git push
```

If CMS text/media also changed, Git push is not enough. Also run
`npm run cms:backup` and privately transfer the SQL, uploads, and any changed
flood files.

## 16. First Setup on a New Machine

### Install prerequisites

Install:

- Git
- Node.js 20 or newer, including npm
- PostgreSQL 14 or newer, including `psql`, `pg_dump`, and `pg_restore`

Keep the PostgreSQL administrator password available.

### Clone and install packages

```cmd
git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git D:\RSAC_custom_cms
cd /d D:\RSAC_custom_cms
npm ci --include=dev
```

Use `npm ci`, not `npm install`, for a normal clone. It uses
`package-lock.json` exactly. Use `npm install` only when intentionally changing
dependencies.

### Create the local database and CMS login once

Choose a CMS password that is at least 12 characters, starts with an uppercase
letter, and includes a lowercase letter and number.

```cmd
set /p "POSTGRES_ADMIN_PASSWORD=Enter PostgreSQL administrator password: "
set /p "CMS_ADMIN_PASSWORD=Choose CMS administrator password: "
npm run cms:setup
set "POSTGRES_ADMIN_PASSWORD="
set "CMS_ADMIN_PASSWORD="
```

CMD displays typed input, so perform this privately. Setup writes the working
values to ignored `.env.local`. Do not email or commit that file.

### Restore source CMS content

Copy the source backup and folders from private storage:

```cmd
if not exist backups mkdir backups
copy /Y "X:\RSAC_TRANSFER\YOUR_NEW_BACKUP.sql" "backups\"
xcopy "X:\RSAC_TRANSFER\uploads" "server\uploads" /E /I /Y
xcopy "X:\RSAC_TRANSFER\flood" "public\documents\flood" /E /I /Y
npm run cms:restore -- backups\YOUR_NEW_BACKUP.sql
npm run cms:reset-admin
```

The restored database contains the source CMS users/password hashes. Running
`cms:reset-admin` immediately after restore makes the target admin login match
the password stored in the target `.env.local`.

If there is no source SQL backup, skip restore and use starter seed content.

### Start and verify

```cmd
npm run cms:validate
npm run cms:flood-check
npm run dev:all
```

Open the website, CMS, and API addresses listed earlier. Check English, Hindi,
one image, one uploaded document, one flood PDF, CMS login, and one harmless
save/preview.

## 17. Normal Use on the Same Machine

After first setup, the normal command is only:

```cmd
cd /d D:\RSAC_custom_cms
npm run dev:all
```

PostgreSQL must be running. Do not run `cms:setup` or `cms:restore` every day.

## 18. Later Git Pull on an Existing Machine

Before pulling, make sure local source changes are committed or intentionally
saved. Never discard unknown local changes.

### Code changed, CMS data did not change

```cmd
cd /d D:\RSAC_custom_cms
git status
git pull --ff-only
npm ci --include=dev
npm run lint
npm run build:all
npm run dev:all
```

Do not restore a database for a code-only update.

### CMS data changed, code did not change

Make a target backup first, then restore the selected source database:

```cmd
cd /d D:\RSAC_custom_cms
npm run cms:backup
copy /Y "X:\RSAC_TRANSFER\SOURCE_BACKUP.sql" "backups\"
xcopy "X:\RSAC_TRANSFER\uploads" "server\uploads" /E /I /Y
xcopy "X:\RSAC_TRANSFER\flood" "public\documents\flood" /E /I /Y
npm run cms:restore -- backups\SOURCE_BACKUP.sql
npm run cms:reset-admin
npm run cms:validate
npm run dev:all
```

### Code and CMS data both changed

```cmd
cd /d D:\RSAC_custom_cms
npm run cms:backup
git status
git pull --ff-only
npm ci --include=dev
copy /Y "X:\RSAC_TRANSFER\SOURCE_BACKUP.sql" "backups\"
xcopy "X:\RSAC_TRANSFER\uploads" "server\uploads" /E /I /Y
xcopy "X:\RSAC_TRANSFER\flood" "public\documents\flood" /E /I /Y
npm run cms:restore -- backups\SOURCE_BACKUP.sql
npm run cms:reset-admin
npm run cms:validate
npm run build:all
npm run smoke:production
```

Run `cms:setup` after a pull only when the update instructions explicitly say a
schema/setup migration is required. Back up first because setup also updates
the application role and CMS administrator from `.env.local`.

### Decision table

| Situation | Pull Git | Run setup | Restore SQL | Copy uploads/flood |
|---|---:|---:|---:|---:|
| Same machine, normal start | No | No | No | No |
| Existing machine, code-only update | Yes | Only if instructed | No | No |
| Existing machine, CMS-only update | No | No | Yes | Yes when changed |
| Existing machine, code and CMS update | Yes | Only if instructed | Yes | Yes |
| Completely new machine | Clone | Once | Yes for current content | Yes |

## 19. Avoiding Data Loss Between Two Machines

Git can merge source code. PostgreSQL backups do not merge CMS edits.

Use one database as the authoritative source at a time:

1. Stop CMS editing on the other machine.
2. Back up the chosen source database.
3. Copy its uploads and flood archive.
4. Restore that backup on the target.
5. Re-enter any separately approved changes manually before the next backup.

Never restore two backups one after another expecting their content to combine.
The second restore replaces the first CMS state.

## 20. Offline Transfer Without GitHub

Commit the intended source changes first. Create a clean ZIP containing only
tracked source files:

```cmd
cd /d D:\RSAC_custom_cms
git archive --format=zip --output=RSAC_SOURCE.zip HEAD
```

Transfer `RSAC_SOURCE.zip` plus the private `RSAC_TRANSFER` folder containing
the SQL backup, uploads, and flood archive. Do not put `.env.local` inside a
general source ZIP.

On the target, extract source, run `npm ci --include=dev`, then follow the new
machine database setup and restore steps.

## 21. Production Installation

On the server:

```cmd
cd /d D:\RSAC_custom_cms
npm ci --include=dev
npm run build:all
npm run smoke:production
npm start
```

Production still needs `.env.local`. At minimum review:

```env
CMS_HOST=0.0.0.0
CMS_SERVE_BUILT_APPS=true
CMS_PUBLIC_URL=https://YOUR-DOMAIN
CMS_ALLOWED_ORIGINS=https://YOUR-DOMAIN
CMS_COOKIE_SECURE=true
CMS_DATABASE_URL=postgresql://...
CMS_UPLOAD_DIR=server/uploads
```

Also add approved SMTP settings if feedback email must be delivered. Put HTTPS
and the public domain in a proper reverse proxy/load balancer. Do not hardcode a
changing EC2 IP in React or Express source files.

Production requires a persistent writable `server\uploads\` location and a
PostgreSQL database that survives application restarts. Rebuilding `dist\` and
`dist-admin\` must not delete uploads or PostgreSQL data.

## 22. Troubleshooting

### CMS login fails after restore

```cmd
npm run cms:reset-admin
```

This applies the password in target `.env.local` and the same password rules as
the CMS My Password screen.

### Text is old

Check that Express is connected to the intended `CMS_DATABASE_URL`, restore the
correct backup, restart the stack, and run `npm run cms:validate`.

### Image, PDF, or video is missing

Check whether its URL begins with `/uploads/`. If yes, restore
`server\uploads\`. For an imported flood report, restore
`public\documents\flood\` and run `npm run cms:flood-check`.

### Direct React route fails after deployment

Use `npm start`, which serves both builds with SPA fallbacks. Verify with:

```cmd
npm run smoke:production
```

### Port already in use

Stop the older RSAC stack cleanly with `Ctrl+C`, then run `npm run dev:all`
again. Do not start duplicate API or Vite processes on the same ports.

## 23. Final Handover Checklist

- [ ] Intended source changes committed and pushed, or included in clean source ZIP
- [ ] `git status` reviewed; no secrets or private backups staged
- [ ] Latest SQL backup created and filename recorded
- [ ] `server\uploads\` copied when it contains required media
- [ ] `public\documents\flood\` copied
- [ ] Production/domain/PostgreSQL/SMTP secrets transferred privately
- [ ] Receiving machine ran `npm ci --include=dev`
- [ ] New machine ran `cms:setup` once
- [ ] Current SQL restored and target admin password reset
- [ ] `cms:validate` and `cms:flood-check` passed
- [ ] `lint`, `build:all`, and `smoke:production` passed
- [ ] Website and CMS checked in English and Hindi
- [ ] Uploaded image/PDF, flood PDF, feedback, login, and direct route checked

The safe summary is:

```text
Code and bundled media -> Git
Current CMS records    -> SQL backup
New CMS files          -> server/uploads
Large flood PDFs       -> public/documents/flood
Secrets                -> target .env.local through a private channel
```
