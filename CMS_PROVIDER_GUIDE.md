# CMS Provider Guide

This frontend can now target Drupal first while keeping Directus/static fallback.

## Provider Values

Use public Vite env values for frontend configuration:

```text
VITE_CMS_ENABLED=true
VITE_CMS_PROVIDER=drupal
VITE_CMS_URL=https://cms.example.gov.in
```

`CMS_PROVIDER=drupal` can be used in server notes, but browser code must use `VITE_CMS_PROVIDER=drupal` because Vite only exposes `VITE_*` values to the frontend.

## Drupal Provider

Required:

```text
VITE_CMS_ENABLED=true
VITE_CMS_PROVIDER=drupal
VITE_CMS_URL=https://cms.example.gov.in
VITE_DRUPAL_JSONAPI_PATH=/jsonapi
```

Optional:

```text
VITE_DRUPAL_LANGUAGE_PREFIX_MODE=path
VITE_DRUPAL_API_TOKEN=read-only-public-token-if-required
VITE_DRUPAL_FEEDBACK_PATH=/rsac-api/feedback
VITE_DRUPAL_VISIT_PATH=/rsac-api/visit
VITE_DRUPAL_VISIT_COUNT_PATH=/rsac-api/visit-count
```

Bundle overrides:

```text
VITE_DRUPAL_PAGE_BUNDLE=rsac_page
VITE_DRUPAL_PAGE_SECTION_BUNDLE=rsac_page_section
VITE_DRUPAL_SECTION_ITEM_BUNDLE=rsac_section_item
VITE_DRUPAL_DIVISION_BUNDLE=rsac_division
VITE_DRUPAL_PROJECT_BUNDLE=rsac_project
VITE_DRUPAL_PUBLICATION_BUNDLE=rsac_publication
VITE_DRUPAL_DOWNLOAD_BUNDLE=rsac_download
VITE_DRUPAL_GALLERY_BUNDLE=rsac_gallery_item
VITE_DRUPAL_NOTICE_BUNDLE=rsac_notice_tender_faq
VITE_DRUPAL_MENU_BUNDLE=rsac_menu_item
VITE_DRUPAL_SITE_SETTING_BUNDLE=rsac_site_setting
```

## Directus Provider

Directus remains available:

```text
VITE_CMS_ENABLED=true
VITE_CMS_PROVIDER=directus
VITE_CMS_URL=https://cms.example.gov.in
```

## Directus Fallback During Drupal Migration

When Drupal is active, Directus can still be used as second fallback before static files:

```text
VITE_CMS_PROVIDER=drupal
VITE_DIRECTUS_FALLBACK_ENABLED=true
VITE_DIRECTUS_FALLBACK_URL=https://old-directus.example.gov.in
```

Fallback order in Drupal mode:

1. Drupal JSON:API
2. Directus fallback, only when enabled and URL is configured
3. Static fallback files in `src/data`
4. Safe defaults already in components

## Current Drupal-Connected Areas

Safe Drupal branches exist for:

- Divisions cards
- Facilities cards
- Quick links
- Mobile-app/download rows with kind `mobile_app`
- Gallery
- Geoportals
- Flood reports with download kind `flood_report`
- Notices/tenders through `rsac_notice_tender_faq`
- Policies through `rsac_page` rows with section key `policies`
- Public info pages through `rsac_page` rows with section key `public_info`
- Menu items
- Site settings through `field_settings_json`
- Official content pages through Page Section + Page rows
- Project, publication, and generic download JSON:API helpers are ready; current page UI still renders those lists from official Page body content for parity
- Feedback/visitor count only if custom Drupal endpoints are configured

Risky/missing Drupal rows safely fall back.

## Secrets Rule

Do not put PostgreSQL passwords, Drupal admin passwords, private API keys, database dumps, or uploaded files in git. Any `VITE_*` value is visible in browser output.
