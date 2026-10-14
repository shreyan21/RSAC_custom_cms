import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { File } from "node:buffer";
import { JSDOM } from "jsdom";
import { transformWithOxc } from "vite";

// This suite uses the actual editor with deferred in-memory uploads. It never
// contacts an API, writes a database, or creates uploaded files.
process.env.NODE_ENV = "test";
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost:5194" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const { createElement, Fragment, useState, act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { isImageMediaField, supportedImageTypes, uploadMediaFile } = await import("../admin/src/mediaUpload.js");
const { default: usePendingOperations } = await import("../admin/src/usePendingOperations.js");
const { default: useEditorValidation } = await import("../admin/src/useEditorValidation.js");
const moduleUrl = new URL("../admin/src/ImportedAssetEditor.jsx", import.meta.url);
let source = (await transformWithOxc(await readFile(moduleUrl, "utf8"), moduleUrl.pathname)).code;
const apiStub = `data:text/javascript,${encodeURIComponent("export const api = (...args) => globalThis.__cmsUploadRequest(...args); export const mediaPreviewUrl = value => value;")}`;
for (const [specifier, target] of [
  ["react", import.meta.resolve("react")],
  ["react/jsx-runtime", import.meta.resolve("react/jsx-runtime")],
  ["lucide-react", import.meta.resolve("lucide-react")],
  ["./api", apiStub],
  ["./mediaUpload", new URL("../admin/src/mediaUpload.js", import.meta.url).href],
]) source = source.replaceAll(`"${specifier}"`, JSON.stringify(target));
const { default: ImportedAssetEditor } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const emptyEditor = `data:text/javascript,${encodeURIComponent("export default function Editor(){return null}")}`;
async function loadEditor(relativePath, extraImports) {
  const target = new URL(relativePath, import.meta.url);
  let code = (await transformWithOxc(await readFile(target, "utf8"), target.pathname)).code;
  for (const [specifier, replacement] of [
    ["react", import.meta.resolve("react")], ["react/jsx-runtime", import.meta.resolve("react/jsx-runtime")],
    ["lucide-react", import.meta.resolve("lucide-react")], ["./api", apiStub],
    ["./mediaUpload", new URL("../admin/src/mediaUpload.js", import.meta.url).href],
    ["../../shared/cmsCollections", new URL("../shared/cmsCollections.js", import.meta.url).href],
    ["./SectionRichTextEditor", emptyEditor], ...extraImports,
  ]) code = code.replaceAll(`"${specifier}"`, JSON.stringify(replacement));
  return import(`data:text/javascript,${encodeURIComponent(code)}`);
}

const { readPublishedProfiles } = await loadEditor("../admin/src/publishedProfilesClient.js", []);
const publicRequests = [];
const publicProfiles = await readPublishedProfiles(async path => {
  publicRequests.push(path);
  return { data: path.endsWith("lang=en")
    ? [{ id: "published-scientist", key: "e-142", profileType: "scientist", name: "Published scientist", photo: "/shared-photo.png", deployment: "School of Geo-Informatics" }]
    : [{ id: "published-scientist", name: "प्रकाशित वैज्ञानिक" }] };
});
assert.deepEqual(publicRequests.sort(), ["/api/content/profiles?lang=en", "/api/content/profiles?lang=hi"]);
assert.equal(publicProfiles[0].entryKey, "e-142");
assert.equal(publicProfiles[0].status, "published");
assert.equal(publicProfiles[0].dataEn.photo, "/shared-photo.png");
assert.equal(publicProfiles[0].dataEn.deployment, "School of Geo-Informatics");
assert.equal(publicProfiles[0].dataHi.name, "प्रकाशित वैज्ञानिक");

const pending = [];
const errors = [];
const busy = [];
globalThis.__cmsUploadRequest = (path, options) => {
  assert.equal(path, "/api/admin/media");
  assert.equal(options.method, "POST");
  assert.equal(options.body.get("purpose"), "image");
  return new Promise((resolve) => pending.push({ resolve, file: options.body.get("file") }));
};
const originals = [
  { key: "first-photo", kind: "image", label: "First portrait", value: "/first.png", alt: "Initial description", title: "Initial caption" },
  { key: "second-photo", kind: "image", label: "Second portrait", value: "/second.png", alt: "Second description", title: "Second caption" },
];
let assets;
let setAssets;
let isPending;
let published = 0;
function Fixture() {
  [assets, setAssets] = useState(originals);
  const [operationBusy, setOperationBusy, checkPending] = usePendingOperations();
  isPending = checkPending;
  return createElement(Fragment, null,
    createElement("button", { id: "publish", disabled: operationBusy, onClick: () => { if (!checkPending()) published += 1; } }, "Publish"),
    createElement(ImportedAssetEditor, { assets, onChange: setAssets, onBusy: (value) => { busy.push(value); setOperationBusy(value); }, onError: (value) => errors.push(value) })
  );
}
const root = createRoot(document.getElementById("root"));
await act(async () => root.render(createElement(Fixture)));
const fileInput = (index) => document.querySelectorAll("input[type=file]")[index];
const imageFile = (name = "portrait.png", type = "image/png") => new File(["test image"], name, { type });
const choose = async (index, file) => act(async () => {
  const input = fileInput(index);
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
});
const complete = async (index, address) => act(async () => {
  pending[index].resolve({ data: { public_url: address } });
});

// Changing metadata while two files are uploading used to get overwritten by
// each request's captured copy of the entire asset list.
await choose(0, imageFile("first.png"));
await choose(1, imageFile("second.png"));
assert.equal(document.getElementById("publish").disabled, true);
assert.equal(isPending(), true);
document.getElementById("publish").click();
assert.equal(published, 0);
await act(async () => setAssets((current) => current.map((asset, index) => index === 0 ? { ...asset, title: "Edited during upload", alt: "Updated description" } : asset)));
await complete(0, "/uploads/first-new.png");
assert.equal(assets[0].title, "Edited during upload");
assert.equal(assets[0].alt, "Updated description");
assert.equal(assets[0].value, "/uploads/first-new.png");
assert.equal(document.getElementById("publish").disabled, true, "First completion unlocked Publish with a second upload pending");
assert.equal(isPending(), true);
await complete(1, "/uploads/second-new.png");
assert.equal(assets[0].value, "/uploads/first-new.png");
assert.equal(assets[1].value, "/uploads/second-new.png");
assert.deepEqual(busy, [true, true, false, false]);
assert.equal(document.getElementById("publish").disabled, false);
assert.equal(isPending(), false);

// Inserting and reordering rows cannot change which asset receives the file.
await choose(0, imageFile("moved.png"));
await act(async () => setAssets((current) => [current[1], { key: "new-photo", kind: "image", value: "", label: "New photo", isNew: true }, current[0]]));
await complete(2, "/uploads/moved.png");
assert.equal(assets.find((asset) => asset.key === "first-photo").value, "/uploads/moved.png");
assert.equal(assets.find((asset) => asset.key === "new-photo").value, "");

// A superseded request must not replace a newer selection for the same photo.
await choose(0, imageFile("older.png"));
await choose(0, imageFile("newer.png"));
await complete(4, "/uploads/newer.png");
assert.equal(isPending(), true, "Superseding a request must retain its pending slot until completion");
await complete(3, "/uploads/older.png");
assert.equal(assets[0].value, "/uploads/newer.png");
assert.equal(isPending(), false);

// Removing an asset during upload must keep it removed after completion.
await choose(0, imageFile("removed.png"));
await act(async () => document.querySelector(".imported-asset-row .danger-icon").click());
assert.equal(document.getElementById("publish").disabled, true);
assert.equal(isPending(), true);
await complete(5, "/uploads/removed.png");
assert.equal(assets.find((asset) => asset.key === "second-photo").hidden, true);
assert.equal(assets.find((asset) => asset.key === "second-photo").value, "/uploads/newer.png");
assert.equal(isPending(), false, "Unmounted asset completion failed to release its original pending slot");
assert.equal(document.getElementById("publish").disabled, false);

const requestCount = pending.length;
await choose(0, new File(["%PDF"], "not-a-photo.pdf", { type: "application/pdf" }));
await choose(0, imageFile("unsupported.bmp", "image/bmp"));
assert.equal(pending.length, requestCount);
assert.equal(errors.length, 2);
assert.match(errors[0], /JPG, PNG/);
assert.equal(assets.find((asset) => asset.key === "new-photo").value, "");

// Manually clearing/replacing a selection takes precedence over an older upload.
await choose(0, imageFile("manual-selection.png"));
await act(async () => setAssets((current) => current.map((asset) => asset.key === "new-photo" ? { ...asset, value: "/uploads/manual-selection.png" } : asset)));
await complete(6, "/uploads/obsolete-selection.png");
assert.equal(assets.find((asset) => asset.key === "new-photo").value, "/uploads/manual-selection.png");

const { default: BlockEditor } = await loadEditor("../admin/src/BlockEditor.jsx", [
  ["../../shared/importedEditorRows", new URL("../shared/importedEditorRows.js", import.meta.url).href],
  ["./ImportedAssetEditor", emptyEditor], ["./InlineRichTextEditor", emptyEditor],
]);
let blocks;
let setBlocks;
function BlockFixture() {
  [blocks, setBlocks] = useState([{ id: "gallery-block", type: "gallery", items: ["/old.png"] }]);
  return createElement(BlockEditor, { value: blocks, onChange: setBlocks, onBusy: (value) => busy.push(value), onError: (value) => errors.push(value) });
}
await act(async () => root.render(createElement(BlockFixture)));
await act(async () => document.querySelector(".block-toggle").click());
assert.equal(document.querySelector(".block-media-field__selection span").textContent, "old.png", "Legacy gallery URL was not shown in the editor");
await choose(0, imageFile("gallery.png"));
const galleryIdentity = blocks[0].items[0].id;
assert.ok(galleryIdentity, "Legacy gallery item did not receive a stable upload identity");
await act(async () => setBlocks((current) => [{ ...current[0], items: [{ id: "new-gallery-photo", url: "", caption: "New photo" }, { ...current[0].items[0], caption: "Edited gallery caption" }] }]));
await complete(7, "/uploads/gallery.png");
assert.equal(blocks[0].items.find((item) => item.id === galleryIdentity).url, "/uploads/gallery.png");
assert.equal(blocks[0].items.find((item) => item.id === galleryIdentity).caption, "Edited gallery caption");
assert.equal(blocks[0].items[0].url, "");

const { default: FieldInput } = await loadEditor("../admin/src/FieldInput.jsx", [
  ["./BlockEditor", emptyEditor],
  ["./pageEditorOwnership", new URL("../admin/src/pageEditorOwnership.js", import.meta.url).href],
  ["../../src/data/uiLabels", new URL("../src/data/uiLabels.js", import.meta.url).href],
  ["./settingsGroupLabels", new URL("../admin/src/settingsGroupLabels.js", import.meta.url).href],
]);
let settings;
let setSettings;
function SettingsFixture() {
  [settings, setSettings] = useState({ hero: { leaders: [{ name: "First leader", image: "/leader.png" }] } });
  return createElement(FieldInput, { field: { name: "settings", type: "json", settingsGroupFilter: ["Homepage hero"] }, value: settings, onChange: setSettings, onBusy: (value) => busy.push(value), onError: (value) => errors.push(value) });
}
await act(async () => root.render(createElement(SettingsFixture)));
await choose(0, imageFile("leader.png"));
const leaderIdentity = settings.hero.leaders[0].id;
assert.ok(leaderIdentity, "Legacy settings row did not receive a stable upload identity");
await act(async () => setSettings((current) => ({ ...current, hero: { ...current.hero, title: "Edited heading", leaders: [{ id: "new-leader", name: "New leader", image: "" }, { ...current.hero.leaders[0], name: "Edited leader" }] } })));
await complete(8, "/uploads/leader-new.png");
assert.equal(settings.hero.leaders.find((item) => item.id === leaderIdentity).image, "/uploads/leader-new.png");
assert.equal(settings.hero.leaders.find((item) => item.id === leaderIdentity).name, "Edited leader");
assert.equal(settings.hero.title, "Edited heading");
assert.equal(settings.hero.leaders[0].image, "");

const pageDisplayEntries = [{ id: "sitemap-heading", status: "published", dataEn: { path: "/sitemap", title: "Active sitemap heading" } }];
await act(async () => root.render(createElement(FieldInput, { field: { name: "settings", type: "json", settingsGroupFilter: ["Sitemap page"], pageDisplayEntries }, value: { pageContent: { sitemap: { title: "Overridden heading" } } }, onChange: () => assert.fail("Owned heading must remain read-only") })));
const ownedHeading = Array.from(document.querySelectorAll("input")).find((input) => input.value === "Active sitemap heading");
assert.ok(ownedHeading?.readOnly, "Overridden settings heading still has a duplicate editor");
assert.match(document.body.textContent, /Edit this page heading in Page Headings and Subheadings/);

let photo;
let setPhoto;
function PhotoFixture() {
  [photo, setPhoto] = useState("/uploads/existing-photo.png");
  const [operationBusy, setOperationBusy, checkPending] = usePendingOperations();
  isPending = checkPending;
  return createElement(Fragment, null,
    createElement("button", { id: "publish", disabled: operationBusy }, "Publish"),
    createElement(FieldInput, { field: { name: "photo", type: "media" }, value: photo, onChange: setPhoto, onBusy: setOperationBusy, onError: (value) => errors.push(value) })
  );
}
await act(async () => root.render(createElement(PhotoFixture)));
const clearedUpload = pending.length;
await choose(0, imageFile("cleared-photo.png"));
await act(async () => document.querySelector(".media-field__actions .danger-icon").click());
assert.equal(photo, "");
assert.equal(document.getElementById("publish").disabled, true);
await complete(clearedUpload, "/uploads/cleared-photo.png");
assert.equal(photo, "", "An in-flight upload undid the user's Remove selected file action");
assert.equal(isPending(), false);
assert.equal(document.getElementById("publish").disabled, false);

const manualUpload = pending.length;
await choose(0, imageFile("manual-photo.png"));
await act(async () => setPhoto("/uploads/manually-selected.png"));
await complete(manualUpload, "/uploads/manual-photo.png");
assert.equal(photo, "/uploads/manually-selected.png");
assert.equal(isPending(), false);

const restoredUpload = pending.length;
await choose(0, imageFile("abandoned-photo.png"));
await act(async () => setPhoto(""));
await act(async () => setPhoto("/uploads/manually-selected.png"));
await complete(restoredUpload, "/uploads/abandoned-photo.png");
assert.equal(photo, "/uploads/manually-selected.png", "Clearing and restoring a selection must still invalidate the abandoned upload");

const savedJson = [];
let jsonDraft;
let jsonInvalid;
let hideJson;
function JsonFixture({ settingsMode = false }) {
  const [value, setValue] = useState({ title: "Stored JSON" });
  const { hasErrors: invalid, isInvalid, setFieldValidation } = useEditorValidation();
  const setInvalid = value => setFieldValidation("json", value);
  const [visible, setVisible] = useState(true);
  jsonDraft = value;
  jsonInvalid = invalid;
  hideJson = () => setVisible(false);
  return createElement(Fragment, null,
    createElement("button", { id: "publish", disabled: invalid, onClick: () => { if (!isInvalid()) savedJson.push(value); } }, "Publish"),
    createElement("button", { id: "cancel", onClick: hideJson }, "Cancel"),
    visible && createElement(FieldInput, { field: { name: settingsMode ? "settings" : "configuration", label: "Editor JSON", type: "json" }, value, onChange: setValue, onValidationChange: setInvalid, onError: () => {} })
  );
}
const typeJson = async (text) => act(async () => {
  const textarea = document.querySelector("textarea.code-input");
  textarea.focus();
  Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value").set.call(textarea, text);
  textarea.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
});
await act(async () => root.render(createElement(JsonFixture)));
await typeJson('{"title":');
assert.equal(jsonInvalid, true);
assert.equal(document.getElementById("publish").disabled, true);
assert.equal(document.getElementById("cancel").disabled, false);
assert.equal(document.querySelector("textarea.code-input").getAttribute("aria-invalid"), "true");
assert.match(document.querySelector(".json-editor [role=alert]").textContent, /invalid JSON/);
document.getElementById("publish").click();
assert.equal(savedJson.length, 0, "Invalid visible JSON silently published the previous stored object");
assert.deepEqual(jsonDraft, { title: "Stored JSON" });
await typeJson('{"title":"Updated JSON"}');
assert.equal(jsonInvalid, false);
assert.deepEqual(jsonDraft, { title: "Updated JSON" });
document.getElementById("publish").click();
assert.deepEqual(savedJson, [{ title: "Updated JSON" }]);
await typeJson('{');
assert.equal(jsonInvalid, true);
await act(async () => document.getElementById("cancel").click());
assert.equal(jsonInvalid, false, "Unmounting invalid JSON failed to clear its field validation slot");
assert.equal(document.getElementById("publish").disabled, false);

await act(async () => root.render(createElement(JsonFixture, { key: "settings-json", settingsMode: true })));
await typeJson('{"hero":');
assert.equal(jsonInvalid, true, "Settings Advanced technical JSON did not report invalid syntax");
await typeJson('{"hero":{"title":"Valid homepage"}}');
assert.equal(jsonInvalid, false);
assert.deepEqual(jsonDraft, { hero: { title: "Valid homepage" } });

for (const type of supportedImageTypes) {
  assert.equal(await uploadMediaFile(imageFile("image", type), { imageOnly: true, request: async () => ({ data: { public_url: "/uploads/supported-image" } }) }), "/uploads/supported-image");
}
for (const type of ["application/pdf", "video/mp4", "image/bmp", "image/tiff", "image/heic", ""]) {
  await assert.rejects(uploadMediaFile(imageFile("rejected", type), { imageOnly: true, request: () => assert.fail("Invalid image reached API") }), /Choose a JPG/);
}
for (const name of ["photo", "featuredImage", "thumbnail", "poster", "branding.logo"]) assert.equal(isImageMediaField({ name }), true);
for (const name of ["documentUrl", "url", "video"]) assert.equal(isImageMediaField({ name }), false);
assert.equal(await uploadMediaFile(new File(["%PDF"], "report.pdf", { type: "application/pdf" }), { request: async () => ({ data: { public_url: "/uploads/report.pdf" } }) }), "/uploads/report.pdf");
await act(async () => root.unmount());
dom.window.close();
delete globalThis.__cmsUploadRequest;
console.log("Upload editor regressions passed: real imported-assets, gallery, settings and profile-photo controls; overlapping-operation Publish lock; unmounted-slot release; metadata; reorder/insert; latest/manual/cleared selection; removal; supported image/document types; and heading ownership. No live API or database was used.");
