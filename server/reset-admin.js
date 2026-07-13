import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

loadEnv({ path: resolve(".env.local"), quiet: true });
const username = String(process.env.CMS_ADMIN_USERNAME || "admin").toLowerCase();
const password = process.env.CMS_ADMIN_PASSWORD;
if (!password || !process.env.CMS_DATABASE_URL) throw new Error("Set CMS_ADMIN_PASSWORD and CMS_DATABASE_URL in .env.local.");
const hash = await bcrypt.hash(password, 12);
const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();
await client.query("UPDATE cms_users SET password_hash=$1, active=true WHERE username=$2", [hash, username]);
await client.query("DELETE FROM cms_sessions WHERE user_id=(SELECT id FROM cms_users WHERE username=$1)", [username]);
await client.end();
console.log("CMS administrator password reset from .env.local. Existing sessions closed.");
