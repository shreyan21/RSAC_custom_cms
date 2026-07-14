import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import { getCollection } from "../shared/cmsCollections.js";
import { divisionHindiPhrases } from "../src/data/divisionHindiPhrases.js";
import { hiTranslations } from "../src/data/translations.js";
import { decodeHtmlEntities } from "../src/utils/htmlEntities.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const prepare = process.argv.includes("--prepare");
const prepareLegacy = process.argv.includes("--prepare-legacy");
const apply = process.argv.includes("--apply");
const allowPartial = process.argv.includes("--allow-partial");
const cacheArgument = process.argv.find((argument) => argument.startsWith("--cache="));
const cachePath = cacheArgument ? resolve(cacheArgument.slice("--cache=".length)) : null;
if ([prepare, prepareLegacy, apply].filter(Boolean).length !== 1) {
  throw new Error("Choose exactly one mode: --prepare, --prepare-legacy, or --apply.");
}
if (apply && !cachePath) throw new Error("--apply requires --cache=<translation-cache.json>.");

const devanagari = /[\u0900-\u097f]/u;
const latinWord = /[A-Za-z][A-Za-z'-]{1,}/u;
const sharedKeys = new Set([
  "id", "key", "path", "slug", "href", "url", "image", "photo", "video", "file",
  "icon", "iconKey", "sectionKey", "sourceKey", "sourceKeys", "groupKey", "blockKey",
  "entryKey", "type", "kind", "layout", "width", "align", "objectPosition", "sort",
  "sortOrder", "active", "enabled", "hidden", "openInNewTab", "mapQuery", "sourceUrl",
  "externalUrl", "documentUrl", "featuredImage", "thumbnail", "poster", "placement",
  "cardColor", "cardColor2", "employeeId", "email", "contact", "phone", "mobile", "date",
  "year", "keywords", "languageLabels", "controlsSectionLabel", "editorMode", "isNew",
  "accent", "radius", "surface", "secondary", "fontFamily", "contentWidth", "cardEyebrowSize",
]);
const identityKeys = ["key", "id", "path", "slug", "sourceKey", "sectionKey", "entryKey"];
const preservedValues = new Set([
  "facebook", "twitter", "india-wris", "bhuvan (nrsc)", "inter, sans-serif",
]);
const technicalTokens = new Set([
  "api", "ec", "en", "gis", "gps", "html", "id", "isro", "lan", "lidar", "nrsc", "pdf",
  "ph", "rsac", "rsac-up", "sac", "sonar", "up", "url",
]);
const manualHindi = {
  "Scientist-G": "वैज्ञानिक-जी",
  "Application of Remote Sensing and GIS in Groundwater Exploration, Flood Mapping and Cadastral mapping": "भूजल अन्वेषण, बाढ़ मानचित्रण और भूकर मानचित्रण में सुदूर संवेदन एवं जीआईएस का अनुप्रयोग",
  "31 Years": "31 वर्ष",
  "Remote Sensing, GIS, Forest Resources, Ecology, Wildlife, Environment, Biodiversity, Landuse/ Landcover, Geospatial data etc": "सुदूर संवेदन, जीआईएस, वन संसाधन, पारिस्थितिकी, वन्यजीव, पर्यावरण, जैव विविधता, भूमि उपयोग/भूमि आवरण और भू-स्थानिक डेटा आदि",
  "Scientist-SG": "वैज्ञानिक-एसजी",
  "*About 33 years experience in Geophysical prospecting for groundwater Exploration (Well Lodging and Resistivity Survey) and Application of Remote Sensing,": "*भूजल अन्वेषण के लिए भूभौतिकीय पूर्वेक्षण (वेल लॉगिंग और प्रतिरोधकता सर्वेक्षण) तथा सुदूर संवेदन के अनुप्रयोग में लगभग 33 वर्षों का अनुभव।",
  "*GIS & GPS for Cadastral resources mapping, Micro-Level Mapping for Utility Facilities using High Resolution Satellite Data, Differential Global Positioning System (DGPS) Survey for GCP’s etc.": "*भूकर संसाधन मानचित्रण के लिए जीआईएस एवं जीपीएस, उच्च विभेदन उपग्रह डेटा से उपयोगिता सुविधाओं का सूक्ष्म-स्तरीय मानचित्रण और जीसीपी आदि के लिए डिफरेंशियल ग्लोबल पोजिशनिंग सिस्टम (डीजीपीएस) सर्वेक्षण।",
  "*Teaching for M.Tech. (Remote Sensing & GIS) students.": "*एम.टेक. (सुदूर संवेदन एवं जीआईएस) विद्यार्थियों का अध्यापन।",
  "More than 50 research paper & 20 Technical Reports": "50 से अधिक शोध-पत्र और 20 तकनीकी रिपोर्टें",
  "Scientist-SF & Head, Training Division": "वैज्ञानिक-एसएफ एवं प्रमुख, प्रशिक्षण प्रभाग",
  "Training Division/Soil Resources Division": "प्रशिक्षण प्रभाग/मृदा संसाधन प्रभाग",
  "More than 25 years in the field of Remote Sensing & GIS": "सुदूर संवेदन एवं जीआईएस के क्षेत्र में 25 वर्ष से अधिक का अनुभव",
  "Scientist-SF, Head FR&ED": "वैज्ञानिक-एसएफ, प्रमुख, वन संसाधन एवं पारिस्थितिकी प्रभाग",
  "M.sc. (Botany), Ph.D. (Botany)": "एम.एससी. (वनस्पति विज्ञान), पीएच.डी. (वनस्पति विज्ञान)",
  "2 Research Paper and 14 Technical Reports": "2 शोध-पत्र और 14 तकनीकी रिपोर्टें",
  "Scientist-SE & Head, A.R.D.": "वैज्ञानिक-एसई एवं प्रमुख, कृषि संसाधन प्रभाग",
  "Head, Agriculture Resources Division": "प्रमुख, कृषि संसाधन प्रभाग",
  "Other Activity": "अन्य गतिविधि",
  "Appellate Authority (RTI)": "अपीलीय प्राधिकारी (आरटीआई)",
  "D.Phil, Msc.Ag.( Soil Science)": "डी.फिल., एम.एससी. कृषि (मृदा विज्ञान)",
  "Scientist-SE& Incharge Water Laboratory": "वैज्ञानिक-एसई एवं प्रभारी, जल प्रयोगशाला",
  "28 Years": "28 वर्ष",
  "25 Research Paper/33 Technical Reports": "25 शोध-पत्र/33 तकनीकी रिपोर्टें",
  "Scientist-SE & Head (Landuse & Urban Survey Division)": "वैज्ञानिक-एसई एवं प्रमुख (भूमि उपयोग एवं नगरीय सर्वेक्षण प्रभाग)",
  "Area of Specilization": "विशेषज्ञता का क्षेत्र",
  "M.Tech (Applied Geology) from IIT Roorkee": "आईआईटी रुड़की से एम.टेक. (अनुप्रयुक्त भूविज्ञान)",
  "No. of Publication": "प्रकाशनों की संख्या",
  "Public Information Officer (RTI)": "जन सूचना अधिकारी (आरटीआई)",
  "M.sc. (Ag) Soil Sciences": "एम.एससी. (कृषि), मृदा विज्ञान",
  "Ph.D. (Soil Sciences)": "पीएच.डी. (मृदा विज्ञान)",
  "Research Papers: 11, Reports: 90": "शोध-पत्र: 11, रिपोर्टें: 90",
  "Soil Survey, Remote Sensing & GIS GNSS": "मृदा सर्वेक्षण, सुदूर संवेदन, जीआईएस एवं जीएनएसएस",
  "16 Research Paper/ 80Technical Report": "16 शोध-पत्र/80 तकनीकी रिपोर्टें",
  "Content Will Be Available Soon": "सामग्री शीघ्र उपलब्ध होगी",
  "Explore RSAC-UP": "आरएसएसी-यूपी देखें",
  "Shri Narendra Modi": "श्री नरेंद्र मोदी",
  "Complete season archives with all district reports are hosted on the official RSAC-UP website.": "सभी जनपदीय रिपोर्टों सहित पूर्ण मौसमी अभिलेख आधिकारिक आरएसएसी-यूपी वेबसाइट पर उपलब्ध हैं।",
  "Open all official About Us pages.": "हमारे बारे में सभी आधिकारिक पृष्ठ खोलें।",
  "on": "पर",
  "No": "संख्या",
  "by": "द्वारा",
  "app 1 to 20": "लगभग 1 से 20",
  "app. 1000": "लगभग 1000",
  "app. 1378": "लगभग 1378",
  "app.120": "लगभग 120",
  "app.140": "लगभग 140",
  "28/07/2006 to": "28/07/2006 से",
  "............... to 23/01/2008": "............... से 23/01/2008",
  "19/09/2008 to ................": "19/09/2008 से ................",
  "............ to ............": "............ से ............",
  "25.04.2014 to ................": "25.04.2014 से ................",
  "30/06/2024 to ...": "30/06/2024 से ...",
  "Listed by RSAC-UP under Hon'ble leadership and institutional governance.": "आरएसएसी-यूपी के माननीय नेतृत्व एवं संस्थागत शासन के अंतर्गत सूचीबद्ध।",
  "Undertake, promote, guide, coordinate and aid research and development in remote sensing. Carry out surveys for monitoring and assessment of natural resources using remote sensing techniques. Develop efficient data acquisition and retrieval systems and act as a State nodal organisation for user agencies.": "सुदूर संवेदन में अनुसंधान एवं विकास करना, बढ़ावा देना, मार्गदर्शन, समन्वय और सहायता प्रदान करना। सुदूर संवेदन तकनीकों से प्राकृतिक संसाधनों की निगरानी एवं आकलन हेतु सर्वेक्षण करना। कुशल डेटा अधिग्रहण एवं पुनर्प्राप्ति प्रणालियां विकसित करना और उपयोगकर्ता एजेंसियों के लिए राज्य नोडल संगठन के रूप में कार्य करना।",
  "RSAC-UP undertakes research, surveys, consultancy, data-bank development, and technology dissemination in remote sensing and GIS.": "आरएसएसी-यूपी सुदूर संवेदन एवं जीआईएस में अनुसंधान, सर्वेक्षण, परामर्श, डेटा बैंक विकास और प्रौद्योगिकी प्रसार का कार्य करता है।",
  "Read Objectives": "उद्देश्य पढ़ें",
  "Implementation": "कार्यान्वयन",
  "Use remote sensing with conventional techniques for optimum natural-resource management. Carry out ongoing research and development schemes within the Centre. Undertake applied projects requested by user departments and agencies.": "प्राकृतिक संसाधनों के सर्वोत्तम प्रबंधन के लिए पारंपरिक तकनीकों के साथ सुदूर संवेदन का उपयोग करना। केंद्र में सतत अनुसंधान एवं विकास योजनाएं संचालित करना। उपयोगकर्ता विभागों और एजेंसियों द्वारा अनुरोधित अनुप्रयुक्त परियोजनाएं करना।",
  "Projects are implemented through in-house research schemes and user-department assignments from State, national, and international agencies.": "परियोजनाएं आंतरिक अनुसंधान योजनाओं तथा राज्य, राष्ट्रीय और अंतरराष्ट्रीय एजेंसियों के उपयोगकर्ता विभागों से प्राप्त कार्यों के माध्यम से क्रियान्वित की जाती हैं।",
  "View Implementation": "कार्यान्वयन देखें",
  "Integrate multi-stage remote sensing with conventional technologies. Provide accurate natural-resource information in multi-temporal mode. Support effective technology dissemination to departments and field users.": "बहु-चरणीय सुदूर संवेदन को पारंपरिक तकनीकों के साथ एकीकृत करना। बहु-कालिक रूप में प्राकृतिक संसाधनों की सटीक जानकारी देना। विभागों और क्षेत्रीय उपयोगकर्ताओं तक प्रौद्योगिकी के प्रभावी प्रसार में सहायता करना।",
  "RSAC-UP works as an interface between high technology and end users so geospatial information becomes usable for public planning.": "आरएसएसी-यूपी उच्च प्रौद्योगिकी और अंतिम उपयोगकर्ताओं के बीच सेतु के रूप में कार्य करता है, ताकि भू-स्थानिक जानकारी सार्वजनिक नियोजन में उपयोगी बन सके।",
  "View Approach": "दृष्टिकोण देखें",
  "Water resources, groundwater, flood mapping, wetlands and river dynamics. Soil, forest, landuse, urban planning, agriculture, horticulture and ecological studies. Integrated natural-resource planning, training, mapping, and decision-support systems.": "जल संसाधन, भूजल, बाढ़ मानचित्रण, आर्द्रभूमि और नदी गतिकी। मृदा, वन, भूमि उपयोग, नगरीय नियोजन, कृषि, उद्यान विज्ञान और पारिस्थितिकी अध्ययन। एकीकृत प्राकृतिक संसाधन नियोजन, प्रशिक्षण, मानचित्रण और निर्णय सहायता प्रणालियां।",
  "Applications cover water, soil, forest, landuse, urban surveys, earth resources, agriculture, environment, and integrated natural-resource studies.": "अनुप्रयोगों में जल, मृदा, वन, भूमि उपयोग, नगरीय सर्वेक्षण, भू-संसाधन, कृषि, पर्यावरण और एकीकृत प्राकृतिक संसाधन अध्ययन शामिल हैं।",
  "View Activities": "गतिविधियां देखें",
  "HRMS and survey applications are available from the Geo-Portal section. Files should be uploaded in CMS Downloads so the website does not depend on external RSAC links.": "एचआरएमएस और सर्वेक्षण अनुप्रयोग जियो-पोर्टल अनुभाग में उपलब्ध हैं। फाइलें सीएमएस डाउनलोड में अपलोड की जानी चाहिए, ताकि वेबसाइट बाहरी आरएसएसी लिंक पर निर्भर न रहे।",
  "Download RSAC-UP mobile applications for staff workflows, field survey, corridor survey, orchard mapping, and crop-disease support.": "कर्मचारी कार्यप्रवाह, क्षेत्रीय सर्वेक्षण, कॉरिडोर सर्वेक्षण, बाग मानचित्रण और फसल रोग सहायता के लिए आरएसएसी-यूपी मोबाइल अनुप्रयोग डाउनलोड करें।",
  "Open Mobile Apps": "मोबाइल ऐप खोलें",
  "Support Functions": "सहायक कार्य",
  "Smt. Sweta Pal · Shri Daya Shankar — Administrative Officers": "श्रीमती श्वेता पाल · श्री दया शंकर — प्रशासनिक अधिकारी",
  "Dr. A. Uniyal (Additional Charge)": "डॉ. ए. उनियाल (अतिरिक्त प्रभार)",
  "Shri Ravi Prakash Singh — Account Officer (Additional Charge)": "श्री रवि प्रकाश सिंह — लेखाधिकारी (अतिरिक्त प्रभार)",
  "Visitors are encouraged to share feedback on navigation, accessibility, content clarity, downloads, and overall usability of the RSAC-UP website. Feedback helps the centre maintain a GIGW-aligned and citizen-friendly digital presence.": "आगंतुकों को आरएसएसी-यूपी वेबसाइट के नेविगेशन, अभिगम्यता, सामग्री की स्पष्टता, डाउनलोड और समग्र उपयोगिता पर प्रतिक्रिया साझा करने के लिए प्रोत्साहित किया जाता है। प्रतिक्रिया केंद्र को जीआईजीडब्ल्यू अनुरूप और नागरिक-अनुकूल डिजिटल उपस्थिति बनाए रखने में सहायता करती है।",
  "Please mention the page URL or section name, the device and browser used if relevant, and a short description of the issue or suggestion. For scientific or project-related queries, use the division or contact routes instead of this feedback channel.": "कृपया पृष्ठ का यूआरएल या अनुभाग का नाम, आवश्यक होने पर प्रयुक्त उपकरण और ब्राउज़र तथा समस्या या सुझाव का संक्षिप्त विवरण दें। वैज्ञानिक या परियोजना संबंधी प्रश्नों के लिए इस प्रतिक्रिया माध्यम के बजाय संबंधित प्रभाग या संपर्क माध्यम का उपयोग करें।",
  "What to Include": "क्या शामिल करें",
  "Submit Feedback": "प्रतिक्रिया भेजें",
  "Actionable feedback related to website content, accessibility, or navigation is reviewed by the Web Information Manager and the website support team. RSAC-UP aims to respond to valid public feedback in a reasonable time frame.": "वेबसाइट सामग्री, अभिगम्यता या नेविगेशन से संबंधित उपयोगी प्रतिक्रिया की समीक्षा वेब सूचना प्रबंधक और वेबसाइट सहायता दल द्वारा की जाती है। आरएसएसी-यूपी का लक्ष्य वैध सार्वजनिक प्रतिक्रिया का उचित समय में उत्तर देना है।",
  "Response": "उत्तर",
  "Scientist-\"SE\", HEAD GWRD Divison": "वैज्ञानिक-एसई, प्रमुख, भूजल संसाधन प्रभाग",
  "Scientist-'SE', HEAD GWRD Divison": "वैज्ञानिक-एसई, प्रमुख, भूजल संसाधन प्रभाग",
  "View Notices": "सूचनाएं देखें",
  "Section": "अनुभाग",
  "Abstract": "सार",
  "Published in": "में प्रकाशित",
  "Published": "प्रकाशित",
  "Invited Talk": "आमंत्रित व्याख्यान",
  "Key Note Address": "मुख्य व्याख्यान",
  "Title of Book": "पुस्तक का शीर्षक",
  "Publisher": "प्रकाशक",
  "Authored by": "लेखक",
  "Amit Sinha": "अमित सिन्हा",
  "Sinha, Amit": "सिन्हा, अमित",
  "Ram Chandra": "राम चंद्र",
  "A.K. Tangri": "ए.के. टांगरी",
  "Tangri A.K.": "टांगरी ए.के.",
  "Virendra Kumar": "वीरेंद्र कुमार",
  "Kumar,Virendra": "कुमार, वीरेंद्र",
  "Anugya": "अनुज्ञा",
  "Tangri A.K.,Sinha, A.& Shukla, S. (1993). \"Evaluation of snow pack characteristics through multi-date analysis of IRS-1a, LISS-II data - A case study in Chamoli district of U.P., India. Published in the proceedings of the 14th Asian Conference on Remote Sensing, Tehran, Oct. 1993.": "टांगरी ए.के., सिन्हा ए. एवं शुक्ला एस. (1993)। आईआरएस-1ए, लिस-2 डेटा के बहु-तिथि विश्लेषण से हिम आवरण की विशेषताओं का मूल्यांकन - उत्तर प्रदेश के चमोली जिले का एक अध्ययन। 14वें एशियाई सुदूर संवेदन सम्मेलन की कार्यवाही, तेहरान, अक्टूबर 1993 में प्रकाशित।",
  "& Shukla, S. (1993). \"Evaluation of snow pack characteristics through multi-date analysis of IRS-1a, LISS-II data - A case study in Chamoli district of U.P., India. Published in the proceedings of the 14th Asian Conference on Remote Sensing, Tehran, Oct. 1993.": "एवं शुक्ला एस. (1993)। आईआरएस-1ए, लिस-2 डेटा के बहु-तिथि विश्लेषण से हिम आवरण की विशेषताओं का मूल्यांकन - उत्तर प्रदेश के चमोली जिले का एक अध्ययन। 14वें एशियाई सुदूर संवेदन सम्मेलन की कार्यवाही, तेहरान, अक्टूबर 1993 में प्रकाशित।",
  "A.K. Tangri,Ram Chandra& Rupendra Singh(2015) -Two \"Hot Spots'' in the upper Alaknanda Valley, Chamoli District, Uttarakhand Himalaya - A Cause of Concern Abstract Published inISPRS WG VIII/I -Workshop on Geospatial Technologies for Disaster Risk Reduction held atJaipur on Dec. 17th, 2015 pp-32": "ए.के. टांगरी, राम चंद्र एवं रुपेंद्र सिंह (2015) - उत्तराखंड हिमालय के चमोली जिले की ऊपरी अलकनंदा घाटी में दो 'हॉट स्पॉट' - चिंता का कारण। सार आईएसपीआरएस डब्ल्यूजी VIII/I की आपदा जोखिम न्यूनीकरण हेतु भू-स्थानिक प्रौद्योगिकी कार्यशाला, जयपुर, 17 दिसंबर 2015, पृष्ठ 32 में प्रकाशित।",
  "A.K.Tangri,Ram Chandra& S.K.S. Yadav(2012)-\" Surging Glaciers An Exceptional but Widely Prevalent Phenomena in Shyok valley of Karakoram Himalayas J & K State, india.(Abstract)Publishedininternational Conferenceon GeospatialTechnologies and applicationsGEOMATRIX, 2012organized by theCSRE at IIT-BOMBAY, Mumbai, India during 26-29 Feb, 2012,No. Geo12/SG/294": "ए.के. टांगरी, राम चंद्र एवं एस.के.एस. यादव (2012) - 'काराकोरम हिमालय की श्योक घाटी, जम्मू-कश्मीर, भारत में सर्जिंग ग्लेशियर: एक असाधारण किंतु व्यापक परिघटना।' सार भू-स्थानिक प्रौद्योगिकी एवं अनुप्रयोग पर अंतरराष्ट्रीय सम्मेलन जियोमैट्रिक्स-2012, सीएसआरई, आईआईटी बॉम्बे, मुंबई, 26-29 फरवरी 2012 में प्रकाशित, संख्या Geo12/SG/294।",
  "A.K.Tangri, S.K.S. Yadav &Ram Chandra (2012)- \" Monitoring Snow Cover Variations in Jhelum River Basin, Kashmir Himalaya Using multi-date Awifs data of Resourcesat-1 ( IRS-P6) - An Assessment of it's Impact on the hydrology of Jhelum river in India.(Abstract)Published inInternational Conferenceon Geospatial Technologies and ApplicationsGEOMATRIX, 2012organized by theCSRE at IIT-BOMBAY, Mumbai, India during 26-29 Feb,2012, No. Geo12/SG/291": "ए.के. टांगरी, एस.के.एस. यादव एवं राम चंद्र (2012) - रिसोर्ससैट-1 (आईआरएस-पी6) के बहु-तिथि एवाईफ्स डेटा से कश्मीर हिमालय के झेलम नदी बेसिन में हिम आवरण परिवर्तन की निगरानी और भारत में झेलम नदी के जलविज्ञान पर उसके प्रभाव का आकलन। सार भू-स्थानिक प्रौद्योगिकी एवं अनुप्रयोग पर अंतरराष्ट्रीय सम्मेलन जियोमैट्रिक्स-2012, सीएसआरई, आईआईटी बॉम्बे, मुंबई, 26-29 फरवरी 2012 में प्रकाशित, संख्या Geo12/SG/291।",
  "Kumar, Virendra,Reetanjali Singh, Ajai Mishra & ShahankShekhar Mishra, (2021), ''Selection of Suitable Landfill Site for Biomedical Waste Disposal in Lucknow City, India using Remote Sensing Data, GIS, and AHP Method.'' (Chapter-19, Published in The Urban Book Series, Titled, \"Geospatial Technology and Smart Cities@ Springer Nature Switzerland AG 2021, http://doi.org/10.1007/978-3-030-71945-6_19, http://www.springer.com/series/14773": "कुमार, वीरेंद्र, रीतांजलि सिंह, अजय मिश्रा एवं शशांक शेखर मिश्रा (2021), 'सुदूर संवेदन डेटा, जीआईएस और एएचपी विधि का उपयोग करके लखनऊ शहर, भारत में जैव-चिकित्सा अपशिष्ट निस्तारण हेतु उपयुक्त लैंडफिल स्थल का चयन।' अध्याय 19, अर्बन बुक सीरीज की 'जियोस्पेशियल टेक्नोलॉजी एंड स्मार्ट सिटीज', स्प्रिंगर नेचर स्विट्जरलैंड एजी 2021 में प्रकाशित। http://doi.org/10.1007/978-3-030-71945-6_19, http://www.springer.com/series/14773",
  "Kumar, Virendra,K. Yadav, A. Singh (2021), \"Land Transformation and Future Projections of Land Consumption using High-Resolution Remote Sensing Datafor Allahabnad City.''(Chapter-8, Published in The Urban Book Series, Titled, \"Geospatial Technology and Smart Cities@ Springer Nature Switzerland AG 2021, http://doi.org/10.1007/978-3-030-71945-6_8, http://www.springer.com/series/14773": "कुमार, वीरेंद्र, के. यादव एवं ए. सिंह (2021), 'उच्च विभेदन सुदूर संवेदन डेटा से इलाहाबाद शहर में भूमि परिवर्तन और भावी भूमि उपभोग का प्रक्षेपण।' अध्याय 8, अर्बन बुक सीरीज की 'जियोस्पेशियल टेक्नोलॉजी एंड स्मार्ट सिटीज', स्प्रिंगर नेचर स्विट्जरलैंड एजी 2021 में प्रकाशित। http://doi.org/10.1007/978-3-030-71945-6_8, http://www.springer.com/series/14773",
  "AgarwalA.K., Prasant Prabhat and Neelay Srivastava (2010)- \"Flood hazard zonation map of Bahraich district U.P. and query based analysis in GIS environment\", Abs vol. of ISRS National Symposium and GIS & Remote Sensing Infrastructure development-GRID\",-Pune India.": "अग्रवाल ए.के., प्रशांत प्रभात एवं नीलेय श्रीवास्तव (2010) - 'उत्तर प्रदेश के बहराइच जिले का बाढ़ जोखिम क्षेत्रीकरण मानचित्र और जीआईएस परिवेश में क्वेरी आधारित विश्लेषण।' आईएसआरएस राष्ट्रीय संगोष्ठी तथा जीआईएस एवं सुदूर संवेदन अवसंरचना विकास-ग्रिड के सार खंड में प्रकाशित, पुणे, भारत।",
  "A.K., Prasant Prabhat and Neelay Srivastava (2010)- \"Flood hazard zonation map of Bahraich district U.P. and query based analysis in GIS environment\", Abs vol. of ISRS National Symposium and GIS & Remote Sensing Infrastructure development-GRID\",-Pune India.": "ए.के., प्रशांत प्रभात एवं नीलेय श्रीवास्तव (2010) - 'उत्तर प्रदेश के बहराइच जिले का बाढ़ जोखिम क्षेत्रीकरण मानचित्र और जीआईएस परिवेश में क्वेरी आधारित विश्लेषण।' आईएसआरएस राष्ट्रीय संगोष्ठी तथा जीआईएस एवं सुदूर संवेदन अवसंरचना विकास-ग्रिड के सार खंड में प्रकाशित, पुणे, भारत।",
  "Vibhu Sarin, SudhakarS hukla & Rajiva Mohan, An Integrated approach for sustainable development of water resources in Bhimtal Gad sub water shed of Nainital district, U.P., Proc. of Annual Convention & symposium on spatial technologies for Natural Hazard Management, Nov.' 2000,pp 173-180.": "विभु सरीन, सुधाकर शुक्ला एवं राजीव मोहन, उत्तर प्रदेश के नैनीताल जिले के भीमताल गाड उप-जलागम में जल संसाधनों के सतत विकास हेतु एकीकृत दृष्टिकोण। प्राकृतिक आपदा प्रबंधन हेतु स्थानिक प्रौद्योगिकी पर वार्षिक सम्मेलन एवं संगोष्ठी की कार्यवाही, नवंबर 2000, पृष्ठ 173-180।",
  "S. Ravi Prakash and Rajiva Mohan, Hydrogeomorphological mapping of panwari area, Hamirpur district, Uttar Pradesh using Satellite data, Photo Nirvachak, Journal of the Indian Society of Remote Sensing, Vol. 24, No.2, 1996, pp 97-103.": "एस. रवि प्रकाश एवं राजीव मोहन, उपग्रह डेटा का उपयोग करके उत्तर प्रदेश के हमीरपुर जिले के पनवारी क्षेत्र का जल-भूआकृतिक मानचित्रण। फोटो निर्वाचक, इंडियन सोसाइटी ऑफ रिमोट सेंसिंग जर्नल, खंड 24, संख्या 2, 1996, पृष्ठ 97-103।",
  "P.N. Shah, Rajiva Mohan, D.N. Rao, S. Ravi Prakash, N.K. Goswami, C.D. Murty, AK. Agarwal & S. Mukherji, District wise hydrogeomorphological mapping for sustainable development of ground water in UP. using IRS-1 A LISS- II data. Proc. Nat. Symposium on Remote Sensing for Sustainable Development, Nov., 1992, pp. 144-150.": "पी.एन. शाह, राजीव मोहन, डी.एन. राव, एस. रवि प्रकाश, एन.के. गोस्वामी, सी.डी. मूर्ति, ए.के. अग्रवाल एवं एस. मुखर्जी, आईआरएस-1ए लिस-2 डेटा से उत्तर प्रदेश में भूजल के सतत विकास हेतु जनपदवार जल-भूआकृतिक मानचित्रण। सतत विकास हेतु सुदूर संवेदन पर राष्ट्रीय संगोष्ठी की कार्यवाही, नवंबर 1992, पृष्ठ 144-150।",
  "R.S. Chaturvedi & Rajiva Mohan, Delineating flood effected area of south Uttar Pradesh using satellite remote sensing technique. Proc. Nat .Symp. on Remote Sensing and Management of Water Resources, 1983 pp. 79-87.": "आर.एस. चतुर्वेदी एवं राजीव मोहन, उपग्रह सुदूर संवेदन तकनीक से दक्षिणी उत्तर प्रदेश के बाढ़ प्रभावित क्षेत्र का सीमांकन। सुदूर संवेदन एवं जल संसाधन प्रबंधन पर राष्ट्रीय संगोष्ठी की कार्यवाही, 1983, पृष्ठ 79-87।",
  "A.L. Haldar & R. Mohan, Watershed Management using Remote Sensing and GIS techniques - A case study in parts of Shahzad watershed, Lalitpur U.P., India, submitted for journal of Central Board of Irrigation & power, New Delhi, 2001.": "ए.एल. हलदर एवं आर. मोहन, सुदूर संवेदन और जीआईएस तकनीकों से जलागम प्रबंधन - उत्तर प्रदेश के ललितपुर में शहजाद जलागम के कुछ भागों का अध्ययन। केंद्रीय सिंचाई एवं विद्युत बोर्ड जर्नल, नई दिल्ली में प्रकाशन हेतु प्रस्तुत, 2001।",
  "A.K. Agarwal & Rajiva Mohan, Application of Landsat and SPOT data for selection of check dam sites in hard rock terrain. A case study from Bundelkhand region of U.P. presented in National Symposium on Remote Sensing, 1993, Gauhati & submitted for publication.": "ए.के. अग्रवाल एवं राजीव मोहन, कठोर शैल भूभाग में चेक डैम स्थलों के चयन हेतु लैंडसैट और स्पॉट डेटा का अनुप्रयोग - उत्तर प्रदेश के बुंदेलखंड क्षेत्र का अध्ययन। सुदूर संवेदन पर राष्ट्रीय संगोष्ठी, गुवाहाटी, 1993 में प्रस्तुत एवं प्रकाशन हेतु प्रेषित।",
  "M.B.S Rao, A.L. Haldar & Rajiva Mohan, Role of Remote Sensing in Ground Water Exploration - Some case histories from Bundelkhand region , presented in technical session -1, Orientation Workshop on Application of Remote Sensing in Groundwater exploration organised by RSAC-UP, 26-27 Dec., 1991.": "एम.बी.एस. राव, ए.एल. हलदर एवं राजीव मोहन, भूजल अन्वेषण में सुदूर संवेदन की भूमिका - बुंदेलखंड क्षेत्र के कुछ अध्ययन। आरएसएसी-यूपी द्वारा आयोजित भूजल अन्वेषण में सुदूर संवेदन के अनुप्रयोग पर अभिमुखीकरण कार्यशाला के तकनीकी सत्र-1 में प्रस्तुत, 26-27 दिसंबर 1991।",
  "M.B.S. Rao & Rajiva Mohan, Quartz reef as a hydrogeological factor-A case study from parts of hard rock terrain in Bundelkhand region of Uttar Pradesh, presented in National Seminar on hydrology, Madras 1987.": "एम.बी.एस. राव एवं राजीव मोहन, जल-भूवैज्ञानिक कारक के रूप में क्वार्ट्ज रीफ - उत्तर प्रदेश के बुंदेलखंड क्षेत्र के कठोर शैल भूभाग का अध्ययन। जलविज्ञान पर राष्ट्रीय संगोष्ठी, मद्रास, 1987 में प्रस्तुत।",
};
const trustedHindiPairs = { ...divisionHindiPhrases, ...hiTranslations, ...manualHindi };

const normalize = (value) => decodeHtmlEntities(String(value || ""))
  .replace(/\u00ad/gu, "")
  .replace(/[\u200b-\u200d\ufeff]/gu, "")
  .normalize("NFKC")
  .replace(/[\u2018\u2019]/gu, "'")
  .replace(/[\u201c\u201d]/gu, '"')
  .replace(/[\u2013\u2014]/gu, "-")
  .replace(/\u00a0/gu, " ")
  .replace(/\s+/gu, " ")
  .trim();

const alphanumeric = (value) => normalize(value)
  .toLocaleLowerCase("en")
  .replace(/[^a-z0-9]+/gu, "");

const trustedPhraseEntries = Object.entries(trustedHindiPairs)
  .map(([english, hindi]) => ({ english: normalize(english), hindi: normalize(hindi) }))
  .filter((entry) => entry.english.length >= 12 && devanagari.test(entry.hindi))
  .sort((left, right) => right.english.length - left.english.length);

const trustedByFingerprint = (() => {
  const values = new Map();
  const conflicts = new Set();
  for (const entry of trustedPhraseEntries) {
    const key = alphanumeric(entry.english);
    if (key.length < 10 || conflicts.has(key)) continue;
    const existing = values.get(key);
    if (existing && normalize(existing) !== entry.hindi) {
      values.delete(key);
      conflicts.add(key);
    } else {
      values.set(key, entry.hindi);
    }
  }
  return values;
})();

const composeTrustedTranslation = (source) => {
  const text = normalize(source);
  if (text.length < 40) return "";
  const intervals = [];
  const overlaps = (start, end) => intervals.some((interval) => start < interval.end && end > interval.start);

  for (const phrase of trustedPhraseEntries) {
    if (phrase.english.length < 18 || phrase.english.length > text.length) continue;
    let cursor = 0;
    while (cursor < text.length) {
      const start = text.indexOf(phrase.english, cursor);
      if (start < 0) break;
      const end = start + phrase.english.length;
      if (!overlaps(start, end)) intervals.push({ start, end, hindi: phrase.hindi });
      cursor = end;
    }
  }

  if (!intervals.length) return "";
  intervals.sort((left, right) => left.start - right.start);
  const covered = intervals.reduce((total, interval) => total + interval.end - interval.start, 0);
  if (covered / text.length < 0.78) return "";

  let output = "";
  let cursor = 0;
  for (const interval of intervals) {
    output += text.slice(cursor, interval.start);
    output += interval.hindi;
    cursor = interval.end;
  }
  output += text.slice(cursor);

  const manualFragments = Object.entries(manualHindi)
    .filter(([english]) => english.length >= 4)
    .sort((left, right) => right[0].length - left[0].length);
  for (const [english, hindi] of manualFragments) {
    output = output.replaceAll(english, hindi);
  }

  const latinBefore = (text.match(/[A-Za-z]/gu) || []).length;
  const latinAfter = (output.match(/[A-Za-z]/gu) || []).length;
  if (latinBefore && latinAfter / latinBefore > 0.28) return "";
  return output;
};

const identity = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  for (const key of identityKeys) {
    if (value[key] !== undefined && value[key] !== "") return `${key}:${value[key]}`;
  }
  return "";
};

const technicalOnly = (value) => {
  const tokens = normalize(value)
    .toLocaleLowerCase("en")
    .split(/[^a-z0-9-]+/u)
    .filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => /^\d+(?:\.\d+)?$/u.test(token) || technicalTokens.has(token));
};

const isTranslatable = (value, path) => {
  const text = normalize(value);
  const key = path.at(-1) || "";
  if (!text || path.some((segment) => sharedKeys.has(segment)) || sharedKeys.has(key)) return false;
  if (devanagari.test(text) || !latinWord.test(text) || preservedValues.has(text.toLocaleLowerCase("en"))) return false;
  if (/^[\s,;]*(?:https?:|mailto:|tel:|www\.|\/|\.\/|\.\.\/)/iu.test(text)) return false;
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/u.test(text)) return false;
  if (/\.(?:avif|docx?|gif|jpe?g|pdf|png|svg|webm|webp|xlsx?)(?:[?#].*)?$/iu.test(text)) return false;
  if (/^[-+()\d\s.,:/]+$/u.test(text) || /^E-\d+$/iu.test(text)) return false;
  if (/^\(?[ivxlcdm]+[.)]?$/iu.test(text)) return false;
  if (/^[+\d()/.\s-]+(?:ext\.?[-\d()]*)?$/iu.test(text)) return false;
  if (/^(?:B|M|Ph)\.?\s*(?:Tech|Sc|E|A|Phil|D)\.?$/iu.test(text)) return false;
  if (/^#[0-9a-f]{3,8}$/iu.test(text) || /^\d+(?:\.\d+)?(?:px|rem|em|%)$/iu.test(text)) return false;
  return !technicalOnly(text);
};

const isCopiedEnglish = (english, hindi) => {
  if (hindi === undefined || hindi === null || normalize(hindi) === "") return true;
  if (typeof hindi !== "string" || devanagari.test(hindi)) return false;
  const englishText = normalize(english).toLocaleLowerCase("en");
  const hindiText = normalize(hindi).toLocaleLowerCase("en");
  return englishText === hindiText || (alphanumeric(englishText) && alphanumeric(englishText) === alphanumeric(hindiText));
};

const sourceByNormalized = new Map();
const candidatePaths = new Map();
const addCandidate = (english, row, path) => {
  if (!isTranslatable(english, path)) return;
  const source = normalize(english);
  const key = source.toLocaleLowerCase("en");
  if (!sourceByNormalized.has(key)) sourceByNormalized.set(key, source);
  if (!candidatePaths.has(key)) candidatePaths.set(key, []);
  const paths = candidatePaths.get(key);
  if (paths.length < 8) paths.push(`${row.collection}/${row.entry_key}:${path.join(".")}`);
};

const collectHtml = (english, hindi, row, path) => {
  const englishFragment = JSDOM.fragment(english || "");
  const englishWalker = englishFragment.ownerDocument.createTreeWalker(englishFragment, 4);
  const englishValues = new Map();
  const englishByFingerprint = new Map();
  let node = englishWalker.nextNode();
  while (node) {
    const source = normalize(node.nodeValue);
    if (source && isTranslatable(source, path)) {
      englishValues.set(source.toLocaleLowerCase("en"), source);
      englishByFingerprint.set(alphanumeric(source), source);
    }
    node = englishWalker.nextNode();
  }

  const hindiFragment = JSDOM.fragment(hindi || english || "");
  const hindiWalker = hindiFragment.ownerDocument.createTreeWalker(hindiFragment, 4);
  node = hindiWalker.nextNode();
  while (node) {
    const key = normalize(node.nodeValue).toLocaleLowerCase("en");
    const source = englishValues.get(key) || englishByFingerprint.get(alphanumeric(node.nodeValue));
    if (source && isCopiedEnglish(source, node.nodeValue)) addCandidate(source, row, path);
    node = hindiWalker.nextNode();
  }
};

const collectLocalized = (english, hindi, row, path) => {
  if (typeof english === "string") {
    if (path.at(-1) === "html") collectHtml(english, hindi, row, path);
    else if (isCopiedEnglish(english, hindi)) addCandidate(english, row, path);
    return;
  }
  if (Array.isArray(english)) {
    const hindiItems = Array.isArray(hindi) ? hindi : [];
    const indexedHindi = new Map(hindiItems.map((item) => [identity(item), item]).filter(([key]) => key));
    english.forEach((item, index) => {
      const itemIdentity = identity(item);
      const localizedItem = itemIdentity ? indexedHindi.get(itemIdentity) ?? hindiItems[index] : hindiItems[index];
      collectLocalized(item, localizedItem, row, [...path, String(index)]);
    });
    return;
  }
  if (english && typeof english === "object") {
    const localizedObject = hindi && typeof hindi === "object" && !Array.isArray(hindi) ? hindi : {};
    for (const [key, value] of Object.entries(english)) {
      if (english.controlsSectionLabel === false && ["label", "value", "sourceLabel"].includes(key)) continue;
      collectLocalized(value, localizedObject[key], row, [...path, key]);
    }
  }
};

const serializeFragment = (fragment) => {
  const container = fragment.ownerDocument.createElement("div");
  container.append(fragment.cloneNode(true));
  return container.innerHTML;
};

const translateHtml = (english, hindi, translations, path) => {
  const englishFragment = JSDOM.fragment(english || "");
  const englishWalker = englishFragment.ownerDocument.createTreeWalker(englishFragment, 4);
  const englishValues = new Set();
  const englishByFingerprint = new Map();
  let node = englishWalker.nextNode();
  while (node) {
    const source = normalize(node.nodeValue);
    if (source && isTranslatable(source, path)) {
      englishValues.add(source.toLocaleLowerCase("en"));
      englishByFingerprint.set(alphanumeric(source), source);
    }
    node = englishWalker.nextNode();
  }

  const fragment = JSDOM.fragment(hindi || english || "");
  const walker = fragment.ownerDocument.createTreeWalker(fragment, 4);
  node = walker.nextNode();
  while (node) {
    const current = normalize(node.nodeValue);
    const source = englishValues.has(current.toLocaleLowerCase("en"))
      ? current
      : englishByFingerprint.get(alphanumeric(current));
    const translation = source ? translations.get(source.toLocaleLowerCase("en")) : null;
    if (translation && source && isCopiedEnglish(source, node.nodeValue)) {
      const leading = node.nodeValue.match(/^\s*/u)?.[0] || "";
      const trailing = node.nodeValue.match(/\s*$/u)?.[0] || "";
      node.nodeValue = `${leading}${translation}${trailing}`;
    }
    node = walker.nextNode();
  }
  return serializeFragment(fragment);
};

const applyLocalized = (english, hindi, translations, path) => {
  if (typeof english === "string") {
    if (path.at(-1) === "html") return translateHtml(english, hindi, translations, path);
    if (!isCopiedEnglish(english, hindi) || !isTranslatable(english, path)) return hindi;
    return translations.get(normalize(english).toLocaleLowerCase("en")) || hindi;
  }
  if (Array.isArray(english)) {
    const hindiItems = Array.isArray(hindi) ? hindi : [];
    const indexedHindi = new Map(hindiItems.map((item) => [identity(item), item]).filter(([key]) => key));
    const consumed = new Set();
    const localized = english.map((item, index) => {
      const itemIdentity = identity(item);
      const sourceIndex = itemIdentity
        ? hindiItems.findIndex((candidate) => identity(candidate) === itemIdentity)
        : index;
      if (sourceIndex >= 0) consumed.add(sourceIndex);
      const current = itemIdentity ? indexedHindi.get(itemIdentity) ?? hindiItems[index] : hindiItems[index];
      return applyLocalized(item, current, translations, [...path, String(index)]);
    });
    hindiItems.forEach((item, index) => {
      if (!consumed.has(index) && index >= english.length) localized.push(item);
    });
    return localized;
  }
  if (english && typeof english === "object") {
    const current = hindi && typeof hindi === "object" && !Array.isArray(hindi) ? hindi : {};
    const output = { ...current };
    for (const [key, value] of Object.entries(english)) {
      if (english.controlsSectionLabel === false && ["label", "value", "sourceLabel"].includes(key)) continue;
      output[key] = applyLocalized(value, current[key], translations, [...path, key]);
    }
    return output;
  }
  return hindi === undefined ? english : hindi;
};

const translateText = async (source, attempt = 1) => {
  const body = new URLSearchParams({ client: "gtx", sl: "en", tl: "hi", dt: "t", q: source });
  try {
    const response = await fetch("https://translate.googleapis.com/translate_a/single", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const translated = (payload?.[0] || []).map((part) => part?.[0] || "").join("").trim();
    if (!translated) throw new Error("Empty translation");
    return translated;
  } catch (error) {
    if (attempt >= 6) throw new Error(`Google Translate failed after ${attempt} attempts: ${error.message}`);
    const delay = error.message.includes("429")
      ? 15000 * attempt
      : 700 * (2 ** (attempt - 1));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, delay));
    return translateText(source, attempt + 1);
  }
};

const translateAll = async (sources, translations, checkpoint) => {
  let completed = sources.filter((source) => translations[source]).length;
  for (const source of sources) {
    if (translations[source]) continue;
    try {
      translations[source] = await translateText(source);
    } catch (error) {
      await checkpoint(translations);
      throw error;
    }
    completed += 1;
    if (completed % 10 === 0 || completed === sources.length) {
      await checkpoint(translations);
      console.log(`Translated ${completed}/${sources.length}`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 650));
  }
  return translations;
};

const buildLegacyTranslations = async () => {
  const legacyClient = new pg.Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_ADMIN_USER,
    password: process.env.POSTGRES_ADMIN_PASSWORD,
    database: "rsac_cms",
  });
  const approved = new Map();
  const conflicts = new Set();

  const addApproved = (english, hindi, trusted = false) => {
    if (typeof english !== "string" || typeof hindi !== "string") return;
    const source = normalize(english);
    const localized = normalize(hindi);
    if (
      !source ||
      !localized ||
      source.includes("→") ||
      !devanagari.test(localized) ||
      !isTranslatable(source, ["content"])
    ) return;
    const key = source.toLocaleLowerCase("en");
    if (trusted) {
      conflicts.delete(key);
      approved.set(key, localized);
      return;
    }
    const current = approved.get(key);
    if (current && normalize(current) !== localized) {
      approved.delete(key);
      conflicts.add(key);
      return;
    }
    if (!conflicts.has(key)) approved.set(key, localized);
  };

  const collectHtmlPairs = (english, hindi) => {
    const englishFragment = JSDOM.fragment(english || "");
    const hindiFragment = JSDOM.fragment(hindi || "");
    const englishWalker = englishFragment.ownerDocument.createTreeWalker(englishFragment, 4);
    const hindiWalker = hindiFragment.ownerDocument.createTreeWalker(hindiFragment, 4);
    const englishNodes = [];
    const hindiNodes = [];
    let node = englishWalker.nextNode();
    while (node) {
      if (normalize(node.nodeValue)) englishNodes.push(node.nodeValue);
      node = englishWalker.nextNode();
    }
    node = hindiWalker.nextNode();
    while (node) {
      if (normalize(node.nodeValue)) hindiNodes.push(node.nodeValue);
      node = hindiWalker.nextNode();
    }
    if (englishNodes.length !== hindiNodes.length) return;
    englishNodes.forEach((value, index) => addApproved(value, hindiNodes[index]));
  };

  const collectPairs = (english, hindi, key = "") => {
    if (typeof english === "string") {
      if (key === "html") collectHtmlPairs(english, hindi);
      else addApproved(english, hindi);
      return;
    }
    if (Array.isArray(english)) {
      const hindiItems = Array.isArray(hindi) ? hindi : [];
      const indexedHindi = new Map(hindiItems.map((item) => [identity(item), item]).filter(([itemKey]) => itemKey));
      english.forEach((item, index) => {
        const itemIdentity = identity(item);
        collectPairs(item, itemIdentity ? indexedHindi.get(itemIdentity) ?? hindiItems[index] : hindiItems[index]);
      });
      return;
    }
    if (english && typeof english === "object") {
      const localized = hindi && typeof hindi === "object" && !Array.isArray(hindi) ? hindi : {};
      for (const [childKey, value] of Object.entries(english)) collectPairs(value, localized[childKey], childKey);
    }
  };

  await legacyClient.connect();
  try {
    await legacyClient.query("BEGIN READ ONLY");
    const tableResult = await legacyClient.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'rsac_%' ORDER BY tablename"
    );
    for (const { tablename } of tableResult.rows) {
      const safeTable = `"${tablename.replaceAll('"', '""')}"`;
      const { rows } = await legacyClient.query(`SELECT to_jsonb(source_row) AS data FROM ${safeTable} source_row`);
      for (const { data } of rows) {
        for (const [key, value] of Object.entries(data || {})) {
          if (!key.endsWith("_hi")) continue;
          const englishKey = key.slice(0, -3);
          if (data[englishKey] === undefined || englishKey === "content_fields") continue;
          collectPairs(data[englishKey], value, englishKey === "html" ? "html" : englishKey);
        }
      }
    }
    await legacyClient.query("COMMIT");
  } catch (error) {
    await legacyClient.query("ROLLBACK");
    throw error;
  } finally {
    await legacyClient.end();
  }

  for (const [english, hindi] of Object.entries(trustedHindiPairs)) {
    addApproved(english, hindi, true);
  }
  return { approved, conflicts };
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    "SELECT id,collection,entry_key,data_en,data_hi FROM cms_entries WHERE status='published' ORDER BY collection,sort_order,entry_key"
  );
  for (const row of rows) {
    const definition = getCollection(row.collection);
    for (const field of definition?.fields || []) {
      if (field.localized === false || row.data_en?.[field.name] === undefined) continue;
      collectLocalized(row.data_en[field.name], row.data_hi?.[field.name], row, [field.name]);
    }
  }

  const sources = [...sourceByNormalized.values()];
  if (prepare) {
    const outputPath = cachePath || resolve("backups", "cms-hindi-google-cache-working.json");
    let translated = {};
    try {
      const existing = JSON.parse(await readFile(outputPath, "utf8"));
      translated = existing.translations || {};
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const checkpoint = (translations) => writeFile(
      outputPath,
      `${JSON.stringify({ createdAt: new Date().toISOString(), translations }, null, 2)}\n`,
      "utf8"
    );
    console.log(`Preparing ${sources.length} unique translations from ${rows.length} published entries (${Object.keys(translated).length} cached).`);
    translated = await translateAll(sources, translated, checkpoint);
    const invalid = Object.entries(translated).filter(([source, hindi]) =>
      isTranslatable(source, ["content"]) && !devanagari.test(hindi)
    );
    if (invalid.length) throw new Error(`Translation validation failed for ${invalid.length} strings.`);
    await checkpoint(translated);
    console.log(JSON.stringify({ mode: "prepared", outputPath, translations: sources.length, examples: Object.entries(translated).slice(0, 8) }, null, 2));
  } else if (prepareLegacy) {
    const { approved, conflicts } = await buildLegacyTranslations();
    const translated = {};
    let fingerprintTranslations = 0;
    let compositeTranslations = 0;
    for (const source of sources) {
      const normalizedSource = normalize(source);
      const exact = approved.get(normalizedSource.toLocaleLowerCase("en"));
      if (exact) {
        translated[source] = exact;
        continue;
      }
      const fingerprintMatch = trustedByFingerprint.get(alphanumeric(normalizedSource));
      if (fingerprintMatch) {
        translated[source] = fingerprintMatch;
        fingerprintTranslations += 1;
        continue;
      }
      const composite = composeTrustedTranslation(normalizedSource);
      if (composite) {
        translated[source] = composite;
        compositeTranslations += 1;
      }
    }
    const outputPath = cachePath || resolve("backups", "cms-hindi-legacy-cache.json");
    await writeFile(
      outputPath,
      `${JSON.stringify({ createdAt: new Date().toISOString(), source: "rsac_cms-and-local-approved-maps", translations: translated }, null, 2)}\n`,
      "utf8"
    );
    console.log(JSON.stringify({
      mode: "prepared-legacy",
      outputPath,
      candidates: sources.length,
      translations: Object.keys(translated).length,
      unresolved: sources.length - Object.keys(translated).length,
      ambiguousLegacyPairs: conflicts.size,
      fingerprintTranslations,
      compositeTranslations,
      examples: Object.entries(translated).slice(0, 12),
    }, null, 2));
  } else {
    const cache = JSON.parse(await readFile(cachePath, "utf8"));
    const translations = new Map(Object.entries(cache.translations || {}).map(([source, hindi]) => [normalize(source).toLocaleLowerCase("en"), hindi]));
    const missingTranslations = sources.filter((source) => !translations.has(normalize(source).toLocaleLowerCase("en")));
    if (missingTranslations.length && !allowPartial) {
      throw new Error(`Translation cache is missing ${missingTranslations.length} current strings.`);
    }

    await client.query("BEGIN");
    let changedEntries = 0;
    try {
      for (const row of rows) {
        const definition = getCollection(row.collection);
        const nextHindi = { ...(row.data_hi || {}) };
        for (const field of definition?.fields || []) {
          if (field.localized === false || row.data_en?.[field.name] === undefined) continue;
          nextHindi[field.name] = applyLocalized(row.data_en[field.name], row.data_hi?.[field.name], translations, [field.name]);
        }
        if (JSON.stringify(nextHindi) === JSON.stringify(row.data_hi || {})) continue;
        await client.query(
          "UPDATE cms_entries SET data_hi=$1,version=version+1,updated_at=now() WHERE id=$2",
          [nextHindi, row.id]
        );
        await client.query(
          `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
           VALUES ('translate-unresolved-hindi',$1,$2,$3,$4,$5)`,
          [row.collection, row.id, row.entry_key, row.data_hi, nextHindi]
        );
        changedEntries += 1;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    console.log(JSON.stringify({
      mode: "applied",
      changedEntries,
      availableTranslations: translations.size,
      skippedUnresolved: missingTranslations.length,
    }, null, 2));
  }
} finally {
  await client.end();
}
