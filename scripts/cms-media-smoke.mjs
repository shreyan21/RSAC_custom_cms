import { config as loadEnv } from "dotenv";
import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import pg from "pg";
import { config } from "../server/config.js";

loadEnv({ path: ".env.local", quiet: true });

if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const base = String(process.env.CMS_API_URL || process.env.VITE_API_URL || "http://127.0.0.1:3000").replace(/\/$/u, "");
let cookie = "";
let csrf = "";
const uploaded = [];

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.json ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrf && options.method && options.method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
      ...(options.headers || {}),
    },
    body: options.json ? JSON.stringify(options.json) : options.body,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

const upload = async (name, type, bytes) => {
  const form = new FormData();
  form.set("file", new Blob([bytes], { type }), name);
  form.set("altEn", `CMS smoke test ${name}`);
  form.set("altHi", `CMS smoke test ${name}`);
  const result = await request("/api/admin/media", { method: "POST", body: form });
  if (result.response.status !== 201) throw new Error(result.payload.error || `${name} upload failed (${result.response.status})`);
  uploaded.push(result.payload.data);
  return result.payload.data;
};

const cleanup = async () => {
  if (!uploaded.length) return;
  const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
  await client.connect();
  try {
    await client.query("DELETE FROM cms_media WHERE id = ANY($1::uuid[])", [uploaded.map((item) => item.id)]);
  } finally {
    await client.end();
  }

  const uploadRoot = resolve(config.uploadDir);
  for (const item of uploaded) {
    const filePath = resolve(uploadRoot, item.stored_name);
    if (!filePath.startsWith(`${uploadRoot}${sep}`)) throw new Error(`Unsafe test upload path: ${filePath}`);
    await unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
};

try {
  const login = await request("/api/auth/login", {
    method: "POST",
    json: { username: process.env.CMS_ADMIN_USERNAME, password: process.env.CMS_ADMIN_PASSWORD },
  });
  if (!login.response.ok) throw new Error(login.payload.error || "CMS login failed.");
  cookie = login.response.headers.get("set-cookie")?.split(";")[0] || "";
  csrf = login.payload.csrfToken || "";
  if (!cookie || !csrf) throw new Error("CMS login did not return a secure session.");

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n", "utf8");
  const image = await upload("cms-smoke-image.png", "image/png", png);
  const document = await upload("cms-smoke-document.pdf", "application/pdf", pdf);

  for (const [item, expectedType] of [[image, "image/png"], [document, "application/pdf"]]) {
    if (item.mime_type !== expectedType || !item.public_url || !item.stored_name) throw new Error(`Invalid media record for ${expectedType}.`);
    const publicResponse = await fetch(new URL(item.public_url, base));
    if (!publicResponse.ok || publicResponse.headers.get("content-type")?.split(";")[0] !== expectedType) {
      throw new Error(`Uploaded ${expectedType} could not be fetched back.`);
    }
  }

  const media = await request("/api/admin/media");
  if (!media.response.ok || uploaded.some((item) => !media.payload.data?.some((candidate) => candidate.id === item.id))) {
    throw new Error("Uploaded files are missing from the CMS media list.");
  }

  const unsupportedForm = new FormData();
  unsupportedForm.set("file", new Blob(["not allowed"], { type: "text/plain" }), "cms-smoke.txt");
  const unsupported = await request("/api/admin/media", { method: "POST", body: unsupportedForm });
  if (unsupported.response.status !== 415) throw new Error(`Unsupported upload returned ${unsupported.response.status}; expected 415.`);
} finally {
  await cleanup();
  if (cookie && csrf) await request("/api/auth/logout", { method: "POST" }).catch(() => {});
}

console.log("CMS image/PDF upload, public retrieval, media listing and unsupported-file rejection passed; test files were removed.");
