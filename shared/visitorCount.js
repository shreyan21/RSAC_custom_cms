export const maxVisitorCount = 1_000_000_000_000;

export const isValidVisitorCount = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= maxVisitorCount;
