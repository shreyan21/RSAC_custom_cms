# RSAC-UP Website

React/Vite frontend with Directus CMS and PostgreSQL. Docker is not required.

Documentation — one file per job, grouped so you open only what you need:

**Move data / back up (start here for transfer)**
- **[TRANSFER_AND_BACKUP.md](TRANSFER_AND_BACKUP.md)** — what to move to the other
  machine after every change (database dump + uploads + `.env`), the exact
  `pg_dump` command, and the restore steps. **This is the only transfer file.**
- **[DEPLOYMENT_NGINX.md](DEPLOYMENT_NGINX.md)** — live-server deploy with Nginx,
  plus publishing / preview and SDC go-live rules.

**For content editors (no coding)**
- **[EDITING_GUIDE.md](EDITING_GUIDE.md)** — the full editing walk-through
  (English + Hindi): a daily quick-start, a worked example, list sections, and
  common mistakes. Directus controls all homepage and inner-page text, people,
  menus, notices, flood reports, gallery, logos, and page photos.
- **[HINDI_CONTENT_GUIDE.md](HINDI_CONTENT_GUIDE.md)** — how manual Hindi and
  English fallback work.

**For developers**
- **[SYSTEM_AND_FLOW.md](SYSTEM_AND_FLOW.md)** — architecture, request flow, and
  the full project structure / data-ownership guide (directories, `src/data`
  files, and where each item is edited).
- **[FALLBACK_DATA_GUIDE.md](FALLBACK_DATA_GUIDE.md)** — CMS → fallback → default priority.
- **[CMS_DEVELOPER_NOTES.md](CMS_DEVELOPER_NOTES.md)** — content shapes, serial
  numbers, collections, maintenance scripts, migrations.

Quick local start after configuration:

```powershell
npm install
npm run cms:setup
npm run dev
```

Validation:

```powershell
npm run cms:validate
npm run lint
npm run build
```

STQC certification applies to the deployed website and department process, not
source code alone. Do not display a certification mark before formal approval.
