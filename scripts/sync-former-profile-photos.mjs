import { pool, withTransaction } from "../server/db.js";
import { migrateFormerRosterProfilePhotos } from "../server/formerProfilePhotoMigration.js";

const changed = await withTransaction(async (client) => {
  const updates = await migrateFormerRosterProfilePhotos(client);
  for (const update of updates) {
    await client.query(
      `INSERT INTO cms_audit_log
         (action, collection, entry_id, entry_key, before_data, after_data)
       VALUES ('backfill_former_profile_photo', 'profiles', $1, $2, $3, $4)`,
      [
        update.after.id,
        update.entryKey,
        update.before,
        update.after,
      ]
    );
  }
  return updates;
});

console.log(
  changed.length
    ? `Linked ${changed.length} existing former-scientist portraits to their CMS profiles.`
    : "All former-scientist CMS profiles already have their portraits."
);
await pool.end();
