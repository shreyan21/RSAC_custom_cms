# RSAC-UP Drupal Website

This folder is Drupal-based test project for RSAC-UP website.

Original Directus project is separate:

```text
D:\rsac_website
```

Do not edit original project from here.

The frontend uses only Drupal JSON:API. The old `rsac_cms` PostgreSQL database is a read-only migration source; Drupal runs from its own PostgreSQL schema/database so old tables remain untouched.

## Local URLs

- Website: `http://localhost:5173/`
- Drupal: `http://localhost:8080/`
- Drupal login: `http://localhost:8080/user/login`
- RSAC collections: `http://localhost:8080/admin/content/rsac`
- Drupal JSON:API: `http://localhost:8080/jsonapi`

## Main Commands

Install frontend packages:

```powershell
npm.cmd install
```

Start Drupal:

```powershell
npm.cmd run cms:start
```

Start website:

```powershell
npm.cmd run dev
```

Windows non-technical helper:

```text
Double-click how_to_edit.cmd
```

Check Drupal:

```powershell
npm.cmd run cms:setup
```

Install or refresh the RSAC collections dashboard and editing fields:

```powershell
npm.cmd run cms:admin:install
```

Seed Drupal content:

```powershell
npm.cmd run cms:seed:drupal
```

Administrator-only read-only import from the old `rsac_cms` database:

```powershell
$env:RSAC_SOURCE_DB_PASSWORD="your-private-postgres-password"
$env:RSAC_SOURCE_UPLOADS="path-to-old-public-uploads"
npm.cmd run cms:migrate:rsac-db
```

Build website:

```powershell
npm.cmd run build
```

## Guides

- [DRUPAL_EDITOR_USER_GUIDE.md](DRUPAL_EDITOR_USER_GUIDE.md): edit every website section in Drupal.
- [PROJECT_TRANSFER_GUIDE.md](PROJECT_TRANSFER_GUIDE.md): move project to another system/server/GitHub.

## CMS Rule

Website reads Drupal first.

If Drupal content is missing, website uses built-in static fallback, so site does not break.

Hindi content must be entered manually in Drupal. If Hindi is missing, website falls back to English.
