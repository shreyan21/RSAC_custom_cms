# RSAC-UP Website: Simple Directus Editing Guide
# RSAC-UP वेबसाइट: सरल Directus संपादन गाइड

This guide is for the person who updates the website. You do not need to know
coding, HTML, JSON, React, or PostgreSQL.

**हिन्दी:** यह गाइड उस व्यक्ति के लिए है जो वेबसाइट को अपडेट करता है। आपको
कोडिंग, HTML, JSON, React या PostgreSQL जानने की कोई ज़रूरत नहीं है।

> **Note / ध्यान दें:** Directus screens and buttons are in English (Save,
> Published, Create Item…). This guide keeps those names in English everywhere —
> even inside the Hindi text — so you can find the exact button on screen.
> Directus की स्क्रीन और बटन अंग्रेज़ी में हैं, इसलिए इस गाइड में हिन्दी भाग के
> अंदर भी बटन/मेन्यू के नाम अंग्रेज़ी में ही लिखे गए हैं, ताकि आप स्क्रीन पर वही
> बटन आसानी से ढूँढ सकें।

## Daily quick start (do this first)
## रोज़ की शुरुआत (सबसे पहले यह करें)

1. Open Directus → **Start Here** → **Editing Map**.
2. Search the area you want to change (homepage hero, footer, notice, flood
   report, organisation chart, division page, page photo, Hindi text…).
3. Open the guide row and follow its **Where to Click**. The Editing Map does not
   change the site itself — it tells you where the real edit lives.

**Golden rule:** edit visible form fields only. Never touch database IDs, raw
JSON, raw HTML, file paths, the Content Key, fixed Section labels, or hidden
fields. Upload files **inside the correct content row** (not File Library alone),
set **Status = Published** when final, and **Save**. The website handles list
numbering and order — do not type serial numbers by hand.

**हिन्दी:** Directus में **Start Here → Editing Map** खोलें, जो क्षेत्र बदलना है
उसे खोजें, और उस row के **Where to Click** का पालन करें। केवल दिखने वाले form
fields बदलें; ID/JSON/HTML/file path/Content Key/fixed labels को हाथ न लगाएं।
File सही content row के अंदर upload करें, final होने पर **Status = Published**
करें और **Save** करें। Serial number हाथ से न लिखें।

---

## Two words first: backup and fallback
## पहले दो शब्द: backup (बैकअप) और fallback (फ़ॉलबैक)

**Backup = a spare copy kept safe.** Like a photocopy of an important paper: if the
original is damaged, the photocopy is still there. On this project the backups are the
PostgreSQL database copy and the `uploads` folder, kept by an administrator. **You never
edit a backup.** Just know they exist.

**Fallback = the website's spare tyre.** The words you type in Directus are the normal
tyre — that is what visitors see. If Directus is switched off, or you leave a box empty,
the website quietly shows a built-in copy (the "fallback") so the page is **never blank**.
**You never edit the fallback** either; it lives inside the code and only fills gaps.

> **Golden rule:** what you type in Directus **always wins**. The fallback appears only when
> your box is empty or Directus is off — it never replaces your words.

So, to change anything on the site, you type it in Directus. That is the whole idea of this
guide.

**हिन्दी:**

**Backup = सुरक्षित रखी गई अतिरिक्त कॉपी।** जैसे किसी ज़रूरी कागज़ की फोटोकॉपी:
असली खराब हो जाए तो फोटोकॉपी बची रहती है। इस प्रोजेक्ट में backup हैं —
PostgreSQL डेटाबेस की कॉपी और `uploads` फ़ोल्डर, जिन्हें एडमिनिस्ट्रेटर संभालता
है। **Backup को आप कभी संपादित नहीं करते।** बस जानिए कि वे मौजूद हैं।

**Fallback = वेबसाइट का स्टेपनी टायर।** जो शब्द आप Directus में लिखते हैं, वही
असली टायर है — वही आगंतुकों को दिखता है। अगर Directus बंद हो, या आप कोई बॉक्स
खाली छोड़ दें, तो वेबसाइट चुपचाप अपनी अंदर बनी हुई कॉपी ("fallback") दिखा देती
है, ताकि पेज **कभी खाली न दिखे**। **Fallback को भी आप कभी संपादित नहीं करते**;
वह कोड के अंदर रहता है और सिर्फ़ खाली जगह भरता है।

> **सुनहरा नियम:** जो आप Directus में लिखते हैं, **वही हमेशा जीतता है।**
> Fallback केवल तब दिखता है जब आपका बॉक्स खाली हो या Directus बंद हो — वह आपके
> शब्दों की जगह कभी नहीं लेता।

यानी वेबसाइट पर कुछ भी बदलना हो, तो उसे Directus में लिखिए। यही इस पूरी गाइड का
सार है।

## 1. The five rules / पाँच नियम

1. Make website changes in **Directus**, not in code files.
2. Open the correct record, make the change, and press **Save** at the top-right.
3. Keep **Visibility = Published** when the item should appear publicly.
4. Upload a photo or PDF inside the record that uses it. Uploading only to the
   File Library does not connect it to the website.
5. Never open **Settings** or **Data Model**. Those areas are for developers.

**हिन्दी:**

1. वेबसाइट के बदलाव **Directus** में करें, कोड फ़ाइलों में नहीं।
2. सही रिकॉर्ड खोलें, बदलाव करें, और ऊपर-दाएँ **Save** दबाएँ।
3. जो चीज़ सबको दिखनी चाहिए, उसकी **Visibility = Published** रखें।
4. फोटो या PDF उसी रिकॉर्ड के अंदर अपलोड करें जो उसे इस्तेमाल करता है। सिर्फ़
   File Library में अपलोड करने से वह वेबसाइट से नहीं जुड़ती।
5. **Settings** या **Data Model** कभी न खोलें। वे हिस्से डेवलपर के लिए हैं।

## One language at a time / एक बार में एक भाषा

Every record that has both English and Hindi text starts with a
**Choose Language to Edit** switch at the top — pages, scientist profiles,
facilities, notices, menus, everything. Pick **English** or **Hindi / हिन्दी**
and only that language's boxes stay open below, so you never see the same
content twice. Fields shared by both languages (photos, IDs, dates,
Visibility) always stay visible. Switching the language changes nothing on the
website — it only chooses what you see while editing.

**हिन्दी:** जिस भी रिकॉर्ड में अंग्रेज़ी और हिन्दी दोनों टेक्स्ट हैं, उसके ऊपर
**Choose Language to Edit** स्विच मिलेगा — पेज, वैज्ञानिक प्रोफ़ाइल, सुविधाएँ,
सूचनाएँ, मेन्यू, सब जगह। **English** या **Hindi / हिन्दी** चुनें — नीचे सिर्फ़
उसी भाषा के बॉक्स खुले रहेंगे, यानी एक ही चीज़ दो बार नहीं दिखेगी। दोनों भाषाओं
में साझा फ़ील्ड (फोटो, ID, तारीख़, Visibility) हमेशा दिखते रहते हैं। भाषा बदलने
से वेबसाइट पर कुछ नहीं बदलता — यह सिर्फ़ तय करता है कि संपादन के समय आपको क्या
दिखे।

## 2. Open Directus / Directus खोलना

1. Start the project with `npm run dev`.
2. Open `http://localhost:8055/admin`.
3. Sign in with the private administrator email and password supplied by IT.
4. Click **Content** in the left menu.

You will see four folders:

- **Homepage**
- **Pages and Navigation**
- **People and Organisation**
- **Public Information**

**हिन्दी:**

1. प्रोजेक्ट को `npm run dev` से शुरू करें।
2. ब्राउज़र में `http://localhost:8055/admin` खोलें।
3. IT द्वारा दिए गए निजी एडमिन ईमेल और पासवर्ड से साइन इन करें।
4. बाएँ मेन्यू में **Content** पर क्लिक करें।

आपको चार फ़ोल्डर दिखेंगे:

- **Homepage** (होमपेज)
- **Pages and Navigation** (पेज और नेविगेशन)
- **People and Organisation** (लोग और संगठन)
- **Public Information** (सार्वजनिक जानकारी)

## 3. Where each type of content lives / कौन-सी चीज़ कहाँ बदलती है

| You want to change / आप क्या बदलना चाहते हैं | Open this Directus menu / यह Directus मेन्यू खोलें |
|---|---|
| Homepage words, buttons, labels, footer words / होमपेज के शब्द, बटन, लेबल, फुटर | Homepage → **Website Text Editor** |
| A small button, badge, or status word used anywhere (e.g. "View all", "Quick Access", "Back to top") / साइट में कहीं भी दिखने वाला छोटा बटन या लेबल | Homepage → **Website Text Editor** → search **Interface Labels** |
| Prime Minister or Chief Minister homepage portrait / होमपेज पर प्रधानमंत्री या मुख्यमंत्री की फोटो | Homepage → **Homepage Leaders** |
| RSAC logo, UP emblem, or another header logo / RSAC लोगो, यूपी चिह्न या हेडर का कोई लोगो | Homepage → **Header Logos** |
| Homepage Objective / Implementation / Approach / Sphere / Mobile Apps **tabs** — wording, link, icon, order (each opens its own page) / होमपेज के **टैब** का नाम, लिंक, आइकन, क्रम | Homepage → **Homepage Feature Tabs** |
| Text **inside** the Objective / Implementation / Approach / Sphere page / उन टैब पेजों के **अंदर** का टेक्स्ट | Homepage → **Website Text Editor** (search **Vision**) |
| Apps listed on the **Mobile Apps** tab page / **Mobile Apps** टैब पेज पर दिखने वाले ऐप | Public Information → **App Downloads** |
| Homepage quick-access cards / होमपेज के क्विक-एक्सेस कार्ड | Homepage → **Homepage Quick Links** |
| Homepage video or its first image / होमपेज वीडियो या उसकी पहली तस्वीर | Homepage → **Homepage Video** |
| About, division, facility, or academic page / अबाउट, प्रभाग, सुविधा या अकादमिक पेज | Pages and Navigation → **Website Pages** |
| A photo inside any of those pages (including **Map/Photos**) / उन पेजों के अंदर की कोई फोटो | Pages and Navigation → **Website Pages** → open the page → **Photos on This Page** |
| Division summary card / प्रभाग का सारांश कार्ड | Pages and Navigation → **Scientific Divisions** |
| Facility summary card / सुविधा का सारांश कार्ड | Pages and Navigation → **Facilities** |
| Geo-portal card and link / जियो-पोर्टल कार्ड और लिंक | Pages and Navigation → **Geo-Portal Services** |
| Hamburger menu / हैमबर्गर मेन्यू | Pages and Navigation → **Main Menu** |
| Scientist, leader, former scientist, or staff profile / वैज्ञानिक, अधिकारी, पूर्व वैज्ञानिक या स्टाफ की प्रोफ़ाइल | People and Organisation → **People Profiles** |
| Organisation-chart portrait, name, or designation / संगठन चार्ट की फोटो, नाम या पदनाम | People and Organisation → **Organisation Chart** |
| Manpower summary cards / जनशक्ति सारांश कार्ड | People and Organisation → **Manpower Summary** |
| Notice and its PDF / सूचना और उसकी PDF | Public Information → **Notices and Circulars** |
| Flood report and its PDF / बाढ़ रिपोर्ट और उसकी PDF | Public Information → **Flood Reports** |
| RTI, tender, feedback, or FAQ page / आरटीआई, टेंडर, फीडबैक या FAQ पेज | Public Information → **Public Information Pages** |
| Privacy, copyright, disclaimer, help, accessibility / गोपनीयता, कॉपीराइट, अस्वीकरण, सहायता, सुगम्यता | Public Information → **Policies and Help** |
| Gallery photo / गैलरी फोटो | Public Information → **Photo Gallery** |
| Mobile application download / मोबाइल ऐप डाउनलोड | Public Information → **App Downloads** |
| Address, telephone, email, office contacts / पता, फ़ोन, ईमेल, कार्यालय संपर्क | Public Information → **Contact Details** |

> **About the homepage tabs (Objective / Implementation / Approach / Sphere of
> Activities / Mobile Apps):** these five tabs each open their own page. Edit the
> **tab wording, link, icon, and order** in **Homepage → Homepage Feature Tabs**
> (open a row, change the fields, keep it Published, Save). The **content shown on
> each page** lives elsewhere: the first four read the **Website Text Editor**
> (the *Vision* rows), and *Mobile Apps* reads **App Downloads**. Leave a Hindi
> field blank to fall back to English.
>
> **हिन्दी:** होमपेज के ये पाँच टैब हर एक अपना पेज खोलते हैं। **टैब का नाम, लिंक,
> आइकन और क्रम** **Homepage → Homepage Feature Tabs** में बदलें (row खोलें, फ़ील्ड
> बदलें, Published रखें, Save करें)। हर पेज पर **दिखने वाला कंटेंट** अलग जगह है:
> पहले चार **Website Text Editor** (Vision पंक्तियाँ) से, और *Mobile Apps*
> **App Downloads** से। Hindi फ़ील्ड खाली छोड़ने पर English दिखेगा।

## 4. The normal editing steps / संपादन के सामान्य चरण

Use these steps for almost every change:

1. Open the correct folder and menu.
2. Open the record you want to change.
3. Open the clearly named box, such as **English Content**, **Hindi Content**,
   **Photo**, or **PDF Document**.
4. Change only the required field.
5. Check **Visibility**. Choose `Published` for a public item.
6. Press **Save**.
7. Open the website and press `Ctrl+F5` once.

**हिन्दी:** लगभग हर बदलाव के लिए यही चरण अपनाएँ:

1. सही फ़ोल्डर और मेन्यू खोलें।
2. जिस रिकॉर्ड को बदलना है, उसे खोलें।
3. साफ़ नाम वाला बॉक्स खोलें, जैसे **English Content**, **Hindi Content**,
   **Photo**, या **PDF Document**।
4. सिर्फ़ ज़रूरी फ़ील्ड बदलें।
5. **Visibility** जाँचें। सार्वजनिक चीज़ के लिए `Published` चुनें।
6. **Save** दबाएँ।
7. वेबसाइट खोलें और एक बार `Ctrl+F5` दबाएँ।

## 5. Common tasks / रोज़मर्रा के काम

### Change homepage text / होमपेज का टेक्स्ट बदलना

1. Open **Homepage → Website Text Editor**.
2. Use the search box to find a word from the current text.
3. Open the matching row.
4. Change **English Text** and, when available, **Hindi Text**.
5. Save and refresh the website.

**Website Area** and **Text Name** are labels that help you find the row in this
list — they do not move the text on the website, so they lock after the row is
saved. When you press **+** to add a new row they stay open, together with a
**Key** box: the Key is the system path the website reads (for example
`hero.title`). A new row changes the website only when its Key matches a path
the website already uses — a made-up Key shows nowhere. Adding text in a brand
new place needs a website code change, not a new row here.

**हिन्दी:**

1. **Homepage → Website Text Editor** खोलें।
2. सर्च बॉक्स में मौजूदा टेक्स्ट का कोई शब्द खोजें।
3. मिलने वाली पंक्ति (row) खोलें।
4. **English Text** बदलें और, जहाँ उपलब्ध हो, **Hindi Text** भी।
5. Save करें और वेबसाइट रीफ़्रेश करें।

**Website Area** और **Text Name** केवल पंक्ति खोजने में मदद करने वाले लेबल हैं —
ये वेबसाइट पर टेक्स्ट की जगह नहीं बदलते, इसलिए पंक्ति सेव होने के बाद लॉक हो जाते
हैं। **+** से नई पंक्ति बनाते समय ये खुले रहते हैं और साथ में **Key** बॉक्स भी
दिखता है: Key वह सिस्टम पथ है जिसे वेबसाइट पढ़ती है (जैसे `hero.title`)। नई
पंक्ति वेबसाइट पर तभी असर करती है जब उसका Key वेबसाइट का पहले से इस्तेमाल हो रहा
पथ हो — मनगढ़ंत Key कहीं नहीं दिखता। बिल्कुल नई जगह टेक्स्ट जोड़ने के लिए वेबसाइट
कोड बदलना पड़ता है, यहाँ नई पंक्ति बनाना काफी नहीं।

### Change a small button or label word / छोटा बटन या लेबल शब्द बदलना

Every short interface word — button captions, badges, status words such as
"View all", "Quick Access", "Open Portal", "Back to top" — has its own row.

1. Open **Homepage → Website Text Editor**.
2. Type **Interface Labels** in the search box, or search the word itself.
3. Open the matching row, for example **Interface Labels - View All**.
4. Change **English Text** and, when needed, **Hindi Text**.
5. Save and refresh the website.

The same row changes that word **everywhere it appears** on the site, in both
languages. Leave a box unchanged and the website keeps its current wording —
the fallback rule from the top of this guide applies here too.

**हिन्दी:** साइट का हर छोटा शब्द — बटन, बैज, स्थिति-शब्द जैसे "View all",
"Quick Access", "Back to top" — की अपनी अलग पंक्ति है।

1. **Homepage → Website Text Editor** खोलें।
2. सर्च बॉक्स में **Interface Labels** लिखें, या सीधे वही शब्द खोजें।
3. मिलने वाली पंक्ति खोलें, जैसे **Interface Labels - View All**।
4. **English Text** और ज़रूरत हो तो **Hindi Text** बदलें।
5. Save करें और वेबसाइट रीफ़्रेश करें।

एक ही पंक्ति बदलने से वह शब्द साइट में **हर जगह**, दोनों भाषाओं में बदल जाता
है। बॉक्स खाली छोड़ने पर वेबसाइट पुराना शब्द दिखाती रहती है — ऊपर वाला fallback
नियम यहाँ भी लागू है।

### Edit a division, facility, or other website page / प्रभाग, सुविधा या कोई और पेज संपादित करना

1. Open **Pages and Navigation → Website Pages**.
2. Search for the page title and open it.
3. Choose **English** or **Hindi / हिन्दी** under **Choose Language to Edit**.
   Directus then shows only the chosen language — exactly like the language
   button on the website.
4. Under **English Page Text** or **Hindi Page Text** you will see one row per
   section, **named exactly like the tabs on the website page**: *Scientific
   Manpower*, *Ongoing Projects*, *Completed Projects*, *Technical Reports*,
   *Map/Photos*, and so on.
5. Click a section row and it opens up, showing every line of text inside that
   section — just like clicking the same tab on the website.
6. Open the line you want, change only its text, and press **Save**.
7. Check the result with **Live Preview** or refresh the website page.

So editing works like the website itself: find the tab, open it, change the
words inside. Nothing else moves.

Notes:

- Do not delete rows. The page layout, tabs, tables, links, and photos are
  locked automatically. Never paste HTML or JSON.
- **Add Item** inside a section adds a new line of text to that section. Fill
  only the text field (the optional short name is just for this editor list).
  The new line appears at the **end** of that section on the website — for
  example a new completed project is listed after the existing ones.
- Photos are edited separately in **Photos on This Page** (next task below).

**हिन्दी:**

1. **Pages and Navigation → Website Pages** खोलें।
2. पेज का शीर्षक खोजें और उसे खोलें।
3. **Choose Language to Edit** में **English** या **Hindi / हिन्दी** चुनें।
   इसके बाद Directus सिर्फ़ चुनी हुई भाषा दिखाता है — बिल्कुल वेबसाइट के भाषा
   बटन की तरह।
4. **English Page Text** या **Hindi Page Text** के नीचे हर सेक्शन की एक पंक्ति
   दिखेगी, **जिनके नाम वेबसाइट के टैब जैसे ही हैं**: *Scientific Manpower*,
   *Ongoing Projects*, *Completed Projects*, *Technical Reports*, *Map/Photos*
   आदि।
5. किसी सेक्शन की पंक्ति पर क्लिक करें — वह खुलकर उस सेक्शन की हर टेक्स्ट लाइन
   दिखाएगी, जैसे वेबसाइट पर वही टैब खोलना।
6. जो लाइन बदलनी है उसे खोलें, सिर्फ़ उसका टेक्स्ट बदलें, और **Save** दबाएँ।
7. नतीजा **Live Preview** से या वेबसाइट का पेज रीफ़्रेश करके देखें।

यानी संपादन वेबसाइट जैसा ही है: टैब ढूँढो, खोलो, अंदर के शब्द बदलो। बाकी कुछ
नहीं हिलता।

ध्यान रखें:

- पंक्तियाँ delete न करें। पेज का ढाँचा, टैब, तालिकाएँ, लिंक और फोटो अपने-आप
  लॉक रहते हैं। HTML या JSON कभी paste न करें।
- सेक्शन के अंदर **Add Item** उस सेक्शन में नई टेक्स्ट लाइन जोड़ता है। सिर्फ़
  टेक्स्ट वाला खाना भरें (छोटा नाम वैकल्पिक है, वह सिर्फ़ इस सूची में दिखता है)।
  नई लाइन वेबसाइट पर उस सेक्शन के **अंत में** दिखती है — जैसे नई पूर्ण परियोजना
  मौजूदा सूची के बाद।
- फोटो अलग से **Photos on This Page** में बदलती हैं (अगला काम देखें)।

### Rename a tab on a website page / वेबसाइट पेज का टैब का नाम बदलना

The first row of each section (the one with the expand arrow) holds the tab's
name. To rename the tab on the website:

1. Open the section's top row (for example *Research Paper Published*).
2. Change its **value** text to the new tab name.
3. Save the page and refresh the website — the tab now shows your new name.

This works per language: rename in **Hindi Page Text** and only the Hindi
website tab changes. Putting the original name back restores the original tab.

One exception: a tab that contains **only photos** (some *Map/Photos* tabs)
has no text rows in the editor, so it has no section to rename. Its photos are
still editable through **Photos on This Page**.

**हिन्दी:** हर सेक्शन की सबसे ऊपर वाली पंक्ति (जिसमें खुलने वाला तीर है) टैब का
नाम रखती है। वेबसाइट पर टैब का नाम बदलने के लिए:

1. सेक्शन की सबसे ऊपर वाली पंक्ति खोलें (जैसे *Research Paper Published*)।
2. उसके **value** टेक्स्ट में नया टैब नाम लिखें।
3. पेज Save करें और वेबसाइट रीफ़्रेश करें — टैब पर अब आपका नया नाम दिखेगा।

यह भाषा के हिसाब से अलग-अलग काम करता है: **Hindi Page Text** में नाम बदलें तो
सिर्फ़ हिन्दी वेबसाइट का टैब बदलेगा। पुराना नाम वापस लिखने से टैब पहले जैसा हो
जाता है।

एक अपवाद: जिस टैब में **सिर्फ़ फोटो** हैं (कुछ *Map/Photos* टैब), उसमें कोई
टेक्स्ट पंक्ति नहीं होती, इसलिए नाम बदलने का सेक्शन भी नहीं होता। उसकी फोटो फिर
भी **Photos on This Page** से बदल सकते हैं।

### Change a photo on a page (including Map/Photos) / किसी पेज की फोटो बदलना

Every photo that appears inside a division, facility, or about page has its own
row in Directus, named by the tab it appears under — for example
`Map/Photos — photo 3` or `Scientific Manpower — Dr. A. Uniyal`.

1. Open **Pages and Navigation → Website Pages** and open the page.
2. Scroll to **Photos on This Page** and click it open.
3. Find the photo row by its name — the file name in brackets helps you match it.
4. Open the row and upload the replacement into **New Photo**.
5. Save the row, then save the page, and refresh the website.

To go back to the original photo, open the same row and clear **New Photo**.
A row with an empty **New Photo** always shows the original photo — so you can
never lose anything.

The same rows are also listed together under **Pages and Navigation →
Page Photos** if you prefer to search all photos in one place.

**हिन्दी:** प्रभाग, सुविधा या अबाउट पेज के अंदर दिखने वाली हर फोटो की Directus
में अपनी पंक्ति है, जिसका नाम उस टैब पर रखा गया है जहाँ वह दिखती है — जैसे
`Map/Photos — photo 3` या `Scientific Manpower — Dr. A. Uniyal`।

1. **Pages and Navigation → Website Pages** खोलें और पेज खोलें।
2. नीचे **Photos on This Page** तक जाएँ और उसे खोलें।
3. नाम से फोटो की पंक्ति ढूँढें — कोष्ठक में लिखा फ़ाइल-नाम मिलान में मदद करता है।
4. पंक्ति खोलें और नई फोटो **New Photo** में अपलोड करें।
5. पंक्ति Save करें, फिर पेज Save करें, और वेबसाइट रीफ़्रेश करें।

पुरानी फोटो वापस लानी हो तो वही पंक्ति खोलकर **New Photo** खाली कर दें। खाली
**New Photo** वाली पंक्ति हमेशा असली फोटो दिखाती है — यानी कुछ भी खो नहीं सकता।

यही पंक्तियाँ एक साथ **Pages and Navigation → Page Photos** में भी मिलती हैं,
अगर आप सारी फोटो एक जगह खोजना चाहें।

### Change a card's icon or colours / कार्ड का आइकन या रंग बदलना

Every inner page (facilities, divisions, about, academics) appears as a card on
its section's front grid, with a small icon and two colours. The website picks
these automatically, but you can choose your own:

1. Open **Pages and Navigation → Website Pages** and open the page.
2. Click open the **Card Look on Section Grid** box.
3. Pick a **Card Icon** from the list — for example *Building / Facility* or
   *Water Drops / Groundwater*.
4. Pick **Card Colour (Main)** and **Card Colour (Second)** with the colour
   picker.
5. Save and refresh the website.

Whatever you pick shows on **both** the English and the Hindi site — you set it
once. Leave any of the three empty to keep the automatic choice; clearing them
brings the automatic look back, so nothing can be lost.

**हिन्दी:** हर अंदरूनी पेज (सुविधा, प्रभाग, अबाउट, अकादमिक) अपने सेक्शन के मुख्य
ग्रिड पर एक कार्ड की तरह दिखता है, जिस पर एक छोटा आइकन और दो रंग होते हैं।
वेबसाइट इन्हें अपने आप चुनती है, पर आप अपनी पसंद भी लगा सकते हैं:

1. **Pages and Navigation → Website Pages** खोलें और पेज खोलें।
2. **Card Look on Section Grid** बॉक्स खोलें।
3. सूची में से **Card Icon** चुनें — जैसे *Building / Facility* या
   *Water Drops / Groundwater*।
4. **Card Colour (Main)** और **Card Colour (Second)** रंग-चुनने वाले टूल से चुनें।
5. Save करें और वेबसाइट रीफ़्रेश करें।

आपकी चुनी हुई चीज़ अंग्रेज़ी और हिन्दी **दोनों** साइटों पर दिखती है — एक ही बार
सेट करना काफ़ी है। तीनों में से कोई भी खाली छोड़ेंगे तो वेबसाइट अपने आप वाला रूप
रखेगी; भरे हुए को खाली करने पर अपने आप वाला रूप वापस आ जाता है — यानी कुछ भी खो
नहीं सकता।

### Add or edit Hindi / हिन्दी जोड़ना या बदलना

1. Open the same record used for English.
2. Open its **Hindi** box.
3. Type the approved Hindi translation into the labelled fields.
4. Save, switch the website to **हिं**, and refresh.

**You type Hindi by hand — the computer never translates for you, and it never
overwrites Hindi you typed.** When you fill a Hindi box and switch the site to **हिं**,
your Hindi words **replace the English words** on that page, while the layout, columns,
tabs, tables, and photos stay **exactly the same**. The page shape is a locked frame; you
change only the words inside it, so typing can never move or break anything.

Use approved Hindi in Hindi fields. When a Hindi field has no approved value,
leave the existing fallback text unchanged and ask the content owner before
publishing. The website may show English where Hindi is unavailable; this keeps
the page complete.

**हिन्दी:**

1. वही रिकॉर्ड खोलें जो अंग्रेज़ी के लिए इस्तेमाल होता है।
2. उसका **Hindi** बॉक्स खोलें।
3. स्वीकृत (approved) हिन्दी अनुवाद लेबल वाले फ़ील्ड में लिखें।
4. Save करें, वेबसाइट को **हिं** पर बदलें, और रीफ़्रेश करें।

**हिन्दी आप अपने हाथ से लिखते हैं — कंप्यूटर आपके लिए कभी अनुवाद नहीं करता, और
आपकी लिखी हिन्दी को कभी मिटाता नहीं।** जब आप हिन्दी बॉक्स भरकर साइट को **हिं**
पर करते हैं, तो उस पेज पर आपके हिन्दी शब्द **अंग्रेज़ी शब्दों की जगह** ले लेते
हैं, जबकि ढाँचा, कॉलम, टैब, तालिकाएँ और फोटो **बिल्कुल वैसे ही** रहते हैं। पेज
का आकार एक लॉक किया हुआ फ़्रेम है; आप सिर्फ़ उसके अंदर के शब्द बदलते हैं, इसलिए
टाइप करने से कुछ भी हिल या टूट नहीं सकता।

हिन्दी फ़ील्ड में स्वीकृत हिन्दी ही लिखें। जिस फ़ील्ड की स्वीकृत हिन्दी नहीं है,
उसे वैसे ही छोड़ दें और प्रकाशित करने से पहले कंटेंट-मालिक से पूछें। जहाँ हिन्दी
उपलब्ध नहीं है वहाँ वेबसाइट अंग्रेज़ी दिखा सकती है — इससे पेज पूरा रहता है।

### Change a person in the organisation chart / संगठन चार्ट में व्यक्ति बदलना

The official chart structure, arrows, divisions, and positions are locked.
Only the office-holder information is editable.

1. Open **People and Organisation → Organisation Chart**.
2. Open the position, for example the Chief Minister, Director, or a division.
3. Change **Name**, **Designation**, and **Additional Designation** if needed.
4. Open **Photo** and upload the new portrait.
5. If the face is cut off, choose a simple **Photo Alignment** option.
6. Add the Hindi name and designation in the Hindi box.
7. Keep **Visibility = Published**, then Save.

Do not create a second Chief Minister or Director record. Update the existing
position when the office holder changes.

**हिन्दी:** चार्ट का आधिकारिक ढाँचा, तीर, प्रभाग और पद लॉक हैं। सिर्फ़ पद पर
बैठे व्यक्ति की जानकारी बदल सकती है।

1. **People and Organisation → Organisation Chart** खोलें।
2. पद खोलें, जैसे Chief Minister, Director या कोई प्रभाग।
3. ज़रूरत के अनुसार **Name**, **Designation** और **Additional Designation** बदलें।
4. **Photo** खोलकर नई फोटो अपलोड करें।
5. चेहरा कट रहा हो तो कोई सरल **Photo Alignment** विकल्प चुनें।
6. Hindi बॉक्स में हिन्दी नाम और पदनाम लिखें।
7. **Visibility = Published** रखें, फिर Save करें।

दूसरा Chief Minister या Director रिकॉर्ड न बनाएँ। पद-धारक बदलने पर मौजूदा पद को
ही अपडेट करें।

### Change a scientist or staff profile / वैज्ञानिक या स्टाफ प्रोफ़ाइल बदलना

1. Open **People and Organisation → People Profiles**.
2. Search by name.
3. Confirm **Where This Person Appears**, **Employee ID**, and division before
   editing. Different people can have similar names.
4. Change the profile fields or photo.
5. Save and refresh the relevant people page.

This includes **former scientists**: edit the same People Profiles record and the
Our Formers page updates in both languages. The Hindi name lives inside the
**Hindi Profile** box — pick **Hindi / हिन्दी** under **Choose Language to Edit**
to open it. The English name stays as it is, and the website matches the two by
itself.

**हिन्दी:**

1. **People and Organisation → People Profiles** खोलें।
2. नाम से खोजें।
3. बदलने से पहले **Where This Person Appears**, **Employee ID** और प्रभाग
   जाँच लें — अलग-अलग लोगों के नाम मिलते-जुलते हो सकते हैं।
4. प्रोफ़ाइल के फ़ील्ड या फोटो बदलें।
5. Save करें और संबंधित पेज रीफ़्रेश करें।

इसमें **पूर्व वैज्ञानिक (former scientists)** भी शामिल हैं: वही People Profiles
रिकॉर्ड बदलिए और Our Formers पेज दोनों भाषाओं में अपडेट हो जाएगा। हिन्दी नाम
**Hindi Profile** बॉक्स के अंदर है — उसे खोलने के लिए **Choose Language to
Edit** में **Hindi / हिन्दी** चुनें। अंग्रेज़ी नाम वैसा ही रहने दें, वेबसाइट
दोनों का मिलान खुद कर लेती है।

### Change the Prime Minister or Chief Minister homepage portrait / होमपेज पर PM/CM की फोटो बदलना

1. Open **Homepage → Homepage Leaders**.
2. For Modi's photo, open **Prime Minister Portrait**.
3. For Yogi's photo, open **Chief Minister Portrait**.
4. Choose **Upload File from Device** and select the new image.
5. Wait until the thumbnail appears in that exact field.
6. Press **Save** at the top-right, then refresh the homepage.

This changes the homepage portrait only. Organisation-chart portraits are
edited separately in **Organisation Chart**.

**हिन्दी:**

1. **Homepage → Homepage Leaders** खोलें।
2. मोदी जी की फोटो के लिए **Prime Minister Portrait** खोलें।
3. योगी जी की फोटो के लिए **Chief Minister Portrait** खोलें।
4. **Upload File from Device** चुनकर नई तस्वीर चुनें।
5. उसी फ़ील्ड में थंबनेल दिखने तक रुकें।
6. ऊपर-दाएँ **Save** दबाएँ, फिर होमपेज रीफ़्रेश करें।

इससे सिर्फ़ होमपेज की फोटो बदलती है। संगठन चार्ट की फोटो अलग से
**Organisation Chart** में बदलती हैं।

### Change the homepage video / होमपेज वीडियो बदलना

1. Open **Homepage → Homepage Video**.
2. Open the published record.
3. Upload the first image in **Poster Image**.
4. Upload an MP4 in **Video File** only when a video is required.
5. To show only the poster image, clear **Video File**.
6. Save and test on desktop and mobile.

**हिन्दी:**

1. **Homepage → Homepage Video** खोलें।
2. Published रिकॉर्ड खोलें।
3. पहली तस्वीर **Poster Image** में अपलोड करें।
4. वीडियो चाहिए तभी **Video File** में MP4 अपलोड करें।
5. सिर्फ़ पोस्टर दिखाना हो तो **Video File** खाली कर दें।
6. Save करें और डेस्कटॉप व मोबाइल दोनों पर जाँचें।

### Add a header logo / हेडर लोगो जोड़ना

1. Open **Homepage → Header Logos**.
2. Click **Create Item**.
3. Enter a short title and a meaningful image description.
4. Upload a transparent PNG or WebP in **Logo Image**.
5. Choose **Supporting emblem / logo (right)**.
6. Set Visibility to Published and Save.

Use **Primary RSAC identity (left)** only for the main RSAC logo. Do not upload
a logo inside a large white square; use a transparent image.

**हिन्दी:**

1. **Homepage → Header Logos** खोलें।
2. **Create Item** पर क्लिक करें।
3. छोटा शीर्षक और तस्वीर का सार्थक विवरण लिखें।
4. **Logo Image** में पारदर्शी (transparent) PNG या WebP अपलोड करें।
5. **Supporting emblem / logo (right)** चुनें।
6. Visibility को Published करके Save करें।

**Primary RSAC identity (left)** सिर्फ़ मुख्य RSAC लोगो के लिए है। बड़े सफ़ेद
चौकोर के अंदर वाला लोगो न चढ़ाएँ; पारदर्शी तस्वीर इस्तेमाल करें।

### Add a notice PDF / सूचना (नोटिस) PDF जोड़ना

1. Open **Public Information → Notices and Circulars**.
2. Click **Create Item**.
3. Enter the notice title, category, information, and dates.
4. Open **PDF Document** and upload the PDF from the device.
5. Wait until its filename appears.
6. Set Visibility to Published and Save.

Do not paste a link from `rsac.up.gov.in`. Notice PDFs must be uploaded into the
record and are served by this project.

**हिन्दी:**

1. **Public Information → Notices and Circulars** खोलें।
2. **Create Item** पर क्लिक करें।
3. नोटिस का शीर्षक, श्रेणी, जानकारी और तारीख़ें भरें।
4. **PDF Document** खोलकर डिवाइस से PDF अपलोड करें।
5. फ़ाइल-नाम दिखने तक रुकें।
6. Visibility को Published करके Save करें।

`rsac.up.gov.in` का लिंक paste न करें। नोटिस की PDF रिकॉर्ड के अंदर ही अपलोड
होनी चाहिए — उसे यही प्रोजेक्ट दिखाता है।

### Add a flood-report PDF / बाढ़ रिपोर्ट PDF जोड़ना

1. Open **Public Information → Flood Reports**.
2. Click **Create Item**.
3. Enter the report title, report date, coverage, and short information.
4. Open **PDF Document** and upload the PDF.
5. Set Visibility to Published and Save.

Reports with similar titles are allowed when their report dates are different.

About old flood seasons: the website already stores every past season
(Flood 2016 up to Flood 2025) inside the project itself, so the year buttons on
the Flood page open local copies — visitors are never sent to the old RSAC
website. You do not manage those old PDFs in Directus; you only add **new**
reports here, and each new report automatically appears at the top of the Flood
page under its own date.

**हिन्दी:**

1. **Public Information → Flood Reports** खोलें।
2. **Create Item** पर क्लिक करें।
3. रिपोर्ट का शीर्षक, तारीख़, क्षेत्र और छोटी जानकारी भरें।
4. **PDF Document** खोलकर PDF अपलोड करें।
5. Visibility को Published करके Save करें।

तारीख़ें अलग हों तो मिलते-जुलते शीर्षक वाली रिपोर्टें चल सकती हैं।

पुराने बाढ़ सीज़न: वेबसाइट हर पुराना सीज़न (Flood 2016 से Flood 2025 तक)
प्रोजेक्ट के अंदर ही रखती है, इसलिए Flood पेज के साल वाले बटन स्थानीय कॉपी
खोलते हैं — आगंतुक कभी पुरानी RSAC वेबसाइट पर नहीं भेजे जाते। वे पुरानी PDF आप
Directus में नहीं संभालते; यहाँ सिर्फ़ **नई** रिपोर्ट जोड़ते हैं, और हर नई
रिपोर्ट अपनी तारीख़ के साथ Flood पेज पर सबसे ऊपर अपने-आप दिखती है।

### Edit RTI, tenders, feedback, or FAQ / आरटीआई, टेंडर, फीडबैक या FAQ बदलना

1. Open **Public Information → Public Information Pages**.
2. Open the required page.
3. Edit its English or Hindi sections using the visual form.
4. Use **Add Item** for another section or link.
5. Save and open the exact public page to check it.

**हिन्दी:**

1. **Public Information → Public Information Pages** खोलें।
2. ज़रूरी पेज खोलें।
3. विज़ुअल फ़ॉर्म से उसके English या Hindi सेक्शन बदलें।
4. नया सेक्शन या लिंक जोड़ने के लिए **Add Item** इस्तेमाल करें।
5. Save करें और वही सार्वजनिक पेज खोलकर जाँचें।

### Read feedback sent by website visitors / आगंतुकों का भेजा फीडबैक पढ़ना

When a visitor fills the Feedback form on the website, their message is stored
in Directus automatically.

1. Open **Website Feedback** in the left menu.
2. Newest entries are on top; open one to read the full message and contact
   details.

These entries are read-only — visitors wrote them, so nobody can edit them.
(If the CMS is ever offline, the website form falls back to opening the
visitor's email app instead.)

**हिन्दी:** जब कोई आगंतुक वेबसाइट पर Feedback फ़ॉर्म भरता है, तो उसका संदेश
अपने-आप Directus में सुरक्षित हो जाता है।

1. बाएँ मेन्यू में **Website Feedback** खोलें।
2. सबसे नई प्रविष्टियाँ ऊपर हैं; किसी को खोलकर पूरा संदेश और संपर्क विवरण पढ़ें।

ये प्रविष्टियाँ read-only हैं — इन्हें आगंतुकों ने लिखा है, इसलिए कोई बदल नहीं
सकता। (CMS कभी बंद हो तो वेबसाइट का फ़ॉर्म आगंतुक का ईमेल ऐप खोल देता है।)

### Add a gallery photograph / गैलरी में फोटो जोड़ना

1. Open **Public Information → Photo Gallery**.
2. Click **Create Item**.
3. Upload the photograph.
4. Add a short caption and a useful image description.
5. Add Hindi text when available.
6. Set Visibility to Published and Save.

**हिन्दी:**

1. **Public Information → Photo Gallery** खोलें।
2. **Create Item** पर क्लिक करें।
3. फोटो अपलोड करें।
4. छोटा कैप्शन और उपयोगी विवरण लिखें।
5. उपलब्ध हो तो हिन्दी टेक्स्ट जोड़ें।
6. Visibility को Published करके Save करें।

### Change contact details / संपर्क विवरण बदलना

1. Open **Public Information → Contact Details**.
2. Change the address, phone, mobile, or email.
3. Use **Add Item** to add another office contact.
4. Save and check the Contact page and footer.

**हिन्दी:**

1. **Public Information → Contact Details** खोलें।
2. पता, फ़ोन, मोबाइल या ईमेल बदलें।
3. नया कार्यालय संपर्क जोड़ने के लिए **Add Item** इस्तेमाल करें।
4. Save करें और Contact पेज व फुटर जाँचें।

### Hide something without deleting it / बिना delete किए छिपाना

1. Open the item.
2. Open **Visibility** or **Publish and Order**.
3. Choose `Draft`.
4. Save.

Use `Published` to show it again. Prefer Draft instead of Delete.

**हिन्दी:**

1. आइटम खोलें।
2. **Visibility** या **Publish and Order** खोलें।
3. `Draft` चुनें।
4. Save करें।

दोबारा दिखाने के लिए `Published` चुनें। Delete की जगह हमेशा Draft चुनें।

### Remove the notices strip, the tab bar, or a homepage heading / नोटिस पट्टी, टैब बार या होमपेज शीर्षक हटाना

**Notices strip (the scrolling "What's New" band) or the tab bar below the
banner:** these are switched off from the **Site Settings** record's **Layout**
field, in the `hiddenHomeSections` list (a short list of words). Add
`announcementTicker` to hide the scrolling notices strip, or `homeSectionNav` to
hide the tab bar; remove the word to bring it back. It is a small list edit — ask
a developer if you are unsure. Nothing is deleted, only hidden.

**Any page heading or its intro line — a homepage section (About / Services /
Mission / Visit-Us) or a standalone page such as the Sitemap:** open
**Homepage → Website Text Editor**, search for a word in that heading (for the
Sitemap page search **Sitemap** → rows **Page Content - Sitemap - Title** and
**Page Content - Sitemap - Intro**), open the row, and clear the text in both the
**English Text** and **Hindi Text** boxes (leave them blank). The website then
drops that heading/intro and closes the gap automatically, in both languages.
Type the words back to restore it.

**A section landing page's big heading (the Facilities / About Us / Divisions /
Academics page that shows a grid of cards):** open **Content → Website Sections**,
open that section (e.g. **Facilities**), and clear its **Title** and **Intro**
(both the English Content and Hindi Content groups). The page then keeps only the
small orange kicker (which grows a little to stand on its own) and drops the
heading, intro, and the breadcrumb line — in both languages. Type the Title back
to bring the full header, intro, and breadcrumb back. Leave **Kicker** and
**Website Address** as they are.

**हिन्दी:**

**नोटिस पट्टी (चलती "What's New" पट्टी) या बैनर के नीचे का टैब बार:** ये
**Site Settings** रिकॉर्ड के **Layout** फ़ील्ड की `hiddenHomeSections` सूची (कुछ
शब्दों की छोटी सूची) से बंद होती हैं। नोटिस पट्टी हेतु `announcementTicker` जोड़ें,
टैब बार हेतु `homeSectionNav`; शब्द हटाने पर वापस दिखेगी। यह छोटा सूची-संपादन है —
संदेह हो तो डेवलपर से पूछें। कुछ delete नहीं होता, केवल छिपता है।

**किसी भी पेज का शीर्षक या उसकी intro पंक्ति — होमपेज का सेक्शन (About / Services /
Mission / Visit-Us) या Sitemap जैसा अलग पेज:** **Homepage → Website Text Editor**
में उस शीर्षक का कोई शब्द खोजें (Sitemap पेज हेतु **Sitemap** खोजें → rows
**Page Content - Sitemap - Title** और **Page Content - Sitemap - Intro**), row खोलें
और **English Text** तथा **Hindi Text** दोनों box खाली कर दें। वेबसाइट वह शीर्षक/intro
दोनों भाषाओं में हटा देती है और gap अपने आप बंद कर देती है। शब्द वापस लिखने पर फिर दिखेगा।

**किसी सेक्शन लैंडिंग पेज का बड़ा शीर्षक (Facilities / About Us / Divisions /
Academics — कार्ड ग्रिड वाला पेज):** **Content → Website Sections** खोलें, वह सेक्शन
खोलें (जैसे **Facilities**), और उसका **Title** तथा **Intro** खाली कर दें (English
Content और Hindi Content दोनों group में)। तब पेज पर केवल छोटा नारंगी kicker रहता है
(जो थोड़ा बड़ा होकर अकेले टिका रहता है) और शीर्षक, intro तथा breadcrumb पंक्ति हट जाती
है — दोनों भाषाओं में। Title वापस लिखने पर पूरा header, intro और breadcrumb फिर दिखते
हैं। **Kicker** और **Website Address** वैसे ही रहने दें।

### Change display order / दिखने का क्रम बदलना

When a collection shows **Display Order**, smaller numbers appear first.

Example: `1` appears before `2`. Do not give every record the same number.

**हिन्दी:** जहाँ **Display Order** दिखे, वहाँ छोटा नंबर पहले दिखता है।
उदाहरण: `1` पहले, `2` बाद में। हर रिकॉर्ड को एक जैसा नंबर न दें।

## 6. Uploading files correctly / फ़ाइलें सही तरीके से अपलोड करना

Always follow this order:

1. Open the record that needs the file.
2. Click its Photo, Logo, PDF, Poster, Video, or Download field.
3. Choose **Upload File from Device**.
4. Wait for the thumbnail or filename.
5. Save the record.

Uploading a file only in **File Library** is incomplete. The website cannot know
which record should use it.

Avoid **Replace File** unless you know the file is used in only one place. A
single library file can be shared by several records.

**हिन्दी:** हमेशा यही क्रम अपनाएँ:

1. जिस रिकॉर्ड को फ़ाइल चाहिए, उसे खोलें।
2. उसका Photo, Logo, PDF, Poster, Video या Download फ़ील्ड क्लिक करें।
3. **Upload File from Device** चुनें।
4. थंबनेल या फ़ाइल-नाम दिखने तक रुकें।
5. रिकॉर्ड Save करें।

सिर्फ़ **File Library** में अपलोड करना अधूरा है — वेबसाइट को पता ही नहीं चलेगा
कि फ़ाइल किस रिकॉर्ड की है।

**Replace File** से बचें, जब तक पक्का न हो कि फ़ाइल सिर्फ़ एक जगह इस्तेमाल होती
है। लाइब्रेरी की एक फ़ाइल कई रिकॉर्ड साझा कर सकते हैं।

## 7. Common mistakes / आम गलतियाँ

| Mistake / गलती | What happens / क्या होता है | How to fix it / कैसे ठीक करें |
|---|---|---|
| Forgot to press Save / Save दबाना भूल गए | The change disappears / बदलाव गायब | Open the record, change it again, press Save / रिकॉर्ड खोलकर दोबारा बदलें और Save दबाएँ |
| Visibility is Draft / Visibility Draft है | Item does not appear publicly / आइटम सार्वजनिक नहीं दिखता | Change Visibility to Published and Save / Visibility को Published करके Save करें |
| Uploaded only to File Library / सिर्फ़ File Library में अपलोड किया | Photo or PDF is not connected / फोटो-PDF जुड़ी नहीं | Upload again inside the correct record field / सही रिकॉर्ड फ़ील्ड के अंदर दोबारा अपलोड करें |
| Pasted an old RSAC PDF link / पुरानी RSAC PDF का लिंक चिपकाया | Website depends on another server / वेबसाइट दूसरे सर्वर पर निर्भर | Remove the link and upload the PDF locally / लिंक हटाकर PDF यहीं अपलोड करें |
| Edited English but checked Hindi / बदला English में, देखा Hindi में | Old Hindi or English fallback appears / पुरानी हिन्दी या अंग्रेज़ी fallback दिखती है | Edit the Hindi box and Save / Hindi बॉक्स बदलकर Save करें |
| Created a duplicate leader / अधिकारी का डुप्लीकेट रिकॉर्ड बनाया | Two similar records become confusing / दो मिलते-जुलते रिकॉर्ड भ्रम पैदा करते हैं | Update the fixed existing position; hide the duplicate / मौजूदा पद अपडेट करें; डुप्लीकेट छिपाएँ |
| Changed a page address / पेज का पता (address) बदला | Menu links may stop working / मेन्यू लिंक टूट सकते हैं | Restore the previous address or ask a developer / पुराना पता वापस करें या डेवलपर से पूछें |
| Deleted an item accidentally / गलती से आइटम delete किया | Content disappears / सामग्री गायब | Stop editing and ask the administrator to restore the backup / संपादन रोकें, एडमिनिस्ट्रेटर से backup बहाल करवाएँ |
| Replaced a shared library file / साझा लाइब्रेरी फ़ाइल Replace की | Several pages may change together / कई पेज एक साथ बदल सकते हैं | Upload a new file and attach it only to the intended record / नई फ़ाइल अपलोड कर सिर्फ़ सही रिकॉर्ड से जोड़ें |
| Pasted formatted text from Word / Word से फ़ॉर्मेटेड टेक्स्ट चिपकाया | Strange spacing or fonts appear / अजीब स्पेसिंग/फ़ॉन्ट दिखते हैं | Paste plain text and use the Directus toolbar / सादा टेक्स्ट चिपकाएँ, Directus टूलबार इस्तेमाल करें |
| Photo crops the face / फोटो में चेहरा कट रहा है | Important part is hidden / ज़रूरी हिस्सा छिप जाता है | Change Photo Alignment and Save / Photo Alignment बदलकर Save करें |
| PDF is not opening / PDF नहीं खुल रही | Upload may be incomplete or wrong type / अपलोड अधूरा या गलत प्रकार | Re-upload a valid PDF inside the record / रिकॉर्ड के अंदर सही PDF दोबारा अपलोड करें |

## 8. Change does not appear / बदलाव दिख नहीं रहा

Check these in order:

1. Did you press **Save**?
2. Is **Visibility = Published**?
3. Did you edit the correct English or Hindi field?
4. Is the file attached inside the record?
5. Press `Ctrl+F5` once.
6. Make sure Directus is running at `http://localhost:8055`.
7. Run `npm run cms:validate` if the problem remains.

Do not run force-seed, delete the database, or change Data Model settings to fix
a normal editing problem.

**हिन्दी:** क्रम से जाँचें:

1. क्या **Save** दबाया?
2. क्या **Visibility = Published** है?
3. क्या सही English या Hindi फ़ील्ड बदला?
4. क्या फ़ाइल रिकॉर्ड के अंदर जुड़ी है?
5. एक बार `Ctrl+F5` दबाएँ।
6. जाँचें कि Directus `http://localhost:8055` पर चल रहा है।
7. समस्या रहे तो `npm run cms:validate` चलाएँ।

सामान्य संपादन समस्या के लिए force-seed न चलाएँ, डेटाबेस delete न करें, और
Data Model सेटिंग न बदलें।

## 9. Safe commands / सुरक्षित कमांड

| Command / कमांड | When to use it / कब इस्तेमाल करें |
|---|---|
| `npm run dev` | Normal local work; starts the website and local CMS / सामान्य काम; वेबसाइट और लोकल CMS दोनों शुरू करता है |
| `npm run cms:start` | Start only Directus / सिर्फ़ Directus शुरू करता है |
| `npm run cms:validate` | Check CMS fields, files, permissions, and protected data / CMS फ़ील्ड, फ़ाइलें, अनुमतियाँ और संरक्षित डेटा जाँचता है |
| `npm run lint` | Check source-code quality before handoff / सौंपने से पहले कोड-गुणवत्ता जाँच |
| `npm run build` | Create and verify the production website build / प्रोडक्शन बिल्ड बनाकर जाँचता है |
| `npm run cms:preflight` | Diagnose local CMS/PostgreSQL setup problems / लोकल CMS/PostgreSQL सेटअप की समस्या पहचानता है |
| `npm run cms:upgrade` | Apply an approved additive CMS update after pulling newer code / नया कोड लेने के बाद स्वीकृत CMS अपडेट लागू करता है |

Do not use force-seed or synchronization commands during normal editing. They
are developer and recovery tools.

**हिन्दी:** सामान्य संपादन में force-seed या synchronization कमांड इस्तेमाल न
करें — वे डेवलपर और रिकवरी के औज़ार हैं।

## 10. Moving the project to another server / प्रोजेक्ट दूसरे सर्वर पर ले जाना

The technical team needs all of these together:

1. Project source code.
2. The latest PostgreSQL backup.
3. The matching `backend/directus/uploads` backup.
4. Private environment files and passwords through a secure channel.
5. `DEPLOYMENT_NGINX.md`.

The project contains local copies of its official PDFs and legacy media under
`public/documents` and `public/official-media`. Directus uploads still need to be
backed up because newly uploaded editor files are stored there.

**हिन्दी:** तकनीकी टीम को ये सब एक साथ चाहिए:

1. प्रोजेक्ट का सोर्स कोड।
2. सबसे नया PostgreSQL backup।
3. उसी समय का `backend/directus/uploads` backup।
4. निजी environment फ़ाइलें और पासवर्ड — सुरक्षित माध्यम से।
5. `DEPLOYMENT_NGINX.md`।

आधिकारिक PDF और पुरानी मीडिया की स्थानीय कॉपियाँ `public/documents` और
`public/official-media` में प्रोजेक्ट के अंदर ही हैं। फिर भी Directus uploads का
backup ज़रूरी है, क्योंकि संपादक की नई अपलोड की गई फ़ाइलें वहीं रहती हैं।

## 11. When to ask a developer / डेवलपर से कब पूछें

Ask before doing any of these:

- Changing a page address, collection, field, or Data Model setting.
- Adding a new organisation-chart position or changing chart arrows.
- Deleting a leader, page, notice, or report permanently.
- Running a force-seed or database restore.
- Replacing many files at once.
- Changing deployment, Nginx, PostgreSQL, or environment settings.

**Short version:** open the correct record, edit the labelled field, attach the
file inside that record, keep it Published, press Save, and refresh.

**हिन्दी:** ये काम करने से पहले पूछें:

- पेज का पता, collection, field या Data Model सेटिंग बदलना।
- संगठन चार्ट में नया पद जोड़ना या तीर बदलना।
- किसी अधिकारी, पेज, नोटिस या रिपोर्ट को स्थायी रूप से delete करना।
- force-seed या database restore चलाना।
- एक साथ बहुत-सी फ़ाइलें बदलना।
- deployment, Nginx, PostgreSQL या environment सेटिंग बदलना।

**छोटा सार:** सही रिकॉर्ड खोलो, लेबल वाला फ़ील्ड बदलो, फ़ाइल उसी रिकॉर्ड के अंदर
जोड़ो, Published रखो, Save दबाओ, और वेबसाइट रीफ़्रेश करो।

## Removing text, and homepage sections (2026-07-08)

### English
**To remove text, clear the field (leave it blank) — do not delete the row.**
A blank field now stays blank on the site; the old default no longer comes back.
Deleting a Website-Text row instead brings the built-in default text back.

**Homepage sections — Operational Domains, Services and Programmes, Institution at
a Glance:**
- Their **titles, descriptions, and existing card/stat text** are editable today
  in the **Website Text** editor (each label is a row). Edit the text, keep it
  Published, save, refresh.
- **Adding / deleting / reordering whole cards or stats** is not a normal-user
  action yet — those items are stored together and need a developer to switch
  them to editable lists first (see `CMS_DEVELOPER_NOTES.md`). Ask the developer
  to set this up; until then, only edit existing item text.

**Fonts:** once the developer adds the font dropdowns to a section, you will pick
a font and weight from a list per section — never type CSS. Missing/blank = the
normal default font.

**Do NOT touch:** anything showing raw JSON, HTML, CSS, code, file paths, keys, or
IDs. Edit only labelled text, images, links, sort order, and Published status.

### हिन्दी
**text हटाना हो तो field खाली कर दें (blank) — row delete न करें।** अब खाली field
साइट पर खाली ही रहेगा; पुराना default वापस नहीं आता। Website-Text की **row delete**
करने पर built-in default text लौट आता है।

**Homepage sections — Operational Domains, Services and Programmes, Institution at
a Glance:**
- इनके **title, description और मौजूदा card/stat text** अभी **Website Text** editor
  में बदले जा सकते हैं (हर label एक row है)। text बदलो, Published रखो, save, refresh।
- **पूरे card/stat जोड़ना / हटाना / क्रम बदलना** अभी normal-user काम नहीं है — ये
  items एक साथ रखे हैं; पहले developer इन्हें editable list बनाएगा (देखें
  `CMS_DEVELOPER_NOTES.md`)। तब तक सिर्फ मौजूदा text बदलें।

**Fonts:** जब developer किसी section में font dropdown जोड़ देगा, आप list से font और
weight चुनेंगे — CSS कभी टाइप नहीं करना। खाली/missing = normal default font।

**इन्हें हाथ न लगाएँ:** raw JSON, HTML, CSS, code, file path, key या ID वाला कोई भी
field। सिर्फ label वाला text, image, link, sort order और Published status बदलें।
