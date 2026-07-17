# RSAC Two-Computer Sync Guide (Windows CMD)

Use **Command Prompt (CMD)** for commands below.

## Three Things That Must Be Synced

1. **Code**: GitHub repository.
2. **CMS data**: latest `backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql` file.
3. **CMS uploads**: complete `server\uploads` folder.

Git does not transfer `.env.local`, database backups, or `server\uploads`.
Never commit passwords or SQL backups.

## Choose Your Case

| Case | Run `cms:setup`? | Pull Git? | Restore SQL? | Copy uploads? |
|---|---:|---:|---:|---:|
| Fresh target computer | Once | Clone | Yes | Yes |
| Existing target, code changed only | No | Yes | No | No |
| Existing target, CMS content changed only | No | No | Yes | Yes |
| Existing target, code and CMS changed | No | Yes | Yes | Yes |
| Target has newer accepted work | No | Reverse source/target roles | Yes | Yes |

## A. Prepare Source Computer

Open project:

```cmd
cd /d D:\RSAC_custom_cms
```

### When Code Changed

Check and push code:

```cmd
npm run lint
npm run build
npm run build:admin
git status
git diff --check
git add .
git status
git commit -m "Describe the RSAC update"
git push origin master
```

For first GitHub push only:

```cmd
git branch -M master
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin master
```

Skip `git remote add origin` when `git remote -v` already shows `origin`.

### When CMS Content or Uploaded Media Changed

Create database backup:

```cmd
npm run cms:backup
```

The command prints the new SQL filename. After verifying the new dump, it removes
older timestamped `rsac_custom_cms_YYYYMMDD_HHMMSS.sql` files and keeps the new
one. Unrelated safety files are not removed.

Copy SQL and uploads to USB/shared folder. Replace `X:` with its drive:

```cmd
if not exist X:\RSAC_TRANSFER mkdir X:\RSAC_TRANSFER
copy /Y "backups\YOUR_NEW_BACKUP.sql" "X:\RSAC_TRANSFER\"
xcopy "server\uploads" "X:\RSAC_TRANSFER\uploads" /E /I /Y
```

If `server\uploads` does not exist or is empty, skip `xcopy`.

## B. Fresh Target Computer

Install Git, Node.js 20+, and PostgreSQL 14+ first.

Clone and install:

```cmd
git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git D:\RSAC_custom_cms
cd /d D:\RSAC_custom_cms
npm ci --include=dev
```

Create local database and CMS login once:

```cmd
set /p "POSTGRES_ADMIN_PASSWORD=Enter PostgreSQL password: "
set /p "CMS_ADMIN_PASSWORD=Choose CMS admin password: "
npm run cms:setup
set "POSTGRES_ADMIN_PASSWORD="
set "CMS_ADMIN_PASSWORD="
```

CMS username is `admin`. Setup creates ignored `.env.local`.

Copy and restore source data:

```cmd
if not exist backups mkdir backups
copy /Y "X:\RSAC_TRANSFER\YOUR_NEW_BACKUP.sql" "backups\"
xcopy "X:\RSAC_TRANSFER\uploads" "server\uploads" /E /I /Y
npm run cms:restore -- backups\YOUR_NEW_BACKUP.sql
```

Without source SQL, setup uses committed starter seed. It will not contain latest
source CMS edits.

## C. Existing Target Computer

Do **not** run `cms:setup` again.

Stop running stack with `Ctrl+C`, then open project:

```cmd
cd /d D:\RSAC_custom_cms
```

### Code Changed Only

```cmd
git pull origin master
npm ci --include=dev
npm run dev:all
```

Do not restore SQL. Existing target CMS data stays unchanged.

### CMS Content Changed Only

Create target safety backup first:

```cmd
npm run cms:backup
```

Then copy and restore source data:

```cmd
copy /Y "X:\RSAC_TRANSFER\YOUR_NEW_BACKUP.sql" "backups\"
xcopy "X:\RSAC_TRANSFER\uploads" "server\uploads" /E /I /Y
npm run cms:restore -- backups\YOUR_NEW_BACKUP.sql
npm run dev:all
```

### Code and CMS Content Both Changed

```cmd
npm run cms:backup
git pull origin master
npm ci --include=dev
copy /Y "X:\RSAC_TRANSFER\YOUR_NEW_BACKUP.sql" "backups\"
xcopy "X:\RSAC_TRANSFER\uploads" "server\uploads" /E /I /Y
npm run cms:restore -- backups\YOUR_NEW_BACKUP.sql
npm run dev:all
```

## D. Changes Were Made on Target Computer

Computer containing newest accepted CMS edits becomes temporary **source**:

1. Run source steps on that computer.
2. Push its code changes, if any.
3. Create its SQL backup.
4. Copy its SQL and uploads to other computer.
5. Pull code and restore SQL on other computer.

Never edit CMS on both computers at same time. SQL backups cannot safely merge.
If both were edited, choose one database as master and manually re-enter required
changes from other computer before making next backup.

## E. Start and Verify

Start stack:

```cmd
cd /d D:\RSAC_custom_cms
npm run dev:all
```

Open:

- Website: `http://localhost:5173`
- CMS: `http://localhost:5174`
- API: `http://localhost:3000/api/health`

In second CMD window, validate:

```cmd
cd /d D:\RSAC_custom_cms
npm run cms:validate
```

Check English, Hindi, images, PDFs, videos, CMS login, and one harmless edit.

## F. CMS Login Fails After Restore

Backup may contain older CMS password. Reset admin using password already stored
in target `.env.local`:

```cmd
cd /d D:\RSAC_custom_cms
npm run cms:reset-admin
```

Do not rerun `cms:setup` for this problem.

## Safe Rule

```text
Code changed    -> Git push and pull
CMS changed     -> SQL backup and restore
Media changed   -> Copy server\uploads
Fresh target    -> cms:setup once before first restore
Existing target -> Never rerun cms:setup
```
