const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const getNestedValue = (item, field) => {
  const path = String(field || "").replace(/^-/, "").split(".");
  let current = item;

  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
};

const getSortableValue = (item, field) => {
  const normalizedField = String(field || "").replace(/^-/, "");
  const fallbackFields =
    normalizedField === "sort"
      ? ["sort", "display_order", "sort_order"]
      : normalizedField === "display_order" || normalizedField === "sort_order"
        ? ["display_order", "sort_order", "sort"]
        : [normalizedField];

  for (const candidateField of fallbackFields) {
    const value = getNestedValue(item, candidateField);
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (candidateField === "title" || candidateField === "name") {
      return normalizeText(value);
    }

    if (candidateField === "sort" || candidateField === "display_order" || candidateField === "sort_order") {
      const numeric = parseNumber(value);
      return numeric === null ? Number.MAX_SAFE_INTEGER : numeric;
    }

    if (/^date|created_at|updated_at|published_at/.test(candidateField)) {
      const parsedDate = Date.parse(value);
      return Number.isFinite(parsedDate) ? parsedDate : null;
    }

    const numeric = parseNumber(value);
    return numeric === null ? normalizeText(value) : numeric;
  }

  if (normalizedField === "title" || normalizedField === "name") {
    return "";
  }

  if (/^date|created_at|updated_at|published_at/.test(normalizedField)) {
    return null;
  }

  return undefined;
};

const compareValues = (left, right, descending = false) => {
  if (left === undefined && right === undefined) {
    return 0;
  }
  if (left === undefined || left === null) {
    return 1;
  }
  if (right === undefined || right === null) {
    return -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return descending ? right - left : left - right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return descending
      ? right.localeCompare(left, undefined, { sensitivity: "base" })
      : left.localeCompare(right, undefined, { sensitivity: "base" });
  }
  return descending
    ? String(right).localeCompare(String(left), undefined, { sensitivity: "base" })
    : String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
};

export const sortDirectusItems = (items = [], sortFields = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalizedSortFields = Array.isArray(sortFields)
    ? sortFields.filter(Boolean)
    : [];

  if (!normalizedSortFields.length) {
    normalizedSortFields.push(
      "display_order",
      "sort_order",
      "sort",
      "date",
      "date_published",
      "date_created",
      "created_at",
      "title",
      "name"
    );
  }

  return [...items].sort((left, right) => {
    for (const field of normalizedSortFields) {
      const descending = String(field).startsWith("-");
      const fieldName = String(field).replace(/^-/, "");
      const leftValue = getSortableValue(left, fieldName);
      const rightValue = getSortableValue(right, fieldName);
      const compared = compareValues(leftValue, rightValue, descending);

      if (compared !== 0) {
        return compared;
      }
    }

    return 0;
  });
};
