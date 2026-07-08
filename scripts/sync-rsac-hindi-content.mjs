import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rsacOfficialSections as englishSections } from "../src/data/rsacOfficialContent.generated.js";
import {
  localizeBasicItems,
  localizeMenuItems,
  publicInfoPagesHindi,
  siteSettingsHindi,
} from "../src/data/hindiContent.js";

const repoRoot = resolve(import.meta.dirname, "..");
const officialBaseUrl = "https://rsac.up.gov.in";
const directusEnvPath = resolve(repoRoot, "backend/directus/.env");
const outputPath = resolve(
  repoRoot,
  "src/data/rsacOfficialContent.hi.generated.js"
);
const policyOutputPath = resolve(
  repoRoot,
  "src/data/policies.hi.generated.js"
);
const policyDefinitions = [
  ["terms-and-conditions", "terms-conditions"],
  ["copyright-policy", "copyright-policy"],
  ["privacy-policy", "privacy-policy"],
  ["hyperlinking-policy", "hyperlinking-policy"],
  ["disclaimer", "disclaimer"],
  ["accessibility-statement", "help"],
  ["help", "help"],
];

const sectionTranslations = {
  "about-us": {
    title: "हमारे बारे में",
    eyebrow: "आरएसएसी-यूपी परिचय",
    intro:
      "संस्थागत परिचय, संगठन संरचना, पूर्व नेतृत्व और कार्मिक संबंधी आधिकारिक जानकारी।",
  },
  divisions: {
    title: "प्रभाग",
    eyebrow: "वैज्ञानिक प्रभाग",
    intro:
      "प्रभागों के उद्देश्य, कार्मिक, परियोजनाएं, रिपोर्ट, शोध-पत्र, मानचित्र और मीडिया।",
  },
  facilities: {
    title: "सुविधाएं",
    eyebrow: "आरएसएसी-यूपी सुविधाएं",
    intro:
      "प्रयोगशालाएं, डेटा बैंक, पुस्तकालय, छात्रावास, तकनीकी सहायता, लाइडार और बाथीमेट्री सुविधाएं।",
  },
  academics: {
    title: "शैक्षणिक",
    eyebrow: "शिक्षण एवं प्रशिक्षण",
    intro:
      "स्कूल ऑफ जियो-इन्फॉर्मेटिक्स और प्रशिक्षण प्रभाग की शैक्षणिक जानकारी।",
  },
};

const allowedTags = new Set([
  "a",
  "b",
  "br",
  "caption",
  "div",
  "em",
  "figure",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const decodeEntities = (value = "") =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const stripTags = (html = "") =>
  decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const toAbsoluteUrl = (rawValue) => {
  const value = decodeEntities(rawValue).trim();

  if (!value || value === "#" || /^javascript:/i.test(value)) {
    return "";
  }

  try {
    return new URL(value, `${officialBaseUrl}/`).href;
  } catch {
    return "";
  }
};

const cleanAttributes = (tagName, rawAttributes, fallbackTitle) => {
  const tag = tagName.toLowerCase();
  const entries = [];
  const attributes = [];
  const matcher =
    /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;

  while ((match = matcher.exec(rawAttributes))) {
    entries.push({
      name: match[1].toLowerCase(),
      value: match[3] ?? match[4] ?? match[5] ?? "",
    });
  }

  if (tag === "a") {
    const href = toAbsoluteUrl(
      entries.find((entry) => entry.name === "href")?.value
    );

    if (href) {
      attributes.push(`href="${escapeAttribute(href)}"`);
      attributes.push('target="_blank"');
      attributes.push('rel="noopener noreferrer"');
    }
  }

  if (tag === "img") {
    const src = toAbsoluteUrl(
      entries.find((entry) =>
        ["data-original", "data-src", "src"].includes(entry.name)
      )?.value
    );
    const alt =
      entries.find((entry) => entry.name === "alt")?.value || fallbackTitle;

    if (src) {
      attributes.push(`src="${escapeAttribute(src)}"`);
      attributes.push(`alt="${escapeAttribute(alt)}"`);
      attributes.push('loading="lazy"');
      attributes.push('decoding="async"');
    }
  }

  if (tag === "td" || tag === "th") {
    entries
      .filter((entry) => ["colspan", "rowspan"].includes(entry.name))
      .forEach((entry) => {
        attributes.push(`${entry.name}="${escapeAttribute(entry.value)}"`);
      });
  }

  return attributes.length ? ` ${attributes.join(" ")}` : "";
};

const extractMainContent = (html) => {
  const match = html.match(
    /<section id=["']main-content["'][^>]*>([\s\S]*?)<\/section>\s*<footer/i
  );

  return (match?.[1] || html)
    .replace(/<ol class=["']breadcrumb["'][\s\S]*?<\/ol>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
};

const sanitizeContent = (html, fallbackTitle) => {
  const content = extractMainContent(html)
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+/g, " ");

  return content
    .replace(
      /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g,
      (full, closing, tagName, attributes) => {
        const tag = tagName.toLowerCase();

        if (!allowedTags.has(tag)) {
          return "";
        }

        if (closing) {
          return ["br", "img"].includes(tag) ? "" : `</${tag}>`;
        }

        if (tag === "br") {
          return "<br>";
        }

        return `<${tag}${cleanAttributes(tag, attributes, fallbackTitle)}>`;
      }
    )
    .replace(/<a>\s*([\s\S]*?)\s*<\/a>/gi, "<span>$1</span>")
    .replace(/<a(?:\s[^>]*)?>\s*<\/a>/gi, "")
    .replace(/<(p|div)>\s*<\/\1>/gi, "")
    .trim();
};

const getHindiTitle = (html, fallback) => {
  const main = extractMainContent(html);
  const heading = stripTags(
    main.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1] || ""
  );

  return /[\u0900-\u097f]/.test(heading) ? heading : fallback;
};

const fetchHindiPage = async (section, page) => {
  const sourceUrl = `${officialBaseUrl}/hi/page/${page.slug}`;
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`${response.status} ${sourceUrl}`);
  }

  const sourceHtml = await response.text();
  const title = getHindiTitle(sourceHtml, page.title);
  const html = sanitizeContent(sourceHtml, title);
  const preview = stripTags(html).slice(0, 360);

  return {
    ...page,
    sectionKey: section.key,
    title,
    summary: preview,
    sourceUrl,
    preview,
    html,
  };
};

const fetchHindiPolicy = async ([slug, sourceSlug]) => {
  const sourceUrl = `${officialBaseUrl}/hi/page/${sourceSlug}`;
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`${response.status} ${sourceUrl}`);
  }

  const sourceHtml = await response.text();
  const title = getHindiTitle(sourceHtml, slug);
  const html = sanitizeContent(sourceHtml, title);
  const body = stripTags(html);

  return {
    slug,
    title,
    summary: body.slice(0, 280),
    source: sourceUrl,
    sections: [{ heading: title, body }],
  };
};

const synchronizedSections = [];

for (const section of englishSections) {
  const translatedSection = sectionTranslations[section.key] || {};
  const pages = [];

  for (const page of section.pages) {
    process.stdout.write(`Hindi: ${section.key}/${page.slug}\n`);
    pages.push(await fetchHindiPage(section, page));
  }

  synchronizedSections.push({
    key: section.key,
    route: section.route,
    title: translatedSection.title || section.title,
    eyebrow: translatedSection.eyebrow || section.eyebrow,
    intro: translatedSection.intro || section.intro,
    pages,
  });
}

const generatedAt = new Date().toISOString();
const fileContent = `// Generated by scripts/sync-rsac-hindi-content.mjs from the official RSAC-UP Hindi website.
// Do not edit this file by hand.

export const rsacOfficialContentGeneratedAt = ${JSON.stringify(generatedAt)};

export const rsacOfficialSections = ${JSON.stringify(synchronizedSections, null, 2)};

export const getRsacOfficialSection = (sectionKey) =>
  rsacOfficialSections.find((section) => section.key === sectionKey);

export const getRsacOfficialPage = (sectionKey, pageSlug) =>
  getRsacOfficialSection(sectionKey)?.pages.find((page) => page.slug === pageSlug);
`;

await writeFile(outputPath, fileContent, "utf8");
process.stdout.write(`Wrote Hindi content: ${outputPath}\n`);

const hindiPolicies = [];

for (const definition of policyDefinitions) {
  process.stdout.write(`Hindi policy: ${definition[0]}\n`);
  hindiPolicies.push(await fetchHindiPolicy(definition));
}

await writeFile(
  policyOutputPath,
  `// Generated by scripts/sync-rsac-hindi-content.mjs.\n\nexport const policyPagesHindi = ${JSON.stringify(hindiPolicies, null, 2)};\n`,
  "utf8"
);
process.stdout.write(`Wrote Hindi policies: ${policyOutputPath}\n`);

const parseEnv = (content) =>
  content.split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (match) {
      values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }

    return values;
  }, {});

const syncDirectus = async () => {
  const env = parseEnv(await readFile(directusEnvPath, "utf8"));
  const baseUrl = String(env.PUBLIC_URL || "http://localhost:8055").replace(
    /\/+$/,
    ""
  );
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      mode: "json",
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Directus login failed (${loginResponse.status}).`);
  }

  const token = (await loginResponse.json()).data.access_token;
  const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`${options.method || "GET"} ${path}: ${response.status}`);
    }

    return response.status === 204
      ? null
      : (await response.json()).data;
  };

  const [
    cmsSections,
    cmsPages,
    cmsSettingsRows,
    cmsMenu,
    cmsPublicInfo,
    cmsDivisions,
    cmsFacilities,
    cmsContactRows,
    cmsPolicies,
  ] = await Promise.all([
    request("/items/rsac_sections?limit=-1&fields=id,key,translations"),
    request(
      "/items/rsac_pages?limit=-1&fields=id,section_key,slug,translations"
    ),
    request("/items/rsac_site_settings?limit=1&fields=id,translations"),
    request(
      "/items/rsac_menu?limit=-1&sort=sort&fields=id,title,description,path,links,translations"
    ),
    request(
      "/items/rsac_public_info?limit=-1&fields=id,slug,translations"
    ),
    request(
      "/items/rsac_divisions?limit=-1&fields=id,slug,title,lead,translations"
    ),
    request(
      "/items/rsac_facilities?limit=-1&fields=id,title,text,translations"
    ),
    request("/items/rsac_contact?limit=1&fields=id,translations"),
    request("/items/rsac_policies?limit=-1&fields=id,slug,translations"),
  ]);
  const sectionByKey = new Map(cmsSections.map((item) => [item.key, item]));
  const pageByKey = new Map(
    cmsPages.map((item) => [`${item.section_key}:${item.slug}`, item])
  );

  for (const section of synchronizedSections) {
    const cmsSection = sectionByKey.get(section.key);

    if (cmsSection) {
      await request(`/items/rsac_sections/${cmsSection.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          translations: {
            ...(cmsSection.translations || {}),
            hi: {
              title: section.title,
              eyebrow: section.eyebrow,
              intro: section.intro,
            },
          },
        }),
      });
    }

    for (const page of section.pages) {
      const cmsPage = pageByKey.get(`${section.key}:${page.slug}`);

      if (!cmsPage) {
        continue;
      }

      await request(`/items/rsac_pages/${cmsPage.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          translations: {
            ...(cmsPage.translations || {}),
            hi: {
              title: page.title,
              summary: page.summary,
              html: page.html,
              source_url: page.sourceUrl,
            },
          },
        }),
      });
    }
  }

  const cmsSettings = cmsSettingsRows[0];

  if (cmsSettings) {
    await request(`/items/rsac_site_settings/${cmsSettings.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        translations: {
          ...(cmsSettings.translations || {}),
          hi: {
            branding: siteSettingsHindi.branding,
            hero: siteSettingsHindi.hero,
            mission_pulse: siteSettingsHindi.missionPulse,
            home_sections: siteSettingsHindi.homeSections,
            about: siteSettingsHindi.about,
            location: siteSettingsHindi.location,
            footer: siteSettingsHindi.footer,
            organisation_chart: siteSettingsHindi.organisationChart,
            page_content: siteSettingsHindi.pageContent,
            services: siteSettingsHindi.services,
            applications: siteSettingsHindi.applications,
            search: siteSettingsHindi.search,
            ui: siteSettingsHindi.ui,
            cards: siteSettingsHindi.cards,
          },
        },
      }),
    });
  }

  const localizedMenu = localizeMenuItems(cmsMenu, "hi");

  for (const item of localizedMenu) {
    const source = cmsMenu.find((entry) => entry.id === item.id);

    await request(`/items/rsac_menu/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        translations: {
          ...(source?.translations || {}),
          hi: {
            title: item.title,
            description: item.description,
            links: item.links,
          },
        },
      }),
    });
  }

  const publicInfoBySlug = new Map(
    publicInfoPagesHindi.map((item) => [item.slug, item])
  );

  for (const item of cmsPublicInfo) {
    const translated = publicInfoBySlug.get(item.slug);

    if (!translated) {
      continue;
    }

    await request(`/items/rsac_public_info/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        translations: {
          ...(item.translations || {}),
          hi: translated,
        },
      }),
    });
  }

  const localizedDivisions = localizeBasicItems(
    "divisions",
    cmsDivisions.map((item) => ({ ...item, id: item.slug })),
    "hi"
  );

  for (const item of localizedDivisions) {
    const source = cmsDivisions.find((entry) => entry.slug === item.id);

    await request(`/items/rsac_divisions/${source.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        translations: {
          ...(source.translations || {}),
          hi: { title: item.title, lead: item.lead },
        },
      }),
    });
  }

  const localizedFacilities = localizeBasicItems(
    "facilities",
    cmsFacilities,
    "hi"
  );

  for (const item of localizedFacilities) {
    const source = cmsFacilities.find((entry) => entry.id === item.id);

    await request(`/items/rsac_facilities/${source.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        translations: {
          ...(source.translations || {}),
          hi: { title: item.title, text: item.text },
        },
      }),
    });
  }

  const cmsContact = cmsContactRows[0];

  if (cmsContact) {
    await request(`/items/rsac_contact/${cmsContact.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        translations: {
          ...(cmsContact.translations || {}),
          hi: {
            title: "आरएसएसी-यूपी से संपर्क करें",
            address: siteSettingsHindi.location.address,
          },
        },
      }),
    });
  }

  const policyBySlug = new Map(
    hindiPolicies.map((item) => [item.slug, item])
  );

  for (const item of cmsPolicies) {
    const translated = policyBySlug.get(item.slug);

    if (!translated) {
      continue;
    }

    await request(`/items/rsac_policies/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        translations: {
          ...(item.translations || {}),
          hi: translated,
        },
      }),
    });
  }

  process.stdout.write("Updated Hindi translations across Directus content.\n");
};

try {
  await syncDirectus();
} catch (error) {
  process.stderr.write(
    `Hindi file generated; Directus sync skipped: ${error.message}\n`
  );
}
