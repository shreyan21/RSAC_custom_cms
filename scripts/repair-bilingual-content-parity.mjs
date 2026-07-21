import { config as loadEnv } from "dotenv";
import { JSDOM } from "jsdom";
import pg from "pg";
import {
  applyPageTextFields,
  extractPageTextFields,
} from "../src/data/pageTextFields.js";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL missing.");

const clone = (value) => structuredClone(value || {});
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const directChildren = (data) => (data.blocks || []).flatMap((block) =>
  Array.isArray(block.children) ? block.children : []
);

const childByKey = (data, key) => directChildren(data).find((child) => child.key === key);

const setChildValue = (data, key, value) => {
  for (const block of data.blocks || []) {
    if (!Array.isArray(block.children)) continue;
    block.children = block.children.map((child) => child.key === key ? { ...child, value } : child);
  }
};

const setChildLabel = (data, key, label) => {
  for (const block of data.blocks || []) {
    if (!Array.isArray(block.children)) continue;
    block.children = block.children.map((child) => child.key === key ? { ...child, label } : child);
  }
};

const markStructuralChild = (data, key) => {
  for (const block of data.blocks || []) {
    if (!Array.isArray(block.children)) continue;
    block.children = block.children.map((child) => child.key === key
      ? { ...child, hidden: false, structural: true, editorVisible: false }
      : child);
  }
};

const rebuildHindiHtml = (dataEn, dataHi, overrides = {}) => {
  const values = new Map(directChildren(dataHi).map((child) => [child.key, child.value]));
  const translatedFields = extractPageTextFields(dataEn.html).map((field) => ({
    ...field,
    value: Object.hasOwn(overrides, field.key)
      ? overrides[field.key]
      : values.get(field.key) ?? field.value,
  }));
  dataHi.html = applyPageTextFields(dataEn.html, translatedFields);

  const repairedLabels = new Map(extractPageTextFields(dataHi.html).map((field) => [field.key, field.label]));
  for (const block of dataHi.blocks || []) {
    if (!Array.isArray(block.children)) continue;
    block.children = block.children.map((child) => repairedLabels.has(child.key)
      ? { ...child, label: repairedLabels.get(child.key) }
      : child
    );
  }
};

const repairRti = (dataEn) => {
  const sections = Array.isArray(dataEn.sections) ? [...dataEn.sections] : [];
  if (!sections[1]) throw new Error("RTI officer section is missing.");
  sections[1] = {
    ...sections[1],
    heading: "Public Information and Appellate Officers",
    body: "RTI matters at RSAC-UP are handled by the following designated officers under the Right to Information Act, 2005:",
    address: "Remote Sensing Applications Centre, U.P., Sector-G, Jankipuram, Kursi Road, Lucknow-226021. Phone: 0522-2730451.",
    officers: [
      { name: "Shri Sushil Chandra", post: "First Appellate Authority", phone: "+91-8765977653" },
      { name: "Dr. Anil Kumar", post: "Public Information Officer", phone: "+91-8765977669" },
      { name: "Shri Ramakant", post: "Assistant Public Information Officer", phone: "+91-8765977643" },
    ],
  };
  dataEn.sections = sections;
};

const repairTender = (dataEn) => {
  const sections = Array.isArray(dataEn.sections) ? [...dataEn.sections] : [];
  if (!sections[1]) throw new Error("Tender portal section is missing.");
  sections[1] = { ...sections[1], actionLabel: "Open e-Tender Portal" };
  dataEn.sections = sections;
};

const repairSoilLab = (dataEn, dataHi) => {
  const heading = childByKey(dataHi, "text-0001")?.value || "मृदा विश्लेषण प्रयोगशाला";
  const overview = (dataHi.blocks || [])[0];
  if (overview) {
    overview.label = heading;
    overview.value = heading;
  }
  setChildValue(dataHi, "text-0001", heading);
  setChildValue(dataHi, "text-0002", heading);
  setChildValue(dataHi, "text-0003", "तस्वीरें");
  setChildValue(dataHi, "text-0005", heading);
  for (const data of [dataEn, dataHi]) {
    markStructuralChild(data, "text-0002");
    markStructuralChild(data, "text-0003");
  }
  rebuildHindiHtml(dataEn, dataHi);
};

const cipdmMedia = new Map([
  ["asset-image-0003", { label: "Video poster: RSAC-UP Virtual 3D Campus", title: "RSAC-UP Virtual 3D Campus" }],
  ["asset-image-0004", { label: "Video poster: Charbagh 3D Model", title: "Charbagh 3D Model" }],
  ["asset-image-0005", { label: "Video poster: Badshahnagar 3D Model", title: "Badshahnagar 3D Model" }],
  ["asset-image-0006", { label: "Video poster: Aishbagh 3D Model", title: "Aishbagh 3D Model" }],
  ["asset-image-0007", { label: "Interactive model poster: Dam Analysis", title: "RSAC-UP 3D Model" }],
  ["asset-link-0004", {
    label: "Video: RSAC-UP Virtual 3D Campus",
    title: "RSAC-UP Virtual 3D Campus",
    text: "RSAC-UP Virtual 3D Campus",
    value: "/official-media/legacy-rsac/rsac_MODEL_vIDEOS/rsac_build_02.mp4",
  }],
  ["asset-link-0005", {
    label: "Video: Charbagh 3D Model",
    title: "Charbagh 3D Model",
    text: "Charbagh 3D Model",
    value: "/official-media/legacy-rsac/rsac_MODEL_vIDEOS/CHARBAGH2.mp4",
  }],
  ["asset-link-0006", {
    label: "Video: Badshahnagar 3D Model",
    title: "Badshahnagar 3D Model",
    text: "Badshahnagar 3D Model",
    value: "/official-media/legacy-rsac/rsac_MODEL_vIDEOS/badshahnagar.mp4",
  }],
  ["asset-link-0007", {
    label: "Video: Aishbagh 3D Model",
    title: "Aishbagh 3D Model",
    text: "Aishbagh 3D Model",
    value: "/official-media/legacy-rsac/rsac_MODEL_vIDEOS/AISHBAGH2.mp4",
  }],
  ["asset-link-0008", {
    label: "Interactive model: page-turning dam analysis",
    title: "RSAC-UP 3D Model",
    text: "RSAC-UP 3D Model",
    value: "/official-media/legacy-rsac/dam/index.html",
  }],
]);

const repairCipdm = (dataEn, dataHi) => {
  const mapBlock = (dataEn.blocks || []).find((block) =>
    String(block.value || block.label || "").toLowerCase().replace(/\s+/gu, "").includes("map/photos")
  );
  if (!mapBlock) throw new Error("CIPDM Map/Photos block is missing.");
  mapBlock.children = (mapBlock.children || []).map((child) => {
    if (child.key === "text-0205") return { ...child, value: "", hidden: true };
    if (child.key === "text-0206") return { ...child, value: "Related Photos", hidden: false };
    return child;
  });
  mapBlock.assets = (mapBlock.assets || []).map((asset) => ({
    ...asset,
    ...(cipdmMedia.get(asset.key) || {}),
    sectionKey: asset.sectionKey || "map-photos",
  }));

  const hindiMapBlock = (dataHi.blocks || []).find((block) =>
    (block.children || []).some((child) => child.key === "text-0186")
  );
  if (!hindiMapBlock) throw new Error("CIPDM Hindi Map/Photos block is missing.");
  hindiMapBlock.children = (hindiMapBlock.children || []).map((child) => {
    if (child.key === "text-0185") {
      return {
        ...child,
        value: "कंप्यूटर इमेज प्रोसेसिंग डिवीजन",
        hidden: false,
      };
    }
    if (child.key === "text-0186") {
      return {
        ...child,
        label: "मानचित्र / तस्वीरें → सम्बंधित लिंक्स",
        value: "",
        hidden: true,
        sourceKeys: [...new Set([...(child.sourceKeys || []), "text-0205"])],
      };
    }
    if (child.key === "text-0187") {
      return {
        ...child,
        label: "मानचित्र / तस्वीरें → संबंधित तस्वीरें",
        value: "संबंधित तस्वीरें",
        hidden: false,
        sourceKeys: [...new Set([...(child.sourceKeys || []), "text-0206"])],
      };
    }
    return child;
  });

  const hindiOnlyVideoSources = new Set([
    "http://geoportal.rsacup.org.in:8080/video_rsac/RSACUPVirtualTour.mp4",
  ]);
  for (const block of dataHi.blocks || []) {
    if (!Array.isArray(block.assets)) continue;
    block.assets = block.assets.filter((asset) => !hindiOnlyVideoSources.has(asset.sourceValue || asset.value));
  }
  const document = new JSDOM(String(dataHi.html || "")).window.document;
  document.querySelectorAll("a[href]").forEach((anchor) => {
    if (hindiOnlyVideoSources.has(anchor.getAttribute("href"))) anchor.remove();
  });
  dataHi.html = document.body.innerHTML;

  for (const data of [dataEn, dataHi]) {
    const pageDocument = new JSDOM(String(data.html || "")).window.document;
    pageDocument.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
      if (/^(?:related links|सम्बंधित लिंक्स|संबंधित लिंक्स)$/iu.test(heading.textContent.trim())) {
        heading.remove();
      }
    });
    data.html = pageDocument.body.innerHTML;
  }
};

const repairGeoportalDisplay = (dataEn, dataHi) => {
  if (!String(dataEn.eyebrowSize || "").trim()) {
    dataEn.eyebrowSize = "large";
  }
  if (!String(dataHi.title || "").trim()) {
    dataHi.title = "योजना, उपग्रह डेटा और भू-स्थानिक सेवा पहुंच";
  }
};

const repairTrainingHostel = (dataEn, dataHi) => {
  const rawHeading = dataHi.title || "प्रशिक्षण हॉस्टल";
  rebuildHindiHtml(dataEn, dataHi, { "text-0001": rawHeading });
  setChildValue(dataHi, "text-0001", childByKey(dataEn, "text-0001")?.value || "");
  setChildLabel(dataHi, "text-0004", "प्रशिक्षण हॉस्टल → प्रशिक्षण छात्रावास");
};

const repairs = new Map([
  ["public_info/rti", (dataEn) => repairRti(dataEn)],
  ["public_info/tenders", (dataEn) => repairTender(dataEn)],
  ["pages/soil-analysis-lab1", repairSoilLab],
  ["pages/training-hostels", repairTrainingHostel],
  ["pages/computer-image-processing-division", repairCipdm],
  ["page_display_settings/planning-satellite-data-and-geospatial-service-access", repairGeoportalDisplay],
]);

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

let changed = 0;
try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `SELECT id,collection,entry_key,data_en,data_hi
       FROM cms_entries
      WHERE (collection,entry_key) IN (
        ('public_info','rti'),
        ('public_info','tenders'),
        ('pages','soil-analysis-lab1'),
        ('pages','training-hostels'),
        ('pages','computer-image-processing-division'),
        ('page_display_settings','planning-satellite-data-and-geospatial-service-access')
      )
      FOR UPDATE`
  );

  for (const row of rows) {
    const key = `${row.collection}/${row.entry_key}`;
    const repair = repairs.get(key);
    if (!repair) continue;

    const dataEn = clone(row.data_en);
    const dataHi = clone(row.data_hi);
    repair(dataEn, dataHi);
    if (same(dataEn, row.data_en) && same(dataHi, row.data_hi)) continue;

    await client.query(
      "UPDATE cms_entries SET data_en=$1,data_hi=$2,version=version+1,updated_at=now() WHERE id=$3",
      [dataEn, dataHi, row.id]
    );
    await client.query(
      `INSERT INTO cms_audit_log (action,collection,entry_id,entry_key,before_data,after_data)
       VALUES ('repair-bilingual-content-parity',$1,$2,$3,$4,$5)`,
      [row.collection, row.id, row.entry_key, { dataEn: row.data_en, dataHi: row.data_hi }, { dataEn, dataHi }]
    );
    changed += 1;
  }

  if (rows.length !== repairs.size) {
    throw new Error(`Expected ${repairs.size} repair records but found ${rows.length}.`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(`Bilingual content parity repair complete: ${changed} record${changed === 1 ? "" : "s"} updated.`);
