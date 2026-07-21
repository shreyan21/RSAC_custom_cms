import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import { canonicalDivisionSection } from "../src/data/divisionSectionLabels.js";
import { extractPageAssetFieldsFromDocument } from "../src/data/pageAssetFields.js";
import { collectPageImages } from "./lib/division-sections.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const dryRun = process.argv.includes("--dry-run");
const headingsOnly = process.argv.includes("--headings-only");
const profileOnlyPages = new Set([
  "our-chairman's-governing-body",
  "director's",
  "our-former",
  "scientific-manpower",
]);
const ignoredElements = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();
const identity = (value) => canonicalDivisionSection(value) || compact(value)
  .replace(/^section\s*:\s*/iu, "")
  .replace(/[^a-z0-9\p{Script=Devanagari}]+/giu, " ")
  .trim()
  .toLocaleLowerCase("en");
const blockLabel = (block) => block?.sourceLabel || block?.heading || block?.value || block?.label || "";
const assetTarget = (asset) => asset?.target || String(asset?.key || "").match(/^asset-([a-z-]+)-\d+$/u)?.[1] || asset?.kind || "asset";
const assetIdentity = (asset) => `${assetTarget(asset)}\u0000${asset?.kind || "asset"}\u0000${compact(asset?.sourceValue || asset?.value)}`;

const assignTextKeys = (document) => {
  const keyByNode = new Map();
  const walker = document.createTreeWalker(document.body, 0x4);
  let index = 0;
  let node = walker.nextNode();
  while (node) {
    let ignored = false;
    for (let ancestor = node.parentNode; ancestor?.nodeType === 1; ancestor = ancestor.parentNode) {
      if (ignoredElements.has(ancestor.tagName)) {
        ignored = true;
        break;
      }
    }
    if (!ignored && compact(node.data)) {
      index += 1;
      keyByNode.set(node, `text-${String(index).padStart(4, "0")}`);
    }
    node = walker.nextNode();
  }
  return keyByNode;
};

const ownerLookup = (blocks) => {
  const ownerByKey = new Map();
  (blocks || []).forEach((block, index) => {
    (block.children || []).forEach((child) => {
      if (child?.key) ownerByKey.set(child.key, index);
      (child?.sourceKeys || []).forEach((key) => ownerByKey.set(key, index));
    });
  });
  return ownerByKey;
};

const elementForAsset = (document, asset) => {
  const selectors = asset.kind === "image"
    ? ["img[src]", "video[poster]"]
    : asset.kind === "document" || asset.kind === "link"
      ? ["a[href]"]
      : asset.kind === "video"
        ? ["video[src]", "source[src]"]
        : asset.kind === "audio"
          ? ["audio[src]", "source[src]"]
          : ["iframe[src]", "object[data]", "embed[src]"];
  return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).find((element) =>
    ["src", "href", "poster", "data"].some((attribute) => compact(element.getAttribute(attribute)) === asset.sourceValue)
  ) || null;
};

const closestOwnerIndex = (element, keyByNode, ownerByKey) => {
  if (!element) return -1;
  const descendantWalker = element.ownerDocument.createTreeWalker(element, 0x4);
  let child = descendantWalker.nextNode();
  while (child) {
    const owner = ownerByKey.get(keyByNode.get(child));
    if (Number.isInteger(owner)) return owner;
    child = descendantWalker.nextNode();
  }

  let closest = -1;
  keyByNode.forEach((key, node) => {
    if (node.compareDocumentPosition(element) & 0x4) {
      const owner = ownerByKey.get(key);
      if (Number.isInteger(owner)) closest = owner;
    }
  });
  return closest;
};

const findSectionBlock = (blocks, sectionKey, sectionLabel) => {
  const wanted = new Set([identity(sectionKey), identity(sectionLabel)].filter(Boolean));
  return blocks.findIndex((block) => wanted.has(identity(blockLabel(block))));
};

const ensureAssetSectionBlock = (blocks, sectionKey, sectionLabel) => {
  const existingIndex = findSectionBlock(blocks, sectionKey, sectionLabel);
  if (existingIndex >= 0) return existingIndex;
  const label = sectionLabel || sectionKey || "Page media";
  blocks.push({
    id: `cms-assets-${String(sectionKey || label).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`,
    label,
    value: label,
    sourceLabel: label,
    controlsSectionLabel: true,
    assetOnly: true,
    children: [],
    assets: [],
  });
  return blocks.length - 1;
};

const locateAsset = (blocks, wantedIdentity) => {
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const assetIndex = (blocks[blockIndex].assets || []).findIndex((asset) => assetIdentity(asset) === wantedIdentity);
    if (assetIndex >= 0) return { blockIndex, assetIndex, asset: blocks[blockIndex].assets[assetIndex] };
  }
  return null;
};

const ensureDataAssets = (data, pageSlug, sharedAssets = []) => {
  if (!data?.html || !Array.isArray(data.blocks)) return { data, changed: false, added: 0 };
  const blocks = structuredClone(data.blocks);
  let normalized = 0;
  blocks.forEach((block) => {
    const isDedicatedMediaSection =
      block?.assetOnly === true &&
      canonicalDivisionSection(blockLabel(block)) === "Map/Photos";
    if (isDedicatedMediaSection && block.controlsSectionLabel === false) {
      block.controlsSectionLabel = true;
      normalized += 1;
    }
  });
  if (headingsOnly) {
    return {
      data: normalized ? { ...data, blocks } : data,
      changed: normalized > 0,
      added: 0,
      removed: 0,
      moved: 0,
      normalized,
    };
  }
  const document = new JSDOM(`<!DOCTYPE html><html><body>${data.html}</body></html>`).window.document;
  const sourceAssets = extractPageAssetFieldsFromDocument(document);
  const sourceAssetIdentities = new Set(sourceAssets.map(assetIdentity));
  const sharedAssetIdentities = new Set(sharedAssets.map(assetIdentity));
  let removed = 0;
  blocks.forEach((block) => {
    if (!Array.isArray(block.assets)) return;
    block.assets = block.assets.filter((asset) => {
      const keep = asset?.isNew || !String(asset?.key || "").startsWith("asset-") || (
        sourceAssetIdentities.has(assetIdentity(asset)) && !sharedAssetIdentities.has(assetIdentity(asset))
      );
      if (!keep) removed += 1;
      return keep;
    });
  });
  const keyByNode = assignTextKeys(document);
  const ownerByKey = ownerLookup(blocks);
  const imageMetadata = new Map(
    collectPageImages(data.html, data.title).map((image) => [compact(image.src), image])
  );
  let added = 0;
  let moved = 0;
  for (const sourceAsset of sourceAssets) {
    if (sharedAssetIdentities.has(assetIdentity(sourceAsset))) continue;
    const metadata = sourceAsset.kind === "image" ? imageMetadata.get(sourceAsset.sourceValue) : null;
    const isProfileAsset = metadata?.sectionKey === "scientific-manpower" ||
      profileOnlyPages.has(pageSlug);
    if (isProfileAsset) continue;

    const element = elementForAsset(document, sourceAsset);
    const textOwnerIndex = closestOwnerIndex(element, keyByNode, ownerByKey);
    const mediaSectionIndex = ["video", "audio", "embed"].includes(sourceAsset.kind)
      ? findSectionBlock(blocks, "map-photos", "Map/Photos")
      : -1;
    const targetIndex = metadata?.sectionKey
      ? ensureAssetSectionBlock(blocks, metadata.sectionKey, metadata.sectionLabel)
      : textOwnerIndex >= 0
        ? textOwnerIndex
        : mediaSectionIndex;
    const field = {
      ...sourceAsset,
      ...(metadata?.label ? { label: metadata.label } : {}),
      ...(metadata?.sectionKey ? { sectionKey: metadata.sectionKey } : {}),
    };

    const existingAsset = locateAsset(blocks, assetIdentity(sourceAsset));
    if (existingAsset) {
      if (targetIndex >= 0 && existingAsset.blockIndex !== targetIndex) {
        blocks[existingAsset.blockIndex].assets.splice(existingAsset.assetIndex, 1);
        blocks[targetIndex].assets = [...(blocks[targetIndex].assets || []), existingAsset.asset];
        moved += 1;
      }
      continue;
    }

    if (targetIndex >= 0) {
      blocks[targetIndex].assets = [...(blocks[targetIndex].assets || []), field];
    } else {
      let fallbackIndex = blocks.findIndex((block) => block.assetOnly);
      if (fallbackIndex < 0) {
        blocks.push({
          id: "cms-page-assets",
          label: "Page images, files and links",
          value: "Page images, files and links",
          sourceLabel: "Page images, files and links",
          controlsSectionLabel: false,
          assetOnly: true,
          children: [],
          assets: [],
        });
        fallbackIndex = blocks.length - 1;
      }
      blocks[fallbackIndex].assets.push(field);
    }
    added += 1;
  }

  const compactedBlocks = blocks.filter((block) => !(
    block.assetOnly &&
    !(block.assets || []).length &&
    !(block.children || []).length
  ));
  const compacted = compactedBlocks.length !== blocks.length;
  return {
    data: added || removed || moved || normalized || compacted ? { ...data, blocks: compactedBlocks } : data,
    changed: added > 0 || removed > 0 || moved > 0 || normalized > 0 || compacted,
    added,
    removed,
    moved,
    normalized,
  };
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'pages'
        AND status <> 'archived'
      ORDER BY sort_order, entry_key`
  );
  let updated = 0;
  let added = 0;
  let removed = 0;
  let moved = 0;
  let normalized = 0;
  for (const row of rows) {
    const english = ensureDataAssets(row.data_en, row.data_en?.slug || row.entry_key);
    const englishAssets = (english.data?.blocks || []).flatMap((block) => block.assets || []);
    const hindi = ensureDataAssets(row.data_hi, row.data_en?.slug || row.entry_key, englishAssets);
    if (!english.changed && !hindi.changed) continue;
    updated += 1;
    added += english.added + hindi.added;
    removed += (english.removed || 0) + (hindi.removed || 0);
    moved += (english.moved || 0) + (hindi.moved || 0);
    normalized += (english.normalized || 0) + (hindi.normalized || 0);
    console.log(`${row.entry_key}: English +${english.added}/-${english.removed || 0}/moved ${english.moved || 0}/headings ${english.normalized || 0}, Hindi +${hindi.added}/-${hindi.removed || 0}/moved ${hindi.moved || 0}/headings ${hindi.normalized || 0}`);
    if (!dryRun) {
      await client.query(
        `UPDATE cms_entries
            SET data_en = $2::jsonb,
                data_hi = $3::jsonb,
                version = version + 1,
                updated_at = NOW()
          WHERE id = $1`,
        [row.id, JSON.stringify(english.data), JSON.stringify(hindi.data)]
      );
    }
  }
  console.log(`${dryRun ? "Would update" : "Updated"} ${updated} pages with ${added} added, ${removed} retired, ${moved} repositioned media fields and ${normalized} editable media-section headings.`);
} finally {
  await client.end();
}
