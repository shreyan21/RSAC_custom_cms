# Drupal Content Model

Use these content type machine names or override them with `VITE_DRUPAL_*_BUNDLE`.

## Page: `rsac_page`

Fields:

- `title`
- `field_slug` or path alias
- `field_section_key`
- `field_summary`
- `body`
- `field_featured_image`
- `field_source_url`
- `field_sort`
- `field_card_icon`
- `field_card_color`
- `field_card_color_2`
- `field_sections_json` for structured RTI/FAQ/policy sections if needed
- `field_links_json` for public info links if needed

Used for official pages, policies, public info, facilities, services/programmes, division detail pages.

## Page Section: `rsac_page_section`

Fields:

- `title`
- `field_key`
- `field_route`
- `field_eyebrow`
- `field_intro`
- `field_sort`

Examples: `about-us`, `divisions`, `facilities`, `academics`, `services-programmes`.

## Section Item: `rsac_section_item`

Fields:

- `title`
- `field_key`
- `field_section_key`
- `field_summary`
- `field_path`
- `field_url`
- `field_icon_key`
- `field_accent`
- `field_sort`

Used for homepage cards, quick links, geoportals, service cards.

## Division: `rsac_division`

Fields:

- `title`
- `field_slug`
- `field_lead`
- `field_highlights`
- `field_source_url`
- `field_sort`

## Project: `rsac_project`

Fields:

- `title`
- `field_project_type`: `ongoing` or `completed`
- `field_division`
- `field_year`
- `field_client`
- `field_summary`
- `body`
- `field_document`
- `field_sort`

Project bundle has JSON:API fetch support. Current route parity still comes from `rsac_page.body` or `field_sections_json`; dedicated project-list UI remains a next phase.

## Publication: `rsac_publication`

Fields:

- `title`
- `field_publication_type`: `research_paper`, `technical_report`, `article`, `atlas`
- `field_division`
- `field_year`
- `field_authors`
- `field_citation`
- `field_summary`
- `body`
- `field_document`
- `field_url`
- `field_sort`

Publication bundle has JSON:API fetch support. Current route parity still comes from `rsac_page.body` or `field_sections_json`; dedicated publication-list UI remains a next phase.

## Download: `rsac_download`

Fields:

- `title`
- `field_kind`: `download`, `flood_report`, `mobile_app`
- `field_category`
- `field_date`
- `field_date_label`
- `field_coverage`
- `field_meta`
- `field_file` or `field_document`
- `field_url`
- `field_summary`
- `field_sort`

## Gallery Item: `rsac_gallery_item`

Fields:

- `title`
- `field_key`
- `field_image`
- `field_alt_text`
- `field_sort`

## Notice/Tender/FAQ: `rsac_notice_tender_faq`

Fields:

- `title`
- `field_kind`: `notice`, `tender`, `faq`, `circular`
- `field_category`
- `field_date`
- `field_last_date`
- `field_meta`
- `field_file` or `field_document`
- `body` for FAQ answer or long notice text
- `field_sort`

## Menu Item: `rsac_menu_item`

Fields:

- `title`
- `field_summary`
- `field_path`
- `field_links_json`
- `field_sort`

`field_links_json` shape:

```json
[
  { "label": "All", "path": "/divisions", "description": "Open divisions" }
]
```

## Site Setting: `rsac_site_setting`

Fields:

- `title`
- `field_settings_json`

`field_settings_json` should follow existing `src/data/siteSettings.js` shape. Use only for shared labels, footer, homepage layout, branding, and controlled settings.

## Translation

Enable Content Translation for all public content types. Translate fields manually. Leave missing Hindi empty when English fallback is acceptable.
