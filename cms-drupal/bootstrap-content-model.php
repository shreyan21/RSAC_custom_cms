<?php

use Drupal\Core\Entity\Entity\EntityFormDisplay;
use Drupal\Core\Entity\Entity\EntityViewDisplay;
use Drupal\Core\Field\Entity\BaseFieldOverride;
use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\language\Entity\ConfigurableLanguage;
use Drupal\node\Entity\Node;
use Drupal\node\Entity\NodeType;

$required_modules = [
  'language',
  'locale',
  'content_translation',
  'config_translation',
  'media',
  'media_library',
  'jsonapi',
  'path',
  'menu_ui',
  'rest',
  'serialization',
];
\Drupal::service('module_installer')->install($required_modules);

$bundles = [
  'rsac_site_setting' => 'Site Setting',
  'rsac_contact' => 'Contact',
  'rsac_profile' => 'Scientists / Officials / Staff',
  'rsac_manpower_group' => 'Manpower Group',
  'rsac_hero_video' => 'Homepage Hero Video',
  'rsac_brand_logo' => 'Header / Footer Logo',
  'rsac_organisation_role' => 'Organisation Chart Role',
  'rsac_page_section' => 'Page Group / Main Section',
  'rsac_page' => 'Page',
  'rsac_section_item' => 'Homepage Card / Quick Link / Geoportal',
  'rsac_division' => 'Division',
  'rsac_project' => 'Project',
  'rsac_publication' => 'Publication / Research Paper / Report',
  'rsac_download' => 'Download / Flood Report / Mobile App',
  'rsac_gallery_item' => 'Gallery Item',
  'rsac_notice_tender_faq' => 'Notice / Tender / FAQ',
  'rsac_menu_item' => 'Menu Item',
];

foreach ($bundles as $type => $label) {
  $node_type = NodeType::load($type);
  if (!$node_type) {
    $node_type = NodeType::create([
      'type' => $type,
      'name' => $label,
    ]);
  }
  if ($node_type->label() !== $label) {
    $node_type->set('name', $label);
  }
  $node_type->save();
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
  'field_contacts_json' => ['string_long', 'Contacts JSON'],
  'field_contact_rows_json' => ['string_long', 'Contact rows JSON'],
  'field_profile_type' => ['string', 'Profile type'],
  'field_base_name' => ['string', 'Base name'],
  'field_designation' => ['string', 'Designation'],
  'field_role' => ['string', 'Role'],
  'field_department' => ['string', 'Department'],
  'field_deployment' => ['string', 'Deployment'],
  'field_employee_id' => ['string', 'Employee ID'],
  'field_duration' => ['string', 'Duration'],
  'field_object_position' => ['string', 'Object position'],
  'field_specialization' => ['string_long', 'Specialization'],
  'field_experience' => ['string', 'Experience'],
  'field_publications' => ['string', 'Publications'],
  'field_contact' => ['string', 'Contact'],
  'field_email' => ['string', 'Email'],
  'field_details' => ['string_long', 'Details'],
  'field_address' => ['string_long', 'Address'],
  'field_phone' => ['string', 'Phone'],
  'field_mobile' => ['string', 'Mobile'],
  'field_count' => ['string', 'Count'],
  'field_text' => ['string_long', 'Text'],
  'field_button_label' => ['string', 'Button label'],
  'field_tagline' => ['string_long', 'Tagline'],
  'field_deliverables' => ['string_long', 'Deliverables'],
  'field_stat_value' => ['string', 'Statistic value'],
  'field_stat_label' => ['string', 'Statistic label'],
  'field_link_label' => ['string', 'Link label'],
  'field_file_name' => ['string', 'File name'],
  'field_poster_url' => ['uri', 'Poster URL'],
  'field_link_url' => ['uri', 'Link URL'],
  'field_placement' => ['string', 'Placement'],
  'field_role_key' => ['string', 'Role key'],
  'field_group_key' => ['string', 'Group key'],
  'field_slot' => ['string', 'Slot'],
  'field_name' => ['string', 'Name'],
  'field_post' => ['string', 'Post'],
  'field_featured_image' => ['entity_reference', 'Featured image', 'media'],
  'field_image' => ['entity_reference', 'Image', 'media'],
  'field_photo' => ['entity_reference', 'Photo', 'media'],
  'field_video' => ['entity_reference', 'Video', 'media'],
  'field_poster' => ['entity_reference', 'Poster', 'media'],
  'field_file' => ['entity_reference', 'File', 'media'],
  'field_document' => ['entity_reference', 'Document', 'media'],
  'field_division' => ['entity_reference', 'Division', 'node'],
];

$bundle_fields = [
  'rsac_site_setting' => ['field_settings_json'],
  'rsac_contact' => [
    'field_address', 'field_email', 'field_phone', 'field_mobile',
    'field_contacts_json', 'field_contact_rows_json', 'field_sort',
  ],
  'rsac_profile' => [
    'field_key', 'field_profile_type', 'field_base_name',
    'field_designation', 'field_role', 'field_department', 'field_deployment',
    'field_employee_id', 'field_duration', 'field_image', 'field_photo',
    'field_object_position', 'field_specialization', 'field_experience',
    'field_publications', 'field_contact', 'field_email', 'field_source_url',
    'field_category', 'field_details', 'field_sort',
  ],
  'rsac_manpower_group' => ['field_count', 'field_text', 'field_path', 'field_sort'],
  'rsac_hero_video' => [
    'field_key', 'field_file_name', 'field_video', 'field_poster',
    'field_url', 'field_poster_url', 'field_sort',
  ],
  'rsac_brand_logo' => [
    'field_key', 'field_image', 'field_alt_text', 'field_link_url',
    'field_placement', 'field_sort',
  ],
  'rsac_organisation_role' => [
    'field_key', 'field_role_key', 'field_group_key', 'field_slot',
    'field_name', 'field_role', 'field_designation', 'field_post',
    'field_photo', 'field_object_position', 'field_sort',
  ],
  'rsac_page_section' => ['field_key', 'field_route', 'field_eyebrow', 'field_intro', 'field_sort'],
  'rsac_page' => [
    'field_slug', 'field_section_key', 'field_summary', 'field_featured_image',
    'field_source_url', 'field_sort', 'field_card_icon', 'field_card_color',
    'field_card_color_2', 'field_sections_json', 'field_links_json',
    'field_eyebrow', 'field_intro',
  ],
  'rsac_section_item' => [
    'field_key', 'field_section_key', 'field_summary', 'field_path', 'field_url',
    'field_icon_key', 'field_accent', 'field_details', 'field_button_label',
    'field_category', 'field_tagline', 'field_deliverables',
    'field_stat_value', 'field_stat_label', 'field_link_label', 'field_sort',
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
  'rsac_gallery_item' => ['field_key', 'field_image', 'field_url', 'field_alt_text', 'field_sort'],
  'rsac_notice_tender_faq' => [
    'field_kind', 'field_category', 'field_date', 'field_last_date',
    'field_meta', 'field_file', 'field_document', 'field_url', 'field_sort',
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

$editor_field_help = [
  'field_sections_json' => [
    'Flexible page blocks (JSON)',
    'Optional. When filled, these ordered blocks replace Body on official pages. Supported types: rich_text, heading, cards, list, ordered_list, stats, table, links, callout, divider. Leave empty to use Body.',
  ],
  'field_links_json' => [
    'Related links (JSON)',
    'Optional list of links. Example: [{"title":"Open service","url":"/services"}]',
  ],
];

foreach ($editor_field_help as $field_name => [$label, $description]) {
  $field = FieldConfig::loadByName('node', 'rsac_page', $field_name);
  if ($field) {
    $field->setLabel($label);
    $field->setDescription($description);
    $field->save();
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

foreach ([
  'rsac_page',
  'rsac_notice_tender_faq',
  'rsac_project',
  'rsac_publication',
  'rsac_contact',
  'rsac_profile',
  'rsac_manpower_group',
] as $bundle) {
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

$bundle_descriptions = [
  'rsac_page' => 'Website pages: About, division details, facilities, services, programmes, policies, and public information.',
  'rsac_page_section' => 'Top-level page groups used by website routes and section menus.',
  'rsac_division' => 'Division cards and division summary information.',
  'rsac_profile' => 'Scientists, leadership, officials, former staff, technical staff, and administration.',
  'rsac_project' => 'Completed and ongoing projects linked to divisions.',
  'rsac_publication' => 'Research papers, publications, technical reports, atlases, and plans.',
  'rsac_notice_tender_faq' => 'Notices, tenders, and frequently asked questions. Kind decides where item appears.',
  'rsac_gallery_item' => 'Public gallery photographs and accessibility alt text.',
  'rsac_download' => 'Downloads, flood reports, and mobile applications. Kind decides website section.',
  'rsac_section_item' => 'Homepage cards, quick links, geoportals, and service/programme cards.',
  'rsac_menu_item' => 'Header and footer navigation items.',
  'rsac_contact' => 'Website contact address, phone, email, and contact rows.',
  'rsac_site_setting' => 'Global website settings and homepage configuration.',
];

foreach ($bundle_descriptions as $bundle => $description) {
  $node_type = NodeType::load($bundle);
  if ($node_type) {
    $node_type->set('description', $description)->save();
  }
}

$field_help = [
  'field_key' => 'Stable internal key. Keep existing value unchanged when editing.',
  'field_slug' => 'URL name without slashes, for example remote-sensing-applications. Keep unique.',
  'field_section_key' => 'Website group. Common values: about-us, divisions, facilities, quick_links, geoportals, services.',
  'field_route' => 'Website route without leading slash, for example about-us.',
  'field_summary' => 'Short text shown on cards and listing pages.',
  'field_sort' => 'Display order. Smaller number appears first.',
  'field_kind' => 'Item category. Use notice, tender, faq, download, flood_report, or mobile_app as applicable.',
  'field_profile_type' => 'Use scientist, official, leadership, former, technical, or administration.',
  'field_project_type' => 'Use ongoing or completed.',
  'field_publication_type' => 'Use publication, research_paper, technical_report, atlas, or plan.',
  'field_source_url' => 'Optional original source/reference URL. Does not replace website route.',
  'field_path' => 'Website path beginning with /, for example /about-us.',
  'field_url' => 'External website or file URL. Upload Drupal media when possible.',
  'field_alt_text' => 'Describe image for screen-reader users. Do not write file name.',
  'field_highlights' => 'One highlight per line, or a JSON list when structured values are needed.',
  'field_details' => 'One detail per line, or a JSON list when structured values are needed.',
  'field_settings_json' => 'Advanced global settings. Edit only documented keys; invalid JSON uses website fallback.',
  'field_contacts_json' => 'Advanced contact rows in JSON. Keep valid JSON.',
  'field_contact_rows_json' => 'Advanced contact rows in JSON. Keep valid JSON.',
];

foreach ($bundle_fields as $bundle => $fields) {
  foreach ($fields as $field_name) {
    $field = FieldConfig::loadByName('node', $bundle, $field_name);
    if ($field && isset($field_help[$field_name])) {
      $field->setDescription($field_help[$field_name])->save();
    }
  }
}

$title_labels = [
  'rsac_profile' => 'Name',
  'rsac_division' => 'Division name',
  'rsac_contact' => 'Contact record name',
  'rsac_site_setting' => 'Setting name',
  'rsac_organisation_role' => 'Role label',
  'rsac_gallery_item' => 'Photo caption',
];

foreach (array_keys($bundles) as $bundle) {
  $override = BaseFieldOverride::loadByName('node', $bundle, 'title');
  if (!$override) {
    $override = BaseFieldOverride::createFromBaseFieldDefinition(
      \Drupal::service('entity_field.manager')->getBaseFieldDefinitions('node')['title'],
      $bundle
    );
  }
  $override->setLabel($title_labels[$bundle] ?? 'Title')->save();

  $display = EntityFormDisplay::load("node.$bundle.default");
  if (!$display) {
    $display = EntityFormDisplay::create([
      'targetEntityType' => 'node',
      'bundle' => $bundle,
      'mode' => 'default',
      'status' => TRUE,
    ]);
  }

  $display->setComponent('title', [
    'type' => 'string_textfield',
    'weight' => -30,
  ]);
  $display->setComponent('langcode', [
    'type' => 'language_select',
    'weight' => -29,
  ]);

  $weight = -20;
  if (FieldConfig::loadByName('node', $bundle, 'body')) {
    $display->setComponent('body', [
      'type' => 'text_textarea_with_summary',
      'weight' => $weight++,
      'settings' => ['rows' => 18, 'summary_rows' => 3],
    ]);
  }

  foreach ($bundle_fields[$bundle] ?? [] as $field_name) {
    $field = FieldConfig::loadByName('node', $bundle, $field_name);
    if (!$field) {
      continue;
    }

    $field_type = $field->getType();
    $widget = match ($field_type) {
      'string_long' => 'string_textarea',
      'integer' => 'number',
      'uri' => 'uri',
      'entity_reference' => $field->getSetting('handler') === 'default:media'
        ? 'media_library_widget'
        : 'entity_reference_autocomplete',
      default => 'string_textfield',
    };
    $settings = $field_type === 'string_long' ? ['rows' => 5] : [];

    $display->setComponent($field_name, [
      'type' => $widget,
      'weight' => $weight++,
      'settings' => $settings,
    ]);
  }

  $display->save();
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
