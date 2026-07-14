# RSAC Website: Simple Setup, Git, and Backup Guide

This guide explains what the project needs, what should be committed to Git, and what must be copied separately. All commands below are for **Command Prompt (CMD)** on Windows.

## The Short Answer

To move the complete website to another computer, keep these three things:

1. **The Git project** - website code, CMS code, public images, and starter content.
2. **The latest database backup** - the latest text, settings, users, and CMS changes.
3. **The `server\uploads` folder** - only needed when files have been uploaded through the CMS.

The Git project alone can start the website. However, the database backup and uploads folder are needed to reproduce the latest CMS exactly.

## Complete Transfer: Source Computer to Target Computer

Use this section when moving the latest working website from one computer to another. Follow the steps in order.

### Part A: Prepare the Source Computer

#### 1. Open Command Prompt

Open **Command Prompt (CMD)** and enter the source project folder:

```cmd
cd /d D:\RSAC_custom_cms
```

#### 2. Confirm That the Source Website Works

Start the project if it is not already running:

```cmd
npm run dev:all
```

Check these addresses in a browser:

- Website: `http://127.0.0.1:5173/`
- CMS: `http://127.0.0.1:5174/`
- API: `http://127.0.0.1:3000/api/health`

Check both English and Hindi. Also open a few pages containing photographs and PDFs.

After checking, press `Ctrl+C` to stop the project before continuing. If the project was already running in another window, leave that window alone and use a second Command Prompt for the remaining steps.

#### 3. Export the Latest CMS Content into the Project

CMS text is stored in PostgreSQL. Export a starter copy before committing:

```cmd
npm run cms:export-seed
```

This updates `server\seed-data.generated.json`. Commit that file because it gives a new installation the latest starter content.

The database backup in the next step is still required for an exact copy, because it also contains users, settings, audit information, and other database records.

#### 4. Make the Latest Database Backup

```cmd
npm run cms:backup
```

Show the newest backup first:

```cmd
dir /O-D backups\*.sql
```

Write down the newest backup filename. Do not commit it to Git.

#### 5. Prepare Files That Git Does Not Carry

Use a USB drive or another secure drive. In this example, the transfer drive is `E:`. Change `E:` if your drive has a different letter.

Create a private transfer folder:

```cmd
mkdir E:\RSAC_TRANSFER
```

Copy the newest database backup. Replace the example filename with the real one:

```cmd
copy backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql E:\RSAC_TRANSFER\
```

Copy CMS uploads when the folder contains files:

```cmd
xcopy server\uploads E:\RSAC_TRANSFER\uploads /E /I /Y
```

If the large flood-document archive exists, copy it separately too:

```cmd
if exist public\documents\flood xcopy public\documents\flood E:\RSAC_TRANSFER\flood /E /I /Y
```

Do **not** place `.env.local` in Git or in a public transfer. The target computer will create its own private `.env.local`.

#### 6. Understand Which Images Git Will Carry

These are committed to Git and do not need a second manual copy:

- Everything in `public`, except the ignored `public\documents\flood` archive
- Images and videos inside `src\assets`
- Scientist, official, gallery, facility, division, and CMS-migrated images inside the public subfolders

These are not carried by Git and must be copied privately:

- `server\uploads`
- `public\documents\flood`, when it exists

Do not copy `node_modules`, `dist`, or `dist-admin`. The target computer recreates them.

#### 7. Check the Project Before Committing

Run the project checks:

```cmd
npm run lint
npm run build
npm run build:admin
```

Confirm that private folders are ignored:

```cmd
git check-ignore .env.local server\uploads backups
```

The command should print those three paths. That means Git is protecting them.

#### 8. Commit and Push the Project

First review the changes:

```cmd
git status
```

Add all allowed files:

```cmd
git add .
git status
```

Before committing, make sure the list does **not** contain:

- `.env.local`
- `backups`
- `server\uploads`
- `node_modules`
- `dist` or `dist-admin`
- Temporary `.tmp` or log files

It should contain source code, public media, the updated seed file, configuration files, and guides.

Commit and push:

```cmd
git commit -m "Prepare latest RSAC website for transfer"
git push
```

If Git says there is nothing to commit, the source files were already committed. Run `git push` to make sure the remote repository is current.

Check once more:

```cmd
git status
```

The source computer is now prepared. The Git repository contains the project, while `E:\RSAC_TRANSFER` contains the private database and runtime files.

### Part B: Prepare the Target Computer

#### 1. Install the Required Programs

Install these on the target computer:

- Node.js 20 or newer
- PostgreSQL 14 or newer
- Git

Remember the password selected for the PostgreSQL `postgres` user.

#### 2. Download the Git Project

Open Command Prompt and choose where the project should be stored:

```cmd
cd /d D:\
git clone YOUR_REPOSITORY_LINK RSAC_custom_cms
cd /d D:\RSAC_custom_cms
```

Replace `YOUR_REPOSITORY_LINK` with the real Git repository address.

If the project already exists on the target computer, use this instead:

```cmd
cd /d D:\RSAC_custom_cms
git pull
```

#### 3. Install the Project Packages

```cmd
npm ci --include=dev
```

This creates `node_modules`. Do not copy `node_modules` from the source computer.

#### 4. Create the Target Database and Private Settings

Replace `YOUR_POSTGRES_PASSWORD` with the PostgreSQL password used on the target computer:

```cmd
set "POSTGRES_ADMIN_PASSWORD=YOUR_POSTGRES_PASSWORD"
npm run cms:setup
set "POSTGRES_ADMIN_PASSWORD="
```

This creates the database and the target computer's private `.env.local`.

#### 5. Copy the Private Transfer Files

Connect the USB or secure transfer drive. Create the local backup folder:

```cmd
if not exist backups mkdir backups
```

Copy the SQL backup into it. Replace the filename with the real one:

```cmd
copy E:\RSAC_TRANSFER\rsac_custom_cms_YYYYMMDD_HHMMSS.sql backups\
```

Copy CMS uploads when they were included in the transfer:

```cmd
if exist E:\RSAC_TRANSFER\uploads xcopy E:\RSAC_TRANSFER\uploads server\uploads /E /I /Y
```

Copy the flood documents when they were included:

```cmd
if exist E:\RSAC_TRANSFER\flood xcopy E:\RSAC_TRANSFER\flood public\documents\flood /E /I /Y
```

Normal images inside `public` and `src\assets` are already present because they came from Git.

#### 6. Restore the Source Database

Use the actual SQL filename:

```cmd
npm run cms:restore -- backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

This replaces the starter database with the latest source database. The restore command creates an extra safety backup first.

#### 7. Match the CMS Password to the Target Computer

After restoring, reset the restored CMS administrator to the password stored in the target `.env.local`:

```cmd
npm run cms:reset-admin
```

To see the target CMS username and password locally:

```cmd
findstr /B /C:"CMS_ADMIN_USERNAME=" /C:"CMS_ADMIN_PASSWORD=" .env.local
```

Do not share or commit the displayed password.

#### 8. Start the Target Website

```cmd
npm run dev:all
```

Open:

- Website: `http://127.0.0.1:5173/`
- CMS: `http://127.0.0.1:5174/`
- API: `http://127.0.0.1:3000/api/health`

#### 9. Check the Target Copy

Check all of the following:

- The API address shows a successful response.
- The homepage opens in English and Hindi.
- Division, facility, gallery, scientist, and administration images appear.
- PDFs open from local website addresses.
- CMS login works using the target `.env.local` credentials.
- Recently edited CMS headings and paragraphs are present.
- Recently uploaded CMS images or PDFs appear.
- The website and CMS work on both desktop and mobile widths.

If public images work but a recent CMS upload is missing, compare `server\uploads` on both computers. If text is old, confirm that the correct SQL backup was restored.

#### 10. Make a First Backup on the Target

After everything is confirmed, create a target-side backup:

```cmd
npm run cms:backup
```

Store that SQL file and a copy of `server\uploads` securely. The transfer is now complete.

## Why Does `public` Show Only Two Images?

There are only two image files directly inside the main `public` folder:

- `public\icons.svg`
- `public\organisation-chart.jpg`

The other images are inside folders under `public`. The project currently has **544 public image files**:

| Folder | Number of images | Used for |
| --- | ---: | --- |
| `public\official-media` | 336 | Page, division, facility, gallery, and other official media |
| `public\cms-media` | 101 | Images moved from the old CMS |
| `public\images` | 78 | General website images |
| `public\scientists` | 18 | Scientist photographs |
| `public\organisation-chart-photos` | 5 | Organisation chart photographs |
| `public\officials` | 4 | Official profile photographs |
| Main `public` folder | 2 | Icons and organisation chart |

Therefore, the site is not using only two images. The two files are only the images at the top level. Open the folders inside `public` to see the rest.

The project also has **11 bundled images** inside `src\assets\images`, including the RSAC logo, state emblem, and leader photographs. These are part of the source code and are also committed to Git.

All files inside `public` are served locally by the website. For example:

```text
public\scientists\amit-sinha.jpg
```

is shown on the website using:

```text
/scientists/amit-sinha.jpg
```

## What Must Be Committed to Git?

Commit these files and folders:

| Item | Why it is required |
| --- | --- |
| `src` | Main website pages, components, styles, and local assets |
| `admin` | CMS screen and CMS controls |
| `server` | API and database code, but not `server\uploads` |
| `shared` | Information shared by the website and CMS |
| `scripts` | Setup, backup, restore, checking, and content tools |
| `public` | Public images, PDFs, icons, and other local website files |
| `package.json` | Project commands and package list |
| `package-lock.json` | Keeps package versions the same on another computer |
| `server\schema.sql` | Database structure |
| `server\seed-data.generated.json` | Starter CMS content |
| `.env.example` | Safe example of the required settings; it contains no real password |
| `.gitignore` | Stops private and generated files from being committed |
| Vite, ESLint, and HTML files | Required to build and start the website |
| Markdown (`.md`) guides | Instructions for future setup and maintenance |

The simplest safe way to prepare a commit is:

```cmd
cd /d D:\RSAC_custom_cms
git status
git add .
git status
git commit -m "Update RSAC website and CMS"
git push
```

The second `git status` is important. Check the list before committing.

One exception is `public\documents\flood`. It is intentionally ignored because it is a large document archive. If that folder is present and used by the website, copy it separately with the database backup instead of committing it normally.

## What Must Not Be Committed?

These items are already blocked by `.gitignore`:

| Item | Why it should not be committed | What to do instead |
| --- | --- | --- |
| `.env.local` | Contains database and CMS passwords | Keep it private on that computer |
| `node_modules` | Very large and automatically recreated | Run `npm ci --include=dev` |
| `dist` and `dist-admin` | Automatically generated website builds | Recreate them with the build commands |
| `backups` and `.sql` files | Private database copies and often very large | Keep them on a secure drive |
| `server\uploads` | Runtime files uploaded through the CMS | Copy the folder separately |
| Log and `.tmp` files | Temporary launch or testing output | They can be deleted when no longer needed |
| Editor and local tool settings | Only useful on one computer | Let each computer create its own settings |

Do not force-add these private files with `git add -f`.

## Why Can the Website Work Without `server\uploads`?

Most current images are already stored in `public`, so Git carries them to the new computer. That is why the website can still look correct without `server\uploads`.

`server\uploads` is used for files uploaded later through the custom CMS. The database stores information about those files, but the database does not contain the actual image or PDF file.

There is **no separate `uploads` folder in the main project folder**. The correct location is:

```text
server\uploads
```

The Express server makes those files available to the website through addresses beginning with `/uploads/`.

This means:

- If `server\uploads` is empty, there is nothing extra to copy.
- If the CMS has new uploads, copy the complete `server\uploads` folder with the database backup.
- If the folder is missing, only those newer CMS-uploaded files will be missing. Images already inside `public` will still work.

Its previous two files were removed only after confirming that no CMS entry or media record used them. Express creates `server\uploads` automatically when the API starts and checks it again whenever a new file is uploaded through the CMS.

## Which Parts Are React and Which Parts Are Express?

The counts below were checked on 14 July 2026. They will naturally change when files are added or removed.

### React Website and CMS Screens

| Folder | Files | Subfolders | Purpose |
| --- | ---: | ---: | --- |
| `src` | 125 | 26 | Main public React website |
| `admin` | 8 | 1 | React-based CMS administration screen |

Together, the two React areas contain **133 files** inside **2 main folders and 27 subfolders**.

The `src` count includes:

- 70 React `.jsx` files
- 40 JavaScript `.js` files
- 2 CSS files
- 13 local image and video files

The `admin` count includes:

- 5 React `.jsx` files
- 1 JavaScript file
- 1 CSS file
- 1 HTML file

The root files `index.html`, `vite.config.js`, and `vite.admin.config.js` also support the React applications, but they are not included in the folder counts above.

### Express API and Database

| Folder | Files | Subfolders | Purpose |
| --- | ---: | ---: | --- |
| `server` without uploads | 11 | 0 | Express API, login, database setup, schema, and starter CMS data |
| `server\uploads` | Runtime | 0 | CMS-uploaded files; Express creates the folder automatically and Git ignores its contents |

The 11 backend files contain:

- 9 JavaScript files for Express, login, database access, setup, and validation
- 1 SQL file for the database structure
- 1 JSON file containing starter CMS data

The upload images are stored inside `server`, but they are **not Express source code**. They are files managed and served by Express.

### Files Used by Both or Neither

Some folders do not belong only to React or only to Express:

| Folder | Files | Subfolders | Purpose |
| --- | ---: | ---: | --- |
| `shared` | 1 | 0 | CMS collection information shared by React and Express |
| `scripts` | 30 | 2 | Setup, backup, restore, translation, checking, and maintenance tools |
| `public` | 583 | 30 | Images, PDFs, applications, and static files used by the website |

`public` is part of the frontend project, but its files are not React code. React pages display or link to those static files.

In simple terms:

- `src` and `admin` are the React side.
- `server` is the Express and PostgreSQL side.
- `public` contains the local files shown by the React website.
- `shared` connects the CMS definitions used by both sides.
- `scripts` contains maintenance tools rather than normal page or server code.

## First Setup on a New Windows Computer

### 1. Install the Required Programs

Install:

- Node.js 20 or newer
- PostgreSQL 14 or newer
- Git

Remember the password selected for the PostgreSQL `postgres` user.

### 2. Open Command Prompt in the Project

Open **Command Prompt**, then move to the project folder:

```cmd
cd /d D:\RSAC_custom_cms
```

Change the path if the project is stored somewhere else.

### 3. Install the Project Packages

```cmd
npm ci --include=dev
```

Do not copy `node_modules` from the old computer. This command creates it correctly.

### 4. Create the Database and CMS Login

Replace `YOUR_POSTGRES_PASSWORD` with the PostgreSQL password:

```cmd
set "POSTGRES_ADMIN_PASSWORD=YOUR_POSTGRES_PASSWORD"
npm run cms:setup
set "POSTGRES_ADMIN_PASSWORD="
```

This creates:

- The `rsac_custom_cms` database
- The private `.env.local` file
- The first CMS login

Never commit or publicly share `.env.local`.

### 5. Start Everything

```cmd
npm run dev:all
```

Open these addresses:

- Website: `http://127.0.0.1:5173/`
- CMS: `http://127.0.0.1:5174/`
- API check: `http://127.0.0.1:3000/api/health`

Keep Command Prompt open while the project is running. Press `Ctrl+C` to stop it.

If the project is already running, the command will say so instead of starting a second copy.

## Make a Complete Backup

### 1. Back Up the Database

Run:

```cmd
npm run cms:backup
```

A dated `.sql` file is created inside `backups`.

### 2. Back Up CMS Uploads

Check `server\uploads` in File Explorer.

- If it contains files, copy the complete folder beside the database backup.
- If it is empty or does not exist, no uploads backup is needed.

Keep the database backup and uploads copy on another drive or secure storage. They must not be pushed to GitHub.

## Restore the Latest Database

First complete the normal setup steps above. Then:

1. Put the `.sql` file inside `backups`.
2. Stop the running project with `Ctrl+C`.
3. Run this command using the real backup filename:

```cmd
npm run cms:restore -- backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

4. Match the restored CMS administrator with the password in this computer's `.env.local`:

```cmd
npm run cms:reset-admin
```

5. Copy the saved `uploads` folder back to `server\uploads`, if one was backed up.
6. Start the project again:

```cmd
npm run dev:all
```

The restore tool makes an extra safety backup before replacing the database.

## Before Moving to Another Computer

Use this checklist:

- [ ] All source changes are committed and pushed to Git.
- [ ] The latest database backup was created with `npm run cms:backup`.
- [ ] `server\uploads` was copied if it contains files.
- [ ] `.env.local` was not committed or shared publicly.
- [ ] The latest backup and uploads are stored somewhere safe.

On the new computer, download the Git project, run the first setup, restore the database, and then copy `server\uploads` back.

## Quick Problem Checks

If the website does not start:

1. Make sure PostgreSQL is running.
2. Make sure `.env.local` exists.
3. Run `npm ci --include=dev` again.
4. Run `npm run dev:all` only once.
5. Check the API address: `http://127.0.0.1:3000/api/health`.

If text appears but an image is missing:

1. Check whether its file exists inside `public`.
2. If it was uploaded through the CMS, check `server\uploads`.
3. Make sure the matching database backup and uploads folder came from the same project backup.
