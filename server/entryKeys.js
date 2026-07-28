import { randomUUID } from "node:crypto";

export const slugifyEntryKey = (value) => String(value || "entry")
  .normalize("NFKD")
  .replace(/[^a-zA-Z0-9\s-]/g, "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .slice(0, 120) || randomUUID();

export const entryKeyFor = (body, dataEn) => {
  const existing = [...String(body?.entryKey || "").trim()]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join("")
    .slice(0, 160);
  return existing || slugifyEntryKey(
    dataEn.path ||
    dataEn.slug ||
    dataEn.roleKey ||
    dataEn.title ||
    dataEn.name ||
    dataEn.label
  );
};

export const allocateUniqueEntryKey = async (
  client,
  collection,
  baseKey,
  { automatic = true } = {}
) => {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    [`cms-entry-key:${collection}:${baseKey}`]
  );

  let candidate = baseKey;
  let suffix = 2;
  while (true) {
    const existing = await client.query(
      "SELECT 1 FROM cms_entries WHERE collection=$1 AND entry_key=$2 LIMIT 1",
      [collection, candidate]
    );
    if (!existing.rows[0]) return candidate;
    if (!automatic) {
      throw Object.assign(
        new Error("This internal key is already in use. Leave it blank to generate a unique key automatically."),
        { status: 409 }
      );
    }
    candidate = `${baseKey}-${suffix}`;
    suffix += 1;
  }
};
