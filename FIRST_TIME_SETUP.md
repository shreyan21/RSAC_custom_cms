# RSAC Website: Start Here

This guide explains the project in simple steps. No coding knowledge is needed.

## What Runs the Website?

Four parts work together:

1. **Public website**: what visitors see at `http://localhost:5173`.
2. **CMS portal**: where editors change content at `http://localhost:5174`.
3. **API server**: carries saved content between the CMS, website, and database.
4. **PostgreSQL database**: safely stores the saved CMS information.

Simple flow:

```text
Editor saves in CMS -> API saves in PostgreSQL -> Website reads new content
```

## What Does the Database Contain?

Database name: `rsac_custom_cms`

It contains:

- English and Hindi text
- page and section details
- notices, tenders, projects, publications, facilities, and divisions
- card order and published/hidden status
- CMS user accounts
- media names, addresses, and alternative text
- edit history and website feedback

The database stores **information about an uploaded file**, but normally does not
store the large image, PDF, or video itself.

## Where Are Images, PDFs, and Videos Stored?

There are three places.

### 1. Files Already Included With the Website

```text
public/official-media/
public/cms-media/
src/assets/
```

These are part of the Git project. They move with a normal Git clone or pull.

### 2. Files Uploaded Later Through the CMS

```text
server/uploads/
```

The actual uploaded file is here. PostgreSQL only remembers its name, address,
type, size, and description.

`server/uploads/` is private runtime data. Git ignores it. Back it up separately.

### 3. External Files

Some old pages link to files hosted by another government server. Those files are
not inside this project. They work only while that external server is available.

The four CIPDM 3D-model cards use their original MP4 links and local JPG posters.
The old source server is currently unavailable. For guaranteed playback, obtain
the approved original MP4 files, upload them through **CMS > Media**, and use the
new `/uploads/...` addresses in the CIPDM **Map/Photos** section. Do not replace
them with unrelated videos.

## What Is a Seed?

A seed is starter content used when a new database is empty.

Starter file:

```text
server/seed-data.generated.json
```

Think of it as a blank new office receiving its first prepared set of files.

- Empty database: starter English/Hindi content is copied into PostgreSQL.
- Existing database: saved CMS content is kept; normal seed is skipped.
- Later CMS edits live in PostgreSQL, not automatically in the seed file.

Do not set `CMS_FORCE_SEED=true` on a working database. It can replace existing
starter rows with seed versions.

## What Does `npm run cms:setup` Do?

Run it during first setup on a new computer.

It:

1. connects to local PostgreSQL;
2. creates database `rsac_custom_cms` if missing;
3. creates the limited database user used by the website;
4. creates required tables if missing;
5. creates or updates the CMS administrator account;
6. adds starter seed content only when the CMS is empty;
7. repairs known imported page links and section parity;
8. writes local connection details to ignored `.env.local`.

It does **not** start the website. Use `npm run dev:all` after setup.

## First Setup on a New Windows Computer

### Step 1: Install Required Programs

Install:

- Node.js 20 or newer
- PostgreSQL 14 or newer
- Git

Keep the PostgreSQL password chosen during installation.

### Step 2: Download the Project

Clone or pull the Git repository, then open PowerShell in the project folder.

### Step 3: Install Project Packages

```powershell
npm.cmd ci --include=dev
```

### Step 4: Prepare the Database and CMS Login

Use temporary PowerShell values so passwords are not typed into project files by
hand:

```powershell
$env:POSTGRES_ADMIN_PASSWORD = Read-Host "Enter the local PostgreSQL password"
$env:CMS_ADMIN_PASSWORD = Read-Host "Choose a strong CMS admin password"
npm.cmd run cms:setup
Remove-Item Env:\POSTGRES_ADMIN_PASSWORD
Remove-Item Env:\CMS_ADMIN_PASSWORD
```

CMS username is `admin`. Setup stores local details in `.env.local`. Never send
or commit that file.

### Step 5: Start Everything

```powershell
npm.cmd run dev:all
```

Open:

- Website: `http://localhost:5173`
- CMS portal: `http://localhost:5174`
- API health check: `http://localhost:3000/api/health`

## Normal Daily Use

1. Start PostgreSQL.
2. Open PowerShell in the project folder.
3. Run `npm.cmd run dev:all`.
4. Open the CMS portal.
5. Edit English and Hindi separately.
6. Save and check the public website.

Do not run `cms:setup` every day. It is mainly for first setup or repairing the
local schema after an instructed project update.

## Make a Complete Backup

### Database

```powershell
npm.cmd run cms:backup
```

This creates a dated SQL file inside `backups/`.

### Uploaded Files

Copy the complete folder if it exists:

```text
server/uploads/
```

Keep the SQL backup and uploads copy together in secure storage. Neither belongs
in a public GitHub repository.

## Move the Project to Another Computer

Move three things:

1. Git repository: code and included public media.
2. Latest SQL backup: current PostgreSQL content.
3. `server/uploads/`: files uploaded through the CMS.

On the new computer:

1. clone the Git repository;
2. run `npm.cmd ci --include=dev`;
3. run `npm.cmd run cms:setup` once;
4. place the SQL file inside `backups/`;
5. restore it with:

```powershell
npm.cmd run cms:restore -- backups\YOUR_BACKUP_FILE.sql
```

6. copy the saved uploads folder back to `server/uploads/`;
7. run `npm.cmd run dev:all`.

## What Git Does Not Move

Git intentionally ignores:

- `.env.local` and passwords
- `backups/` and database dumps
- `server/uploads/`
- installed `node_modules/`
- generated build folders

This protects secrets and prevents very large private files from entering GitHub.

## Quick Checks

```powershell
npm.cmd run cms:validate
npm.cmd run lint
npm.cmd run build
npm.cmd run build:admin
```

If text is old, confirm the correct database was restored. If a recent image,
PDF, or video is missing, confirm the matching `server/uploads/` folder was copied.

For editing website content, read [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md).
