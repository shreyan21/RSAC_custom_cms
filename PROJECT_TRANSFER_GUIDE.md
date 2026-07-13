# RSAC Custom CMS GitHub, Transfer, and Deployment Guide

GitHub transfers source code and committed public assets. It does not transfer PostgreSQL live data, local secrets, runtime uploads, builds, or the large flood-document archive.

## 1. What Must Be Committed

- `src/`, `admin/`, `server/`, `shared/`, and `scripts/`
- `public/cms-media/` and other approved public assets
- `server/seed-data.generated.json`
- `.env.example`, configuration files, documentation
- `package.json` and `package-lock.json`

`server/seed-data.generated.json` creates a new starter CMS. It contains content only, never accounts, passwords, or sessions.

## 2. What Must Never Be Committed

- `.env.local`, `.env`, passwords, API keys, cookies, private certificates
- PostgreSQL dumps: `*.dump`, `*.sql`
- `server/uploads/` runtime files
- `node_modules/`, `dist/`, `dist-admin/`
- logs, reports, temporary files, local tools, editor/AI metadata
- private handover archives
- `public/documents/flood/` through normal Git because it is very large

These are covered by `.gitignore`. Ignored files will not appear after a GitHub clone.

## 3. Before First Push

Export approved live content into starter seed when that is intended:

```powershell
npm.cmd run cms:export-seed
npm.cmd run cms:validate
npm.cmd run cms:audit
npm.cmd run lint
npm.cmd run build
npm.cmd run build:admin
```

Review Git state before committing:

```powershell
git status --short
git check-ignore -v .env.local server/uploads/example.jpg backups/site.dump public/documents/flood/example.pdf
git add .
git diff --cached --name-only
```

Confirm `public/cms-media/` and `server/seed-data.generated.json` are staged. Confirm no `.env.local`, dump, upload, log, or private file is staged.

Then commit and push:

```powershell
git commit -m "Add RSAC custom CMS stack"
git push -u origin HEAD
```

Do not run `git add -f` on ignored secrets, dumps, uploads, or flood documents.

## 4. Clone on Another Computer

Install first:

- Git
- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer

Clone and install exact locked dependencies:

```powershell
git clone <repository-url>
Set-Location RSAC-Drupal-Test
npm.cmd ci
```

Create local database, role, schema, starter content, and CMS admin:

```powershell
$env:POSTGRES_ADMIN_PASSWORD="your-local-postgres-password"
npm.cmd run cms:setup
Remove-Item Env:\POSTGRES_ADMIN_PASSWORD
```

Setup writes local credentials to ignored `.env.local`. Do not send that file through GitHub or chat.

Start all three services:

```powershell
npm.cmd run dev:all
```

Open:

- Website: `http://localhost:5173`
- CMS portal: `http://localhost:5174`
- API health: `http://localhost:3000/api/health`

CMS username defaults to `admin`. Read its generated password locally from `.env.local`.

## 5. Two Transfer Choices

### Choice A: New installation from committed seed

Use `npm run cms:setup`. This loads `server/seed-data.generated.json`. Suitable for development or when exported seed is the approved content snapshot.

This does not preserve CMS users, audit history, feedback, sessions, visit counts, or runtime upload records.

### Choice B: Exact live-system transfer

Transfer all three items through approved private storage:

1. PostgreSQL custom-format dump.
2. Matching `server/uploads/` folder.
3. Large `public/documents/flood/` archive when required.

Never put these private/large transfer items in a public GitHub repository.

## 6. Back Up Current Live Data

Create a private PostgreSQL dump:

```powershell
pg_dump.exe -h 127.0.0.1 -U rsac_custom_app -d rsac_custom_cms -F c -f rsac-custom-cms.dump
```

Copy these folders separately:

```text
server/uploads/
public/documents/flood/
```

Keep database dump and upload snapshot from the same time. Otherwise database media records can point to missing files.

## 7. Restore Exact Live Data

Create the application role/database using setup first, then restore the private dump:

```powershell
pg_restore.exe -h 127.0.0.1 -U rsac_custom_app -d rsac_custom_cms --clean --if-exists rsac-custom-cms.dump
```

Restore matching uploads to `server/uploads/`. Restore flood documents to `public/documents/flood/` when needed.

Do not restore into `rsac_cms`; that database belongs to the old source system.

After restoring, remove expired sessions if required by security policy and verify admin access using an approved account. Use `npm.cmd run cms:reset-admin` only when authorised.

## 8. Large Files

`public/documents/flood/` is intentionally ignored because normal Git/GitHub is unsuitable for the archive size. Choose one approved approach:

- private SDC file storage copied during deployment;
- object storage with backed-up access controls;
- Git LFS, only if organisation policy and repository quota allow it.

Do not remove the ignore rule until a formal large-file approach exists.

### Current S3 transfer

This project uses the following private transfer prefix for files excluded from Git:

```text
s3://my-bucket-utk/rsac-custom-cms/
```

Upload public flood documents and mutable CMS uploads from the project root:

```powershell
aws s3 sync public/documents/flood/ s3://my-bucket-utk/rsac-custom-cms/public/documents/flood/ --sse AES256 --only-show-errors
aws s3 sync server/uploads/ s3://my-bucket-utk/rsac-custom-cms/server/uploads/ --sse AES256 --only-show-errors
```

Restore them after cloning on another computer:

```powershell
aws s3 sync s3://my-bucket-utk/rsac-custom-cms/public/documents/flood/ public/documents/flood/ --only-show-errors
aws s3 sync s3://my-bucket-utk/rsac-custom-cms/server/uploads/ server/uploads/ --only-show-errors
```

Verify remote file counts and sizes without downloading:

```powershell
aws s3 ls s3://my-bucket-utk/rsac-custom-cms/public/documents/flood/ --recursive --summarize
aws s3 ls s3://my-bucket-utk/rsac-custom-cms/server/uploads/ --recursive --summarize
```

Do not add `--delete` unless an authorised administrator has confirmed that remote-only files may be permanently removed. Keep AWS keys in the normal AWS credential store; never place them in `.env.local`, documentation, or Git.

Database dumps may contain user and audit data. Store them only in an approved private prefix with access controls, retention rules, and encryption. They are not uploaded by the public-media commands above.

## 9. Environment Variables

Copy `.env.example` to `.env.local` only on each target machine, then enter local/production values. Main groups:

- Browser: `VITE_API_URL`, `VITE_WEBSITE_URL`, `VITE_API_TIMEOUT`
- API: `CMS_PORT`, `CMS_PUBLIC_URL`, `CMS_ALLOWED_ORIGINS`, `CMS_COOKIE_SECURE`, session/upload limits
- PostgreSQL: `POSTGRES_HOST`, `POSTGRES_PORT`, `CMS_DATABASE_NAME`, `CMS_DATABASE_USER`, `CMS_DATABASE_URL`
- First setup only: `POSTGRES_ADMIN_USER`, `POSTGRES_ADMIN_PASSWORD`, `CMS_ADMIN_USERNAME`, `CMS_ADMIN_PASSWORD`

Production rules:

- use HTTPS URLs;
- set `CMS_COOKIE_SECURE=true`;
- use strong unique passwords;
- keep PostgreSQL private;
- store secrets in SDC secret management or protected server environment;
- never hardcode production URLs or passwords into source files.

## 10. Verification on New Computer

```powershell
npm.cmd run cms:validate
npm.cmd run cms:audit
npm.cmd run cms:smoke
npm.cmd run lint
npm.cmd run build
npm.cmd run build:admin
```

Manual checks:

- Website, CMS, and `/api/health` open.
- English/Hindi toggle keeps content separate.
- Edit and publish one test item; website reflects it.
- Add a research paper/facility/list item; new item appears first where configured.
- Draft and archived entries remain hidden publicly.
- Routes, menus, footer, profiles, notices, downloads, gallery, feedback, and visitor count work.
- Images and PDFs open; missing upload scan is clean.
- Mobile, tablet, desktop, keyboard, focus, contrast, and screen-reader basics are checked.
- No secret, dump, runtime upload, or private file exists in Git history.

## 11. Production/SDC Layout

- Nginx, Apache, or IIS serves `dist/` at public website domain.
- Protected CMS host/path serves `dist-admin/` only to authorised staff.
- Node process manager runs `server/index.js` behind HTTPS reverse proxy.
- PostgreSQL accepts connections only from authorised API hosts.
- `server/uploads/` uses persistent backed-up storage.
- Firewall, patching, least privilege, monitoring, daily backups, restore drills, password rotation, and vulnerability assessment are mandatory operations.

Build artifacts:

```powershell
npm.cmd run build
npm.cmd run build:admin
```

GIGW/STQC features in code support assessment, but only an authorised audit/certification body can declare formal conformance or approval.

## 12. Pulling Future Updates

Before pulling, back up database and uploads. Then:

```powershell
git pull
npm.cmd ci
npm.cmd run cms:validate
npm.cmd run build
npm.cmd run build:admin
```

Do not replace `.env.local`, live PostgreSQL data, or `server/uploads/` with repository files. Review schema changes before production rollout.

## 13. Rollback

1. Stop API process.
2. Deploy last approved Git commit/build artifacts.
3. Restore matching PostgreSQL dump and `server/uploads/` snapshot.
4. Restore flood archive snapshot if changed.
5. Start API and validate health, CMS login, English/Hindi content, routes, and media.

## 14. Quick Handover Checklist

- Source pushed; clean clone tested.
- `public/cms-media/` included in Git.
- `.env.local` absent from Git.
- Database dump stored privately.
- `server/uploads/` stored privately.
- Flood archive transfer method recorded.
- Production domains and secrets recorded in approved password/secret system.
- CMS administrator ownership handed over securely.
- Backup and restore procedure tested.
