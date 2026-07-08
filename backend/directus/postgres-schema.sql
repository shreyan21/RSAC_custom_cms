-- RSAC-UP Directus content schema.
-- Safe to run more than once: it only creates missing tables, columns, and
-- non-unique indexes. It does not delete or overwrite editor-entered content.
-- Directus system tables must already exist (`directus bootstrap` creates them).

CREATE SEQUENCE IF NOT EXISTS public.rsac_brand_logos_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_brand_logos (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_brand_logos_id_seq'::regclass),
  title text NOT NULL,
  title_hi text,
  image uuid,
  alt_text text,
  alt_text_hi text,
  link_url text,
  placement text NOT NULL DEFAULT 'supporting',
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_brand_logos_id_seq OWNED BY public.rsac_brand_logos.id;

CREATE TABLE IF NOT EXISTS public.rsac_contact (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text,
  title_hi text,
  address text,
  address_hi text,
  email text,
  phone text,
  mobile text,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  contacts_hi jsonb NOT NULL DEFAULT '[]'::jsonb,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);

CREATE SEQUENCE IF NOT EXISTS public.rsac_content_blocks_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_content_blocks (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_content_blocks_id_seq'::regclass),
  key text NOT NULL UNIQUE,
  section text NOT NULL,
  label text NOT NULL,
  value text,
  value_hi text,
  value_type text NOT NULL DEFAULT 'text',
  help_text text,
  status text NOT NULL DEFAULT 'published',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_content_blocks_id_seq OWNED BY public.rsac_content_blocks.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_editor_map_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_editor_map (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_editor_map_id_seq'::regclass),
  key text NOT NULL UNIQUE,
  website_area text NOT NULL,
  edit_collection text NOT NULL,
  where_to_click text,
  english_fields text,
  hindi_fields text,
  media_fields text,
  daily_steps text,
  common_mistakes text,
  public_effect text,
  status text NOT NULL DEFAULT 'published',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid
);
ALTER SEQUENCE public.rsac_editor_map_id_seq OWNED BY public.rsac_editor_map.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_divisions_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_divisions (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_divisions_id_seq'::regclass),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_hi text,
  lead text,
  lead_hi text,
  source_url text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlights_hi jsonb NOT NULL DEFAULT '[]'::jsonb,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_divisions_id_seq OWNED BY public.rsac_divisions.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_facilities_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_facilities (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_facilities_id_seq'::regclass),
  slug text UNIQUE,
  title text NOT NULL,
  title_hi text,
  text text,
  text_hi text,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_facilities_id_seq OWNED BY public.rsac_facilities.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_feedback_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_feedback (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_feedback_id_seq'::regclass),
  name varchar(255),
  email varchar(255),
  address text,
  country varchar(255),
  state varchar(255),
  district varchar(255),
  phone varchar(255),
  comments text,
  date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE public.rsac_feedback_id_seq OWNED BY public.rsac_feedback.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_flood_reports_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_flood_reports (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_flood_reports_id_seq'::regclass),
  title text NOT NULL,
  title_hi text,
  date date,
  date_label text,
  date_label_hi text,
  category text,
  category_hi text,
  coverage text,
  coverage_hi text,
  meta text,
  meta_hi text,
  document uuid,
  url text,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_flood_reports_id_seq OWNED BY public.rsac_flood_reports.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_gallery_items_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_gallery_items (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_gallery_items_id_seq'::regclass),
  key text NOT NULL UNIQUE,
  title text,
  title_hi text,
  alt_text text,
  alt_text_hi text,
  image uuid,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_gallery_items_id_seq OWNED BY public.rsac_gallery_items.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_geoportals_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_geoportals (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_geoportals_id_seq'::regclass),
  title text NOT NULL,
  title_hi text,
  description text,
  description_hi text,
  url text NOT NULL,
  icon_key text,
  accent text,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_geoportals_id_seq OWNED BY public.rsac_geoportals.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_hero_videos_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_hero_videos (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_hero_videos_id_seq'::regclass),
  title text NOT NULL,
  title_hi text,
  file_name text,
  video uuid,
  poster uuid,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_hero_videos_id_seq OWNED BY public.rsac_hero_videos.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_manpower_groups_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_manpower_groups (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_manpower_groups_id_seq'::regclass),
  title text NOT NULL,
  title_hi text,
  count text,
  text text,
  text_hi text,
  path text,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_manpower_groups_id_seq OWNED BY public.rsac_manpower_groups.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_menu_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_menu (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_menu_id_seq'::regclass),
  title text NOT NULL,
  title_hi text,
  description text,
  description_hi text,
  path text NOT NULL,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  links_hi jsonb NOT NULL DEFAULT '[]'::jsonb,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_menu_id_seq OWNED BY public.rsac_menu.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_mobile_apps_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_mobile_apps (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_mobile_apps_id_seq'::regclass),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  title_hi text,
  description text,
  description_hi text,
  download uuid,
  url text,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_mobile_apps_id_seq OWNED BY public.rsac_mobile_apps.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_notices_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_notices (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_notices_id_seq'::regclass),
  title text NOT NULL,
  title_hi text,
  category text,
  category_hi text,
  meta text,
  meta_hi text,
  last_date text,
  document uuid,
  url text,
  date_published timestamp with time zone,
  review_due_on date,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_notices_id_seq OWNED BY public.rsac_notices.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_organisation_roles_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_organisation_roles (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_organisation_roles_id_seq'::regclass),
  role_key text NOT NULL UNIQUE,
  group_key text NOT NULL,
  slot text,
  title text NOT NULL,
  title_hi text,
  name text,
  name_hi text,
  role text,
  role_hi text,
  post text,
  post_hi text,
  photo uuid,
  object_position text DEFAULT 'center 22%',
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_organisation_roles_id_seq OWNED BY public.rsac_organisation_roles.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_page_images_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_page_images (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_page_images_id_seq'::regclass),
  page bigint,
  page_slug text,
  label text NOT NULL DEFAULT '',
  original_src text NOT NULL DEFAULT '',
  image uuid,
  status text NOT NULL DEFAULT 'published',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid
);
ALTER SEQUENCE public.rsac_page_images_id_seq OWNED BY public.rsac_page_images.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_pages_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_pages (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_pages_id_seq'::regclass),
  section_key text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  title_hi text,
  summary text,
  summary_hi text,
  html text,
  html_hi text,
  content_fields json,
  content_fields_hi json,
  card_icon text,
  card_color text,
  card_color_2 text,
  featured_image uuid,
  source_url text,
  language text NOT NULL DEFAULT 'en',
  content_owner text,
  date_published timestamp with time zone,
  review_due_on date,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language varchar(255) DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_pages_id_seq OWNED BY public.rsac_pages.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_policies_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_policies (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_policies_id_seq'::regclass),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_hi text,
  summary text,
  summary_hi text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections_hi jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  content_owner text,
  review_due_on date,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_policies_id_seq OWNED BY public.rsac_policies.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_profiles_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_profiles (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_profiles_id_seq'::regclass),
  profile_type text NOT NULL,
  name text NOT NULL,
  name_hi text,
  role text,
  role_hi text,
  designation text,
  designation_hi text,
  department text,
  department_hi text,
  deployment text,
  deployment_hi text,
  employee_id text,
  duration text,
  duration_hi text,
  photo uuid,
  object_position text,
  specialization text,
  specialization_hi text,
  experience text,
  experience_hi text,
  publications text,
  publications_hi text,
  contact text,
  email text,
  source_url text,
  category text,
  category_hi text,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  details_hi jsonb NOT NULL DEFAULT '[]'::jsonb,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_profiles_id_seq OWNED BY public.rsac_profiles.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_public_info_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_public_info (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_public_info_id_seq'::regclass),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_hi text,
  eyebrow text,
  eyebrow_hi text,
  summary text,
  summary_hi text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections_hi jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  links_hi jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  content_owner text,
  review_due_on date,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_public_info_id_seq OWNED BY public.rsac_public_info.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_quick_links_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_quick_links (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_quick_links_id_seq'::regclass),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  title_hi text,
  description text,
  description_hi text,
  path text NOT NULL,
  icon_key text,
  accent text,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_quick_links_id_seq OWNED BY public.rsac_quick_links.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_home_feature_tabs_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_home_feature_tabs (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_home_feature_tabs_id_seq'::regclass),
  key text NOT NULL UNIQUE,
  section_key text NOT NULL DEFAULT 'feature_tab',
  title text NOT NULL,
  title_hi text,
  eyebrow text,
  eyebrow_hi text,
  summary text,
  summary_hi text,
  details text,
  details_hi text,
  value text,
  value_hi text,
  detail text,
  detail_hi text,
  tagline text,
  tagline_hi text,
  deliverables text,
  deliverables_hi text,
  stat_value text,
  stat_label text,
  stat_label_hi text,
  button_label text,
  button_label_hi text,
  button_path text,
  link_label text,
  link_label_hi text,
  map_query text,
  icon_key text,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_home_feature_tabs_id_seq OWNED BY public.rsac_home_feature_tabs.id;

CREATE SEQUENCE IF NOT EXISTS public.rsac_sections_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_sections (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_sections_id_seq'::regclass),
  key text NOT NULL UNIQUE,
  route text NOT NULL,
  title text NOT NULL,
  title_hi text,
  eyebrow text,
  eyebrow_hi text,
  intro text,
  intro_hi text,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  sort integer NOT NULL DEFAULT 0,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid,
  edit_language text NOT NULL DEFAULT 'en'
);
ALTER SEQUENCE public.rsac_sections_id_seq OWNED BY public.rsac_sections.id;

CREATE TABLE IF NOT EXISTS public.rsac_site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  appearance jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  hero jsonb NOT NULL DEFAULT '{}'::jsonb,
  mission_pulse jsonb NOT NULL DEFAULT '{}'::jsonb,
  home_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  about jsonb NOT NULL DEFAULT '{}'::jsonb,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  footer jsonb NOT NULL DEFAULT '{}'::jsonb,
  organisation_chart jsonb NOT NULL DEFAULT '{}'::jsonb,
  accessibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  impact_stats jsonb NOT NULL DEFAULT '[]'::jsonb,
  services jsonb NOT NULL DEFAULT '{}'::jsonb,
  applications jsonb NOT NULL DEFAULT '{}'::jsonb,
  flood_section jsonb NOT NULL DEFAULT '{}'::jsonb,
  search jsonb NOT NULL DEFAULT '{}'::jsonb,
  ui jsonb NOT NULL DEFAULT '{}'::jsonb,
  cards jsonb NOT NULL DEFAULT '{}'::jsonb,
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  brand_logo uuid,
  government_logo uuid,
  prime_minister_photo uuid,
  chief_minister_photo uuid,
  organisation_chart_file uuid,
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_created uuid,
  user_updated uuid
);

CREATE SEQUENCE IF NOT EXISTS public.rsac_site_visits_id_seq;
CREATE TABLE IF NOT EXISTS public.rsac_site_visits (
  id bigint PRIMARY KEY DEFAULT nextval('public.rsac_site_visits_id_seq'::regclass),
  source text NOT NULL DEFAULT 'website',
  date_created timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE public.rsac_site_visits_id_seq OWNED BY public.rsac_site_visits.id;

-- Add columns that may be missing on older installations. Do not make these
-- ALTER statements destructive; current editor content must remain untouched.
ALTER TABLE public.rsac_brand_logos
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS image uuid,
  ADD COLUMN IF NOT EXISTS alt_text text,
  ADD COLUMN IF NOT EXISTS alt_text_hi text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS placement text DEFAULT 'supporting',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_contact
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS address_hi text,
  ADD COLUMN IF NOT EXISTS contacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contacts_hi jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_content_blocks
  ADD COLUMN IF NOT EXISTS value_hi text,
  ADD COLUMN IF NOT EXISTS value_type text DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS help_text text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_editor_map
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS website_area text,
  ADD COLUMN IF NOT EXISTS edit_collection text,
  ADD COLUMN IF NOT EXISTS where_to_click text,
  ADD COLUMN IF NOT EXISTS english_fields text,
  ADD COLUMN IF NOT EXISTS hindi_fields text,
  ADD COLUMN IF NOT EXISTS media_fields text,
  ADD COLUMN IF NOT EXISTS daily_steps text,
  ADD COLUMN IF NOT EXISTS common_mistakes text,
  ADD COLUMN IF NOT EXISTS public_effect text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid;

ALTER TABLE public.rsac_divisions
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS lead_hi text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlights_hi jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_facilities
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS text_hi text,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_feedback
  ADD COLUMN IF NOT EXISTS name varchar(255),
  ADD COLUMN IF NOT EXISTS email varchar(255),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country varchar(255),
  ADD COLUMN IF NOT EXISTS state varchar(255),
  ADD COLUMN IF NOT EXISTS district varchar(255),
  ADD COLUMN IF NOT EXISTS phone varchar(255),
  ADD COLUMN IF NOT EXISTS comments text,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.rsac_flood_reports
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS date_label text,
  ADD COLUMN IF NOT EXISTS date_label_hi text,
  ADD COLUMN IF NOT EXISTS category_hi text,
  ADD COLUMN IF NOT EXISTS coverage_hi text,
  ADD COLUMN IF NOT EXISTS meta_hi text,
  ADD COLUMN IF NOT EXISTS document uuid,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_gallery_items
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS alt_text text,
  ADD COLUMN IF NOT EXISTS alt_text_hi text,
  ADD COLUMN IF NOT EXISTS image uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_geoportals
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS description_hi text,
  ADD COLUMN IF NOT EXISTS icon_key text,
  ADD COLUMN IF NOT EXISTS accent text,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_hero_videos
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS video uuid,
  ADD COLUMN IF NOT EXISTS poster uuid,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_manpower_groups
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS count text,
  ADD COLUMN IF NOT EXISTS text text,
  ADD COLUMN IF NOT EXISTS text_hi text,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_menu
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS description_hi text,
  ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links_hi jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_mobile_apps
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS description_hi text,
  ADD COLUMN IF NOT EXISTS download uuid,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_notices
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS category_hi text,
  ADD COLUMN IF NOT EXISTS meta_hi text,
  ADD COLUMN IF NOT EXISTS last_date text,
  ADD COLUMN IF NOT EXISTS document uuid,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS date_published timestamp with time zone,
  ADD COLUMN IF NOT EXISTS review_due_on date,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_organisation_roles
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS name_hi text,
  ADD COLUMN IF NOT EXISTS role_hi text,
  ADD COLUMN IF NOT EXISTS post text,
  ADD COLUMN IF NOT EXISTS post_hi text,
  ADD COLUMN IF NOT EXISTS photo uuid,
  ADD COLUMN IF NOT EXISTS object_position text DEFAULT 'center 22%',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_page_images
  ADD COLUMN IF NOT EXISTS page bigint,
  ADD COLUMN IF NOT EXISTS page_slug text,
  ADD COLUMN IF NOT EXISTS label text DEFAULT '',
  ADD COLUMN IF NOT EXISTS original_src text DEFAULT '',
  ADD COLUMN IF NOT EXISTS image uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid;

ALTER TABLE public.rsac_pages
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS summary_hi text,
  ADD COLUMN IF NOT EXISTS html text,
  ADD COLUMN IF NOT EXISTS html_hi text,
  ADD COLUMN IF NOT EXISTS content_fields json,
  ADD COLUMN IF NOT EXISTS content_fields_hi json,
  ADD COLUMN IF NOT EXISTS card_icon text,
  ADD COLUMN IF NOT EXISTS card_color text,
  ADD COLUMN IF NOT EXISTS card_color_2 text,
  ADD COLUMN IF NOT EXISTS featured_image uuid,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS content_owner text,
  ADD COLUMN IF NOT EXISTS date_published timestamp with time zone,
  ADD COLUMN IF NOT EXISTS review_due_on date,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language varchar(255) DEFAULT 'en';

ALTER TABLE public.rsac_policies
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS summary_hi text,
  ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sections_hi jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS content_owner text,
  ADD COLUMN IF NOT EXISTS review_due_on date,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_profiles
  ADD COLUMN IF NOT EXISTS name_hi text,
  ADD COLUMN IF NOT EXISTS role_hi text,
  ADD COLUMN IF NOT EXISTS designation_hi text,
  ADD COLUMN IF NOT EXISTS department_hi text,
  ADD COLUMN IF NOT EXISTS deployment_hi text,
  ADD COLUMN IF NOT EXISTS duration_hi text,
  ADD COLUMN IF NOT EXISTS object_position text,
  ADD COLUMN IF NOT EXISTS specialization_hi text,
  ADD COLUMN IF NOT EXISTS experience_hi text,
  ADD COLUMN IF NOT EXISTS publications_hi text,
  ADD COLUMN IF NOT EXISTS contact text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS category_hi text,
  ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS details_hi jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_public_info
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS eyebrow text,
  ADD COLUMN IF NOT EXISTS eyebrow_hi text,
  ADD COLUMN IF NOT EXISTS summary_hi text,
  ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sections_hi jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links_hi jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS content_owner text,
  ADD COLUMN IF NOT EXISTS review_due_on date,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_quick_links
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS description_hi text,
  ADD COLUMN IF NOT EXISTS icon_key text,
  ADD COLUMN IF NOT EXISTS accent text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_home_feature_tabs
  ADD COLUMN IF NOT EXISTS section_key text DEFAULT 'feature_tab',
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS eyebrow text,
  ADD COLUMN IF NOT EXISTS eyebrow_hi text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_hi text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS details_hi text,
  ADD COLUMN IF NOT EXISTS value text,
  ADD COLUMN IF NOT EXISTS value_hi text,
  ADD COLUMN IF NOT EXISTS detail text,
  ADD COLUMN IF NOT EXISTS detail_hi text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS tagline_hi text,
  ADD COLUMN IF NOT EXISTS deliverables text,
  ADD COLUMN IF NOT EXISTS deliverables_hi text,
  ADD COLUMN IF NOT EXISTS stat_value text,
  ADD COLUMN IF NOT EXISTS stat_label text,
  ADD COLUMN IF NOT EXISTS stat_label_hi text,
  ADD COLUMN IF NOT EXISTS button_label text,
  ADD COLUMN IF NOT EXISTS button_label_hi text,
  ADD COLUMN IF NOT EXISTS button_path text,
  ADD COLUMN IF NOT EXISTS link_label text,
  ADD COLUMN IF NOT EXISTS link_label_hi text,
  ADD COLUMN IF NOT EXISTS map_query text,
  ADD COLUMN IF NOT EXISTS icon_key text,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_sections
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS eyebrow text,
  ADD COLUMN IF NOT EXISTS eyebrow_hi text,
  ADD COLUMN IF NOT EXISTS intro text,
  ADD COLUMN IF NOT EXISTS intro_hi text,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS sort integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid,
  ADD COLUMN IF NOT EXISTS edit_language text DEFAULT 'en';

ALTER TABLE public.rsac_site_settings
  ADD COLUMN IF NOT EXISTS appearance jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS layout jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hero jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mission_pulse jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS home_sections jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS about jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS location jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS footer jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS organisation_chart jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accessibility jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS page_content jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS impact_stats jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applications jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS flood_section jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS search jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ui jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cards jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_logo uuid,
  ADD COLUMN IF NOT EXISTS government_logo uuid,
  ADD COLUMN IF NOT EXISTS prime_minister_photo uuid,
  ADD COLUMN IF NOT EXISTS chief_minister_photo uuid,
  ADD COLUMN IF NOT EXISTS organisation_chart_file uuid,
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS date_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS user_created uuid,
  ADD COLUMN IF NOT EXISTS user_updated uuid;

ALTER TABLE public.rsac_site_visits
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS date_created timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

-- Keep sequence-backed IDs working for older tables.
ALTER TABLE public.rsac_brand_logos ALTER COLUMN id SET DEFAULT nextval('public.rsac_brand_logos_id_seq'::regclass);
ALTER TABLE public.rsac_content_blocks ALTER COLUMN id SET DEFAULT nextval('public.rsac_content_blocks_id_seq'::regclass);
ALTER TABLE public.rsac_editor_map ALTER COLUMN id SET DEFAULT nextval('public.rsac_editor_map_id_seq'::regclass);
ALTER TABLE public.rsac_divisions ALTER COLUMN id SET DEFAULT nextval('public.rsac_divisions_id_seq'::regclass);
ALTER TABLE public.rsac_facilities ALTER COLUMN id SET DEFAULT nextval('public.rsac_facilities_id_seq'::regclass);
ALTER TABLE public.rsac_feedback ALTER COLUMN id SET DEFAULT nextval('public.rsac_feedback_id_seq'::regclass);
ALTER TABLE public.rsac_flood_reports ALTER COLUMN id SET DEFAULT nextval('public.rsac_flood_reports_id_seq'::regclass);
ALTER TABLE public.rsac_gallery_items ALTER COLUMN id SET DEFAULT nextval('public.rsac_gallery_items_id_seq'::regclass);
ALTER TABLE public.rsac_geoportals ALTER COLUMN id SET DEFAULT nextval('public.rsac_geoportals_id_seq'::regclass);
ALTER TABLE public.rsac_home_feature_tabs ALTER COLUMN id SET DEFAULT nextval('public.rsac_home_feature_tabs_id_seq'::regclass);
ALTER TABLE public.rsac_hero_videos ALTER COLUMN id SET DEFAULT nextval('public.rsac_hero_videos_id_seq'::regclass);
ALTER TABLE public.rsac_manpower_groups ALTER COLUMN id SET DEFAULT nextval('public.rsac_manpower_groups_id_seq'::regclass);
ALTER TABLE public.rsac_menu ALTER COLUMN id SET DEFAULT nextval('public.rsac_menu_id_seq'::regclass);
ALTER TABLE public.rsac_mobile_apps ALTER COLUMN id SET DEFAULT nextval('public.rsac_mobile_apps_id_seq'::regclass);
ALTER TABLE public.rsac_notices ALTER COLUMN id SET DEFAULT nextval('public.rsac_notices_id_seq'::regclass);
ALTER TABLE public.rsac_organisation_roles ALTER COLUMN id SET DEFAULT nextval('public.rsac_organisation_roles_id_seq'::regclass);
ALTER TABLE public.rsac_page_images ALTER COLUMN id SET DEFAULT nextval('public.rsac_page_images_id_seq'::regclass);
ALTER TABLE public.rsac_pages ALTER COLUMN id SET DEFAULT nextval('public.rsac_pages_id_seq'::regclass);
ALTER TABLE public.rsac_policies ALTER COLUMN id SET DEFAULT nextval('public.rsac_policies_id_seq'::regclass);
ALTER TABLE public.rsac_profiles ALTER COLUMN id SET DEFAULT nextval('public.rsac_profiles_id_seq'::regclass);
ALTER TABLE public.rsac_public_info ALTER COLUMN id SET DEFAULT nextval('public.rsac_public_info_id_seq'::regclass);
ALTER TABLE public.rsac_quick_links ALTER COLUMN id SET DEFAULT nextval('public.rsac_quick_links_id_seq'::regclass);
ALTER TABLE public.rsac_sections ALTER COLUMN id SET DEFAULT nextval('public.rsac_sections_id_seq'::regclass);
ALTER TABLE public.rsac_site_visits ALTER COLUMN id SET DEFAULT nextval('public.rsac_site_visits_id_seq'::regclass);

-- Non-unique indexes are safe to create on existing data.
CREATE INDEX IF NOT EXISTS rsac_brand_logos_placement_sort_idx ON public.rsac_brand_logos (status, placement, sort);
CREATE INDEX IF NOT EXISTS rsac_content_blocks_section_sort_idx ON public.rsac_content_blocks (status, section, sort);
CREATE INDEX IF NOT EXISTS rsac_editor_map_status_sort_idx ON public.rsac_editor_map (status, sort);
CREATE INDEX IF NOT EXISTS rsac_feedback_date_created_idx ON public.rsac_feedback (date_created DESC);
CREATE INDEX IF NOT EXISTS rsac_flood_reports_status_date_idx ON public.rsac_flood_reports (status, date DESC);
CREATE INDEX IF NOT EXISTS rsac_gallery_items_status_sort_idx ON public.rsac_gallery_items (status, sort);
CREATE INDEX IF NOT EXISTS rsac_home_feature_tabs_status_sort_idx ON public.rsac_home_feature_tabs (status, sort);
CREATE INDEX IF NOT EXISTS rsac_home_feature_tabs_status_section_sort_idx ON public.rsac_home_feature_tabs (status, section_key, sort);
CREATE INDEX IF NOT EXISTS rsac_mobile_apps_status_sort_idx ON public.rsac_mobile_apps (status, sort);
CREATE INDEX IF NOT EXISTS rsac_notices_status_date_idx ON public.rsac_notices (status, date_published DESC);
CREATE INDEX IF NOT EXISTS rsac_organisation_roles_group_sort_idx ON public.rsac_organisation_roles (status, group_key, sort);
CREATE INDEX IF NOT EXISTS rsac_page_images_page_sort_idx ON public.rsac_page_images (status, page, sort);
CREATE INDEX IF NOT EXISTS rsac_pages_status_sort_idx ON public.rsac_pages (status, section_key, sort);
CREATE INDEX IF NOT EXISTS rsac_profiles_status_type_sort_idx ON public.rsac_profiles (status, profile_type, sort);
CREATE INDEX IF NOT EXISTS rsac_quick_links_status_sort_idx ON public.rsac_quick_links (status, sort);
CREATE INDEX IF NOT EXISTS rsac_site_visits_date_created_idx ON public.rsac_site_visits (date_created DESC);

-- When this schema is applied by a database admin or after a dump restore,
-- make sure the Directus runtime user can read/write the CMS tables it serves.
-- Without these grants, Directus may show "collection does not exist" even when
-- the table is present but owned by postgres.
GRANT USAGE ON SCHEMA public TO rsac_directus;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rsac_directus;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO rsac_directus;
