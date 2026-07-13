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
6. New content starts as **Published - visible**. Change it to Draft only when it must remain hidden.
7. Click **Save**, then use **Open website** to verify desktop and mobile layout.

Hindi fields override English fields in Hindi mode. A shared field, such as a URL or image, is used by both languages. The CMS does not auto-translate.

Saved published content normally appears within about 3 seconds. A hard refresh is not normally required.

## Add, Hide, Reorder, Restore

- **Add:** open the correct collection and click **Add new**.
- **Hide temporarily:** change Status to `draft`.
- **Remove from website:** use Archive. This is a soft removal; the database row remains.
- **Reorder cards:** use Sort order. Lower numbers appear first. For example, Computer Image Processing `0` and Agriculture `1` places Computer first on the Divisions page.
- **Avoid duplicate pages:** never change an existing Internal key unless the URL/data relationship must change.
- **Undo a bad edit:** open Audit history, identify the changed item, and re-enter the previous value. Database administrators can also restore a backup.

## Page Builder

Open **About Pages**, **Division Content**, **Facilities**, **Training and Academics**, or **All Website Pages**. Edit a page and use **Flexible page blocks**. Blocks automatically stack and resize responsively.

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

Each block can be moved up/down, duplicated, hidden, or removed. Cards, lists, links, gallery items, statistics, and tables use separate fields with **Add item** or **Add table row** buttons. Always provide meaningful alt text for informative images. Do not put important text only inside an image.

## What Each Collection Controls

| Collection | Website area |
|---|---|
| About Pages | Chairman, vision, organisation, and other About pages |
| Division Content | Every division detail page, with focused editors for each section |
| Facilities | All 10 facility pages, descriptions, images, and page blocks |
| Training and Academics | Training Division and School of Geo-Informatics pages |
| All Website Pages | Combined advanced view of every full content page |
| Page Groups | Top-level page groups and introductions |
| Divisions | Division cards and summaries |
| Facility Ordering Data | Advanced ordering records for facility directory cards |
| Division List Items | Form-based division research papers, completed/ongoing projects, reports, publications and training lists |
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
| Page Headings | Rename, resize, or hide the small heading, main heading, and introduction for any page path |
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

Open the matching collection, search by title, edit English and Hindi, save, then refresh the website.

### Edit or Add a Facility

To edit an existing facility:

1. Open **Facilities** under **Pages** and click **Choose page**.
2. Choose the laboratory, library, hostel, technical cell, or service block.
3. Choose only the section to edit, such as Overview, Hardware, Instruments, or Major Activities.
4. Edit, search, remove, restore, or add a line. Switch to **हिन्दी** and enter Hindi separately.
5. Click **Save** and verify the facility page.

Use **Add new** on the Facilities card only when creating a completely new facility page. Existing facility editing never shows raw HTML.

The same three-step editor is used by **About Pages** and **Training and Academics**: choose page, choose section, edit rows.

## Where Every Homepage Item Is Edited

| Homepage content | Open this CMS collection |
|---|---|
| Show, hide or reorder complete homepage sections | Homepage and Global Text -> Homepage section visibility and order |
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
| Location heading, address, map query and directions label | Homepage and Global Text -> Location section |
| Leadership/update headings | Homepage and Global Text -> Optional homepage sections |
| Leadership people | Scientists / Officials / Staff |
| What's New scrolling records | Notices and Tenders |
| Quick-link heading and action label | Homepage and Global Text -> Optional homepage sections |
| Individual quick links | Quick Links |
| Geoportal heading | Homepage and Global Text -> Optional homepage sections |
| Individual geoportals | Geoportals |
| Gallery heading and button | Homepage and Global Text -> Photo gallery |
| Gallery photographs | Gallery |
| Footer description and labels | Homepage and Global Text -> Footer |
| Footer/menu links | Header / Footer Menu |

English and Hindi have separate tabs inside **Homepage and Global Text**. Section visibility/order is saved for both language records; keep both layouts aligned.

### Change Card Pictures and Themes

- **Mobile app thumbnail:** open **Mobile Apps**, edit the app, use **App thumbnail** to upload/replace its picture, then Save. Leaving it empty uses the approved contextual default.
- **Division or facility picture:** open **All Website Pages**, edit the page, and use **Featured image**. The public card keeps its responsive crop automatically.
- Division and facility icons, colours, and patterns are selected automatically from their subject. Water Analysis, Surface Water, Groundwater, Soil, LiDAR, Library, Data Bank, Hostel, and other cards have separate themes.
- Advanced card colours can be changed only when necessary. Always check English, Hindi, phone, and desktop views after a visual change.

### Remove a Heading

For the Gallery heading, open **Site Settings**, then **Photo gallery**, and clear **Main heading**. For another route, open **Page Headings** and choose its path. Clearing **Main page heading** automatically hides it; **Hide main heading** also hides it explicitly.

### Add a Notice, Tender, Project, or Publication

Open its collection, choose **Add new**, fill title and details, upload/select the document URL, set the order, enter Hindi, publish, and verify the link.

### Add a Research Paper, Completed Project, or Other Division List Item

1. Open **Division List Items**. Do not edit raw page HTML for a new list record.
2. Click **Add new**.
3. Choose the **Division** where the item must appear.
4. Choose **Website section**, such as Research Papers, Completed Projects, Ongoing Projects, Technical Reports, Publications, Training Programmes, or Training Hostel.
5. In **English**, enter Item title. Add authors/officers, journal/department, description or citation, year/date, and document/web link when relevant.
6. Select the **Hindi** tab. Enter the approved Hindi title and other Hindi text manually. Division, section, year, date and links are shared.
7. Set Status to **Published** and click **Save**. Published items require a Hindi title.
8. Open that division on the website and select the chosen section.

New item automatically appears at top as number **1**. Older items continue as **2, 3, 4...**. No Sort order or raw text editing needed. If section did not exist on division page, CMS creates responsive section tab automatically. Use Draft to hide temporarily or Archive to remove it from website.

### Edit an Existing Division Research Paper

Example: edit item 2 in Computer Image Processing Division.

1. Click **Division content** in the CMS left menu.
2. Choose **Computer Image Processing & Data Management Division**.
3. Choose **Research Paper / Articles**.
4. Only research-paper rows now appear. Edit **Item 2** directly or use the search box.
5. Switch to **हिन्दी** and edit the corresponding approved Hindi separately.
6. Click **Save**, wait about 3 seconds, then verify the Research Paper tab on the website.

To add a simple research-paper row from this same editor, click **Add item at top**. It becomes number **1** after Save. To remove an old row, use its trash button; **Restore removed items** is available before Save. For papers needing separate authors, year, journal, file, or URL fields, use **Division List Items > Add new** instead.

The Division Content workspace never displays raw HTML or the full page form.

### Edit Any Division Section

1. Click **Division content** in the left menu and choose the division.
2. Choose the exact section: Overview, Software, Hardware, Projects, Technical Reports, Research Papers, Map/Photos, or another listed section.
3. The CMS opens only that section.
4. Search its rows, edit a row, use the trash button to remove a row, or use **Add line at top**.
5. Use **Sections** to choose another section.
6. Repeat in the Hindi tab. English and Hindi are always stored separately.
7. Click **Save** and verify the matching website tab.

Long sections use their own short scroll area and search box. For scientist names, roles, and profile photographs use **Scientists / Officials / Staff**. For uploaded public gallery photographs use **Gallery**. Those dedicated collections provide the correct photo, caption, and alt-text fields.

### Add an Image

Use **Upload** in an image/media field. Use JPEG/WebP for photographs and PNG/SVG only where appropriate. Compress large images before upload. Add English and Hindi captions/alt text.

Profile and CMS previews use one fixed frame, so portrait and landscape source photos remain visually consistent. For a face that needs repositioning, open **Scientists / Officials / Staff** and set **Photo position**, for example `center 22%`.

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

Open **Page Headings** and edit the row matching the page path, such as `/contact`. Check **Hide main heading** to remove only the large repeated heading. Keep the small flag heading visible, then choose Compact, Normal, or Large. Add a new row for another exact route; `/divisions/*` can control every division detail page.

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
