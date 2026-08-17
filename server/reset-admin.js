import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";
import { assertStrongPassword } from "../shared/passwordPolicy.js";

loadEnv({ path: resolve(".env.local"), quiet: true });
const username = String(process.env.CMS_ADMIN_USERNAME || "admin").toLowerCase();
const password = process.env.CMS_ADMIN_PASSWORD;
if (!password || !process.env.CMS_DATABASE_URL) throw new Error("Set CMS_ADMIN_PASSWORD and CMS_DATABASE_URL in .env.local.");
if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
  throw new Error("CMS_ADMIN_USERNAME must be 3-50 letters, numbers, dots, underscores or hyphens.");
}
assertStrongPassword(password);
const hash = await bcrypt.hash(password, 12);
const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("LOCK TABLE cms_users IN SHARE ROW EXCLUSIVE MODE");
  const administrators = (await client.query(
    "SELECT id,username FROM cms_users WHERE role='admin' ORDER BY created_at FOR UPDATE"
  )).rows;
  if (administrators.length !== 1) {
    throw new Error(
      administrators.length
        ? "More than one CMS administrator exists. Resolve the account records before resetting credentials."
        : "No CMS administrator exists. Run npm run cms:setup first."
    );
  }
  const administrator = administrators[0];
  const collision = (await client.query(
    "SELECT 1 FROM cms_users WHERE lower(username)=$1 AND id<>$2 LIMIT 1",
    [username, administrator.id]
  )).rowCount > 0;
  if (collision) {
    throw new Error(`Username '${username}' is already used by another CMS account.`);
  }
  await client.query(
    "UPDATE cms_users SET username=$1,password_hash=$2,active=true WHERE id=$3",
    [username, hash, administrator.id]
  );
  await client.query("DELETE FROM cms_sessions WHERE user_id=$1", [administrator.id]);
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
console.log(`CMS administrator credentials reset for '${username}' from .env.local. Existing sessions closed.`);
