# RSAC-UP Deployment with Nginx

Use this guide on company Linux server. Replace every `example.gov.in`, user,
password, and certificate path with company values.

## 1. Files to transfer

Transfer these as one handoff:

1. Clean project source directory or archive.
2. PostgreSQL backup:
   `backups/rsac_cms.sql`
3. Directus uploaded files:
   `backend/directus/uploads/`
4. Old flood-season PDFs (2016–2025, about 1.4 GB):
   `public/documents/flood/`
   This folder is **not stored in git**, so a git clone or source archive does
   not contain it. Copy it separately, or regenerate it on the server with
   `node scripts/flood-archive.mjs` (downloads from the old official site).
5. Production passwords and secrets through an approved private channel. Never
   email or commit them.

Database and uploads belong together. Restoring only one causes missing files.

## 2. Server software

Install:

- Node.js 22 or newer
- PostgreSQL 14 or newer
- Nginx
- `unzip`, `psql`, and `pg_dump`

Extract the clean source archive, then install exact locked packages:

```bash
sudo mkdir -p /opt/rsac_website
sudo cp -a /path/to/rsac_website/. /opt/rsac_website/
sudo chown -R rsac:rsac /opt/rsac_website
cd /opt/rsac_website
npm ci
npm ci --prefix backend/directus
```

## 3. Create and restore PostgreSQL

Create a private database and user. Use a strong password:

```sql
CREATE ROLE rsac_directus LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE rsac_cms OWNER rsac_directus ENCODING 'UTF8';
```

Restore final data:

```bash
PGPASSWORD='REPLACE_WITH_STRONG_PASSWORD' psql \
  -h 127.0.0.1 -U rsac_directus -d rsac_cms \
  -f backups/rsac_cms.sql
```

Restore uploaded photos, PDFs, and videos:

```bash
test -d backend/directus/uploads
sudo chown -R rsac:rsac backend/directus/uploads
```

## 4. Configure Directus

```bash
cp backend/directus/.env.example backend/directus/.env
```

Edit `backend/directus/.env`:

```text
HOST=127.0.0.1
PORT=8055
PUBLIC_URL=https://cms.example.gov.in
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=rsac_cms
DB_USER=rsac_directus
DB_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
KEY=REPLACE_WITH_RANDOM_64_CHAR_VALUE
SECRET=REPLACE_WITH_RANDOM_128_CHAR_VALUE
ADMIN_EMAIL=REPLACE_WITH_ADMIN_EMAIL
ADMIN_PASSWORD=REPLACE_WITH_STRONG_ADMIN_PASSWORD
CORS_ORIGIN=https://rsac.example.gov.in
REFRESH_TOKEN_COOKIE_SECURE=true
SESSION_COOKIE_SECURE=true
HSTS_ENABLED=true
```

Do not put database or admin secrets in any `VITE_*` value.

Test CMS before creating service:

```bash
npm run cms:preflight
npm run cms:start
```

Open another terminal and check:

```bash
curl http://127.0.0.1:8055/server/health
npm run cms:validate
```

## 5. Configure frontend

Do not copy developer `.env.local` to server. Create `.env.production`:

```text
VITE_CMS_ENABLED=true
VITE_CMS_URL=https://cms.example.gov.in
```

Build and publish static files:

```bash
npm run lint
npm run build
sudo mkdir -p /var/www/rsac-up/dist
sudo rsync -a --delete dist/ /var/www/rsac-up/dist/
```

## 6. Keep Directus running with systemd

Copy and edit service template:

```bash
sudo cp backend/directus/deployment/rsac-directus.service.example \
  /etc/systemd/system/rsac-directus.service
sudo systemctl daemon-reload
sudo systemctl enable --now rsac-directus
sudo systemctl status rsac-directus
```

Confirm `User`, `Group`, `WorkingDirectory`, and `EnvironmentFile` match server.

## 7. Enable Nginx

Templates:

- Website: `backend/directus/deployment/nginx-rsac-site.conf.example`
- CMS: `backend/directus/deployment/nginx-directus.conf.example`

Copy both to `/etc/nginx/sites-available/`, replace domains and certificate
paths, then enable them:

```bash
sudo ln -s /etc/nginx/sites-available/rsac-site /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/rsac-cms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Firewall must expose only ports `80` and `443`. Keep PostgreSQL `5432` and
Directus `8055` private.

## 8. Final checks

```bash
curl -I https://rsac.example.gov.in
curl https://cms.example.gov.in/server/health
npm run cms:validate
npm run lint
npm run build
```

Check English and Hindi, menu, search, scientist cards, division pages, PDFs,
images, video, mobile layout, keyboard navigation, and Directus login.

Directus public API should expose read-only published content. This project
blocks anonymous writes. Enable strict published-only permission rules after
company activates the required Directus entitlement.

## 9. Backups after deployment

Back up both items at the same time:

```bash
PGPASSWORD='PASSWORD' pg_dump -h 127.0.0.1 -U rsac_directus \
  -d rsac_cms --no-owner --no-privileges > rsac_cms.sql
zip -r rsac_uploads.zip /opt/rsac_website/backend/directus/uploads
```

Keep backups encrypted and outside public web folders. Test restore regularly.

## 10. Publishing, preview, and SDC go-live rules

**Live website shows only final content.**

- On the public deployment keep `VITE_CMS_PREVIEW_ENABLED=false` unless the
  department approves a protected preview URL.
- A Directus row appears publicly only when its **Status = published**. Keep
  draft/test rows as `draft`.

**Preview workflow (staging/local only, never the public URL):**

1. Set `VITE_CMS_PREVIEW_ENABLED=true` and `VITE_CMS_PREVIEW_TOKEN` to a private value.
2. If drafts need a stronger read token, set `VITE_DIRECTUS_PREVIEW_TOKEN` on staging/local.
3. Open `https://staging-site.example.gov.in/?preview=YOUR_TOKEN` and confirm the
   `CMS Preview` label shows.
4. Check English, Hindi, images, videos, PDFs, and links; publish the row only after approval.

**Latest-first lists** — notices, flood reports, gallery, research papers,
technical reports, completed/ongoing projects, publications, downloads, etc. do
**not** store manual serial numbers. The website sorts the visible list, then
numbers it. A manual `sort` / `Display Order` still wins when editors set it;
newest year first when rows carry a year; otherwise the original safe order.

**SDC / secrets** — SDC hosting does not change website logic. Keep database and
Directus admin credentials private. Never put PostgreSQL passwords or admin
secrets in the frontend `.env.local`; `VITE_*` values are visible in the browser.
