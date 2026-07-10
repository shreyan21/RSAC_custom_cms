import cmsConfig from "./cmsConfig";

export const isDrupalActive = () =>
  Boolean(
    cmsConfig.enabled && cmsConfig.provider === "drupal" && cmsConfig.baseUrl
  );

/**
 * Treat null/undefined and empty arrays as a miss so the next provider runs.
 * Objects (settings, flood payload) and non-empty arrays are hits.
 */
export const isCmsMiss = (value) =>
  value == null || (Array.isArray(value) && value.length === 0);

/**
 * Run loaders in order; return the first non-miss result.
 * Falsy loader entries are skipped (lets callers pass conditional loaders).
 */
export async function firstCmsHit(loaders = []) {
  for (const loader of loaders) {
    if (typeof loader !== "function") {
      continue;
    }

    try {
      const result = await loader();
      if (!isCmsMiss(result)) {
        return result;
      }
    } catch {
      // Provider failures fall through to the next source / static defaults.
    }
  }

  return null;
}

/**
 * Drupal-first. Static fallback is supplied by the caller when Drupal misses.
 */
export async function resolveCmsDomain({ drupal, fallback }) {
  return firstCmsHit([
    isDrupalActive() && typeof drupal === "function" ? drupal : null,
    typeof fallback === "function" ? fallback : null,
  ]);
}
