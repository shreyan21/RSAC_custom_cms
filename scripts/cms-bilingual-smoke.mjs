import { config as loadEnv } from "dotenv";
import { assembleBootstrap } from "../server/contentAssembler.js";
import { validateEntryPayload } from "../server/contentValidation.js";

loadEnv({ path: ".env.local", quiet: true });

const base = process.env.VITE_API_URL || "http://localhost:3000";
const targetSections = new Set(["divisions", "facilities"]);
let cookie = "";
let csrf = "";

const request = async (path, options = {}) => {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...(csrf && options.method && options.method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${path} failed (${response.status})`);
  return { payload, response };
};

const findTargetPages = (bootstrap) => bootstrap.rsacOfficialSections
  .filter((section) => targetSections.has(section.key))
  .flatMap((section) => section.pages || []);

const findEditableBlock = (page) => (page?.blocks || []).find((block) =>
  Object.hasOwn(block, "contentHtml") && !block.peopleSection
);

const assertCanonicalPage = (page, language) => {
  if (!page?.canonicalSectionContent) throw new Error(`${language} ${page?.slug || "page"} is not canonical.`);
  for (const block of page.blocks || []) {
    if (!Object.hasOwn(block, "contentHtml")) {
      throw new Error(`${language} ${page.slug} contains a section without canonical contentHtml.`);
    }
    if (Object.hasOwn(block, "children")) {
      throw new Error(`${language} ${page.slug} still exposes active legacy child rows.`);
    }
  }
};

const validatedPage = validateEntryPayload("pages", {
  status: "published",
  dataEn: {
    slug: "canonical-smoke",
    sectionKey: "facilities",
    title: "Canonical smoke",
    blocks: [{ id: "intro", value: "Introduction", contentHtml: '<h2>Heading</h2><p><strong>Bold</strong> <em>italic</em> <u>underline</u> <a href="https://example.gov.in">link</a></p><blockquote>Quote</blockquote><table><tbody><tr><th>Head</th><td>Cell</td></tr></tbody></table>' }],
  },
  dataHi: {
    slug: "canonical-smoke",
    sectionKey: "facilities",
    title: "",
    blocks: [{ id: "intro", value: "", contentHtml: "" }],
  },
});
if (!validatedPage.dataEn.blocks[0].contentHtml.includes("<table>") || validatedPage.dataHi.blocks[0].contentHtml !== "") {
  throw new Error("Rich section validation removed supported markup or replaced an exact-empty translation.");
}

const fakeRows = [
  { id: "section-divisions", collection: "page_sections", entry_key: "divisions", sort_order: 0, data_en: { key: "divisions", title: "Divisions" }, data_hi: { key: "divisions", title: "Prabhag" } },
  {
    id: "page-canonical",
    collection: "pages",
    entry_key: "canonical-page",
    sort_order: 0,
    status: "published",
    data_en: { slug: "canonical-page", sectionKey: "divisions", title: "English title", blocks: [{ id: "intro", value: "Introduction", contentHtml: "<p>English only</p>" }] },
    data_hi: { slug: "canonical-page", sectionKey: "divisions", title: "Hindi title", blocks: [{ id: "intro", value: "", contentHtml: "" }] },
  },
];
const fakeEnglish = assembleBootstrap(fakeRows, "en").rsacOfficialSections[0].pages[0];
const fakeHindi = assembleBootstrap(fakeRows, "hi").rsacOfficialSections[0].pages[0];
if (fakeEnglish.blocks[0].contentHtml !== "<p>English only</p>" || fakeHindi.blocks[0].contentHtml !== "") {
  throw new Error("Bootstrap assembly copied content between languages.");
}

const login = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username: process.env.CMS_ADMIN_USERNAME, password: process.env.CMS_ADMIN_PASSWORD }),
});
cookie = login.response.headers.get("set-cookie")?.split(";")[0] || "";
csrf = login.payload.csrfToken;
if (!cookie || !csrf) throw new Error("CMS login did not return a secure session.");

let original = null;
let saved = null;
let verificationError = null;

try {
  const users = (await request("/api/admin/users")).payload.data;
  if (!Array.isArray(users) || !users.some((user) => user.role === "admin" && user.active)) {
    throw new Error("CMS user administration has no active administrator.");
  }

  const pages = (await request("/api/admin/content/pages")).payload.data;
  const targetPages = pages.filter((page) => targetSections.has(page.dataEn?.sectionKey));
  if (!targetPages.length) throw new Error("Division and Facility CMS pages are missing.");

  for (const page of targetPages) {
    for (const [language, data] of [["English", page.dataEn], ["Hindi", page.dataHi]]) {
      for (const block of data?.blocks || []) {
        if (!Object.hasOwn(block, "contentHtml")) {
          throw new Error(`${language} ${page.entryKey} was not migrated to one rich section field.`);
        }
        if (Object.hasOwn(block, "children")) {
          throw new Error(`${language} ${page.entryKey} still has active legacy rows.`);
        }
      }
    }
  }

  original = structuredClone(targetPages.find((page) =>
    findEditableBlock(page.dataEn) && findEditableBlock(page.dataHi)
  ));
  if (!original) throw new Error("No bilingual rich section is available for the save test.");

  const draft = structuredClone(original);
  const englishBlock = findEditableBlock(draft.dataEn);
  const hindiBlock = draft.dataHi.blocks.find((block) => block.id === englishBlock.id) || findEditableBlock(draft.dataHi);
  const englishMarker = `CMS English rich test ${Date.now()}`;
  const hindiMarker = `CMS Hindi rich test ${Date.now()}`;
  englishBlock.contentHtml = `${englishBlock.contentHtml}<p><strong>${englishMarker}</strong></p>`;
  hindiBlock.contentHtml = `${hindiBlock.contentHtml}<p><em>${hindiMarker}</em></p>`;

  const sharedAssetsBefore = JSON.stringify((draft.dataEn.blocks || []).map((block) => block.assets || []));
  const preview = (await request("/api/admin/preview", {
    method: "POST",
    body: JSON.stringify({ collection: "pages", entry: draft }),
  })).payload;
  const previewEnglish = (await request(`/api/content/preview/${preview.token}?lang=en`)).payload.data;
  const previewHindi = (await request(`/api/content/preview/${preview.token}?lang=hi`)).payload.data;
  const previewEnglishPage = findTargetPages(previewEnglish).find((page) => page.slug === draft.dataEn.slug);
  const previewHindiPage = findTargetPages(previewHindi).find((page) => page.slug === draft.dataEn.slug);
  if (!previewEnglishPage?.blocks.some((block) => block.contentHtml?.includes(englishMarker))) {
    throw new Error("English rich-section preview did not update.");
  }
  if (!previewHindiPage?.blocks.some((block) => block.contentHtml?.includes(hindiMarker))) {
    throw new Error("Hindi rich-section preview did not update independently.");
  }

  saved = (await request(`/api/admin/content/pages/${draft.id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  })).payload.data;

  const englishBootstrap = (await request("/api/content/bootstrap?lang=en")).payload.data;
  const hindiBootstrap = (await request("/api/content/bootstrap?lang=hi")).payload.data;
  const englishPage = findTargetPages(englishBootstrap).find((page) => page.slug === draft.dataEn.slug);
  const hindiPage = findTargetPages(hindiBootstrap).find((page) => page.slug === draft.dataEn.slug);
  assertCanonicalPage(englishPage, "English");
  assertCanonicalPage(hindiPage, "Hindi");
  if (!englishPage.blocks.some((block) => block.contentHtml?.includes(englishMarker))) {
    throw new Error("Saved English rich content did not reach the website payload.");
  }
  if (!hindiPage.blocks.some((block) => block.contentHtml?.includes(hindiMarker))) {
    throw new Error("Saved Hindi rich content did not reach the website payload.");
  }
  if (englishPage.blocks.some((block) => block.contentHtml?.includes(hindiMarker)) || hindiPage.blocks.some((block) => block.contentHtml?.includes(englishMarker))) {
    throw new Error("Rich content leaked between languages.");
  }
  if (JSON.stringify((saved.dataEn.blocks || []).map((block) => block.assets || [])) !== sharedAssetsBefore) {
    throw new Error("Editing rich text changed shared media.");
  }

  const version = (await request("/api/content/version")).payload.version;
  if (!version || version !== englishBootstrap.contentVersion) {
    throw new Error("Website content version did not refresh after save.");
  }

  for (const page of findTargetPages(englishBootstrap)) assertCanonicalPage(page, "English");
  for (const page of findTargetPages(hindiBootstrap)) assertCanonicalPage(page, "Hindi");
} catch (error) {
  verificationError = error;
} finally {
  if (saved && original) {
    await request(`/api/admin/content/pages/${original.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...saved,
        entryKey: original.entryKey,
        dataEn: original.dataEn,
        dataHi: original.dataHi,
        status: original.status,
        sortOrder: original.sortOrder,
      }),
    });
  }
  await request("/api/auth/logout", { method: "POST" });
}

if (verificationError) throw verificationError;
console.log("Canonical bilingual Division/Facility rich-text, exact-empty language behavior, preview, public delivery, shared media, content versioning, users, and restoration smoke tests passed.");
