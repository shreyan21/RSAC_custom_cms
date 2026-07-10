import cmsConfig from "./cmsConfig";

/**
 * CMS-agnostic preview mode (?preview=token or DEV ?preview=true).
 * Kept out of provider clients so preview behavior stays provider-neutral.
 */
export const isCmsPreviewMode = () => {
  if (!cmsConfig.previewEnabled || typeof window === "undefined") {
    return false;
  }

  const previewValue = new URLSearchParams(window.location.search).get(
    "preview"
  );

  if (!previewValue) {
    return false;
  }

  if (cmsConfig.previewToken) {
    return previewValue === cmsConfig.previewToken;
  }

  return import.meta.env.DEV && previewValue === "true";
};
