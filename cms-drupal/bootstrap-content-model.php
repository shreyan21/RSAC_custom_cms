<?php

use Drupal\Core\Entity\Entity\EntityFormDisplay;
use Drupal\Core\Entity\Entity\EntityViewDisplay;
use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\language\Entity\ConfigurableLanguage;
use Drupal\node\Entity\Node;
use Drupal\node\Entity\NodeType;

$bundles = [
  'rsac_site_setting' => 'RSAC Site Setting',
  'rsac_page_section' => 'RSAC Page Section',
  'rsac_page' => 'RSAC Page',
  'rsac_section_item' => 'RSAC Section Item',
  'rsac_division' => 'RSAC Division',
  'rsac_project' => 'RSAC Project',
  'rsac_publication' => 'RSAC Publication',
  'rsac_download' => 'RSAC Download',
  'rsac_gallery_item' => 'RSAC Gallery Item',
  'rsac_notice_tender_faq' => 'RSAC Notice Tender FAQ',
  'rsac_menu_item' => 'RSAC Menu Item',
];

foreach ($bundles as $type => $label) {
  if (!NodeType::load($type)) {
    NodeType::create([
      'type' => $type,
      'name' => $label,
    ])->save();
  }
}

$field_defs = [
  'field_key' => ['string', 'Key'],
  'field_slug' => ['string', 'Slug'],
  'field_section_key' => ['string', 'Section key'],
  'field_route' => ['string', 'Route'],
  'field_eyebrow' => ['string', 'Eyebrow'],
  'field_summary' => ['string_long', 'Summary'],
  'field_intro' => ['string_long', 'Intro'],
  'field_lead' => ['string_long', 'Lead'],
  'field_highlights' => ['string_long', 'Highlights'],
  'field_path' => ['string', 'Path'],
  'field_url' => ['uri', 'URL'],
  'field_source_url' => ['uri', 'Source URL'],
  'field_icon_key' => ['string', 'Icon key'],
  'field_accent' => ['string', 'Accent'],
  'field_card_icon' => ['string', 'Card icon'],
  'field_card_color' => ['string', 'Card color'],
  'field_card_color_2' => ['string', 'Card color 2'],
  'field_kind' => ['string', 'Kind'],
  'field_project_type' => ['string', 'Project type'],
  'field_publication_type' => ['string', 'Publication type'],
  'field_category' => ['string', 'Category'],
  'field_year' => ['string', 'Year'],
  'field_client' => ['string', 'Client'],
  'field_authors' => ['string_long', 'Authors'],
  'field_citation' => ['string_long', 'Citation'],
  'field_date' => ['string', 'Date'],
  'field_date_label' => ['string', 'Date label'],
  'field_last_date' => ['string', 'Last date'],
  'field_coverage' => ['string', 'Coverage'],
  'field_meta' => ['string_long', 'Meta'],
  'field_alt_text' => ['string', 'Alt text'],
  'field_sort' => ['integer', 'Sort order'],
  'field_sections_json' => ['string_long', 'Sections JSON'],
  'field_links_json' => ['string_long', 'Links JSON'],
  'field_settings_json' => ['string_long', 'Settings JSON'],
  'field_featured_image' => ['entity_reference', 'Featured image', 'media'],
  'field_image' => ['entity_reference', 'Image', 'media'],
  'field_file' => ['entity_reference', 'File', 'media'],
  'field_document' => ['entity_reference', 'Document', 'media'],
  'field_division' => ['entity_reference', 'Division', 'node'],
];

$bundle_fields = [
  'rsac_site_setting' => ['field_settings_json'],
  'rsac_page_section' => ['field_key', 'field_route', 'field_eyebrow', 'field_intro', 'field_sort'],
  'rsac_page' => [
    'field_slug', 'field_section_key', 'field_summary', 'field_featured_image',
    'field_source_url', 'field_sort', 'field_card_icon', 'field_card_color',
    'field_card_color_2', 'field_sections_json', 'field_links_json',
    'field_eyebrow', 'field_intro',
  ],
  'rsac_section_item' => [
    'field_key', 'field_section_key', 'field_summary', 'field_path', 'field_url',
    'field_icon_key', 'field_accent', 'field_sort',
  ],
  'rsac_division' => ['field_slug', 'field_lead', 'field_highlights', 'field_source_url', 'field_sort'],
  'rsac_project' => [
    'field_project_type', 'field_division', 'field_year', 'field_client',
    'field_summary', 'field_document', 'field_sort',
  ],
  'rsac_publication' => [
    'field_publication_type', 'field_division', 'field_year', 'field_authors',
    'field_citation', 'field_summary', 'field_document', 'field_url', 'field_sort',
  ],
  'rsac_download' => [
    'field_kind', 'field_category', 'field_date', 'field_date_label',
    'field_coverage', 'field_meta', 'field_file', 'field_document',
    'field_url', 'field_summary', 'field_sort',
  ],
  'rsac_gallery_item' => ['field_key', 'field_image', 'field_alt_text', 'field_sort'],
  'rsac_notice_tender_faq' => [
    'field_kind', 'field_category', 'field_date', 'field_last_date',
    'field_meta', 'field_file', 'field_document', 'field_sort',
  ],
  'rsac_menu_item' => ['field_summary', 'field_path', 'field_links_json', 'field_sort'],
];

foreach ($field_defs as $field_name => $def) {
  [$type, $label] = $def;
  $settings = [];
  if ($type === 'entity_reference') {
    $settings['target_type'] = $def[2];
  }

  if (!FieldStorageConfig::loadByName('node', $field_name)) {
    FieldStorageConfig::create([
      'field_name' => $field_name,
      'entity_type' => 'node',
      'type' => $type,
      'settings' => $settings,
    ])->save();
  }

  foreach ($bundle_fields as $bundle => $fields) {
    if (!in_array($field_name, $fields, TRUE)) {
      continue;
    }

    if (!FieldConfig::loadByName('node', $bundle, $field_name)) {
      FieldConfig::create([
        'field_name' => $field_name,
        'entity_type' => 'node',
        'bundle' => $bundle,
        'label' => $label,
        'settings' => $type === 'entity_reference'
          ? [
              'handler' => $def[2] === 'node' ? 'default:node' : 'default:media',
              'handler_settings' => $def[2] === 'node'
                ? ['target_bundles' => ['rsac_division' => 'rsac_division']]
                : [],
            ]
          : [],
      ])->save();
    }
  }
}

if (!FieldStorageConfig::loadByName('node', 'body')) {
  FieldStorageConfig::create([
    'field_name' => 'body',
    'entity_type' => 'node',
    'type' => 'text_with_summary',
    'settings' => [],
    'module' => 'text',
  ])->save();
}

foreach (['rsac_page', 'rsac_notice_tender_faq', 'rsac_project', 'rsac_publication'] as $bundle) {
  if (!FieldConfig::loadByName('node', $bundle, 'body')) {
    FieldConfig::create([
      'field_name' => 'body',
      'entity_type' => 'node',
      'bundle' => $bundle,
      'label' => 'Body',
      'settings' => ['display_summary' => TRUE],
    ])->save();
  }
}

if (!ConfigurableLanguage::load('hi')) {
  ConfigurableLanguage::createFromLangcode('hi')->save();
}

$translation_manager = \Drupal::service('content_translation.manager');
foreach (array_keys($bundles) as $bundle) {
  $translation_manager->setEnabled('node', $bundle, TRUE);
}

$anonymous = \Drupal\user\Entity\Role::load('anonymous');
if ($anonymous && !$anonymous->hasPermission('access content')) {
  $anonymous->grantPermission('access content')->save();
}

$site_settings = \Drupal::entityQuery('node')
  ->condition('type', 'rsac_site_setting')
  ->accessCheck(FALSE)
  ->range(0, 1)
  ->execute();

if (!$site_settings) {
  Node::create([
    'type' => 'rsac_site_setting',
    'title' => 'Default RSAC Site Settings',
    'status' => 1,
    'field_settings_json' => '{}',
  ])->save();
}

drupal_flush_all_caches();

print "RSAC Drupal content model ready.\n";
