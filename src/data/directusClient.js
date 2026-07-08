import cmsConfig from "./cmsConfig";

const baseHeaders = {
  Accept: "application/json",
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

export const isCmsPreviewMode = () => {
  if (!cmsConfig.previewEnabled || typeof window === "undefined") {
    return false;
  }

  const previewValue = new URLSearchParams(window.location.search).get("preview");

  if (!previewValue) {
    return false;
  }

  if (cmsConfig.previewToken) {
    return previewValue === cmsConfig.previewToken;
  }

  return import.meta.env.DEV && previewValue === "true";
};

const getDirectusToken = () =>
  isCmsPreviewMode() && cmsConfig.previewDirectusToken
    ? cmsConfig.previewDirectusToken
    : cmsConfig.token;

const directusFetch = async (
  path,
  query,
  { method = "GET", body, anonymous = false, timeoutMs } = {}
) => {
  if (
    !cmsConfig.enabled ||
    cmsConfig.provider !== "directus" ||
    !cmsConfig.baseUrl
  ) {
    return null;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    timeoutMs || cmsConfig.requestTimeout
  );

  try {
    const requestHeaders = {
      ...baseHeaders,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(!anonymous && getDirectusToken()
        ? { Authorization: `Bearer ${getDirectusToken()}` }
        : {}),
    };

    const response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.data ?? null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const readDirectusItems = async (
  collection,
  {
    fields = "*",
    filter = {},
    limit = -1,
    sort = ["sort", "title"],
    timeoutMs,
  } = {}
) => {
  if (!collection) {
    return null;
  }

  return directusFetch(
    `/items/${collection}`,
    {
      fields,
      limit,
      sort,
      ...filter,
    },
    { timeoutMs }
  );
};

export const readPublishedItems = (collection, options = {}) =>
  readDirectusItems(collection, {
    ...options,
    filter: isCmsPreviewMode()
      ? options.filter
      : {
          "filter[status][_eq]": cmsConfig.publishedStatus,
          ...options.filter,
        },
  });

export const readDirectusSingleton = async (collection, fields = "*") => {
  const data = await readDirectusItems(collection, {
    fields,
    limit: 1,
    sort: [],
  });

  return Array.isArray(data) ? data[0] || null : data;
};

export const readDirectusCount = async (collection) => {
  if (!collection) {
    return null;
  }

  const data = await directusFetch(`/items/${collection}`, {
    "aggregate[count]": "id",
  });
  const rawCount = data?.[0]?.count?.id ?? data?.[0]?.count;
  const count = Number(rawCount);

  return Number.isFinite(count) ? count : null;
};

// Stores a feedback-form submission through the bundled /rsac-feedback
// endpoint extension (validated server side; no anonymous collection access).
// Returns null when the CMS is unreachable — the form falls back to mailto.
export const submitDirectusFeedback = async (record) => {
  const result = await directusFetch(
    "/rsac-feedback",
    {},
    {
      method: "POST",
      body: record,
      anonymous: true,
    }
  );

  return Boolean(result?.received);
};

export const recordDirectusVisit = async () => {
  const result = await directusFetch(
    "/rsac-visit-counter",
    {},
    {
      method: "POST",
      body: { source: "website" },
      anonymous: true,
    }
  );
  const count = Number(result?.count);

  return Number.isFinite(count) ? count : null;
};
