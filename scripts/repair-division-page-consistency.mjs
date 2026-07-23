import { pool } from "../server/db.js";
import { repairDivisionPageConsistency } from "../server/divisionPageSync.js";

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const result = await repairDivisionPageConsistency(client);
  await client.query("COMMIT");
  console.log(
    `Division pages synchronized: ${result.created} created, ${result.updated} updated.`
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
