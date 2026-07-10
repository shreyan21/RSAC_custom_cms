# RSAC-UP Drupal Editing Guide

Use this file when you want to change website content from Drupal.

## 1. Open Drupal

Website:

```text
http://localhost:5173/
```

Drupal login:

```text
http://localhost:8080/user/login
```

After login, open the RSAC editing dashboard:

```text
http://localhost:8080/admin/content/rsac
```

This is the main editing screen. It shows every RSAC collection, its item count, and how many items have Hindi content.

### Which Database Is Used

- `rsac_cms` is the old read-only content source. It contains old CMS tables and must not be used as Drupal's live database.
- `rsac_drupal_local` is the active local Drupal PostgreSQL database.
- The website calls Drupal JSON:API at port `8080`. It does not call the old CMS API.
- Existing `rsac_cms` rows have been copied into Drupal. Normal editors only work in Drupal.

Username:

```text
admin
```

Password is not written in any document. To reset local password:

```powershell
cd D:\RSAC-Drupal-Test
$env:DRUPAL_LOCAL_ADMIN_PASSWORD="type-new-private-password-here"
.\.tools\php\php.exe .\local-drupal\vendor\drush\drush\drush.php --root=.\local-drupal\web php:script .\cms-drupal\reset-admin-password.php
Remove-Item Env:\DRUPAL_LOCAL_ADMIN_PASSWORD
```

## 2. The One Editing Rule

1. Open `Content -> RSAC Collections`, or use `/admin/content/rsac`.
2. Find the website area you want to change.
3. Click `Manage items` to see its rows.
4. Click `Edit English`, `Add Hindi`, or `Edit Hindi` beside the correct row.
5. Click `Save`.
6. Refresh `http://localhost:5173/` and check both languages.

Use `Add new` on a collection card to create a row. For Notices, Tenders, FAQ, Downloads, Flood Reports, Mobile Apps, Quick Links, and Geoportals, Drupal automatically selects the correct category.

Do not use `Structure -> Content types` for daily editing. That screen defines fields; it does not show website rows.

## 3. Direct Collection Links

Bookmark the main dashboard. These direct links are optional shortcuts:

| Website data | Drupal link |
|---|---|
| All RSAC collections | `http://localhost:8080/admin/content/rsac` |
| Pages | `http://localhost:8080/admin/content/rsac/pages` |
| Divisions | `http://localhost:8080/admin/content/rsac/divisions` |
| Scientists / Officials / Staff | `http://localhost:8080/admin/content/rsac/scientists_staff` |
| Projects | `http://localhost:8080/admin/content/rsac/projects` |
| Publications / Reports | `http://localhost:8080/admin/content/rsac/publications` |
| Notices | `http://localhost:8080/admin/content/rsac/notices` |
| Tenders | `http://localhost:8080/admin/content/rsac/tenders` |
| FAQ | `http://localhost:8080/admin/content/rsac/faq` |
| Gallery | `http://localhost:8080/admin/content/rsac/gallery` |
| Flood reports | `http://localhost:8080/admin/content/rsac/flood_reports` |
| Homepage feature tabs | `http://localhost:8080/admin/content/rsac/homepage_features` |
| Service cards | `http://localhost:8080/admin/content/rsac/service_cards` |
| Application cards | `http://localhost:8080/admin/content/rsac/applications` |
| Operational domains | `http://localhost:8080/admin/content/rsac/operational_domains` |
| Impact statistics | `http://localhost:8080/admin/content/rsac/impact_stats` |
| Menu / Footer | `http://localhost:8080/admin/content/rsac/menus` |

## 4. Current Seeded Content

This local Drupal DB already has starter pages, page groups, divisions, profiles, gallery items, notices, flood reports, mobile apps, menus, quick links, geoportals, contact information, and site settings. The dashboard shows the current live count for every collection.

`Project` and `Publication` content types are ready, but structured rows must be added manually. Their older content is still present inside division/page body content.

To reseed starter content:

```powershell
npm.cmd run cms:seed:drupal
```

Run seed only for local test/reset. It may update seeded rows.

## 5. English / Hindi Editing

Website language button still works.

Drupal language rule:

1. Open `RSAC Collections` and choose a collection.
2. Create or edit the English row first; keep `Published` checked and save.
3. Return to the collection list.
4. Click `Add Hindi` beside that row. If Hindi already exists, click `Edit Hindi`.
5. On the translation screen, click `Add` or `Edit` in the Hindi row.
6. Enter Hindi manually, keep it published, and save.

No automatic Hindi translation.

If Hindi is missing, website shows English.

## 6. What To Edit For Each Website Area

| Website area | Edit in Drupal |
|---|---|
| About pages | `Page` |
| Vision / Mission | `Page` |
| Division detail pages | `Page` |
| Division cards/list | `Division` |
| Facilities pages | `Page` |
| Scientists page | `Profile` with profile type `scientist` |
| Leadership/officials | `Profile` with profile type `official` or `leadership` |
| Former scientists/directors | `Profile` with profile type `former` |
| Administrative staff | `Profile` with profile type `administration` |
| Technical staff | `Profile` with profile type `technical` |
| Notices | `Notice / Tender / FAQ` with kind `notice` |
| Tenders | `Notice / Tender / FAQ` with kind `tender` |
| FAQ | `Notice / Tender / FAQ` with kind `faq` |
| Gallery photos | `Gallery Item` |
| Downloads | `Download` with kind `download` |
| Flood daily reports | `Download` with kind `flood_report` |
| Mobile apps | `Download` with kind `mobile_app` |
| Header/footer menu | `Menu Item` |
| Quick links | `Section Item` with section key `quick_links` |
| Geoportal cards | `Section Item` with section key `geoportals` |
| Objective / Implementation / Approach tabs | `Homepage Feature Tabs` |
| Homepage service cards | `Services / Programme Cards` |
| Homepage application cards | `Application Cards` |
| Cards around operational-domain sphere | `Operational Domains` |
| Homepage number/statistic cards | `Impact Statistics` |
| Contact page | `Contact` |
| Organisation chart | `Organisation Role` |
| Logos | `Brand Logo` |
| Homepage video | `Hero Video` |
| Homepage/global labels | `Site Setting` |
| Projects | `Project` |
| Research papers/reports | `Publication` |

## 7. Important Fields

Use these fields when visible:

| Field | Meaning |
|---|---|
| Title | public name/title |
| Slug | URL key, example `read-more-about-us` |
| Section key | group key, example `about-us`, `divisions`, `facilities` |
| Body | main page content |
| Summary | short card/list text |
| Sort order | order on website, lower comes first |
| Kind | content category, example `notice`, `tender`, `faq`, `flood_report` |
| URL | external or local file link |
| Image/File/Document | uploaded Drupal media |
| Alt text | image description for accessibility |
| Published | must be checked to show on website |

## 8. Flexible Page Builder

Every `Page` has `Flexible page blocks (JSON)`.

- Leave it empty: website uses `Body`, exactly as before.
- Add a valid JSON list: website uses these blocks instead of `Body`.
- Move a block up/down in JSON: website order changes.
- Delete a block: block disappears.
- Add `"hidden": true`: block stays saved but disappears from website.
- Add `"variant": "plain"`: outer border/background disappears.
- Set `"columns": 1`, `2`, `3`, or `4`: desktop card columns change. Mobile layout remains automatic.
- Invalid or empty JSON: website safely returns to `Body`/fallback.

### Add Text And Cards

Open a `Page`, find `Flexible page blocks (JSON)`, then paste and edit:

```json
[
  {
    "type": "rich_text",
    "heading": "Overview",
    "html": "<p>Write page text here.</p>"
  },
  {
    "type": "cards",
    "heading": "Services",
    "columns": 3,
    "items": [
      {
        "title": "Service One",
        "text": "Short description.",
        "url": "/services",
        "linkLabel": "Open"
      },
      {
        "title": "Service Two",
        "text": "Short description."
      }
    ]
  }
]
```

To add a card, copy one `{ ... }` card inside `items`, add a comma between cards, then edit its values.

### Other Block Types

Use one of these objects inside the main `[ ... ]` list:

```json
{ "type": "heading", "heading": "New heading", "intro": "Optional text" }
```

```json
{ "type": "list", "heading": "Highlights", "items": ["First", "Second"] }
```

```json
{ "type": "ordered_list", "heading": "Steps", "items": ["Step one", "Step two"] }
```

```json
{ "type": "stats", "heading": "At a glance", "columns": 4, "items": [{ "value": "75", "label": "Districts" }] }
```

```json
{ "type": "table", "heading": "Details", "headers": ["Name", "Year"], "rows": [["Project A", "2026"], ["Project B", "2025"]] }
```

```json
{ "type": "links", "heading": "Useful links", "items": [{ "title": "Open page", "url": "/about-us" }] }
```

```json
{ "type": "callout", "heading": "Important", "text": "Important public message." }
```

```json
{ "type": "divider" }
```

Remove a divider object to remove that line. Do not add custom CSS, widths, or pixel sizes; website controls these so desktop/mobile layout stays responsive.

### Related Links Field

`Related links (JSON)` adds buttons after page content:

```json
[
  { "title": "Download report", "url": "https://example.gov.in/report.pdf" },
  { "title": "Open division", "url": "/divisions" }
]
```

### Hindi Flexible Blocks

1. Save English page.
2. Click `Translate`.
3. Open Hindi translation.
4. Translate text inside `Flexible page blocks (JSON)` manually.
5. Keep property names such as `type`, `items`, `title`, and `url` in English.
6. Keep URLs unchanged.

## 9. Common Edits

### Edit About / Division / Facility Page

1. Open `RSAC Collections -> Pages -> Manage items`.
2. Open the page title or click `Edit English`.
4. Edit `Body`, `Summary`, `Slug`, or `Section key`.
5. Save.
6. Test website.

### Edit Division Card

1. Open `RSAC Collections -> Divisions -> Manage items`.
2. Open division.
3. Edit `Lead` and `Highlights`.
4. Save.

### Edit Scientist

1. Open `RSAC Collections -> Scientists / Officials / Staff -> Manage items`.
2. Open scientist.
3. Keep profile type = `scientist`.
4. Edit designation, deployment, employee ID, specialization, contact, email.
5. Save.

### Add Notice

1. Open `RSAC Collections -> Notices -> Add new`.
2. Title = notice title.
3. Kind = `notice`.
4. Add category/date/last date.
5. Upload PDF or add URL.
6. Publish.

### Add Tender

Open `RSAC Collections -> Tenders -> Add new`. Drupal preselects Kind = `tender`.

### Add FAQ

1. Open `RSAC Collections -> FAQ -> Add new`.
2. Title = question.
3. Kind = `faq`.
4. Body = answer.
5. Publish.

### Edit Gallery

1. Open `RSAC Collections -> Gallery -> Manage items`.
2. Open item.
3. Edit title/caption, image/URL, alt text.
4. Save.

### Edit Download / Flood Report

1. Open the matching `Downloads`, `Flood Reports`, or `Mobile Apps` collection.
2. Open item.
3. Kind = `download`, `flood_report`, or `mobile_app`.
4. Upload file or add URL.
5. Save.

### Edit Menu / Footer

1. Open `RSAC Collections -> Header / Footer Menu -> Manage items`.
2. Open menu row.
3. Edit title/path.
4. Use `Links JSON` for submenu links.
5. Save.

### Edit Contact

1. Open `RSAC Collections -> Contact -> Manage items`.
2. Open contact row.
3. Edit address, phone, mobile, email.
4. Save.

### Edit Homepage Cards

1. Open `RSAC Collections`.
2. Choose `Homepage Feature Tabs`, `Services / Programme Cards`, `Application Cards`, `Operational Domains`, or `Impact Statistics`.
3. Click `Edit English` beside the row.
4. Change title, summary, icon, link, statistic, or ordering fields shown on that form.
5. Save, then use `Add Hindi` or `Edit Hindi` for manual Hindi text.
6. Refresh the homepage and check desktop and mobile width.

Use `Sort order` to rearrange cards. Lower numbers appear first. Do not change `Key` or `Section key` on existing rows.

### Edit Global Headings, Footer, Colours, And Labels

1. Open `RSAC Collections -> Site Settings`.
2. Edit the English row for global settings.
3. Edit the Hindi translation separately.
4. Keep the JSON valid. This advanced record controls headings, footer text, approved design values, accessibility wording, homepage visibility, and interface labels.
5. Prefer the normal card collections above whenever a matching collection exists.

## 10. After Editing

Open website:

```text
http://localhost:5173/
```

Check:

- English page
- Hindi page
- mobile size
- uploaded file opens
- image alt text exists
- no private file uploaded

If the website does not show a saved change:

1. Confirm the English or Hindi row says `Published`.
2. Confirm you edited the right collection and language.
3. Press `Ctrl+F5` on the website.
4. Run `npm.cmd run cms:validate` to check Drupal connectivity.

## 11. Do Not Do

- do not edit code for normal content changes
- do not delete content types
- do not change machine names like `rsac_page`
- do not paste passwords into Drupal content
- do not commit `.env.local`
- do not upload private documents
- do not use auto-translation for official Hindi
- do not point Drupal at the old `rsac_cms` database
- do not restart or call the old CMS API

## 12. Reimport From The Old Database

This is an administrator-only recovery/migration command. It reads `rsac_cms` without changing it and updates Drupal rows. Do not run it for normal editing.

```powershell
$env:RSAC_SOURCE_DB_PASSWORD="your-private-postgres-password"
$env:RSAC_SOURCE_DB_USER="postgres"
$env:RSAC_SOURCE_DB_NAME="rsac_cms"
$env:RSAC_SOURCE_UPLOADS="D:\rsac_website\backend\directus\uploads"
npm.cmd run cms:migrate:rsac-db
Remove-Item Env:RSAC_SOURCE_DB_PASSWORD,Env:RSAC_SOURCE_DB_USER,Env:RSAC_SOURCE_DB_NAME,Env:RSAC_SOURCE_UPLOADS
```

Never write the real password into this guide, Git, or `.env.example`.
