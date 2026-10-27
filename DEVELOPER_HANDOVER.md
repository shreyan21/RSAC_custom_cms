# RSAC-UP developer handover

Updated: 27 October 2026. Start here when taking over this project.

This guide describes **`D:\RSAC_custom_cms`**, the React website, custom React CMS and Express API. The separate `D:\rsac_website` folder is an older Directus project. Do not mix their source files, environment settings, databases or instructions.

Latest checked behaviour and limitations: [27 October end-to-end verification](E2E_VERIFICATION_2026-10-27.md).

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

## 4. How requests and content move

**Public read:** React pages call hooks from `src/hooks/useData.js`. Those hooks read `DataContext`, which requests `/api/content/bootstrap?lang=en` or `lang=hi`. `server/contentAssembler.js` converts published database records into the shapes required by the pages. Version checks and `/api/content/events` refresh open pages after publishing.

**CMS edit:** The dashboard chooses an editor using collection definitions. `admin/src/api.js` sends authenticated requests, including the CSRF token on writes. The server checks permissions and version conflicts, validates fields, saves in a transaction and writes an audit record. The content version then changes.

**Private preview:** `/api/admin/preview` keeps a temporary draft in API memory. The website reads `/api/content/preview/:token`, with the token in its preview link. Preview does not publish a database edit. Tokens expire, and an API restart loses previews. Reopen Preview after a restart.

Main database tables:

| Table | Stores |
| --- | --- |
| `cms_entries` | Collection, stable internal key, status, order, `data_en`, `data_hi` and version |
| `cms_users`, `cms_sessions` | Accounts, permissions and active sessions |
| `cms_media` | File metadata and addresses |
| `cms_feedback` | Feedback and optional mail-delivery status |
| `cms_audit_log` | History of CMS changes |
| `cms_site_visits` | Visitor counters |

Keep stable internal keys unchanged unless you have reviewed every reference. A database version conflict means another editor changed that record; reload and reconcile the edits.

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

Collection fields are defined in `shared/cmsCollections.js`; output is assembled in `server/contentAssembler.js`. A new field generally needs both an editor/validator definition and a public rendering/data mapping.

## 9. Photos, PDFs and other files

Photo controls support JPEG, PNG, WebP, AVIF, GIF and SVG. They submit image-purpose uploads to `/api/admin/media`; the server rejects non-image uploads for those controls and uses MIME-appropriate extensions. Document fields can upload approved PDFs and other supported files. A successful upload is not the same as saving the containing CMS record: publish/save the record afterward.

| Files/data | Transfer with Git? | Transfer separately? |
| --- | --- | --- |
| Source and committed `src/assets`, `public/cms-media` | Yes | Usually no |
| `public/official-media` | Check `git ls-files`/ignore rules | Any untracked required files |
| `server/uploads` | No | Yes, with its matching DB backup |
| `public/documents/flood` | No | Yes, with matching report records |
| PostgreSQL content/users/media metadata | No | Database backup |
| `.env.local` | No | Secure destination-specific configuration |
| `node_modules`, `dist`, `dist-admin`, logs | No | Reinstall/rebuild |

Do not rename uploaded files on disk. Existing records point to them. When moving to another host, also check older absolute media URLs; copying file bytes does not automatically rewrite a stored host address. A filename or photograph is not a person's identity: distinct people may share an image, while duplicate name/employee-ID/email checks still apply.

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
