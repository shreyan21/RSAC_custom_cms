# Transfer and Backup Guide

**One job:** whenever content changes, copy the same three things to the other
machine so both stay identical — the **database dump**, the **uploads folder**,
and (only if it changed) the **`.env`** file. Everything else (React code) moves
through git.

This is the only file you need for moving data between machines or making a
backup. For live-server / Nginx setup, see `DEPLOYMENT_NGINX.md`.

---

## What to move after every change

| # | Item | Where it is | Why |
|---|------|-------------|-----|
| 1 | **PostgreSQL dump** (`.sql`) | made with `pg_dump` (below) | All CMS text, pages, notices, settings |
| 2 | **Uploads folder** | `backend/directus/uploads/` | The actual images / PDFs / videos. **Not** inside the dump — only file *records* are. Miss this and images 404. |
| 3 | **`.env`** (only if changed) | `backend/directus/.env` | DB credentials, keys. Never commit it. |
| 4 | **Code** | the git repo | Move with `git pull` / `git push`, not by copying |

> The database dump stores only file **records**. The real files live on disk in
> `backend/directus/uploads/`. **Always copy that folder together with the dump.**

---

## Step 0 — Make the dump on the machine that has the new content

Always use the **one** file name `backup_file.sql` and overwrite it each time,
so there is never confusion about which dump is current (no `backup_file (1).sql`
copies piling up):

```powershell
$env:PGPASSWORD='<postgres password>'
pg_dump -U postgres -h localhost -d rsac_cms -f "$env:USERPROFILE\Downloads\backup_file.sql"
```

- `pg_dump` / `psql` live in `C:\Program Files\PostgreSQL\<version>\bin` — add it
  to PATH if the command is not found.
- Then copy `backup_file.sql` **and** `backend/directus/uploads/` to the other
  machine (USB, network share, cloud).

---

## Step 1 — On the other machine, back up what you are about to replace

Always keep a copy first, so a bad restore is reversible (this **is** dated — it
is a safety copy, not the transfer file):

```powershell
$env:PGPASSWORD='<postgres password>'
pg_dump -U postgres -h localhost -d rsac_cms -f "D:\rsac_website\backups\rsac_cms-pre-restore-YYYY-MM-DD.sql"
```

## Step 2 — Stop Directus

PostgreSQL cannot drop a database with open connections. Stop `npm run dev`
(Ctrl+C), or:

```powershell
Stop-Process -Name node -Force
```

## Step 3 — Drop and recreate an empty database

The dump is a plain restore (no `DROP`/`CREATE DATABASE` inside), so it needs an
empty database:

```powershell
$env:PGPASSWORD='<postgres password>'
psql -U postgres -h localhost -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='rsac_cms' AND pid <> pg_backend_pid();"
psql -U postgres -h localhost -c "DROP DATABASE rsac_cms;"
psql -U postgres -h localhost -c "CREATE DATABASE rsac_cms OWNER rsac_directus;"
```

> The dump sets table owners to `rsac_directus`. That role already exists on this
> project's machines. On a brand-new machine, create it first:
> `psql -U postgres -c "CREATE ROLE rsac_directus LOGIN PASSWORD '<pw>';"`

## Step 4 — Restore the dump

```powershell
psql -U postgres -h localhost -d rsac_cms -f "$env:USERPROFILE\Downloads\backup_file.sql"
```

Watch for lines starting with `ERROR` — a clean restore prints none (`NOTICE`
lines are fine). A ~100 MB dump takes a minute or two.

> **If the restore errors with `\restrict`, `\unrestrict`, or `unrecognized
> configuration parameter "transaction_timeout"`**, the dump was made on a
> **newer** PostgreSQL than this machine's server (for example a PostgreSQL 18
> dump loaded into a PostgreSQL 12 server). Strip those three lines first, then
> restore the cleaned file. In Git Bash:
>
> ```bash
> sed -E '/^[\]restrict /d; /^[\]unrestrict /d; /^SET transaction_timeout /d' \
>     "$USERPROFILE/Downloads/backup_file.sql" > "$USERPROFILE/Downloads/backup_file.clean.sql"
> psql -U postgres -h localhost -d rsac_cms -v ON_ERROR_STOP=1 -f "$USERPROFILE/Downloads/backup_file.clean.sql"
> ```
>
> Best avoided by keeping **both machines on the same PostgreSQL major version** —
> a dump only loads into an equal or newer server, never an older one.

## Step 5 — Copy the uploads folder

Overwrite this machine's `backend/directus/uploads/` with the copied one, so
every image/PDF record in the database has its file on disk.

## Step 6 — Restart and verify

```powershell
cd D:\rsac_website
npm run dev
```

Check:

```powershell
psql -U postgres -h localhost -d rsac_cms -t -c "SELECT count(*) FROM rsac_pages;"
```

- Directus admin at <http://localhost:8055> logs in and shows the pages.
- Website at <http://localhost:5173> renders content (hard refresh Ctrl+Shift+R).

## If something goes wrong

Restore the **pre-restore** backup from Step 1 the same way (Steps 2–6) using the
file in `D:\rsac_website\backups\`.

---

## After a `git pull` — rebuild the per-machine pieces

Some things do **not** travel through git and must be rebuilt on each machine.
Do this every time you pull.

**Always (any pull):**

```powershell
git pull
npm install                             # root packages (node_modules is not in git)
npm install --prefix backend/directus   # Directus packages (only if they changed)
```

On a brand-new machine also create the two secret env files from their templates
and fill in the local values (they are never committed):

```powershell
Copy-Item .env.example .env.local
Copy-Item backend\directus\.env.example backend\directus\.env
```

**Only if you also brought a new `backup_file.sql`:** restore the database first
using Steps 1–4 above.

**After a database restore, or on a new machine — re-apply the CMS editor setup.**
The friendly Directus forms, the website-tab grouping, the interface labels and
the "add item / no separator rows" behaviour are configured by scripts and stored
in the local database, so they must be re-applied after the DB is replaced:

```powershell
npm run cms:configure               # folders, groups, field labels/notes, roles, branding
node scripts/cms-nest-exact.mjs     # group page text into the exact website tabs (+ Hindi labels)
npm run cms:seed                    # interface labels + "Photos on This Page" rows
npm run cms:validate                # read-only check; ends "Validated 23 collections ..."
```

All four are idempotent and preserve edited text — safe to run repeatedly.

**Rebuild media that is not in git** (skip if you copied `uploads/` and the media
folders across, but these are always safe to run):

```powershell
node scripts/flood-archive.mjs      # download every flood-report PDF (public/documents/flood, ~1.4 GB)
npm run media:localize              # mirror any missing official images/PDFs referenced by content
```

Both are resumable — they only fetch files that are missing. Without the flood
step, flood-report links open blank.

**Start everything:**

```powershell
npm run cms:start   # Directus  → http://localhost:8055/admin
npm run dev         # website   → http://localhost:5173
```

Hard-reload the browser (Ctrl+Shift+R) so it drops any old cached bundle.

### Quick reference

| Situation | What to run |
|---|---|
| Code-only pull | pull + `npm install` → CMS scripts (if forms look off) → start |
| Pull with a new `backup_file.sql` | pull + `npm install` → **restore DB (Steps 1–4)** → CMS scripts → media → start |
| Brand-new machine | pull + `npm install` + env files → restore DB → CMS scripts → media → start |

---

## Fallback vs backup (do not confuse them)

- **Backup** = a full restore point (the `.sql` dump + `uploads/`). Used to move
  or recover the whole site.
- **Fallback** = the built-in safe copies in `src/data`. Shown automatically only
  when Directus is off, a record is missing, media is missing, or a Hindi field
  is empty. Editing a fallback file does **not** change live content — real edits
  belong in Directus.

---

## हिन्दी

**एक ही काम:** जब भी content बदले, दूसरी machine पर यही तीन चीज़ें copy करें ताकि
दोनों एक जैसी रहें — **database dump**, **uploads folder**, और (बदला हो तभी)
**`.env`**। बाकी (React code) git से जाता है।

Data move करने या backup बनाने के लिए बस यही file काफी है। Live server / Nginx के
लिए `DEPLOYMENT_NGINX.md` देखें।

### हर बदलाव के बाद क्या move करें
1. **PostgreSQL dump** (`.sql`) — नीचे दिए `pg_dump` से बनता है। सारा CMS text।
2. **Uploads folder** — `backend/directus/uploads/`। असली images/PDF/video।
   dump में सिर्फ file *record* होते हैं, files नहीं — इसे साथ copy न करने पर
   images 404 दिखेंगी।
3. **`.env`** (बदला हो तभी) — `backend/directus/.env`। कभी commit न करें।
4. **Code** — git से (`git pull` / `git push`), copy से नहीं।

### pg_dump command (नई content वाली machine पर)
```powershell
$env:PGPASSWORD='<postgres password>'
pg_dump -U postgres -h localhost -d rsac_cms -f "D:\rsac_website\backups\rsac_cms-YYYY-MM-DD.sql"
```
फिर `.sql` file **और** `backend/directus/uploads/` दोनों दूसरी machine पर copy करें।

### दूसरी machine पर restore (क्रम से)
1. पहले current DB का backup लें (ऊपर वाला `pg_dump`, नाम में `pre-restore`)।
2. Directus बंद करें: `Stop-Process -Name node -Force`।
3. खाली DB बनाएं: ऊपर Step 3 के तीन `psql` commands चलाएं।
4. dump restore करें: Step 4 का `psql ... -f backup_file.sql`।
   - अगर `\restrict` / `transaction_timeout` जैसी error आए, तो dump नई PostgreSQL
     से बना है — ऊपर Step 4 वाला `sed` से तीन lines हटाकर restore करें।
5. `backend/directus/uploads/` folder overwrite करें।
6. `npm run dev` चलाएं, admin (8055) और website (5173) जाँचें।
7. गड़बड़ी हो तो Step 1 वाला pre-restore backup वापस restore करें।

### हर `git pull` के बाद (per-machine rebuild)
git से जो नहीं आता, उसे हर machine पर फिर बनाना पड़ता है:
1. `git pull` फिर `npm install` (ज़रूरत हो तो `npm install --prefix backend/directus`)।
2. नई machine पर `.env.local` और `backend/directus/.env` templates से बनाएं।
3. **DB restore के बाद** CMS editor setup फिर लगाएं:
   `npm run cms:configure` → `node scripts/cms-nest-exact.mjs` → `npm run cms:seed`
   → `npm run cms:validate` (चारों बार-बार चलाना safe, text बचा रहता है)।
4. git में न रहने वाली media बनाएं: `node scripts/flood-archive.mjs` (flood PDF)
   और `npm run media:localize`।
5. चलाएं: `npm run cms:start` और `npm run dev`, फिर Ctrl+Shift+R।

### Fallback और backup अलग हैं
- **Backup** = पूरा restore point (`.sql` dump + `uploads/`)। पूरी site move/recover के लिए।
- **Fallback** = `src/data` की built-in safe copy। सिर्फ तब दिखती है जब Directus बंद हो,
  record missing हो, media missing हो, या Hindi field खाली हो। Fallback file बदलने से
  live content नहीं बदलता — असली बदलाव Directus में करें।
