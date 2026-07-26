# RSAC-UP Project: Simple Questions and Answers

## 1. What are the main parts of this project?

```text
src/             Public React website
admin/src/       React CMS portal
server/          Express API and PostgreSQL code
public/          Original/project media files
server/uploads/  Files uploaded later through the CMS
```

## 2. How do React and Express share one `package.json`?

This is one Node.js project containing three applications. The public website,
CMS portal, and Express server use the same root `node_modules/` folder.

```cmd
npm run dev          :: Public website
npm run dev:admin    :: CMS portal
npm run dev:api      :: Express API
npm run dev:all      :: Start all three
```

React runs in the browser. Express runs on the server.

## 3. What does `npm install` do?

It reads `package.json` and installs React, Express, PostgreSQL, mail, upload,
security, and other required packages into `node_modules/`.

## 4. What does `npm run cms:setup` do?

It:

1. creates the PostgreSQL database and application user when missing;
2. creates CMS tables and columns;
3. creates or updates the CMS administrator;
4. adds starter English and Hindi content when the CMS is empty;
5. updates older content structures; and
6. writes local connection settings to `.env.local`.

It does not design the CMS dashboard. Dashboard code already exists in
`admin/src/`.

## 5. Why are there only a few PostgreSQL tables?

Most website content is stored in `cms_entries`.

```text
collection  Type of content
entry_key   Unique item name
data_en     English content stored as JSON
data_hi     Hindi content stored as JSON
sort_order  Display order
status      Published, draft, or archived
```

Other tables store users, sessions, media records, feedback, visits, and audit
history.

## 6. How does a website request work?

```text
React website
  -> Express API endpoint
  -> PostgreSQL query
  -> JSON response
  -> React displays content
```

CMS editing follows the same path, but protected CMS endpoints check login,
permissions, and CSRF protection before saving.

## 7. Do `public/` and `server/uploads/` contain real files?

Yes.

- `public/` contains project media already supplied with the website.
- `server/uploads/` contains new files uploaded through the CMS.
- PostgreSQL normally stores their paths and metadata, not the file bytes.

## 8. Why not move every CMS upload into `public/`?

`public/` is build-time project content. Deployments can replace it.
`server/uploads/` is runtime data and remains separate from application builds.
This protects editor uploads during rebuilds and deployments.

## 9. What does `npm run cms:backup` create?

It creates one portable PostgreSQL SQL backup:

```text
backups/rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

It contains database tables and records. It does not contain `public/` or
`server/uploads/`.

## 10. What does `npm run cms:restore` do?

```cmd
npm run cms:restore -- backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

It:

1. creates a safety `.dump` of the target database;
2. replaces target CMS tables with content from the selected SQL file;
3. verifies the restored content; and
4. keeps the safety dump for rollback.

Restore replaces CMS data. It does not merge two databases.

## 11. What is the `pre-restore-....dump` file?

It is an emergency copy of the target database immediately before restoration.
Keep it until the restored website and CMS are confirmed working.

## 12. Why are `postgres` and `rsac_custom_app` separate users?

- `postgres` is the powerful PostgreSQL administrator used for setup/restore.
- `rsac_custom_app` is the restricted user used daily by Express.

This limits damage if the web application is ever compromised.

## 13. Where is the `rsac_custom_app` password?

It is generated during setup and stored only in ignored `.env.local`, inside
`CMS_DATABASE_URL`. Never commit or share this file.

## 14. How does website feedback work?

```text
Visitor submits form
  -> Express validates and rate-limits it
  -> PostgreSQL saves it in cms_feedback
  -> CMS portal shows it under Website feedback
  -> Express emails configured Director/WIM recipients through SMTP
```

If email is unavailable, feedback remains safely stored in the CMS. An
authorised editor can retry delivery from the feedback screen after SMTP is
fixed.

## 15. How is feedback email configured?

Ask the SDC or department mail administrator for approved SMTP values. Add them
only to `.env.local`:

```env
FEEDBACK_RECIPIENTS=approved-recipient@department.gov.in
FEEDBACK_FROM_NAME=RSAC-UP Website
FEEDBACK_FROM_EMAIL=approved-sender@department.gov.in
FEEDBACK_SMTP_HOST=approved-smtp-host
FEEDBACK_SMTP_PORT=587
FEEDBACK_SMTP_SECURE=false
FEEDBACK_SMTP_REQUIRE_TLS=true
FEEDBACK_SMTP_USER=provided-user
FEEDBACK_SMTP_PASSWORD=provided-password
```

Multiple recipients can be separated with commas. Restart `npm run dev:all`
after changing these values.

## 16. What must move from source computer to target computer?

1. Git project files.
2. Latest `backups/rsac_custom_cms_....sql`.
3. Complete `server/uploads/` folder.
4. Large `public/documents/flood/` archive when used.
5. Target-specific `.env.local`, created securely on the target.

Never push `.env.local`, SQL backups, dumps, or private uploads to public Git.

## 17. First setup on a new computer

```cmd
npm install
npm run cms:setup
npm run cms:restore -- backups\YOUR_BACKUP.sql
npm run dev:all
```

Copy `server/uploads/` before checking media. Open:

```text
Website: http://localhost:5173
CMS:     http://localhost:5174
API:     http://localhost:3000
```
