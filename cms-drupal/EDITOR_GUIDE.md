# Drupal Editor Guide

## Basic Rule

Edit content in Drupal. Do not edit React UI files for normal content updates.

## Hindi

- Switch to Hindi translation for the same content item.
- Type Hindi manually.
- Do not use automatic translation for official content.
- If Hindi is blank, the frontend can fall back to English.

## Create Notice

1. Add content: `Notice/Tender/FAQ`.
2. Set `field_kind=notice` or `circular`.
3. Fill title, category, date, meta, last date if applicable.
4. Attach PDF in `field_document` or `field_file`.
5. Publish.

## Create Tender

1. Add content: `Notice/Tender/FAQ`.
2. Set `field_kind=tender`.
3. Add title, last date, PDF, and meta.
4. Publish.

Tender rows currently appear in the notices feed. A separate tender page can use `rsac_page` with slug `tenders`.

## Create FAQ

1. Add content: `Notice/Tender/FAQ`.
2. Set `field_kind=faq`.
3. Put question in title.
4. Put answer in body.
5. Publish.

FAQ list rendering from dedicated FAQ nodes is a next phase unless FAQ content is also entered into the `rsac_page` row with slug `faq`.

## Create Gallery Item

1. Add content: `Gallery Item`.
2. Add title/caption.
3. Upload image through Media Library.
4. Fill alt text.
5. Set display order if needed.
6. Publish.

## Create Download

1. Add content: `Download`.
2. Set `field_kind=download`, `flood_report`, or `mobile_app`.
3. Attach file or set external URL.
4. Fill category/meta/date fields.
5. Publish.

## Create Project

1. Add content: `Project`.
2. Set `field_project_type=ongoing` or `completed`.
3. Link division if configured.
4. Fill summary/year/client/document.
5. Publish.

Frontend has JSON:API fetch support for project nodes. Current route parity still comes from the matching `Page` body, so include approved project text there until a dedicated list UI is added.

## Create Publication

1. Add content: `Publication`.
2. Set `field_publication_type=research_paper`, `technical_report`, `article`, or `atlas`.
3. Fill year/authors/citation/summary/document.
4. Publish.

Frontend has JSON:API fetch support for publication nodes. Current route parity still comes from the matching `Page` body, so include approved publication text there until a dedicated list UI is added.

## Menu/Footer

Menu rows use `Menu Item`. Footer/shared settings use `Site Setting` JSON. Ask developer before changing JSON shape.
