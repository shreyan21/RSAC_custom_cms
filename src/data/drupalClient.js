import cmsConfig from "./cmsConfig";
import { isCmsPreviewMode } from "./cmsPreview";

const baseHeaders = {
  Accept: "application/vnd.api+json, application/json",
};

const cleanPath = (value = "") =>
  value.startsWith("/") ? value : `/${value}`;

const withLanguagePrefix = (path, language) => {
  if (
    language !== "hi" ||
    cmsConfig.drupal.languagePrefixMode === "none" ||
    path.startsWith("/hi/")
  ) {
    return path;
  }

  return `/hi${path}`;
};

const buildUrl = (path, query = {}) => {
  const url = new URL(`${cmsConfig.baseUrl}${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : value);
  });

  return url.toString();
};

const canUseDrupal = () =>
  cmsConfig.enabled && cmsConfig.provider === "drupal" && cmsConfig.baseUrl;

const drupalFetch = async (
  path,
  {
    query = {},
    method = "GET",
    body,
    anonymous = false,
    timeoutMs,
    language = "en",
    allowLanguageFallback = true,
  } = {}
) => {
  if (!canUseDrupal()) {
    return null;
  }

  const paths =
    language === "hi" && allowLanguageFallback
      ? [withLanguagePrefix(path, language), path]
      : [withLanguagePrefix(path, language)];

  for (const nextPath of paths) {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      timeoutMs || cmsConfig.requestTimeout
    );

    try {
      const headers = {
        ...baseHeaders,
        ...(body === undefined
          ? {}
          : { "Content-Type": "application/vnd.api+json" }),
        ...(!anonymous && cmsConfig.token
          ? { Authorization: `Bearer ${cmsConfig.token}` }
          : {}),
      };

      const response = await fetch(buildUrl(nextPath, query), {
        method,
        headers,
        credentials: "omit",
        cache: isCmsPreviewMode() ? "no-store" : "default",
        signal: controller.signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        continue;
      }

      return response.json();
    } catch {
      // Try unprefixed language fallback below, then return null.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return null;
};

const jsonApiPath = (entityType, bundle) =>
  `${cleanPath(cmsConfig.drupal.basePath)}/${entityType}/${bundle}`;

export const readDrupalCollection = async (
  bundle,
  {
    entityType = "node",
    query = {},
    language = "en",
    sort = "field_sort,title",
    include = "",
    pageLimit = 100,
    timeoutMs,
  } = {}
) => {
  if (!bundle) {
    return null;
  }

  const payload = await drupalFetch(jsonApiPath(entityType, bundle), {
    language,
    timeoutMs,
    query: {
      "page[limit]": pageLimit,
      sort,
      ...(cmsConfig.drupal.filterPublished
        ? { "filter[status][value]": "1" }
        : {}),
      ...(include ? { include } : {}),
      ...query,
    },
  });

  return payload?.data
    ? {
        data: Array.isArray(payload.data) ? payload.data : [payload.data],
        included: payload.included || [],
      }
    : null;
};

export const readDrupalSingleton = async (bundle, options = {}) => {
  const payload = await readDrupalCollection(bundle, {
    ...options,
    pageLimit: 1,
  });
  return payload?.data?.[0]
    ? { item: payload.data[0], included: payload.included || [] }
    : null;
};

export const submitDrupalFeedback = async (record) => {
  if (!cmsConfig.drupal.feedbackPath) {
    return false;
  }

  const result = await drupalFetch(cleanPath(cmsConfig.drupal.feedbackPath), {
    method: "POST",
    body: record,
    anonymous: true,
    allowLanguageFallback: false,
  });

  return Boolean(result?.received || result?.ok || result?.data?.id);
};

export const recordDrupalVisit = async () => {
  if (!cmsConfig.drupal.visitPath) {
    return null;
  }

  const result = await drupalFetch(cleanPath(cmsConfig.drupal.visitPath), {
    method: "POST",
    body: { source: "website" },
    anonymous: true,
    allowLanguageFallback: false,
  });

  const count = Number(result?.count || result?.data?.attributes?.count);
  return Number.isFinite(count) ? count : null;
};

export const readDrupalVisitCount = async () => {
  if (!cmsConfig.drupal.visitCountPath) {
    return null;
  }

  const result = await drupalFetch(cleanPath(cmsConfig.drupal.visitCountPath), {
    anonymous: true,
    allowLanguageFallback: false,
  });

  const count = Number(result?.count || result?.data?.attributes?.count);
  return Number.isFinite(count) ? count : null;
};
