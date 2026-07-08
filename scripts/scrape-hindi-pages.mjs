// Re-scrapes the official RSAC-UP Hindi site (rsac.up.gov.in/hi) for real page
// bodies and regenerates src/data/rsacOfficialContent.hi.generated.js +
// policies.hi.generated.js.
//
// Why this exists: the Hindi pages live at *Hindi* slugs (e.g.
// /hi/page/कंप्यूटर-इमेज-प्रोसेसिंग-डिवीजन). The previous sync script fetched
// /hi/page/<english-slug>, which 404-ish'd to a JS shell, so every Hindi page
// captured only the noscript fallback ("Some of the functionalities will not
// work if javascript off..."). This maps each English page to its real Hindi
// slug and scrapes the actual server-rendered Devanagari body.

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rsacOfficialSections as englishSections } from "../src/data/rsacOfficialContent.generated.js";

const officialBaseUrl = "https://rsac.up.gov.in";
const repoRoot = resolve(import.meta.dirname, "..");
const outputPath = resolve(repoRoot, "src/data/rsacOfficialContent.hi.generated.js");
const policyOutputPath = resolve(repoRoot, "src/data/policies.hi.generated.js");

// English page slug -> official Hindi page slug (harvested from /hi nav).
// Pages with no Hindi counterpart are omitted and keep their English body.
const slugMap = {
  // about-us
  "read-more-about-us": "हमारे-बारे-में",
  "organisational-chart": "संगठनात्मक-चार्ट",
  "our-chairman's-governing-body": "हमारे-अध्यक्ष-शासी-निकाय",
  "our-former": "वैज्ञानिक-",
  "scientific-manpower": "वैज्ञानिक-जनशक्ति",
  "administrative-and-auxiliary-staff": "प्रशासनिक-और-सहायक-कर्मचारी",
  // divisions
  "agriculture-resources-division1": "कृषि-संसाधन-विभाग1",
  "computer-image-processing-division": "कंप्यूटर-इमेज-प्रोसेसिंग-डिवीजन",
  "earth-resources-division1": "पृथ्वी-संसाधन-प्रभाग",
  "forest-resources-ecology-division": "वन-संसाधन-और-पारिस्थितिकी-विभाग1",
  "groundwater-resources-division1": "भूजल-संसाधन-विभाग1",
  "geo-spatial-data-bank-division1": "भौगोलिक-स्थानिक-डाटा-बैंक-विभाग1",
  "landuse-amp;-urban-survey-division1": "भूमि-उपयोग-और-शहरी-सर्वेक्षण-विभाग1",
  "soil-resources-division1": "मृदा-संसाधन-विभाग1",
  "surface-water-resources-division1": "भूतल-जल-संसाधन-विभाग1",
  "training-division": "प्रशिक्षण-डिवीजन",
  "school-of-geo-informatics-division1": "स्कूल-ऑफ-जियो-इंफॉर्मेटिक्स1",
  // facilities
  "computer-and-image-processing-lab1": "कंप्यूटर-और-इमेज-प्रोसेसिंग-लैब",
  "water-analysis-lab1": "जल-विश्लेषण-लैब",
  "soil-analysis-lab1": "मिट्टी-विश्लेषण-लैब",
  "data-bank1": "डेटा-बैंक",
  "technical-cell": "तकनीकी-कक्ष",
  "library1": "पुस्तकालय",
  "cartography-reprography": "नक्शानवीसी-और-रीप्रोग्राफी",
  "training-hostels": "प्रशिक्षण-हॉस्टल",
  "service-block1": "सर्विस-ब्लॉक-",
  "lidar-bathymetry-lab": "लिडार-और-बैथिमेट्री-",
  // academics
  "school-of-geo-informatics-": "स्कूल-ऑफ-जियो-इंफॉर्मेटिक्स",
  "training-division-": "प्रशिक्षण-विभाग",
};

// Official Hindi section meta (title/eyebrow/intro shown on the index pages).
const sectionTranslations = {
  "about-us": {
    title: "हमारे बारे में",
    eyebrow: "आरएसएसी-यूपी परिचय",
    intro: "संस्थागत परिचय, संगठन संरचना, पूर्व नेतृत्व और कार्मिक संबंधी आधिकारिक जानकारी।",
  },
  divisions: {
    title: "विभाग",
    eyebrow: "वैज्ञानिक प्रभाग",
    intro: "प्रभागों के उद्देश्य, कार्मिक, परियोजनाएं, रिपोर्ट, शोध-पत्र, मानचित्र और मीडिया।",
  },
  facilities: {
    title: "सुविधाएं",
    eyebrow: "आरएसएसी-यूपी सुविधाएं",
    intro: "प्रयोगशालाएं, डेटा बैंक, पुस्तकालय, छात्रावास, तकनीकी सहायता, लाइडार और बाथीमेट्री सुविधाएं।",
  },
  academics: {
    title: "शैक्षिक",
    eyebrow: "शिक्षण एवं प्रशिक्षण",
    intro: "स्कूल ऑफ जियो-इन्फॉर्मेटिक्स और प्रशिक्षण प्रभाग की शैक्षणिक जानकारी।",
  },
};

// English policy slug -> Hindi policy slug.
const policyDefinitions = [
  ["terms-and-conditions", "नियम-एवं-शर्तें"],
  ["copyright-policy", "-कॉपीराइट-नीति"],
  ["privacy-policy", "-गोपनीयता-नीति-"],
  ["hyperlinking-policy", "हाईपरलिंकिंग-नीति"],
  ["disclaimer", "डिस्क्लेमर"],
  ["help", "सहायता"],
];

const allowedTags = new Set([
  "a", "b", "br", "caption", "div", "em", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "i", "img", "li", "ol", "p",
  "span", "strong", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);

const namedEntities = {
  amp: "&",
  gt: ">",
  lt: "<",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  quot: '"',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  zwj: "\u200d",
  zwnj: "\u200c",
};

const decodeEntities = (value = "") =>
  String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }
    return namedEntities[normalized] ?? match;
  });

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const stripTags = (html = "") =>
  decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const toAbsoluteUrl = (rawValue) => {
  const value = decodeEntities(rawValue || "").trim();
  if (!value || value === "#" || /^javascript:/i.test(value)) return "";
  try {
    return new URL(value, `${officialBaseUrl}/`).href;
  } catch {
    return "";
  }
};

const cleanAttributes = (tagName, rawAttributes, fallbackTitle) => {
  const tag = tagName.toLowerCase();
  const entries = [];
  const attributes = [];
  const matcher = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = matcher.exec(rawAttributes))) {
    entries.push({ name: match[1].toLowerCase(), value: match[3] ?? match[4] ?? match[5] ?? "" });
  }
  if (tag === "a") {
    const href = toAbsoluteUrl(entries.find((e) => e.name === "href")?.value);
    if (href) {
      attributes.push(`href="${escapeAttribute(href)}"`, 'target="_blank"', 'rel="noopener noreferrer"');
    }
  }
  if (tag === "img") {
    const src = toAbsoluteUrl(
      entries.find((e) => ["data-original", "data-src", "src"].includes(e.name))?.value
    );
    const alt = entries.find((e) => e.name === "alt")?.value || fallbackTitle;
    if (src) {
      attributes.push(`src="${escapeAttribute(src)}"`, `alt="${escapeAttribute(alt)}"`, 'loading="lazy"', 'decoding="async"');
    }
  }
  if (tag === "td" || tag === "th") {
    entries
      .filter((e) => ["colspan", "rowspan"].includes(e.name))
      .forEach((e) => attributes.push(`${e.name}="${escapeAttribute(e.value)}"`));
  }
  return attributes.length ? ` ${attributes.join(" ")}` : "";
};

const extractMainContent = (html) => {
  const match = html.match(
    /<section id=["']main-content["'][^>]*>([\s\S]*?)<\/section>\s*<footer/i
  );
  return (match?.[1] || html)
    .replace(/<ol class=["']breadcrumb["'][\s\S]*?<\/ol>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
};

const sanitizeContent = (html, fallbackTitle) => {
  const content = extractMainContent(html)
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+/g, " ");
  return content
    .replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g, (full, closing, tagName, attributes) => {
      const tag = tagName.toLowerCase();
      if (!allowedTags.has(tag)) return "";
      if (closing) return ["br", "img"].includes(tag) ? "" : `</${tag}>`;
      if (tag === "br") return "<br>";
      return `<${tag}${cleanAttributes(tag, attributes, fallbackTitle)}>`;
    })
    .replace(/<a>\s*([\s\S]*?)\s*<\/a>/gi, "<span>$1</span>")
    .replace(/<a(?:\s[^>]*)?>\s*<\/a>/gi, "")
    .replace(/<(p|div)>\s*<\/\1>/gi, "")
    .trim();
};

const getHindiTitle = (html, fallback) => {
  const main = extractMainContent(html);
  const heading = stripTags(main.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1] || "");
  return /[ऀ-ॿ]/.test(heading) ? heading : fallback;
};

const NOSCRIPT_MARKER = "Some of the functionalities will not work";

const fetchHindiBody = async (hindiSlug, fallbackTitle) => {
  const sourceUrl = `${officialBaseUrl}/hi/page/${encodeURIComponent(hindiSlug)}`;
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${response.status} ${sourceUrl}`);
  const sourceHtml = await response.text();
  const title = getHindiTitle(sourceHtml, fallbackTitle);
  const html = sanitizeContent(sourceHtml, title);
  const text = stripTags(html);
  if (!text || text.includes(NOSCRIPT_MARKER) || !/[ऀ-ॿ]/.test(text)) {
    throw new Error(`empty/noscript body: ${sourceUrl}`);
  }
  return { sourceUrl, title, html, preview: text.slice(0, 360) };
};

const hindiSections = [];
let ok = 0;
let kept = 0;

for (const section of englishSections) {
  const pages = [];
  for (const page of section.pages) {
    const hindiSlug = slugMap[page.slug];
    if (!hindiSlug) {
      pages.push(page); // no Hindi source -> keep English page unchanged
      kept += 1;
      process.stdout.write(`  keep(en) ${section.key}/${page.slug}\n`);
      continue;
    }
    try {
      const { sourceUrl, title, html, preview } = await fetchHindiBody(hindiSlug, page.title);
      pages.push({ ...page, title, summary: preview, preview, sourceUrl, html });
      ok += 1;
      process.stdout.write(`  hi  ${section.key}/${page.slug} -> ${hindiSlug}\n`);
    } catch (error) {
      pages.push(page);
      kept += 1;
      process.stderr.write(`  FAIL ${section.key}/${page.slug}: ${error.message}\n`);
    }
  }
  const meta = sectionTranslations[section.key] || {};
  hindiSections.push({
    ...section,
    title: meta.title || section.title,
    eyebrow: meta.eyebrow || section.eyebrow,
    intro: meta.intro || section.intro,
    pages,
  });
}

const generatedAt = new Date().toISOString();
await writeFile(
  outputPath,
  `// Generated by scripts/scrape-hindi-pages.mjs from the official RSAC-UP Hindi website.\n// Do not edit by hand. Pages without a Hindi source keep their English body.\n\nexport const rsacOfficialContentGeneratedAt = ${JSON.stringify(generatedAt)};\n\nexport const rsacOfficialSections = ${JSON.stringify(hindiSections, null, 2)};\n\nexport const getRsacOfficialSection = (sectionKey) =>\n  rsacOfficialSections.find((section) => section.key === sectionKey);\n\nexport const getRsacOfficialPage = (sectionKey, pageSlug) =>\n  getRsacOfficialSection(sectionKey)?.pages.find((page) => page.slug === pageSlug);\n`,
  "utf8"
);
process.stdout.write(`Wrote ${outputPath} (hi=${ok}, kept-en=${kept})\n`);

// Policies
const hindiPolicies = [];
for (const [slug, hindiSlug] of policyDefinitions) {
  try {
    const { sourceUrl, title, html, preview } = await fetchHindiBody(hindiSlug, slug);
    const body = stripTags(html);
    hindiPolicies.push({
      slug,
      title,
      summary: preview.slice(0, 280),
      source: sourceUrl,
      sections: [{ heading: title, body }],
    });
    process.stdout.write(`  policy ${slug} -> ${hindiSlug}\n`);
  } catch (error) {
    process.stderr.write(`  FAIL policy ${slug}: ${error.message}\n`);
  }
}

const helpPolicy = hindiPolicies.find((policy) => policy.slug === "help");
if (helpPolicy) {
  const helpBody = helpPolicy.sections[0]?.body || "";
  const normalizedBody = helpBody.replace(/\u200d/g, "");
  const screenReaderStart = normalizedBody.indexOf("स्क्रीन रीडर");
  const searchStart = normalizedBody.indexOf("सर्च सुविधा");
  const accessibilityBody =
    screenReaderStart >= 0
      ? normalizedBody
          .slice(
            screenReaderStart,
            searchStart > screenReaderStart ? searchStart : undefined
          )
          .trim()
      : normalizedBody;

  if (accessibilityBody) {
    hindiPolicies.push({
      slug: "accessibility-statement",
      title: "सुगम्यता वक्तव्य",
      summary: accessibilityBody.slice(0, 280),
      source: helpPolicy.source,
      sections: [
        {
          heading: "स्क्रीन रीडर एक्सेस और वक्तृता पहचान सहायता",
          body: accessibilityBody,
        },
      ],
    });
    process.stdout.write("  policy accessibility-statement -> सहायता (accessibility block)\n");
  }
}

await writeFile(
  policyOutputPath,
  `// Generated by scripts/scrape-hindi-pages.mjs.\n\nexport const policyPagesHindi = ${JSON.stringify(hindiPolicies, null, 2)};\n`,
  "utf8"
);
process.stdout.write(`Wrote ${policyOutputPath} (${hindiPolicies.length} policies)\n`);
