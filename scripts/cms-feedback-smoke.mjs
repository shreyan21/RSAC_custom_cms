import { config as loadEnv } from "dotenv";
import pg from "pg";
import {
  createTemporaryCmsTestUser,
  removeTemporaryCmsTestUser,
} from "./lib/temporary-cms-test-user.mjs";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) throw new Error("CMS_DATABASE_URL is missing.");

const base = String(
  process.env.CMS_API_URL || process.env.VITE_API_URL || "http://127.0.0.1:3000"
).replace(/\/$/u, "");
const healthResponse = await fetch(`${base}/api/health`);
const health = await healthResponse.json().catch(() => ({}));
if (!healthResponse.ok) throw new Error(`CMS health check failed (${healthResponse.status}).`);

if (health.feedbackEmailConfigured) {
  console.log(
    "Feedback SMTP is configured. The storage smoke test was skipped to avoid sending a synthetic message to real recipients."
  );
  process.exit(0);
}

const marker = `CMS feedback audit ${Date.now()}`;
let feedbackId = "";
let testUser;
const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  testUser = await createTemporaryCmsTestUser(process.env.CMS_DATABASE_URL);
  const response = await fetch(`${base}/api/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": testUser.forwardedFor,
    },
    body: JSON.stringify({
      name: "CMS audit",
      email: "cms-audit@example.gov.in",
      address: "Temporary automated test",
      country: "India",
      state: "Uttar Pradesh",
      district: "Lucknow",
      phone: "0000000000",
      comments: marker,
      website: "",
      language: "en",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status !== 201 || !payload.ok || !payload.id) {
    throw new Error(payload.error || `Feedback submission failed (${response.status}).`);
  }
  feedbackId = payload.id;

  const { rows } = await client.query(
    "SELECT comments, delivery_status FROM cms_feedback WHERE id=$1",
    [feedbackId]
  );
  if (rows[0]?.comments !== marker || rows[0]?.delivery_status !== "disabled") {
    throw new Error("Saved feedback does not match the submitted record or delivery state.");
  }

  const loginResponse = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": testUser.forwardedFor,
    },
    body: JSON.stringify({ username: testUser.username, password: testUser.password }),
  });
  const login = await loginResponse.json().catch(() => ({}));
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] || "";
  if (!loginResponse.ok || !cookie) throw new Error(login.error || "CMS audit login failed.");

  const cmsResponse = await fetch(`${base}/api/admin/feedback`, {
    headers: { Cookie: cookie, "X-Forwarded-For": testUser.forwardedFor },
  });
  const cmsPayload = await cmsResponse.json().catch(() => ({}));
  if (!cmsResponse.ok || !cmsPayload.data?.some((item) => item.id === feedbackId)) {
    throw new Error("The saved feedback is not visible in the authorised CMS feedback list.");
  }
  console.log(
    "Public feedback validation, PostgreSQL storage, and authorised CMS visibility passed; the temporary submission was removed."
  );
} finally {
  try {
    if (feedbackId) await client.query("DELETE FROM cms_feedback WHERE id=$1", [feedbackId]);
  } finally {
    await client.end();
    await removeTemporaryCmsTestUser(process.env.CMS_DATABASE_URL, testUser?.id);
  }
}
