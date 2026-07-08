import {
  Database,
  Globe2,
  GraduationCap,
  Map as MapIcon,
  Network,
  RadioTower,
} from "lucide-react";
import cmsConfig from "./cmsConfig";
import * as defaults from "./defaultData";
import {
  applyOfficialHindi,
  asArray,
  backfillOfficialImages,
  deepMerge,
  directusAssetUrl,
  directusImageUrl,
  localizeDirectusItem,
  normalizeDirectusContentPage,
  normalizeDirectusPolicySections,
  normalizeDirectusProfile,
  rewriteOfficialMedia,
  stripHtml,
} from "./directusAdapter";
import {
  localizeBasicItems,
  localizeFloodSection,
  localizeMenuItems,
  localizePublicInfoFallback,
  localizeSiteSettingsFallback,
  mergeHindiFallback,
} from "./hindiContent";
import {
  readDirectusSingleton,
  readPublishedItems,
} from "./directusClient";
import { policyPagesHindi } from "./policies.hi.generated";

const collections = cmsConfig.collections;
const iconMap = {
  network: Network,
  education: GraduationCap,
  globe: Globe2,
  database: Database,
  radio: RadioTower,
  map: MapIcon,
};
const iconChoices = Object.values(iconMap);

const isMissing = (value) => value === undefined || value === null;

const withFallback = (value, fallback) =>
  isMissing(value) ? fallback : value;

const textWithFallback = (value, fallback) =>
  isMissing(value) ? fallback : value;

const withAssetVersion = (url, version) => {
  if (!url || !version) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
};

const parseContentBlockValue = (value, valueType) => {
  if (valueType === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }

  if (valueType === "boolean") {
    return String(value).toLowerCase() === "true";
  }

  return value;
};

const setContentPath = (target, path, value) => {
  const parts = String(path).split(".").filter(Boolean);
  let cursor = target;

  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    const key = /^\d+$/.test(part) ? Number(part) : part;

    if (isLast) {
      cursor[key] = value;
      return;
    }

    const nextIsArrayIndex = /^\d+$/.test(parts[index + 1]);
    if (cursor[key] === undefined || cursor[key] === null) {
      cursor[key] = nextIsArrayIndex ? [] : {};
    }
    cursor = cursor[key];
  });
};

const applyContentBlocks = (settings, items, language) => {
  if (!items?.length) {
    return settings;
  }

  items.forEach((rawItem) => {
    const item = localizeDirectusItem(rawItem, language);
    if (!item?.key) return;

    const isEmpty =
      item.value === undefined ||
      item.value === null ||
      item.value === "";

    // A content-block row that EXISTS but was cleared is a deliberate "hide this
    // text" by the editor, so honour it as empty instead of letting the built-in
    // default text return. Numbers/booleans/urls keep the old skip-on-empty so a
    // blanked number never becomes 0 and a blanked link never yields a broken href.
    if (isEmpty) {
      const type = item.value_type;
      if (type === "number" || type === "boolean" || type === "url") return;
      setContentPath(settings, item.key, "");
      return;
    }

    setContentPath(
      settings,
      item.key,
      parseContentBlockValue(item.value, item.value_type)
    );
  });
  return settings;
};

const rolesFromTiers = (tiers = {}) => {
  const roles = [];
  const add = (roleKey, groupKey, slot, title, person, sort) => {
    if (!person) return;
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

const getSettings = (language = "en") =>
  readDirectusSingleton(
    collections.settings,
    "*,organisation_chart_file.id,organisation_chart_file.modified_on" +
      ",prime_minister_photo.id,prime_minister_photo.modified_on" +
      ",chief_minister_photo.id,chief_minister_photo.modified_on"
  ).then((settings) => localizeDirectusItem(settings, language));

const normalizeHomeFeatureTab = (rawItem, index) => {
  const item = rawItem || {};
  const key = String(item.key || item.title || `feature-${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    key: key || `feature-${index + 1}`,
    title: item.title || `Feature ${index + 1}`,
    summary: item.summary || "",
    details: String(item.details || "").trim(),
    icon: item.icon_key || item.icon || "building",
    buttonLabel: item.button_label || "",
    buttonPath: item.button_path || item.url || "",
  };
};

const makeStableKey = (item, index, prefix) =>
  String(item.key || item.id || item.title || `${prefix}-${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `${prefix}-${index + 1}`;

const getHomepageRowSection = (item = {}) => {
  const key = String(item.section_key || item.key || "").toLowerCase();

  if (key === "impact_stat" || key.startsWith("impact-stat-")) {
    return "impact_stat";
  }

  if (
    key === "operational_domain" ||
    key.startsWith("operational-domain-")
  ) {
    return "operational_domain";
  }

  if (key === "location_card" || key === "location-card") {
    return "location_card";
  }

  return "feature_tab";
};

const linesFromText = (value) =>
  asArray(value)
    .map((item) => String(item).trim())
    .filter(Boolean);

const normalizeImpactStatItem = (item, index) => ({
  id: makeStableKey(item, index, "stat"),
  value: textWithFallback(item.summary, item.value || ""),
  label: textWithFallback(item.title, item.label || ""),
  detail: textWithFallback(item.details, item.detail || ""),
});

const normalizeOperationalDomainItem = (item, index) => ({
  id: makeStableKey(item, index, "domain"),
  label: textWithFallback(item.title, item.label || ""),
  detail: textWithFallback(item.summary, item.detail || ""),
  icon: item.icon_key || item.icon || "database",
  tagline: textWithFallback(item.tagline, ""),
  deliverables: linesFromText(item.deliverables || item.details),
  stat:
    item.stat_value || item.stat_label
      ? {
          value: textWithFallback(item.stat_value, ""),
          label: textWithFallback(item.stat_label, ""),
        }
      : null,
  path: textWithFallback(item.button_path, item.path || ""),
  linkLabel: textWithFallback(item.link_label, item.button_label || ""),
});

const normalizeLocationCardItem = (item = {}, fallbackLocation = {}) => ({
  cardEyebrow: textWithFallback(item.eyebrow, fallbackLocation.cardEyebrow || ""),
  locality: textWithFallback(item.title, ""),
  address: textWithFallback(item.summary, item.description || ""),
  mapQuery: textWithFallback(item.map_query, item.details || ""),
  directionsLabel: textWithFallback(item.link_label, item.button_label || ""),
});

const hasVisibleImpactStat = (item) =>
  Boolean(item.value || item.label || item.detail);

const hasVisibleOperationalDomain = (item) =>
  Boolean(
    item.label ||
      item.detail ||
      item.tagline ||
      item.deliverables?.length ||
      item.stat?.value ||
      item.stat?.label ||
      item.path ||
      item.linkLabel
  );

const applyHomeSectionItems = (settings, rawItems, language) => {
  if (!Array.isArray(rawItems)) {
    return settings;
  }

  const items = rawItems
    .map((rawItem) => localizeDirectusItem(rawItem, language))
    .map((item) => ({
      ...item,
      section_key: getHomepageRowSection(item),
    }))
    .filter((item) => item.section_key !== "feature_tab");

  if (!items.length) {
    return settings;
  }

  const bySection = (sectionKey) =>
    items.filter((item) => item.section_key === sectionKey);

  const impactStats = bySection("impact_stat")
    .map(normalizeImpactStatItem)
    .filter(hasVisibleImpactStat);
  const operationalDomains = bySection("operational_domain")
    .map(normalizeOperationalDomainItem)
    .filter(hasVisibleOperationalDomain);
  const locationCard = bySection("location_card")[0] || null;

  return {
    ...settings,
    impactStats,
    missionPulse: {
      ...(settings.missionPulse || {}),
      domains: operationalDomains,
    },
    location: {
      ...(settings.location || {}),
      ...(locationCard
        ? normalizeLocationCardItem(locationCard, settings.location || {})
        : {
            cardEyebrow: "",
            locality: "",
            address: "",
            mapQuery: "",
            directionsLabel: "",
          }),
    },
  };
};

export async function getSiteSettings(language = "en") {
  const [
    settings,
    contentBlockItems,
    logoItems,
    homeFeatureTabItems,
    homeSectionItemItems,
    organisationRoleItems,
  ] =
    await Promise.all([
      getSettings(language),
      readPublishedItems(collections.contentBlocks, { sort: ["sort"] }),
      readPublishedItems(collections.brandLogos, { sort: ["sort"] }),
      readPublishedItems(collections.homeFeatureTabs, {
        sort: ["sort", "title"],
      }),
      readPublishedItems(collections.homeSectionItems, {
        sort: ["section_key", "sort", "title"],
      }),
      readPublishedItems(collections.organisationRoles, {
        fields: "*,photo.id,photo.modified_on",
        sort: ["sort"],
      }),
    ]);

  const merged = applyContentBlocks(
    deepMerge(defaults.siteSettings, settings
      ? {
          appearance: settings.appearance,
          layout: settings.layout,
          branding: settings.branding,
          hero: settings.hero,
          missionPulse: settings.mission_pulse,
          homeSections: settings.home_sections,
          about: settings.about,
          location: settings.location,
          footer: settings.footer,
          organisationChart: settings.organisation_chart,
          accessibility: settings.accessibility,
          pageContent: settings.page_content,
          impactStats: settings.impact_stats,
          services: settings.services,
          applications: settings.applications,
          search: settings.search,
          ui: settings.ui,
          cards: settings.cards,
        }
      : {}),
    contentBlockItems,
    language
  );

  const cmsFeatureTabs = (homeFeatureTabItems || [])
    .map((rawItem) => localizeDirectusItem(rawItem, language))
    .filter((item) => getHomepageRowSection(item) === "feature_tab")
    .map(normalizeHomeFeatureTab)
    .filter((item) => item.title);
  if (cmsFeatureTabs.length) {
    merged.homeSections = {
      ...(merged.homeSections || {}),
      featureTabs: cmsFeatureTabs,
    };
  }

  const sectionItemSettings = applyHomeSectionItems(
    merged,
    homeSectionItemItems,
    language
  );
  Object.assign(merged, sectionItemSettings);

  const cmsLogos = (logoItems || [])
    .map((rawItem) => localizeDirectusItem(rawItem, language))
    .map((item) => ({
      id: item.id,
      title: item.title || "",
      alt: item.alt_text || item.title || "",
      image: directusImageUrl(item.image, {
        width: 320,
        quality: 88,
        fit: "contain",
      }),
      link: item.link_url || "/",
      placement: item.placement || "supporting",
      sort: Number(item.sort || 0),
    }))
    .filter((item) => item.image);
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
  ];
  const logos = cmsLogos.length ? cmsLogos : fallbackLogos;
  const primaryLogo = logos.find((logo) => logo.placement === "primary");
  const supportingLogo = logos.find((logo) => logo.placement !== "primary");

  const cmsRoles = (organisationRoleItems || []).map((rawItem) => {
    const item = localizeDirectusItem(rawItem, language);
    return {
      id: item.id,
      roleKey: item.role_key,
      groupKey: item.group_key,
      slot: item.slot,
      title: item.title || "",
      name: item.name || "",
      role: item.role || "",
      post: item.post || "",
      photo: withAssetVersion(
        directusImageUrl(item.photo, { width: 480, quality: 88 }),
        item.photo?.modified_on
      ),
      objectPosition: item.object_position || "center 22%",
      sort: Number(item.sort || 0),
    };
  });
  const fallbackRoles = rolesFromTiers(merged.organisationChart.tiers);
  const cmsRolesByKey = new Map(cmsRoles.map((role) => [role.roleKey, role]));
  const organisationRoles = fallbackRoles.map((fallbackRole) =>
    deepMerge(fallbackRole, cmsRolesByKey.get(fallbackRole.roleKey) || {})
  );
  cmsRoles.forEach((role) => {
    if (!organisationRoles.some((item) => item.roleKey === role.roleKey)) {
      organisationRoles.push(role);
    }
  });

  const hydrated = deepMerge(merged, {
    branding: {
      logos,
      logo:
        primaryLogo?.image || directusImageUrl(settings?.brand_logo, {
          width: 256,
          quality: 88,
          fit: "contain",
        }) || merged.branding.logo,
      governmentLogo:
        supportingLogo?.image || directusImageUrl(settings?.government_logo, {
          width: 256,
          quality: 88,
          fit: "contain",
        }) ||
        merged.branding.governmentLogo,
    },
    hero: {
      leaders: merged.hero.leaders.map((leader, index) => {
        const photo =
          index === 0
            ? settings?.prime_minister_photo
            : settings?.chief_minister_photo;

        return {
          ...leader,
          // Cache-bust by the file's own modified_on so a Directus "Replace
          // File" (same UUID, same URL) still refreshes on the website instead
          // of serving the browser/Directus cached transform.
          image:
            withAssetVersion(
              directusImageUrl(photo, { width: 640, quality: 82 }),
              photo?.modified_on || settings?.date_updated
            ) || leader.image,
        };
      }),
    },
    organisationChart: {
      roles: organisationRoles,
      image:
        withAssetVersion(
          directusImageUrl(settings?.organisation_chart_file, {
            width: 1800,
            quality: 82,
            fit: "contain",
          }),
          settings?.organisation_chart_file?.modified_on ||
            settings?.date_updated
        ) ||
        merged.organisationChart.image,
    },
    footer: {
      reviewDate:
        String(settings?.date_updated || "").slice(0, 10) ||
        merged.footer.reviewDate,
    },
  });

  return localizeSiteSettingsFallback(hydrated, language);
}

const getProfilesByType = async (profileType, fallback, language = "en") => {
  const items = await readPublishedItems(collections.profiles, {
    filter: {
      "filter[profile_type][_eq]": profileType,
    },
    sort: ["sort", "name"],
  });

  const profiles = items
    ?.map((rawItem) => ({
      ...normalizeDirectusProfile(localizeDirectusItem(rawItem, language)),
      // Language-independent identity: in Hindi mode localization replaces
      // `name` with name_hi, but the scraped page rosters keep English names
      // even on the Hindi pages — so keep the raw English CMS name too for
      // cross-language matching.
      baseName: rawItem.name || rawItem.title || "",
    }))
    .filter((profile) => profile.profileType === profileType);

  return withFallback(profiles, fallback);
};

export async function getDivisions(language = "en") {
  const items = await readPublishedItems(collections.divisions);

  const divisions = withFallback(
    items?.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);

      return {
      id: item.slug || item.id,
      title: item.title || "",
      lead:
        item.lead ||
        item.summary ||
        item.description ||
        stripHtml(item.content || ""),
      source: item.source_url || item.source || "",
      highlights: asArray(item.highlights),
      };
    }),
    defaults.divisions
  );

  return localizeBasicItems("divisions", divisions, language);
}

export async function getFacilities(language = "en") {
  const items = await readPublishedItems(collections.facilities);

  const facilities = withFallback(
    items?.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);

      return {
      title: item.title || "",
      text:
        item.text ||
        item.summary ||
        item.description ||
        stripHtml(item.content || ""),
      };
    }),
    defaults.facilities
  );

  return localizeBasicItems("facilities", facilities, language);
}

export async function getQuickLinks(language = "en") {
  const items = await readPublishedItems(collections.quickLinks, {
    sort: ["sort", "title"],
  });

  return withFallback(
    items?.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);
      return {
        key: item.key || String(item.id),
        title: item.title || "",
        description: item.description || "",
        path: item.path || "/",
        iconKey: item.icon_key || "document",
        accent: item.accent || "#0b6fa4",
      };
    }),
    defaults.quickLinks
  );
}

export async function getMobileApps(language = "en") {
  const items = await readPublishedItems(collections.mobileApps, {
    sort: ["sort", "title"],
  });

  return withFallback(
    items?.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);
      return {
        key: item.key || String(item.id),
        title: item.title || "",
        description: item.description || "",
        url: rewriteOfficialMedia(
          directusAssetUrl(item.download) || item.url || ""
        ),
        sourceUrl: item.url || "",
        isLocalFile: Boolean(item.download),
      };
    }),
    defaults.mobileApps.map((item) => ({
      ...item,
      title: language === "hi" ? item.titleHi || item.title : item.title,
      description:
        language === "hi"
          ? item.descriptionHi || item.description
          : item.description,
      sourceUrl: item.url,
      url: rewriteOfficialMedia(item.url),
      isLocalFile: false,
    }))
  );
}

export async function getGalleryItems(language = "en") {
  const items = await readPublishedItems(collections.gallery, {
    sort: ["sort", "-date_created", "title"],
  });

  return withFallback(
    items
      ?.map((rawItem) => {
        const item = localizeDirectusItem(rawItem, language);
        return {
          id: item.key || item.id,
          src: directusImageUrl(item.image, {
            width: 1600,
            quality: 82,
            fit: "cover",
          }),
          caption: item.title || "",
          alt: item.alt_text || item.title || "",
        };
      })
      .filter((item) => item.src),
    defaults.galleryImages.map((item) => ({
      ...item,
      caption:
        language === "hi" ? item.captionHi || item.caption : item.caption,
      alt:
        language === "hi"
          ? item.altHi || item.captionHi || item.caption
          : item.alt || item.caption,
    }))
  );
}

export async function getContactDetails(language = "en") {
  const directContact = localizeDirectusItem(
    await readDirectusSingleton(collections.contact),
    language
  );
  const settings = directContact ? null : await getSettings(language);
  const data = directContact || settings?.contact;

  if (!data) {
    return defaults.contactDetails;
  }

  return {
    title: textWithFallback(data.title, defaults.contactDetails.title),
    address: textWithFallback(data.address, defaults.contactDetails.address),
    email: textWithFallback(data.email, defaults.contactDetails.email),
    phone: textWithFallback(data.phone, defaults.contactDetails.phone),
    mobile: textWithFallback(data.mobile, defaults.contactDetails.mobile),
    contacts: isMissing(data.contacts)
      ? defaults.contactDetails.contacts
      : asArray(data.contacts),
  };
}

export const getOfficials = (language = "en") =>
  getProfilesByType("official", defaults.officials, language);

export async function getLeadershipProfiles(language = "en") {
  const profiles = await getProfilesByType(
    "leadership",
    defaults.leadershipProfiles,
    language
  );

  return profiles.map((profile) => ({
    ...profile,
    category: profile.category || "Leadership",
  }));
}

export const getScientistProfiles = (language = "en") =>
  getProfilesByType("scientist", defaults.scientistProfiles, language);

export const getFormerProfiles = (language = "en") =>
  getProfilesByType("former", defaults.formerProfiles, language);

export const getTechnicalProfiles = (language = "en") =>
  getProfilesByType("technical", defaults.technicalProfiles, language);

export const getAdministrationProfiles = (language = "en") =>
  getProfilesByType("administration", defaults.administrationProfiles, language);

export async function getManpowerGroups(language = "en") {
  const items = await readPublishedItems(collections.manpower);

  if (Array.isArray(items)) {
    return items.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);

      return {
      title: item.title || "",
      count: item.count || "",
      text: item.text || item.description || "",
      path: item.path || "/manpower",
      };
    });
  }

  const settings = await getSettings(language);
  return isMissing(settings?.manpower_groups)
    ? defaults.manpowerGroups
    : asArray(settings.manpower_groups);
}

export async function getHeroVideos(language = "en") {
  const items = await readPublishedItems(collections.heroVideos, {
    // Expand the file relation: the file's real name decides below whether
    // the CMS row points at the same clip the build already ships.
    fields: ["*", "video.id", "video.filename_download"],
  });
  const settingsHeroVideos = Array.isArray(items)
    ? null
    : (await getSettings(language))?.hero_videos;
  const source = Array.isArray(items)
    ? items
    : isMissing(settingsHeroVideos)
      ? null
      : asArray(settingsHeroVideos);

  return withFallback(
    source?.map((rawItem, index) => {
      const item = localizeDirectusItem(rawItem, language);
      const fallbackHero =
        defaults.heroVideos[index] || defaults.heroVideos[0] || {};

      // Only a name that really came from the CMS row may match a bundled
      // clip — the fallback name would always "match" and mask real changes.
      const cmsFileName =
        item.file_name ||
        item.video?.filename_download ||
        item.video_file?.filename_download ||
        "";
      // Same clip as a bundled build asset -> serve the bundled copy. It is
      // immutable-cached, and its URL does not change when CMS data hydrates
      // a few seconds after load — swapping to the Directus URL remounted the
      // already-playing hero video and visibly restarted it.
      const bundledTwin = defaults.heroVideos.find(
        (entry) => entry.fileName && entry.fileName === cmsFileName
      );

      return {
        id: item.id || item.slug || item.title,
        title: textWithFallback(item.title, fallbackHero.title || ""),
        fileName: cmsFileName || fallbackHero.fileName || "",
        video:
          bundledTwin?.video ||
          directusAssetUrl(item.video || item.video_file || item.file) ||
          fallbackHero.video ||
          "",
        poster:
          directusImageUrl(
            item.poster || item.poster_image || item.image,
            { width: 1920, quality: 82 }
          ) ||
          fallbackHero.poster ||
          "",
      };
    }),
    defaults.heroVideos
  );
}

export async function getGeoportals(language = "en") {
  const items = await readPublishedItems(collections.geoportals);

  return withFallback(
    items?.map((rawItem, index) => {
      const item = localizeDirectusItem(rawItem, language);
      const defaultPortal =
        defaults.geoportals.find(
          (portal) => portal.title.toLowerCase() === item.title?.toLowerCase()
        ) || defaults.geoportals[index];

      return {
        title: item.title || "",
        description: item.description || item.summary || "",
        url: item.url || "",
        icon:
          iconMap[item.icon_key] ||
          defaultPortal?.icon ||
          iconChoices[index % iconChoices.length],
        accent: item.accent || defaultPortal?.accent || "bg-[#0b6fa4]",
      };
    }),
    defaults.geoportals
  );
}

export async function getFloodData(language = "en") {
  const items = await readPublishedItems(collections.floodReports, {
    // Manual drag-order (the "sort" field) wins so editors can reorder reports
    // in Directus; newest-first by date is the fallback when nothing is dragged.
    sort: ["sort", "-date"],
  });

  const settings = await getSettings(language);
  const floodSection = localizeFloodSection(
    deepMerge(defaults.floodSection, settings?.flood_section || {}),
    language
  );

  return {
    floodSection,
    floodReports: withFallback(
      items?.map((rawItem) => {
        const item = localizeDirectusItem(rawItem, language);

        return {
          id: item.id,
          title: item.title || "",
          date: item.date || "",
          dateLabel: item.date_label || item.dateLabel || item.date || "",
          category: item.category || "Daily Report",
          coverage: item.coverage || "State-wide",
          meta: item.meta || item.file_meta || "",
          url: directusAssetUrl(item.document || item.file),
        };
      }),
      defaults.floodReports
    ),
  };
}

export async function getNotices(language = "en") {
  const items = await readPublishedItems(collections.notices, {
    // Manual drag-order (the "sort" field) wins so editors can reorder notices
    // in Directus; newest-first by date is the fallback when nothing is dragged.
    sort: ["sort", "-date_published", "-date_created"],
  });

  return withFallback(
    items?.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);

      return {
        id: item.id,
        title: item.title || "",
        category: item.category || "General",
        meta: item.meta || item.file_meta || "",
        lastDate: item.last_date || item.lastDate || "",
        url: directusAssetUrl(item.document || item.file),
      };
    }),
    defaults.notices
  );
}

export async function getPolicies(language = "en") {
  const items = await readPublishedItems(collections.policies);

  const policies = withFallback(
    items?.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);

      return {
      slug: item.slug || String(item.id),
      title: item.title || "",
      summary: item.summary || item.description || "",
      source: item.source_url || item.source || "",
      sections: normalizeDirectusPolicySections(item.sections),
      };
    }),
    defaults.policyPages
  );

  if (language !== "hi") {
    return policies;
  }

  const bySlug = new Map(policyPagesHindi.map((item) => [item.slug, item]));

  return policies.map((policy) =>
    bySlug.has(policy.slug)
      ? applyOfficialHindi(
          mergeHindiFallback(policy, bySlug.get(policy.slug))
        )
      : applyOfficialHindi(policy)
  );
}

export async function getPublicInfoPages(language = "en") {
  const items = await readPublishedItems(collections.publicInfo);

  const cmsPages =
    items?.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);

      return {
        slug: item.slug || String(item.id),
        title: item.title || "",
        summary: item.summary || item.description || "",
        eyebrow: item.eyebrow || "Public Services",
        source: item.source_url || item.source || "",
        sections: asArray(item.sections),
        links: asArray(item.links),
      };
    }) || [];

  // CMS entries win; local defaults fill any slug the CMS does not provide yet
  // (e.g. faq), so new pages work before they are added to Directus.
  const bySlug = new Map(cmsPages.map((page) => [page.slug, page]));
  defaults.publicInfoPages.forEach((page) => {
    if (!bySlug.has(page.slug)) {
      bySlug.set(page.slug, page);
    }
  });

  const pages = bySlug.size ? Array.from(bySlug.values()) : defaults.publicInfoPages;

  return localizePublicInfoFallback(pages, language);
}

export function getPolicyBySlugLocal(slug, policies) {
  return policies.find((policy) => policy.slug === slug) || defaults.getPolicyBySlug(slug);
}

export async function getMenuItems(language = "en") {
  const items = await readPublishedItems(collections.menu);

  if (Array.isArray(items)) {
    const menu = items.map((rawItem) => {
      const item = localizeDirectusItem(rawItem, language);
      const enLinks = asArray(rawItem.links);

      // Keep the English link set as canonical and overlay Hindi per link path.
      // A partial or empty `links_hi` must fall back to English link-by-link
      // instead of wholesale-replacing the list, or Hindi drops the untranslated
      // links (e.g. About Us showed 6 of 8, Flood/RTI/Contact showed none).
      let links = enLinks;
      if (language === "hi") {
        const hiByPath = new Map(
          asArray(rawItem.links_hi)
            .filter((link) => link && link.path)
            .map((link) => [link.path, link])
        );
        links = enLinks.map((link) => {
          const hi = hiByPath.get(link.path);
          if (!hi) {
            return link;
          }
          const hiDescription =
            hi.description != null && String(hi.description).trim() !== ""
              ? hi.description
              : link.description;
          return { ...link, label: hi.label || link.label, description: hiDescription };
        });
      }

      return {
      title: item.title || "",
      description: item.description || "",
      path: item.path || "/",
      links,
      };
    });

    return localizeMenuItems(menu, language);
  }

  const settings = await getSettings(language);
  const menu = isMissing(settings?.menu_items)
    ? defaults.menuItems
    : asArray(settings.menu_items);
  return localizeMenuItems(menu, language);
}

export async function getRsacOfficialSections(language = "en") {
  // The pages payload is the heaviest CMS request: full HTML templates plus
  // thousands of nested content_fields rows. Request only the columns the
  // active language renders — the English site never reads html_hi /
  // content_fields_hi, and skipping them halves the ~4 MB payload and
  // Directus's JSON serialization time. The Hindi site still needs the
  // English columns: divisions render the English html template, and
  // structureHtml (below) applies the English rows.
  const pageFields = [
    "id",
    "section_key",
    "slug",
    "title",
    "summary",
    "html",
    "featured_image",
    "source_url",
    "status",
    "sort",
    "language",
    "translations",
    "content_fields",
    "card_icon",
    "card_color",
    "card_color_2",
    ...(language === "hi"
      ? ["title_hi", "summary_hi", "html_hi", "content_fields_hi"]
      : []),
  ];

  const [sectionItems, pageItems, pageImageItems] = await Promise.all([
    readPublishedItems(collections.sections, { sort: ["sort", "title"] }),
    // This request can still take well over the default timeout; abort too
    // early and every inner page silently falls back to the bundled
    // snapshot, hiding editors' changes.
    readPublishedItems(collections.pages, {
      fields: pageFields,
      sort: ["section_key", "sort", "title"],
      timeoutMs: 60000,
    }),
    readPublishedItems(collections.pageImages, { sort: ["page", "sort"] }),
  ]);

  // Editor-replaced photos: rows with an uploaded image swap that photo in the
  // page HTML (matched by its original src). Rows without an upload change
  // nothing, so the bundled photo keeps showing.
  const pageImagesByPage = new Map();
  pageImageItems?.forEach((row) => {
    if (!row?.page || !row?.original_src || !row?.image) {
      return;
    }
    if (!pageImagesByPage.has(row.page)) {
      pageImagesByPage.set(row.page, []);
    }
    pageImagesByPage.get(row.page).push(row);
  });

  // No CMS data -> static generated fallback (English structure, or scraped
  // Hindi bodies for the Hindi site).
  if (!pageItems?.length) {
    if (language === "hi") {
      const [fallback, enFallback] = await Promise.all([
        import("./rsacOfficialContent.hi.generated"),
        import("./rsacOfficialContent.generated"),
      ]);
      const enPagesBySlug = new Map();
      enFallback.rsacOfficialSections.forEach((section) => {
        (section.pages || []).forEach((page) => {
          enPagesBySlug.set(`${section.key}::${page.slug}`, page);
        });
      });
      return applyOfficialHindi(
        backfillOfficialImages(
          fallback.rsacOfficialSections,
          enFallback.rsacOfficialSections
        )
      ).map((section) => ({
        ...section,
        pages: (section.pages || []).map((page) => {
          const enPage = enPagesBySlug.get(`${section.key}::${page.slug}`);
          return enPage
            ? {
                ...page,
                baseTitle: enPage.title || "",
                baseSummary: enPage.summary || "",
              }
            : page;
        }),
      }));
    }
    const fallback = await import("./rsacOfficialContent.generated");
    return fallback.rsacOfficialSections;
  }

  const sectionsByKey = new Map();

  sectionItems?.forEach((rawItem) => {
    const item = localizeDirectusItem(rawItem, language);
    const key = item.key || item.slug;
    sectionsByKey.set(key, {
      key,
      route: item.route || key,
      // Empty title is intentional (editor collapses the page header to just the
      // kicker). Don't substitute the key — the section is still found by `key`.
      title: item.title || "",
      eyebrow: item.eyebrow || "",
      intro: item.intro || item.description || "",
      sort: Number(item.sort ?? 0),
      pages: [],
    });
  });

  // Division pages always use the same locked HTML template in both languages.
  // Directus supplies different English/Hindi plain-text rows, so an editor can
  // change wording without altering tabs, the left navigation, tables, or media.
  pageItems
    .map((rawItem) => {
      const imageOverrides = pageImagesByPage.get(rawItem.id) || [];
      const englishItem = {
        ...localizeDirectusItem(rawItem, "en"),
        image_overrides: imageOverrides,
      };
      const localizedItem = {
        ...localizeDirectusItem(rawItem, language),
        image_overrides: imageOverrides,
      };
      const page = normalizeDirectusContentPage(
        language === "hi" && rawItem.section_key === "divisions"
          ? { ...localizedItem, html: englishItem.html }
          : localizedItem
      );

      if (language !== "hi") {
        return page;
      }

      return {
        ...page,
        // English identity for language-independent concerns (card icon/color
        // theme matching) — the localized title/summary are Devanagari here.
        baseTitle: englishItem.title || "",
        baseSummary: englishItem.summary || "",
        structureHtml: normalizeDirectusContentPage(englishItem).html,
      };
    })
    .forEach((page) => {
    if (!sectionsByKey.has(page.sectionKey)) {
      sectionsByKey.set(page.sectionKey, {
        key: page.sectionKey,
        route: page.sectionKey,
        title: page.sectionKey,
        eyebrow: "",
        intro: "",
        sort: 0,
        pages: [],
      });
    }

    sectionsByKey.get(page.sectionKey).pages.push(page);
    });

  // Hindi backfill: when a CMS page carries no Hindi body (translations.hi is
  // empty, so the raw English HTML passed through untouched), fall back to the
  // vetted scraped Hindi body from the generated snapshot. Pages the user did
  // translate in Directus keep their CMS Hindi (they contain Devanagari, so the
  // swap is skipped). Divisions are excluded — they intentionally use the English
  // body and translate at render via the term map.
  let hiFallbackBySlug = null;
  if (language === "hi") {
    const [hiFb, enFb] = await Promise.all([
      import("./rsacOfficialContent.hi.generated"),
      import("./rsacOfficialContent.generated"),
    ]);
    const hiSections = applyOfficialHindi(
      backfillOfficialImages(hiFb.rsacOfficialSections, enFb.rsacOfficialSections)
    );
    hiFallbackBySlug = new Map();
    hiSections.forEach((section) => {
      (section.pages || []).forEach((page) => {
        hiFallbackBySlug.set(`${section.key}::${page.slug}`, page);
      });
    });
  }

  const hasDevanagari = (str) => /[ऀ-ॿ]/.test(String(str || ""));
  const backfillHiPage = (sectionKey, page) => {
    if (!hiFallbackBySlug || sectionKey === "divisions" || hasDevanagari(page.html)) {
      return page;
    }
    const fb = hiFallbackBySlug.get(`${sectionKey}::${page.slug}`);
    if (!fb || !hasDevanagari(fb.html)) {
      return page;
    }
    return {
      ...page,
      title: hasDevanagari(page.title) ? page.title : fb.title || page.title,
      summary: hasDevanagari(page.summary) ? page.summary : fb.summary || page.summary,
      preview: hasDevanagari(page.preview) ? page.preview : fb.preview || page.preview,
      html: fb.html,
    };
  };

  const cmsSections = Array.from(sectionsByKey.values())
    .sort((a, b) => a.sort - b.sort)
    .map((section) => ({
      key: section.key,
      route: section.route,
      title: section.title,
      eyebrow: section.eyebrow,
      intro: section.intro,
      pages: section.pages
        .map((page) => backfillHiPage(section.key, page))
        .sort((a, b) => a.sort - b.sort),
    }));

  return cmsSections;
}

export async function buildSearchIndex() {
  const [divisions, notices, geoportals, policies, publicInfoPages] =
    await Promise.all([
      getDivisions(),
      getNotices(),
      getGeoportals(),
      getPolicies(),
      getPublicInfoPages(),
    ]);

  return [
    ...divisions.map((item) => ({
      title: item.title,
      description: item.lead || "",
      path: `/divisions/${item.id}`,
      type: "Division",
      keywords: [item.title, item.lead || ""],
    })),
    ...notices.map((item) => ({
      title: item.title,
      description: item.category || "",
      path: item.url || "/",
      type: "Notice",
      keywords: [item.category, item.meta, item.lastDate].filter(Boolean),
    })),
    ...geoportals.map((item) => ({
      title: item.title,
      description: item.description || "",
      path: "/geoportals",
      type: "Geoportal",
      keywords: [item.title, item.url, "geoportal"].filter(Boolean),
    })),
    ...policies.map((item) => ({
      title: item.title,
      description: item.summary || "",
      path: `/${item.slug}`,
      type: "Policy",
      keywords: [item.title, item.summary].filter(Boolean),
    })),
    ...publicInfoPages.map((item) => ({
      title: item.title,
      description: item.summary || "",
      path: `/${item.slug}`,
      type: "Public Service",
      keywords: [item.title, item.summary].filter(Boolean),
    })),
  ];
}
