import { officialMediaManifest } from "./officialMediaManifest.generated.js";

const OFFICIAL_HOST = "rsac.up.gov.in";
const LEGACY_HOST = "14.139.43.115:8090";
const ASSET_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "tif",
  "tiff",
  "pdf",
  "mp4",
  "webm",
  "mov",
  "m4v",
  "mp3",
  "wav",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "apk",
  "kml",
  "kmz",
  // Mirrored legacy mini-apps (e.g. the dam-analysis flipbook) are reached by
  // their index.html; rewriting only happens when the manifest has the file.
  "html",
  "htm",
];

const OFFICIAL_ASSET_PATTERN =
  `https?:\\/\\/(?:rsac\\.up\\.gov\\.in|14\\.139\\.43\\.115:8090)` +
  `\\/[^"'\\s)\\\\]+?\\.(?:${ASSET_EXTENSIONS.join("|")})` +
  `(?:\\?[^"'\\s)\\\\]*)?`;

const createOfficialAssetRegex = () =>
  new RegExp(OFFICIAL_ASSET_PATTERN, "gi");

const decodePathname = (pathname) => {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
};

const sanitizePath = (pathname) =>
  decodePathname(pathname)
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .join("/");

export const normalizeOfficialMediaUrl = (value) => {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return value;
  }
};

export const getOfficialMediaLocalPath = (value) => {
  try {
    const url = new URL(value);
    const host = url.host.toLowerCase();
    let pathname = url.pathname;

    if (host === OFFICIAL_HOST) {
      pathname = pathname.replace(/^\/site\/writereaddata\//i, "/");
    } else if (host === LEGACY_HOST) {
      pathname = `/legacy-rsac${pathname}`;
    } else {
      return "";
    }

    const safePath = sanitizePath(pathname);
    return safePath ? `/official-media/${safePath}` : "";
  } catch {
    return "";
  }
};

export const findOfficialMediaUrls = (value = "") =>
  Array.from(String(value).matchAll(createOfficialAssetRegex()), (match) =>
    match[0].replace(/&amp;$/i, "")
  );

export const isUnmirroredLegacyMedia = (value = "") => {
  const normalized = normalizeOfficialMediaUrl(value);
  return normalized.includes(LEGACY_HOST) && !officialMediaManifest[normalized];
};

export const rewriteOfficialMedia = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.replace(createOfficialAssetRegex(), (matchedUrl) => {
    const normalized = normalizeOfficialMediaUrl(matchedUrl);
    return officialMediaManifest[normalized] || matchedUrl;
  });
};

export const rewriteOfficialMediaDeep = (value) => {
  if (typeof value === "string") {
    return rewriteOfficialMedia(value);
  }
  if (Array.isArray(value)) {
    return value.map(rewriteOfficialMediaDeep);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        rewriteOfficialMediaDeep(child),
      ])
    );
  }
  return value;
};

export { officialMediaManifest };
