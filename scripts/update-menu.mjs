/**
 * Targeted updater: pushes the local menuItems.js into the Directus
 * `rsac_menu` collection, overwriting existing rows. Only touches the
 * menu collection — no other CMS content is modified.
 *
 * Usage: node scripts/update-menu.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { menuItems } from "../src/data/menuItems.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const parseEnv = (path) => {
  const out = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
  return out;
};

const env = parseEnv(resolve(repoRoot, "backend/directus/.env"));
const baseUrl = (env.PUBLIC_URL || "http://localhost:8055").replace(/\/+$/, "");
const adminEmail = env.ADMIN_EMAIL;
const adminPassword = env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error("ADMIN_EMAIL / ADMIN_PASSWORD missing in backend/directus/.env");
  process.exit(1);
}

const api = async (path, { method = "GET", body, token } = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : (await res.json()).data;
};

const login = async () => {
  const data = await api("/auth/login", {
    method: "POST",
    body: { email: adminEmail, password: adminPassword },
  });
  return data.access_token;
};

const run = async () => {
  const token = await login();
  let created = 0;
  let updated = 0;

  for (const [sort, item] of menuItems.entries()) {
    const existing = await api(
      `/items/rsac_menu?filter[title][_eq]=${encodeURIComponent(item.title)}&limit=1`,
      { token }
    );
    const payload = {
      title: item.title,
      description: item.description || "",
      path: item.path || "/",
      links: item.links || [],
      status: "published",
      sort,
    };

    if (existing?.length) {
      await api(`/items/rsac_menu/${existing[0].id}`, {
        method: "PATCH",
        body: payload,
        token,
      });
      updated += 1;
    } else {
      await api(`/items/rsac_menu`, { method: "POST", body: payload, token });
      created += 1;
    }
    console.log(`✓ ${item.title} (${item.links?.length || 0} links)`);
  }

  console.log(`\nMenu sync complete: ${updated} updated, ${created} created.`);
};

run().catch((error) => {
  console.error("Menu sync failed:", error.message);
  process.exit(1);
});
