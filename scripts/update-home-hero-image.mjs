import { Blob } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const envPath = join(repoRoot, "backend", "directus", ".env");
const defaultSource = join(homedir(), "Downloads", "satellite_image.jpg");
const keepVideo = process.argv.includes("--keep-video");
const sourceArgument = process.argv.slice(2).find((value) => !value.startsWith("--"));
const sourcePath = resolve(sourceArgument || defaultSource);

const parseEnv = (path) =>
  readFileSync(path, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

      if (match) {
        values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }

      return values;
    }, {});

if (!existsSync(envPath)) {
  throw new Error(
    "backend/directus/.env is missing. Configure Directus first."
  );
}

if (!existsSync(sourcePath)) {
  throw new Error(`Homepage hero image not found: ${sourcePath}`);
}

const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const extension = extname(sourcePath).toLowerCase();
const mimeType = mimeTypes[extension];

if (!mimeType) {
  throw new Error("Homepage hero image must be JPG, PNG, or WebP.");
}

const env = parseEnv(envPath);
const directusUrl = String(
  process.env.DIRECTUS_URL || env.PUBLIC_URL || "http://localhost:8055"
).replace(/\/+$/, "");
let accessToken = "";

const request = async (
  path,
  { method = "GET", body, auth = true, form = false } = {}
) => {
  const headers = {};

  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (body !== undefined && !form) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${directusUrl}${path}`, {
    method,
    headers,
    body:
      body === undefined ? undefined : form ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `${method} ${path} failed (${response.status}): ${detail.slice(0, 400)}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  return payload?.data ?? payload;
};

try {
  const ping = await fetch(`${directusUrl}/server/ping`);

  if (!ping.ok) {
    throw new Error(`Ping failed with ${ping.status}.`);
  }
} catch {
  throw new Error(
    `Directus is not reachable at ${directusUrl}. Run npm run cms:start first.`
  );
}

const login = await request("/auth/login", {
  method: "POST",
  auth: false,
  body: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    mode: "json",
  },
});
accessToken = login.access_token;

const folders = await request(
  "/folders?limit=1&filter[name][_eq]=RSAC Website Public Media"
);
const folder =
  folders[0] ||
  (await request("/folders", {
    method: "POST",
    body: { name: "RSAC Website Public Media" },
  }));

const sourceBytes = readFileSync(sourcePath);
const filename = basename(sourcePath);
const form = new FormData();
form.append(
  "title",
  `Homepage satellite hero image ${new Date().toISOString()}`
);
form.append("folder", folder.id);
form.append("file", new Blob([sourceBytes], { type: mimeType }), filename);

const uploaded = await request("/files", {
  method: "POST",
  body: form,
  form: true,
});
const fileId = uploaded.id;
console.log(`Uploaded fresh dedicated hero file: ${filename}`);

const heroRecords = await request(
  "/items/rsac_hero_videos?limit=1&sort=sort&fields=id,title,file_name,video"
);
const heroRecord = Array.isArray(heroRecords) ? heroRecords[0] : heroRecords;

if (!heroRecord?.id) {
  throw new Error("RSAC Hero Videos record is missing. Run npm run cms:setup.");
}

await request(`/items/rsac_hero_videos/${heroRecord.id}`, {
  method: "PATCH",
  body: {
    poster: fileId,
    ...(keepVideo
      ? {}
      : {
          video: null,
          file_name: basename(sourcePath),
        }),
    status: "published",
  },
});

console.log("Homepage hero image updated.");
console.log(
  keepVideo
    ? "Existing hero video retained; new image is its loading poster."
    : "Hero video cleared so image remains visible."
);
console.log("Reload homepage with Ctrl+F5.");
