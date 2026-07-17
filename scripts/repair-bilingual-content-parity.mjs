import { config as loadEnv } from "dotenv";
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
  const heading = childByKey(dataHi, "text-0001")?.value || dataHi.title || "मिट्टी विश्लेषण लैब";
  setChildValue(dataHi, "text-0002", heading);
  rebuildHindiHtml(dataEn, dataHi);
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
        ('pages','training-hostels')
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
