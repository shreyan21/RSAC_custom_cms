# RSAC-UP CMS Editing Guide

This guide is for website editors. No coding, JSON, HTML, or database knowledge
is required.

Updated: 28 October 2026. Names below match the current custom CMS dashboard.
The guide applies to `D:\RSAC_custom_cms`. Developers can find setup, project
flow, image/video folders and backup requirements in
[DEVELOPER_HANDOVER.md](DEVELOPER_HANDOVER.md).

## Quick Navigation

- [Sign in and find the editor](#start-and-sign-in)
- [Choose the correct editing area](#where-to-find-content)
- [Keep shared content in one place](#one-place-for-each-change)
- [Upload a scientist or staff photo](#add-or-replace-an-image)
- [Change a homepage video or poster](#add-or-replace-a-homepage-video)
- [Upload a PDF](#add-or-replace-a-pdfdocument)
- [Preview and publish](#preview-and-publishing)
- [Find files and understand storage](#where-uploads-are-kept)
- [Troubleshoot a problem](#common-problems)

## Start and Sign In

Ask the technical administrator to start the applications if necessary.
On the configured office computer, the developer's startup command is:

```cmd
npm run dev:all
```

Open **http://192.168.100.64:5174** for the current office CMS. The public website
is **http://192.168.100.64:5173**. A production deployment normally uses the
organisation's website address followed by **`/cms/`**. Use localhost/127.0.0.1
only when a developer has configured that separate local setup; the office
CMS is currently bound to the office IP.

Sign in with the credentials supplied by the CMS administrator. Never share
the password or `.env.local`. Use **Edit website** in the sidebar to return to
the dashboard. On a small screen, open the navigation menu first.

The dashboard groups are **Homepage**, **Divisions**, **Website Pages**,
**Navigation and Appearance**, **People and Our Formers**, and **Public
Information**. Use **Search website areas...** to find the card named in this
guide. Cards may say **View and edit**, **Open editor**, **Choose page** or
**Choose division**. Only areas permitted for your account appear.

## The Safest Editing Method

Use the same seven steps for almost every change:

1. Open **Edit website**, then choose the website area.
2. Search for the current page, card, person, report, or heading.
3. Open it and edit **English**.
4. Open the **Hindi** tab and enter the approved Hindi separately.
5. Click **Preview**. Keep that preview tab open while editing; unsaved changes
   update there automatically.
6. Check visibility and order, wait for uploads to finish, then save. The button
   may say **Save**, **Publish changes**, **Save as draft** or **Save as archived**.
7. Open the normal public website and verify both languages outside the private
   preview. Use an **Open website** link if the editor provides one.

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
| Homepage section visibility, order, text sizes, Hero text, About text, section headings, location, gallery heading, footer text | **Homepage, Sitemap and Shared Text** |
| Hero video/poster | **Homepage Hero Media Playlist** |
| Objective, Implementation, Approach, Sphere of Activities, and similar tabs | **Homepage Tab Cards: Names, Icons and Order** |
| Full text opened by those homepage tabs | **Objective, Approach and Activity Page Content** |
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
| Division directory card | **Division Directory Cards** |
| Division detail-page sections | **Division Pages and Sections** |
| Facility pages | **Website Pages -> Facility Pages and Sections** |
| About pages | **Website Pages -> About and Institutional Pages** |
| Training and School of Geo-Informatics | **Website Pages -> Training and Academic Pages** |
| Other page-builder pages | **Website Pages -> Custom Standalone Pages** |

For a detail page, first choose the page, then choose the exact section. This
prevents changing an unrelated part of the page.

### People and Our Formers

| Website content | Open in CMS |
| --- | --- |
| People-page headings and introductions | **Shared People Page Text** |
| Former Chairmen and Directors | **Our Formers: Chairmen and Directors** |
| Former Scientists | **Our Formers: Former Scientists** |
| Scientific Manpower page sections | **Scientific Manpower Page** |
| Current Scientists | **Current Scientists** |
| Leadership | **Leadership** |
| Officials | **Government Officials** |
| Technical Staff | **Technical Staff** |
| Administration and Auxiliary Staff | **Administration Profiles** |
| Manpower summary cards | **Manpower Groups** |
| Organisation chart | **Organisation Chart** |

### Public Information and Navigation

| Website content | Open in CMS |
| --- | --- |
| RTI | **Right to Information (RTI)** |
| Appellate Authority | **Appellate Authority** |
| Memorandum of Association | **Memorandum of Association** |
| General Service Rules | **General Service Rules** |
| Feedback page text | **Feedback Page** |
| Tender records | **Tenders** |
| FAQ questions and answers | **Frequently Asked Questions** |
| Policies, Terms, Privacy, Disclaimer, Help, Hyperlinking | **Website Policies** |
| Notices | **Notices** |
| Flood page headings/settings | **Flood Page Settings** |
| Flood report PDFs | **Flood Reports** |
| Gallery photographs | **Gallery** |
| Mobile applications | **Mobile Apps** |
| Header/footer menus | **Header / Footer Menu** |
| Page title, small heading, introduction, size, or extra before/after content | **Page Headings and Subheadings** |
| Website fonts and global appearance | **Website Design and Fonts** |
| Address, phones, emails, and map information | **Contact** |
| Header/footer logos | **Header / Footer Logos** |

## One Place for Each Change

Follow the ownership messages in the editor. They help prevent the same content
being maintained in two places.

| Change | Correct owner |
| --- | --- |
| A scientist/staff member's name, master photograph or full details | The matching People profile, such as **Current Scientists**, **Technical Staff** or **Administration Profiles**. |
| Which people appear in a page roster, or extra text about a person on that page | The relevant page/roster editor. It references the master profile; it does not replace the master photo. |
| An organisation-chart role's photograph/details | **Organisation Chart**. Check the specific role rather than assuming it is the same record as a People profile. |
| The name/order of a division directory card | **Division Directory Cards**. |
| Text, photos and files inside an opened division | **Division Pages and Sections**. |
| Training or School of Geo-Informatics shared section content | The shared Division page editor. From **Training and Academic Pages**, use **Edit shared sections in Division Pages and Sections**. The Academic page keeps its own heading/layout. |
| A compact homepage tab label/icon/order | **Homepage Tab Cards: Names, Icons and Order**. Its opened page has a separate content editor. |
| A page heading already owned elsewhere | Use the destination named by the editor, often **Page Headings and Subheadings**. Do not add another override to compete with it. |

If a master field is read-only or its editing button is unavailable, ask the
administrator to check your permissions. Do not make a duplicate person or page
to get around a locked field. Leave Internal key, route, slug and technical
relationships unchanged during ordinary content edits.

## Edit Normal Text

1. Open the correct collection.
2. Search using a visible title or name.
3. Edit the English field.
4. Open Hindi and edit the corresponding Hindi field.
5. Preview, Save, and check the website.

Do not change **Internal key**, slug, route, or technical path unless a technical
administrator has asked you to.

## Create an Independent Page

1. Open **Website Pages -> Custom Standalone Pages** and choose **Add new**.
2. Enter the page title and content, then enter the approved Hindi separately.
3. Add the page's images/documents through its own fields and wait for uploads.
4. Preview, choose Published visibility and save. A standalone page uses
   `/standalone/:slug`, where the slug is the page's saved address identifier.
5. Check its normal website URL. If it should appear in navigation, add the
   appropriate link through **Header / Footer Menu** and check that link too.

Use the existing About/Division/Facility/Training editor for a page in one of
those areas. Do not create a standalone copy of an existing page merely to edit
its content. Leave generated identifiers and existing slugs unchanged unless a
technical administrator has reviewed the route change.

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

After clicking elsewhere in the text, select the desired words again before
applying a style. Text colour changes the letters; it does not add a background
highlight. Save, reopen the same section, and check the published page.

## Edit a Division or Facility Section

1. Open **Division Pages and Sections** or **Website Pages -> Facility Pages and Sections**.
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
2. In the section's rich-text box, add a paragraph or list item in the required
   position. Use the numbered-list toolbar when the section needs numbering.
3. Enter the title, authors, date and other approved details. Do not create a
   second standalone record for text owned by this section.
4. If there is an accompanying PDF, use the section's document/media control
   or its supported link action; verify the selected file opens.
5. Add the matching Hindi text in the Hindi tab.
6. Preview, Save and check both languages on the public page.

Use a displayed move/remove control when that editor provides one. In the
rich-text box, edit the paragraph/list itself; do not look for a separate row
editor for each sentence.

## Add or Replace an Image

1. Open the correct card, person, page, or section.
2. Use **Choose file** or **Replace file** in its image field.
3. Choose a local image file.
4. Enter clear English and Hindi alt text/captions.
5. Wait for upload completion, Save/Publish changes, then verify the crop on
   desktop and mobile. A selected thumbnail alone does not mean the record is
   published.

Photo fields accept JPG/JPEG, PNG, WebP, AVIF, GIF and SVG. Use a real image,
not a PDF renamed as an image. The default maximum upload is **25 MiB per file**.

Do not paste a filesystem path such as `C:\Users\...`. The CMS upload button
stores the file correctly. Leaving an optional image empty should leave that
image area empty unless the field clearly says a default is used.

For a face that needs repositioning, use **Photo position** only when available,
for example `center 22%`.

For a scientist's photograph, open **People and Our Formers -> Current
Scientists**, find that person, replace **Photo**, and save. The same photograph
is used in both languages and in the division's Scientific Manpower section.
You can choose the same filename again after editing the picture on your
computer. A successful upload gives it a new address, so the old cached picture
does not replace the new one. If an upload fails, the previous picture remains
selected; retry the upload before saving.

For technical or administrative staff, use **People and Our Formers ->
Technical Staff** or **Administration Profiles** and replace that person's
**Photo**. For gallery images, use **Public Information -> Gallery**. For a
public header/footer logo, use **Navigation and Appearance -> Header / Footer
Logos**. For an image inside a page, open that page and its media section.

If a section displays a master's photo as a read-only reference, update the
master profile above. Changing optional page-specific text does not replace
that shared photo.

## Add or Replace a Homepage Video

1. Open **Homepage -> Homepage Hero Media Playlist**.
2. Open the existing record, or use **Add new** for another playlist item.
3. Enter a useful **Internal media name**. This name helps editors identify it.
4. Use **Choose file / Replace file** in **Video** to upload an approved MP4 or
   WebM file. Optionally select a higher-resolution copy in **Large-screen
   video (optional)**.
5. Upload a real image in **Poster image**. It is used while loading and when
   video playback is unavailable or motion is reduced.
6. Enable **Include in homepage playlist**, choose Published visibility and set
   the intended display order. Both publication status and inclusion matter.
7. Wait for uploads, Preview, Publish/Save and verify the normal public homepage.

The default **25 MiB limit applies to each video too**. Ask the technical
administrator for an approved, compressed file if it is too large. Editing the
text-only **File name** field does not replace the actual video. Video playback
can depend on browser autoplay/reduced-motion settings, so check the poster as
well as the video.

A video inside a Division/Facility/other page belongs to that page's section
media editor. Replacing the homepage playlist does not replace every page video.

## Add or Replace a PDF/Document

1. Open the matching notice, tender, policy, service page, Flood report, or page
   section.
2. Use **Upload document** or **Upload / replace**.
3. Enter a human-readable title, date, language, and description where shown.
4. Preview or open the document before saving.
5. Save and test the public download/view button.

Do not type a local computer file path into a URL field.

General upload fields accept PDF, MP4/WebM, CSV, DOC/DOCX, XLS/XLSX, PPT/PPTX
and the supported image types, subject to the field and server rules. Existing
legacy APK downloads can already be linked on the website; APK, ZIP and audio
files are not accepted as new uploads by the current server. Ask the technical
administrator when a required format is unsupported.

## Where Uploads Are Kept

Editors normally do not need to open server folders. **Choose file** sends the
file to the CMS API, which creates a generated filename and returns its website
address. Saving the record connects that address to the person, page or card.

By default the bytes are stored in `server/uploads/`; the technical administrator
can configure another upload folder. PostgreSQL stores the URL and metadata,
not the file bytes. A single upload selection is often shared across English
and Hindi, with separate captions where the editor offers them.

Older content may point to `public/cms-media/`, named photo folders, the Flood
PDF archive or `public/official-media/` instead. These are valid existing stores;
do not move or rename them to make all pictures look as if they belong to one
folder. The [asset folder map](DEVELOPER_HANDOVER.md#asset-folder-map) explains
the exact paths, videos, fonts, icons and backup requirements.

Clearing a selected file or cancelling an editor does not prove its bytes were
removed from the server. Leave file cleanup to the technical administrator,
who can check references and backups first.

## Add a Person

1. Open the exact People collection, for example **Current Scientists**.
2. Click **Add new**.
3. Enter name, designation, role, contact/details, and photograph.
4. Enter the approved Hindi details.
5. Set the page/division relationship if that field is shown.
6. Set display order and Published visibility.
7. Preview and Save.

If the CMS warns about a duplicate name, employee ID or email, search for the
existing profile before creating another. A shared photograph is not a person's
identity: two distinct people may use the same picture without becoming the
same profile.

## Add or Edit a Homepage Card

Open the matching collection, not only **Homepage, Sitemap and Shared Text**:

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
- Use **Homepage, Sitemap and Shared Text -> Footer** for footer description/headings.
- Use **Contact** for address, phone, email, and map details.
- Use the Sitemap section inside **Homepage, Sitemap and Shared Text** for sitemap text.

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

### Save or Preview is unavailable

Wait for any upload to finish and correct the field error shown by the editor.
Check required fields and permissions. If the session expired, sign in again;
do not repeatedly click Save or create another copy of the record. If another
editor changed the same record, reload it and agree how to combine the changes.

### Image or PDF is missing

Upload it through the field again. Do not paste a local path. If an older upload
is missing after moving computers, the technical administrator must restore the
matching `server\uploads` or Flood folder.

### Video upload fails or only its poster appears

Check that the file is MP4/WebM and within the upload limit. Confirm the actual
Video field was replaced, the record is Published and **Include in homepage
playlist** is enabled. Browser autoplay and reduced-motion settings can prevent
playback even when the file is valid. Give the technical administrator the
record name and error message if the normal public page still differs.

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
