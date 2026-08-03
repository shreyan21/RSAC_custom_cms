const compositeFieldTypes = new Set(["blocks", "json", "richtext", "media", "color", "boolean"]);

export function usesCompositeFieldContainer(field) {
  return compositeFieldTypes.has(field?.type) || ["path", "route"].includes(field?.name);
}
