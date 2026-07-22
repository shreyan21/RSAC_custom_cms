import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing. Run npm run cms:setup.");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.CMS_DATABASE_URL });
const apply = process.argv.includes("--apply");
const pageSections = new Set(["divisions", "facilities", "academics"]);
const placeholderPattern = /^(?:content (?:will be )?available soon|content available shortly|\u0935\u093f\u0937\u092f\u0935\u0938\u094d\u0924\u0941 \u0936\u0940\u0918\u094d\u0930 \u0939\u0940 \u0909\u092a\u0932\u092c\u094d\u0927 \u0939\u094b \u091c\u093e\u090f\u0917\u0940|\u0938\u093e\u092e\u0917\u094d\u0930\u0940 \u0936\u0940\u0918\u094d\u0930 \u0909\u092a\u0932\u092c\u094d\u0927 \u0939\u094b\u0917\u0940)[.!\u0964]*$/iu;
const genericMediaHeadingPattern = /^(?:related\s+(?:photos?|pictures?)|\u0938\u0902\u092c\u0902\u0927\u093f\u0924\s+(?:\u0924\u0938\u094d\u0935\u0940\u0930\u0947\u0902|\u092b\u094b\u091f\u094b))$/iu;

const normalize = (value) => String(value || "")
  .replace(/&amp;/giu, "&")
  .replace(/[^a-z0-9\p{Script=Devanagari}]+/giu, " ")
  .trim()
  .toLowerCase();

const isMediaSection = (block) => /map\s*\/?\s*photos|\u092e\u093e\u0928\u091a\u093f\u0924\u094d\u0930|\u0924\u0938\u094d\u0935\u0940\u0930/iu.test(
  `${block?.sourceLabel || ""} ${block?.value || ""} ${block?.label || ""}`
);

const cleanMediaHtml = (html, pageTitle) => {
  if (!String(html || "").trim()) return "";
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const { document } = dom.window;
  const titleTokens = new Set(normalize(pageTitle).split(" ").filter(Boolean));
  document.body.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const text = normalize(heading.textContent);
    const tokens = text.split(" ").filter(Boolean);
    const pageTitleMatch = tokens.length >= 3
      && tokens.filter((token) => titleTokens.has(token)).length >= 3;
    if (!text || genericMediaHeadingPattern.test(text) || pageTitleMatch) heading.remove();
  });
  if (Array.from(document.body.children).some((element) => !/^H[1-6]$/u.test(element.tagName))) {
    return "";
  }
  const remainingText = document.body.textContent.replace(/\s+/gu, " ").trim();
  if (placeholderPattern.test(remainingText)) return "";
  return document.body.innerHTML.trim();
};

const { rows } = await pool.query(
  `SELECT id, entry_key, data_en, data_hi
     FROM cms_entries
    WHERE collection='pages'
      AND status='published'
    ORDER BY entry_key`
);

let entriesChanged = 0;
let sectionsChanged = 0;
for (const row of rows) {
  const nextEn = structuredClone(row.data_en || {});
  const nextHi = structuredClone(row.data_hi || {});
  if (!pageSections.has(String(nextEn.sectionKey || ""))) continue;
  let changed = false;
  for (const data of [nextEn, nextHi]) {
    data.blocks = (data.blocks || []).map((block) => {
      if (!isMediaSection(block) || !Object.hasOwn(block || {}, "contentHtml")) return block;
      const contentHtml = cleanMediaHtml(block.contentHtml, data.title || nextEn.title || "");
      if (contentHtml === String(block.contentHtml || "")) return block;
      changed = true;
      sectionsChanged += 1;
      return { ...block, contentHtml };
    });
  }
  if (!changed) continue;
  entriesChanged += 1;
  if (apply) {
    await pool.query(
      `UPDATE cms_entries
          SET data_en=$1, data_hi=$2, version=version+1, updated_at=NOW()
        WHERE id=$3`,
      [nextEn, nextHi, row.id]
    );
  }
}

await pool.end();
console.log(`${apply ? "Cleaned" : "Would clean"} ${sectionsChanged} media sections across ${entriesChanged} pages.`);
