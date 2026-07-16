# Project Build Structure

This project contains two React applications and one Express backend:

```text
RSAC_custom_cms/
|-- src/                 Public React website source code
|-- admin/src/           React CMS portal source code
|-- server/              Express API and backend code
|-- public/              Public images, PDFs, fonts, and other files
|-- scripts/             Database and maintenance scripts
|-- package.json         Shared commands and dependencies
|-- node_modules/        Shared React and Express packages
|-- vite.config.js       Public website build settings
`-- vite.admin.config.js CMS portal build settings
```

## Build the Public Website

Run:

```cmd
npm run build
```

This creates the `dist/` folder:

```text
dist/
|-- index.html
|-- assets/
|   |-- compiled JavaScript
|   |-- compiled CSS
|   `-- bundled fonts and images
`-- files copied from public/
    |-- official-media/
    |-- .well-known/
    `-- other public files
```

The `dist/` folder is the production version of the public RSAC website.

## Build the CMS Portal

Run:

```cmd
npm run build:admin
```

This creates the `dist-admin/` folder:

```text
dist-admin/
|-- index.html
`-- assets/
    |-- compiled CMS JavaScript
    `-- compiled CMS CSS
```

The `dist-admin/` folder is the production version of the CMS interface.

## Express Backend

Express is not converted into a `dist` build. It runs directly from the `server/` folder:

```cmd
node server/index.js
```

The Express backend connects the website and CMS to PostgreSQL. It also handles login, content updates, file uploads, and API requests.

## Build Everything

On a new computer or server, run:

```cmd
npm install
npm run build
npm run build:admin
```

Start the Express API with:

```cmd
npm run dev:api
```

For local development, all three parts can be started with:

```cmd
npm run dev:all
```

## What Is Needed for Production

A complete production installation needs:

1. `dist/` for the public website.
2. `dist-admin/` for the CMS portal.
3. `server/` for the Express backend.
4. `package.json` and `package-lock.json`.
5. Installed production dependencies from `npm install`.
6. Correct environment variables for the server and database.
7. The PostgreSQL database containing the CMS content.
8. Writable local upload or media storage for files uploaded through the CMS.

The `src/` and `admin/src/` folders contain the editable React source code. Visitors do not receive these source folders directly. They receive the optimized files produced in `dist/` and `dist-admin/`.
