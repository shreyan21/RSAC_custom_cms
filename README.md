# RSAC-UP Custom CMS Website

This test project now uses a custom stack:

- Public website: React, port `5173`
- CMS portal: React, port `5174`
- Content API: Express, port `3000`
- Database: PostgreSQL database `rsac_custom_cms`

The original project at `D:\rsac_website` and the old `rsac_cms` database are not modified. The website does not call Drupal or Directus at runtime.

## First Setup

Requirements: Node.js 20+, npm, and PostgreSQL 14+.

```powershell
npm.cmd install
$env:POSTGRES_ADMIN_PASSWORD="your-local-postgres-password"
npm.cmd run cms:setup
Remove-Item Env:\POSTGRES_ADMIN_PASSWORD
```

Setup creates the separate database, seeds the bilingual content, and stores generated local credentials only in ignored `.env.local`.

## Start Everything

```powershell
npm.cmd run dev:all
```

Open:

- Website: `http://localhost:5173`
- CMS: `http://localhost:5174`
- API check: `http://localhost:3000/api/health`

CMS username is `admin`. Read `CMS_ADMIN_PASSWORD` from local `.env.local`. Never commit or share that file.

## Checks

```powershell
npm.cmd run cms:validate
npm.cmd run lint
npm.cmd run build
npm.cmd run build:admin
```

## Guides

- [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md): edit every website area in English and Hindi.
- [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md): system flow and responsibility of each maintained source file.
- [PROJECT_TRANSFER_GUIDE.md](PROJECT_TRANSFER_GUIDE.md): GitHub, backup, transfer, and SDC deployment.

The code includes accessibility, security, responsive layout, audit history, bilingual content, and structured publishing controls. Official GIGW conformance and STQC certification still require formal testing and approval by the authorised assessment body.
