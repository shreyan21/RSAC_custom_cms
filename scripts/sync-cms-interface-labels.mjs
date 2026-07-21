import { pool } from "../server/db.js";
import { hiTranslations } from "../src/data/translations.js";
import { uiLabelDefaults } from "../src/data/uiLabels.js";

const manualHindi = {
  // Kept here only for the one-time CMS migration. The public website reads
  // these values back from PostgreSQL and never imports this map.
  "ID": "आईडी",
  "Profile": "प्रोफ़ाइल",
  "Profile Details": "प्रोफ़ाइल विवरण",
  "All Rights Reserved.": "सर्वाधिकार सुरक्षित।",
  "Last updated:": "अंतिम अद्यतन:",
  "Loading content": "सामग्री लोड हो रही है",
  "Skip to main content": "मुख्य सामग्री पर जाएं",
  "Skip to Content": "मुख्य सामग्री",
  "Reader": "रीडर",
  "Display options": "प्रदर्शन विकल्प",
  "Open site search": "साइट खोज खोलें",
  "Search site": "साइट खोजें",
  "Decrease text size": "पाठ का आकार घटाएं",
  "Reset text size": "पाठ का आकार सामान्य करें",
  "Increase text size": "पाठ का आकार बढ़ाएं",
  "Contrast": "कंट्रास्ट",
  "Toggle high contrast mode": "उच्च कंट्रास्ट मोड बदलें",
  "Map": "मानचित्र",
  "Accessibility display options": "सुगम्यता प्रदर्शन विकल्प",
  "Adjust presentation without changing the underlying content.": "मूल सामग्री बदले बिना प्रस्तुति समायोजित करें।",
  "Close display options": "प्रदर्शन विकल्प बंद करें",
  "Accessibility statement": "सुगम्यता वक्तव्य",
  "Reset display": "प्रदर्शन सामान्य करें",
  "Close search": "खोज बंद करें",
  "Search RSAC website": "आरएसएसी वेबसाइट खोजें",
  "Select language": "भाषा चुनें",
  "Hindi short label": "हिं",
  "English short label": "EN",
  "Text spacing": "पाठ अंतराल",
  "Increase letter and word spacing": "अक्षर और शब्दों के बीच अंतर बढ़ाएं",
  "Line height": "पंक्ति ऊंचाई",
  "Add breathing room between lines": "पंक्तियों के बीच अंतर बढ़ाएं",
  "Hide images": "चित्र छिपाएं",
  "Keep text and layout, hide visual media": "पाठ और लेआउट रखते हुए दृश्य सामग्री छिपाएं",
  "Large cursor": "बड़ा कर्सर",
  "Use a larger high-visibility pointer": "अधिक स्पष्ट बड़ा सूचक उपयोग करें",
  "Search RSAC-UP": "आरएसएसी-यूपी खोजें",
  "Pages, profiles, divisions, facilities, academics, and portals.": "पृष्ठ, प्रोफ़ाइल, प्रभाग, सुविधाएं, शैक्षणिक सामग्री और पोर्टल।",
  "Search divisions, scientists, facilities, academics and geo-portals": "प्रभाग, वैज्ञानिक, सुविधाएं, शैक्षणिक सामग्री और जियो-पोर्टल खोजें",
  "Type a name, division, facility, PDF topic, or portal": "नाम, प्रभाग, सुविधा, पीडीएफ विषय या पोर्टल लिखें",
  "Search Results": "खोज परिणाम",
  "found": "मिले",
  "Type at least 2 characters for site search.": "साइट खोज के लिए कम से कम 2 अक्षर लिखें।",
  "No matching result found.": "कोई मेल खाता परिणाम नहीं मिला।",
  "Try searching for GIS, agriculture, water, training, disaster, or remote sensing.": "जीआईएस, कृषि, जल, प्रशिक्षण, आपदा या सुदूर संवेदन खोजकर देखें।",
  "Back": "वापस",
  "Feedback Form": "प्रतिक्रिया फॉर्म",
  "Complete the form below to send us your comments and feedback on the website. Your opinion and suggestions are very much appreciated. If you provide your contact information, we will be able to answer your questions.": "वेबसाइट पर अपनी टिप्पणी और प्रतिक्रिया भेजने के लिए नीचे दिया गया फॉर्म भरें। आपके विचार और सुझाव हमारे लिए बहुमूल्य हैं। संपर्क विवरण देने पर हम आपके प्रश्नों का उत्तर दे सकेंगे।",
  "Fields marked with * are mandatory.": "* चिह्नित फ़ील्ड अनिवार्य हैं।",
  "Name": "नाम",
  "Email Id": "ईमेल आईडी",
  "Postal Address": "डाक पता",
  "Country": "देश",
  "State": "राज्य",
  "District": "जनपद",
  "Phone No.": "दूरभाष संख्या",
  "Comments / Suggestion": "टिप्पणी / सुझाव",
  "India": "भारत",
  "Other": "अन्य",
  "Send Feedback": "प्रतिक्रिया भेजें",
  "Reset": "रीसेट करें",
  "This field is required.": "यह फ़ील्ड आवश्यक है।",
  "Enter a valid email Id.": "मान्य ईमेल आईडी दर्ज करें।",
  "Enter a valid phone number.": "मान्य दूरभाष संख्या दर्ज करें।",
  "Thank you!": "धन्यवाद!",
  "Your email app has opened with your feedback. Please confirm to send it.": "आपका ईमेल ऐप आपकी प्रतिक्रिया के साथ खुल गया है। कृपया भेजने की पुष्टि करें।",
  "Your feedback has been recorded successfully. Thank you for your suggestions.": "आपकी प्रतिक्रिया सफलतापूर्वक दर्ज हो गई है। आपके सुझावों के लिए धन्यवाद।",
  "Sending...": "भेजा जा रहा है...",
  "Send another response": "एक और प्रतिक्रिया भेजें",
  "Feedback could not be submitted. Please try again.": "प्रतिक्रिया दर्ज नहीं हो सकी। कृपया पुनः प्रयास करें।",
  "Download": "डाउनलोड",
  "Website content unavailable": "वेबसाइट सामग्री उपलब्ध नहीं है",
  "Try again": "पुनः प्रयास करें",
  "CMS preview only. Live website is unchanged.": "केवल सीएमएस पूर्वावलोकन। लाइव वेबसाइट में कोई बदलाव नहीं हुआ है।",
  "Exit preview": "पूर्वावलोकन बंद करें",
  "You are leaving this website": "आप यह वेबसाइट छोड़ रहे हैं",
  "You are about to open an external website that is not maintained by RSAC-UP. Its content, privacy practices, and availability are the responsibility of the external provider.": "आप एक बाहरी वेबसाइट खोलने जा रहे हैं जिसका रखरखाव आरएसएसी-यूपी नहीं करता। उसकी सामग्री, गोपनीयता व्यवस्था और उपलब्धता की जिम्मेदारी संबंधित बाहरी प्रदाता की है।",
  "Destination": "गंतव्य",
  "Continue": "जारी रखें",
  "Cancel": "रद्द करें",
  "Switch website to Hindi": "वेबसाइट को हिंदी में बदलें",
  "You are about to view this website in Hindi. Core navigation and content are translated; some official documents and records may still appear in English.": "आप इस वेबसाइट को हिंदी में देखने जा रहे हैं। मुख्य नेविगेशन और सामग्री का अनुवाद किया गया है; कुछ आधिकारिक दस्तावेज और अभिलेख अभी भी अंग्रेजी में दिखाई दे सकते हैं।",
  "Switch to Hindi": "हिंदी में बदलें",
  "Stay in English": "अंग्रेजी में रहें",
  "Open in new tab": "नई विंडो में खोलें",
  "This document is opened within this website.": "यह दस्तावेज इसी वेबसाइट के भीतर खोला गया है।",
  "Document": "दस्तावेज",
  "Website Policy": "वेबसाइट नीति",
  "Website Policies": "वेबसाइट नीतियां",
  "Back to Home": "मुखपृष्ठ पर वापस जाएं",
  "View Sitemap": "साइटमैप देखें",
  "Related Policies": "संबंधित नीतियां",
  "Public Services": "जन सेवाएं",
  "Post": "पद",
  "Phone": "दूरभाष",
  "View": "देखें",
  "Open official service": "आधिकारिक सेवा खोलें",
  "Page": "पृष्ठ",
  "Section": "अनुभाग",
  "End of content.": "सामग्री समाप्त।",
  "S.No.": "क्र. सं.",
  "Field Outputs": "क्षेत्रीय आउटपुट",
  "View document": "दस्तावेज देखें",
  "Open webpage": "वेबपृष्ठ खोलें",
  "Close menu": "मेनू बंद करें",
  "Open menu": "मेनू खोलें",
  "Main menu": "मुख्य मेनू",
  "Main navigation": "मुख्य नेविगेशन",
  "Use arrow keys to move through sections.": "अनुभागों में जाने के लिए तीर कुंजियों का उपयोग करें।",
  "Remote sensing, GIS and public services": "सुदूर संवेदन, जीआईएस और जन सेवाएं",
  "Back to top": "ऊपर जाएं",
  "Domain Brief": "क्षेत्र संक्षेप",
  "Close brief": "संक्षेप बंद करें",
  "Scientific Services": "वैज्ञानिक सेवाएं",
  "Operational Programmes": "संचालन कार्यक्रम",
  "Division": "प्रभाग",
  "Notice": "सूचना",
  "Geoportal": "जियोपोर्टल",
  "Policy": "नीति",
  "Contact RSAC-UP": "आरएसएसी-यूपी से संपर्क करें",
  "Facilities Available": "उपलब्ध सुविधाएं",
  "Completed Training Programme in last 05 year": "पिछले 05 वर्षों में पूर्ण प्रशिक्षण कार्यक्रम",
  "Calendar of Training Programmes in the year 2021-22": "वर्ष 2021-22 के प्रशिक्षण कार्यक्रमों का कैलेंडर",
  "quick sections": "त्वरित अनुभाग",
  "sections": "अनुभाग",
};

const result = await pool.query(
  `SELECT id, entry_key, data_en, data_hi
   FROM cms_entries
   WHERE collection='site_settings' AND status <> 'archived'
   ORDER BY sort_order, id
   LIMIT 1`
);
const row = result.rows[0];
if (!row) throw new Error("Published site_settings entry not found.");

const dataEn = structuredClone(row.data_en || {});
const dataHi = structuredClone(row.data_hi || {});
dataEn.settings ||= {};
dataHi.settings ||= {};
const currentEn = dataEn.settings.interfaceLabels || {};
const currentHi = dataHi.settings.interfaceLabels || {};
const nextEn = { ...currentEn };
const nextHi = { ...currentHi };
const missingHindi = [];

for (const [slug, english] of Object.entries(uiLabelDefaults)) {
  if (!String(nextEn[slug] || "").trim()) nextEn[slug] = english;
  if (!String(nextHi[slug] || "").trim()) {
    const hindi = hiTranslations[english] || manualHindi[english];
    if (hindi) nextHi[slug] = hindi;
    else missingHindi.push(english);
  }
}

if (missingHindi.length) {
  console.error(`Hindi translations required for ${missingHindi.length} CMS labels:\n- ${missingHindi.join("\n- ")}`);
  await pool.end();
  process.exit(1);
}

dataEn.settings.interfaceLabels = nextEn;
dataHi.settings.interfaceLabels = nextHi;
dataEn.settings.footer = {
  ...(dataEn.settings.footer || {}),
  allRightsReserved: dataEn.settings.footer?.allRightsReserved || "All Rights Reserved.",
  lastUpdatedLabel: dataEn.settings.footer?.lastUpdatedLabel || "Last updated:",
};
dataHi.settings.footer = {
  ...(dataHi.settings.footer || {}),
  allRightsReserved: dataHi.settings.footer?.allRightsReserved || "सर्वाधिकार सुरक्षित।",
  lastUpdatedLabel: dataHi.settings.footer?.lastUpdatedLabel || "अंतिम अद्यतन:",
};
dataEn.settings.pageContent ||= {};
dataHi.settings.pageContent ||= {};
dataEn.settings.pageContent.downloads ||= {
  eyebrow: "Public Services",
  title: "Downloads",
  intro: "Download official RSAC-UP documents and publications.",
  emptyText: "No downloads have been published yet.",
  openLabel: "Open",
  backLabel: "Back to Home",
};
dataHi.settings.pageContent.downloads ||= {
  eyebrow: "जन सेवाएं",
  title: "डाउनलोड",
  intro: "आरएसएसी-यूपी के आधिकारिक दस्तावेज और प्रकाशन डाउनलोड करें।",
  emptyText: "अभी कोई डाउनलोड प्रकाशित नहीं किया गया है।",
  openLabel: "खोलें",
  backLabel: "मुखपृष्ठ पर वापस जाएं",
};

const soilResult = await pool.query(
  `SELECT id, data_en, data_hi
   FROM cms_entries
   WHERE collection='pages' AND entry_key='soil-analysis-lab1' AND status <> 'archived'
   LIMIT 1`
);
const soilRow = soilResult.rows[0];
const soilHindi = soilRow ? structuredClone(soilRow.data_hi || {}) : null;
if (soilHindi) {
  soilHindi.blocks ||= [];
  const englishMapBlock = (soilRow.data_en?.blocks || []).find((block) =>
    /map\s*\/?\s*photos/i.test(`${block.key || ""} ${block.label || ""} ${block.value || ""} ${block.sourceLabel || ""}`)
  );
  if (englishMapBlock) {
    const hindiIndex = soilHindi.blocks.findIndex((block) => block.id === englishMapBlock.id);
    const existingHindi = hindiIndex >= 0 ? soilHindi.blocks[hindiIndex] : {};
    const localizedMapBlock = {
      ...structuredClone(englishMapBlock),
      ...existingHindi,
      label: existingHindi.label || "मानचित्र/तस्वीरें",
      value: existingHindi.value || "मानचित्र/तस्वीरें",
      sourceLabel: existingHindi.sourceLabel || "मानचित्र/तस्वीरें",
    };
    if (hindiIndex >= 0) soilHindi.blocks[hindiIndex] = localizedMapBlock;
    else soilHindi.blocks.push(localizedMapBlock);
  }
}

await pool.query("BEGIN");
try {
  await pool.query(
    `UPDATE cms_entries
     SET data_en=$1, data_hi=$2, version=version+1, updated_at=now()
     WHERE id=$3`,
    [dataEn, dataHi, row.id]
  );
  await pool.query(
    `INSERT INTO cms_audit_log
      (action, collection, entry_id, entry_key, before_data, after_data)
     VALUES ('sync-interface-labels', 'site_settings', $1, $2, $3, $4)`,
    [row.id, row.entry_key, { dataEn: row.data_en, dataHi: row.data_hi }, { dataEn, dataHi }]
  );
  if (soilRow && JSON.stringify(soilHindi) !== JSON.stringify(soilRow.data_hi || {})) {
    await pool.query(
      "UPDATE cms_entries SET data_hi=$1, version=version+1, updated_at=now() WHERE id=$2",
      [soilHindi, soilRow.id]
    );
  }
  await pool.query("COMMIT");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}

console.log(`CMS interface labels synchronized: ${Object.keys(nextEn).length} English and ${Object.keys(nextHi).length} Hindi values.`);
