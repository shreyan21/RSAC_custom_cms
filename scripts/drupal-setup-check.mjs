import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const localEnvPath = join(root, ".env.local");
const exampleEnvPath = join(root, ".env.example");
const envPath = existsSync(localEnvPath) ? localEnvPath : exampleEnvPath;

const parseEnv = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((acc, line) => {
      const index = line.indexOf("=");
      if (index === -1) return acc;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      acc[key] = value;
      return acc;
    }, {});

const env = parseEnv(readFileSync(envPath, "utf8"));
const cmsEnabled = env.VITE_CMS_ENABLED === "true";
const provider = String(env.VITE_CMS_PROVIDER || "").toLowerCase();
const baseUrl = String(env.VITE_DRUPAL_URL || env.VITE_CMS_URL || "").replace(
  /\/+$/,
  ""
);
const jsonApiPath = env.VITE_DRUPAL_JSONAPI_PATH || "/jsonapi";
const requestTimeout = Number(env.VITE_CMS_REQUEST_TIMEOUT || 20000);

const isPlaceholderUrl =
  !baseUrl || /example\.gov\.in|your-drupal-domain/i.test(baseUrl);

const checkDrupalReachable = async () => {
  if (!baseUrl || isPlaceholderUrl) {
    return {
      ok: false,
      detail: "skipped until VITE_CMS_URL points to Drupal",
    };
  }

  const url = `${baseUrl}${jsonApiPath}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/vnd.api+json, application/json" },
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      detail: response.ok
        ? `${response.status} ${url}`
        : `${response.status} ${response.statusText} at ${url}`,
    };
  } catch (error) {
    const reason =
      error?.cause?.code ||
      (error?.name === "AbortError" ? "timeout" : error?.message) ||
      "connection failed";

    return {
      ok: false,
      detail: `${url} not reachable (${reason})`,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const drupalReachable = await checkDrupalReachable();

const checks = [
  {
    label: "CMS enabled",
    ok: cmsEnabled,
    detail: cmsEnabled ? "VITE_CMS_ENABLED=true" : "set VITE_CMS_ENABLED=true",
  },
  {
    label: "Drupal provider selected",
    ok: provider === "drupal",
    detail:
      provider === "drupal"
        ? "VITE_CMS_PROVIDER=drupal"
        : "set VITE_CMS_PROVIDER=drupal",
  },
  {
    label: "Drupal URL configured",
    ok: Boolean(baseUrl) && !isPlaceholderUrl,
    detail: isPlaceholderUrl
      ? "set VITE_CMS_URL to real Drupal site URL in .env.local"
      : baseUrl,
  },
  {
    label: "JSON:API path configured",
    ok: Boolean(jsonApiPath),
    detail: jsonApiPath,
  },
  {
    label: "Drupal reachable",
    ok: drupalReachable.ok,
    detail: drupalReachable.detail,
  },
  { label: "Fallback mode", ok: true, detail: "Drupal first, static fallback last" },
];

console.log("RSAC Drupal CMS setup check\n");
console.log(`Env file: ${envPath}\n`);

for (const check of checks) {
  console.log(`${check.ok ? "OK" : "TODO"}  ${check.label}: ${check.detail}`);
}

console.log("\nFrontend runtime:");
console.log("1. Drupal JSON:API first");
console.log("2. Static fallback always remains safe");

console.log("\nExpected Drupal endpoints:");
[
  "rsac_site_setting",
  "rsac_page_section",
  "rsac_page",
  "rsac_section_item",
  "rsac_division",
  "rsac_download",
  "rsac_gallery_item",
  "rsac_notice_tender_faq",
  "rsac_menu_item",
  "rsac_project",
  "rsac_publication",
  "rsac_contact",
  "rsac_profile",
  "rsac_manpower_group",
  "rsac_hero_video",
  "rsac_brand_logo",
  "rsac_organisation_role",
].forEach((bundle) => {
  console.log(`- ${baseUrl || "https://your-drupal-domain"}${jsonApiPath}/node/${bundle}`);
});

console.log("\nDocs:");
console.log("- DRUPAL_EDITOR_USER_GUIDE.md");
console.log("- PROJECT_TRANSFER_GUIDE.md");
console.log("- README.md");

if (isPlaceholderUrl || provider !== "drupal" || !cmsEnabled || !drupalReachable.ok) {
  console.log(
    "\nSetup not complete yet. Start/configure Drupal, update .env.local if needed, then run npm run cms:setup again."
  );
  process.exitCode = 1;
} else {
  console.log("\nSetup config looks ready. Run npm run dev or npm run build.");
}
