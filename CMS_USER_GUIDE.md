# RSAC-UP CMS User Guide

This guide is for website editors. No coding is required.

## Sign In

1. Start the project with `npm.cmd run dev:all`.
2. Open `http://localhost:5174`.
3. Username: `admin`.
4. Password: open `.env.local` and use the value beside `CMS_ADMIN_PASSWORD`.
5. Do not send the password or `.env.local` to anyone.

## Safe Editing Rule

1. Find the website area on **Collections**.
2. Click **View and edit** for existing content, or **Add new** to create content immediately.
3. Edit **English** first.
4. Select the **Hindi** tab and enter the approved Hindi manually.
5. Keep URLs, files, slugs, keys, and technical values unchanged unless necessary.
6. Click **Preview English** or **Preview हिन्दी**. This opens a private 15-minute preview; the live website and database are not changed.
7. New content starts as **Published - visible**. Change it to Draft only when it must remain hidden.
8. When the preview is correct, click **Save**, then use **Open website** to verify the published page.

Hindi fields override English fields in Hindi mode. A shared field, such as a URL or image, is used by both languages. The CMS does not auto-translate.

Saved published content normally appears within 2 seconds. A hard refresh is not normally required. Use **Exit preview** before checking the live page.

## Add, Hide, Reorder, Restore

- **Add:** open the correct collection and click **Add new**.
- **Hide temporarily:** change Status to `draft`.
- **Remove from website:** use Archive. This is a soft removal; the database row remains.
- **Reorder cards:** use Sort order. Lower numbers appear first. For example, Computer Image Processing `0` and Agriculture `1` places Computer first on the Divisions page.
- **Avoid duplicate pages:** never change an existing Internal key unless the URL/data relationship must change.
- **Undo a bad edit:** open Audit history, identify the changed item, and re-enter the previous value. Database administrators can also restore a backup.

## Page Builder

Open **About Pages**, **Division Content**, **Facilities**, **Training and Academics**, or **Other Website Pages**. Each page appears in one editor only. Edit a page and use **Flexible page blocks**. Blocks automatically stack and resize responsively.

- **Hero banner:** title, text, background image, and action link.
- **Text / paragraph:** headings and formatted content.
- **Responsive cards:** click **Add item**, then enter title, description, and URL in separate fields.
- **Image:** image, alt text, caption, and optional link.
- **Gallery:** responsive image group.
- **Statistics:** label/value cards.
- **Links / downloads:** useful links and documents.
- **Table:** headings and rows; wide tables scroll on small screens.
- **Notice / callout:** highlighted important information.
- **Divider line:** visual separation. Remove the block to remove the line.

Each block can be moved up/down, duplicated, hidden, or removed. **Section layout** controls its text size, image size, spacing, frame, and columns where applicable. Cards, lists, links, gallery items, statistics, and tables use separate fields with **Add item** or **Add table row** buttons. Always provide meaningful alt text for informative images. Do not put important text only inside an image.

## What Each Collection Controls

| Collection | Website area |
|---|---|
| About Pages | Chairman, vision, organisation, and other About pages |
| Division Content | Every division detail page, with focused editors for each section |
| Facilities | All 10 facility pages, descriptions, images, and page blocks |
| Training and Academics | Training Division and School of Geo-Informatics pages |
| Other Website Pages | Policy, service, programme, and public-information pages without another dedicated editor |
| Page Groups | Top-level page groups and introductions |
| Divisions | Division cards and summaries |
| Facility Ordering Data | Advanced ordering records for facility directory cards |
| Scientists / Officials / Staff | People, roles, photos, contact and profile details |
| Projects | Ongoing and completed projects |
| Publications / Research / Reports | Papers, publications, technical reports, atlases and plans |
| Notices | Public notices and dates |
| Tenders | Tender notices, documents and closing dates |
| FAQ | Individual questions and answers |
| Public Service Pages | RTI, Feedback, Tenders, and FAQ page sections, officers, and documents |
| Website Policies | Terms, Privacy, Copyright, Accessibility, Disclaimer, Help, and Hyperlinking pages |
| Gallery | Images, captions and alt text |
| Downloads | Public files and download cards |
| Flood Reports | Flood report dates, coverage and files |
| Mobile Apps | App titles, descriptions, contextual thumbnails and download links |
| Header / Footer Menu | Main navigation and child links |
| Contact | Address, phone, email and officers |
| Homepage and Global Text | Homepage visibility/order, Hero, About, Services, Statistics, Location, optional sections, Gallery and Footer text |
| Page Headings | Rename, resize, or hide headings; adjust layout; and add optional text, photos, galleries, cards, tables, or downloads before/after any page path |
| Design Settings | Change bundled English/Hindi font families and responsive base font size |
| Hero Banners / Videos | Homepage hero media |
| Header / Footer Logos | RSAC and government logos |
| Homepage Feature Tabs | Homepage objective, approach and activity tabs |
| Services / Programme Cards | Homepage service cards |
| Application Cards | Homepage application cards |
| Quick Links | Homepage quick links |
| Geoportals | Geoportal cards and URLs |
| Operational Domains | Homepage operational-domain cards |
| Impact Statistics | Homepage statistics |
| Manpower Groups | Manpower summary cards |
| Organisation Chart | Organisation roles, names and photographs |

## Common Tasks

### Edit Existing Text

Open the matching collection, search by title, edit English and Hindi, then save. Keep the website tab open; it refreshes automatically within 2 seconds.

### Edit or Add a Facility

To edit an existing facility:

1. Open **Facilities** under **Pages** and click **Choose page**.
2. Choose the laboratory, library, hostel, technical cell, or service block.
3. Choose only the section to edit, such as Overview, Hardware, Instruments, or Major Activities.
4. Edit the complete section in the rich-text box. Press Enter for another paragraph; use the toolbar for headings, lists, links, tables, quotes, bold, italic, or underline. Switch to **हिन्दी** and enter Hindi separately.
5. Click **Save** and verify the facility page. The directory-card summary and the detail-page section text are separate fields; edit **Page heading and layout** for the card summary, or choose the exact content section for body text.

Use **Add new** on the Facilities card only when creating a completely new facility page. Existing facility editing never shows raw HTML.

The same three-step editor is used by **About Pages** and **Training and Academics**: choose page, choose section, edit its complete text.

## Where Every Homepage Item Is Edited

| Homepage content | Open this CMS collection |
|---|---|
| Show, hide or reorder complete homepage sections | Homepage and Global Text -> Homepage section visibility and order |
| Increase/decrease homepage section headings and paragraph/card text | Homepage and Global Text -> Homepage text sizes |
| Hero heading, description lines, statistics, leader names/photos and buttons | Homepage and Global Text -> Homepage hero |
| Hero video or poster | Hero Banners / Videos |
| Objective, Implementation, Approach, Sphere of Activities and Mobile Apps tabs | Homepage Feature Tabs |
| Operational-domain heading, buttons and card labels | Homepage and Global Text -> Operational domains section |
| Agriculture, Forest, Water and other orbit cards | Operational Domains |
| About heading, description, cards, facts, note and buttons | Homepage and Global Text -> About section |
| Service-section headings | Homepage and Global Text -> Services and applications |
| Individual service cards | Services / Programme Cards |
| Individual application cards | Application Cards |
| Statistics-section heading | Homepage and Global Text -> Statistics section |
| Individual statistics | Impact Statistics |
| Location/Visit label, its size, address, map query and directions label | Homepage and Global Text -> Location section |
| Leadership/update headings | Homepage and Global Text -> Optional homepage sections |
| Leadership people | Scientists / Officials / Staff |
| What's New scrolling records | Notices and Tenders |
| Quick-link heading and action label | Homepage and Global Text -> Optional homepage sections |
| Individual quick links | Quick Links |
| Geoportal heading | Homepage and Global Text -> Optional homepage sections |
| Individual geoportals | Geoportals |
| Gallery heading and button | Homepage and Global Text -> Photo gallery |
| Gallery photographs | Gallery |
| Footer description, Contact / संपर्क heading and its size | Homepage and Global Text -> Footer |
| Related-institution footer links | Homepage and Global Text -> Footer |
| Header and footer navigation menus | Header / Footer Menu |

English and Hindi have separate tabs inside **Homepage and Global Text**. Section visibility/order is saved for both language records; keep both layouts aligned.

The footer **Last updated** date is automatic. It reflects the newest CMS content change, including an archive/removal, and does not need to be typed after every edit. The stored Review date is used only if the database has no update timestamp.

### Change Card Pictures and Themes

- **Mobile app thumbnail:** open **Mobile Apps**, edit the app, use **App thumbnail** to upload/replace its picture, then Save. Leaving it empty uses the approved contextual default.
- **Division picture:** open **Division Content**, choose the division, open **Page heading and layout**, and use **Featured image**.
- **Facility picture:** open **Facilities**, choose the facility, open **Page heading and layout**, and use **Featured image**. Public cards keep their responsive crop automatically.
- Division and facility icons, colours, and patterns are selected automatically from their subject. Water Analysis, Surface Water, Groundwater, Soil, LiDAR, Library, Data Bank, Hostel, and other cards have separate themes.
- Advanced card colours can be changed only when necessary. Always check English, Hindi, phone, and desktop views after a visual change.

### Remove a Heading

For the Gallery heading, open **Homepage and Global Text**, then **Photo gallery**, and clear **Main heading**. For another route, open **Page Headings** and choose its path. Use **Hide main heading** to hide it or **Hide introduction** to remove the paragraph below it. For Geo Portals, edit the `/geoportals` row. A blank override keeps the page's existing text, which allows layout-only settings without renaming the page.

### Add a Notice, Tender, Project, or Publication

Open its collection, choose **Add new**, fill title and details, upload/select the document URL, set the order, enter Hindi, publish, and verify the link.

### Add a Research Paper, Completed Project, or Other Division List Item

1. Click **Division content** and choose the division.
2. Choose **Research Papers**, **Completed Projects**, **Ongoing Projects**, **Technical Reports**, or the required section.
3. Click **Add latest item**. A blank item appears automatically at number 1.
4. Click that item in the small **List items** panel. The main editor moves to it. Type and format the content there.
5. Use arrow buttons or drag the handle to reorder. Use the bin button to delete. Numbering updates automatically.
6. Use **Bullet list** or **Numbered list** inside an item to add sub-items.
7. Switch to **हिन्दी** and enter the approved Hindi version separately.
8. Click **Save**, then verify the same website tab in both languages.

There is no separate Division List Items editor. One section rich-text box is the only active source for that section.

### Edit an Existing Division Research Paper

Example: edit item 2 in Computer Image Processing Division.

1. Click **Division content** in the CMS left menu.
2. Choose **Computer Image Processing & Data Management Division**.
3. Choose **Research Paper / Articles**.
4. One complete research-paper editor opens. Click the second numbered item and edit it directly.
5. Switch to **हिन्दी** and edit the corresponding approved Hindi separately.
6. Click **Save**, wait about 3 seconds, then verify the Research Paper tab on the website.

To add a paper at number **1**, click **Add latest item**. Use the item panel to edit, move, or delete it. Do not type serial numbers manually.

The Division Content workspace never displays raw HTML or the full page form.

### Edit Any Division Section

1. Click **Division content** in the left menu and choose the division.
2. Choose the exact section: Overview, Software, Hardware, Projects, Technical Reports, Research Papers, Map/Photos, or another listed section.
3. The CMS opens only that section.
4. Edit its complete content in one rich-text box. Press Enter for a paragraph or list item; no Add block or Add line action is needed.
5. Use **Sections** to choose another section.
6. Repeat in the Hindi tab. English and Hindi are always stored separately.
7. Click **Save** and verify the matching website tab.

Select text and use **H2**, **H3**, **H4**, **Bold**, **Italic**, **Underline**, lists, links, tables, quotes, or **Clear formatting**. **Hide section** affects only the open language. Blank Hindi stays blank; it never copies English. English typed manually in a Hindi field remains English. Photos and files are shared, while captions and alt text are separate for each language.

For scientist names, roles, and profile photographs use **Scientists / Officials / Staff**. For uploaded public gallery photographs use **Gallery**. Those dedicated collections provide the correct photo, caption, and alt-text fields.

### Add an Image

Use **Upload** once in an image/media field. The same photograph or file is saved for English and Hindi. Switch language tabs to enter English and Hindi captions/alt text separately. Use JPEG/WebP for photographs and PNG/SVG only where appropriate. Compress large images before upload.

Uploaded files are stored in `server/uploads` and must be backed up or deployed together with the PostgreSQL database whenever saved content contains a `/uploads/...` URL. Bundled website assets and external image URLs do not require this folder. The server creates the folder automatically when it is missing.

Profile and CMS previews use one fixed frame, so portrait and landscape source photos remain visually consistent. For a face that needs repositioning, open **Scientists / Officials / Staff** and set **Photo position**, for example `center 22%`.

### Fix a Repeated Person or Photo Card

For a CMS person record, open **Scientists / Officials / Staff**, search the name, open both matching records, keep the complete one, and archive the extra. The CMS warns about existing possible duplicates and blocks a new same-type profile when its name, employee ID, email, or real profile photo matches another active record. Shared placeholder photos are allowed.

For an imported historical card on **Our Formers**, open **About Pages**, choose the source page, open **Page heading and layout**, and enter the exact unwanted visible name under **Hide profile cards**. Save once; this shared visibility control applies to English and Hindi. The website also removes repeated people automatically across Former Chairmen, Former Directors, and Former Scientists.

### Change Navigation

Open **Header / Footer Menu**. Keep existing paths when renaming labels. Child links use structured JSON; edit carefully and keep the same property names. Test every changed link.

### Change Homepage Layout

Edit Hero Banners, Homepage Feature Tabs, Services, Applications, Quick Links, Operational Domains, Impact Statistics, or Site Settings. Reorder using Sort order. Do not place excessive cards in one row; the frontend grid adapts automatically.

The five homepage tabs are **Objective**, **Implementation**, **Approach**, **Sphere of Activities**, and **Mobile Apps**. Edit each tab in **Homepage Feature Tabs**; do not recreate them in Site Settings.

### Create Another CMS User

Administrators open **Users**, choose **Add user**, select Editor or Administrator, and provide a temporary strong password. Editors can manage content. Administrators can also manage users. Deactivate old accounts instead of sharing one password.

### Edit Site-Wide Text

Open **Site Settings**. Normal editors see grouped text fields; technical JSON remains collapsed under **Advanced technical settings**. Use advanced settings only with developer support because it contains route and layout contracts.

### Hide or Rename a Page Heading

Open **Page Headings** and edit the row matching the page path, such as `/contact` or `/geoportals`. Check **Hide main heading** to remove the large heading or **Hide introduction** to remove its descriptive paragraph. Keep the small flag heading visible, then choose Small, Normal, or Large. The same row can set body text size, content width, content image size, and spacing. Add a new row for another exact route; `/divisions/*` can control every division detail page.

Use **Extra sections before the current page content** or **Extra sections after the current page content** when a route needs a new paragraph, photo, gallery, card group, table, notice, or downloadable file without changing its existing React section. Add, reorder, hide, restore, or remove blocks independently in English and Hindi. An empty block area changes nothing on the website.

### Change Website Fonts

Open **Design Settings**. Choose bundled English body, English heading, and Hindi fonts. Set Base font size from 14 to 20. Save and check desktop and mobile. The CMS rejects unsupported fonts and the frontend clamps unsafe sizes.

## Publishing Checklist

- English and Hindi reviewed by authorised staff
- Spelling, dates, phone numbers, and email verified
- Links and downloads open correctly
- Image alt text present
- No confidential/personal document uploaded accidentally
- Page checked at desktop and mobile width
- Header, footer, language toggle, keyboard focus, and route still work
- Audit history shows the expected change

## Password Reset

An administrator can set a new `CMS_ADMIN_PASSWORD` in ignored `.env.local`, then run:

```powershell
npm.cmd run cms:reset-admin
```

Restart `npm.cmd run dev:all` after reset.

## Preserve CMS Content Before Transfer

After approved changes, run:

```powershell
npm.cmd run cms:export-seed
```

This updates `server/seed-data.generated.json` without exporting passwords or sessions. PostgreSQL backups remain private and must never be committed to GitHub.
