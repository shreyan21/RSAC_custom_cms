import cmsConfig from "./cmsConfig";
import * as defaults from "./defaultData";
import { deepMerge, stripHtml } from "./contentUtils";
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

const normalizeFlexibleContentUrls = (value, key = "") => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFlexibleContentUrls(item, key));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nextKey, nextValue]) => [
        nextKey,
        normalizeFlexibleContentUrls(nextValue, nextKey),
      ])
    );
  }

  if (
    typeof value === "string" &&
    ["image", "src", "file", "document", "poster", "url", "href"].includes(
      key
    ) &&
    /^\/sites\//i.test(value)
  ) {
    return absoluteUrl(value);
  }

  return value;
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

const mediaResource = (resource, map, relationshipNames) => {
  for (const relationshipName of relationshipNames) {
    const media = related(resource, map, relationshipName);
    if (media) {
      return media;
    }
  }
  return null;
};

const mediaFileName = (resource, map, relationshipNames) => {
  const media = mediaResource(resource, map, relationshipNames);
  const file =
    related(media, map, "field_media_file") ||
    related(media, map, "field_media_image") ||
    related(media, map, "thumbnail");

  return (
    file?.attributes?.filename ||
    media?.attributes?.name ||
    media?.attributes?.filename ||
    ""
  );
};

const withAssetVersion = (url, version) => {
  if (!url || !version) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
};

const textWithFallback = (value, fallback) =>
  value === undefined || value === null || value === "" ? fallback : value;

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

const rolesFromTiers = (tiers = {}) => {
  const roles = [];
  const add = (roleKey, groupKey, slot, title, person, sort) => {
    if (!person) {
      return;
    }

    roles.push({
      id: roleKey,
      roleKey,
      groupKey,
      slot,
      title: title || person.post || "",
      name: person.name || "",
      role: person.role || "",
      post: person.post || "",
      photo: person.photo || "",
      sort,
    });
  };

  add(
    "general-body-president",
    "general_body",
    "president",
    tiers.generalBody?.badge,
    tiers.generalBody?.president,
    10
  );
  (tiers.generalBody?.members || []).forEach((person, index) =>
    add(
      `general-body-vice-president-${index + 1}`,
      "general_body",
      "vice_president",
      tiers.generalBody?.badge,
      person,
      20 + index
    )
  );
  add(
    "governing-body-chairman",
    "governing_body",
    "chairman",
    tiers.governingBody?.badge,
    tiers.governingBody?.chairman,
    40
  );
  add(
    "executive-director",
    "executive",
    "director",
    tiers.executive?.badge,
    tiers.executive?.director,
    50
  );
  (tiers.divisions?.items || []).forEach((item, index) =>
    roles.push({
      id: `division-${index + 1}`,
      roleKey: `division-${index + 1}`,
      groupKey: "division",
      slot: "division",
      title: item.title,
      name: item.head || "",
      role: item.designation || "",
      post: item.post || "",
      sort: 100 + index,
    })
  );
  (tiers.support?.items || []).forEach((item, index) =>
    roles.push({
      id: `support-${index + 1}`,
      roleKey: `support-${index + 1}`,
      groupKey: "support",
      slot: "support",
      title: item.title,
      name: item.head || "",
      role: item.designation || item.detail || "",
      post: "",
      sort: 200 + index,
    })
  );

  return roles;
};

const mergeRoles = (fallbackRoles, cmsRoles) => {
  if (!cmsRoles?.length) {
    return fallbackRoles;
  }

  const byKey = new Map(cmsRoles.map((role) => [role.roleKey, role]));
  const merged = fallbackRoles.map((fallbackRole) =>
    deepMerge(fallbackRole, byKey.get(fallbackRole.roleKey) || {})
  );

  cmsRoles.forEach((role) => {
    if (!merged.some((item) => item.roleKey === role.roleKey)) {
      merged.push(role);
    }
  });

  return merged.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
};

const normalizeContactRows = (value) =>
  asArray(value)
    .map((item) =>
      item && typeof item === "object"
        ? {
            role: item.role || "",
            information: item.information || item.info || "",
            name: item.name || "",
            detail: item.detail || item.contact || item.value || "",
          }
        : { role: "", information: "", name: "", detail: String(item || "") }
    )
    .filter((item) => item.role || item.information || item.name || item.detail);

const profileTypeOf = (resource) =>
  String(attr(resource, "field_profile_type", "field_kind") || "")
    .trim()
    .toLowerCase();

const normalizeDrupalProfile = (item, map, profileType) => {
  const html = bodyHtml(item);
  const name = attr(item, "title", "field_name");

  return {
    id: attr(item, "field_key") || item.id,
    profileType,
    name,
    baseName: attr(item, "field_base_name") || name,
    role: attr(item, "field_role", "field_designation"),
    designation: attr(item, "field_designation", "field_role"),
    department: attr(item, "field_department", "field_deployment"),
    deployment: attr(item, "field_deployment", "field_department"),
    employeeId: attr(item, "field_employee_id"),
    duration: attr(item, "field_duration"),
    image: mediaUrl(item, map, ["field_image", "field_photo"]),
    objectPosition: attr(item, "field_object_position") || "center 22%",
    specialization: plain(attr(item, "field_specialization")) || stripHtml(html),
    experience: attr(item, "field_experience"),
    publications: attr(item, "field_publications"),
    contact: attr(item, "field_contact"),
    email: attr(item, "field_email"),
    source: attr(item, "field_source_url"),
    category: attr(item, "field_category"),
    details: asArray(attr(item, "field_details")),
  };
};

export async function getDrupalContactDetails(language = "en") {
  const payload = await readDrupalSingleton(bundles.contact, {
    language,
    sort: "title",
  });
  const item = payload?.item;
  if (!item) {
    return null;
  }

  const contacts = normalizeContactRows(
    attr(item, "field_contacts_json", "field_contact_rows_json")
  );

  return {
    title: textWithFallback(attr(item, "title"), defaults.contactDetails.title),
    address: textWithFallback(
      plain(attr(item, "field_address", "body")),
      defaults.contactDetails.address
    ),
    email: textWithFallback(attr(item, "field_email"), defaults.contactDetails.email),
    phone: textWithFallback(attr(item, "field_phone"), defaults.contactDetails.phone),
    mobile: textWithFallback(
      attr(item, "field_mobile"),
      defaults.contactDetails.mobile
    ),
    contacts: contacts.length ? contacts : defaults.contactDetails.contacts,
  };
}

async function getDrupalProfilesByType(profileType, language = "en") {
  const payload = await readNodes(bundles.profile, language, {
    include: "field_image,field_image.field_media_image,field_image.thumbnail,field_photo,field_photo.field_media_image,field_photo.thumbnail",
    sort: "field_sort,title",
  });
  const profiles = payload?.items
    .filter((item) => profileTypeOf(item) === profileType)
    .map((item) => normalizeDrupalProfile(item, payload.map, profileType));

  return profiles?.length ? profiles : null;
}

export const getDrupalOfficials = (language = "en") =>
  getDrupalProfilesByType("official", language);

export async function getDrupalLeadershipProfiles(language = "en") {
  const profiles = await getDrupalProfilesByType("leadership", language);
  return profiles?.length
    ? profiles.map((profile) => ({
        ...profile,
        category: profile.category || "Leadership",
      }))
    : null;
}

export const getDrupalScientistProfiles = (language = "en") =>
  getDrupalProfilesByType("scientist", language);

export const getDrupalFormerProfiles = (language = "en") =>
  getDrupalProfilesByType("former", language);

export const getDrupalTechnicalProfiles = (language = "en") =>
  getDrupalProfilesByType("technical", language);

export const getDrupalAdministrationProfiles = (language = "en") =>
  getDrupalProfilesByType("administration", language);

export async function getDrupalManpowerGroups(language = "en") {
  const payload = await readNodes(bundles.manpower, language, {
    sort: "field_sort,title",
  });
  const groups = payload?.items.map((item) => ({
    title: attr(item, "title"),
    count: attr(item, "field_count"),
    text: plain(attr(item, "field_text", "field_summary", "body")),
    path: pathValue(attr(item, "field_path")) || "/manpower",
  }));

  return groups?.length ? groups : null;
}

async function getDrupalHomepageSectionCollections(language = "en") {
  const payload = await readNodes(bundles.sectionItem, language, {
    sort: "field_sort,title",
  });
  const items = payload?.items || [];
  const bySection = (sectionKey) =>
    items.filter((item) => attr(item, "field_section_key") === sectionKey);
  const featureTabs = bySection("feature_tab")
    .map((item) => ({
      key: attr(item, "field_key") || item.id,
      title: attr(item, "title"),
      summary: plain(attr(item, "field_summary")),
      details: plain(attr(item, "field_details"))
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
      buttonLabel: attr(item, "field_button_label"),
      buttonPath: pathValue(attr(item, "field_path")) || "/",
      iconKey: attr(item, "field_icon_key") || "building",
    }));
  const mapSimpleCards = (sectionKey) =>
    bySection(sectionKey).map((item) => ({
      id: attr(item, "field_key") || item.id,
      title: attr(item, "title"),
      description: plain(attr(item, "field_summary")),
      category: attr(item, "field_category"),
      icon: attr(item, "field_icon_key") || "layers",
    }));
  const operationalDomains = bySection("operational_domains").map((item) => ({
    id: attr(item, "field_key") || item.id,
    label: attr(item, "title"),
    detail: plain(attr(item, "field_summary")),
    path: pathValue(attr(item, "field_path")) || "/",
    icon: attr(item, "field_icon_key") || "layers",
    tagline: plain(attr(item, "field_tagline")),
    deliverables: plain(attr(item, "field_deliverables"))
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
    stat: {
      value: attr(item, "field_stat_value"),
      label: attr(item, "field_stat_label"),
    },
    linkLabel: attr(item, "field_link_label"),
  }));
  const impactStats = bySection("impact_stats").map((item) => ({
    label: attr(item, "title"),
    value: attr(item, "field_stat_value"),
    detail: plain(attr(item, "field_summary")),
  }));

  return {
    featureTabs,
    services: mapSimpleCards("services"),
    applications: mapSimpleCards("applications"),
    operationalDomains,
    impactStats,
  };
}

export async function getDrupalHeroVideos(language = "en") {
  const payload = await readNodes(bundles.heroVideo, language, {
    include: "field_video,field_video.field_media_file,field_poster,field_poster.field_media_image,field_poster.thumbnail",
    sort: "field_sort,title",
  });
  const videos = payload?.items
    .map((item, index) => {
      const fallbackHero =
        defaults.heroVideos[index] || defaults.heroVideos[0] || {};
      const cmsFileName =
        attr(item, "field_file_name") ||
        mediaFileName(item, payload.map, ["field_video"]) ||
        "";
      const bundledTwin = defaults.heroVideos.find(
        (entry) => entry.fileName && entry.fileName === cmsFileName
      );

      return {
        id: attr(item, "field_key") || item.id,
        title: textWithFallback(attr(item, "title"), fallbackHero.title || ""),
        fileName: cmsFileName || fallbackHero.fileName || "",
        video:
          bundledTwin?.video ||
          mediaUrl(item, payload.map, ["field_video"]) ||
          pathValue(attr(item, "field_url")) ||
          fallbackHero.video ||
          "",
        poster:
          mediaUrl(item, payload.map, ["field_poster", "field_image"]) ||
          pathValue(attr(item, "field_poster_url")) ||
          fallbackHero.poster ||
          "",
      };
    })
    .filter((item) => item.video || item.poster);

  return videos?.length ? videos : null;
}

export async function getDrupalBrandLogos(language = "en") {
  const payload = await readNodes(bundles.brandLogo, language, {
    include: "field_image,field_image.field_media_image,field_image.thumbnail",
    sort: "field_sort,title",
  });
  const logos = payload?.items
    .map((item) => ({
      id: attr(item, "field_key") || item.id,
      title: attr(item, "title"),
      alt: attr(item, "field_alt_text") || attr(item, "title"),
      image: mediaUrl(item, payload.map, ["field_image"]),
      link: pathValue(attr(item, "field_link_url", "field_url")) || "/",
      placement: attr(item, "field_placement") || "supporting",
      sort: Number(attr(item, "field_sort") || 0),
    }))
    .filter((item) => item.image);

  return logos?.length ? logos : null;
}

export async function getDrupalOrganisationRoles(language = "en") {
  const payload = await readNodes(bundles.organisationRole, language, {
    include: "field_photo,field_photo.field_media_image,field_photo.thumbnail",
    sort: "field_sort,title",
  });
  const roles = payload?.items.map((item) => ({
    id: attr(item, "field_role_key", "field_key") || item.id,
    roleKey: attr(item, "field_role_key", "field_key") || item.id,
    groupKey: attr(item, "field_group_key"),
    slot: attr(item, "field_slot"),
    title: attr(item, "title"),
    name: attr(item, "field_name") || attr(item, "title"),
    role: attr(item, "field_role", "field_designation"),
    post: attr(item, "field_post"),
    photo: withAssetVersion(
      mediaUrl(item, payload.map, ["field_photo", "field_image"]),
      attr(item, "changed")
    ),
    objectPosition: attr(item, "field_object_position") || "center 22%",
    sort: Number(attr(item, "field_sort") || 0),
  }));

  return roles?.length ? roles : null;
}

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
      src:
        mediaUrl(item, payload.map, ["field_image", "field_media"]) ||
        pathValue(attr(item, "field_url", "field_source_url")),
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
      url:
        mediaUrl(item, payload.map, ["field_file", "field_document"]) ||
        pathValue(attr(item, "field_url")),
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
  const [payload, logos, roles, homepageCollections] = await Promise.all([
    readDrupalSingleton(bundles.siteSetting, {
      language,
      sort: "title",
    }),
    getDrupalBrandLogos(language),
    getDrupalOrganisationRoles(language),
    getDrupalHomepageSectionCollections(language),
  ]);
  const settingsJson = payload?.item
    ? jsonValue(attr(payload.item, "field_settings_json"), null)
    : null;

  if (!settingsJson || typeof settingsJson !== "object") {
    return null;
  }

  const merged = deepMerge(defaults.siteSettings, settingsJson);
  const fallbackLogos = [
    {
      id: "rsac",
      title: merged.branding.shortName || "RSAC-UP",
      alt: "RSAC-UP logo",
      image: merged.branding.logo,
      link: "/",
      placement: "primary",
      sort: 0,
    },
    {
      id: "up-government",
      title: "Government of Uttar Pradesh",
      alt: "Government of Uttar Pradesh emblem",
      image: merged.branding.governmentLogo,
      link: "/",
      placement: "supporting",
      sort: 1,
    },
  ].filter((logo) => logo.image);
  const activeLogos = logos?.length ? logos : fallbackLogos;
  const primaryLogo = activeLogos.find((logo) => logo.placement === "primary");
  const supportingLogo = activeLogos.find(
    (logo) => logo.placement !== "primary"
  );
  const fallbackRoles = rolesFromTiers(merged.organisationChart?.tiers);

  return localizeSiteSettingsFallback(
    deepMerge(merged, {
      branding: {
        logos: activeLogos,
        logo: primaryLogo?.image || merged.branding.logo,
        governmentLogo:
          supportingLogo?.image || merged.branding.governmentLogo,
      },
      organisationChart: {
        roles: mergeRoles(fallbackRoles, roles),
      },
      homeSections: {
        featureTabs:
          homepageCollections.featureTabs?.length
            ? homepageCollections.featureTabs
            : merged.homeSections?.featureTabs,
      },
      services: {
        items: homepageCollections.services?.length
          ? homepageCollections.services
          : merged.services?.items,
      },
      applications: {
        items: homepageCollections.applications?.length
          ? homepageCollections.applications
          : merged.applications?.items,
      },
      missionPulse: {
        domains: homepageCollections.operationalDomains?.length
          ? homepageCollections.operationalDomains
          : merged.missionPulse?.domains,
      },
      impactStats: homepageCollections.impactStats?.length
        ? homepageCollections.impactStats
        : merged.impactStats,
    }),
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
        sections: normalizeFlexibleContentUrls(
          jsonValue(attr(item, "field_sections_json"), []) || []
        ),
        links: normalizeFlexibleContentUrls(
          jsonValue(attr(item, "field_links_json"), []) || []
        ),
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
