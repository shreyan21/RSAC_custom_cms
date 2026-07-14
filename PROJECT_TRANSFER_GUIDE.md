# RSAC Source-to-Target Quick Guide

Move three things:

1. **Git repository**: code and included public media.
2. **Database backup**: latest CMS text, users, order, English, and Hindi.
3. **`server/uploads`**: files uploaded through the CMS.

Git alone does not move the latest database or CMS uploads.

## A. Source Computer

### 1. Open Project

```powershell
cd D:\RSAC_custom_cms
```

### 2. Check Website

```powershell
npm.cmd run cms:validate
npm.cmd run lint
npm.cmd run build
npm.cmd run build:admin
```

### 3. Back Up CMS Data

```powershell
npm.cmd run cms:backup
```

Keep the new `backups\*.sql` file privately. Also copy `server\uploads` when it
contains files. Keep both together.

### 4. Confirm Secrets Are Ignored

```powershell
git check-ignore .env.local
git check-ignore backups
git check-ignore server/uploads
```

Never commit these three items.

### 5. Commit and Push Code

```powershell
git status
git diff --check
git add .
git status
git commit -m "Update RSAC custom CMS website"
git branch -M master
git push -u origin master
```

For a new GitHub repository, run this once before pushing:

```powershell
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
```

## B. Target Computer

### 1. Install

Install Git, Node.js 20+, and PostgreSQL 14+.

### 2. Download Code

```powershell
git clone https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
npm.cmd ci --include=dev
```

### 3. Create Local CMS Database

```powershell
$env:POSTGRES_ADMIN_PASSWORD = Read-Host "Enter PostgreSQL password"
$env:CMS_ADMIN_PASSWORD = Read-Host "Choose CMS admin password"
npm.cmd run cms:setup
Remove-Item Env:\POSTGRES_ADMIN_PASSWORD
Remove-Item Env:\CMS_ADMIN_PASSWORD
```

This creates database `rsac_custom_cms`. CMS username is `admin`. Local details
are stored in ignored `.env.local`.

### 4. Restore Exact Source Content

Copy the saved SQL file into target `backups` folder, then run:

```powershell
npm.cmd run cms:restore -- backups\YOUR_BACKUP_FILE.sql
```

Copy the saved uploads folder back to:

```text
server/uploads/
```

Skip uploads copy only when source folder was empty.

### 5. Start Everything

```powershell
npm.cmd run dev:all
```

Open:

- Website: `http://localhost:5173`
- CMS: `http://localhost:5174`
- API check: `http://localhost:3000/api/health`

### 6. Final Check

Check English/Hindi, homepage, divisions, facilities, media, CMS login, and one
harmless save test.

## Future Updates

Source computer:

```powershell
git add .
git commit -m "Describe update"
git push
```

Target computer:

```powershell
git pull
npm.cmd ci --include=dev
```

Do not restore an old database after every pull.

## Whole Process

```text
Source: check -> DB backup -> copy uploads -> commit -> push
Target: clone -> npm install -> CMS setup -> DB restore -> copy uploads -> start
```

Database, seed, and media explanation: [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md).
