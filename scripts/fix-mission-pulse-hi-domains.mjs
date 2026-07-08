// One-shot fix: the CMS translations.hi.mission_pulse.domains array dropped the
// per-card `id` (and was never actually translated). Because deepMerge replaces
// arrays wholesale, that broken array overrode the English domains and every
// Operational Domains card resolved to the first match (Agriculture) in Hindi.
//
// This writes a complete, correct Hindi domains array (real id + path + icon +
// Hindi text) so each card navigates to its own division.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const env = readFileSync(join(root, "backend", "directus", ".env"), "utf8");
const pick = (k) =>
  (env.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, "m")) || [])[1]?.trim();

const BASE = pick("PUBLIC_URL") || "http://localhost:8055";
const EMAIL = pick("ADMIN_EMAIL");
const PASSWORD = pick("ADMIN_PASSWORD");

const hiDomains = [
  {
    id: "agriculture",
    label: "कृषि",
    detail: "मौसमी फसल आसूचना",
    icon: "sprout",
    tagline: "खाद्य सुरक्षा हेतु फसल आसूचना",
    deliverables: [
      "गेहूं, धान, गन्ना, आलू और सरसों के लिए फसल क्षेत्रफल एवं उत्पादन अनुमान",
      "फसल अवशेष जलाने की चेतावनी एवं बागवानी विस्तार मानचित्रण",
      "कृषि विभाग हेतु फसल-स्थिति एवं सूखा आकलन",
    ],
    stat: { value: "75", label: "जिलों में मौसमी फसल आकलन" },
    path: "/divisions/agriculture-resources-division1",
    linkLabel: "कृषि संसाधन प्रभाग",
  },
  {
    id: "water",
    label: "जल संसाधन",
    detail: "सतही एवं भूजल",
    icon: "droplets",
    tagline: "राज्य की योजना के हर जल बिंदु का मानचित्रण",
    deliverables: [
      "पेयजल योजनाओं हेतु भूजल संभाव्यता मानचित्र",
      "मौसमी अनुश्रवण सहित आर्द्रभूमि एवं जलाशय सूची",
      "सूक्ष्म एवं मध्यम स्तर पर जलसंभर विकास योजनाएं",
    ],
    stat: { value: "2", label: "समर्पित सतही एवं भूजल प्रभाग" },
    path: "/divisions/groundwater-resources-division1",
    linkLabel: "भूजल संसाधन प्रभाग",
  },
  {
    id: "forest",
    label: "वन एवं पारिस्थितिकी",
    detail: "पारिस्थितिकी एवं जैव विविधता",
    icon: "trees",
    tagline: "वनों, आर्द्रभूमियों एवं आवासों की निगरानी",
    deliverables: [
      "परिवर्तन पहचान सहित वन आवरण एवं सीमा मानचित्रण",
      "पर्यावरण-संवेदनशील क्षेत्र एवं जैव विविधता आकलन",
      "राज्य पक्षी हेतु सारस क्रेन आवास एवं जनसंख्या मानचित्रण",
    ],
    stat: { value: "1982", label: "से उत्तर प्रदेश की पारिस्थितिकी का अनुश्रवण" },
    path: "/divisions/forest-resources-ecology-division",
    linkLabel: "वन संसाधन एवं पारिस्थितिकी प्रभाग",
  },
  {
    id: "soil-land",
    label: "मृदा एवं भू-उपयोग",
    detail: "मृदा स्वास्थ्य एवं भू-आवरण",
    icon: "mountain",
    tagline: "मृदा संसाधन एवं भू-आवरण, वर्गीकृत",
    deliverables: [
      "राज्यव्यापी भू-उपयोग / भू-आवरण वर्गीकरण",
      "लवणता एवं क्षारीयता आकलन सहित मृदा संसाधन मानचित्रण",
      "बंजर भूमि पहचान एवं सुधार योजना इनपुट",
    ],
    stat: { value: "100%", label: "उत्तर प्रदेश का एलयूएलसी मानचित्रण के अंतर्गत" },
    path: "/divisions/soil-resources-division1",
    linkLabel: "मृदा संसाधन प्रभाग",
  },
  {
    id: "urban",
    label: "नगरीय एवं अवसंरचना",
    detail: "विकास एवं उपयोगिता मानचित्रण",
    icon: "building2",
    tagline: "उच्च-विभेदन प्रतिबिंब से नगर योजना",
    deliverables: [
      "मास्टर प्लान हेतु नगरीय विकास एवं विस्तार अनुश्रवण",
      "नगरीय शासन हेतु उपयोगिता एवं अवसंरचना मानचित्रण",
      "उच्च-विभेदन बस्ती एवं सुविधा मानचित्रण",
    ],
    stat: { value: "75+", label: "जिला एवं नगर योजना पहल" },
    path: "/divisions/landuse-amp;-urban-survey-division1",
    linkLabel: "भू-उपयोग एवं नगरीय सर्वेक्षण प्रभाग",
  },
  {
    id: "disaster",
    label: "आपदा एवं बाढ़",
    detail: "मानसून प्रतिक्रिया मानचित्रण",
    icon: "shield",
    tagline: "जब हर घंटा महत्वपूर्ण हो, बाढ़ आसूचना",
    deliverables: [
      "मानसून के दौरान दैनिक बाढ़ जलप्लावन मानचित्रण",
      "बाढ़ संकट क्षेत्र निर्धारण एवं घटना-पश्चात क्षति आकलन",
      "सूखा अनुश्रवण एवं संकट सुभेद्यता अध्ययन",
    ],
    stat: { value: "दैनिक", label: "मानसून ऋतु में बाढ़ रिपोर्ट" },
    path: "/flood-reports",
    linkLabel: "दैनिक बाढ़ रिपोर्ट",
  },
];

const main = async () => {
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then((r) => r.json());

  const token = login?.data?.access_token;
  if (!token) throw new Error("login failed: " + JSON.stringify(login));
  const auth = { Authorization: `Bearer ${token}` };

  const current = await fetch(
    `${BASE}/items/rsac_site_settings?fields=translations`,
    { headers: auth }
  ).then((r) => r.json());

  let translations = current?.data?.translations || {};
  if (typeof translations === "string") translations = JSON.parse(translations);
  const hi = { ...(translations.hi || {}) };
  hi.mission_pulse = { ...(hi.mission_pulse || {}), domains: hiDomains };
  const next = { ...translations, hi };

  const res = await fetch(`${BASE}/items/rsac_site_settings`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ translations: next }),
  }).then((r) => r.json());

  if (res?.errors) throw new Error(JSON.stringify(res.errors));

  // Verify
  const check = await fetch(
    `${BASE}/items/rsac_site_settings?fields=translations`,
    { headers: auth }
  ).then((r) => r.json());
  let t = check?.data?.translations;
  if (typeof t === "string") t = JSON.parse(t);
  const ids = (t.hi.mission_pulse.domains || []).map((d) => d.id);
  console.log("PATCH ok. hi domains ids:", ids.join(", "));
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
