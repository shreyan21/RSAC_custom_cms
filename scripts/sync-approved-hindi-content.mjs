import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import { getCollection } from "../shared/cmsCollections.js";
import { divisionHindiPhrases } from "../src/data/divisionHindiPhrases.js";
import { hiTranslations } from "../src/data/translations.js";
import { decodeHtmlEntities } from "../src/utils/htmlEntities.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const apply = process.argv.includes("--apply");
const devanagari = /[\u0900-\u097f]/u;
const latin = /[A-Za-z]/u;
const identityKeys = ["key", "id", "path", "slug", "sourceKey", "sectionKey", "entryKey"];
const sharedKeys = new Set([
  "id", "key", "path", "slug", "href", "url", "image", "photo", "video", "file",
  "icon", "iconKey", "sectionKey", "sourceKey", "groupKey", "blockKey", "entryKey",
  "type", "kind", "layout", "width", "align", "objectPosition", "sort", "sortOrder",
  "active", "enabled", "hidden", "openInNewTab", "mapQuery",
]);

const curatedHindi = {
  "About Us": "हमारे बारे में",
  "Institutional overview, mission, leadership, manpower, and organisation structure.": "संस्थागत परिचय, मिशन, नेतृत्व, जनशक्ति और संगठनात्मक संरचना।",
  "All": "सभी",
  "RSAC-UP Overview": "आरएसएसी-यूपी परिचय",
  "Read the institutional overview and background.": "संस्थान का परिचय और पृष्ठभूमि पढ़ें।",
  "Official organisational structure.": "आधिकारिक संगठनात्मक संरचना।",
  "Our Formers": "हमारे पूर्व पदाधिकारी एवं वैज्ञानिक",
  "Former chairmen, directors, and scientists.": "पूर्व अध्यक्ष, निदेशक और वैज्ञानिक।",
  "Vision & Mission": "दृष्टि एवं मिशन",
  "Mission, vision, and working objectives.": "मिशन, दृष्टि और कार्य उद्देश्य।",
  "Leadership": "नेतृत्व",
  "Government and centre leadership profiles.": "शासन और केंद्र के नेतृत्व का परिचय।",
  "Scientific Manpower": "वैज्ञानिक जनशक्ति",
  "Scientist profiles with domain and deployment details.": "कार्य क्षेत्र और तैनाती विवरण सहित वैज्ञानिक परिचय।",
  "Administrative & Auxiliary Staff": "प्रशासनिक एवं सहायक कर्मचारी",
  "Administrative contacts and website support.": "प्रशासनिक संपर्क और वेबसाइट सहायता।",
  "Divisions": "प्रभाग",
  "Scientific divisions, projects, reports, maps, and media.": "वैज्ञानिक प्रभाग, परियोजनाएं, रिपोर्ट, मानचित्र और मीडिया।",
  "Open the scientific divisions directory.": "वैज्ञानिक प्रभागों की सूची खोलें।",
  "Agriculture Resources": "कृषि संसाधन",
  "Agriculture resource applications and related work.": "कृषि संसाधन अनुप्रयोग और संबंधित कार्य।",
  "School of Geo-Informatics": "भू-सूचना विज्ञान विद्यालय",
  "Academic and geo-informatics division details.": "शैक्षणिक और भू-सूचना विज्ञान प्रभाग का विवरण।",
  "Facilities": "सुविधाएं",
  "Laboratories, data bank, library, hostel, and support facilities.": "प्रयोगशालाएं, डाटा बैंक, पुस्तकालय, छात्रावास और सहायक सुविधाएं।",
  "Open the full facilities directory for RSAC-UP.": "आरएसएसी-यूपी की सभी सुविधाओं की सूची खोलें।",
  "Library": "पुस्तकालय",
  "10,300+ books, 130 journals, maps, theses, and technical reports on remote sensing and GIS.": "सुदूर संवेदन और जीआईएस पर 10,300 से अधिक पुस्तकें, 130 शोध पत्रिकाएं, मानचित्र, शोध-प्रबंध और तकनीकी रिपोर्ट।",
  "LiDAR and Bathymetry": "लाइडार एवं बाथीमेट्री",
  "State-of-the-art LiDAR and SONAR data-processing laboratory.": "आधुनिक लाइडार और सोनार डाटा प्रसंस्करण प्रयोगशाला।",
  "Data Bank": "डाटा बैंक",
  "Satellite data archive, topographic sheets, aerial photographs, and spatial datasets.": "उपग्रह डाटा संग्रह, स्थलाकृतिक पत्रक, हवाई छायाचित्र और स्थानिक डाटासेट।",
  "Geoinformatics Lab": "भू-सूचना विज्ञान प्रयोगशाला",
  "GIS, image-processing software, datacenter, workstations, and enterprise LAN.": "जीआईएस, प्रतिबिंब प्रसंस्करण सॉफ्टवेयर, डाटा सेंटर, वर्कस्टेशन और एंटरप्राइज लैन।",
  "Water Analysis Lab": "जल विश्लेषण प्रयोगशाला",
  "Water-quality analytical equipment for environment and hydrological investigations.": "पर्यावरण और जल-विज्ञान अध्ययनों हेतु जल-गुणवत्ता विश्लेषण उपकरण।",
  "Soil Analysis Lab": "मृदा विश्लेषण प्रयोगशाला",
  "Soil analysis for pH, EC, organic matter, texture, nutrients, and pesticide residue.": "पीएच, ईसी, जैविक पदार्थ, बनावट, पोषक तत्व और कीटनाशक अवशेष हेतु मृदा विश्लेषण।",
  "Cartography & Reprography": "मानचित्रकला एवं पुनरुत्पादन",
  "Map production, large-format printing, scanning, and reprographic support.": "मानचित्र निर्माण, बड़े प्रारूप की छपाई, स्कैनिंग और पुनरुत्पादन सहायता।",
  "Training Hostels": "प्रशिक्षण छात्रावास",
  "Aryabhatt Training Hostel for trainees, officials, guests, and visiting researchers.": "प्रशिक्षुओं, अधिकारियों, अतिथियों और आगंतुक शोधकर्ताओं के लिए आर्यभट्ट प्रशिक्षण छात्रावास।",
  "Academics": "शैक्षणिक कार्यक्रम",
  "School of Geo-Informatics, training, and capacity building.": "भू-सूचना विज्ञान विद्यालय, प्रशिक्षण और क्षमता निर्माण।",
  "Open academic and training pages.": "शैक्षणिक और प्रशिक्षण पृष्ठ खोलें।",
  "School of Geo-Informatics programme information.": "भू-सूचना विज्ञान विद्यालय के कार्यक्रमों की जानकारी।",
  "Training Division": "प्रशिक्षण प्रभाग",
  "Training and capacity-building details.": "प्रशिक्षण और क्षमता निर्माण का विवरण।",
  "Geo-Portal": "जियो-पोर्टल",
  "Official geo-portal directory and external service links.": "आधिकारिक जियो-पोर्टल सूची और बाहरी सेवा लिंक।",
  "Open the geo-portal service directory.": "जियो-पोर्टल सेवाओं की सूची खोलें।",
  "Flood": "बाढ़",
  "Satellite-based daily flood inundation reports and flood maps.": "उपग्रह आधारित दैनिक बाढ़ जलमग्नता रिपोर्ट और बाढ़ मानचित्र।",
  "Flood Daily Reports": "दैनिक बाढ़ रिपोर्ट",
  "Satellite-based daily flood inundation reports during the monsoon.": "मानसून के दौरान उपग्रह आधारित दैनिक बाढ़ जलमग्नता रिपोर्ट।",
  "Photo Gallery": "फोटो गैलरी",
  "Right to Information (RTI)": "सूचना का अधिकार (आरटीआई)",
  "Public information officer details and RTI guidance.": "जन सूचना अधिकारी का विवरण और आरटीआई मार्गदर्शन।",
  "Right to Information — public information officer, appellate authority, and rules.": "सूचना का अधिकार — जन सूचना अधिकारी, अपीलीय प्राधिकारी और नियम।",
  "Tender": "निविदा",
  "Tender notices and the official U.P. e-Tender portal.": "निविदा सूचनाएं और उत्तर प्रदेश का आधिकारिक ई-टेंडर पोर्टल।",
  "FAQ": "सामान्य प्रश्न",
  "Frequently asked questions about RSAC-UP services and data.": "आरएसएसी-यूपी की सेवाओं और डाटा से संबंधित सामान्य प्रश्न।",
  "Contact Us": "संपर्क करें",
  "Address, email, phone, contact details, and public feedback.": "पता, ईमेल, फोन, संपर्क विवरण और जन प्रतिक्रिया।",
  "Contact Details": "संपर्क विवरण",
  "Address, email, phone, and public contact details.": "पता, ईमेल, फोन और सार्वजनिक संपर्क विवरण।",
  "Feedback": "प्रतिक्रिया",
  "Share website and public-service feedback with RSAC-UP.": "वेबसाइट और जनसेवाओं पर अपनी प्रतिक्रिया आरएसएसी-यूपी को भेजें।",
  "Find the Centre": "केंद्र का स्थान",
};

const normalize = (value) => decodeHtmlEntities(String(value || ""))
  .replace(/\u00ad/gu, "")
  .replace(/[\u200b-\u200d\ufeff]/gu, "")
  .normalize("NFKC")
  .replace(/[‘’]/gu, "'")
  .replace(/[“”]/gu, '"')
  .replace(/[–—]/gu, "-")
  .replace(/\u00a0/gu, " ")
  .replace(/\s+/gu, " ")
  .trim();

const translations = new Map();
for (const [english, hindi] of Object.entries({
  ...divisionHindiPhrases,
  ...hiTranslations,
  ...curatedHindi,
})) {
  if (!english || !hindi) continue;
  translations.set(english, hindi);
  translations.set(normalize(english), hindi);
}

const translated = (value) => translations.get(value) || translations.get(normalize(value));
const shouldReplace = (english, hindi) => {
  if (!hindi) return true;
  if (devanagari.test(hindi)) return false;
  return normalize(english) === normalize(hindi) || latin.test(hindi);
};

const translateHtml = (english, hindi, stats) => {
  const fragment = JSDOM.fragment(hindi || english || "");
  const walker = fragment.ownerDocument.createTreeWalker(
    fragment,
    4
  );
  let node = walker.nextNode();
  while (node) {
    const replacement = translated(node.nodeValue);
    if (replacement && replacement !== node.nodeValue) {
      node.nodeValue = replacement;
      stats.translatedStrings += 1;
    }
    node = walker.nextNode();
  }
  const container = fragment.ownerDocument.createElement("div");
  container.append(fragment.cloneNode(true));
  return container.innerHTML;
};

const identity = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  for (const key of identityKeys) {
    if (value[key] !== undefined && value[key] !== "") return `${key}:${value[key]}`;
  }
  return "";
};

const syncLocalized = (english, hindi, path, stats) => {
  if (typeof english === "string") {
    const key = path.at(-1) || "";
    if (sharedKeys.has(key)) return english;
    if (key === "html") return translateHtml(english, hindi, stats);
    const replacement = translated(english);
    if (replacement && shouldReplace(english, hindi)) {
      if (replacement !== hindi) stats.translatedStrings += 1;
      return replacement;
    }
    if (hindi !== undefined && hindi !== null && hindi !== "") return hindi;
    stats.copiedUntranslatedStrings += 1;
    if (stats.untranslatedExamples.length < 12) {
      stats.untranslatedExamples.push(`${path.join(".")}: ${english.slice(0, 160)}`);
    }
    return english;
  }

  if (Array.isArray(english)) {
    const hindiItems = Array.isArray(hindi) ? hindi : [];
    const indexedHindi = new Map(hindiItems.map((item) => [identity(item), item]).filter(([key]) => key));
    return english.map((item, index) => {
      const key = identity(item);
      const current = key ? indexedHindi.get(key) ?? hindiItems[index] : hindiItems[index];
      if (current === undefined) stats.createdRows += 1;
      return syncLocalized(item, current, [...path, String(index)], stats);
    });
  }

  if (english && typeof english === "object") {
    const current = hindi && typeof hindi === "object" && !Array.isArray(hindi) ? hindi : {};
    const output = { ...current };
    for (const [key, value] of Object.entries(english)) {
      output[key] = syncLocalized(value, current[key], [...path, key], stats);
    }
    return output;
  }

  return english;
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
const totals = { changedEntries: 0, translatedStrings: 0, copiedUntranslatedStrings: 0, createdRows: 0 };
const collections = {};
const untranslatedExamples = [];

try {
  if (apply) await client.query("BEGIN");
  const { rows } = await client.query(
    "SELECT id,collection,entry_key,data_en,data_hi FROM cms_entries WHERE status='published' ORDER BY collection,sort_order,entry_key"
  );

  for (const row of rows) {
    const stats = { translatedStrings: 0, copiedUntranslatedStrings: 0, createdRows: 0, untranslatedExamples: [] };
    const nextHindi = { ...(row.data_hi || {}) };
    const definition = getCollection(row.collection);
    const localizedFields = definition?.fields?.filter((field) => field.localized !== false) || [];
    for (const field of localizedFields) {
      if (row.data_en?.[field.name] === undefined) continue;
      nextHindi[field.name] = syncLocalized(
        row.data_en[field.name],
        row.data_hi?.[field.name],
        [field.name],
        stats
      );
    }
    if (JSON.stringify(nextHindi) === JSON.stringify(row.data_hi || {})) continue;

    totals.changedEntries += 1;
    totals.translatedStrings += stats.translatedStrings;
    totals.copiedUntranslatedStrings += stats.copiedUntranslatedStrings;
    totals.createdRows += stats.createdRows;
    collections[row.collection] = (collections[row.collection] || 0) + 1;
    for (const example of stats.untranslatedExamples) {
      if (untranslatedExamples.length >= 40) break;
      untranslatedExamples.push(`${row.collection}/${row.entry_key} ${example}`);
    }

    if (!apply) continue;
    await client.query(
      "UPDATE cms_entries SET data_hi=$1,version=version+1,updated_at=now() WHERE id=$2",
      [nextHindi, row.id]
    );
    await client.query(
      `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
       VALUES ('sync-approved-hindi',$1,$2,$3,$4,$5)`,
      [row.collection, row.id, row.entry_key, row.data_hi, nextHindi]
    );
  }

  if (apply) await client.query("COMMIT");
} catch (error) {
  if (apply) await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(JSON.stringify({
  mode: apply ? "applied" : "dry-run",
  ...totals,
  collections,
  untranslatedExamples,
}, null, 2));
