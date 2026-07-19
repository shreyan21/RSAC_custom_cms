// Canonical division "tab" section names, mirrored from the ones the public site
// builds from each division page (OfficialContentPage.jsx). Used by the CMS
// editor so its left-column section rows read like the website tabs
// (Scientific Manpower, Ongoing Projects, Completed Projects, …) instead of the
// raw heading text. A heading whose text matches one of these aliases starts a
// section; content flows into it until the next matching heading.
export const divisionSectionDefinitions = [
  { label: "Scientific Manpower", aliases: ["scientific manpower", "वैज्ञानिक जनशक्ति"] },
  { label: "Ongoing Projects", aliases: ["brief details of ongoing projects", "ongoing scientific projects", "ongoing projects", "ongoing project", "चालू परियोजनाएं", "चालू परियोजनाएँ", "चल रही परियोजना", "चल रही परियोजनाएँ", "चल रही वैज्ञानिक परियोजनाएं", "चल रही वैज्ञानिक परियोजनाएँ", "संचालित परियोजनायें", "संचालित परियोजनाएँ"] },
  { label: "Completed Projects", aliases: ["completed/involved projects", "completed involved projects", "completed projects", "completed project", "पूर्ण परियोजनाएं", "पूर्ण परियोजनाएँ", "पूर्ण की गयी परियोजनायें", "पूर्ण की गई परियोजनाएँ", "पूर्ण/संलग्न परियोजनाएँ", "पूर्ण/संलग्न परियोजनाएं", "पूर्ण/सम्मिलित परियोजनाएँ", "पूर्ण / सम्मिलित परियोजनाएँ", "पूर्ण प्रोजेक्ट", "पूरा प्रोजेक्ट"] },
  { label: "Technical Reports", aliases: ["list of technical reports disaster management plans atlases", "list of technical reports", "technical reports and atlases", "technical reports and atlas", "technical reports", "तकनीकी रिपोर्ट एवं एटलस", "तकनीकी रिपोर्ट", "तकनीकि रिपोर्ट"] },
  { label: "Publications", aliases: ["publications and technical reports", "publications", "publication", "प्रकाशन"] },
  { label: "Research Paper Published", aliases: ["book chapters published from international publisher", "book/chapters published from international publisher", "list of research papers", "research paper presented/published", "research paper presented published", "research papers published", "research paper published", "शोध पत्र प्रकाशित", "शोध पत्र प्रस्तुत प्रकाशित"] },
  { label: "Research Paper/ Articles", aliases: ["research paper/articles", "research paper articles", "research paper/articals", "research paper articals", "research papers", "research paper", "शोध पत्र", "शोध पत्र / लेख", "शोध पत्र/लेख", "शोध पत्र / आलेख", "शोध प्रपत्र"] },
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

const sectionFamily = (label) =>
  label === "Research Paper Published" || label === "Research Paper/ Articles"
    ? "Research Papers"
    : label;

const childSourceLabel = (child) =>
  String(child?.label || "").split(/\s*(?:\u2192|->)\s*/u)[0].trim();

// Imported English and Hindi pages use different text-node keys. Match their
// CMS blocks by section meaning, never by those locale-specific keys.
export const divisionBlockPrimarySection = (block) =>
  [block?.sourceLabel, block?.heading, block?.value, block?.label]
    .map(canonicalDivisionSection)
    .find(Boolean) || null;

export const divisionChildSection = (child) =>
  [child?.sectionKey, childSourceLabel(child), child?.groupLabel]
    .map(canonicalDivisionSection)
    .find(Boolean) || null;

export const divisionSectionFamily = (value) =>
  sectionFamily(canonicalDivisionSection(value) || value || null);

export const divisionBlockSections = (block) => {
  const sections = [
    divisionBlockPrimarySection(block),
    ...(block?.children || []).map(divisionChildSection),
  ].filter(Boolean);
  return [...new Set(sections)];
};

const sharedChildKeyCount = (left, right) => {
  const keys = new Set((left?.children || []).map((child) => child?.key).filter(Boolean));
  return (right?.children || []).reduce(
    (count, child) => count + (keys.has(child?.key) ? 1 : 0),
    0
  );
};

export const findLocalizedDivisionBlockIndex = (data, referenceBlock, fallbackIndex = -1) => {
  const blocks = data?.blocks || [];
  if (!blocks.length) return -1;

  const targetSection = divisionBlockPrimarySection(referenceBlock);
  const targetFamily = sectionFamily(targetSection);
  if (targetFamily) {
    const compatible = blocks
      .map((block, index) => {
        const primary = divisionBlockPrimarySection(block);
        const sections = divisionBlockSections(block);
        const families = new Set(sections.map(sectionFamily));
        if (!families.has(targetFamily)) return null;
        const score =
          (primary === targetSection ? 100000 : 0) +
          (sectionFamily(primary) === targetFamily ? 50000 : 0) +
          (sections.includes(targetSection) ? 10000 : 0) +
          sharedChildKeyCount(referenceBlock, block) * 10 -
          Math.abs(index - fallbackIndex);
        return { index, score };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);
    return compatible[0]?.index ?? -1;
  }

  // Overview/import blocks have no canonical section name. Preserve their
  // positional pairing, using key overlap only when no position exists.
  if (fallbackIndex >= 0 && fallbackIndex < blocks.length) return fallbackIndex;
  let bestIndex = -1;
  let bestScore = 0;
  blocks.forEach((block, index) => {
    const score = sharedChildKeyCount(referenceBlock, block);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });
  return bestIndex;
};

// Some legacy Hindi imports combine multiple website sections into one block.
// Keep the editor focused on the section the user opened.
export const divisionRowsForSection = (block, referenceBlock) => {
  const children = Array.isArray(block?.children) ? block.children : [];
  const targetFamily = sectionFamily(divisionBlockPrimarySection(referenceBlock));
  if (!targetFamily || !children.length) return children;

  const blockFamily = sectionFamily(divisionBlockPrimarySection(block));
  const childFamilies = children.map((child) => sectionFamily(divisionChildSection(child)));
  const distinctFamilies = new Set(childFamilies.filter(Boolean));
  if (!distinctFamilies.has(targetFamily)) {
    return blockFamily === targetFamily ? children : [];
  }
  if (distinctFamilies.size === 1) return children;

  let activeFamily = blockFamily;
  return children.filter((_child, index) => {
    if (childFamilies[index]) activeFamily = childFamilies[index];
    return activeFamily === targetFamily;
  });
};

export const createLocalizedDivisionBlock = (referenceBlock, language = "hi") => ({
  ...structuredClone(referenceBlock || {}),
  id: `${referenceBlock?.id || "section"}-${language}-cms`,
  value: "",
  assets: [],
  children: (referenceBlock?.children || []).map((child) => ({
    ...child,
    value: "",
    language,
  })),
});
