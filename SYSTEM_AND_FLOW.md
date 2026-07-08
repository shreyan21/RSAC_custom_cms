# RSAC-UP Website — How the System Works (Plain English)

This file explains **how the whole website works**: what the pieces are, what
happens when someone clicks, where the data comes from, and **what you run every
day**. No deep tech knowledge needed.

For *editing content* (text, photos, notices, people), see **`EDITING_GUIDE.md`**.

---

## 1. The three pieces

| Piece | What it is | Who touches it |
|-------|------------|----------------|
| **Website (frontend)** | What the public sees. Built with React + Vite. | Visitors |
| **CMS (Directus)** | Admin panel where staff edit content. Opens in a browser at `http://localhost:8055/admin`. | Content editor |
| **Database (PostgreSQL)** | Where the CMS stores everything. | Nobody by hand |

> The website **shows** content. The CMS is where you **change** content. The
> database just **stores** it. You never open the database directly.

---

## 2. The picture (how data travels)

```text
Visitor's browser
      │  opens the website
      ▼
React pages  ──read content through──►  DataProvider (one shared "content box")
                                              │
                          ┌───────────────────┴───────────────────┐
                          │                                        │
                  CMS is ON                                 CMS is OFF
            (VITE_CMS_ENABLED=true)                  (VITE_CMS_ENABLED=false)
                          │                                        │
                          ▼                                        ▼
                  Directus REST API                        Built-in backup
                  /items/{collection}                      files in src/data/
                  /assets/{file}                           (ship with the code)
                          │
                          ▼
                  PostgreSQL (records)
                  uploads/ folder (the actual photos, PDFs, videos)
```

Key boundaries:

- The browser **never** talks to PostgreSQL. It only talks to Directus over the
  web (REST API). There is **no other custom server**.
- Uploaded files (photos, PDFs, hero video) live in
  `backend/directus/uploads/`. PostgreSQL only remembers their names and links.

---

## 3. Two sources of content: CMS vs backup (important)

The site can read content from **two** places. One switch decides which:

File: `.env.local` (in the project root)

```
VITE_CMS_ENABLED=true     # true  = live content from Directus CMS
                          # false = built-in backup files in src/data/
VITE_CMS_URL=http://localhost:8055
```

- **`true`** → content comes from **Directus**. Edit in the admin panel.
- **`false`** → content comes from **backup files** in `src/data/`. Editing then
  needs a developer (code change).

**Why a backup exists:** if the CMS is ever down, the website still loads (it
falls back to the built-in copy) instead of going blank.

**Fallback is per-section.** If the CMS is on but (say) only the *notices*
request fails, the site shows CMS data everywhere else and backup data for
notices. This is why the site can look slightly different with the CMS on vs off
— the two copies are **not** automatically kept in sync.

> Rule of thumb: **Directus is the real, daily source.** `src/data/` is only the
> emergency backup. They do not update each other automatically.

### 3a. With the CMS ON, what shows first — Directus or the backup?

Short answer: **the built-in backup paints first, Directus replaces it as soon
as it answers.**

What happens on a page load, step by step:

1. The website starts and immediately fills the screen with the **built-in
   backup copy** from `src/data/` (so you never stare at a blank page).
2. At the same time it asks Directus for the real content
   (`/items/...` requests).
3. When Directus answers — usually within a second or two — the **CMS content
   replaces the backup on screen**. Whatever you typed in Directus wins.
4. Some heavy inner pages (the Website Pages grids) show a short loading state
   instead, and appear directly with CMS content.

The site is patient on purpose: it waits up to 20 seconds for a slow Directus
(60 seconds for the big Website Pages request) rather than giving up early —
giving up early would silently show the backup and hide the editor's changes.

All the scenarios in one place (with `VITE_CMS_ENABLED=true`):

| Scenario | What the visitor sees |
|----------|----------------------|
| Directus running, record Published | **Directus content** (backup may flash for a moment on first load) |
| Directus completely off / unreachable | **Backup files** from `src/data/` — whole site still works |
| Directus running, but one request fails (e.g. notices) | CMS content everywhere else, **backup only for that section** |
| Record exists but one box is empty | That one line falls back — the backup value (or English) fills the gap |
| Record set to Draft/Archived | Treated as "not in CMS" → backup version of that item |

There is **never a blank page**. Something always renders.

### 3b. Hindi mode (हिं) — where Hindi words come from

Order of preference for every piece of text, when the CMS is on:

1. **Hindi box filled in Directus** (e.g. *Hindi Title*) → that text shows. ✅
2. **Hindi box empty, English box filled in Directus** → the site shows the
   **Directus English text** for that line (common official words like
   department names are still auto-swapped from a built-in Hindi term list —
   this is a fixed dictionary, not machine translation).
3. **Directus off, or the whole section missing from the CMS** → the site shows
   the **built-in Hindi backup** from `src/data/` (files like
   `hindiContent.js`, `rsacOfficialContent.hi.generated.js`,
   `policies.hi.generated.js`).

So yes — if Hindi content is unavailable in Directus, a fallback shows, but
note the difference: an **empty Hindi box** falls back to the *Directus
English* text (rule 2), while a **missing/failed CMS section** falls back to
the *built-in Hindi files* (rule 3). Either way the page is never blank.

The full list of backup file locations is in section 7 below.

---

## 4. What happens when you click something

1. Page first loads → the website fills its **DataProvider** box once (from CMS
   if on, else from backup).
2. You **click a menu item or card** → React Router swaps the page **instantly**
   in the browser. Usually **no new server call** — the content is already in the
   box.
3. You **open a PDF / see a photo / play the hero video** → *that file* is
   fetched from Directus `/assets/...` (or from `public/` for built-in images).
4. You **switch हिं | EN** → only the words change; layout stays. Hindi comes
   from the item's normal `... Hi` field, with legacy translations and the
   built-in Hindi dictionaries retained only as compatibility fallbacks.
5. The visit counter quietly records the visit.

So most clicks are **fast page swaps**, not fresh downloads. Heavy things (PDFs,
video) load only when needed.

---

## 5. What you run EVERY time you start the laptop

**Short answer: just one command.**

```powershell
npm run dev
```

`npm run dev` is smart: when `.env.local` points at the local CMS, it **starts
(or reuses) the local Directus automatically**, waits until it is healthy, then
starts the website. Open the address it prints (usually `http://localhost:5173`).

You do **NOT** run `cms:preflight` or `cms:setup` every day. Those are special:

| Command | When to run it |
|---------|----------------|
| `npm run dev` | **Every day.** Starts website + local CMS together. |
| `npm run cms:start` | Only if you want the Directus admin **alone** (no website). |
| `npm run cms:preflight` | **One-time / when something is broken.** Checks Node, PostgreSQL, config. |
| `npm run cms:setup` | **One-time / recovery.** Builds the database tables, admin user, loads starting content. Running it is heavy — not for daily use. |
| `npm run cms:upgrade` | After pulling code that adds CMS collections/fields. Backs up first, preserves existing records, adds missing GUI forms/content, validates. Directus must be running. |
| `npm run cms:validate` | Health check after changes. Safe. |
| `npm run build` | Make the production version (the `dist/` folder). |

> Daily life = `npm run dev`, then edit in the browser. That's it.

---

## 6. First-time setup (one person, once)

Done already if the CMS is running. Otherwise, the technical person needs:

- **Node.js 22+**, **PostgreSQL 14+** installed.
1. Create PostgreSQL database `rsac_cms` and user `rsac_directus`.
2. Copy `backend/directus/.env.example` → `backend/directus/.env`, fill in
   `DB_PASSWORD`, `KEY`, `SECRET`, and `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   (this admin email/password is the **CMS login**).
3. From the project root:
   ```powershell
   npm install
   npm run cms:setup     # builds tables + admin + loads starting content
   npm run dev           # daily command from now on
   ```
`cms:setup` also writes `VITE_CMS_ENABLED=true` into `.env.local` for you.

If company server receives complete PostgreSQL and uploads backups, restore
those backups instead. Do **not** run `cms:setup` after a complete restore;
database already contains Directus tables, users, settings, and website data.

Pulling code from GitHub never changes PostgreSQL by itself. For an existing
database, run `npm run cms:upgrade` only when the new release adds CMS schema.
It creates a backup first and never force-seeds existing editor records.

---

## 7. Where the backup files live (CMS-off content)

If `VITE_CMS_ENABLED=false`, the site reads these (developer edits only):

| Content | Backup file |
|---------|-------------|
| Home page, hero, footer, settings | `src/data/siteSettings.js` |
| Contact, divisions, facilities | `src/data/siteContent.js` |
| Leaders, scientists, technical, admin, manpower | `src/data/people.js` |
| Former scientists | `src/data/formerProfiles.js` |
| Notices / Flood / Geoportals / Menu / Policies / Public info | the matching `src/data/*.js` |
| Quick links / Mobile apps / Gallery | `src/data/quickLinks.js`, `src/data/mobileApps.js`, `src/data/gallery.js` |
| Hindi text | `src/data/hindiContent.js` + `src/data/translations.js` |

---

## 8. Backups (do not skip)

The database and the uploaded files **must be backed up together, from the same
moment**:

1. PostgreSQL dump of `rsac_cms` (use `pg_dump`).
2. A copy of `backend/directus/uploads/`.

If you restore one without the other: records point to missing files, or files
exist with no records. Always keep the two as a pair. Test a restore, not just
the backup.

---

## 9. Moving to another computer (identical `rsac_cms` database)

To make a second machine's CMS contain **exactly the same data** as this one,
carry these **four things**. Nothing else is needed for the data.

| # | What | Why |
|---|------|-----|
| 1 | A **fresh database dump** of `rsac_cms` | Every record, every edit, admin user, all Directus settings |
| 2 | The whole **`backend/directus/uploads/`** folder | The actual photos, PDFs, videos — the database only stores their names |
| 3 | **`backend/directus/.env`** | DB password, admin login, and the `KEY`/`SECRET` values — tokens and sessions break if `KEY`/`SECRET` differ |
| 4 | **`.env.local`** (project root) | The `VITE_CMS_ENABLED=true` switch and CMS URL |

Files 3 and 4 contain secrets, so they are **not** in Git — copying the code
alone never carries them. The code itself moves via Git (or a folder copy).

**On this machine — make the dump** (PowerShell, project root):

```powershell
pg_dump -U rsac_directus -d rsac_cms -F c -f rsac_cms_full.backup
```

(It will ask for the database password from `backend/directus/.env`.
The `backups\` folder also holds automatic dumps made by `cms:upgrade`, but
make a fresh one so nothing edited since is missed.)

**On the new machine — restore, in this order:**

1. Install Node.js 22+ and PostgreSQL, create the empty database and user
   (section 6, step 1).
2. Copy the project code, then `npm install`.
3. Copy `backend/directus/.env` and `.env.local` into place.
4. Copy the `uploads/` folder to `backend/directus/uploads/`.
5. Restore the dump:
   ```powershell
   pg_restore -U rsac_directus -d rsac_cms rsac_cms_full.backup
   ```
6. `npm run dev` — same website, same CMS content, same admin login.

**Do NOT run `npm run cms:setup` after a restore** — the database already
contains everything; setup is only for building a brand-new empty CMS. Dump and
`uploads/` must be taken **at the same time** (section 8) or records and files
will not match.

---

## 10. Production note (how to tell where live data comes from)

A live site working does **not** prove a database is on the same server. To see
the real source on the live site:

1. Open the browser **Developer Tools → Network**, reload the page.
2. Look for requests to `/items/` and `/assets/` → that is the live Directus.
3. No such requests → the live site is running on **built-in backup** only.

Production needs HTTPS, a private database (not public), strong secrets, named
editor accounts, and tested backups. Never put admin passwords or DB passwords
in any `VITE_*` value — those are public.

For complete Nginx, PostgreSQL, systemd, restore, and deployment commands, see
**`DEPLOYMENT_NGINX.md`**.

---

## 11. Quick troubleshooting

| Problem | Check |
|---------|-------|
| Edit not showing | Item **Status = Published**? Did you **Save**? Hard-refresh `Ctrl+F5`. |
| Whole site looks "old" / different | CMS may be **off** (`VITE_CMS_ENABLED=false`) or Directus not running. |
| Website blank | `npm run lint` then `npm run build` to find the error (CMS being down should *not* blank it). |
| Directus won't start | `npm run cms:preflight`, then check port 8055 + PostgreSQL running. |
| Hindi shows English | The matching `... Hi` field is empty — see `EDITING_GUIDE.md`. |

---

**In one line:** start with `npm run dev`, edit content in the Directus browser
panel, set items to **Published**, **Save** — the website updates itself.

---

## 12. Project structure and data ownership

The website reads content in this order: **Directus** reads records from
**PostgreSQL** → React requests them through the Directus API → if Directus is
unavailable, React uses the bundled files in `src/data` as a temporary fallback.
Editing a fallback file does **not** update Directus; normal changes belong in
Directus at `http://localhost:8055/admin`.

### Main directories

| Directory | What it contains | Who changes it |
|---|---|---|
| `src` | React website source code | Developer |
| `src/components` | Reusable UI (header, hero, cards, sections) | Developer |
| `src/pages` | Page layouts and route-level screens | Developer |
| `src/data` | Bundled fallback content + Directus API adapters | Developer |
| `src/assets` | Images/videos bundled into the build | Developer |
| `src/contexts` | Loads CMS data and shares it with React | Developer |
| `public` | Local PDFs, official media, chart images served unchanged | Developer/deploy |
| `backend/directus` | Local Directus app, schema, settings, uploads | CMS/deploy team |
| `backend/directus/uploads` | Physical files uploaded through Directus | Directus-managed; do not hand-edit |
| `backend/directus/extensions` | Custom Directus server extensions | Developer |
| `scripts` | Setup, migration, validation, media, CMS maintenance | Developer/admin |
| `backups` | PostgreSQL `.sql` safety backups | Administrator |
| `dist` / `node_modules` | Generated build / installed packages | Generated; do not edit |

### Which data is the real current data

| Data | Main source | Fallback / backup |
|---|---|---|
| Text, Hindi text, people, menus, notices | PostgreSQL via Directus | `src/data` |
| Photos/PDFs uploaded in Directus | `backend/directus/uploads` + PostgreSQL file records | Matching uploads backup |
| Old official PDFs kept locally | `public/documents`, `public/official-media` | Git — **except** `public/documents/flood` (~1.4 GB, not in git; rebuild with `node scripts/flood-archive.mjs`) |
| Page layout / responsive design | React files in `src` | No CMS fallback; developer-owned |

The database and `backend/directus/uploads` must be backed up **together** — a SQL
backup holds file *records*, not the physical files.

### Key files inside `src/data`

| File | Purpose |
|---|---|
| `cmsService.js` | Requests each content type from Directus; picks fallback when needed |
| `directusClient.js` | Low-level Directus API requests |
| `directusAdapter.js` | Converts Directus records into the shape React pages use |
| `cmsConfig.js` | Reads the frontend CMS URL and collection names |
| `defaultData.js` | Central export for bundled fallback data |
| `siteSettings.js` | Fallback branding, homepage, navigation, shared text |
| `hindiContent.js` | Fallback Hindi content for shared UI and lists |
| `translations.js` | Short English→Hindi interface labels |
| `*.generated.js` | Generated fallback snapshots — do not hand-edit |
| `pageTextFields.js` | Inserts Directus plain-text values into locked page layouts |

### Where to edit common items

| Change | Directus location |
|---|---|
| Modi / Yogi homepage photo | Homepage → **Homepage Leaders** → Prime/Chief Minister Portrait |
| Inner-page English/Hindi text | Pages and Navigation → **Website Pages** → labelled page-text rows |
| Photo inside an inner page (incl. Map/Photos tabs) | **Website Pages** → **Photos on This Page** |
| Scientist/staff details | People and Organisation → **People Profiles** |
| Org-chart name/photo/designation | People and Organisation → **Organisation Chart** |
| Notice / flood PDF | Public Information → matching collection → **PDF Document** |
| Header logo | Homepage → **Header Logos** |
| Button/label wording used anywhere | Homepage → **Website Text Editor** → Interface Labels rows |

For step-by-step editing and common mistakes, read `EDITING_GUIDE.md`.
