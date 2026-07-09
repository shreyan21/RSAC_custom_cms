import cmsConfig from "./cmsConfig";
import * as defaults from "./defaultData";
import { deepMerge, stripHtml } from "./directusAdapter";
import {
  localizeBasicItems,
  localizeFloodSection,
  localizeMenuItems,
  localizePublicInfoFallback,
  localizeSiteSettingsFallback,
  mergeHindiFallback,
} from "./hindiContent";
import { policyPagesHindi } from "./policies.hi.generated";
import { readDrupalCollection, readDrupalSingleton } from "./drupalClient";

export const isDrupalCms = () =>
  cmsConfig.enabled && cmsConfig.provider === "drupal";

const bundles = cmsConfig.drupal.bundles;

const includedMap = (included = []) =>
  new Map(included.map((item) => [`${item.type}:${item.id}`, item]));

const attr = (resource, ...names) => {
  const attributes = resource?.attributes || {};
  for (const name of names) {
    const value = attributes[name];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
};

const plain = (value) => {
  if (value && typeof value === "object") {
    return value.processed || value.value || value.url || "";
  }
  return value || "";
};

const pathValue = (value) => {
  if (value && typeof value === "object") {
    return value.alias || value.uri || value.url || value.value || "";
  }
  return value || "";
};

const jsonValue = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const asArray = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  const parsed = jsonValue(value);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const absoluteUrl = (value) => {
  if (!value) {
    return "";
  }
  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${cmsConfig.baseUrl}${value}`;
  }
  return value;
};

const related = (resource, map, relationshipName) => {
  const relation = resource?.relationships?.[relationshipName]?.data;
  const item = Array.isArray(relation) ? relation[0] : relation;
  return item ? map.get(`${item.type}:${item.id}`) : null;
};

const fileUrlFromResource = (resource, map) => {
  if (!resource) {
    return "";
  }

  const direct = absoluteUrl(
    resource.attributes?.uri?.url ||
      resource.attributes?.field_media_file?.uri?.url ||
      resource.attributes?.field_media_image?.uri?.url ||
      resource.attributes?.url ||
      ""
  );

  if (direct) {
    return direct;
  }

  const file =
    related(resource, map, "field_media_file") ||
    related(resource, map, "field_media_image") ||
    related(resource, map, "thumbnail");

  return absoluteUrl(file?.attributes?.uri?.url || "");
};

const mediaUrl = (resource, map, relationshipNames) => {
  for (const relationshipName of relationshipNames) {
    const media = related(resource, map, relationshipName);
    const url = fileUrlFromResource(media, map);
    if (url) {
      return url;
    }
  }
  return "";
};

const bodyHtml = (resource) =>
  plain(
    attr(
      resource,
      "body",
      "field_body",
      "field_html",
      "field_content",
      "field_description"
    )
  );

const slugOf = (resource) =>
  String(
    pathValue(attr(resource, "field_slug", "path", "field_path")) ||
      attr(resource, "drupal_internal__nid") ||
      resource?.id ||
      ""
  )
    .replace(/^\/+/, "")
    .split("/")
    .pop();

const kindOf = (resource) =>
  String(attr(resource, "field_kind", "field_type", "field_category") || "")
    .trim()
    .toLowerCase();

const publishedOnly = (items = []) =>
  items.filter((item) => item?.attributes?.status !== false);

const readNodes = async (bundle, language, options = {}) => {
  const payload = await readDrupalCollection(bundle, {
    language,
    include: options.include || "",
    sort: options.sort || "field_sort,title",
    timeoutMs: options.timeoutMs,
  });

  if (!payload?.data?.length) {
    return null;
  }

  return {
    items: publishedOnly(payload.data),
    map: includedMap(payload.included),
  };
};

export async function getDrupalDivisions(language = "en") {
  const payload = await readNodes(bundles.division, language);
  if (!payload?.items.length) {
    return null;
  }

  const divisions = payload.items.map((item) => ({
    id: slugOf(item),
    title: attr(item, "title"),
    lead: plain(attr(item, "field_lead", "field_summary", "body")),
    source: attr(item, "field_source_url", "field_source"),
    highlights: asArray(attr(item, "field_highlights")),
  }));

  return localizeBasicItems("divisions", divisions, language);
}

export async function getDrupalFacilities(language = "en") {
  const payload = await readNodes(bundles.page, language);
  const facilities = payload?.items
    .filter((item) => attr(item, "field_section_key") === "facilities")
    .map((item) => ({
      title: attr(item, "title"),
      text: plain(attr(item, "field_summary", "body")) || stripHtml(bodyHtml(item)),
    }));

  return facilities?.length
    ? localizeBasicItems("facilities", facilities, language)
    : null;
}

export async function getDrupalQuickLinks(language = "en") {
  const payload = await readNodes(bundles.sectionItem, language);
  const items = payload?.items
    .filter((item) => attr(item, "field_section_key") === "quick_links")
    .map((item) => ({
      key: attr(item, "field_key") || item.id,
      title: attr(item, "title"),
      description: plain(attr(item, "field_summary", "body")),
      path: pathValue(attr(item, "field_path", "field_url")) || "/",
      iconKey: attr(item, "field_icon_key") || "document",
      accent: attr(item, "field_accent") || "#0b6fa4",
    }));

  return items?.length ? items : null;
}

export async function getDrupalGeoportals(language = "en") {
  const payload = await readNodes(bundles.sectionItem, language);
  const items = payload?.items
    .filter((item) => attr(item, "field_section_key") === "geoportals")
    .map((item) => ({
      title: attr(item, "title"),
      description: plain(attr(item, "field_summary", "body")),
      url: pathValue(attr(item, "field_url", "field_path")),
      icon: undefined,
      accent: attr(item, "field_accent") || "bg-[#0b6fa4]",
    }));

  return items?.length ? items : null;
}

export async function getDrupalMobileApps(language = "en") {
  const payload = await readNodes(bundles.download, language, {
    include: "field_file,field_file.field_media_file",
  });
  const items = payload?.items
    .filter((item) => ["mobile_app", "app"].includes(kindOf(item)))
    .map((item) => {
      const url =
        mediaUrl(item, payload.map, ["field_file", "field_document"]) ||
        attr(item, "field_url");
      return {
        key: attr(item, "field_key") || item.id,
        title: attr(item, "title"),
        description: plain(attr(item, "field_summary", "body")),
        url,
        sourceUrl: pathValue(attr(item, "field_url")) || url,
        isLocalFile: Boolean(mediaUrl(item, payload.map, ["field_file", "field_document"])),
      };
    });

  return items?.length ? items : null;
}

export async function getDrupalGalleryItems(language = "en") {
  const payload = await readNodes(bundles.galleryItem, language, {
    include: "field_image,field_image.field_media_image,field_image.thumbnail",
    sort: "field_sort,-created,title",
  });
  const items = payload?.items
    .map((item) => ({
      id: attr(item, "field_key") || item.id,
      src: mediaUrl(item, payload.map, ["field_image", "field_media"]),
      caption: attr(item, "title", "field_caption"),
      alt: attr(item, "field_alt_text") || attr(item, "title"),
    }))
    .filter((item) => item.src);

  return items?.length ? items : null;
}

export async function getDrupalFloodData(language = "en") {
  const payload = await readNodes(bundles.download, language, {
    include: "field_file,field_file.field_media_file,field_document,field_document.field_media_file",
    sort: "field_sort,-field_date,-created,title",
  });

  const reports = payload?.items
    .filter((item) => kindOf(item) === "flood_report")
    .map((item) => ({
      id: item.id,
      title: attr(item, "title"),
      date: attr(item, "field_date"),
      dateLabel: attr(item, "field_date_label", "field_date"),
      category: attr(item, "field_category") || "Daily Report",
      coverage: attr(item, "field_coverage") || "State-wide",
      meta: attr(item, "field_meta"),
      url: mediaUrl(item, payload.map, ["field_file", "field_document"]),
    }));

  return reports?.length
    ? {
        floodSection: localizeFloodSection(defaults.floodSection, language),
        floodReports: reports,
      }
    : null;
}

const divisionFromRelationship = (item, map) => {
  const division = related(item, map, "field_division");
  if (!division) {
    return null;
  }

  return {
    id: division.id,
    slug: slugOf(division),
    title: attr(division, "title"),
  };
};

export async function getDrupalProjects(language = "en") {
  const payload = await readNodes(bundles.project, language, {
    include: "field_division,field_document,field_document.field_media_file",
    sort: "field_sort,-field_year,-created,title",
  });

  const projects = payload?.items.map((item) => {
    const projectType = attr(item, "field_project_type", "field_kind") || "project";
    return {
      id: item.id,
      title: attr(item, "title"),
      type: projectType,
      category: attr(item, "field_category") || projectType,
      year: attr(item, "field_year", "field_date"),
      client: attr(item, "field_client"),
      summary: plain(attr(item, "field_summary")) || stripHtml(bodyHtml(item)),
      html: bodyHtml(item),
      division: divisionFromRelationship(item, payload.map),
      url:
        mediaUrl(item, payload.map, ["field_document", "field_file"]) ||
        pathValue(attr(item, "field_url", "field_source_url")),
      sort: Number(attr(item, "field_sort") || 0),
    };
  });

  return projects?.length ? projects : null;
}

export async function getDrupalPublications(language = "en") {
  const payload = await readNodes(bundles.publication, language, {
    include: "field_division,field_document,field_document.field_media_file",
    sort: "field_sort,-field_year,-created,title",
  });

  const publications = payload?.items.map((item) => {
    const publicationType =
      attr(item, "field_publication_type", "field_kind") || "publication";
    return {
      id: item.id,
      title: attr(item, "title"),
      type: publicationType,
      category: attr(item, "field_category") || publicationType,
      year: attr(item, "field_year", "field_date"),
      authors: plain(attr(item, "field_authors")),
      citation: plain(attr(item, "field_citation")),
      summary: plain(attr(item, "field_summary")) || stripHtml(bodyHtml(item)),
      html: bodyHtml(item),
      division: divisionFromRelationship(item, payload.map),
      url:
        mediaUrl(item, payload.map, ["field_document", "field_file"]) ||
        pathValue(attr(item, "field_url", "field_source_url")),
      sort: Number(attr(item, "field_sort") || 0),
    };
  });

  return publications?.length ? publications : null;
}

export async function getDrupalDownloads(language = "en") {
  const payload = await readNodes(bundles.download, language, {
    include: "field_file,field_file.field_media_file,field_document,field_document.field_media_file",
    sort: "field_sort,-field_date,-created,title",
  });

  const downloads = payload?.items.map((item) => ({
    id: item.id,
    title: attr(item, "title"),
    kind: kindOf(item) || "download",
    category: attr(item, "field_category"),
    date: attr(item, "field_date"),
    dateLabel: attr(item, "field_date_label", "field_date"),
    coverage: attr(item, "field_coverage"),
    meta: attr(item, "field_meta"),
    summary: plain(attr(item, "field_summary")),
    url:
      mediaUrl(item, payload.map, ["field_file", "field_document"]) ||
      pathValue(attr(item, "field_url")),
    sort: Number(attr(item, "field_sort") || 0),
  }));

  return downloads?.length ? downloads : null;
}

export async function getDrupalNotices(language = "en") {
  const payload = await readNodes(bundles.noticeTenderFaq, language, {
    include: "field_file,field_file.field_media_file,field_document,field_document.field_media_file",
    sort: "field_sort,-field_date,-created,title",
  });

  const notices = payload?.items
    .filter((item) => kindOf(item) !== "faq")
    .map((item) => ({
      id: item.id,
      title: attr(item, "title"),
      category: attr(item, "field_category", "field_kind") || "General",
      meta: attr(item, "field_meta"),
      lastDate: attr(item, "field_last_date"),
      url: mediaUrl(item, payload.map, ["field_file", "field_document"]),
    }));

  return notices?.length ? notices : null;
}

export async function getDrupalPolicies(language = "en") {
  const payload = await readNodes(bundles.page, language);
  const policies = payload?.items
    .filter((item) => attr(item, "field_section_key") === "policies")
    .map((item) => ({
      slug: slugOf(item),
      title: attr(item, "title"),
      summary: plain(attr(item, "field_summary")),
      source: attr(item, "field_source_url"),
      sections: jsonValue(attr(item, "field_sections_json"), null) || [
        { heading: attr(item, "title"), body: bodyHtml(item) },
      ],
    }));

  if (!policies?.length) {
    return null;
  }

  if (language !== "hi") {
    return policies;
  }

  const bySlug = new Map(policyPagesHindi.map((item) => [item.slug, item]));
  return policies.map((policy) =>
    bySlug.has(policy.slug)
      ? mergeHindiFallback(policy, bySlug.get(policy.slug))
      : policy
  );
}

export async function getDrupalPublicInfoPages(language = "en") {
  const payload = await readNodes(bundles.page, language);
  const pages = payload?.items
    .filter((item) => attr(item, "field_section_key") === "public_info")
    .map((item) => ({
      slug: slugOf(item),
      title: attr(item, "title"),
      summary: plain(attr(item, "field_summary")),
      eyebrow: attr(item, "field_eyebrow") || "Public Services",
      source: attr(item, "field_source_url"),
      sections: jsonValue(attr(item, "field_sections_json"), []) || [],
      links: jsonValue(attr(item, "field_links_json"), []) || [],
    }));

  return pages?.length ? localizePublicInfoFallback(pages, language) : null;
}

export async function getDrupalMenuItems(language = "en") {
  const payload = await readNodes(bundles.menuItem, language, {
    sort: "field_sort,title",
  });
  const menu = payload?.items.map((item) => ({
    title: attr(item, "title"),
    description: plain(attr(item, "field_summary", "field_description")),
    path: pathValue(attr(item, "field_path")) || "/",
    links: jsonValue(attr(item, "field_links_json"), []) || [],
  }));

  return menu?.length ? localizeMenuItems(menu, language) : null;
}

export async function getDrupalSiteSettings(language = "en") {
  const payload = await readDrupalSingleton(bundles.siteSetting, {
    language,
    sort: "title",
  });
  const settingsJson = payload?.item
    ? jsonValue(attr(payload.item, "field_settings_json"), null)
    : null;

  if (!settingsJson || typeof settingsJson !== "object") {
    return null;
  }

  return localizeSiteSettingsFallback(
    deepMerge(defaults.siteSettings, settingsJson),
    language
  );
}

export async function getDrupalRsacOfficialSections(language = "en") {
  const [sectionPayload, pagePayload] = await Promise.all([
    readNodes(bundles.pageSection, language, { sort: "field_sort,title" }),
    readNodes(bundles.page, language, {
      include: "field_featured_image,field_featured_image.field_media_image,field_featured_image.thumbnail",
      sort: "field_section_key,field_sort,title",
      timeoutMs: 60000,
    }),
  ]);

  if (!pagePayload?.items.length) {
    return null;
  }

  const sectionsByKey = new Map();
  sectionPayload?.items.forEach((item) => {
    const key = attr(item, "field_key", "field_section_key") || slugOf(item);
    sectionsByKey.set(key, {
      key,
      route: attr(item, "field_route") || key,
      title: attr(item, "title"),
      eyebrow: attr(item, "field_eyebrow"),
      intro: plain(attr(item, "field_intro", "field_summary", "body")),
      sort: Number(attr(item, "field_sort") || 0),
      pages: [],
    });
  });

  pagePayload.items
    .filter((item) => !["public_info", "policies"].includes(attr(item, "field_section_key")))
    .forEach((item) => {
      const sectionKey = attr(item, "field_section_key") || "about-us";
      if (!sectionsByKey.has(sectionKey)) {
        sectionsByKey.set(sectionKey, {
          key: sectionKey,
          route: sectionKey,
          title: sectionKey,
          eyebrow: "",
          intro: "",
          sort: 0,
          pages: [],
        });
      }

      const html = bodyHtml(item);
      sectionsByKey.get(sectionKey).pages.push({
        cmsId: item.id,
        sectionKey,
        title: attr(item, "title"),
        slug: slugOf(item),
        summary: plain(attr(item, "field_summary")) || stripHtml(html).slice(0, 360),
        sourceUrl: attr(item, "field_source_url"),
        preview: plain(attr(item, "field_preview")) || stripHtml(html).slice(0, 360),
        html,
        featuredImage: mediaUrl(item, pagePayload.map, ["field_featured_image"]),
        sort: Number(attr(item, "field_sort") || 0),
        cardIcon: attr(item, "field_card_icon"),
        cardAccent: attr(item, "field_card_color"),
        cardAccent2: attr(item, "field_card_color_2"),
      });
    });

  const sections = Array.from(sectionsByKey.values())
    .filter((section) => section.pages.length)
    .sort((a, b) => a.sort - b.sort)
    .map((section) => ({
      ...section,
      pages: section.pages.sort((a, b) => a.sort - b.sort),
    }));

  return sections.length ? sections : null;
}
