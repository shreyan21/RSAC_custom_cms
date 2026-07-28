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

Use this command mainly on a new computer or a newly installed PostgreSQL
server:

```cmd
npm run cms:setup
```

The command performs these steps:

1. Connects to PostgreSQL using the administrator details supplied during
   setup.
2. Creates database `rsac_custom_cms` when it does not already exist.
3. Creates or updates the restricted `rsac_custom_app` database user.
4. Runs `server/schema.sql` to create or update CMS tables, columns, indexes,
   sequences, functions and triggers.
5. Creates or updates the CMS administrator account.
6. Counts the records in `cms_entries`.
7. If `cms_entries` is empty, inserts the starter English and Hindi seed data
   from `server/seed-data.generated.json`.
8. If records already exist, keeps them and skips normal seeding.
9. Runs the project’s compatibility and content-structure repairs.
10. Writes the local connection and CMS login settings to ignored
    `.env.local`.

Therefore, `cms:setup` is **not a structure-only command**. It creates the
structure and also inserts starter content when the CMS database is empty.

It does not:

- restore the latest CMS edits from another computer;
- start the website, CMS portal or API;
- copy uploaded images, PDFs or videos; or
- include `.env.local` in Git.

After setup, use `npm run dev:all` to start the application. When transferring
an existing website, run setup once and then restore the latest SQL backup.

### What is seed data?

Seed data is the project’s prepared starter CMS content:

```text
server/seed-data.generated.json
```

It supplies an empty database with initial homepage text, divisions,
facilities, people, navigation, footer content and English/Hindi records.

Seed data is not the live database and is not a replacement for a recent
backup. Changes made later through the CMS are saved in PostgreSQL. They do not
automatically update the seed file.

Normal setup skips the seed when `cms_entries` already contains records.
`CMS_FORCE_SEED=true` forces matching seed entries to be written again and must
not be used casually on a working database.

The CMS dashboard itself is application code inside `admin/src/`; setup only
prepares the database and local login information.

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

Run:

```cmd
npm run cms:backup
```

The command uses PostgreSQL `pg_dump` in plain-text format and creates:

```text
backups/rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

The `.sql` file contains both:

- **structure**: CMS tables, columns, indexes, sequences, functions, triggers
  and constraints;
- **data**: CMS entries, English/Hindi content, CMS users, media records,
  feedback, visits and audit records stored in those tables.

The backup is checked before it is accepted. After a valid new backup is
created, older automatically named
`rsac_custom_cms_YYYYMMDD_HHMMSS.sql` backups are deleted. Safety `.dump`
files and unrelated backup files are kept.

The SQL backup does not contain:

- `.env.local` or its passwords;
- the PostgreSQL server installation or global database roles;
- files inside `server/uploads/`;
- files inside `public/`; or
- the large `public/documents/flood/` archive.

Back up `server/uploads/` and `public/documents/flood/` separately whenever
those folders contain required files.

## 10. What does `npm run cms:restore` do?

```cmd
npm run cms:restore -- backups\rsac_custom_cms_YYYYMMDD_HHMMSS.sql
```

The target database and `.env.local` must already exist. On a new computer,
run `npm run cms:setup` once before restore.

Restore then:

1. Accepts only a PostgreSQL plain-text `.sql` file located inside
   `backups/`.
2. Confirms that the target is the expected `rsac_custom_cms` database.
3. Checks that the SQL file is a PostgreSQL dump containing the required
   `cms_entries` table.
4. Refuses SQL that tries to create or switch to another database.
5. Creates a custom-format safety `.dump` of the target database before making
   changes.
6. Drops only this project’s existing CMS tables, sequences and functions.
7. Executes the selected SQL in a single transaction.
8. Recreates the CMS tables, columns and related structure from the SQL file.
9. Inserts the records contained in the SQL file.
10. Returns ownership and permissions to the restricted application user.
11. Verifies the restored entry, published-record and collection counts.
12. Keeps the safety `.dump` for emergency rollback.

Therefore, `cms:restore` is **not data-only**. It restores both structure and
data from the `.sql` backup.

Restore replaces the target CMS state. It does not merge edits from two
databases. Decide which backup is authoritative before restoring.

Restore does not:

- create PostgreSQL itself;
- create the target database when setup has never been run;
- copy `server/uploads/` or flood-report files; or
- restore passwords stored only in `.env.local`.

## 11. What is the `pre-restore-....dump` file?

Before replacing any CMS tables, restore creates:

```text
backups\pre-restore-rsac_custom_cms-DATE-TIME.dump
```

This is an emergency snapshot of the target database exactly as it existed
immediately before restoration. It is PostgreSQL custom archive format and is
normally restored with `pg_restore`.

The project’s `npm run cms:restore` command intentionally accepts only `.sql`;
it does not accept `.dump`. Keep the `.dump` until the restored website, CMS,
English/Hindi content and media links have been checked.

### Are `.sql` and `.dump` the same?

Both normally contain database structure and data, but they use different
formats and may represent different moments:

| File | Format | Created when | Used for |
|---|---|---|---|
| `rsac_custom_cms_....sql` | Readable plain text | `npm run cms:backup` | Normal transfer and `npm run cms:restore` |
| `pre-restore-....dump` | PostgreSQL custom archive | Immediately before restore | Emergency rollback of the previous target state |

A `.sql` file can be inspected in a text editor and is executed with `psql`.
A `.dump` file is an archive intended for PostgreSQL tools such as
`pg_restore`.

They are not automatically identical. The normal `.sql` may contain the source
computer’s database from backup time, while the safety `.dump` contains the
target computer’s database immediately before it was replaced.

### Structure-only and data-only clarification

The project’s normal commands are deliberately complete:

| Command | Creates database/schema | Inserts content |
|---|---:|---:|
| `npm run cms:setup` on an empty database | Yes | Yes, starter seed |
| `npm run cms:setup` on a populated database | Updates schema | Keeps existing entries and runs repairs |
| `npm run cms:backup` | Saves structure | Saves data |
| `npm run cms:restore -- backups\FILE.sql` | Recreates CMS structure | Restores backed-up data |

There is currently no project command that performs only a schema restore or
only a data restore.

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
npm ci --include=dev
npm run cms:setup
npm run cms:restore -- backups\YOUR_BACKUP.sql
npm run dev:all
```

Meaning:

1. `npm ci --include=dev` installs the project packages.
2. `cms:setup` creates the target database, tables, application user, CMS login
   and temporary starter data.
3. `cms:restore` replaces that starter state with the backed-up source database,
   including its structure and records.
4. `dev:all` starts the website, CMS portal and API.

If there is no source SQL backup, skip restore and use the starter seed content.
Copy `server/uploads/` and `public/documents/flood/` before checking media.

Open:

```text
Website: http://localhost:5173
CMS:     http://localhost:5174
API:     http://localhost:3000
```
