import assert from "node:assert/strict";
import {
  filterPageDisplayEditorFields,
  getSourceFieldOwnership,
  getSettingsFieldOwnership,
  pageDisplayOwnershipNotice,
  pagePathForEntry,
  sanitizePageDisplayDraft,
} from "../admin/src/pageEditorOwnership.js";

const fields = ["path", "title", "eyebrow", "intro", "headingSize", "pageFont", "hideTitle", "beforeBlocks"]
  .map((name) => ({ name, localized: ["title", "eyebrow", "intro", "beforeBlocks"].includes(name) }));
const names = (list) => list.map((field) => field.name);
const page = {
  id: "page", dataEn: { slug: "example", sectionKey: "divisions", title: "Base title" },
};
const display = {
  id: "display", status: "published",
  dataEn: { path: "/divisions/example", title: "Current heading", headingSize: "large" },
  dataHi: { title: "वर्तमान शीर्षक" },
};

assert.equal(pagePathForEntry("pages", page), "/divisions/example");
assert.deepEqual(names(filterPageDisplayEditorFields(fields, { dataEn: { path: "/divisions/example" } })), [
  "path", "hideTitle", "beforeBlocks",
]);
assert.deepEqual(names(filterPageDisplayEditorFields(fields, display, display)), [
  "path", "title", "headingSize", "hideTitle", "beforeBlocks",
]);
const clearedDraft = { ...display, dataEn: { ...display.dataEn, title: "" } };
assert.ok(names(filterPageDisplayEditorFields(fields, clearedDraft, display)).includes("title"));
const changedRoute = { ...display, dataEn: { ...display.dataEn, path: "/facilities/example" } };
assert.ok(!names(filterPageDisplayEditorFields(fields, changedRoute, display)).includes("title"));
const cleanedRoute = sanitizePageDisplayDraft(fields, changedRoute, display);
assert.equal(cleanedRoute.dataEn.path, "/facilities/example");
assert.equal(cleanedRoute.dataEn.title, undefined);
assert.equal(cleanedRoute.dataEn.headingSize, undefined);
assert.equal(cleanedRoute.dataHi.title, undefined);
assert.equal(changedRoute.dataEn.title, "Current heading");
assert.deepEqual(sanitizePageDisplayDraft(fields, display, display), display);
assert.equal(sanitizePageDisplayDraft(fields, clearedDraft, display).dataEn.title, "");
const groupDraft = { dataEn: { path: "/divisions/*", title: "Stale title", headingSize: "large", hideTitle: true } };
const cleanedGroup = sanitizePageDisplayDraft(fields, groupDraft);
assert.equal(cleanedGroup.dataEn.title, undefined);
assert.equal(cleanedGroup.dataEn.headingSize, undefined);
assert.equal(cleanedGroup.dataEn.hideTitle, true);
assert.equal(getSourceFieldOwnership("pages", page, "title", [display]).entryId, "display");
assert.equal(getSourceFieldOwnership("pages", page, "title", [display], "hi").field, "title");
assert.equal(getSourceFieldOwnership("pages", page, "summary", [display]), null);
assert.equal(getSourceFieldOwnership("pages", page, "title", [{ ...display, status: "draft" }]), null);

const group = { id: "group", status: "published", dataEn: { path: "/divisions/*", headingSize: "compact" } };
assert.equal(getSourceFieldOwnership("pages", page, "headingSize", [group]).entryId, "group");
const exact = { ...display, dataEn: { path: "/divisions/example" } };
assert.equal(getSourceFieldOwnership("pages", page, "headingSize", [group, exact]), null);

// Static pages have canonical Settings text but no page-owned layout controls.
const gallery = { id: "gallery-display", status: "published", dataEn: { path: "/gallery", title: "Gallery heading" } };
assert.deepEqual(names(filterPageDisplayEditorFields(fields, gallery, gallery)), [
  "path", "title", "headingSize", "pageFont", "hideTitle", "beforeBlocks",
]);
assert.deepEqual(names(filterPageDisplayEditorFields(fields, { dataEn: { path: "/rti" } })), [
  "path", "headingSize", "pageFont", "hideTitle", "beforeBlocks",
]);
// Missing canonical inputs must not leave a static heading without an editor.
assert.deepEqual(names(filterPageDisplayEditorFields(fields, { dataEn: { path: "/contact" } })), names(fields));
assert.deepEqual(names(filterPageDisplayEditorFields(fields, { dataEn: { path: "/objectives" } })), [
  "path", "eyebrow", "intro", "headingSize", "pageFont", "hideTitle", "beforeBlocks",
]);
assert.ok(names(filterPageDisplayEditorFields(fields, { dataEn: { path: "/feedback" } })).includes("intro"));
assert.ok(names(filterPageDisplayEditorFields(fields, { dataEn: { path: "/privacy-policy" } })).includes("eyebrow"));
assert.equal(getSourceFieldOwnership("public_info", { dataEn: { slug: "feedback" } }, "summary", [
  { dataEn: { path: "/feedback", intro: "Page intro" } },
]), null);
assert.equal(getSettingsFieldOwnership("pageContent.gallery.title", [gallery]).reused, true);
assert.equal(getSettingsFieldOwnership("pageContent.gallery.intro", [gallery]), null);
assert.equal(getSettingsFieldOwnership("footer.contactHeading", [gallery]), null);
assert.deepEqual(names(filterPageDisplayEditorFields(fields, { dataEn: { path: "/a-new-route" } })), names(fields));
assert.match(pageDisplayOwnershipNotice(display), /Division Pages and Sections/u);

// Ownership calculation must not remove legacy values or mutate saved content.
const original = JSON.stringify(display);
filterPageDisplayEditorFields(fields, display, display);
getSourceFieldOwnership("pages", page, "title", [display]);
assert.equal(JSON.stringify(display), original);
console.log("CMS editor ownership policy passed: canonical page fields, retained overrides, language, exact/group priority, route changes, static/public routes, and immutability.");
