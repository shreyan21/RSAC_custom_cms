# Drupal Setup Without Docker

Use this folder as Drupal setup documentation for the RSAC-UP migration test. No Docker or Docker Compose is required.

## Target Stack

- PHP 8.3 or SDC-approved PHP version compatible with chosen Drupal release
- Composer
- PostgreSQL, private to the server
- Apache or Nginx with PHP-FPM
- Drupal installed as a decoupled/headless CMS
- Existing React frontend remains separate

## Install Outline

```bash
sudo mkdir -p /var/www/rsac-drupal
sudo chown -R rsac:rsac /var/www/rsac-drupal
cd /var/www
composer create-project drupal/recommended-project rsac-drupal
cd /var/www/rsac-drupal
composer require drush/drush
```

Create PostgreSQL database:

```sql
CREATE ROLE rsac_drupal LOGIN PASSWORD 'REPLACE_WITH_PRIVATE_PASSWORD';
CREATE DATABASE rsac_drupal OWNER rsac_drupal ENCODING 'UTF8';
\c rsac_drupal
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Install Drupal through browser or Drush:

```bash
./vendor/bin/drush site:install standard \
  --db-url=pgsql://rsac_drupal:REPLACE_WITH_PRIVATE_PASSWORD@127.0.0.1:5432/rsac_drupal \
  --site-name="RSAC-UP Headless CMS"
```

Do not store real passwords in this repo.

## Required Core Modules

Enable:

- Language
- Content Translation
- Configuration Translation
- Interface Translation
- Media
- Media Library
- JSON:API
- Path
- Menu UI
- REST and Serialization only if custom endpoints are added for feedback/visitor count

Drupal JSON:API is core and exposes entity bundles under `/jsonapi/node/{bundle}`.

## Frontend Connection

Set frontend `.env.local`:

```text
VITE_CMS_ENABLED=true
VITE_CMS_PROVIDER=drupal
VITE_CMS_URL=https://cms.example.gov.in
VITE_DRUPAL_JSONAPI_PATH=/jsonapi
```

Keep Directus fallback optional:

```text
VITE_DIRECTUS_FALLBACK_ENABLED=true
VITE_DIRECTUS_FALLBACK_URL=https://old-directus.example.gov.in
```

## Local Test Server

If `npm run cms:bootstrap:local` has created `local-drupal/`, run the local Drupal PHP server with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-drupal-local.ps1
```

Default local CMS URL:

```text
http://localhost:8080
```

If a local admin password must be reset, set `DRUPAL_LOCAL_ADMIN_PASSWORD` only in the current shell and run:

```powershell
D:\RSAC-Drupal-Test\.tools\php\php.exe D:\RSAC-Drupal-Test\local-drupal\vendor\drush\drush\drush.php php:script D:\RSAC-Drupal-Test\cms-drupal\reset-admin-password.php
```

## Do Not Do

- Do not build the public website as a Drupal theme.
- Do not delete Directus code yet.
- Do not delete static fallback data.
- Do not commit `settings.php`, DB dumps, uploaded files, or passwords.
