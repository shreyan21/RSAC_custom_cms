import { findLocalizedDivisionBlockIndex } from "../../src/data/divisionSectionLabels.js";

const swap = (items, firstIndex, secondIndex) => {
  const next = [...items];
  [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
  return next;
};

export const reorderDivisionPageSections = (page, sourceIndex, targetIndex) => {
  const englishBlocks = page?.dataEn?.blocks;
  if (
    !Array.isArray(englishBlocks) ||
    sourceIndex === targetIndex ||
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= englishBlocks.length ||
    targetIndex >= englishBlocks.length
  ) {
    return page;
  }

  const next = structuredClone(page);
  const sourceBlock = englishBlocks[sourceIndex];
  const targetBlock = englishBlocks[targetIndex];
  next.dataEn.blocks = swap(next.dataEn.blocks, sourceIndex, targetIndex);

  const hindiBlocks = next.dataHi?.blocks;
  if (!Array.isArray(hindiBlocks) || !hindiBlocks.length) return next;

  const sourceHindiIndex = findLocalizedDivisionBlockIndex(
    { blocks: hindiBlocks },
    sourceBlock,
    sourceIndex
  );
  const targetHindiIndex = findLocalizedDivisionBlockIndex(
    { blocks: hindiBlocks },
    targetBlock,
    targetIndex
  );

  if (
    sourceHindiIndex >= 0 &&
    targetHindiIndex >= 0 &&
    sourceHindiIndex !== targetHindiIndex
  ) {
    next.dataHi.blocks = swap(hindiBlocks, sourceHindiIndex, targetHindiIndex);
  }

  return next;
};
