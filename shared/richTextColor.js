export const DEFAULT_TEXT_COLOR = "#0b6fa4";

export const normalizeTextColor = (value) => {
  const color = String(value || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(color) ? color : "";
};

export const textColorStyle = (value) => {
  const color = normalizeTextColor(value);
  return color ? `--rsac-text-color: ${color}; color: ${color}` : "";
};
