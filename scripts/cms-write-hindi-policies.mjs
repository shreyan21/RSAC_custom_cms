// Writes official Hindi policy/help text into Directus rsac_policies.translations.hi.
// Source: src/data/policies.hi.generated.js, refreshed from rsac.up.gov.in/hi.
//
// Run:
//   node scripts/cms-write-hindi-policies.mjs          (dry run)
//   node scripts/cms-write-hindi-policies.mjs --apply  (write to Directus)

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { policyPagesHindi } from "../src/data/policies.hi.generated.js";
import { decodeLocalizedValue } from "../src/utils/htmlEntities.js";

const repoRoot = resolve(import.meta.dirname, "..");
const apply = process.argv.includes("--apply");
const collection = "rsac_policies";

const parseEnv = (raw) =>
  raw.split(/\r?\n/).reduce((acc, line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) acc[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    return acc;
  }, {});

const getExistingTranslations = (translations) => {
  if (!translations) return {};
  if (typeof translations === "string") {
    try {
      return JSON.parse(translations);
    } catch {
      return {};
    }
  }
  return translations;
};

const main = async () => {
  const env = parseEnv(
    await readFile(resolve(repoRoot, "backend/directus/.env"), "utf8")
  );
  const baseUrl = (env.PUBLIC_URL || "http://localhost:8055").replace(/\/+$/, "");

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    }),
  });

  if (!login.ok) {
    throw new Error(`Login failed: ${login.status} ${await login.text()}`);
  }

  const token = (await login.json()).data.access_token;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const list = await fetch(
    `${baseUrl}/items/${collection}?fields=id,slug,translations&limit=-1`,
    { headers }
  );

  if (!list.ok) {
    throw new Error(`List failed: ${list.status} ${await list.text()}`);
  }

  const items = (await list.json()).data || [];
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  let writes = 0;
  let skipped = 0;

  for (const policy of policyPagesHindi) {
    const item = bySlug.get(policy.slug);
    if (!item) {
      skipped += 1;
      process.stdout.write(`SKIP missing ${policy.slug}\n`);
      continue;
    }

    const translations = getExistingTranslations(item.translations);
    const hi = decodeLocalizedValue({
      title: policy.title,
      summary: policy.summary,
      source_url: policy.source,
      sections: policy.sections,
    });

    const body = {
      translations: {
        ...translations,
        hi: {
          ...(translations.hi || {}),
          ...hi,
        },
      },
    };

    process.stdout.write(`${apply ? "WRITE" : "PLAN "} ${policy.slug}\n`);
    if (apply) {
      const patch = await fetch(`${baseUrl}/items/${collection}/${item.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!patch.ok) {
        throw new Error(`PATCH ${policy.slug} failed: ${patch.status} ${await patch.text()}`);
      }
    }
    writes += 1;
  }

  process.stdout.write(
    `\n${apply ? "Wrote" : "Would write"} ${writes} policy item(s), skipped=${skipped}.\n`
  );
};

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
