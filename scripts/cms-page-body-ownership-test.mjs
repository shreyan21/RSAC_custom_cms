import assert from "node:assert/strict";
import { pageBodyOwnerForEntry, resolveOwnedPageBody, resolvePageBodyRows } from "../shared/pageBodyOwnership.js";

const canonicalKey = "school-of-geo-informatics-division1";
const aliasKey = "school-of-geo-informatics-";
const owner = {
  id: "division-page", collection: "pages", entry_key: canonicalKey, sort_order: 10,
  data_en: {
    title: "Division heading", slug: canonicalKey, sectionKey: "divisions",
    headingSize: "large", sectionContentVersion: 2, html: "",
    blocks: [
      { id: "body", sourceLabel: "Course", contentHtml: "<p>Shared course</p>", assets: [
        { key: "same-key", kind: "link", sourceValue: "https://first.example", value: "https://first.example", hidden: true },
        { key: "same-key", kind: "link", sourceValue: "https://second.example", value: "https://second.example", hidden: false },
        { key: "photo", kind: "image", sourceValue: "/old-photo.jpg", value: "/new-photo.jpg", hidden: false },
      ] },
      { id: "people", sourceLabel: "Scientific Manpower", contentHtml: "", children: [
        { key: "profile-content:e-142", richText: "<p>Unique division profile information</p>" },
      ] },
    ],
  },
  data_hi: {
    title: "विभाग", blocks: [{ id: "body", sourceLabel: "Course", contentHtml: "<p>हिन्दी पाठ</p>", assets: [] }],
  },
};
const route = {
  id: "academic-page", collection: "pages", entry_key: aliasKey, sort_order: 0, version: 31,
  data_en: {
    title: "Academic heading", summary: "Route introduction", slug: aliasKey,
    sectionKey: "academics", headingSize: "compact", sourceUrl: "https://source.example/academic",
    html: "Old source", blocks: [{ id: "body", sourceLabel: "Course", contentHtml: "<p>Old academic body</p>", assets: [
      { key: "same-key", kind: "link", sourceValue: "https://first.example", value: "https://first.example", hidden: false },
      { key: "same-key", kind: "link", sourceValue: "https://second.example", value: "https://second.example", hidden: true },
      { key: "photo", kind: "image", sourceValue: "/old-photo.jpg", value: "/old-photo.jpg", hidden: false },
      { key: "unique", kind: "image", sourceValue: "/unique-route-photo.jpg", value: "/unique-route-photo.jpg" },
    ] }],
  },
  data_hi: {
    title: "शैक्षणिक पृष्ठ", blocks: [{ id: "body", sourceLabel: "Course", contentHtml: "<p>पुराना पाठ</p>", assets: [] }],
  },
};
const profile = { id: "profile", collection: "profiles", entry_key: "e-142" };
const input = [route, owner, profile];
const original = JSON.stringify(input);
const resolved = resolvePageBodyRows(input);
const academic = resolved.find((row) => row.entry_key === aliasKey);
assert.equal(academic.data_en.blocks[0].contentHtml, "<p>Shared course</p>");
assert.equal(academic.data_hi.blocks[0].contentHtml, "<p>हिन्दी पाठ</p>");
assert.equal(academic.data_en.title, "Academic heading");
assert.equal(academic.data_hi.title, "शैक्षणिक पृष्ठ");
assert.equal(academic.data_en.summary, "Route introduction");
assert.equal(academic.data_en.slug, aliasKey);
assert.equal(academic.data_en.sectionKey, "academics");
assert.equal(academic.data_en.headingSize, "compact");
assert.equal(academic.sort_order, 0);
assert.equal(academic.version, 31);
assert.equal(academic.data_en.sourceUrl, "https://source.example/academic");
assert.equal(academic.data_en.blocks[0].assets[0].hidden, false);
assert.equal(academic.data_en.blocks[0].assets[1].hidden, true);
assert.equal(academic.data_en.blocks[0].assets[2].value, "/new-photo.jpg");
assert.equal(academic.data_en.blocks[0].assets.length, 3);
const explicitRoutePhoto = route.data_en.blocks[0].assets[3];
const retainedException = resolveOwnedPageBody(owner.data_en, route.data_en, { routeOnlyAssets: [explicitRoutePhoto] });
assert.ok(retainedException.blocks[0].assets.some((asset) => asset.value === "/unique-route-photo.jpg"));
assert.equal(academic.data_en.blocks[1].children[0].key, "profile-content:e-142");
assert.equal(academic.data_en.bodyOwnerKey, canonicalKey);
assert.equal(academic.data_en.bodyOwnerSlug, canonicalKey);
assert.equal(academic.data_hi.bodyOwnerSlug, canonicalKey);
assert.equal(JSON.stringify(input), original);
assert.equal(resolved[1], owner);
assert.equal(resolved[2], profile);
assert.deepEqual(resolvePageBodyRows(resolved), resolved);

// Saving the owner alone changes both bodies; aliases need no database writes.
const editedOwner = structuredClone(owner);
editedOwner.data_en.blocks[0].contentHtml = "<p>New shared course</p>";
editedOwner.data_en.blocks[0].assets.push({ key: "new-photo", kind: "image", value: "/latest-photo.jpg" });
const refreshed = resolvePageBodyRows([route, editedOwner]).find((row) => row.entry_key === aliasKey);
assert.equal(refreshed.data_en.blocks[0].contentHtml, "<p>New shared course</p>");
assert.ok(refreshed.data_en.blocks[0].assets.some((asset) => asset.value === "/latest-photo.jpg"));
assert.equal(refreshed.data_en.blocks[0].assets[0].hidden, false);
const ownerAfterDeletion = structuredClone(owner);
ownerAfterDeletion.data_en.blocks[0].assets = ownerAfterDeletion.data_en.blocks[0].assets.filter((asset) => asset.key !== "photo");
const aliasAfterDeletion = resolvePageBodyRows([route, ownerAfterDeletion]).find((row) => row.entry_key === aliasKey);
assert.ok(!aliasAfterDeletion.data_en.blocks[0].assets.some((asset) => asset.key === "photo"));
assert.equal(resolvePageBodyRows([route, profile]).some((row) => row.entry_key === aliasKey), false);
assert.equal(pageBodyOwnerForEntry({ entryKey: "training-division-" }).ownerKey, "training-division");
assert.equal(pageBodyOwnerForEntry({ entryKey: "unrelated" }), null);
console.log("Page body ownership candidate passed: one canonical body, bilingual sharing, independent route metadata/link visibility, media/profile retention, updates, publication removal, immutability, and idempotence.");
