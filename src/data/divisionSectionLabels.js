// Canonical division "tab" section names, mirrored from the ones the public site
// builds from each division page (OfficialContentPage.jsx). Used by the CMS
// editor so its left-column section rows read like the website tabs
// (Scientific Manpower, Ongoing Projects, Completed Projects, …) instead of the
// raw heading text. A heading whose text matches one of these aliases starts a
// section; content flows into it until the next matching heading.
export const divisionSectionDefinitions = [
  { label: "Scientific Manpower", aliases: ["scientific manpower", "वैज्ञानिक जनशक्ति"] },
  { label: "Ongoing Projects", aliases: ["brief details of ongoing projects", "ongoing scientific projects", "ongoing projects", "ongoing project", "चालू परियोजनाएं", "चालू परियोजनाएँ"] },
  { label: "Completed Projects", aliases: ["completed/involved projects", "completed involved projects", "completed projects", "completed project", "पूर्ण परियोजनाएं", "पूर्ण परियोजनाएँ"] },
  { label: "Technical Reports", aliases: ["list of technical reports disaster management plans atlases", "list of technical reports", "technical reports and atlases", "technical reports and atlas", "technical reports", "तकनीकी रिपोर्ट एवं एटलस", "तकनीकी रिपोर्ट", "तकनीकि रिपोर्ट"] },
  { label: "Publications", aliases: ["publications", "publication", "प्रकाशन"] },
  { label: "Research Paper Published", aliases: ["book chapters published from international publisher", "book/chapters published from international publisher", "list of research papers", "research paper presented/published", "research paper presented published", "research papers published", "research paper published", "शोध पत्र प्रकाशित", "शोध पत्र प्रस्तुत प्रकाशित"] },
  { label: "Research Paper/ Articles", aliases: ["research paper/articles", "research paper articles", "research paper/articals", "research paper articals", "research papers", "research paper", "शोध पत्र / लेख", "शोध पत्र/लेख", "शोध पत्र / आलेख"] },
  { label: "Map/Photos", aliases: ["map/ photos", "map/photos", "maps photos", "map photos", "मानचित्र / तस्वीरें", "मानचित्र/तस्वीरें", "मानचित्र तस्वीरें", "नक्शे / तस्वीरें"] },
  { label: "Software", aliases: ["software", "सॉफ्टवेयर", "सॉफ्टवेर"] },
  { label: "Hardware", aliases: ["hardware", "हार्डवेयर"] },
  { label: "Data Bank", aliases: ["data bank", "डेटा बैंक", "डाटा बैंक"] },
  { label: "Training Programmes", aliases: ["training programmes", "training programme", "training program", "प्रशिक्षण कार्यक्रम"] },
  { label: "Training Hostel Photos", aliases: ["training hostel photos", "प्रशिक्षण छात्रावास तस्वीरें"] },
  { label: "Training Hostel", aliases: ["training hostel", "प्रशिक्षण छात्रावास"] },
  { label: "M.Tech. in Remote Sensing and GIS", aliases: ["m.tech. in remote sensing and gis", "m tech in remote sensing and gis", "रिमोट सेंसिंग एवं जीआईएस में एम.टेक."] },
];

const normalize = (value) =>
  String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .toLowerCase()
    // The whole Devanagari block. Combining marks (matras) are intentionally
    // inside the class: matching is per code point, not per grapheme, so
    // keeping them is exactly what alias comparison needs.
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[^a-z0-9\u0900-\u097F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// alias -> label, longest alias first so specific headings win over short ones
const aliasPairs = divisionSectionDefinitions
  .flatMap((def) => def.aliases.map((alias) => [normalize(alias), def.label]))
  .filter(([alias]) => alias.length >= 4)
  .sort((a, b) => b[0].length - a[0].length);

// Return the canonical section label if the (heading) text is/contains a known
// division category, else null.
export const canonicalDivisionSection = (text) => {
  const normalized = normalize(text);
  if (!normalized) return null;
  for (const [alias, label] of aliasPairs) {
    if (normalized === alias) return label;
  }
  for (const [alias, label] of aliasPairs) {
    if (normalized.includes(alias)) return label;
  }
  return null;
};
