import assert from "node:assert/strict";
import { pool } from "../server/db.js";
import { prepareFormerRosterSave } from "../server/formerRosterSync.js";

const client = await pool.connect();

try {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `SELECT *
       FROM cms_entries
      WHERE collection='pages' AND entry_key='our-former'
      LIMIT 1`
  );
  const page = rows[0];
  assert.ok(page, "Our Formers roster page is missing");

  const dataEn = structuredClone(page.data_en);
  const dataHi = structuredClone(page.data_hi);
  const englishBlock = dataEn.blocks.find((block) =>
    /chaturved/iu.test(String(block?.value || ""))
  );
  const hindiBlock = dataHi.blocks.find((block) =>
    String(block?.key || "") === String(englishBlock?.key || "")
  );
  assert.ok(englishBlock, "R. S. Chaturvedi roster block is missing");
  assert.ok(hindiBlock, "R. S. Chaturvedi Hindi roster block is missing");

  const existingLink = englishBlock.profileEntryKey;
  englishBlock.value = `${englishBlock.value} Test`;
  hindiBlock.value = `${hindiBlock.value} परीक्षण`;
  const prepared = await prepareFormerRosterSave(
    client,
    page,
    dataEn,
    dataHi,
    { actorId: page.updated_by }
  );

  assert.equal(prepared.profileChanges.length, 1);
  assert.equal(englishBlock.profileEntryKey, existingLink);
  const linkedEnglishBlock = prepared.dataEn.blocks.find(
    (block) => block.key === englishBlock.key
  );
  const linkedHindiBlock = prepared.dataHi.blocks.find(
    (block) => block.key === hindiBlock.key
  );
  assert.equal(linkedEnglishBlock.profileEntryKey, "former-31");
  assert.equal(linkedHindiBlock.profileEntryKey, "former-31");
  assert.equal(
    prepared.profileChanges[0].after.data_en.name,
    englishBlock.value
  );
  assert.equal(
    prepared.profileChanges[0].after.data_hi.name,
    hindiBlock.value
  );

  console.log("Former roster name synchronization passed.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
