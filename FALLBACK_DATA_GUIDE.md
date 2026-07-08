# Fallback Data Guide

## English
The fallback system is a safety net, not a replacement for Directus.

## Preview and latest-first fallback rules

### English
- Live mode asks Directus only for `published` rows. Draft rows do not appear on the public website.
- Preview mode is disabled unless `VITE_CMS_PREVIEW_ENABLED=true` and the URL contains the matching `?preview=TOKEN`.
- In preview mode, the frontend does not add the `status = published` filter, so a properly permissioned Directus token can show draft/test rows.
- Use `VITE_DIRECTUS_PREVIEW_TOKEN` on staging/local when the normal live token cannot read drafts.
- Directus content still wins over fallback in preview and live mode.
- If Directus returns a non-empty list, fallback is not mixed into that list.
- If Directus returns no rows or the API fails, fallback rows appear and still use the same latest-first/serial-number renderer.
- Missing Hindi still falls back one value at a time to English.
- Missing images, videos, and PDFs are skipped or replaced by safe defaults; the page should not crash.

### Simple Hindi
- Live mode में website केवल `published` rows मांगती है। Draft public site पर नहीं दिखता।
- Preview तभी चलेगा जब `VITE_CMS_PREVIEW_ENABLED=true` हो और URL में सही `?preview=TOKEN` हो।
- Preview mode में frontend `status = published` filter नहीं लगाता, इसलिए सही permission वाला Directus token draft/test rows दिखा सकता है।
- Normal live token draft नहीं पढ़ता तो staging/local पर `VITE_DIRECTUS_PREVIEW_TOKEN` use करें।
- Preview और live दोनों में Directus content fallback से पहले आता है।
- Directus non-empty list दे तो fallback उस list में mix नहीं होता।
- Directus fail हो या rows न हों तो fallback दिखेगा, और same latest-first/serial-number renderer चलेगा।
- Hindi missing हो तो वही value English पर fallback करेगी।
- Image, video, PDF missing हो तो page crash नहीं होगा।

### Priority order
1. Directus content
2. Fallback content
3. Safe default

### When fallback is used
- Directus is unavailable
- API request fails
- CMS row is missing
- Image, video, or document is missing
- Hindi text is missing

### Important notes
- Fallback must never overwrite a real Directus value.
- Missing media should not break the page.
- Do not mix fallback data with live Directus content.
- Keep fallback files separate from backup files.

### How fallback decides (per value)
- Fallback is checked one value at a time, not all-or-nothing.
- A list uses fallback only when Directus returns an **empty** list; a non-empty
  list from Directus always wins (`withFallback` in `src/data/cmsService.js`).
- For a single text field, fallback fills in only when the value is truly
  missing (`null` or not returned). An empty string is treated as an intentional
  editor choice and stays empty.
- Hindi missing → that field shows English; your other Hindi is untouched.
- Missing image / video / PDF → the slot is skipped or shows a safe default; the
  page does not crash.

## हिन्दी
Fallback system एक safety net है, Directus का replacement नहीं।

### Priority order
1. Directus की सामग्री
2. Fallback सामग्री
3. Safe default

### कब fallback उपयोग होता है
- Directus उपलब्ध नहीं हो
- API request fail हो
- CMS row missing हो
- Image, video, या document missing हो
- Hindi text missing हो

### महत्वपूर्ण बात
- Fallback real Directus value को कभी override नहीं करेगा।
- Missing media से page टूटना नहीं चाहिए।
- Fallback data और live Directus content को mix न करें।
- Fallback files को backup files से अलग रखें।

### Fallback कैसे तय होता है (हर value के लिए)
- Fallback एक-एक value पर check होता है, सब-या-कुछ नहीं।
- List तब ही fallback लेती है जब Directus **खाली** list देता है; non-empty list
  हमेशा जीतती है (`withFallback`, `src/data/cmsService.js`)।
- एक text field में fallback तभी भरता है जब value सच में missing हो (`null` या
  field वापस न आए)। खाली string को editor की जानबूझकर की गई choice माना जाता है,
  इसलिए वह खाली ही रहती है।
- Hindi missing → वह field English दिखाता है; बाकी Hindi वैसा ही रहता है।
- Image/video/PDF missing → slot skip या safe default; page crash नहीं होता।

## Clearing CMS text: delete vs. blank (2026-07-08)

### English
Directus always wins over fallback. Two different actions behave differently:

- **Clear a field (make it blank):** the site now shows it blank. A blank field
  is treated as a deliberate removal — the old fallback text does **not** come
  back. (Fixed in `deepMerge`, `src/data/directusAdapter.js`, and
  `withFallback`, `src/data/cmsService.js`: only `null` / missing falls back;
  an empty string is respected.)
- **Delete the whole override row:** for homepage text edited in the Website Text
  editor (content blocks), deleting the row removes your override, so the
  built-in default text returns. To hide text, **clear it (leave it blank)**
  instead of deleting the row.

Fallback still appears only when Directus is down, the API fails, the entry is
missing, or the field was never set (`null`). Empty lists still use the fallback
list (safer default).

### हिन्दी
Directus हमेशा fallback से ऊपर है। पर दो अलग काम अलग तरह चलते हैं:

- **Field खाली करना:** अब साइट पर वह खाली दिखेगा। खाली field को "जान-बूझकर हटाया"
  माना जाता है — पुराना fallback text **वापस नहीं** आता।
- **पूरी override row delete करना:** homepage text (content blocks) में row delete
  करने पर आपका override हटता है और built-in default text लौट आता है। text छिपाना
  हो तो row delete न करें, बस field **खाली** कर दें।

fallback तभी दिखेगा जब Directus बंद हो, API fail हो, entry न हो, या field कभी set
ही न हुआ हो (`null`)। खाली list पर fallback list ही चलेगी।
