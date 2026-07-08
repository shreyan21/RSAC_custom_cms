# Hindi Content Guide

## English
Hindi content should be typed manually in Directus.

## Manual Hindi, latest-first lists, and preview

### English
- Hindi must be typed manually in Directus. Do not auto-translate and do not overwrite good Hindi.
- If Hindi is blank, that value falls back to English. Other Hindi fields stay as typed.
- Do not type serial numbers in Hindi content. The website creates `1, 2, 3...` after sorting.
- For Hindi list rows in `Notices`, `Flood Reports`, and `Gallery`, fill the Hindi fields such as `title_hi`, `summary_hi`, or the Hindi translation area if the collection provides it.
- For division page lists, use `Website Pages -> Hindi Page` for Hindi text only when that page reads Directus Hindi. Some division bodies still use the built-in phrase map explained below.
- Latest item appears first. If rows have years, newest year appears first. If a row has no year, it keeps the existing order.
- Draft Hindi can be checked through preview only when the developer enables the preview env variables and opens `?preview=TOKEN`.

### Simple Hindi
- Hindi Directus में हाथ से लिखें। Auto translation न करें।
- अच्छी Hindi को overwrite न करें।
- Hindi खाली हो तो वही value English में दिखेगी। बाकी Hindi नहीं बदलेगी।
- Hindi content में serial number हाथ से न लिखें। Website sorting के बाद number अपने आप बनाती है।
- `Notices`, `Flood Reports`, और `Gallery` में Hindi के लिए `title_hi`, `summary_hi`, या translation area भरें।
- Division page list में Hindi बदलने के लिए `Website Pages -> Hindi Page` देखें, लेकिन कुछ division pages built-in phrase map से Hindi दिखाते हैं।
- Latest item ऊपर दिखेगा। Year वाले rows में newest year पहले आएगा।
- Draft Hindi देखने के लिए preview तभी चलेगा जब developer preview env variables set करे और URL में `?preview=TOKEN` लगाए।

### Rules
- Do not use AI translation.
- Do not auto-convert English to Hindi.
- Do not overwrite manually entered Hindi.
- If Hindi is missing, the site will safely fall back to English.
- Keep Hindi simple, natural, and easy to read.

### Where to edit Hindi
- Use the Hindi field when available.
- If the collection has a translations section, edit the Hindi translation there.
- For simple page text, use the matching Hindi text field.

### Good writing style
- Prefer simple words.
- Keep sentences short.
- Use normal public-facing Hindi.
- Avoid technical or overly formal wording.

### Hindi for list items and page text
- **Collections** (notices, gallery, flood reports, profiles): fill the row's
  Hindi field (for example `title_hi`). Leave it empty to show English instead.
- **Division page text** (`rsac_pages`): switch to the **Hindi Page** tab and
  edit the **Hindi text** of the same row. The **Section (fixed)** label is
  read-only. Do not touch the English Page tab to change Hindi.
- Bullet and numbered lists: type each item on its own line. The website keeps
  the numbering and indentation; long Hindi lines wrap and stay aligned.
- Missing Hindi never blocks a page — that one value falls back to English while
  the rest of your Hindi stays as typed. Filled Hindi is never overwritten.

## हिन्दी
Hindi content Directus में खुद टाइप किया जाना चाहिए।

### नियम
- AI translation का उपयोग न करें।
- English को अपने आप Hindi में बदलने की कोशिश न करें।
- Manual रूप से दर्ज किया गया Hindi न बदलें।
- यदि Hindi गायब हो तो website safe रूप से English पर वापस आ जाएगा।
- Hindi सरल, natural, और आसान पढ़ने वाली रखें।

### Hindi कहाँ बदलें
- यदि Hindi field उपलब्ध हो तो वहाँ बदलें।
- यदि collection में translations section हो तो वहाँ Hindi translation बदलें।
- Simple page text के लिए matching Hindi text field का उपयोग करें।

### अच्छा writing style
- सरल शब्दों का उपयोग करें।
- वाक्य छोटे रखें।
- सामान्य public-facing Hindi का उपयोग करें।
- Technical या बहुत formal wording न रखें।

### List item और page text के लिए Hindi
- **Collection** (notices, gallery, flood reports, profiles): row का Hindi field
  (जैसे `title_hi`) भरें। खाली छोड़ने पर English दिखेगा।
- **Division page text** (`rsac_pages`): **Hindi Page** tab पर जाएं और उसी row का
  **Hindi text** बदलें। **अनुभाग (तय)** label read-only है। Hindi बदलने के लिए
  English Page tab न छुएं।
- Bullet/numbered list: हर item अलग line पर लिखें। Numbering और indentation
  website रखती है; लंबी Hindi line wrap होकर aligned रहती है।
- Hindi गायब हो तो page नहीं रुकता — वही एक value English पर fallback करती है,
  बाकी आपका Hindi वैसा ही रहता है। भरा हुआ Hindi कभी overwrite नहीं होता।

---

## Why Hindi shows even when Directus is English (division pages)

You may notice a **division** page (for example Agriculture Resources → Research
Papers / Articles) showing Hindi on the website even though its rows in Directus
are English. This is expected, not a bug.

**How division pages get Hindi:** division pages keep **one locked English page
layout** for both languages. On the Hindi site the website does **not** read the
division's Hindi rows from Directus. Instead it takes the English text and
translates it at display time using a **built-in Hindi word/phrase list stored in
the code** (`src/data/divisionHindiPhrases.js`, which pulls in the large
machine-translated `src/data/divisionHindiPhrasesGenerated.js`). If a line of
English matches an entry in that list, the visitor sees the Hindi; if it does
not, the line stays English.

**What this means for editors:**
- Editing the **Hindi Page** rows of a *division* in Directus does **not** change
  the Hindi shown on the site — the code list wins for divisions.
- To correct a division's Hindi wording, a **developer** must edit the phrase list
  in `src/data` (see `CMS_DEVELOPER_NOTES.md`). It is not a Directus edit.
- This applies **only** to division (and a couple of academic) pages. Every other
  section — notices, gallery, profiles, policies, public info, site text — reads
  its Hindi straight from Directus, so your `_hi` edits there show immediately.

**Why it was built this way:** the division write-ups are long and were carried
over from the old site. Keeping one English layout plus a vetted Hindi phrase list
avoids maintaining two full copies of every big table and keeps English and Hindi
structurally identical.

## हिन्दी — Directus में English होने पर भी Hindi क्यों दिखती है (division pages)

किसी **division** page (जैसे कृषि संसाधन → शोध पत्र/लेख) पर वेबसाइट Hindi दिखा
सकती है, जबकि Directus में उसकी rows English हैं। यह सही है, bug नहीं।

**Division page Hindi कैसे लाते हैं:** division page दोनों भाषाओं के लिए **एक ही
तय English layout** रखते हैं। Hindi site पर website Directus से division की Hindi
rows **नहीं** पढ़ती। बल्कि English text लेकर उसे display के समय **code में रखी
Hindi शब्द/वाक्य सूची** से translate करती है (`src/data/divisionHindiPhrases.js`,
जो बड़ी machine-translated `src/data/divisionHindiPhrasesGenerated.js` को शामिल
करती है)। English line उस सूची में मिले तो Hindi दिखती है; न मिले तो English रहती है।

**Editor के लिए मतलब:**
- किसी *division* की **Hindi Page** rows Directus में बदलने से site की Hindi
  **नहीं** बदलती — division के लिए code सूची जीतती है।
- Division की Hindi wording ठीक करने के लिए **developer** को `src/data` की phrase
  सूची बदलनी होगी (देखें `CMS_DEVELOPER_NOTES.md`)। यह Directus edit नहीं है।
- यह **केवल** division (और कुछ academic) pages पर लागू है। बाकी सब — notices,
  gallery, profiles, policies, public info, site text — Hindi सीधे Directus से
  पढ़ते हैं, इसलिए वहाँ आपके `_hi` edits तुरंत दिखते हैं।

## Clearing text and Hindi fallback (2026-07-08)

### English
- Clearing an English field now clears it on the site (the old fallback text does
  not return). To hide text, blank the field.
- If a Hindi (`_hi`) field is empty, that field shows the English value — by
  design. There is no AI translation; type Hindi manually to override. Clearing
  English does not erase a Hindi value you already typed.

### हिन्दी
- अब English field खाली करने पर साइट पर भी खाली दिखेगा (पुराना fallback नहीं आता)।
  text छिपाना हो तो field खाली कर दें।
- Hindi (`_hi`) खाली हो तो वह field English दिखाता है (design)। AI translation नहीं
  है — Hindi खुद type करें। English खाली करने से आपका पहले टाइप किया Hindi नहीं मिटता।

## Handover note: full Directus Hindi editing

### English
Most collections read Hindi directly from Directus: notices, flood reports,
gallery, profiles, policies, public information pages, menus, contact details,
homepage text, and card summaries.

The known exception is the old scraped body of division and a few academic
pages. Those pages still use a locked English body plus a code phrase map for
Hindi display. Do not promise a non-technical editor that changing those Hindi
rows will update every line until a developer migrates that page type to fully
structured Directus records.

### सरल हिन्दी
अधिकतर जगह Hindi Directus से आती है: notices, flood reports, gallery, profiles,
policies, public pages, menu, contact, homepage text और cards।

एक known exception है: पुराने scraped division/academic page body। वे अभी locked
English body और code phrase map से Hindi दिखाते हैं। जब तक developer इन्हें fully
structured Directus records में migrate न करे, editor को यह न बताएं कि हर Hindi
row बदलते ही site पर दिखेगी।
