# RSAC-UP Custom CMS Website

This repository contains:

- Public website: React + Vite
- CMS portal: React + Vite
- API and production server: Express
- Content database: PostgreSQL database `rsac_custom_cms`

It intentionally uses one `package.json`, one `package-lock.json`, and one
`node_modules` folder for both React applications and Express.

## Read First

- [PROJECT_HANDBOOK.md](PROJECT_HANDBOOK.md): complete source/target handover, fresh and existing computer scenarios, commands, database backup/restore, architecture, libraries, and file responsibilities.
- [CMS_USER_GUIDE.md](CMS_USER_GUIDE.md): non-technical website editing instructions.

## Local Start

Requirements: Node.js 20+, npm, and PostgreSQL 14+.

On a new machine, follow `PROJECT_HANDBOOK.md`. After first setup:

```cmd
npm run dev:all
```

Open:

- Website: `http://localhost:5173`
- CMS: `http://localhost:5174`
- API check: `http://localhost:3000/api/health`

Read `CMS_ADMIN_USERNAME` and `CMS_ADMIN_PASSWORD` from the ignored local
`.env.local`. Changing those lines alone does not change PostgreSQL. After an
intentional credential change, run `npm run cms:reset-admin`. Never commit or
publicly share `.env.local`.

## Checks

```cmd
npm run cms:validate
npm run lint
npm run build:all
npm run smoke:production
```

## Production Build

This repository intentionally uses one npm workspace for both React applications
and the Express API. A single `package.json` and `node_modules` directory are
valid because the public site and CMS share the same dependency versions.

Build and start the deployable application:

```cmd
npm ci --include=dev
npm run build:all
npm start
```

Production uses one Express process:

- Public React website: `http://YOUR-SERVER:3000/`
- React CMS portal: `http://YOUR-SERVER:3000/cms/`
- Express API: `http://YOUR-SERVER:3000/api/health`
- CMS uploads: `http://YOUR-SERVER:3000/uploads/...`

Express includes React SPA fallbacks, so opening routes such as `/leadership`
directly or refreshing them does not produce an `index.html` error. Set
`CMS_HOST`, `CMS_PUBLIC_URL`, `CMS_ALLOWED_ORIGINS`, and secure-cookie values in
the server's ignored `.env.local`; do not hardcode a changing IP in source code.

Verify the complete production build locally with:

```cmd
npm run smoke:production
```

The code includes accessibility, security, responsive layout, audit history, bilingual content, and structured publishing controls. Official GIGW conformance and STQC certification still require formal testing and approval by the authorised assessment body.
