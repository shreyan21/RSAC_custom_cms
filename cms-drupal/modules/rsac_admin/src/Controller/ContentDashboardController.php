<?php

namespace Drupal\rsac_admin\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Link;
use Drupal\Core\Url;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ContentDashboardController extends ControllerBase {

  public static function definitions(): array {
    return [
      'pages' => ['Page', 'All About, division-detail, facility, service, programme, policy, and public-information pages.', 'rsac_page'],
      'page_groups' => ['Page Groups / Main Sections', 'Top-level page groups and website section menus.', 'rsac_page_section'],
      'divisions' => ['Divisions', 'Division cards, summaries, leads, and highlights.', 'rsac_division'],
      'scientists_staff' => ['Scientists / Officials / Staff', 'Scientists, leadership, officials, former staff, technical staff, and administration.', 'rsac_profile'],
      'projects' => ['Projects', 'Completed and ongoing projects linked to divisions.', 'rsac_project'],
      'publications' => ['Publications / Research Papers / Reports', 'Research papers, technical reports, atlases, plans, and publications.', 'rsac_publication'],
      'notices' => ['Notices', 'Public notices and attached documents.', 'rsac_notice_tender_faq', 'field_kind', 'notice'],
      'tenders' => ['Tenders', 'Tender notices, closing dates, and documents.', 'rsac_notice_tender_faq', 'field_kind', 'tender'],
      'faq' => ['FAQ', 'Frequently asked questions and answers.', 'rsac_notice_tender_faq', 'field_kind', 'faq'],
      'gallery' => ['Gallery', 'Gallery photographs, captions, and alt text.', 'rsac_gallery_item'],
      'downloads' => ['Downloads', 'General public downloads and documents.', 'rsac_download', 'field_kind', 'download'],
      'flood_reports' => ['Flood Reports', 'Daily flood reports, dates, coverage, and files.', 'rsac_download', 'field_kind', 'flood_report'],
      'mobile_apps' => ['Mobile Apps', 'Mobile application cards and download links.', 'rsac_download', 'field_kind', 'mobile_app'],
      'homepage_features' => ['Homepage Feature Tabs', 'Objective, implementation, approach, activities, and other homepage feature tabs.', 'rsac_section_item', 'field_section_key', 'feature_tab'],
      'applications' => ['Application Cards', 'Homepage application cards and categories.', 'rsac_section_item', 'field_section_key', 'applications'],
      'operational_domains' => ['Operational Domains', 'Homepage operational-domain cards, statistics, deliverables, and links.', 'rsac_section_item', 'field_section_key', 'operational_domains'],
      'impact_stats' => ['Impact Statistics', 'Homepage institutional statistics and supporting details.', 'rsac_section_item', 'field_section_key', 'impact_stats'],
      'quick_links' => ['Quick Links', 'Homepage quick-link cards.', 'rsac_section_item', 'field_section_key', 'quick_links'],
      'geoportals' => ['Geoportals', 'Geoportal cards and URLs.', 'rsac_section_item', 'field_section_key', 'geoportals'],
      'service_cards' => ['Services / Programme Cards', 'Service, programme, and other homepage cards.', 'rsac_section_item', 'field_section_key', 'services'],
      'menus' => ['Header / Footer Menu', 'Navigation titles, paths, descriptions, and child links.', 'rsac_menu_item'],
      'contact' => ['Contact', 'Address, phone, mobile, email, and contact rows.', 'rsac_contact'],
      'site_settings' => ['Site Settings', 'Global homepage, branding, footer, and accessibility settings.', 'rsac_site_setting'],
      'logos' => ['Header / Footer Logos', 'Primary and supporting logos.', 'rsac_brand_logo'],
      'hero_videos' => ['Homepage Hero Videos', 'Homepage videos and poster images.', 'rsac_hero_video'],
      'organisation' => ['Organisation Chart', 'Organisation roles, names, posts, and photos.', 'rsac_organisation_role'],
      'manpower' => ['Manpower Groups', 'Manpower summary cards and counts.', 'rsac_manpower_group'],
    ];
  }

  public function dashboard(): array {
    $build = [
      '#attached' => ['library' => ['rsac_admin/admin']],
      'intro' => [
        '#type' => 'container',
        '#attributes' => ['class' => ['rsac-admin-intro']],
        'text' => [
          '#markup' => '<p><strong>Start here.</strong> Choose a collection, then use <em>Edit English</em> or <em>Edit / add Hindi</em>. Create English first, save it, then add Hindi manually.</p><p>Website: <a href="http://localhost:5173/" target="_blank" rel="noreferrer">http://localhost:5173/</a></p>',
        ],
      ],
      'collections' => [
        '#type' => 'container',
        '#attributes' => ['class' => ['rsac-collection-grid']],
      ],
    ];

    foreach (self::definitions() as $key => $definition) {
      [$label, $description, $bundle] = $definition;
      $nodes = $this->loadCollectionNodes($definition);
      $hindi_count = count(array_filter($nodes, static fn (Node $node): bool => $node->hasTranslation('hi')));
      $add_query = ['rsac_collection' => $key];
      if (!empty($definition[3]) && isset($definition[4])) {
        $add_query[$definition[3]] = $definition[4];
      }

      $build['collections'][$key] = [
        '#type' => 'container',
        '#attributes' => ['class' => ['rsac-collection-card']],
        'title' => ['#markup' => '<h2>' . $label . '</h2>'],
        'description' => [
          '#markup' => '<p class="rsac-collection-card__description">' . $description . '</p>',
        ],
        'stats' => [
          '#markup' => '<div class="rsac-collection-card__stats">' . count($nodes) . ' items | ' . $hindi_count . ' Hindi ready</div>',
        ],
        'actions' => [
          '#type' => 'container',
          '#attributes' => ['class' => ['rsac-collection-card__actions']],
          'manage' => [
            '#type' => 'link',
            '#title' => $this->t('Manage items'),
            '#url' => Url::fromRoute('rsac_admin.collection', ['collection' => $key]),
            '#attributes' => ['class' => ['button', 'button--primary']],
          ],
          'add' => [
            '#type' => 'link',
            '#title' => $this->t('Add new'),
            '#url' => Url::fromRoute('node.add', ['node_type' => $bundle], ['query' => $add_query]),
            '#attributes' => ['class' => ['button']],
          ],
        ],
      ];
    }

    return $build;
  }

  public function collectionTitle(string $collection): string {
    $definition = self::definitions()[$collection] ?? NULL;
    if (!$definition) {
      throw new NotFoundHttpException();
    }
    return $definition[0];
  }

  public function collection(string $collection): array {
    $definition = self::definitions()[$collection] ?? NULL;
    if (!$definition) {
      throw new NotFoundHttpException();
    }

    [$label, $description, $bundle] = $definition;
    $nodes = $this->loadCollectionNodes($definition);
    $add_query = ['rsac_collection' => $collection];
    if (!empty($definition[3]) && isset($definition[4])) {
      $add_query[$definition[3]] = $definition[4];
    }

    $rows = [];
    foreach ($nodes as $node) {
      $has_hindi = $node->hasTranslation('hi');
      $rows[] = [
        'title' => ['data' => Link::fromTextAndUrl($node->label(), Url::fromRoute('entity.node.edit_form', ['node' => $node->id()]))->toRenderable()],
        'english' => ['data' => Link::fromTextAndUrl($this->t('Edit English'), Url::fromRoute('entity.node.edit_form', ['node' => $node->id()]))->toRenderable()],
        'hindi' => [
          'data' => [
            '#type' => 'link',
            '#title' => $has_hindi ? $this->t('Edit Hindi') : $this->t('Add Hindi'),
            '#url' => Url::fromRoute('entity.node.content_translation_overview', ['node' => $node->id()]),
            '#attributes' => ['class' => [$has_hindi ? 'rsac-language-ready' : 'rsac-language-missing']],
          ],
        ],
        'status' => $node->isPublished() ? $this->t('Published') : $this->t('Draft'),
        'updated' => \Drupal::service('date.formatter')->format($node->getChangedTime(), 'short'),
      ];
    }

    return [
      '#attached' => ['library' => ['rsac_admin/admin']],
      'intro' => [
        '#type' => 'container',
        '#attributes' => ['class' => ['rsac-admin-intro']],
        'description' => ['#markup' => '<p><strong>' . $label . '</strong>: ' . $description . '</p><p>English is source content. Hindi is a manual translation of the same item. Missing Hindi safely falls back to English on website.</p>'],
      ],
      'actions' => [
        '#type' => 'container',
        '#attributes' => ['class' => ['rsac-collection-actions']],
        'back' => [
          '#type' => 'link',
          '#title' => $this->t('All RSAC Collections'),
          '#url' => Url::fromRoute('rsac_admin.dashboard'),
          '#attributes' => ['class' => ['button']],
        ],
        'add' => [
          '#type' => 'link',
          '#title' => $this->t('Add new @label', ['@label' => $label]),
          '#url' => Url::fromRoute('node.add', ['node_type' => $bundle], ['query' => $add_query]),
          '#attributes' => ['class' => ['button', 'button--primary']],
        ],
      ],
      'table' => [
        '#type' => 'table',
        '#header' => [$this->t('Title'), $this->t('English'), $this->t('Hindi'), $this->t('Status'), $this->t('Updated')],
        '#rows' => $rows,
        '#empty' => $this->t('No items yet. Use Add new above.'),
      ],
    ];
  }

  private function loadCollectionNodes(array $definition): array {
    $query = $this->entityTypeManager()->getStorage('node')->getQuery()
      ->accessCheck(TRUE)
      ->condition('type', $definition[2])
      ->sort('changed', 'DESC');
    if (!empty($definition[3]) && isset($definition[4])) {
      $query->condition($definition[3], $definition[4]);
    }
    $ids = $query->execute();
    return $ids ? $this->entityTypeManager()->getStorage('node')->loadMultiple($ids) : [];
  }

}
