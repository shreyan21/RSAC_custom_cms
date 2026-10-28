# RSAC-UP developer handover

Updated: 28 October 2026. Start here when taking over this project.

This guide describes **`D:\RSAC_custom_cms`**, the React website, custom React CMS and Express API. The separate `D:\rsac_website` folder is an older Directus project. Do not mix their source files, environment settings, databases or instructions.

Latest checked behaviour and limitations: [27 October end-to-end verification](E2E_VERIFICATION_2026-10-27.md).

For file locations, jump to [the asset folder map](#asset-folder-map), [disk paths and URLs](#disk-paths-and-browser-urls), or [the upload flow](#upload-to-website-flow). Website editors can follow [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md); developers should also read setup, ownership and backup sections here.

## Contents

1. [What the system does](#1-what-the-system-does)
2. [What to collect during handover](#2-what-to-collect-during-handover)
3. [Folders and important files](#3-folders-and-important-files)
4. [How requests and content move](#4-how-requests-and-content-move)
5. [Set up a new development computer](#5-set-up-a-new-development-computer)
6. [Start and stop the applications](#6-start-and-stop-the-applications)
7. [Which settings mean what](#7-which-settings-mean-what)
8. [Content ownership and bilingual editing](#8-content-ownership-and-bilingual-editing)
9. [Photos, PDFs and other files](#9-photos-pdfs-and-other-files)
10. [Make a code change](#10-make-a-code-change)
11. [Test and release](#11-test-and-release)
12. [Backup, restore and transfer](#12-backup-restore-and-transfer)
13. [Troubleshooting](#13-troubleshooting)
14. [Before the current developer leaves](#14-before-the-current-developer-leaves)

## 1. What the system does

Visitors use the public website. Authorised staff use the CMS to change text, people, photos, documents, display order and visibility. PostgreSQL holds the records; uploaded file bytes are stored separately on disk.

```text
Public React website (src/) ------- reads published content -----+
                                                                |
React CMS (admin/) ---- authenticated edits and preview ---- Express API (server/)
                                                                |
                                                        PostgreSQL + uploads
```

All three applications share the root `package.json`, lockfile and `node_modules`. This custom project does not need Directus or Docker.

Current office development addresses:

| Service | Address |
| --- | --- |
| Website | http://192.168.100.64:5173 |
| CMS | http://192.168.100.64:5174 |
| API health | http://192.168.100.64:3000/api/health |

These are development addresses, not a production domain. The office address is currently built into some startup commands and Vite proxies. A different computer needs its own settings; the local-only instructions below avoid depending on that address.

## 2. What to collect during handover

Obtain all of the following from the organisation:

- Repository access and the approved branch/commit to deploy. Run `git remote -v` and `git log -1` in this folder to identify them.
- The current PostgreSQL backup, with its date and the approved database name.
- Matching `server/uploads/` files and the complete `public/documents/flood/` archive.
- Private configuration values for `.env.local`, delivered through the organisation's secure process.
- Administrator ownership, editor permissions, hosting access, mail-server settings, domain/TLS renewal ownership and the person who approves releases.
- The actual server startup/service configuration. Source code alone does not keep Node running after a server reboot.

Never place real passwords, database URLs with passwords, SQL backups or user/session data in this document or Git. A fresh clone alone does **not** contain current live content or all media.

## 3. Folders and important files

```text
RSAC_custom_cms/
  src/                  Public React application
    components/         Header, footer, cards, dialogs and homepage sections
    pages/              Complete public pages
    contexts/           Shared data, language and dialog state
    hooks/              Helpers used by React components
    data/               Content API client and presentation helpers
    utils/              Scroll, media and optional browser-storage helpers
    assets/             Assets imported by source code
  admin/src/            CMS dashboard and editors
  server/               Express API, database access and setup
    uploads/            Runtime uploaded files; ignored by Git
  shared/               Field definitions, permissions and shared content rules
  scripts/              Startup, backup, maintenance and tests
    fixtures/           Small synthetic fixtures for offline UI tests
  public/               Files served directly by the website
    cms-media/          Migrated local media
    official-media/     Local copies of older official media
    scientists/         Named scientist photo copies
    officials/          Named official photo copies
    organisation-chart-photos/  Chart photo copies
    images/             Gallery and mobile-application images
    documents/notices/  Local notice PDF copies
    documents/flood/    Large PDF archive; ignored by Git
  backups/              Database backups; ignored by Git
  dist/                 Generated website build
  dist-admin/           Generated CMS build
  .env.example          Field list and placeholder values
  .env.local            Private settings for this machine; ignored by Git
```

| When you need to change... | Start with... |
| --- | --- |
| Public routes | `src/App.jsx` |
| Website startup/providers | `src/main.jsx`, `src/App.jsx` |
| Navigation, search, display controls | `src/components/navbar/` |
| Website layout and responsive CSS | `src/index.css`, `src/civic-atlas.css`, `src/components/layout/PageShell.jsx` |
| Division/Facility/Academic page rendering | `src/pages/OfficialContentPage.jsx` |
| Public CMS fetching and live refresh | `src/data/customCmsClient.js`, `src/contexts/DataContext.jsx` |
| English/Hindi switching | `src/contexts/LanguageContext.jsx`, `src/hooks/useLanguage.js` |
| The file `LanguageContextCore.js` | It only creates the shared React context; page wording is not edited there. |
| Dialog keyboard focus/scroll locks | `src/hooks/useModalFocus.js`, `src/contexts/DialogContext.jsx` |
| Image viewer | `src/components/media/Lightbox.jsx` |
| CMS dashboard and generic editors | `admin/src/App.jsx`, `admin/src/FieldInput.jsx` |
| CMS guided page editors | `admin/src/DivisionContentWorkspace.jsx` |
| Rich text, tables and images | `admin/src/SectionRichTextEditor.jsx`, `richTextExtensions.js` |
| Upload selection and pending operations | `admin/src/mediaUpload.js`, `usePendingOperations.js`, `ImportedAssetEditor.jsx` |
| Invalid editor JSON | `admin/src/useEditorValidation.js`, `FieldInput.jsx` |
| Authoritative headings/profile references | `admin/src/pageEditorOwnership.js`, `publishedProfilesClient.js` |
| CMS collection fields | `shared/cmsCollections.js` |
| Permissions and password rules | `shared/cmsPermissions.js`, `shared/passwordPolicy.js` |
| Training/School shared bodies | `shared/pageBodyOwnership.js` |
| API routes | `server/index.js` |
| Database structure and connection | `server/schema.sql`, `server/db.js` |
| Content validation and public output | `server/contentValidation.js`, `server/contentAssembler.js` |
| Cookies, sessions and CSRF | `server/auth.js` |
| Optional feedback email | `server/feedbackMailer.js` |

Use `rg --files src admin/src server shared scripts` to list files. Use `rg "phrase" src admin/src shared server` to find a component, field or route.

The root documentation has separate audiences:

| Guide | Read it for |
| --- | --- |
| `DEVELOPER_HANDOVER.md` | This guide: architecture, setup, asset locations, ownership, maintenance and release flow. |
| `CMS_USER_GUIDE.md` | Editor tasks, current dashboard names, photos/videos/documents, preview and publishing. |
| `README.md` | A shorter structure/library overview and entry links to the other guides. |
| `PROJECT_TRANSFER_GUIDE.md` | Moving the application, database, configuration and files to another computer. |
| `E2E_VERIFICATION_2026-10-27.md`, `UI_VERIFICATION.md` | Dated checks and their limits. They are evidence of those reviews, not a continuously updated guarantee. |

## 4. How requests and content move

### What starts each application

| Application | Starting files | Responsibility |
| --- | --- | --- |
| Public website | `index.html` -> `src/main.jsx` -> `src/App.jsx` | Starts React, selects the route and wraps pages in shared language, data and dialog providers. |
| CMS portal | `admin/index.html` -> `admin/src/main.jsx` -> `admin/src/App.jsx` | Signs editors in, displays their permitted editing areas and opens the appropriate editor. |
| API | `server/index.js` | Loads server settings, connects to PostgreSQL, checks requests, serves content/uploads and accepts CMS changes. |
| Field definitions | `shared/cmsCollections.js` | Defines the records and fields the API and CMS understand. `admin/src/App.jsx` creates the named page/people views; `admin/src/cmsGroups.js` groups them on the dashboard. |

### When someone opens the website

```text
Visitor opens a route, such as /divisions/training-division
  -> src/App.jsx chooses the page component
  -> the component reads hooks from src/hooks/useData.js
  -> src/contexts/DataContext.jsx obtains the selected language's content
  -> src/data/customCmsClient.js calls /api/content/bootstrap?lang=en or lang=hi
  -> server/contentAssembler.js assembles Published PostgreSQL records
  -> React renders text, lists and media URLs
  -> the browser requests each image/video/document from its URL
```

The CMS database is the normal source for published wording, people and media selections. `src/data/` also contains older content modules, seed inputs and media helpers. Their existence does not mean editing one of those files updates the current database. Likewise, `server/seed-data.generated.json` is starter data for an empty database, not the live editing interface.

Version checks and `/api/content/events` tell an open website when content changes. The data provider reloads content for the selected language. The browser may cache content/preferences, but those caches are not the master records. Flood archive records are loaded for the selected year rather than putting the complete archive in every page's bootstrap response.

`LanguageContextCore.js` only creates a React context. The language provider is `LanguageContext.jsx`; short translated interface labels pass through `src/data/uiLabels.js`. Editors change approved page wording in the CMS, not in the context-creation file.

### When an editor saves a change

```text
CMS: Edit website -> choose area -> open item or page section
  -> edit English/Hindi; upload a file if required
  -> Save / Publish changes
  -> admin/src/api.js sends the session cookie and CSRF token
  -> server/index.js checks permissions and the record version
  -> validation and shared ownership rules are applied
  -> PostgreSQL saves the record and an audit entry
  -> content version changes and open public pages refresh
```

An upload and a record save are separate operations. Uploading stores file bytes and returns a URL; saving the person/page/card connects that URL to the visible content. See [the upload flow](#upload-to-website-flow) and the [CMS editor guide](CMS_USER_GUIDE.md).

### Private preview

```text
Unsaved CMS draft
  -> POST /api/admin/preview
  -> temporary preview token held in API memory
  -> public React page reads /api/content/preview/:token
  -> the same private tab refreshes as the editor continues typing
```

Preview does not save the draft to PostgreSQL or publish it to normal visitors. It follows the selected visibility: a Draft/Archived item can be absent because that is its intended public result. Tokens expire and an API restart loses them. Reopen Preview after a restart; do not distribute private preview links as public page links.

### Where the information is stored

| Table | Stores |
| --- | --- |
| `cms_entries` | Collection, stable internal key, status, order, English `data_en`, Hindi `data_hi` and version |
| `cms_users`, `cms_sessions` | Accounts, permissions and active sessions |
| `cms_media` | Upload metadata: generated/original names, public URL, type, size and uploader; not the file bytes |
| `cms_feedback` | Submitted feedback and optional mail-delivery status |
| `cms_audit_log` | History of CMS changes |
| `cms_site_visits` | Visitor counters |

Keep stable internal keys unchanged unless you have reviewed every reference. A version-conflict message means another editor saved that record; reload it and reconcile the edits rather than overwriting their work.

### Which server delivers a file

In development, Vite serves the website and its `public/` files on port 5173. The CMS has a separate Vite server on 5174. Their configured `/api` and `/uploads` proxies forward to Express on 3000; the API clients can also use the configured API base address.

In production, the website build is `dist/` and the CMS build is `dist-admin/`. Express serves `/`, `/cms/`, `/api/` and `/uploads/` from one configured origin. A reverse proxy may sit in front of it. Files under `public/` are copied into `dist/` during a website build; runtime CMS uploads stay in their configured upload directory.

## 5. Set up a new development computer

### Software

Install Git, Node.js/npm and PostgreSQL with `psql`, `pg_dump` and `pg_restore` on PATH. The installed Vite requires Node **20.19+ or 22.12+**; this project was checked with **22.22.3**. Use `npm ci --include=dev` with the committed lockfile, rather than installing different dependency versions.

Check the tools in Windows Command Prompt:

```cmd
git --version
node --version
npm --version
psql --version
pg_dump --version
```

Use PostgreSQL command-line tools compatible with the database server version. A `pg_dump` older than the source server can reject the backup.

### Clone and configure a separate local database

```cmd
git clone YOUR_ORGANISATION_REPOSITORY D:\RSAC_custom_cms
cd /d D:\RSAC_custom_cms
npm ci --include=dev
copy .env.example .env.local
```

Edit `.env.local`. For a local-only development computer, use these non-secret settings and fill the private passwords yourself:

```env
VITE_API_URL=http://127.0.0.1:3000
VITE_WEBSITE_URL=http://127.0.0.1:5173
VITE_CMS_ADMIN_URL=http://127.0.0.1:5174
CMS_HOST=127.0.0.1
CMS_PORT=3000
CMS_PUBLIC_URL=http://127.0.0.1:3000
CMS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5174
CMS_COOKIE_SECURE=false
CMS_SERVE_BUILT_APPS=false
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_ADMIN_USER=postgres
CMS_DATABASE_NAME=rsac_custom_cms_dev
CMS_DATABASE_USER=rsac_custom_dev_app
CMS_DATABASE_URL=
FEEDBACK_SMTP_HOST=
FEEDBACK_RECIPIENTS=
```

Set `POSTGRES_ADMIN_PASSWORD`, `CMS_ADMIN_USERNAME` and a real `CMS_ADMIN_PASSWORD` in that private file. The administrator password must have at least 12 characters, start with an uppercase letter and include a lowercase letter and a digit. Leave `CMS_DATABASE_URL` blank for fresh setup to generate and save the application database password/URL. If connecting to an existing development database instead, supply its actual URL.

```cmd
npm run cms:setup
```

Setup creates/updates roles, tables and the administrator. It seeds `server/seed-data.generated.json` when the content table is empty; this is starter content, not the latest live website. It can also run repair/migration steps and update administrator credentials. Run it on the new development database, not casually on an existing production database.

For current organisational content, obtain a matching database backup and media folders. Follow [PROJECT_TRANSFER_GUIDE.md](PROJECT_TRANSFER_GUIDE.md) to restore them into the development database. A restore replaces destination content. After restoring, the copied database has its copied user accounts; changing `.env.local` alone does not change their passwords.

### Start the local-only applications

Open three terminals in the project folder:

```cmd
REM Terminal 1: API
npm run dev:api
```

```cmd
REM Terminal 2: public website
npx --no-install vite --host 127.0.0.1 --port 5173 --strictPort
```

```cmd
REM Terminal 3: CMS
npx --no-install vite --config vite.admin.config.js --host 127.0.0.1 --port 5174 --strictPort
```

Open `http://127.0.0.1:5173`, `http://127.0.0.1:5174` and `http://127.0.0.1:3000/api/health`. The explicit host arguments override the current office bindings. The absolute `127.0.0.1` API URL above avoids using the office Vite proxy. Keep this hostname consistent for website, CMS, API and allowed origins.

## 6. Start and stop the applications

On the configured office machine:

```cmd
cd /d D:\RSAC_custom_cms
npm run dev:all
```

`scripts/start-custom-stack.mjs` currently probes `192.168.100.64`. It starts missing services, detects port conflicts and keeps existing expected services. It is not a portable service manager. For another LAN address, review `package.json`, both Vite configs, this startup script and `.env.local` together; or use the local-only commands above.

The combined launcher supervises the children it starts. If one exits, it can stop the others. Stop the combined launcher with Ctrl+C, then restart it during an agreed window. Do not assume killing only its API child leaves the website/CMS running. Three separate development terminals allow independent restarts.

| What changed? | What to do |
| --- | --- |
| CMS text/photo/order/visibility | Publish in the CMS; no process restart |
| React component/CSS in development | Vite refreshes the browser automatically |
| Server code or server-used shared rules | Restart the API |
| Environment settings | Restart the affected processes; rebuild for production browser settings |
| Dependencies | Install with the lockfile, then restart/build |
| Production React code | Build both apps and deploy/restart as required |

## 7. Which settings mean what

`VITE_*` settings are public browser configuration. Never put a password in one. Other settings are read by the server. Keep real values in the ignored `.env.local`.

| Setting | Purpose |
| --- | --- |
| `VITE_API_URL` | Browser API base address |
| `VITE_WEBSITE_URL` | Public address used by CMS preview |
| `VITE_CMS_ADMIN_URL` | CMS origin used by preview communication |
| `CMS_HOST`, `CMS_PORT` | Interface/port where Express listens |
| `CMS_PUBLIC_URL` | Address used in generated upload URLs |
| `CMS_ALLOWED_ORIGINS` | Allowed browser origins, including scheme and port |
| `CMS_COOKIE_SECURE` | `false` for isolated HTTP development; `true` for HTTPS production |
| `CMS_SERVE_BUILT_APPS` | Serve `dist` and `dist-admin` through Express |
| `CMS_DATABASE_URL` | Runtime PostgreSQL connection, including the application password |
| `POSTGRES_*`, `CMS_DATABASE_NAME`, `CMS_DATABASE_USER` | Database setup/backup/restore settings |
| `CMS_ADMIN_USERNAME`, `CMS_ADMIN_PASSWORD` | Setup/reset credentials, not a live password override |
| `CMS_UPLOAD_DIR`, `CMS_MAX_UPLOAD_BYTES` | Upload folder and maximum size; default limit is 25 MiB |
| `CMS_SESSION_HOURS`, `CMS_MAX_SESSIONS_PER_USER` | Session lifetime and per-user session limit |
| `FEEDBACK_SMTP_*`, `FEEDBACK_RECIPIENTS`, `FEEDBACK_FROM_*` | Optional feedback email delivery |

Database host, database name, public URLs, allowed origins and file locations must agree. Disable mail delivery in test copies so a smoke test does not email the organisation.

## 8. Content ownership and bilingual editing

Use the CMS for ordinary content edits. See [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md) for editor steps. Do not recreate content in React files merely because a label or paragraph needs changing.

- **Master people:** use People profiles for names, photographs, deployment and full details. Pages reference these records. Page-specific additional content affects only that page and does not replace the master photograph.
- **Division directory cards:** their names/order are edited separately from the opened page's main heading and section content.
- **Training and School:** their Division page records own the shared body. Academic routes keep their own heading/layout and link to the sole body editor. `shared/pageBodyOwnership.js` resolves this before public localization; alias body writes are rejected. Do not add a second body editor or a database copy/sync job.
- **Heading overrides:** an existing authoritative Page Headings override is identified by the editor. Follow its destination rather than adding competing values elsewhere.
- **Standalone pages:** belong to section `standalone` and open at `/standalone/:slug`.
- **Languages:** page text is stored separately in `data_en`/`data_hi`. Blank Hindi body text stays blank. Fields labelled Shared, such as media/structural settings, serve both languages. Short UI wording uses CMS Interface Labels through `t()`; its source wording remains the fallback when a label is absent.
- **Visibility:** only Published records reach the public website. Draft/Archived content stays hidden. Preview follows the selected publication state.

For practical edit steps, use the content-location tables and task recipes in [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md). The dashboard groups are Homepage, Divisions, Website Pages, Navigation and Appearance, People and Our Formers, and Public Information. Account permissions determine which cards appear.

Collection fields are defined in `shared/cmsCollections.js`; output is assembled in `server/contentAssembler.js`. A new field generally needs both an editor/validator definition and a public rendering/data mapping.

## 9. Photos, PDFs and other files

### Asset folder map

All paths below are relative to `D:\RSAC_custom_cms`. Several folders contain historical copies of similar pictures. **The URL selected in the current CMS record tells you which copy the website uses.** Finding a file with the same name in another folder is not enough.

| Location | What is kept here | How it reaches the website / how to edit it |
| --- | --- | --- |
| `src/assets/images/` | Source-imported branding and portrait copies, including `rsac-logo.webp`, `up-emblem.webp`, `cm.*` and `pm.*`. | React imports are processed by Vite. CMS login/header branding also imports source logos. For public logos, first check **Header / Footer Logos**; source logos can also act as fallbacks. |
| `src/assets/images/hero-videos/` | Source hero poster, including `rsac-earth-studio-up-poster.jpg`. | Imported by `src/data/heroVideos.js`; the current CMS hero record may instead select a public or uploaded poster. |
| `src/assets/videos/` | Source video copies: `rsac-earth-studio-up.mp4` and `rsac-earth-studio-up-1920.mp4`. | Imported by `src/data/heroVideos.js`. These are separate from the public copies below. |
| `public/cms-media/migrated/` | Migrated CMS photos/files with generated names, plus public copies of the two Earth Studio videos and poster. | Stable URLs such as `/cms-media/migrated/rsac-earth-studio-up.mp4`. Existing CMS records can point here. Replace a selection through its owning CMS editor. |
| `public/scientists/` | Named local scientist portrait copies. | `/scientists/filename.jpg`; manage the selected portrait in the person's master profile. |
| `public/officials/` | Named local official portrait copies. | `/officials/filename.jpg`; check the owning profile or role record before replacing it. |
| `public/organisation-chart-photos/` | Local organisation-chart photo copies. | `/organisation-chart-photos/filename`; **Organisation Chart** controls each role's selected photo. |
| `public/organisation-chart.jpg` | Standalone chart-image asset. | `/organisation-chart.jpg`. Its presence does not replace the current role-based diagram rendered by `OrganisationChartDiagram.jsx`. |
| `public/images/gallery/` | Local gallery image copies. | `/images/gallery/filename`; **Gallery** controls the published image, caption and alt text. |
| `public/images/mobile-apps/` | Local mobile-application images. | `/images/mobile-apps/filename`; check **Mobile Apps** for the selected content. |
| `public/documents/notices/` | Local notice/corrigendum PDF copies. | `/documents/notices/filename.pdf`; edit the owning notice/public-information document field. |
| `public/documents/flood/` | Large year-wise Flood PDF archive. | `/documents/flood/...`; **Flood Reports** stores the corresponding report details and URL. Copy this folder separately during handover. |
| `public/official-media/siteContent/` | Mirrored official documents and images in folders such as `pdf`, `faq`, `director_pic`, `oc` and `flood2025`. | `/official-media/siteContent/...`; preserve the existing path unless the owning CMS record is updated. |
| `public/official-media/uploadedImages/Image/` | Mirrored official images with original-style filenames. | `/official-media/uploadedImages/Image/...`. |
| `public/official-media/UploadNews/` | Mirrored official news/tender/document files. | `/official-media/UploadNews/...`; spelling and capital letters are part of the path. |
| `public/official-media/legacy-rsac/rsac_MODEL_vIDEOS/` | Legacy videos, including `rsac_build_02.mp4`, `CHARBAGH2.mp4`, `badshahnagar.mp4` and `AISHBAGH2.mp4`. | `/official-media/legacy-rsac/rsac_MODEL_vIDEOS/...`. Use the owning page's Video field to change which file is shown. |
| `public/official-media/legacy-rsac/dam/` | Legacy resources including mobile-app APK downloads. | Existing links use `/official-media/legacy-rsac/dam/...`; these static files are separate from the new-upload allowlist. |
| `server/uploads/` by default | New files uploaded through the CMS: people photos, logos, gallery images, page media, videos and documents. | Express serves them under `/uploads/`. Actual disk location can be changed by `CMS_UPLOAD_DIR` in private configuration. |
| Fontsource packages in `node_modules/@fontsource-variable/` | Inter, Plus Jakarta Sans and Noto Sans Devanagari font files. | Imported in `src/index.css` and bundled by Vite. Install dependencies to recreate them; font choices are exposed in **Website Design and Fonts**. |
| `src/components/icons/cmsIconRegistry.js` and `lucide-react` | Code-based icon names/components used by cards and controls. | Choose supported icons in the CMS dropdown. Most icons are SVG components, not separate PNG files. `public/icons.svg` is an additional public SVG asset. |
| `dist/`, `dist-admin/` | Generated deployable assets, including bundled/hashed images, fonts, CSS and JavaScript. | Build output only. Change the original source/CMS selection, then rebuild as needed; do not edit generated files as the master copy. |

Other public root files, such as `robots.txt`, `sitemap.xml`, `theme-init.js` and `.well-known/security.txt`, support discovery, theme startup or site metadata. They are developer-maintained files rather than CMS photo uploads.

### Disk paths and browser URLs

| Disk location | Browser address pattern |
| --- | --- |
| `public/images/gallery/photo.jpg` | `/images/gallery/photo.jpg` |
| `public/cms-media/migrated/photo.webp` | `/cms-media/migrated/photo.webp` |
| `public/documents/flood/YEAR/report.pdf` | `/documents/flood/YEAR/report.pdf` |
| Configured upload directory plus `generated-name.jpg` | `CMS_PUBLIC_URL` + `/uploads/generated-name.jpg`; stored upload URLs can be absolute |
| `src/assets/...` imported by React | Vite resolves the URL in development and emits a bundled URL in production. Do not guess or save a generated build filename in the CMS. |

The first three rows illustrate path rules, not a promise that those example filenames exist. Do not include `public/` in a browser URL. Do not enter a Windows path such as `D:\RSAC_custom_cms\server\uploads\photo.jpg` or `file:///...` in a CMS media field. A visitor cannot read the editor's disk.

### Upload-to-website flow

```text
Choose file / Replace file in the owning CMS record
  -> admin/src/mediaUpload.js submits the file to POST /api/admin/media
  -> Express checks sign-in, permission, CSRF, file type and size
  -> Multer writes the bytes into CMS_UPLOAD_DIR (default server/uploads)
  -> cms_media stores metadata and the generated public URL
  -> the editor selects that URL in the draft
  -> Save / Publish changes stores the URL in the person/page/card record
  -> published bootstrap includes the selection
  -> the browser requests /uploads/... and displays the file
```

Upload completion alone does not publish the record. Wait for uploads to finish, enter any captions/alt text, then save. Cancelling an editor or clearing a selected file is not evidence that the underlying file has been deleted from disk. Replacing a file creates a new generated address; do not rename old files or remove apparently unused uploads without checking references and backups.

The database contains the URL, metadata and page/person content; it does not contain the image/video/PDF bytes. A complete recovery needs both database and files. Caption/alt-text fields can be language-specific; fields marked **Shared by both languages** use one file selection for English and Hindi.

### Video and poster ownership

For the homepage, use **Homepage -> Homepage Hero Media Playlist**. Each record has **Video**, **Large-screen video (optional)**, **Poster image** and **Include in homepage playlist**, together with visibility and display order. `server/contentAssembler.js` creates `heroVideos` from published active playlist records; `src/components/hero/HeroBackground.jsx` chooses and plays the appropriate source.

Use the regular Video field for the normal encode and the optional large-screen field for a higher-resolution encode. Keep a poster selected for loading, reduced-motion and playback-failure states. Changing the text-only **File name** does not upload or replace the video.

The source copies in `src/assets/videos/` and public copies in `public/cms-media/migrated/` are not automatically synchronised. Follow the saved CMS URL before deciding which file to update. A video inside a Division/Facility/other page belongs to that page's section-media editor, not the homepage playlist.

### Supported uploads and limits

- Photo-purpose fields accept JPEG, PNG, WebP, AVIF, GIF and SVG; documents cannot be uploaded as portraits.
- General upload fields support those image types plus PDF, MP4, WebM, CSV, DOC/DOCX, XLS/XLSX and PPT/PPTX, subject to the server's MIME allowlist.
- The default maximum is **25 MiB per file** (`CMS_MAX_UPLOAD_BYTES=26214400`), including videos. An existing larger static video does not mean a new upload bypasses this limit.
- Existing APKs and other legacy files can be served from `public/`; APK, ZIP and audio formats are not in the current new-upload allowlist. A chooser/asset label does not extend the server's accepted types.

The relevant implementation is `admin/src/mediaUpload.js`, `admin/src/ImportedAssetEditor.jsx`, `admin/src/FieldInput.jsx`, `server/config.js` and the media routes in `server/index.js`. Limits/types should be changed only as a separately reviewed development task.

### Find the exact asset before changing it

1. Open its owning CMS record and inspect the selected filename. If necessary, expand **Use an existing local file address** to read the existing URL without changing it.
2. For a developer, the browser Network panel or the selected language's bootstrap response shows the URL actually requested. Page-section media can also be referenced inside rich-text HTML.
3. Match the URL to the disk-path table above. For `/uploads/`, check `CMS_UPLOAD_DIR`; for a public path, put `public/` in front of the URL path.
4. Search the known filename/reference in source when tracing its origin. Database content is not searched by `rg`; use the CMS or an authorised read-only database lookup for stored record values.
5. Replace the file through the same owning editor and verify the public page in both languages. Do not create another independent edit field for the same content.

Run these read-only lookup commands from the project root when needed:

```powershell
# List all source/public image and video candidates.
rg --files src/assets public -g '*.jpg' -g '*.jpeg' -g '*.png' -g '*.webp' -g '*.avif' -g '*.gif' -g '*.svg' -g '*.mp4' -g '*.webm'

# Search references to one known filename or path.
rg -n -F 'rsac-earth-studio-up.mp4' src admin/src shared server -g '*.js' -g '*.jsx' -g '*.json'

# List runtime uploads only after confirming this is the configured directory.
Get-ChildItem -LiteralPath 'server/uploads' -File

# See tracked media and ask Git whether a specific file is ignored.
git ls-files src/assets public
git check-ignore -v -- public/documents/flood/EXACT_FILENAME.pdf
```

Legacy URL rewriting is documented by the code in `src/data/officialMedia.js` and `src/data/officialMediaManifest.generated.js`. The manifest maps older official URLs to local mirror paths. Do not delete a mirror just because an old URL appears in content; the renderer may resolve it locally.

### What must travel with a project handover

| Files/data | Transfer with Git? | Transfer separately? |
| --- | --- | --- |
| Committed source, `src/assets` and approved public media | Yes; confirm with `git ls-files` | Required untracked files still need a separate copy |
| `public/official-media` and large videos | Check the exact file and ignore rules; some MP4 paths are explicitly allowed | Any required file not tracked |
| Configured runtime upload directory | No | Yes, with its matching database backup |
| `public/documents/flood` | No | Yes, with matching report records |
| PostgreSQL content, accounts and media metadata | No | Private database backup |
| `.env.local` | No | Secure destination-specific configuration |
| `node_modules`, `dist`, `dist-admin`, logs | No | Reinstall/rebuild; do not treat as the master copy |

Preserve filenames, folder spelling and capital letters, especially if deploying to a case-sensitive server. After moving to another host, check stored absolute upload URLs as well as file bytes. Do not silently change the public hostname by moving files alone.

## 10. Make a code change

1. Read `git status`, this guide and the relevant file mapping above.
2. Work on a branch such as `codex/fix-description`, with a separate development database/media folder for content-changing tests.
3. Reproduce the issue and identify whether it belongs to the browser, CMS, API, database or a missing file.
4. Make the smallest complete change. Preserve stable keys, bilingual fields and existing ownership rules.
5. Test the affected flow, keyboard controls, both languages and the relevant build.
6. Review `git diff`. Commit source/tests/docs together, with no secrets or runtime data.

Optional browser storage is handled by `src/utils/browserStorage.js`. Preferences/cache failures must not crash the page. Modal focus/scroll cleanup uses `src/hooks/useModalFocus.js`. Reuse these helpers rather than adding another unsafe storage call or a dialog that leaves keyboard focus behind it.

## 11. Test and release

### Fast checks, with no database required

```cmd
npm run test:ui
npm run build:all
```

The offline UI test mounts actual React components against synthetic fixtures. It checks blocked storage, invalid saved font sizes, gallery navigation/empty galleries, focus containment/return, search and dialog controls. It does not launch a browser or verify pixels at mobile breakpoints.

Use `npm run lint` for repository lint. For a small change, run ESLint on the changed files first. Distinguish existing unrelated findings from new failures.

### Full CMS checks

```cmd
npm run cms:validate
npm run cms:verify-all
```

Run these with the **development/test database and API** configured. The full suite includes temporary users, writes, uploads and feedback; cleanup/rollback is tested but this is not a read-only production command. Confirm `.env.local` points to the intended test system and email is disabled. New checks must verify behaviour, rather than simply repeating implementation details.

### Manual release check

On an available browser, test desktop, tablet and a narrow phone layout, in English and Hindi. Check menu/search open-close, keyboard Tab/Shift+Tab/Escape, language toggle/reload, gallery arrows, long tables, Display Options on a short screen, feedback errors, document downloads and photo upload/save/reopen. Inspect the browser console and network failures. Test with reduced motion and larger text.

### Production

```cmd
npm ci --include=dev
npm run build:all
npm start
```

One production Express process serves website `/`, CMS `/cms/`, API `/api/` and `/uploads/`. Use HTTPS and production domain/origin settings; `CMS_COOKIE_SECURE=true` belongs with HTTPS. Put the process behind the organisation's approved reverse proxy and run it through its service/process manager, so it survives logoff/reboot. `npm start` in an ordinary terminal is not a permanent deployment. Do not use the Vite development servers as the public production service.

`npm run smoke:production` starts a temporary production server on an unused port and checks HTML/assets/API; its current network binding is also the office address. Use it on the configured test machine. Plan an agreed restart window, keep a source/database/media recovery copy and check health/public/CMS URLs after release.

## 12. Backup, restore and transfer

See [PROJECT_TRANSFER_GUIDE.md](PROJECT_TRANSFER_GUIDE.md) for the detailed process.

```cmd
npm run cms:backup
```

This creates a validated plain SQL backup in `backups/`. **The current backup script removes all older automatically named SQL backups after validating the new one.** If historical recovery points are needed, archive them securely outside that generated naming/location before running the command. It does not back up upload bytes or the Flood PDFs; copy those separately.

```cmd
npm run cms:restore -- backups\APPROVED_BACKUP.sql
```

Restore first creates a safety `.dump` and then replaces the destination CMS objects/data. Choose the destination carefully, preserve destination-only edits and pair the restored data with matching media. SQL restore accepts a file inside `backups/`; it is not a normal step after every code pull.

## 13. Troubleshooting

| Symptom | First checks |
| --- | --- |
| Website shell loads but content does not | `/api/health`, API network requests, DB URL, API process and allowed origins |
| `EADDRNOTAVAIL` on a new computer | Office IP bindings; use the local-only startup/settings above |
| Port already in use | Identify the existing process/service; do not kill unrelated processes |
| CMS login repeats/fails on HTTP | `CMS_COOKIE_SECURE=false` for that isolated HTTP setup; consistent hostnames and cookies |
| 403 / CSRF error | Account permissions, current login session, origin settings and client CSRF token |
| Save says content changed | Another session changed the version; reload and reconcile |
| Uploaded photo is missing | Record saved/published, supported MIME, file in `server/uploads`, correct public URL |
| Old photos break after transfer | Database/media pair and any stored absolute old-host URLs |
| Hindi looks empty | Check actual Hindi fields, publication state and shared/localized field definitions |
| Preview expired after restart | Reopen Preview from the CMS; temporary tokens were held in API memory |
| `pg_dump` missing or incompatible | PostgreSQL tools on PATH and tool/server versions |
| Setup permission error | Confirm the PostgreSQL setup account and target dev database; ask the DB administrator for required privileges |
| Generated build or schema is outdated | Rebuild or run approved setup/migration on the correct system; back up first |
| UI freezes after a dialog | Focus/scroll-lock cleanup; run `test:ui` and inspect console errors |

Avoid running repair/sync/migration scripts just to see what happens. Read the script, its arguments and write behaviour first. Names such as `cms:repair-*`, `cms:migrate-*`, `cms:sync-*`, `--apply` and `CMS_FORCE_SEED` can change database content.

## 14. Before the current developer leaves

Have a replacement developer clone the approved commit, configure a separate database, restore a backup/media pair and demonstrate startup, a bilingual edit, a photo upload, a build and a restore drill. Transfer repository/hosting/database/CMS responsibilities through the organisation, rather than leaving the system dependent on one personal account.

Record the production domain, host, running service name, approved release commit, backup location/schedule and responsible contacts in the organisation's private handover record. Keep secrets there through its secure process, not in this Markdown file.

Further reading: [README.md](README.md), [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md), [PROJECT_TRANSFER_GUIDE.md](PROJECT_TRANSFER_GUIDE.md), [UI_VERIFICATION.md](UI_VERIFICATION.md).
