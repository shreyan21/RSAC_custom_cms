CREATE OR REPLACE FUNCTION cms_random_uuid()
RETURNS uuid AS $$
  SELECT md5(random()::text || clock_timestamp()::text)::uuid;
$$ LANGUAGE sql VOLATILE;

CREATE TABLE IF NOT EXISTS cms_users (
  id uuid PRIMARY KEY DEFAULT cms_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_entries (
  id uuid PRIMARY KEY DEFAULT cms_random_uuid(),
  collection text NOT NULL,
  entry_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order integer NOT NULL DEFAULT 0,
  data_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_hi jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection, entry_key)
);

CREATE TABLE IF NOT EXISTS cms_sessions (
  id uuid PRIMARY KEY DEFAULT cms_random_uuid(),
  user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_media (
  id uuid PRIMARY KEY DEFAULT cms_random_uuid(),
  stored_name text NOT NULL,
  original_name text NOT NULL,
  public_url text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  alt_en text NOT NULL DEFAULT '',
  alt_hi text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_feedback (
  id uuid PRIMARY KEY DEFAULT cms_random_uuid(),
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  comments text NOT NULL,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_site_visits (
  visit_day date PRIMARY KEY,
  visit_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cms_audit_log (
  id uuid PRIMARY KEY DEFAULT cms_random_uuid(),
  user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  collection text,
  entry_id uuid,
  entry_key text,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cms_entries_published_idx
  ON cms_entries (collection, status, sort_order, entry_key);

CREATE INDEX IF NOT EXISTS cms_entries_updated_at_idx
  ON cms_entries (updated_at);

CREATE INDEX IF NOT EXISTS cms_sessions_expires_at_idx
  ON cms_sessions (expires_at);

CREATE INDEX IF NOT EXISTS cms_media_created_at_idx
  ON cms_media (created_at DESC);

CREATE INDEX IF NOT EXISTS cms_audit_log_created_at_idx
  ON cms_audit_log (created_at DESC);

CREATE OR REPLACE FUNCTION set_cms_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cms_users_updated_at ON cms_users;
CREATE TRIGGER set_cms_users_updated_at
  BEFORE UPDATE ON cms_users
  FOR EACH ROW EXECUTE FUNCTION set_cms_updated_at();

DROP TRIGGER IF EXISTS set_cms_entries_updated_at ON cms_entries;
CREATE TRIGGER set_cms_entries_updated_at
  BEFORE UPDATE ON cms_entries
  FOR EACH ROW EXECUTE FUNCTION set_cms_updated_at();
