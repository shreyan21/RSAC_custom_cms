# RSAC-UP Project Transfer Guide

This guide covers moving the project to a fresh computer and updating a computer
that already has it. Commands are written for Windows Command Prompt (`cmd`).

## What a Complete Transfer Contains

A complete handover has four parts:

1. **Git project files**: React website, React CMS, Express server, scripts, and
   committed media.
2. **Current PostgreSQL backup**: all CMS content, users, feedback, order,
   visibility, and media references.
3. **Private media folders**: `server\uploads` and
   `public\documents\flood`.
4. **Private settings**: values required for the destination `.env.local`.

Git alone is not a complete handover because database backups, runtime uploads,
Flood PDFs, and `.env.local` are intentionally ignored.

## Quick Decision Table

| Situation | Git pull? | `npm ci`? | `cms:setup`? | Database restore? | Copy private media? |
| --- | --- | --- | --- | --- | --- |
| Completely fresh computer | Clone, not pull | Yes | Yes | Yes, for current content | Yes |
| Existing computer, only code changed | Yes | If `package.json` or lock changed; safe to run anyway | Only when schema/setup changed | No | No |
| Existing computer, only CMS content changed elsewhere | No | No | No | Yes | Yes if new uploads/PDFs exist |
| Existing computer, code and CMS content changed | Yes | Yes | If schema/setup changed | Yes | Yes |
| Only new CMS uploads/Flood files | No | No | No | Only if matching DB records are missing | Yes |
| Existing computer already has local code edits | Stop and review first | Not yet | No | No | No |
| Both computers have different new CMS edits | Stop and back up both | No | No | Choose/merge content first | After choosing official content |

### When to Use Only `git pull`

Use only `git pull --ff-only` when:

- the destination already has a working project;
- only committed source/documentation changed;
- no database structure change is included;
- no new npm dependency was added; and
- no CMS content or private media must be copied.

Restart/rebuild the application after pulling as appropriate.

### When to Run `npm ci --include=dev`

Run it on every fresh clone. On an existing computer, run it after a pull when
`package.json` or `package-lock.json` changed. It is also safe to run after any
pull when unsure.

### When to Run `npm run cms:setup`

Run it:

- on a fresh computer after PostgreSQL and `.env.local` are ready;
- when the pulled code includes a database schema/setup change and the project
  maintainer says setup is required; or
- when required CMS tables/functions are missing.

Do not run it for ordinary text, photo, PDF, or code-only updates. On a populated
database it preserves CMS entries, but it can update schema, run migrations, and
apply the administrator credentials from `.env.local`. Make a backup first.

### When to Restore a Database Backup

Restore only when the destination must receive the source computer's CMS data.
A restore replaces the destination CMS database state. It is not needed for a
normal code pull.

## A. Prepare the Source Computer

Open Command Prompt:

```cmd
cd /d D:\RSAC_custom_cms
git status
npm run cms:verify-all
npm run cms:backup
npm run build:all
```

Review `git status`. Commit and push only intended source files:

```cmd
git add -A
git status
git commit -m "Prepare RSAC project transfer"
git push
```

Prepare these private items separately:

- newest `backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql`;
- complete `server\uploads\` folder;
- complete `public\documents\flood\` folder;
- destination-specific `.env.local` values.

Do not send `.env.local` through GitHub or public email. Do not include
`node_modules`, `dist`, `dist-admin`, logs, output, or temporary files.

## B. Fresh Destination Computer Using Git

### 1. Install Software

Install Git, Node.js 20 or newer, npm, and PostgreSQL 14 or newer with its command
line tools.

Check them:

```cmd
git --version
node --version
npm --version
psql --version
pg_dump --version
```

### 2. Clone and Install Packages

```cmd
git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git D:\RSAC_custom_cms
cd /d D:\RSAC_custom_cms
npm ci --include=dev
```

Never copy `node_modules` from the source computer.

### 3. Create `.env.local`

Use `.env.example` as the field list. Put real values in a new ignored
`.env.local`.

Minimum local setup values include:

```env
VITE_API_URL=http://localhost:3000
VITE_CMS_ADMIN_URL=http://localhost:5174
CMS_PORT=3000
CMS_PUBLIC_URL=http://localhost:3000
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_ADMIN_USER=postgres
POSTGRES_ADMIN_PASSWORD=YOUR_POSTGRES_PASSWORD
CMS_DATABASE_NAME=rsac_custom_cms
CMS_DATABASE_USER=rsac_custom_app
CMS_ADMIN_USERNAME=YOUR_ADMIN_USERNAME
CMS_ADMIN_PASSWORD=YourStrongPassword123
```

Do not hardcode a changing server IP in source code.

### 4. Create Database Structure

```cmd
npm run cms:setup
```

On an empty system this creates the PostgreSQL role, database, tables, indexes,
functions, administrator, and starter content. Starter content comes from
`server\seed-data.generated.json` only when the CMS content table is empty.

### 5. Copy and Restore Current Content

Copy the source SQL backup into the destination `backups\` folder, then run:

```cmd
npm run cms:restore -- backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

Restore first creates a safety `.dump`, replaces only the custom CMS objects,
restores structure and data from the selected SQL file, and verifies record
counts.

If the destination should use administrator values from its `.env.local`, run:

```cmd
npm run cms:reset-admin
```

Changing `.env.local` alone does not change the password stored in PostgreSQL.

### 6. Copy Private Media

Copy these folders into their exact destination paths:

```text
server\uploads\
public\documents\flood\
```

Do not rename their files. Database records contain those paths.

### 7. Verify and Start

```cmd
npm run cms:verify-all
npm run build:all
npm run dev:all
```

Open:

- `http://localhost:5173` for the website;
- `http://localhost:5174` for the CMS;
- `http://localhost:3000/api/health` for API health.

## C. Existing Destination: Only Code Changed

Use this when the destination database is already correct and no new runtime
uploads/Flood files are required.

```cmd
cd /d D:\RSAC_custom_cms
git status
git pull --ff-only
```

If dependency files changed or you are unsure:

```cmd
npm ci --include=dev
```

Run `cms:setup` only if the update contains schema/setup changes. Otherwise skip
it. Then verify and rebuild/restart:

```cmd
npm run cms:verify-all
npm run build:all
```

## D. Existing Destination: Only CMS Content Changed

Use this when code is already the same but another computer has newer CMS text,
people, order, visibility, feedback, or media records.

On the destination:

```cmd
cd /d D:\RSAC_custom_cms
npm run cms:backup
npm run cms:restore -- backups\SOURCE_BACKUP.sql
npm run cms:verify-all
```

Copy matching `server\uploads` and Flood PDFs before final verification.

Warning: restore replaces destination CMS data. Destination edits made after
the source backup will no longer be current.

## E. Existing Destination: Code and CMS Content Changed

```cmd
cd /d D:\RSAC_custom_cms
git status
git pull --ff-only
npm ci --include=dev
npm run cms:backup
npm run cms:restore -- backups\SOURCE_BACKUP.sql
```

Copy matching private media. If the code update contains schema/setup changes,
run:

```cmd
npm run cms:setup
```

Then:

```cmd
npm run cms:verify-all
npm run build:all
```

## F. Existing Destination Has Uncommitted Code

Do not pull immediately. Run:

```cmd
git status
git diff
```

Commit the work to a suitable branch or ask the maintainer to reconcile it. Do
not use `git reset --hard` to make the warning disappear.

## G. Both Computers Have New CMS Edits

The restore process is replacement, not automatic two-way merge.

1. Run `npm run cms:backup` on both computers.
2. Keep both backups with clear computer/date names.
3. Decide which database is the official base.
4. Re-enter the smaller set of missing edits through the CMS.
5. Create a new official backup.
6. Restore that final backup on the other computer.
7. Copy the final matching upload/Flood folders.

## H. Only Media Files Changed

- If the destination database already contains the correct `/uploads/...` or
  Flood URL, copy only the missing file/folder.
- If a new CMS media record was created on the source, transfer the database
  backup as well as the file.
- Git already transfers newly committed `src\assets` and `public\cms-media`.

## I. Transfer Without GitHub

Copy only repository source files, preferably those shown by:

```cmd
git ls-files
```

Also transfer the newest SQL backup, uploads, Flood folder, and private settings
separately. On the destination, extract the project and follow the fresh-machine
steps starting with:

```cmd
cd /d D:\RSAC_custom_cms
npm ci --include=dev
npm run cms:setup
```

Then restore the SQL and private media.

## J. Updating a Production or EC2 Server

Before updating:

```cmd
npm run cms:backup
git status
```

For a code-only update:

```cmd
git pull --ff-only
npm ci --include=dev
npm run build:all
```

Run `cms:setup` only for a documented schema/setup change. Restore a database
only when intentionally replacing production CMS content. Copy new private media
when needed, then restart the managed `npm start`/PM2/system service.

Production normally uses one Express process:

- website at `/`;
- CMS at `/cms/`;
- API at `/api/`;
- uploads at `/uploads/`.

Use `CMS_HOST=0.0.0.0` on the server and real HTTPS domain/origin values in the
server's private `.env.local`.

## Backup Files Explained

### `.sql`

`npm run cms:backup` creates a full plain-text PostgreSQL SQL backup containing
both structure and data. The command validates the new backup before deleting
older automatically generated SQL backups.

### `.dump`

A `.dump` is PostgreSQL custom binary format and can also contain structure and
data. This project creates a safety `.dump` before restore. The project restore
command intentionally accepts a full `.sql` file, not a `.dump`.

### `server\schema.sql`

This is the current database structure used by setup. It is not a current CMS
content backup.

### `server\seed-data.generated.json`

This is starter content for an empty database. It is not a replacement for the
latest database backup.

## Command Reference

| Command | Use |
| --- | --- |
| `npm ci --include=dev` | Install exact dependency versions from the lock file. |
| `npm run dev:all` | Start local website, CMS, and API. |
| `npm run build:all` | Build both React applications. |
| `npm start` | Serve production builds and API through Express. |
| `npm run cms:setup` | Create/update CMS database structure and initial account. |
| `npm run cms:backup` | Create one validated current SQL backup. |
| `npm run cms:restore -- backups\FILE.sql` | Replace CMS database state with the selected backup. |
| `npm run cms:reset-admin` | Apply admin username/password from `.env.local`. |
| `npm run cms:verify-all` | Run the complete maintained CMS verification suite. |
| `npm run lint` | Check JavaScript and React code. |
| `npm run smoke:production` | Test the production build arrangement. |
| `git status` | Show local changed/untracked files. |
| `git diff` | Show unstaged source changes. |
| `git ls-files` | Show files transferred by Git. |
| `git pull --ff-only` | Download commits without silently creating a merge commit. |

Repair, migration, and `cms:sync-*` commands are maintainer tools. Do not run
them randomly. Back up first and use only the command required for a diagnosed
problem.

## Do Not Do These Things

- Do not commit `.env.local`, passwords, backups, uploads, or Flood PDFs.
- Do not copy or commit `node_modules`, `dist`, `dist-admin`, or logs.
- Do not restore without first backing up the destination.
- Do not set `CMS_FORCE_SEED=true` on a populated database.
- Do not delete `server\uploads` while database URLs refer to it.
- Do not overwrite a production `.env.local` with local-computer URLs.
- Do not use `git reset --hard` as a normal update method.
- Do not run `cms:setup` for every ordinary Git pull.

## Final Transfer Checklist

- Source `git status` was reviewed.
- Code was committed/pushed or copied from `git ls-files`.
- A fresh SQL backup was created.
- Matching uploads and Flood PDFs were copied.
- Destination `.env.local` has correct private values.
- `node_modules` was recreated with `npm ci`.
- Fresh machine: setup completed before restore.
- Existing machine: only the required scenario was followed.
- `npm run cms:verify-all` passed.
- `npm run build:all` passed.
- Website, CMS login, English/Hindi, one image, one PDF, private preview, and
  feedback were checked.
