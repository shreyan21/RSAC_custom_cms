import { canonicalDivisionSection } from "./divisionSectionLabels.js";

const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
const mediaTabPattern = /^(?:photos?|images?|gallery|map\s*\/?\s*photos?|फोटो|फ़ोटो|तस्वीरें?|चित्र|चित्रों|मानचित्र\s*\/?\s*तस्वीरें)$/iu;

export const findLegacyImportedTabStrips = (document) =>
  Array.from(document?.body?.querySelectorAll?.("div") || []).filter((container) => {
    const children = Array.from(container.children || []);
    if (children.length < 2 || children.some((child) => child.tagName !== "SPAN")) return false;

    const labels = children.map((child) => compact(child.textContent));
    if (labels.some((label) => !label || label.length > 100)) return false;

    const recognizedSections = labels.filter((label) => canonicalDivisionSection(label)).length;
    const hasMediaTab = labels.some((label) => mediaTabPattern.test(label));
    return hasMediaTab || recognizedSections >= 2 || (recognizedSections === 1 && labels.length <= 3);
  });

export const removeLegacyImportedTabStrips = (document) => {
  const strips = findLegacyImportedTabStrips(document);
  strips.forEach((strip) => strip.remove());
  return strips.length;
};
