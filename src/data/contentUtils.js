import { canonicalDivisionSection } from "./divisionSectionLabels";

export const sectionOverrideKey = (text) => {
  const trimmed = String(text ?? "").trim();
  return (canonicalDivisionSection(trimmed) || trimmed).toLowerCase();
};
