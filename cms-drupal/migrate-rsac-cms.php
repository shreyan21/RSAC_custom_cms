<?php

use Drupal\Core\File\FileExists;
use Drupal\media\Entity\Media;
use Drupal\node\Entity\Node;

function source_env(string $name, string $default = ''): string {
  $value = getenv($name);
  return $value === FALSE || $value === '' ? $default : $value;
}

function source_rows(PDO $source, string $sql): array {
  return $source->query($sql)->fetchAll(PDO::FETCH_ASSOC);
}

function source_text(mixed $value): string {
  if ($value === NULL) {
    return '';
  }
  if (is_string($value)) {
    $decoded = json_decode($value, TRUE);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
      return implode("\n", array_map(
        static fn (mixed $item): string => is_scalar($item) ? (string) $item : json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        $decoded
      ));
    }
  }
  return (string) $value;
}

function source_json(mixed $value, array $fallback = []): array {
  if (is_array($value)) {
    return $value;
  }
  if (!is_string($value) || $value === '') {
    return $fallback;
  }
  $decoded = json_decode($value, TRUE);
  return is_array($decoded) ? $decoded : $fallback;
}

function set_nested_value(array &$target, string $path, mixed $value): void {
  $parts = explode('.', $path);
  $cursor =& $target;
  foreach ($parts as $index => $part) {
    $key = ctype_digit($part) ? (int) $part : $part;
    if ($index === count($parts) - 1) {
      $cursor[$key] = $value;
      return;
    }
    if (!isset($cursor[$key]) || !is_array($cursor[$key])) {
      $cursor[$key] = [];
    }
    $cursor =& $cursor[$key];
  }
}

function content_block_value(array $row, string $column): mixed {
  $value = $row[$column] ?? '';
  if (($row['value_type'] ?? '') === 'boolean') {
    return filter_var($value, FILTER_VALIDATE_BOOLEAN);
  }
  return $value;
}

function find_node(string $bundle, array $conditions): ?Node {
  $query = \Drupal::entityQuery('node')
    ->accessCheck(FALSE)
    ->condition('type', $bundle)
    ->range(0, 1);
  foreach ($conditions as $field => $value) {
    $query->condition($field, $value);
  }
  $ids = $query->execute();
  return $ids ? Node::load(reset($ids)) : NULL;
}

function set_values(Node $node, array $values): void {
  foreach ($values as $field => $value) {
    if ($value === NULL || !$node->hasField($field)) {
      continue;
    }
    $node->set($field, $value);
  }
}

function upsert_source_node(string $bundle, array $lookup, array $values): Node {
  $node = find_node($bundle, $lookup) ?: Node::create(['type' => $bundle]);
  set_values($node, $values);
  $node->setPublished(TRUE);
  $node->save();
  return $node;
}

function upsert_section_item(string $section, string $raw_key, array $values): Node {
  $key = $section . '-' . $raw_key;
  $node = find_node('rsac_section_item', ['field_key' => $key]);
  if (!$node) {
    $node = find_node('rsac_section_item', [
      'field_key' => $raw_key,
      'field_section_key' => $section,
    ]);
  }
  $node = $node ?: Node::create(['type' => 'rsac_section_item']);
  set_values($node, [
    ...$values,
    'field_key' => $key,
    'field_section_key' => $section,
  ]);
  $node->setPublished(TRUE);
  $node->save();
  return $node;
}

function set_hindi(Node $node, array $values): void {
  $values = array_filter($values, static fn (mixed $value): bool => $value !== NULL && $value !== '');
  if (!$values) {
    return;
  }
  $translation = $node->hasTranslation('hi')
    ? $node->getTranslation('hi')
    : $node->addTranslation('hi', ['title' => $values['title'] ?? $node->label()]);
  set_values($translation, $values);
  $translation->setPublished(TRUE);
  $translation->save();
}

function import_source_media(PDO $source, string $uploads, ?string $source_id, string $bundle, string $alt = ''): ?int {
  if (!$source_id) {
    return NULL;
  }
  $statement = $source->prepare('SELECT filename_disk, filename_download FROM directus_files WHERE id = :id');
  $statement->execute(['id' => $source_id]);
  $record = $statement->fetch(PDO::FETCH_ASSOC);
  if (!$record || !$record['filename_disk']) {
    return NULL;
  }

  $source_path = rtrim($uploads, '/\\') . DIRECTORY_SEPARATOR . $record['filename_disk'];
  if (!is_file($source_path)) {
    print "WARN Missing source upload: {$record['filename_disk']}\n";
    return NULL;
  }

  $directory = 'public://rsac-migrated';
  \Drupal::service('file_system')->prepareDirectory(
    $directory,
    \Drupal\Core\File\FileSystemInterface::CREATE_DIRECTORY | \Drupal\Core\File\FileSystemInterface::MODIFY_PERMISSIONS
  );
  $destination = $directory . '/' . $record['filename_disk'];
  $files = \Drupal::entityTypeManager()->getStorage('file')->loadByProperties(['uri' => $destination]);
  $file = $files ? reset($files) : \Drupal::service('file.repository')->writeData(
    file_get_contents($source_path),
    $destination,
    FileExists::Replace
  );
  $file->setPermanent();
  $file->save();

  $media_storage = \Drupal::entityTypeManager()->getStorage('media');
  $source_field = $bundle === 'image' ? 'field_media_image' : 'field_media_video_file';
  $media_ids = \Drupal::entityQuery('media')
    ->accessCheck(FALSE)
    ->condition('bundle', $bundle)
    ->condition($source_field . '.target_id', $file->id())
    ->range(0, 1)
    ->execute();
  $media = $media_ids ? Media::load(reset($media_ids)) : Media::create([
    'bundle' => $bundle,
    'name' => $record['filename_download'] ?: $record['filename_disk'],
    'status' => 1,
  ]);
  $media->set($source_field, $bundle === 'image'
    ? ['target_id' => $file->id(), 'alt' => $alt]
    : ['target_id' => $file->id()]);
  $media->save();
  return (int) $media->id();
}

$password = source_env('RSAC_SOURCE_DB_PASSWORD');
if ($password === '') {
  throw new RuntimeException('Set RSAC_SOURCE_DB_PASSWORD before running this migration.');
}

$source_database = source_env('RSAC_SOURCE_DB_NAME', 'rsac_cms');
$active_database = \Drupal::database()->getConnectionOptions()['database'] ?? '';
if ($source_database === $active_database) {
  throw new RuntimeException('Source database must be separate from the active Drupal database.');
}

$source = new PDO(
  sprintf(
    'pgsql:host=%s;port=%s;dbname=%s',
    source_env('RSAC_SOURCE_DB_HOST', '127.0.0.1'),
    source_env('RSAC_SOURCE_DB_PORT', '5432'),
    $source_database
  ),
  source_env('RSAC_SOURCE_DB_USER', 'postgres'),
  $password,
  [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$source->exec('SET default_transaction_read_only = on');
$uploads = source_env('RSAC_SOURCE_UPLOADS');
if ($uploads === '' || !is_dir($uploads)) {
  throw new RuntimeException('Set RSAC_SOURCE_UPLOADS to the existing Directus uploads directory.');
}

$counts = [
  'profiles' => 0,
  'logos' => 0,
  'hero' => 0,
  'manpower' => 0,
  'organisation' => 0,
  'policies' => 0,
  'public_info' => 0,
  'site_settings' => 0,
  'homepage_features' => 0,
  'service_cards' => 0,
  'application_cards' => 0,
  'operational_domains' => 0,
  'impact_stats' => 0,
  'duplicate_facilities_removed' => 0,
];

// Older local seeding created ten summary-only facility duplicates. The full
// official facility pages use their real slugs and remain untouched.
for ($index = 0; $index < 10; $index++) {
  $duplicate = find_node('rsac_page', ['field_slug' => 'facility-' . $index]);
  if ($duplicate) {
    $duplicate->delete();
    $counts['duplicate_facilities_removed']++;
  }
}

foreach (source_rows($source, "SELECT * FROM rsac_profiles WHERE status = 'published' ORDER BY sort, id") as $row) {
  $key = 'rsac-cms-profile-' . $row['id'];
  $node = find_node('rsac_profile', ['field_key' => $key]);
  if (!$node) {
    $node = find_node('rsac_profile', [
      'title' => $row['name'],
      'field_profile_type' => $row['profile_type'],
    ]);
  }
  $photo = import_source_media($source, $uploads, $row['photo'], 'image', $row['name']);
  $node = $node ?: Node::create(['type' => 'rsac_profile']);
  set_values($node, [
    'title' => $row['name'],
    'field_key' => $key,
    'field_profile_type' => $row['profile_type'],
    'field_base_name' => $row['name'],
    'field_role' => $row['role'],
    'field_designation' => $row['designation'],
    'field_department' => $row['department'],
    'field_deployment' => $row['deployment'],
    'field_employee_id' => $row['employee_id'],
    'field_duration' => $row['duration'],
    'field_photo' => $photo ? ['target_id' => $photo] : NULL,
    'field_object_position' => $row['object_position'],
    'field_specialization' => $row['specialization'],
    'field_experience' => $row['experience'],
    'field_publications' => $row['publications'],
    'field_contact' => $row['contact'],
    'field_email' => $row['email'],
    'field_source_url' => $row['source_url'],
    'field_category' => $row['category'],
    'field_details' => source_text($row['details']),
    'field_sort' => $row['sort'],
  ]);
  $node->setPublished(TRUE);
  $node->save();
  set_hindi($node, [
    'title' => $row['name_hi'],
    'field_base_name' => $row['name_hi'],
    'field_role' => $row['role_hi'],
    'field_designation' => $row['designation_hi'],
    'field_department' => $row['department_hi'],
    'field_deployment' => $row['deployment_hi'],
    'field_duration' => $row['duration_hi'],
    'field_specialization' => $row['specialization_hi'],
    'field_experience' => $row['experience_hi'],
    'field_publications' => $row['publications_hi'],
    'field_category' => $row['category_hi'],
    'field_details' => source_text($row['details_hi']),
  ]);
  $counts['profiles']++;
}

foreach (source_rows($source, "SELECT * FROM rsac_brand_logos WHERE status = 'published' ORDER BY sort, id") as $row) {
  $key = 'rsac-cms-logo-' . $row['id'];
  $image = import_source_media($source, $uploads, $row['image'], 'image', $row['alt_text']);
  $node = upsert_source_node('rsac_brand_logo', ['field_key' => $key], [
    'title' => $row['title'],
    'field_key' => $key,
    'field_image' => $image ? ['target_id' => $image] : NULL,
    'field_alt_text' => $row['alt_text'],
    'field_link_url' => $row['link_url'],
    'field_placement' => $row['placement'],
    'field_sort' => $row['sort'],
  ]);
  set_hindi($node, ['title' => $row['title_hi'], 'field_alt_text' => $row['alt_text_hi']]);
  $counts['logos']++;
}

foreach (source_rows($source, "SELECT * FROM rsac_hero_videos WHERE status = 'published' ORDER BY sort, id") as $row) {
  $key = 'rsac-cms-hero-' . $row['id'];
  $video = import_source_media($source, $uploads, $row['video'], 'video');
  $poster = import_source_media($source, $uploads, $row['poster'], 'image', $row['title']);
  $node = upsert_source_node('rsac_hero_video', ['field_key' => $key], [
    'title' => $row['title'],
    'field_key' => $key,
    'field_file_name' => $row['file_name'],
    'field_video' => $video ? ['target_id' => $video] : NULL,
    'field_poster' => $poster ? ['target_id' => $poster] : NULL,
    'field_sort' => $row['sort'],
  ]);
  set_hindi($node, ['title' => $row['title_hi']]);
  $counts['hero']++;
}

foreach (source_rows($source, "SELECT * FROM rsac_manpower_groups WHERE status = 'published' ORDER BY sort, id") as $row) {
  $node = upsert_source_node('rsac_manpower_group', ['title' => $row['title']], [
    'title' => $row['title'],
    'field_count' => $row['count'],
    'field_text' => $row['text'],
    'field_path' => $row['path'],
    'field_sort' => $row['sort'],
  ]);
  set_hindi($node, ['title' => $row['title_hi'], 'field_text' => $row['text_hi']]);
  $counts['manpower']++;
}

foreach (source_rows($source, "SELECT * FROM rsac_organisation_roles WHERE status = 'published' ORDER BY sort, id") as $row) {
  $photo = import_source_media($source, $uploads, $row['photo'], 'image', $row['name']);
  $node = upsert_source_node('rsac_organisation_role', ['field_role_key' => $row['role_key']], [
    'title' => $row['title'],
    'field_role_key' => $row['role_key'],
    'field_group_key' => $row['group_key'],
    'field_slot' => $row['slot'],
    'field_name' => $row['name'],
    'field_role' => $row['role'],
    'field_post' => $row['post'],
    'field_photo' => $photo ? ['target_id' => $photo] : NULL,
    'field_object_position' => $row['object_position'],
    'field_sort' => $row['sort'],
  ]);
  set_hindi($node, [
    'title' => $row['title_hi'],
    'field_name' => $row['name_hi'],
    'field_role' => $row['role_hi'],
    'field_post' => $row['post_hi'],
  ]);
  $counts['organisation']++;
}

foreach (source_rows($source, "SELECT * FROM rsac_policies WHERE status = 'published' ORDER BY sort, id") as $row) {
  $node = upsert_source_node('rsac_page', ['field_slug' => $row['slug']], [
    'title' => $row['title'],
    'field_slug' => $row['slug'],
    'field_section_key' => 'policies',
    'field_summary' => $row['summary'],
    'field_source_url' => $row['source_url'],
    'field_sections_json' => $row['sections'],
    'field_sort' => $row['sort'],
  ]);
  set_hindi($node, [
    'title' => $row['title_hi'],
    'field_summary' => $row['summary_hi'],
    'field_sections_json' => $row['sections_hi'],
  ]);
  $counts['policies']++;
}

foreach (source_rows($source, "SELECT * FROM rsac_public_info WHERE status = 'published' ORDER BY sort, id") as $row) {
  $node = upsert_source_node('rsac_page', ['field_slug' => $row['slug']], [
    'title' => $row['title'],
    'field_slug' => $row['slug'],
    'field_section_key' => 'public_info',
    'field_eyebrow' => $row['eyebrow'],
    'field_summary' => $row['summary'],
    'field_source_url' => $row['source_url'],
    'field_sections_json' => $row['sections'],
    'field_links_json' => $row['links'],
    'field_sort' => $row['sort'],
  ]);
  set_hindi($node, [
    'title' => $row['title_hi'],
    'field_eyebrow' => $row['eyebrow_hi'],
    'field_summary' => $row['summary_hi'],
    'field_sections_json' => $row['sections_hi'],
    'field_links_json' => $row['links_hi'],
  ]);
  $counts['public_info']++;
}

$feature_tabs_en = [];
$feature_tabs_hi = [];
foreach (source_rows($source, "SELECT * FROM rsac_home_feature_tabs WHERE status = 'published' ORDER BY sort, id") as $row) {
  $key = (string) $row['key'];
  $details = preg_split('/\r?\n/', (string) $row['details'], -1, PREG_SPLIT_NO_EMPTY) ?: [];
  $details_hi = preg_split('/\r?\n/', (string) ($row['details_hi'] ?: $row['details']), -1, PREG_SPLIT_NO_EMPTY) ?: [];
  $feature_tabs_en[] = [
    'key' => $key,
    'title' => $row['title'],
    'summary' => $row['summary'],
    'details' => $details,
    'buttonLabel' => $row['button_label'],
    'buttonPath' => $row['button_path'],
    'iconKey' => $row['icon_key'],
  ];
  $feature_tabs_hi[] = [
    'key' => $key,
    'title' => $row['title_hi'] ?: $row['title'],
    'summary' => $row['summary_hi'] ?: $row['summary'],
    'details' => $details_hi,
    'buttonLabel' => $row['button_label_hi'] ?: $row['button_label'],
    'buttonPath' => $row['button_path'],
    'iconKey' => $row['icon_key'],
  ];
  $node = upsert_section_item('feature_tab', $key, [
    'title' => $row['title'],
    'field_summary' => $row['summary'],
    'field_details' => $row['details'],
    'field_button_label' => $row['button_label'],
    'field_path' => $row['button_path'],
    'field_icon_key' => $row['icon_key'],
    'field_sort' => $row['sort'],
  ]);
  set_hindi($node, [
    'title' => $row['title_hi'],
    'field_summary' => $row['summary_hi'],
    'field_details' => $row['details_hi'],
    'field_button_label' => $row['button_label_hi'],
  ]);
  $counts['homepage_features']++;
}

$settings_row = source_rows($source, 'SELECT * FROM rsac_site_settings ORDER BY id LIMIT 1')[0] ?? NULL;
if ($settings_row) {
  $column_map = [
    'appearance' => 'appearance',
    'layout' => 'layout',
    'branding' => 'branding',
    'hero' => 'hero',
    'mission_pulse' => 'missionPulse',
    'home_sections' => 'homeSections',
    'about' => 'about',
    'location' => 'location',
    'footer' => 'footer',
    'organisation_chart' => 'organisationChart',
    'accessibility' => 'accessibility',
    'page_content' => 'pageContent',
    'impact_stats' => 'impactStats',
    'services' => 'services',
    'applications' => 'applications',
    'flood_section' => 'floodSection',
    'search' => 'search',
    'ui' => 'ui',
    'cards' => 'cards',
  ];
  $settings_en = [];
  foreach ($column_map as $source_column => $target_key) {
    $decoded = source_json($settings_row[$source_column] ?? NULL);
    if ($decoded) {
      $settings_en[$target_key] = $decoded;
    }
  }
  $settings_hi = array_replace_recursive(
    $settings_en,
    source_json($settings_row['translations'] ?? NULL)['hi'] ?? []
  );
  $settings_en['homeSections']['featureTabs'] = $feature_tabs_en;
  $settings_hi['homeSections']['featureTabs'] = $feature_tabs_hi;

  foreach (source_rows($source, "SELECT key, value, value_hi, value_type FROM rsac_content_blocks WHERE status = 'published' ORDER BY sort, id") as $block) {
    set_nested_value($settings_en, $block['key'], content_block_value($block, 'value'));
    if (($block['value_hi'] ?? '') !== '') {
      set_nested_value($settings_hi, $block['key'], content_block_value($block, 'value_hi'));
    }
  }

  $simple_sections = [
    'services' => ['settings_key' => 'services', 'count_key' => 'service_cards'],
    'applications' => ['settings_key' => 'applications', 'count_key' => 'application_cards'],
  ];
  foreach ($simple_sections as $section_key => $definition) {
    $items_en = $settings_en[$definition['settings_key']]['items'] ?? [];
    $items_hi = $settings_hi[$definition['settings_key']]['items'] ?? [];
    foreach ($items_en as $index => $item) {
      $hi = $items_hi[$index] ?? [];
      $key = (string) ($item['id'] ?? $index);
      $node = upsert_section_item($section_key, $key, [
        'title' => $item['title'] ?? '',
        'field_summary' => $item['description'] ?? '',
        'field_category' => $item['category'] ?? '',
        'field_icon_key' => $item['icon'] ?? '',
        'field_sort' => $index,
      ]);
      set_hindi($node, [
        'title' => $hi['title'] ?? '',
        'field_summary' => $hi['description'] ?? '',
        'field_category' => $hi['category'] ?? '',
      ]);
      $counts[$definition['count_key']]++;
    }
  }

  $domains_en = $settings_en['missionPulse']['domains'] ?? [];
  $domains_hi = $settings_hi['missionPulse']['domains'] ?? [];
  foreach ($domains_en as $index => $item) {
    $hi = $domains_hi[$index] ?? [];
    $key = (string) ($item['id'] ?? ('domain-' . $index));
    $node = upsert_section_item('operational_domains', $key, [
      'title' => $item['label'] ?? '',
      'field_summary' => $item['detail'] ?? '',
      'field_path' => $item['path'] ?? '',
      'field_icon_key' => $item['icon'] ?? '',
      'field_tagline' => $item['tagline'] ?? '',
      'field_deliverables' => implode("\n", $item['deliverables'] ?? []),
      'field_stat_value' => $item['stat']['value'] ?? '',
      'field_stat_label' => $item['stat']['label'] ?? '',
      'field_link_label' => $item['linkLabel'] ?? '',
      'field_sort' => $index,
    ]);
    set_hindi($node, [
      'title' => $hi['label'] ?? '',
      'field_summary' => $hi['detail'] ?? '',
      'field_tagline' => $hi['tagline'] ?? '',
      'field_deliverables' => implode("\n", $hi['deliverables'] ?? []),
      'field_stat_value' => $hi['stat']['value'] ?? '',
      'field_stat_label' => $hi['stat']['label'] ?? '',
      'field_link_label' => $hi['linkLabel'] ?? '',
    ]);
    $counts['operational_domains']++;
  }

  $stats_en = $settings_en['impactStats'] ?? [];
  $stats_hi = $settings_hi['impactStats'] ?? [];
  foreach ($stats_en as $index => $item) {
    $hi = $stats_hi[$index] ?? [];
    $key = 'impact-stat-' . $index;
    $node = upsert_section_item('impact_stats', $key, [
      'title' => $item['label'] ?? '',
      'field_summary' => $item['detail'] ?? '',
      'field_stat_value' => $item['value'] ?? '',
      'field_sort' => $index,
    ]);
    set_hindi($node, [
      'title' => $hi['label'] ?? '',
      'field_summary' => $hi['detail'] ?? '',
      'field_stat_value' => $hi['value'] ?? '',
    ]);
    $counts['impact_stats']++;
  }

  $existing_settings = find_node('rsac_site_setting', []);
  $settings_node = $existing_settings ?: Node::create(['type' => 'rsac_site_setting']);
  set_values($settings_node, [
    'title' => 'RSAC Website Settings',
    'field_settings_json' => json_encode($settings_en, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  ]);
  $settings_node->setPublished(TRUE);
  $settings_node->save();
  set_hindi($settings_node, [
    'title' => 'आरएसएसी वेबसाइट सेटिंग्स',
    'field_settings_json' => json_encode($settings_hi, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  ]);
  $counts['site_settings']++;
}

drupal_flush_all_caches();
print 'Read-only rsac_cms migration complete: ' . json_encode($counts) . "\n";
