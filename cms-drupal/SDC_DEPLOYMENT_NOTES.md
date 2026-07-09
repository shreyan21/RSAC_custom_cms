# SDC Deployment Notes

No Docker path.

## Recommended Deployment Shape

- React/Vite frontend served as static files.
- Drupal CMS served separately through Apache or Nginx + PHP-FPM.
- PostgreSQL private on same server or approved DB host.
- CMS admin protected with HTTPS and SDC access controls.
- Public frontend reads Drupal JSON:API.

## Server Packages

Install SDC-approved equivalents:

- PHP and required extensions for Drupal
- Composer
- PostgreSQL
- Apache or Nginx
- Git or approved code transfer tool
- `psql`, `pg_dump`

## PostgreSQL

Keep PostgreSQL private. Create DB/user:

```sql
CREATE ROLE rsac_drupal LOGIN PASSWORD 'REPLACE_WITH_PRIVATE_PASSWORD';
CREATE DATABASE rsac_drupal OWNER rsac_drupal ENCODING 'UTF8';
\c rsac_drupal
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Web Server

Serve Drupal docroot only:

```text
/var/www/rsac-drupal/web
```

Do not expose project root, `.env`, `vendor` metadata, private files, or backups.

## Security Notes

- Anonymous JSON:API permissions should be read-only and published-only.
- Admin routes should be restricted by HTTPS and SDC network policy.
- Never put DB/admin secrets in frontend env.
- Keep CORS limited to public frontend origin.
- Add CSP on frontend to allow Drupal API/media origin.
- Back up PostgreSQL and `sites/default/files` together.

## Go-Live Checklist

- Drupal status report clean.
- JSON:API returns published rows only.
- Hindi path/prefix tested.
- Media/PDF URLs resolve.
- Frontend build passes.
- Directus fallback or static fallback verified.
- Rollback env ready.
