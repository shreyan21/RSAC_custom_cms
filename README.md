# RSAC-UP Website: Structure and Libraries

This file explains what the project contains, which folders belong to the
frontend and backend, where media is stored, and which libraries are used.

The project has exactly three Markdown guides:

1. `README.md`: project structure, files, media, architecture, and libraries.
2. `PROJECT_TRANSFER_GUIDE.md`: moving or updating the project on another computer.
3. `CMS_USER_GUIDE.md`: editing the website through the CMS without coding.

## Project at a Glance

The repository contains three applications that share one `package.json`, one
`package-lock.json`, one `node_modules` folder, and one PostgreSQL database.

```text
Public browser
  |-- Public React website      development: http://localhost:5173
  |-- React CMS portal          development: http://localhost:5174
  `-- Express API               development: http://localhost:3000
         |-- PostgreSQL database: rsac_custom_cms
         `-- Runtime uploads: server\uploads
```

Using one `node_modules` folder is intentional. Both React applications and the
Express server use dependencies from the same root `package.json`.

## Frontend, Backend, and Database

| Part | Main location | What it does |
| --- | --- | --- |
| Public frontend | `src\` | React website seen by visitors. |
| CMS frontend | `admin\` | React content-management portal used by editors. |
| Backend | `server\` | Express API, login, permissions, preview, uploads, and production hosting. |
| Database | PostgreSQL | Stores CMS text, English/Hindi data, order, visibility, users, feedback, and media URLs. |
| Shared rules | `shared\` | Collection fields, permissions, password rules, and rich-content contracts used by multiple parts. |
| Maintenance | `scripts\` | Start, backup, restore, migration, audit, and test commands. |

## Public React Website

| Path | Purpose |
| --- | --- |
| `index.html` | HTML entry used by Vite for the public website. |
| `src\main.jsx` | Starts the public React application. |
| `src\App.jsx` | Defines public routes and loads pages. |
| `src\pages\` | Complete website pages such as Divisions, Facilities, Floods, Policies, and People. |
| `src\components\` | Header, footer, hero, cards, homepage sections, media, and accessibility controls. |
| `src\contexts\DataContext.jsx` | Loads CMS data and refreshes live or private-preview content. |
| `src\data\customCmsClient.js` | Calls the Express content API. |
| `src\hooks\` | Reusable language, data, and interface hooks. |
| `src\assets\` | Images, videos, and fonts imported directly by React source. |
| `src\index.css` | Main public website styling. |
| `src\civic-atlas.css` | Shared responsive design, page surfaces, dark mode, and component styling. |
| `vite.config.js` | Public website development and production-build settings. |

## React CMS Portal

| Path | Purpose |
| --- | --- |
| `admin\index.html` | HTML entry used by Vite for the CMS. |
| `admin\src\main.jsx` | Starts the CMS React application. |
| `admin\src\App.jsx` | Login, dashboard, collections, generic editors, users, and permissions. |
| `admin\src\DivisionContentWorkspace.jsx` | Focused editors for Divisions, Facilities, About, Academics, and People pages. |
| `admin\src\FieldInput.jsx` | Standard text, select, upload, document, and special CMS fields. |
| `admin\src\SectionRichTextEditor.jsx` | Full rich-text editor for headings, lists, links, tables, quotes, and text formatting. |
| `admin\src\BlockEditor.jsx` | Flexible page blocks. |
| `admin\src\ImportedAssetEditor.jsx` | Images, videos, PDFs, and links inside page sections. |
| `admin\src\useLivePreview.js` | Opens one private website preview and refreshes unsaved edits. |
| `admin\src\api.js` | Authenticated CMS API requests and upload preview URLs. |
| `admin\src\cmsGroups.js` | Organises CMS collections into understandable groups. |
| `admin\src\styles.css` | Responsive CMS appearance. |
| `vite.admin.config.js` | CMS development and production-build settings. |

## Express Backend and PostgreSQL

| Path | Purpose |
| --- | --- |
| `server\index.js` | Express routes, content delivery, preview, uploads, feedback, users, and production static hosting. |
| `server\config.js` | Reads and validates `.env.local`. |
| `server\db.js` | PostgreSQL connection pool and transactions. |
| `server\schema.sql` | Tables, indexes, functions, and triggers. It is structure, not current CMS content. |
| `server\setup.js` | Creates or updates the database structure and initial administrator. |
| `server\reset-admin.js` | Applies administrator credentials from `.env.local`. |
| `server\auth.js` | Login sessions, cookies, CSRF protection, and authorisation. |
| `server\contentValidation.js` | Validates fields and cleans saved rich text. |
| `server\contentAssembler.js` | Converts published database rows into English or Hindi website data. |
| `server\feedbackMailer.js` | Sends optional feedback email notifications. |
| `server\seed-data.generated.json` | Starter CMS data used only when setup finds an empty content table. |

## Shared Rules and Scripts

| Path | Purpose |
| --- | --- |
| `shared\cmsCollections.js` | Defines CMS collections, fields, controls, icons, and validation options. |
| `shared\cmsPermissions.js` | Defines what administrators and editors may access. |
| `shared\passwordPolicy.js` | One password policy used by the CMS and reset command. |
| `shared\sectionRichContent.js` | Shared page-section content rules. |
| `scripts\start-custom-stack.mjs` | Starts website, CMS, and API together for local development. |
| `scripts\backup-custom-cms.mjs` | Creates a validated PostgreSQL SQL backup. |
| `scripts\restore-custom-cms-backup.mjs` | Safely restores a selected full SQL backup. |
| `scripts\cms-verify-all.mjs` | Runs the maintained full CMS test suite. |
| `scripts\` | Also contains focused audits, migrations, repairs, and smoke tests. |

## Where Media Goes

Media can be stored in several places. They are not interchangeable.

| Location | What belongs there | Is it in Git? | Must be copied separately? |
| --- | --- | --- | --- |
| `src\assets\` | Images/videos imported by React source. | Yes | No |
| `public\cms-media\` | Approved local media migrated into the project. | Yes | No |
| `public\official-media\` | Local copies of official/legacy website media. | Yes, except ignored large files | Check `git status` |
| `server\uploads\` | Files uploaded later through the CMS. | No | Yes |
| `public\documents\flood\` | Large Flood report PDF archive. | No | Yes |
| PostgreSQL | Media URL, caption, alt text, type, order, and ownership. | No | Included in database backup |
| `backups\` | Local database `.sql` and restore-safety `.dump` files. | No | Yes, when handing over current content |

Important: PostgreSQL stores the URL and description of an uploaded file, not
the file bytes. A complete transfer must keep the database backup and
`server\uploads` together. Flood database records and
`public\documents\flood` must also stay together.

## Generated and Private Files

| Path | Meaning |
| --- | --- |
| `.env.example` | Safe example of required settings. It contains no real secrets. |
| `.env.local` | Real database, CMS, URL, and email settings for one computer. Never commit it. |
| `node_modules\` | Installed packages. Recreate with `npm ci`; never transfer or commit it. |
| `dist\` | Generated production build of the public React website. |
| `dist-admin\` | Generated production build of the React CMS. |
| `output\`, `.tmp-*`, and `*.log` | Generated reports or temporary files. Do not commit them. |

Use `git ls-files` to see exactly what Git will transfer. Use `git status` before
every commit.

## How Content Reaches the Website

```text
CMS editor
  -> Express authentication and validation
  -> PostgreSQL
  -> content version update
  -> public React website refresh
```

Private preview is separate:

```text
Unsaved CMS edit
  -> temporary Express preview token
  -> one private website tab
  -> automatic refresh while editing
```

Draft and archived items are removed from preview because they will be hidden
from the public website. Published edits appear in preview.

## Development and Production

Local development uses three processes:

```cmd
npm run dev:all
```

- Website: `http://localhost:5173`
- CMS: `http://localhost:5174`
- API health: `http://localhost:3000/api/health`

Production first builds both React applications, then one Express process serves
the website, CMS, API, and uploads:

```cmd
npm ci --include=dev
npm run build:all
npm start
```

- Website: `/`
- CMS: `/cms/`
- API: `/api/`
- Uploads: `/uploads/`

## Main Libraries

| Area | Libraries | Use |
| --- | --- | --- |
| React applications | React, React DOM | Public website and CMS interface. |
| Routing | React Router DOM | Opens website pages without a full browser reload. |
| Development/build | Vite, Vite React plugin | Development servers and production bundles. |
| Styling | Tailwind CSS and project CSS | Responsive website and CMS design. |
| Motion | Framer Motion | Controlled animations and transitions. |
| Icons | Lucide React | Website and CMS icons. |
| Rich-text editing | Tiptap Core, Tiptap React, Starter Kit, Table | CMS formatting and tables. |
| API | Express | HTTP API and production server. |
| Database | `pg` | PostgreSQL queries and transactions. |
| Uploads | Multer | Receives images, videos, PDFs, and documents. |
| Passwords | bcryptjs | Password hashing. |
| HTML safety | sanitize-html | Cleans rich text before storage and display. |
| Security | Helmet, CORS, express-rate-limit, cookie-parser | Headers, origins, request limits, and login cookies. |
| Responses | compression | Compresses API and served responses. |
| Environment | dotenv | Loads `.env.local`. |
| Feedback email | Nodemailer | Optional feedback email delivery. |
| Local fonts | Fontsource Inter, Plus Jakarta Sans, Noto Sans Devanagari | Bundled English and Hindi fonts. |
| Code checks | ESLint, React Hooks plugin, JSDOM | Static checks and browser-like test support. |

`lenis` is installed but current page scrolling uses native browser scrolling.

## Main Verification Commands

```cmd
npm run lint
npm run build:all
npm run cms:verify-all
npm run smoke:production
```

See `PROJECT_TRANSFER_GUIDE.md` before moving or updating the project. See
`CMS_USER_GUIDE.md` for content editing.
