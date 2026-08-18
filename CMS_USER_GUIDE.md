# RSAC-UP CMS Editing Guide

This guide is for website editors. No coding, JSON, HTML, or database knowledge
is required.

## Start and Sign In

For local editing, ask the technical administrator to start the project or run:

```cmd
npm run dev:all
```

Open `http://localhost:5174`. Sign in with the username and password provided by
the CMS administrator. Never share the password or `.env.local`.

## The Safest Editing Method

Use the same seven steps for almost every change:

1. Open **Collections** and choose the website area.
2. Search for the current page, card, person, report, or heading.
3. Open it and edit **English**.
4. Open the **Hindi** tab and enter the approved Hindi separately.
5. Click **Preview**. Keep that preview tab open while editing; unsaved changes
   update there automatically.
6. Check visibility and order, then click **Save**.
7. Click **Open website** and verify both languages on the live page.

The CMS does not auto-translate. A blank Hindi field stays blank. Images and
documents are usually shared by both languages, while captions and alt text can
be different.

## Understand the Three Visibility Choices

| Choice | Result |
| --- | --- |
| **Published / Visible** | Appears on the public website after Save. |
| **Draft / Hidden** | Stays editable in CMS but is removed from website and preview. |
| **Archived** | Kept as an old CMS record but removed from website and preview. |

Use Draft when content may return. Use Archive when it is no longer active.

## Understand Display Order

Lower numbers appear first:

```text
0 = first
1 = second
2 = third
```

Use a different number for each item in the same list. In dated lists such as
new reports, the CMS may automatically place the newest item first.

## Where to Find Content

### Homepage

| What you want to edit | Open in CMS |
| --- | --- |
| Homepage section visibility, order, text sizes, Hero text, About text, section headings, location, gallery heading, footer text | **Homepage and Global Text** |
| Hero video/poster | **Hero Banners / Videos** |
| Objective, Implementation, Approach, Sphere of Activities, and similar tabs | **Homepage Tab Names, Icons and Order** |
| Full text opened by those homepage tabs | **Homepage Tab Pages** |
| Service cards | **Services / Programme Cards** |
| Application cards | **Application Cards** |
| Agriculture, Forest, Water, Disaster/Flood and other operational cards | **Operational Domains** |
| Statistics | **Impact Statistics** |
| Quick links | **Quick Links** |
| Geoportal cards | **Geoportals** |
| Homepage leadership people | **People and Our Formers -> Leadership** |
| What's New items | **Notices** and **Tenders** |

### Divisions, Facilities, About, and Academics

| Website area | Open in CMS |
| --- | --- |
| Division directory card | **Divisions** |
| Division detail-page sections | **Division page sections** |
| Facility pages | **Pages -> Facilities** |
| About pages | **Pages -> About Pages** |
| Training and School of Geo-Informatics | **Pages -> Training and Academics** |
| Other page-builder pages | **Pages -> Other Website Pages** |

For a detail page, first choose the page, then choose the exact section. This
prevents changing an unrelated part of the page.

### People and Our Formers

| Website content | Open in CMS |
| --- | --- |
| People-page headings and introductions | **People Page Headings and Labels** |
| Former Chairmen and Directors | **Our Formers: Chairmen and Directors** |
| Former Scientists | **Our Formers: Former Scientists** |
| Scientific Manpower page sections | **Scientific Manpower Page** |
| Current Scientists | **Current Scientists** |
| Leadership | **Leadership** |
| Officials | **Officials** |
| Technical Staff | **Technical Staff** |
| Administration and Auxiliary Staff | **Administration Profiles** |
| Manpower summary cards | **Manpower Groups** |
| Organisation chart | **Organisation Chart** |

### Public Information and Navigation

| Website content | Open in CMS |
| --- | --- |
| RTI | **RTI Page** |
| Appellate Authority | **Appellate Authority Page** |
| Memorandum of Association | **Memorandum Page** |
| General Service Rules | **General Service Rules Page** |
| Feedback page text | **Feedback Page** |
| Tender records | **Tenders** |
| FAQ questions and answers | **FAQ** |
| Policies, Terms, Privacy, Disclaimer, Help, Hyperlinking | **Website Policies** |
| Notices | **Notices** |
| Flood page headings/settings | **Flood Page Settings** |
| Flood report PDFs | **Flood Reports** |
| Gallery photographs | **Gallery** |
| Mobile applications | **Mobile Apps** |
| Header/footer menus | **Header / Footer Menu** |
| Page title, small heading, introduction, size, or extra before/after content | **Page Headings** |
| Website fonts and global appearance | **Design Settings** |
| Address, phones, emails, and map information | **Contact** |
| Header/footer logos | **Header / Footer Logos** |

## Edit Normal Text

1. Open the correct collection.
2. Search using a visible title or name.
3. Edit the English field.
4. Open Hindi and edit the corresponding Hindi field.
5. Preview, Save, and check the website.

Do not change **Internal key**, slug, route, or technical path unless a technical
administrator has asked you to.

## Use the Rich-Text Editor

Select the text first, then choose a toolbar action:

- **B**, *I*, and underline for emphasis;
- H2, H3, or H4 for real section headings;
- bullet or numbered list for separate items;
- quote for quoted text;
- link for a page/document link;
- table for structured rows and columns;
- text colour for selected foreground text;
- left, centre, or right alignment where available;
- clear formatting to remove unwanted styles.

Hover over a toolbar button to read what it does. Avoid making entire paragraphs
bold. Use proper lists instead of typing bullets or serial numbers manually.

## Edit a Division or Facility Section

1. Open **Division page sections** or **Pages -> Facilities**.
2. Choose the division/facility.
3. Choose the exact section, such as Overview, Projects, Research Papers,
   Software, Hardware, Instruments, or Map/Photos.
4. Edit the complete section in its rich-text editor.
5. Repeat in Hindi.
6. Use Preview, then Save.

To create another section, choose **Add a new section**, enter its heading and
content in both languages, set its order/visibility, preview, and save.

## Add a Research Paper, Project, or Report

1. Open the division and the correct section.
2. Click **Add latest item**.
3. Edit the new item that appears at the top.
4. Do not type its serial number manually.
5. Add the matching Hindi item.
6. Save and check both languages.

Use the move controls to change order and the bin button to remove an item.

## Add or Replace an Image

1. Open the correct card, person, page, or section.
2. Use **Upload** or **Upload / replace** in its image field.
3. Choose a local image file.
4. Enter clear English and Hindi alt text/captions.
5. Save and verify the crop on desktop and mobile.

Do not paste a filesystem path such as `C:\Users\...`. The CMS upload button
stores the file correctly. Leaving an optional image empty should leave that
image area empty unless the field clearly says a default is used.

For a face that needs repositioning, use **Photo position** only when available,
for example `center 22%`.

## Add or Replace a PDF/Document

1. Open the matching notice, tender, policy, service page, Flood report, or page
   section.
2. Use **Upload document** or **Upload / replace**.
3. Enter a human-readable title, date, language, and description where shown.
4. Preview or open the document before saving.
5. Save and test the public download/view button.

Do not type a local computer file path into a URL field.

## Add a Person

1. Open the exact People collection, for example **Current Scientists**.
2. Click **Add new**.
3. Enter name, designation, role, contact/details, and photograph.
4. Enter the approved Hindi details.
5. Set the page/division relationship if that field is shown.
6. Set display order and Published visibility.
7. Preview and Save.

If the CMS warns about a duplicate name, employee ID, email, or photograph,
search for the existing profile and edit it instead of creating another.

## Add or Edit a Homepage Card

Open the matching collection, not only **Homepage and Global Text**:

- **Operational Domains** for individual domain cards;
- **Services / Programme Cards** for services;
- **Application Cards** for applications;
- **Quick Links** for quick links;
- **Geoportals** for geoportal cards;
- **Impact Statistics** for statistics.

Choose an icon from the dropdown, enter both languages, set order/visibility,
preview, and save.

## Hide a Homepage Card

Open the individual card, change visibility to **Draft / Hidden**, and keep the
private preview open. The card should disappear from preview before Save. Save
only after checking the remaining layout.

## Edit Header, Footer, or Sitemap

- Use **Header / Footer Menu** for navigation items and child links.
- Use **Homepage and Global Text -> Footer** for footer description/headings.
- Use **Contact** for address, phone, email, and map details.
- Use the Sitemap section inside **Homepage and Global Text** for sitemap text.

Archive a menu item only after checking that no important page becomes
unreachable.

## Edit Flood Reports

- Open **Flood Page Settings** for page headings and explanatory text.
- Open **Flood Reports** for year/date, district/subject, PDF, language, and
  visibility.
- Search by year or district instead of scrolling through the whole archive.
- Test the PDF after Save.

## Preview and Publishing

Private preview lasts for a limited period and does not save to PostgreSQL.
After opening Preview once, unsaved edits update the same preview tab.

Before Save, check:

- correct English and Hindi;
- no missing paragraph or list item;
- heading sizes and alignment;
- image, video, and PDF;
- desktop and narrow/mobile width;
- Published/Draft/Archived status;
- display order;
- links open the intended local page/document.

After Save, exit private preview and check the public website. Published changes
normally refresh quickly without a hard reload.

## Users and Permissions

Only an administrator can create/delete users or change permissions.

When creating an editor:

1. Enter every field marked with a red `*`.
2. Use a unique username.
3. Set a strong temporary password.
4. Keep the role as **Editor** unless this is the one approved administrator.
5. Tick only the website areas that person may edit.
6. Ask the user to change the temporary password through **My password**.

## Common Problems

### Preview still shows old content

Keep only one preview tab, wait a moment, and confirm the item status. Close an
expired preview and click Preview again. Draft/Archived items should be absent.

### Saved change is not on the public website

Confirm the item is Published, then use **Open website** and exit private
preview. If it still differs, report the exact collection, item, language, and
field to the technical administrator.

### Image or PDF is missing

Upload it through the field again. Do not paste a local path. If an older upload
is missing after moving computers, the technical administrator must restore the
matching `server\uploads` or Flood folder.

### Cursor or formatting behaves unexpectedly

Click inside the editor, select only the intended text, apply one toolbar action,
and preview. If the problem repeats, do not repeatedly save; report the page,
language, editor, and action.

### CMS login is forgotten

Ask the administrator to reset it. Do not edit database records directly.

## Final Rule

Change one understandable item at a time, preview both languages, and save only
after the page looks correct. For technical keys, routes, database recovery, or
server transfer, stop and ask the technical administrator.
