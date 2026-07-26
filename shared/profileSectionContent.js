const normalizeProfileToken = (value) => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[^a-z0-9\p{Script=Devanagari}]+/gu, "-")
  .replace(/^-|-$/g, "");

export const profileSectionContentKey = ({ employeeId, name } = {}) => {
  const employeeToken = normalizeProfileToken(employeeId);
  const nameToken = normalizeProfileToken(name);
  return `profile-content:${employeeToken || nameToken || "profile"}`;
};

export const findProfileSectionContent = (block, identity) => {
  const key = profileSectionContentKey(identity);
  const comparableKey = (value) => String(value || "")
    .replace(/^profile-content:/, "")
    .replace(/[^a-z0-9\p{Script=Devanagari}]+/giu, "")
    .toLowerCase();
  const expected = comparableKey(key);
  const child = (block?.children || []).find((item) => (
    item?.key === key || comparableKey(item?.key) === expected
  ));
  return String(child?.richText || child?.value || "");
};
