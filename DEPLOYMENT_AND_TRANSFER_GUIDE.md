# Deployment And Transfer Guide

For full backup and transfer detail, read `TRANSFER_AND_BACKUP.md`. For Nginx,
read `DEPLOYMENT_NGINX.md`.

## What Must Move With The Website

1. React code through git.
2. PostgreSQL database dump.
3. Directus uploads folder: `backend/directus/uploads/`.
4. Environment files on the target machine.

The database stores file records. The actual images, videos, and PDFs live in
`backend/directus/uploads/`. Copy both the database dump and uploads folder.

## After Pulling Code On A New Machine

```powershell
npm install
npm install --prefix backend/directus
Copy-Item .env.example .env.local
Copy-Item backend\directus\.env.example backend\directus\.env
```

Fill the local database credentials in `backend/directus/.env`.

## Restore CMS Data

Restore the PostgreSQL dump into `rsac_cms`, then copy `backend/directus/uploads/`
from the source machine.

After restoring the database, run:

```powershell
npm run cms:configure
node scripts/cms-nest-exact.mjs
npm run cms:seed
npm run cms:validate
```

These commands rebuild the friendly Directus editor layout, labels, groups, and
guide rows. They are safe to run repeatedly and preserve edited content.

## Start Local Services

```powershell
npm run cms:start
npm run dev
```

Directus: `http://localhost:8055/admin`

Website: `http://localhost:5173`

## Production Notes

- Keep `VITE_DIRECTUS_URL` pointing to the production Directus URL.
- Keep the public website token read-only.
- Keep uploads backed up with the database.
- Do not expose admin credentials in git.
- Run `npm run cms:validate` after a restore or Directus setup change.

## Simple Hindi

Project transfer करते समय तीन चीजें साथ ले जाएं: code, PostgreSQL dump, और
`backend/directus/uploads/` folder। Database में file का record होता है, लेकिन
actual image/PDF/video uploads folder में होता है। Restore के बाद
`npm run cms:configure`, `node scripts/cms-nest-exact.mjs`, `npm run cms:seed`,
और `npm run cms:validate` चलाएं।
