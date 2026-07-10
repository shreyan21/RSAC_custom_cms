# RSAC Project Transfer Guide

Use this when moving project to another computer, GitHub, or server.

## What Goes To GitHub

Commit/push these:

- React frontend code
- `src/`
- `public/`
- `cms-drupal/` scripts and examples
- `cms-drupal/modules/rsac_admin/`
- `package.json`
- `package-lock.json`
- `.env.example`
- `README.md`
- `DRUPAL_EDITOR_USER_GUIDE.md`
- `PROJECT_TRANSFER_GUIDE.md`

Do not commit:

- `.env`
- `.env.local`
- `cms-drupal/.env.local`
- `local-drupal/`
- `.tools/`
- database dumps
- uploaded private files
- passwords/tokens

## Important: GitHub Does Not Move Drupal Content

Git moves code.

Drupal content lives in:

- PostgreSQL database
- Drupal uploaded files folder

So for real content transfer, move these separately:

```text
PostgreSQL database dump
local-drupal/web/sites/default/files
```

Never commit database dump or uploads if they contain private content.

## New Computer Setup

1. Clone repo.

```powershell
git clone <your-repo-url>
cd RSAC-Drupal-Test
```

2. Install frontend packages.

```powershell
npm.cmd install
```

3. Prepare local env files.

```powershell
Copy-Item .env.example .env.local
Copy-Item cms-drupal\.env.example cms-drupal\.env.local
```

4. Bootstrap local Drupal if fresh machine.

```powershell
$env:POSTGRES_ADMIN_PASSWORD="your-local-postgres-admin-password"
npm.cmd run cms:bootstrap:local
Remove-Item Env:\POSTGRES_ADMIN_PASSWORD
```

5. Seed starter content if DB is empty.

```powershell
npm.cmd run cms:seed:drupal
```

6. Install the RSAC editing dashboard and field forms.

```powershell
npm.cmd run cms:admin:install
```

7. Start both apps.

```powershell
npm.cmd run cms:start
npm.cmd run dev
```

## Moving Existing Drupal Content

On old system, export database with `pg_dump`.

Example:

```powershell
pg_dump.exe -h 127.0.0.1 -U <db_user> -d <db_name> -F c -f rsac-drupal.dump
```

Copy dump privately to new system.

On new system, restore:

```powershell
pg_restore.exe -h 127.0.0.1 -U <db_user> -d <db_name> --clean --if-exists rsac-drupal.dump
```

Also copy:

```text
local-drupal/web/sites/default/files
```

After restore:

```powershell
.\.tools\php\php.exe .\local-drupal\vendor\drush\drush\drush.php --root=.\local-drupal\web cache:rebuild
npm.cmd run cms:setup
npm.cmd run cms:admin:install
```

`rsac_cms` is not the live Drupal database. It is only a read-only migration source. Transfer the active Drupal PostgreSQL database and Drupal `sites/default/files`; do not point Drupal at old CMS tables.

## Moving To SDC / Normal Server

Server needs:

- PHP supported by Drupal 11
- Composer
- PostgreSQL
- web server: Apache/Nginx/IIS
- Node.js only for building frontend

Drupal web root:

```text
local-drupal/web
```

Frontend build output:

```text
dist
```

Build frontend:

```powershell
npm.cmd run build
```

Set frontend env before build:

```text
VITE_CMS_ENABLED=true
VITE_CMS_PROVIDER=drupal
VITE_CMS_URL=https://your-drupal-domain
VITE_DRUPAL_JSONAPI_PATH=/jsonapi
VITE_DRUPAL_LANGUAGE_PREFIX_MODE=path
```

## After Transfer Checklist

- Drupal opens
- Drupal login works
- `Content -> RSAC Collections` shows collection cards and rows
- `/jsonapi` returns content
- website opens
- English/Hindi toggle works
- notices open
- downloads open
- gallery images show
- contact page correct
- no secrets committed
- `npm.cmd run build` passes

## Rollback

If transfer fails:

1. Keep old system untouched.
2. Restore previous database dump.
3. Restore previous `sites/default/files`.
4. Rebuild frontend from last working commit.
5. Run Drupal cache rebuild.
