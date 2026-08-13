import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { createCmsPermissions } from "../../shared/cmsPermissions.js";

const testPassword = "CmsAudit!Secure2026";

export const createTemporaryCmsTestUser = async (connectionString) => {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const testIpSuffix = (Number.parseInt(suffix.slice(0, 2), 16) % 250) + 1;
    const username = `cms-audit-${suffix}`;
    const passwordHash = await bcrypt.hash(testPassword, 12);
    const { rows } = await client.query(
      `INSERT INTO cms_users
        (username, display_name, password_hash, role, permissions, active)
       VALUES ($1, $2, $3, 'editor', $4, true)
       RETURNING id`,
      [username, "Temporary CMS audit user", passwordHash, createCmsPermissions(true)]
    );
    return {
      id: rows[0].id,
      username,
      password: testPassword,
      forwardedFor: `198.51.100.${testIpSuffix}`,
    };
  } finally {
    await client.end();
  }
};

export const removeTemporaryCmsTestUser = async (connectionString, id) => {
  if (!id) return;
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("DELETE FROM cms_audit_log WHERE user_id=$1", [id]);
    await client.query("DELETE FROM cms_users WHERE id=$1", [id]);
  } finally {
    await client.end();
  }
};
