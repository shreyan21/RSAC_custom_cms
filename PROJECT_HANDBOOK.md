# RSAC-UP Project Handbook

This is the main technical handover document for the RSAC-UP website and CMS.
It explains what to transfer, how to set up a fresh computer, how to update an
existing computer, what each command does, and which files belong to each part
of the project.

For day-to-day content editing, use `CMS_USER_GUIDE.md` instead.

## 1. Understand the Four Parts

A complete copy of this project has four separate parts:

1. **Project code**: React website, React CMS, Express server, scripts, and
   committed public media. GitHub transfers this part.
2. **PostgreSQL database**: all current CMS text, English/Hindi records,
   visibility, order, users, feedback, audit history, and media references.
3. **Uploaded files**: files in `server\uploads` that were uploaded through the
   CMS. The database stores their URLs, but not the actual file bytes.
4. **Private settings**: `.env.local`, including database, CMS login, and email
   settings. This file must be transferred privately and never committed.

The Flood archive in `public\documents\flood` is also excluded from normal Git
because it can be very large. Transfer it privately with the uploads.

Git alone is therefore not a full website handover.

## 2. What Must Be Committed

Commit these items to Git:

- `src\`: public React website source.
- `admin\`: React CMS portal source.
- `server\`: Express/PostgreSQL code, schema, and starter seed JSON.
- `shared\`: rules shared by website, CMS, and server.
- `scripts\`: start, test, backup, restore, migration, and audit scripts.
- `public\cms-media\` and other approved public assets not ignored by Git.
- `index.html`, Vite configuration files, `package.json`, and
  `package-lock.json`.
- `.env.example`, `.gitignore`, and the current Markdown guides.

Do not commit these items:

- `.env.local` or any real password.
- `node_modules`.
- `dist` or `dist-admin`.
- `backups`, `.sql`, or `.dump` database backups.
- `server\uploads`.
- `public\documents\flood` unless a separate approved large-file method is
  being used.
- logs, temporary files, screenshots, test output, or local editor settings.

Check exactly what Git will transfer:

```cmd
git status
git ls-files
```

## 3. Before Any Transfer: Source Computer

Open Command Prompt and run:

```cmd
cd /d D:\RSAC_custom_cms
npm run cms:verify-all
npm run cms:backup
npm run build:all
git status
```

If the checks pass, commit only the intended source changes:

```cmd
git add -A
git status
git commit -m "Prepare RSAC project handover"
git push
```

Then privately prepare these items outside Git:

- The newest file from `backups\`.
- The complete `server\uploads\` folder.
- The complete `public\documents\flood\` folder.
- The values needed from `.env.local`.

Keep the database backup and uploaded files from the same point in time. A
database that refers to a file which was not transferred will show a broken
image, PDF, or video.

## 4. Fresh Destination Computer

Use this section when the destination computer has no copy of the project.

### 4.1 Install Required Software

Install:

- Git.
- Node.js 20 or newer, including npm.
- PostgreSQL 14 or newer, including `psql`, `pg_dump`, and `pg_restore`.

Confirm in Command Prompt:

```cmd
git --version
node --version
npm --version
psql --version
pg_dump --version
```

### 4.2 Download the Code

```cmd
git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git D:\RSAC_custom_cms
cd /d D:\RSAC_custom_cms
npm ci --include=dev
```

Use `npm ci`, not a copied `node_modules` folder. It installs the exact versions
recorded in `package-lock.json`.

### 4.3 Create Private Settings

Create `.env.local` from `.env.example`. Put real values only in `.env.local`.
For a local computer, the website, CMS, and API normally use ports 5173, 5174,
and 3000.

Required setup values include:

```env
POSTGRES_ADMIN_USER=postgres
POSTGRES_ADMIN_PASSWORD=your-postgres-password
CMS_DATABASE_NAME=rsac_custom_cms
CMS_DATABASE_USER=rsac_custom_app
CMS_ADMIN_USERNAME=your-admin-name
CMS_ADMIN_PASSWORD=YourStrongPassword123
```

The CMS password must be at least 12 characters, start with an uppercase
letter, and include a lowercase letter and a number.

### 4.4 Create the Database Structure

```cmd
npm run cms:setup
```

This command creates the database role, database, tables, functions, indexes,
and the administrator account. If `cms_entries` is empty, it also inserts the
starter data from `server\seed-data.generated.json`. It does not overwrite an
already populated database unless `CMS_FORCE_SEED=true`, which should not be
used casually.

### 4.5 Restore the Current CMS Content

Copy the source `.sql` backup into the destination `backups\` folder, then run:

```cmd
npm run cms:restore -- backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

The restore command first creates a safety `.dump`, then replaces only the
custom CMS database objects, restores the selected SQL file, and verifies the
record counts.

After restore, reset the administrator only if the destination should use the
credentials currently written in its `.env.local`:

```cmd
npm run cms:reset-admin
```

Editing `.env.local` alone never changes the password already stored in
PostgreSQL.

### 4.6 Restore Uploaded Files

Copy the source folders into the same paths on the destination:

```text
server\uploads\
public\documents\flood\
```

Do not rename files inside these folders because their paths are stored in the
database.

### 4.7 Verify and Start

```cmd
npm run cms:verify-all
npm run build:all
npm run dev:all
```

Open:

- Website: `http://localhost:5173`
- CMS: `http://localhost:5174`
- API check: `http://localhost:3000/api/health`

## 5. Destination Already Has the Project

Always begin on the destination with:

```cmd
cd /d D:\RSAC_custom_cms
git status
npm run cms:backup
```

Do not pull over unfinished local code. Commit it, move it to a separate branch,
or ask the maintainer to reconcile it first.

### Scenario A: Only Code Changed

Use this when CMS editors did not change the database on the source computer.

```cmd
git pull --ff-only
npm ci --include=dev
npm run cms:setup
npm run cms:verify-all
npm run build:all
```

`cms:setup` is safe here because it keeps existing CMS entries when the database
is populated. Never set `CMS_FORCE_SEED=true` for this update.

### Scenario B: Only CMS Text or Records Changed

No Git pull is needed if code did not change. Transfer the newest SQL backup and
matching uploaded files, then run:

```cmd
npm run cms:backup
npm run cms:restore -- backups\SOURCE_BACKUP.sql
npm run cms:verify-all
```

Restore replaces destination CMS records with the source backup. Destination
CMS edits made after the source backup will be lost, which is why the destination
backup is mandatory.

### Scenario C: Code and CMS Content Both Changed

```cmd
git status
git pull --ff-only
npm ci --include=dev
npm run cms:backup
npm run cms:restore -- backups\SOURCE_BACKUP.sql
npm run cms:setup
npm run cms:verify-all
npm run build:all
```

Copy matching `server\uploads` and Flood PDFs before final verification.

### Scenario D: Only New Uploads or Flood PDFs Changed

Copy only the changed files while preserving their paths. No database restore is
needed if the destination database already contains the matching CMS records.

### Scenario E: Both Computers Have New CMS Edits

Do not restore one over the other immediately. First:

1. Run `npm run cms:backup` on both computers.
2. Decide which database is the official version.
3. Record or manually re-enter the smaller set of changes into the official
   database.
4. Make a new official backup.
5. Restore that backup on the other computer.

The current restore process replaces records; it is not a two-way merge tool.

### Scenario F: Destination Has Local Code Changes

Run:

```cmd
git status
git diff
```

Do not use `git reset --hard`. Commit the local work on a branch or reconcile it
before pulling.

### Scenario G: No Source Database Backup Exists

Run `npm run cms:setup` and keep the starter seed content. Current CMS edits,
users, feedback, and audit history cannot be reconstructed from Git alone.

## 6. Transfer Without GitHub

On the source computer, create an archive that excludes ignored/generated
folders. Include the source files shown by `git ls-files`. Transfer separately:

- Newest CMS SQL backup.
- `server\uploads`.
- `public\documents\flood`.
- Private environment values.

On the destination, extract the code, open Command Prompt in the project, and
follow the fresh-computer steps beginning with `npm ci --include=dev`.

Do not transfer `node_modules`, `dist`, or log files.

## 7. Production or EC2 Installation

Production uses one Express process after both React applications are built.
The single `package.json` and single `node_modules` folder are intentional.

```cmd
npm ci --include=dev
npm run build:all
npm start
```

The Express process serves:

- Public website at `/`.
- CMS portal at `/cms/`.
- API at `/api/`.
- Uploaded files at `/uploads/`.

For a server, set `CMS_HOST=0.0.0.0`, use the real public domain in
`CMS_PUBLIC_URL` and `CMS_ALLOWED_ORIGINS`, and set secure cookies when HTTPS is
active. Do not hardcode a changing EC2 IP in React or Express source files.

Use the operating system service manager or PM2 to start `npm start` after a
reboot. Build first; development ports 5173 and 5174 are not required in this
production arrangement.

Verify before exposing it:

```cmd
npm run smoke:production
```

## 8. Database Backup Formats

`npm run cms:backup` creates a plain-text `.sql` file. A full PostgreSQL SQL
backup contains both structure and data: table definitions, functions, indexes,
and rows. The command validates the new file before deleting older generated
SQL backups, so the newest generated backup is kept.

A `.dump` file is PostgreSQL custom format. It can also contain both structure
and data, but it is binary and normally restored with `pg_restore`. This project
creates a `.dump` automatically as a safety copy before an SQL restore. The
project command `npm run cms:restore` intentionally accepts only a full plain
`.sql` file from `backups\`.

The file `server\schema.sql` is not a content backup. It defines the current
database structure used by setup.

The file `server\seed-data.generated.json` is starter CMS content. Setup uses it
only when the content table is empty, unless force-seeding is explicitly enabled.
It is not a replacement for a current database backup.

## 9. Normal Commands

| Command | What it does |
| --- | --- |
| `npm ci --include=dev` | Installs the exact packages in `package-lock.json`. |
| `npm run dev:all` | Starts API, public website, and CMS together on 3000, 5173, and 5174. |
| `npm run dev` / `dev:website` | Starts only the public Vite website. |
| `npm run dev:admin` | Starts only the CMS Vite portal. |
| `npm run dev:api` | Starts only the Express API. |
| `npm run build` | Builds the public React website into `dist`. |
| `npm run build:admin` | Builds the CMS React portal into `dist-admin`. |
| `npm run build:all` | Builds both React applications. |
| `npm start` | Starts the production Express server and serves both builds. |
| `npm run preview` | Opens Vite's preview server for the public build only. |
| `npm run smoke:production` | Builds/starts a temporary production arrangement and checks important routes. |
| `npm run lint` | Checks JavaScript, React, and hook usage with ESLint. |

## 10. CMS Setup and Recovery Commands

| Command | What it does |
| --- | --- |
| `npm run cms:setup` | Creates/updates PostgreSQL structure and admin; seeds only an empty CMS, then runs safe consistency repairs. |
| `npm run cms:backup` | Creates one validated full SQL backup and removes older generated SQL backups only after success. |
| `npm run cms:restore -- backups\FILE.sql` | Makes a safety dump, replaces CMS objects, restores the selected full SQL backup, and verifies counts. |
| `npm run cms:reset-admin` | Applies admin username/password from `.env.local` and closes old admin sessions. |
| `npm run cms:export-seed` | Exports current suitable CMS entries to the committed starter seed JSON. Use only when intentionally updating starter content. |
| `npm run cms:validate` | Checks database/content health without normal content editing. |
| `npm run cms:audit` | Reports broad CMS content consistency findings. |
| `npm run cms:verify-all` | Runs the maintained end-to-end CMS verification group. This is the main pre-handover check. |

## 11. CMS Audit and Test Commands

These commands are mainly for maintainers. Tests that make temporary records
are designed to restore or remove their test data.

| Command | What it checks |
| --- | --- |
| `cms:audit-rich-sections` | Canonical rich-text sections. |
| `cms:audit-semantic-content` | Meaningful section/content structure. |
| `cms:test-section-items` | Add/edit/order behavior of section list items. |
| `cms:test-divisions` | Division card and division-page synchronization. |
| `cms:test-section-rendering` | Division/facility section presentation contract. |
| `cms:test-editor-quote` | Rich editor quote command behavior. |
| `cms:test-page-write-through` | Division/facility CMS edits reaching the website payload. |
| `cms:test-site-write-through` | Non-division CMS edits reaching the website payload. |
| `cms:test-former-roster` | Former-profile roster synchronization and uniqueness. |
| `cms:test-visibility` | Draft/archived content exclusion from website and private preview. |
| `cms:text-coverage` | Visible website text ownership and CMS coverage. |
| `cms:editor-live-parity` | CMS editor values compared with live payload values. |
| `cms:asset-coverage` | Image, video, and document availability. |
| `cms:hindi-coverage` | Independent Hindi content coverage. |
| `cms:portal-audit` | CMS interface and collection consistency. |
| `cms:contract-audit` | Public API collection-to-page contracts. |
| `cms:audit-official-core` | Required official core content. |
| `cms:audit-live-navigation` | Navigation routes and visible destinations. |
| `cms:ownership-audit` | Whether visible content is owned by the CMS. |
| `cms:ownership-report` | Human-readable CMS content ownership report. |
| `cms:no-fallback-audit` | Detects visible hardcoded fallback content. |
| `cms:media-smoke` | Temporary media upload, replacement, serving, and cleanup. |
| `cms:feedback-smoke` | Feedback submission and CMS storage. |
| `cms:test-artifacts` | Finds accidental test content left in the database. |
| `cms:flood-check` | Flood archive and report-file consistency. |
| `cms:smoke` | Bilingual division/facility save, preview, media, and restore checks. |

Run an individual command with `npm run` before its name, for example:

```cmd
npm run cms:test-visibility
```

## 12. CMS Repair and Migration Commands

Do not run these just because they exist. Make a backup first and use the one
that matches a diagnosed problem.

| Command | Purpose |
| --- | --- |
| `cms:sync-homepage` | Ensures required homepage CMS records exist. |
| `cms:ensure-typography` | Ensures website typography settings exist. |
| `cms:repair-pages` | Repairs page/CMS parity records. |
| `cms:repair-divisions` | Repairs division card/page consistency. |
| `cms:repair-bilingual` | Repairs known English/Hindi parity structure. |
| `cms:repair-section-structure` | Aligns bilingual section structure. |
| `cms:normalize-live-blocks` | Normalizes imported page blocks. |
| `cms:migrate-section-rich-content` | Migrates page sections to canonical rich text. |
| `cms:migrate-semantic-content` | Migrates imported content to semantic blocks. |
| `cms:migrate-about-content` | Applies the About-page rich-content migration. |
| `cms:clean-media-headings` | Removes known duplicate media headings. |
| `cms:clean-repeated-headings` | Removes known repeated section headings. |
| `cms:sync-academic-pages` | Synchronizes academic page records. |
| `cms:align-bilingual-layouts` | Applies bilingual rich-text layout alignment. |
| `cms:sync-former-photos` | Links former-profile photos to profile records. |
| `cms:repair-scalars` | Repairs placeholder values in scalar fields. |
| `cms:normalize-publications` | Normalizes numbered publication rows. |
| `cms:sort-division-items` | Sorts dated division items. |
| `cms:localize-media` | Copies approved remote media into local project storage. |
| `cms:sync-hindi` | Applies the approved Hindi synchronization dataset. |
| `cms:sync-editor-labels` | Synchronizes CMS editor labels. |
| `cms:sync-media` | Synchronizes page media parity. |
| `cms:sync-runtime-content` | Imports known runtime content into CMS ownership. |
| `cms:sync-interface-labels` | Synchronizes public interface labels. |
| `cms:sync-public-information` | Synchronizes official public-information pages. |
| `cms:ensure-text-fields` | Ensures required editable page text fields. |
| `cms:ensure-assets` | Ensures known page assets are represented in CMS. |
| `cms:ensure-missing-assets` | Adds only missing known page assets. |

## 13. Git Commands Used During Handover

| Command | Meaning |
| --- | --- |
| `git status` | Shows changed, new, and deleted files before any commit or pull. |
| `git diff` | Shows local source edits not yet committed. |
| `git ls-files` | Shows files that Git actually transfers. |
| `git add -A` | Stages intended additions, edits, and deletions; always review status afterward. |
| `git commit -m "message"` | Records the staged source changes locally. |
| `git push` | Sends local commits to the configured remote repository. |
| `git pull --ff-only` | Downloads newer commits only when no history merge is required. |
| `git clone URL FOLDER` | Creates the first project copy on a fresh destination. |

Never use `git reset --hard`, forced checkout, or forced add on ignored secrets
without a specific reviewed recovery plan.

## 14. Project Architecture

This repository contains three applications in one npm project:

```text
Browser
  |-- Public React website (development port 5173)
  |-- React CMS portal (development port 5174)
  `-- Express API (port 3000)
         |-- PostgreSQL database
         `-- server\uploads files
```

One `package.json`, one `package-lock.json`, and one `node_modules` folder are
valid because both React applications and Express deliberately share compatible
dependency versions.

In production, Vite turns both React applications into static build files.
Express serves those builds and the API from one process. This is not Express
generating HTML page-by-page; the public website and CMS remain React single-page
applications with route fallbacks.

### CMS Save Flow

```text
CMS React editor -> Express validation/authentication -> PostgreSQL
                 -> content version update -> public website refresh
```

### Private Preview Flow

```text
Unsaved CMS editor state -> temporary Express preview token
                         -> private website tab
                         -> postMessage update after each edit
```

Published items are inserted or replaced in preview. Draft and archived items
are removed from preview, so the preview represents the future public website.

### Media Flow

```text
CMS upload -> Express/Multer -> server\uploads file
                         `-> PostgreSQL media URL and metadata
```

Both the database record and the file are required.

## 15. Files and Folders

### Root Files

| Path | Purpose |
| --- | --- |
| `package.json` | All npm commands and dependencies for website, CMS, and Express. |
| `package-lock.json` | Exact package versions for repeatable installation. |
| `index.html` | Vite entry HTML for the public React website. |
| `vite.config.js` | Public website development/build settings and API proxy. |
| `vite.admin.config.js` | CMS development/build settings. |
| `eslint.config.js` | Code quality rules. |
| `.env.example` | Safe list/example of environment settings; no real secrets. |
| `.env.local` | Real machine-specific secrets and URLs; ignored by Git. |
| `.gitignore` | Files that must not be committed. |
| `README.md` | Short project entry point. |
| `PROJECT_HANDBOOK.md` | Complete transfer, architecture, command, and file reference. |
| `CMS_USER_GUIDE.md` | Non-technical CMS editing instructions. |
| `how_to_edit.cmd` | Convenience launcher for the local editing stack. |

### Public React Website

| Path | Purpose |
| --- | --- |
| `src\main.jsx` | Starts the public React application. |
| `src\App.jsx` | Public routes and lazy-loaded pages. |
| `src\pages\` | Website page components. |
| `src\components\` | Header, footer, hero, sections, cards, media, and controls. |
| `src\contexts\DataContext.jsx` | Loads live/preview CMS data and refreshes it. |
| `src\data\customCmsClient.js` | Public CMS/API requests and content cache. |
| `src\hooks\` | Reusable data, language, and UI hooks. |
| `src\assets\` | Source-controlled images, video, and local assets imported by React. |
| `src\index.css` | Main public website styling. |
| `src\civic-atlas.css` | Shared visual system and responsive theme styling. |

### React CMS Portal

| Path | Purpose |
| --- | --- |
| `admin\index.html` | Vite entry HTML for the CMS. |
| `admin\src\main.jsx` | Starts the CMS React application. |
| `admin\src\App.jsx` | Login, dashboard, collections, users, permissions, and generic editors. |
| `admin\src\DivisionContentWorkspace.jsx` | Division, facility, academic, About, and people page workspace. |
| `admin\src\FieldInput.jsx` | Standard fields, uploads, and specialized CMS inputs. |
| `admin\src\SectionRichTextEditor.jsx` | Full Tiptap rich-text editor. |
| `admin\src\InlineRichTextEditor.jsx` | Small inline content editor. |
| `admin\src\BlockEditor.jsx` | Flexible page-block editing. |
| `admin\src\ImportedAssetEditor.jsx` | Image, video, PDF, and link management. |
| `admin\src\useLivePreview.js` | Opens and updates one private preview tab. |
| `admin\src\api.js` | Authenticated CMS API client and media URL handling. |
| `admin\src\cmsGroups.js` | Human-friendly CMS collection grouping. |
| `admin\src\styles.css` | Responsive CMS portal design. |

### Express and PostgreSQL

| Path | Purpose |
| --- | --- |
| `server\index.js` | Express API, content routes, preview, uploads, users, and production static serving. |
| `server\config.js` | Reads and validates environment settings. |
| `server\db.js` | PostgreSQL pool and transactions. |
| `server\schema.sql` | CMS tables, indexes, functions, and triggers. |
| `server\setup.js` | First setup and safe schema updates. |
| `server\reset-admin.js` | Controlled administrator username/password reset. |
| `server\auth.js` | Login sessions, cookies, CSRF, and authorization. |
| `server\contentValidation.js` | Cleans and validates saved CMS fields and rich HTML. |
| `server\contentAssembler.js` | Converts published database rows into English/Hindi website data. |
| `server\feedbackMailer.js` | Optional feedback email notification. |
| `server\seed-data.generated.json` | Starter CMS entries for an empty database. |
| `server\uploads\` | Runtime CMS uploads; ignored by Git and transferred privately. |

### Shared Contracts and Scripts

| Path | Purpose |
| --- | --- |
| `shared\cmsCollections.js` | CMS collection names, fields, input types, icons, and rules. |
| `shared\cmsPermissions.js` | Admin/editor permission areas. |
| `shared\passwordPolicy.js` | One password rule shared by CMS and reset scripts. |
| `shared\sectionRichContent.js` | Canonical page-section helpers. |
| `scripts\` | Backup, restore, start, migration, audit, and automated verification scripts. |
| `public\cms-media\` | Committed local media migrated into the project. |
| `public\documents\flood\` | Large Flood PDF archive, transferred privately. |
| `backups\` | Local SQL and safety dump files, ignored by Git. |
| `dist\` | Generated public production build; recreated by `npm run build`. |
| `dist-admin\` | Generated CMS production build; recreated by `npm run build:admin`. |

## 16. Main Libraries

| Area | Libraries |
| --- | --- |
| Public website and CMS | React, React DOM, React Router DOM. |
| Development and build | Vite and the Vite React plugin. |
| Styling | Tailwind CSS plus project CSS files. |
| Animation | Framer Motion; native smooth scrolling is used for page scrolling. |
| Icons | Lucide React and the project CMS icon registry. |
| Rich-text editing | Tiptap Core, React, Starter Kit, and Table extension. |
| API server | Express, Helmet, CORS, compression, cookie-parser, and rate limiting. |
| Database | PostgreSQL through `pg`. |
| Uploads | Multer. |
| Passwords | bcryptjs. |
| Rich HTML safety | sanitize-html. |
| Feedback email | Nodemailer. |
| Local fonts | Inter, Plus Jakarta Sans, and Noto Sans Devanagari Fontsource packages. |
| Code checks | ESLint; JSDOM supports browser-like automated checks. |

## 17. Forgotten CMS Login

Open `.env.local` privately and set:

```env
CMS_ADMIN_USERNAME=your-admin-username
CMS_ADMIN_PASSWORD=YourNewPassword123
```

Then run:

```cmd
cd /d D:\RSAC_custom_cms
npm run cms:reset-admin
```

The command updates the one administrator account, prevents a duplicate
username, activates the account, and closes old sessions. Do not run database
restore merely to recover a login.

## 18. Commands and Actions to Avoid

- Do not run restore without a fresh backup of the destination database.
- Do not set `CMS_FORCE_SEED=true` on a populated CMS.
- Do not expect an `.env.local` password edit to change PostgreSQL without
  `npm run cms:reset-admin`.
- Do not commit `.env.local`, backups, uploads, Flood PDFs, or passwords.
- Do not delete uploads while their URLs still exist in PostgreSQL.
- Do not copy `node_modules` between computers.
- Do not run migration/repair commands randomly.
- Do not use `git reset --hard` to solve a pull conflict.
- Do not start duplicate services on ports 3000, 5173, or 5174.

## 19. Troubleshooting

### Login Fails After Restore

The restored database also restores its CMS user records. Put the intended
administrator values in `.env.local`, then run `npm run cms:reset-admin`.

### Text or Visibility Is Old

Save the CMS entry, confirm it is `Published`, and check API health. The live
website refreshes through the content event/version system. Private preview
updates unsaved changes automatically after it has been opened once.

### Image, PDF, or Video Is Missing

Check whether its URL begins with `/uploads/` or `/documents/flood/`, then check
that the matching file exists in `server\uploads` or
`public\documents\flood` on that computer.

### A Direct Page Route Fails in Production

Run `npm run build:all` and start with `npm start`. Express supplies route
fallbacks for both React applications.

### A Port Is Already in Use

Stop the older website/CMS/API process before running `npm run dev:all`. The
stack launcher deliberately refuses a partly occupied set of ports.

## 20. Final Handover Checklist

- `git status` was reviewed before commit and push.
- `npm run cms:backup` created a valid new SQL file.
- Matching `server\uploads` and Flood PDFs were transferred privately.
- `.env.local` values were transferred privately, not committed.
- `npm ci --include=dev` completed on the destination.
- Fresh destination: `cms:setup` and then `cms:restore` completed.
- Existing destination: the correct scenario in Section 5 was followed.
- `npm run cms:verify-all` passed.
- `npm run build:all` passed.
- Website, CMS, API health, login, one image, one PDF, English/Hindi, preview,
  and feedback were manually checked.
