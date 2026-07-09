# Drupal Active CMS Guide

This project now supports Drupal as the active headless CMS target without removing Directus or static fallback.

## Enable Drupal

In `.env.local`:

```text
VITE_CMS_ENABLED=true
VITE_CMS_PROVIDER=drupal
VITE_CMS_URL=https://cms.example.gov.in
VITE_DRUPAL_JSONAPI_PATH=/jsonapi
VITE_DRUPAL_LANGUAGE_PREFIX_MODE=path
```

Run frontend:

```powershell
npm install
npm run dev
```

Run local Drupal CMS after bootstrap:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-drupal-local.ps1
```

Build:

```powershell
npm run build
```

## How Content Is Read

The frontend still uses existing hooks and UI:

- `DataProvider` asks `cmsService`.
- `cmsService` asks Drupal first when provider is `drupal`.
- If Drupal returns empty/missing data, old Directus path can run when fallback is enabled.
- If both CMS paths miss, static fallback files keep site working.

No route/layout redesign is required.

## Hindi

- Enter Hindi manually in Drupal translations.
- Do not auto-translate official content.
- If Hindi content is missing, JSON:API language-prefix request can fall back to English.
- Existing frontend Hindi term maps still protect static fallback and legacy division behavior.

## Media

Use Drupal Media Library fields for images, PDFs, and videos. JSON:API should include media relationships so frontend can resolve file URLs.

Recommended media fields:

- `field_image`
- `field_file`
- `field_document`
- `field_featured_image`

## Feedback and Visitor Count

These need custom Drupal endpoints if CMS storage is required:

```text
VITE_DRUPAL_FEEDBACK_PATH=/rsac-api/feedback
VITE_DRUPAL_VISIT_PATH=/rsac-api/visit
VITE_DRUPAL_VISIT_COUNT_PATH=/rsac-api/visit-count
```

If endpoints are absent, feedback falls back to `mailto:` and visitor count remains unavailable or uses Directus fallback.

## Rollback

Set:

```text
VITE_CMS_PROVIDER=directus
VITE_CMS_URL=https://old-directus.example.gov.in
```

Or disable CMS:

```text
VITE_CMS_ENABLED=false
```

Static fallback remains in repo.
