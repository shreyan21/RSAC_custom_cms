// Standalone copy of the website's division tab engine (from
// src/pages/OfficialContentPage.jsx), run under jsdom so the CMS editor can be
// grouped into EXACTLY the same tabs the public page shows. Helper functions are
// copied verbatim; buildDivisionSectionsFromHtml is adapted to return, per tab,
// the list of editable text-node keys (text-000N) instead of rendered HTML.
//
// If the website engine changes, re-copy the helpers here.
import { JSDOM } from "jsdom";

const divisionCategoryDefinitions = [
  { key: "scientific-manpower", label: "Scientific Manpower", aliases: ["scientific manpower", "वैज्ञानिक जनशक्ति"] },
  { key: "ongoing-projects", label: "Ongoing Projects", aliases: ["ongoing project", "ongoing projects", "ongoing scientific projects", "brief details of ongoing projects", "चालू परियोजनाएं", "चालू परियोजनाएँ", "चल रही परियोजना", "चल रही परियोजनाएँ", "चल रही वैज्ञानिक परियोजनाएं", "चल रही वैज्ञानिक परियोजनाएँ", "संचालित परियोजनायें", "संचालित परियोजनाएँ"] },
  { key: "completed-projects", label: "Completed Projects", aliases: ["completed project", "completed projects", "completed involved projects", "completed/involved projects", "पूर्ण परियोजनाएं", "पूर्ण परियोजनाएँ", "पूर्ण की गयी परियोजनायें", "पूर्ण की गई परियोजनाएँ", "पूर्ण/संलग्न परियोजनाएँ", "पूर्ण/संलग्न परियोजनाएं", "पूर्ण/सम्मिलित परियोजनाएँ", "पूर्ण / सम्मिलित परियोजनाएँ"] },
  { key: "technical-reports", label: "Technical Reports", aliases: ["technical reports", "technical reports and atlas", "technical reports and atlases", "list of technical reports", "list of technical reports disaster management plans atlases", "तकनीकी रिपोर्ट", "तकनीकि रिपोर्ट", "तकनीकी रिपोर्ट एवं एटलस"] },
  { key: "publications", label: "Publications", aliases: ["publication", "publications", "प्रकाशन"] },
  { key: "research-paper-published", label: "Research Paper Published", aliases: ["book chapters published from international publisher", "book/chapters published from international publisher", "list of research papers", "research paper published", "research papers published", "research paper presented published", "research paper presented/published", "शोध पत्र प्रकाशित", "शोध पत्र प्रस्तुत प्रकाशित"] },
  { key: "research-papers", label: "Research Paper/ Articles", aliases: ["research paper", "research papers", "research paper articles", "research paper/articles", "research paper articals", "research paper/articals", "शोध पत्र", "शोध पत्र / लेख", "शोध पत्र/लेख", "शोध पत्र / आलेख", "शोध प्रपत्र"] },
  { key: "map-photos", label: "Map/Photos", aliases: ["map photos", "map/photos", "map/ photos", "maps photos", "मानचित्र / तस्वीरें", "मानचित्र/तस्वीरें", "मानचित्र तस्वीरें", "नक्शे / तस्वीरें"] },
  { key: "software", label: "Software", aliases: ["software", "सॉफ्टवेयर", "सॉफ्टवेर"] },
  { key: "hardware", label: "Hardware", aliases: ["hardware", "हार्डवेयर"] },
  { key: "data-bank", label: "Data Bank", aliases: ["data bank", "डेटा बैंक", "डाटा बैंक"] },
  { key: "training-programmes", label: "Training Programmes", aliases: ["training programme", "training programmes", "training program", "प्रशिक्षण कार्यक्रम"] },
  { key: "training-hostel", label: "Training Hostel", aliases: ["training hostel", "प्रशिक्षण छात्रावास"] },
  { key: "training-hostel-photos", label: "Training Hostel Photos", aliases: ["training hostel photos", "प्रशिक्षण छात्रावास तस्वीरें"] },
  { key: "mtech", label: "M.Tech. in Remote Sensing and GIS", aliases: ["m tech in remote sensing and gis", "m.tech. in remote sensing and gis", "रिमोट सेंसिंग एवं जीआईएस में एम.टेक."] },
];

const compactText = (value) =>
  value?.replace(/\s+/g, " ").replace(/^×\s*/, "").replace(/\s*Close\s*$/i, "").trim() || "";

const normalizeName = (value) =>
  compactText(value).replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();

const normalizeCategoryText = (value) =>
  compactText(value)
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/articals/gi, "articles")
    .replace(/\s*\/\s*/g, "/")
    .replace(/[^a-z0-9/&.\p{Script=Devanagari}]+/giu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const canonicalizeDivisionCategory = (value) => {
  const normalized = normalizeCategoryText(value);
  if (!normalized) return null;
  return (
    divisionCategoryDefinitions.find((category) =>
      category.aliases.some((alias) => {
        const normalizedAlias = normalizeCategoryText(alias);
        return (
          normalized === normalizedAlias ||
          normalized.includes(normalizedAlias) ||
          normalizedAlias.includes(normalized)
        );
      })
    ) || null
  );
};

const uniqueCategories = (categories) => {
  const seen = new Set();
  return categories.filter((category) => {
    if (!category || seen.has(category.key)) return false;
    seen.add(category.key);
    return true;
  });
};

const uniqueDivisionSections = (sections) => {
  const seen = new Set();
  return sections.filter((section) => {
    if (!section?.key || seen.has(section.key)) return false;
    seen.add(section.key);
    return true;
  });
};

const looksLikePersonName = (value) =>
  /^(hon'?ble\s+|late\s+|माननीय\s+|स्वर्गीय\s+)?(dr\.?|prof\.?|shri\.?|sri|smt\.?|sushri|mr\.?|ms\.?|mohd\.?|श्री\.?|श्रीमती|सुश्री|डॉ\.?|डॉ॰|प्रो\.?|कुमारी)/i.test(compactText(value));

const hindiProfileDetailLabels = new Set([
  "पदनाम", "नाम", "योग्यता", "शैक्षिक योग्यता", "शैक्षणिक योग्यता", "विशेषज्ञता", "विशेषज्ञता का क्षेत्र", "अनुभव", "अनुभव वर्षों में", "प्रकाशन", "प्रकाशनों की संख्या", "संपर्क", "संपर्क संख्या", "संपर्क सूत्र", "ई-मेल", "ईमेल", "ईमेल आईडी", "तैनाती", "नियुक्ति", "समयावधि", "वर्तमान पद", "कर्मचारी आईडी", "अवधि", "कार्यकाल", "समय सीमा",
]);

const isProfileDetailLabel = (value) => {
  const text = compactText(value).replace(/[:：]$/, "").trim();
  return (
    /^(time period|designation|qualification|educational qualification|area of specialization|area of specialisation|experience|experience in years|experience in years\/projects|no of publications|contact no\.?|e-?mail id|employee id|deployment)$/i.test(text) ||
    hindiProfileDetailLabels.has(text)
  );
};

const getProfileRows = (container) => {
  const details = [];
  let pendingLabel = null;
  Array.from(container.querySelectorAll("tr")).forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td, th")).map((cell) => compactText(cell.textContent)).filter(Boolean);
    if (!cells.length || /^view profile$/i.test(cells.join(" "))) return;
    if (cells.length >= 2) {
      details.push({ label: cells[0].replace(/:$/, ""), value: cells.slice(1).join(" ") });
      pendingLabel = null;
      return;
    }
    const [cellText] = cells;
    if (pendingLabel && !isProfileDetailLabel(cellText)) {
      details.push({ label: pendingLabel, value: cellText });
      pendingLabel = null;
      return;
    }
    if (isProfileDetailLabel(cellText)) pendingLabel = cellText.replace(/:$/, "");
  });
  return details;
};

const findProfileContainer = (heading) => {
  let container = heading.parentElement;
  for (let depth = 0; container && depth < 8; depth += 1) {
    const hasProfileData = container.querySelector("img[src], table");
    const tooBroad = compactText(container.textContent).length > 3200;
    if (hasProfileData && !tooBroad) return container;
    container = container.parentElement;
  }
  return null;
};

const isProfileCandidate = ({ name, container, rows, image }) => {
  if (!name || name.length < 3 || /content will be available soon/i.test(name)) return false;
  const hasProfileRows = rows.some((row) =>
    /designation|qualification|specialization|specialisation|experience|publication|contact|mail|deployment|period/i.test(row.label));
  return Boolean(container && (hasProfileRows || looksLikePersonName(name)) && (image || rows.length));
};

const getProfileCandidates = (document) => {
  const headings = Array.from(document.querySelectorAll("h3, h4"));
  const containers = new Set();
  return headings
    .map((heading) => {
      const name = compactText(heading.textContent);
      const container = findProfileContainer(heading);
      if (!container || containers.has(container)) return null;
      const image = container.querySelector("img[src]");
      const rows = getProfileRows(container);
      const candidate = { name, heading, container, image, rows };
      if (!isProfileCandidate(candidate)) return null;
      containers.add(container);
      return candidate;
    })
    .filter(Boolean);
};

const findDivisionTabStrips = (document) =>
  Array.from(document.querySelectorAll("div")).filter((element) => {
    const directSpans = Array.from(element.children).filter((child) => child.tagName === "SPAN");
    const categories = directSpans.map((span) => canonicalizeDivisionCategory(span.textContent)).filter(Boolean);
    return directSpans.length >= 2 && categories.length >= 1;
  });

const getDivisionTabSections = (document) =>
  uniqueDivisionSections(
    findDivisionTabStrips(document).flatMap((strip) =>
      Array.from(strip.children)
        .filter((child) => child.tagName === "SPAN")
        .map((span) => {
          const text = compactText(span.textContent);
          const category = canonicalizeDivisionCategory(text);
          if (category) return category;
          return text ? { key: "overview", label: text } : null;
        })
    ).filter(Boolean)
  );

const getMeaningfulChildren = (element) =>
  Array.from(element.children).filter(
    (child) =>
      child.matches("[data-profile-marker]") ||
      compactText(child.textContent) ||
      child.querySelector("img[src], table"));

const hasProfileMarker = (element) =>
  element.matches("[data-profile-marker]") || Boolean(element.querySelector("[data-profile-marker]"));

const findDivisionContentContainer = (document) => {
  let container = document.body;
  for (let depth = 0; depth < 10; depth += 1) {
    const children = getMeaningfulChildren(container);
    const onlyChild = children[0];
    if (children.length === 1 && onlyChild.tagName === "DIV" && !onlyChild.matches("[data-profile-marker]")) {
      container = onlyChild;
    } else break;
  }
  return container;
};

const containsElement = (container, target) => container === target || Boolean(container?.contains(target));

const findDivisionContentPanels = (document) => {
  const strips = findDivisionTabStrips(document);
  if (!strips.length) return [];
  for (const strip of strips) {
    let container = strip.parentElement;
    for (let depth = 0; container && depth < 8; depth += 1) {
      const children = getMeaningfulChildren(container);
      const stripIndex = children.findIndex((child) => containsElement(child, strip));
      if (stripIndex !== -1) {
        const following = children.slice(stripIndex + 1).filter((child) => !containsElement(child, strip));
        const panels = following.length === 1
          ? getMeaningfulChildren(following[0]).filter((child) => !containsElement(child, strip))
          : following;
        const usablePanels = panels.filter((panel) =>
          !isDivisionCategoryMarker(panel) && (compactText(panel.textContent) || panel.querySelector("img[src], table, ul, ol")));
        if (usablePanels.length >= 2) return usablePanels;
      }
      container = container.parentElement;
    }
  }
  return [];
};

const startsWithCategoryLabel = (element) => {
  const firstChild = getMeaningfulChildren(element)[0];
  const leadingText = compactText(firstChild?.textContent || element.textContent).slice(0, 140);
  return Boolean(canonicalizeDivisionCategory(leadingText));
};

const isDivisionCategoryMarker = (element) => {
  if (!element || hasProfileMarker(element)) return false;
  if (["TABLE", "TBODY", "THEAD", "TR", "TD", "TH", "UL", "OL", "LI"].includes(element.tagName)) return false;
  if (element.tagName === "DIV" && getMeaningfulChildren(element).length > 1) return false;
  if (element.querySelector("img[src], table, ul, ol")) return false;
  const text = compactText(element.textContent);
  if (!text || text.length > 180) return false;
  return Boolean(canonicalizeDivisionCategory(text));
};

const hasDivisionCategoryMarker = (element) =>
  isDivisionCategoryMarker(element) ||
  Boolean(element.querySelector("h3, h4, h5, h6, p, span, strong, div") &&
    Array.from(element.querySelectorAll("h3, h4, h5, h6, p, span, strong, div")).some(isDivisionCategoryMarker));

const collectDivisionBlocks = (element) => {
  const children = getMeaningfulChildren(element);
  if (!children.length) {
    return compactText(element.textContent) || element.querySelector("img[src], table") ? [element] : [];
  }
  return children.flatMap((child) => {
    if (child.matches("[data-profile-marker]") || isDivisionCategoryMarker(child) || ["TABLE", "UL", "OL"].includes(child.tagName)) {
      return [child];
    }
    const childChildren = getMeaningfulChildren(child);
    const canFlatten = child.tagName === "DIV" && !hasProfileMarker(child) && childChildren.length > 1 &&
      (hasDivisionCategoryMarker(child) || (!startsWithCategoryLabel(child) && compactText(child.textContent).length > 600));
    return canFlatten ? collectDivisionBlocks(child) : [child];
  });
};

const getCategoryForBlock = (block) => canonicalizeDivisionCategory(compactText(block.textContent).slice(0, 160));

const getBlockCategoryMarkers = (block) => {
  if (isDivisionCategoryMarker(block)) {
    const category = getCategoryForBlock(block);
    return category ? [category] : [];
  }
  return Array.from(block.querySelectorAll("h3, h4, h5, h6, p, span, strong, div")).filter(isDivisionCategoryMarker).map(getCategoryForBlock).filter(Boolean);
};

const removeDuplicatePageTitle = (document, pageTitle) => {
  const normalizeTitle = (value) => normalizeCategoryText(value).replace(/\s*&\s*/g, " and ").replace(/\b(laboratory)\b/g, "lab").replace(/\s+/g, " ").trim();
  const normalizedPageTitle = normalizeTitle(pageTitle);
  Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .filter((heading) => normalizeTitle(heading.textContent) === normalizedPageTitle)
    .forEach((heading) => heading.remove());
};

// ---- key-collecting adaptation ---------------------------------------------
const IGNORED = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

// Assign text-000N keys to text nodes in the same order/rules as
// pageTextFields.processHtmlText, so keys line up with content_fields.
const assignKeys = (document, keyMap) => {
  const walker = document.createTreeWalker(document.body, 0x4 /* SHOW_TEXT */);
  let index = 0;
  let node = walker.nextNode();
  while (node) {
    let ignored = false;
    for (let a = node.parentNode; a && a.nodeType === 1; a = a.parentNode) {
      if (IGNORED.has(a.tagName)) { ignored = true; break; }
    }
    if (!ignored && String(node.data).trim() !== "") {
      index += 1;
      keyMap.set(node, `text-${String(index).padStart(4, "0")}`);
    }
    node = walker.nextNode();
  }
};

const keysIn = (element, keyMap) => {
  const keys = [];
  if (!element) return keys;
  if (element.nodeType === 3) { const k = keyMap.get(element); if (k) keys.push(k); return keys; }
  const walker = element.ownerDocument.createTreeWalker(element, 0x4);
  let node = walker.nextNode();
  while (node) { const k = keyMap.get(node); if (k) keys.push(k); node = walker.nextNode(); }
  return keys;
};

// Training-division pages carry their research-paper and technical-report
// lists AFTER the tab panels, so the positional engine cannot place them and
// they used to pile up under the overview section while the website shows
// them as their own tabs (OfficialContentPage normalizeDivisionSections moves
// them with html-level fixups). Mirror that here at the key level: every text
// key from the "List of Research Papers" marker onward moves to its own
// section, split again at the "LIST OF TECHNICAL REPORTS" marker.
const applyTrainingTailSplit = (sections, keyMap, slug) => {
  if (!/^training-division-?$/.test(slug || "")) return sections;

  const ordered = []; // keyMap insertion order == document order
  keyMap.forEach((key, node) => ordered.push({ key, text: compactText(String(node.data)) }));
  const researchIndex = ordered.findIndex((entry) => /^list of research papers/i.test(entry.text));
  if (researchIndex === -1) return sections;
  const techIndex = ordered.findIndex(
    (entry, index) => index > researchIndex && /^list of technical reports/i.test(entry.text));

  const researchKeys = ordered
    .slice(researchIndex, techIndex === -1 ? undefined : techIndex)
    .map((entry) => entry.key);
  const techKeys = techIndex === -1 ? [] : ordered.slice(techIndex).map((entry) => entry.key);
  const moved = new Set([...researchKeys, ...techKeys]);

  const result = sections
    .map((section) => ({ ...section, textKeys: section.textKeys.filter((key) => !moved.has(key)) }))
    .filter((section) => section.textKeys.length);
  const append = (key, label, textKeys) => {
    if (!textKeys.length) return;
    const existing = result.find((section) => section.key === key);
    if (existing) existing.textKeys.push(...textKeys);
    else result.push({ key, label, textKeys });
  };
  append("research-paper-published", "Research Paper Published", researchKeys);
  append("technical-reports", "Technical Reports", techKeys);
  return result;
};

// Returns [{ key, label, textKeys: [...] }] for a division/facility page, or null
// when the page has no division tab strip (caller falls back to heading mode).
export const collectDivisionSectionKeys = (html, pageTitle = "", slug = "") => {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${html}</body></html>`);
  const document = dom.window.document;
  const keyMap = new Map();
  assignKeys(document, keyMap);

  const tabSections = getDivisionTabSections(document);
  if (!tabSections.length) return null; // not a tab page

  const overviewLabel = tabSections.find((s) => s.key === "overview")?.label || "Overview";
  const tabCategories = tabSections.filter((s) => !["overview", "scientific-manpower"].includes(s.key));
  const orderedCategories = uniqueCategories(
    [...(tabCategories.length ? tabCategories : []), ...divisionCategoryDefinitions].filter((c) => c.key !== "scientific-manpower"));

  // profiles first (before DOM mutations remove them)
  const profileKeys = [];
  const seenProfileKey = new Set();
  getProfileCandidates(document)
    .filter((p) => looksLikePersonName(p.name))
    .forEach((p) => keysIn(p.container, keyMap).forEach((k) => { if (!seenProfileKey.has(k)) { seenProfileKey.add(k); profileKeys.push(k); } }));

  removeDuplicatePageTitle(document, pageTitle);
  const panels = findDivisionContentPanels(document);
  findDivisionTabStrips(document).forEach((strip) => strip.remove());
  // mark & remove profile containers so they are not double-counted in buckets
  getProfileCandidates(document).forEach(({ container }) => {
    const marker = document.createElement("div");
    marker.setAttribute("data-profile-marker", "true");
    container.replaceWith(marker);
  });

  // When the content panels line up 1:1 with the tabs, trust that positional
  // mapping (panel[i] -> tab[i]) — it is the reliable signal and avoids loose
  // category-alias mis-matches. This is the exact structure most division pages
  // have. (Scientific Manpower comes from the profiles captured above.)
  // Within each panel the website STILL splits on inline category markers
  // (e.g. an "Ongoing Project :" label inside the Completed Projects panel
  // becomes its own tab), so mirror that here: a panel's blocks start in the
  // panel's own tab and an inline marker moves the following blocks to the
  // marker's category. Without this the editor showed no "Ongoing Projects"
  // section while the website had that tab (forest-resources).
  if (panels.length === tabSections.length) {
    const buckets = new Map(); // key -> { key, label, keys }
    const bucketOrder = [];
    const push = (category, keys) => {
      const cleanKeys = keys.filter((k) => !seenProfileKey.has(k));
      if (!cleanKeys.length) return;
      if (!buckets.has(category.key)) {
        buckets.set(category.key, { key: category.key, label: category.label, keys: [] });
        bucketOrder.push(category.key);
      }
      buckets.get(category.key).keys.push(...cleanKeys);
    };
    tabSections.forEach((tab, i) => {
      if (tab.key === "scientific-manpower") return;
      const blocks = collectDivisionBlocks(panels[i]).filter((block) =>
        hasProfileMarker(block) || compactText(block.textContent) || block.querySelector("img[src], table, ul, ol"));
      let current = tab;
      blocks.forEach((block) => {
        if (hasProfileMarker(block)) return;
        if (isDivisionCategoryMarker(block)) {
          const category = getCategoryForBlock(block);
          if (category && category.key !== "scientific-manpower") {
            current = category.key === tab.key ? tab : category;
            push(current, keysIn(block, keyMap)); // marker heading stays editable
            return;
          }
        }
        push(current, keysIn(block, keyMap));
      });
    });
    const sections = [];
    if (profileKeys.length) {
      sections.push({ key: "scientific-manpower", label: "Scientific Manpower", textKeys: profileKeys });
    }
    // Tabs from the strip first (their order), then marker-created categories
    // the strip does not have — same relative order the website appends them in.
    const stripKeys = new Set(tabSections.map((tab) => tab.key));
    tabSections.forEach((tab) => {
      const bucket = buckets.get(tab.key);
      if (bucket?.keys.length) sections.push({ key: bucket.key, label: bucket.label, textKeys: bucket.keys });
    });
    bucketOrder.forEach((key) => {
      if (stripKeys.has(key)) return;
      const bucket = buckets.get(key);
      if (bucket?.keys.length) sections.push({ key: bucket.key, label: bucket.label, textKeys: bucket.keys });
    });
    return {
      sections: applyTrainingTailSplit(sections, keyMap, slug),
      debug: { tabSections: tabSections.map((s) => s.label), panels: panels.length, mode: "positional" },
    };
  }

  const contentGroups = (panels.length ? panels : [findDivisionContentContainer(document)])
    .map((panel) => collectDivisionBlocks(panel).filter((block) =>
      hasProfileMarker(block) || compactText(block.textContent) || block.querySelector("img[src], table, ul, ol")))
    .filter((blocks) => blocks.length);

  const overviewKeys = [];
  const buckets = new Map();
  const tabOrderedCategories = tabCategories.length ? tabCategories : orderedCategories;
  let tabCategoryIndex = 0;
  const syncTabCategoryIndex = (category) => {
    const i = tabOrderedCategories.findIndex((item, idx) => idx >= tabCategoryIndex && item.key === category.key);
    if (i >= tabCategoryIndex) tabCategoryIndex = i + 1;
  };
  const getNextTabCategory = () => {
    const category = tabOrderedCategories[tabCategoryIndex] || null;
    if (category) tabCategoryIndex += 1;
    return category;
  };
  const bucketPush = (category, keys) => {
    if (!buckets.has(category.key)) buckets.set(category.key, { ...category, keys: [] });
    buckets.get(category.key).keys.push(...keys);
  };

  contentGroups.forEach((blocks, groupIndex) => {
    const explicitCategories = blocks.flatMap(getBlockCategoryMarkers).filter((c) => c.key !== "scientific-manpower");
    const nonProfileBlocks = blocks.filter((b) => !hasProfileMarker(b));
    const isProfilePanel = panels.length > 0 && blocks.some(hasProfileMarker);
    let currentCategory = null;
    if (!nonProfileBlocks.length) return;
    // A few legacy Hindi pages contain duplicated project/publication lists
    // inside the scientist panel. Keep those copies out of later CMS sections.
    if (isProfilePanel && !explicitCategories.length) return;
    if (!explicitCategories.length) {
      if (groupIndex === 0 && tabSections.some((s) => s.key === "overview")) {
        blocks.forEach((b) => { if (!hasProfileMarker(b)) overviewKeys.push(...keysIn(b, keyMap)); });
        return;
      }
      currentCategory = getNextTabCategory();
    }
    blocks.forEach((block) => {
      if (hasProfileMarker(block)) return;
      if (isDivisionCategoryMarker(block)) {
        const category = getCategoryForBlock(block);
        if (!category || category.key === "scientific-manpower") { currentCategory = null; return; }
        currentCategory = category;
        syncTabCategoryIndex(category);
        bucketPush(category, keysIn(block, keyMap)); // keep the marker heading editable
        return;
      }
      if (!currentCategory) { overviewKeys.push(...keysIn(block, keyMap)); return; }
      bucketPush(currentCategory, keysIn(block, keyMap));
    });
  });

  const sections = [];
  if (profileKeys.length) sections.push({ key: "scientific-manpower", label: "Scientific Manpower", textKeys: profileKeys });
  if (overviewKeys.length) sections.push({ key: "overview", label: overviewLabel, textKeys: overviewKeys });
  orderedCategories.forEach((category) => {
    const bucket = buckets.get(category.key);
    if (bucket?.keys.length) sections.push({ key: category.key, label: category.label, textKeys: bucket.keys });
  });
  buckets.forEach((bucket) => {
    if (orderedCategories.some((c) => c.key === bucket.key)) return;
    if (bucket.keys.length) sections.push({ key: bucket.key, label: bucket.label, textKeys: bucket.keys });
  });

  const debug = {
    tabSections: tabSections.map((s) => s.label),
    panels: panels.length,
    groups: contentGroups.map((blocks, i) => ({
      i,
      blocks: blocks.length,
      explicit: [...new Set(blocks.flatMap(getBlockCategoryMarkers).map((c) => c.key))],
      keys: blocks.reduce((n, b) => n + keysIn(b, keyMap).length, 0),
    })),
  };
  return { sections: applyTrainingTailSplit(sections, keyMap, slug), debug };
};

// Enumerate every photo on a page with a human label that names the website
// tab/section it appears under ("Map/Photos — photo 2 (xyz.jpg)"), using the
// same engine that groups the tabs. One entry per unique src, in DOM order.
export const collectPageImages = (html, pageTitle = "") => {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${html}</body></html>`);
  const document = dom.window.document;
  const imgs = Array.from(document.querySelectorAll("img[src]"));
  if (!imgs.length) return [];

  const sectionOf = new Map(); // img element -> section/person label
  const sectionKeyOf = new Map();
  // Person profile photos -> "Scientific Manpower — <person>"
  getProfileCandidates(document)
    .filter((candidate) => looksLikePersonName(candidate.name))
    .forEach((candidate) => {
      Array.from(candidate.container.querySelectorAll("img[src]")).forEach((img) => {
        if (!sectionOf.has(img)) {
          sectionOf.set(img, `Scientific Manpower — ${candidate.name}`);
          sectionKeyOf.set(img, "scientific-manpower");
        }
      });
    });
  // Tab pages: label panel images with the tab they appear under.
  const tabSections = getDivisionTabSections(document);
  if (tabSections.length) {
    const panels = findDivisionContentPanels(document);
    if (panels.length === tabSections.length) {
      tabSections.forEach((tab, index) => {
        Array.from(panels[index].querySelectorAll("img[src]")).forEach((img) => {
          if (!sectionOf.has(img)) {
            sectionOf.set(img, tab.label);
            sectionKeyOf.set(img, tab.key);
          }
        });
      });
    }
  }

  const bySrc = new Map(); // unique per src, first occurrence wins
  const counters = new Map();
  imgs.forEach((img) => {
    const src = img.getAttribute("src");
    if (!src || bySrc.has(src)) return;
    const section = sectionOf.get(img) || "";
    const isPerson = section.startsWith("Scientific Manpower — ");
    const bucket = section || "Photo";
    const n = (counters.get(bucket) || 0) + 1;
    counters.set(bucket, n);
    const fileName = decodeURIComponent(src.split("/").pop() || "").slice(0, 60);
    const label = isPerson
      ? `${section} (${fileName})`
      : section
        ? `${section} — photo ${n} (${fileName})`
        : `Photo ${n} (${fileName})`;
    bySrc.set(src, {
      src,
      label,
      sort: bySrc.size + 1,
      sectionKey: sectionKeyOf.get(img) || "",
      sectionLabel: isPerson ? "Scientific Manpower" : section,
    });
  });
  return Array.from(bySrc.values());
};

// expose for validation
export const debugAssign = (html) => {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${html}</body></html>`);
  const keyMap = new Map();
  assignKeys(dom.window.document, keyMap);
  const out = [];
  keyMap.forEach((k, node) => out.push([k, String(node.data).replace(/\s+/g, " ").trim()]));
  return out;
};
