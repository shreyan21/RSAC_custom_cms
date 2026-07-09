# RSAC-UP Website

React/Vite frontend with Drupal as the active headless CMS target. Directus code
is kept only as optional legacy fallback during migration. Docker is not
required.

## Start Here

Use Drupal for new CMS setup:

```powershell
npm install
npm run cms:setup
npm run dev
```

`npm run cms:setup` checks Drupal frontend configuration and whether the Drupal
JSON:API URL is reachable. It does not start Directus and does not install
Drupal. Create/configure Drupal by following the Drupal docs below, start Drupal,
then set `.env.local`.

Local Drupal helper:

```powershell
npm run cms:start
```

This starts Drupal only if a real local Drupal project exists and
`cms-drupal/.env.local` points to it. This React repo does not contain Drupal
core files.

Legacy Directus setup is still available only when needed:

```powershell
npm run cms:setup:directus
npm run cms:start:directus
```

## Drupal Docs

- [cms-drupal/README_DRUPAL_SETUP.md](cms-drupal/README_DRUPAL_SETUP.md): install/configure Drupal without Docker.
- [cms-drupal/DRUPAL_CONTENT_MODEL.md](cms-drupal/DRUPAL_CONTENT_MODEL.md): required Drupal content types and fields.
- [cms-drupal/EDITOR_GUIDE.md](cms-drupal/EDITOR_GUIDE.md): editor guide for English/Hindi content.
- [DRUPAL_RUNTIME_VERIFICATION.md](DRUPAL_RUNTIME_VERIFICATION.md): what is wired to Drupal and what still needs work.

## Transfer And Deployment

- [TRANSFER_AND_BACKUP.md](TRANSFER_AND_BACKUP.md): what to move to another system.
- [DEPLOYMENT_NGINX.md](DEPLOYMENT_NGINX.md): frontend deploy with Nginx and SDC go-live notes.

## Legacy Directus / Fallback Docs

- [EDITING_GUIDE.md](EDITING_GUIDE.md): legacy Directus editing guide kept for fallback/reference.
- [HINDI_CONTENT_GUIDE.md](HINDI_CONTENT_GUIDE.md): manual Hindi and English fallback behavior.
- [SYSTEM_AND_FLOW.md](SYSTEM_AND_FLOW.md): architecture and project map.
- [FALLBACK_DATA_GUIDE.md](FALLBACK_DATA_GUIDE.md): CMS to fallback to default priority.
- [CMS_DEVELOPER_NOTES.md](CMS_DEVELOPER_NOTES.md): legacy CMS shapes and maintenance scripts.

## Validation

```powershell
npm run cms:validate
npm run lint
npm run build
```

`npm run cms:validate` runs the same Drupal configuration check as
`npm run cms:setup`.

STQC certification applies to the deployed website and department process, not
source code alone. Do not display a certification mark before formal approval.
