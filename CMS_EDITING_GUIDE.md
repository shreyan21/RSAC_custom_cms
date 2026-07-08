# CMS Editing Guide

This is the short daily guide for content editors. For the full guide, open
`EDITING_GUIDE.md`.

## Daily Flow

1. Open Directus: `http://localhost:8055/admin`.
2. Go to **Content -> Start Here -> Editing Map**.
3. Search the website area you want to edit.
4. Open the collection named in **Edit Collection**.
5. Edit only normal form fields.
6. Upload images, videos, or PDFs inside that same row.
7. Set **Status = Published** when the item is ready.
8. Press **Save**.
9. Refresh the website.

## Do Not Touch

- Raw JSON
- Raw HTML
- Database IDs
- Content Key
- Fixed Section labels
- File paths
- Directus Settings / Data Model, unless a developer asks

## English And Hindi

- English fields change the English website.
- Hindi fields change the Hindi website.
- Hindi must be typed manually.
- No AI translation is built in.
- If Hindi is blank, that one value falls back to English.
- If English text is intentionally cleared in Directus, it stays blank.

## Homepage: Find the Centre, Institution at a Glance, Operational Domains

Open **Content -> Homepage -> Homepage Sections**.

Use one row per visible item:

- **Internal Key starts with `impact-stat-`**: edits one statistic card.
  `Summary` is the large number/value, `Title` is the label, and `Details` is
  the supporting line.
- **Internal Key starts with `operational-domain-`**: edits one card around the
  satellite sphere. To add another card, create a new row with this key prefix,
  fill title/summary/details/icon, set **Status = Published**, and set
  **Display Order**.
- **Internal Key is `location-card`**: edits the map card locality, address,
  directions label, and map search text. `Details` is the map search text.

To remove one Operational Domain card or one statistic card, set that row's
**Status = Archived**. For single-card areas such as **Find the Centre**, clear
the text/map fields instead of archiving the only row, otherwise the built-in
fallback may be used again until a published CMS row exists. Do not delete the
row unless you want the fallback/default row to be created again during a future
recovery seed.

While Directus content is loading, the website shows a loading message instead
of showing old fallback text for a second. If Directus is completely unavailable,
the built-in fallback data is still used so the public site does not crash.

## Remove Or Hide Text Without Confusion

Different actions have different meanings. Use this table before removing
anything.

| What you want | What to do in Directus | What happens on website |
|---|---|---|
| Remove English text from both English and Hindi site | Open the row, clear the **English Text** field completely, then Save | The English text stays blank. Hindi also becomes blank unless Hindi has its own filled value |
| Change Hindi text | Fill the **Hindi Text** field manually, then Save | Hindi site shows your Hindi text |
| Remove Hindi translation only, but keep English fallback | Clear the **Hindi Text** field, then Save | Hindi site shows English for that field |
| Hide the whole notice/report/gallery/profile/card | Change **Status** from Published to Draft/Archived, then Save | The whole item disappears from public website |
| Remove a PDF/image/video from an item | Clear the file/image picker inside that item, then Save | The item remains, but that media is removed or safely skipped |
| Remove a homepage Website Text override and restore default text | Delete the whole Website Text Editor row | Built-in fallback/default text returns |
| Hide homepage text and not show fallback | Keep the row, clear only the text field, then Save | Text stays blank; fallback does not return |

Important:

- Clear means delete all characters from the field. Do not leave spaces.
- Delete row is different from clear field.
- Blank Hindi normally falls back to English. This is intentional.
- To hide Hindi text while keeping English visible, do not clear only Hindi.
  That will show English. A developer must add a special hide toggle if that
  exact behavior is required.
- Never remove database IDs, Content Key, fixed labels, JSON, or HTML.

## सरल हिन्दी: text हटाने का सही तरीका

Directus में **field खाली करना** और **row delete करना** अलग-अलग काम हैं।

| आपको क्या चाहिए | Directus में क्या करें | Website पर क्या होगा |
|---|---|---|
| English text हटाना | **English Text** field पूरा खाली करें और Save करें | English text खाली रहेगा; Hindi भी खाली रहेगा अगर Hindi field भरा नहीं है |
| Hindi text बदलना | **Hindi Text** field में Hindi खुद लिखें और Save करें | Hindi site पर वही Hindi दिखेगी |
| Hindi हटाकर English दिखाना | **Hindi Text** field खाली करें | Hindi site उस field के लिए English दिखाएगी |
| पूरा notice/report/photo/profile/card छिपाना | **Status** को Draft/Archived करें | पूरा item public website से छिप जाएगा |
| PDF/image/video हटाना | उसी row के file/image picker को clear करें | item रहेगा, media हट जाएगा |
| Default homepage text वापस लाना | Website Text Editor की पूरी row delete करें | fallback/default text वापस आ जाएगा |
| Homepage text खाली रखना | row delete न करें; सिर्फ text field खाली करें | text खाली रहेगा, fallback वापस नहीं आएगा |

ध्यान रखें:

- Field खाली करते समय spaces भी हटा दें।
- Hindi field खाली करने पर English fallback दिखेगा।
- अगर English दिखती रहे लेकिन Hindi बिल्कुल खाली चाहिए, तो अभी normal editor
  से यह अलग से संभव नहीं है; इसके लिए developer को hide toggle जोड़ना होगा।

## Lists

For notices, flood reports, gallery, research papers, technical reports,
projects, and similar list sections:

- Add one item per CMS row or one page-text row.
- Do not type serial numbers.
- Use **Display Order** only when you need manual order.
- Otherwise newest date/year appears first where the page supports it.

## Simple Hindi

Directus में बदलाव करने के लिए पहले **Start Here -> Editing Map** खोलें। जिस
हिस्से को बदलना है उसे search करें, फिर guide में बताए गए collection को खोलें।
सिर्फ simple form fields बदलें। JSON, HTML, ID, Content Key, file path या Data
Model को न छुएं।

Hindi text खुद type करें। Hindi खाली होगी तो वही field English दिखाएगी। English
field खाली करने पर वह text site पर भी खाली रहेगा।
