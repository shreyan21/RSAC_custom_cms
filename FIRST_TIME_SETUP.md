# RSAC Website: First Setup, Backup, and Restore

This guide is for setting up the website on a new Windows computer. Follow the steps in order.

## 1. Install These Programs

Install:

- Node.js 20 or newer
- PostgreSQL 14 or newer
- Git, if the project will be downloaded from GitHub

During PostgreSQL installation, remember the password chosen for the `postgres` user.

## 2. Open the Project Folder

Open PowerShell inside the project folder. All commands below must be run from this folder.

## 3. Install the Project Packages

```powershell
npm.cmd ci --include=dev
```

Do not copy `node_modules`, `dist`, or `dist-admin` from another computer. The command above creates them correctly for the new computer.

## 4. Create the Database and CMS Login

Replace `YOUR_POSTGRES_PASSWORD` with the password chosen while installing PostgreSQL.

```powershell
$env:POSTGRES_ADMIN_PASSWORD="YOUR_POSTGRES_PASSWORD"
npm.cmd run cms:setup
Remove-Item Env:\POSTGRES_ADMIN_PASSWORD
```

This creates the `rsac_custom_cms` database and a private `.env.local` file. The CMS login details are saved in `.env.local`. Never upload that file to GitHub or send it publicly.

## 5. Start the Website and CMS

```powershell
npm.cmd run dev:all
```

Open:

- Website: `http://127.0.0.1:5173/`
- CMS: `http://127.0.0.1:5174/`
- API check: `http://127.0.0.1:3000/api/health`

Keep the PowerShell window open while using the website. Press `Ctrl+C` when you want to stop it.

## Make a Database Backup

Run this after important CMS changes:

```powershell
npm.cmd run cms:backup
```

The backup is saved in the `backups` folder with the date and time in its name. Keep a copy of the latest backup on another drive or secure storage.

The database backup contains text, settings, users, and CMS records. Files uploaded through the CMS are stored separately in `server/uploads`, so copy that folder as well when it contains files.

## Restore a Database Backup

1. Put the `.sql` backup inside the project's `backups` folder.
2. Stop the running website with `Ctrl+C`.
3. Run the restore command with the correct backup name:

```powershell
npm.cmd run cms:restore -- backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

The restore command first makes an extra safety backup. It does not change the backup file you selected.

After the restore finishes, start the project again:

```powershell
npm.cmd run dev:all
```

## Moving the Project to Another Computer

Keep these items:

- The complete Git project
- The latest database `.sql` backup
- The `server/uploads` folder, when it contains uploaded files

Do not move generated folders such as `node_modules`, `dist`, or `dist-admin`. Recreate them with `npm.cmd ci --include=dev`.

Run the database setup once on the new computer, then restore the latest backup and copy the uploads folder into `server/uploads`.

## Files That Must Not Be Committed

The `.gitignore` file already keeps these private or generated items out of Git:

- `.env.local` and other private environment files
- `backups`
- `server/uploads`
- `node_modules`
- `dist` and `dist-admin`
- logs, temporary files, editor settings, and operating-system files

The generated `server/seed-data.generated.json`, public website media, source code, and `package-lock.json` are required and should remain committed.

## Quick Checks

If the website does not start:

1. Make sure PostgreSQL is running.
2. Make sure `.env.local` exists.
3. Run `npm.cmd ci --include=dev` again.
4. Check that ports `3000`, `5173`, and `5174` are not being used by another copy of the project.

If website text loads but a new CMS upload is missing, check that the matching `server/uploads` folder was copied from the old computer.
