import assert from "node:assert/strict";
import { resolveCanonicalSectionPresentation } from "../src/data/canonicalSectionPresentation.js";

const customBlock = (overrides = {}) => ({
  id: "cms-section-test",
  value: "",
  sourceLabel: "New section",
  contentHtml: "",
  assets: [],
  ...overrides,
});

assert.equal(
  resolveCanonicalSectionPresentation(customBlock({ contentHtml: "<p></p>" }), 0, "en", { tabbed: true }),
  null,
  "An empty editor paragraph must not create a website tab."
);

assert.equal(
  resolveCanonicalSectionPresentation(customBlock(), 0, "hi", { tabbed: true }),
  null,
  "An empty Hindi custom section must not display its English source label."
);

assert.equal(
  resolveCanonicalSectionPresentation(
    customBlock({ value: "New research section" }),
    1,
    "en",
    { tabbed: true }
  )?.label,
  "New research section",
  "A heading-only custom section must remain visible."
);

assert.equal(
  resolveCanonicalSectionPresentation(
    customBlock({ contentHtml: "<p>Visible English content</p>" }),
    2,
    "en",
    { tabbed: true }
  )?.label,
  "Section 3",
  "A body-only English custom section must receive a stable visible tab label."
);

assert.equal(
  resolveCanonicalSectionPresentation(
    customBlock({ contentHtml: "<p>दिखाई देने वाली सामग्री</p>" }),
    2,
    "hi",
    { tabbed: true }
  )?.label,
  "अनुभाग 3",
  "A body-only Hindi custom section must receive a Hindi tab label."
);

assert.equal(
  resolveCanonicalSectionPresentation(
    customBlock({ assets: [{ type: "image", value: "/official-media/test.jpg" }] }),
    3,
    "en",
    { tabbed: true }
  )?.hasMedia,
  true,
  "A media-only custom section must remain visible."
);

assert.equal(
  resolveCanonicalSectionPresentation({
    id: "imported-section",
    value: "",
    sourceLabel: "Overview",
    contentHtml: "<p>Imported facility content</p>",
    assets: [],
  }, 0)?.heading,
  "",
  "Imported facility body content must render without forcing a duplicate heading."
);

console.log("Canonical section rendering passed for empty, heading-only, body-only, media-only, English, and Hindi blocks.");
