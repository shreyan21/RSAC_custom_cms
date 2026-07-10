<?php

use Drupal\node\Entity\Node;

$path = __DIR__ . '/seed-data.generated.json';
if (!file_exists($path)) {
  throw new RuntimeException('Missing cms-drupal/seed-data.generated.json. Run node cms-drupal/export-seed-data.mjs first.');
}

$data = json_decode(file_get_contents($path), TRUE);
if (!is_array($data)) {
  throw new RuntimeException('Invalid seed JSON.');
}

function first_id(array $ids) {
  return $ids ? reset($ids) : NULL;
}

function find_node_id(string $type, string $field, string $value) {
  if ($value === '') {
    return NULL;
  }
  $query = \Drupal::entityQuery('node')
    ->accessCheck(FALSE)
    ->condition('type', $type)
    ->range(0, 1);
  $query->condition($field === 'title' ? 'title' : $field, $value);
  return first_id($query->execute());
}

function set_node_values(Node $node, array $values): void {
  foreach ($values as $field => $value) {
    if ($value === NULL) {
      continue;
    }
    if ($field === 'body') {
      if ($node->hasField('body')) {
        $node->set('body', [
          'value' => (string) $value,
          'format' => 'full_html',
        ]);
      }
      continue;
    }
    if ($field === 'title') {
      $node->setTitle((string) $value);
      continue;
    }
    if ($node->hasField($field)) {
      $node->set($field, is_array($value) ? json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : $value);
    }
  }
}

function upsert_node(string $type, string $lookup_field, string $lookup_value, array $values): Node {
  $nid = find_node_id($type, $lookup_field, (string) $lookup_value);
  $node = $nid ? Node::load($nid) : Node::create(['type' => $type]);
  $node->setPublished(TRUE);
  if (empty($values['title'])) {
    $values['title'] = $lookup_value ?: $type;
  }
  set_node_values($node, $values);
  $node->save();
  return $node;
}

function set_translation(Node $node, string $langcode, array $values): void {
  if (!$values || !\Drupal::languageManager()->getLanguage($langcode)) {
    return;
  }
  if (empty($values['title'])) {
    $values['title'] = $node->label() ?: $node->bundle();
  }
  $target = $node->hasTranslation($langcode)
    ? $node->getTranslation($langcode)
    : $node->addTranslation($langcode, ['title' => $values['title']]);
  $target->setPublished(TRUE);
  set_node_values($target, $values);
  $target->save();
}

function by_key(array $items, string $key): array {
  $map = [];
  foreach ($items as $item) {
    if (!empty($item[$key])) {
      $map[$item[$key]] = $item;
    }
  }
  return $map;
}

function section_values(array $section): array {
  return [
    'title' => $section['title'] ?? '',
    'field_key' => $section['key'] ?? '',
    'field_route' => $section['route'] ?? '',
    'field_eyebrow' => $section['eyebrow'] ?? '',
    'field_intro' => $section['intro'] ?? '',
    'field_sort' => $section['sort'] ?? 0,
  ];
}

function page_values(array $page): array {
  return [
    'title' => $page['title'] ?? '',
    'field_slug' => $page['slug'] ?? '',
    'field_section_key' => $page['sectionKey'] ?? '',
    'field_summary' => $page['summary'] ?? '',
    'field_source_url' => $page['sourceUrl'] ?? '',
    'field_sort' => $page['sort'] ?? 0,
    'field_card_icon' => $page['cardIcon'] ?? '',
    'field_card_color' => $page['cardAccent'] ?? '',
    'field_card_color_2' => $page['cardAccent2'] ?? '',
    'body' => $page['html'] ?? '',
  ];
}

$hi_sections = by_key($data['officialSections']['hi'] ?? [], 'key');
$hi_pages = [];
foreach (($data['officialSections']['hi'] ?? []) as $section) {
  foreach (($section['pages'] ?? []) as $page) {
    if (!empty($page['slug'])) {
      $hi_pages[$page['slug']] = $page;
    }
  }
}

foreach (($data['officialSections']['en'] ?? []) as $index => $section) {
  $section['sort'] = $index;
  $node = upsert_node('rsac_page_section', 'field_key', $section['key'] ?? '', section_values($section));
  if (isset($hi_sections[$section['key'] ?? ''])) {
    $hi = $hi_sections[$section['key']];
    $hi['sort'] = $index;
    set_translation($node, 'hi', section_values($hi));
  }

  foreach (($section['pages'] ?? []) as $page_index => $page) {
    $page['sort'] = $page['sort'] ?? $page_index;
    $page['sectionKey'] = $page['sectionKey'] ?? ($section['key'] ?? '');
    $node = upsert_node('rsac_page', 'field_slug', $page['slug'] ?? '', page_values($page));
    if (isset($hi_pages[$page['slug'] ?? ''])) {
      set_translation($node, 'hi', page_values($hi_pages[$page['slug']]));
    }
  }
}

foreach (($data['divisions'] ?? []) as $index => $item) {
  upsert_node('rsac_division', 'field_slug', $item['id'] ?? '', [
    'title' => $item['title'] ?? '',
    'field_slug' => $item['id'] ?? '',
    'field_lead' => $item['lead'] ?? '',
    'field_highlights' => implode("\n", $item['highlights'] ?? []),
    'field_source_url' => $item['source'] ?? '',
    'field_sort' => $index,
  ]);
}

$contact = $data['contactDetails'] ?? [];
upsert_node('rsac_contact', 'title', $contact['title'] ?? 'RSAC Contact', [
  'title' => $contact['title'] ?? 'RSAC Contact',
  'field_address' => $contact['address'] ?? '',
  'field_email' => $contact['email'] ?? '',
  'field_phone' => $contact['phone'] ?? '',
  'field_mobile' => $contact['mobile'] ?? '',
  'field_contacts_json' => $contact['contacts'] ?? [],
]);

foreach (($data['notices'] ?? []) as $index => $item) {
  upsert_node('rsac_notice_tender_faq', 'title', $item['title'] ?? ('Notice ' . $index), [
    'title' => $item['title'] ?? '',
    'field_kind' => 'notice',
    'field_category' => $item['category'] ?? 'General',
    'field_meta' => $item['meta'] ?? '',
    'field_last_date' => $item['lastDate'] ?? '',
    'field_url' => $item['url'] ?? '',
    'field_sort' => $index,
  ]);
}

foreach (($data['floodReports'] ?? []) as $index => $item) {
  upsert_node('rsac_download', 'title', $item['title'] . ' ' . ($item['date'] ?? $index), [
    'title' => $item['title'] ?? '',
    'field_kind' => 'flood_report',
    'field_category' => $item['category'] ?? '',
    'field_date' => $item['date'] ?? '',
    'field_date_label' => $item['dateLabel'] ?? '',
    'field_coverage' => $item['coverage'] ?? '',
    'field_meta' => $item['meta'] ?? '',
    'field_url' => $item['url'] ?? '',
    'field_sort' => $index,
  ]);
}

foreach (($data['mobileApps'] ?? []) as $index => $item) {
  upsert_node('rsac_download', 'title', $item['title'] ?? ('Mobile App ' . $index), [
    'title' => $item['title'] ?? '',
    'field_key' => $item['key'] ?? '',
    'field_kind' => 'mobile_app',
    'field_summary' => $item['description'] ?? '',
    'field_url' => $item['url'] ?? '',
    'field_sort' => 1000 + $index,
  ]);
}

foreach (($data['galleryImages'] ?? []) as $index => $item) {
  upsert_node('rsac_gallery_item', 'field_key', $item['id'] ?? ('gallery-' . $index), [
    'title' => $item['caption'] ?? ('Gallery image ' . ($index + 1)),
    'field_key' => $item['id'] ?? '',
    'field_url' => $item['src'] ?? '',
    'field_alt_text' => $item['alt'] ?? ($item['caption'] ?? 'RSAC-UP gallery image'),
    'field_sort' => $index,
  ]);
}

foreach (($data['quickLinks'] ?? []) as $index => $item) {
  upsert_node('rsac_section_item', 'field_key', $item['key'] ?? ('quick-link-' . $index), [
    'title' => $item['title'] ?? '',
    'field_key' => $item['key'] ?? '',
    'field_section_key' => 'quick_links',
    'field_summary' => $item['description'] ?? '',
    'field_path' => $item['path'] ?? '',
    'field_icon_key' => $item['iconKey'] ?? '',
    'field_accent' => $item['accent'] ?? '',
    'field_sort' => $index,
  ]);
}

foreach (($data['geoportals'] ?? []) as $index => $item) {
  upsert_node('rsac_section_item', 'title', $item['title'] ?? ('Geoportal ' . $index), [
    'title' => $item['title'] ?? '',
    'field_key' => 'geoportal-' . $index,
    'field_section_key' => 'geoportals',
    'field_summary' => $item['description'] ?? '',
    'field_url' => $item['url'] ?? '',
    'field_accent' => $item['accentHex'] ?? '',
    'field_sort' => $index,
  ]);
}

foreach (($data['menuItems'] ?? []) as $index => $item) {
  upsert_node('rsac_menu_item', 'title', $item['title'] ?? ('Menu ' . $index), [
    'title' => $item['title'] ?? '',
    'field_summary' => $item['description'] ?? '',
    'field_path' => $item['path'] ?? '',
    'field_links_json' => $item['links'] ?? [],
    'field_sort' => $index,
  ]);
}

foreach (($data['profiles'] ?? []) as $index => $item) {
  upsert_node('rsac_profile', 'title', $item['name'] ?? ('Profile ' . $index), [
    'title' => $item['name'] ?? '',
    'field_profile_type' => $item['profileType'] ?? 'scientist',
    'field_base_name' => $item['baseName'] ?? ($item['name'] ?? ''),
    'field_designation' => $item['designation'] ?? ($item['role'] ?? ''),
    'field_role' => $item['role'] ?? ($item['designation'] ?? ''),
    'field_department' => $item['department'] ?? '',
    'field_deployment' => $item['deployment'] ?? '',
    'field_employee_id' => $item['employeeId'] ?? '',
    'field_object_position' => $item['objectPosition'] ?? '',
    'field_specialization' => $item['specialization'] ?? '',
    'field_experience' => $item['experience'] ?? '',
    'field_publications' => $item['publications'] ?? '',
    'field_contact' => $item['contact'] ?? '',
    'field_email' => $item['email'] ?? '',
    'field_source_url' => $item['source'] ?? '',
    'field_category' => $item['category'] ?? '',
    'field_details' => implode("\n", $item['details'] ?? []),
    'field_sort' => $index,
  ]);
}

drupal_flush_all_caches();
print "RSAC Drupal seed content ready.\n";
