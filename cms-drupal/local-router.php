<?php

/**
 * Local-only PHP built-in server router for Drupal.
 *
 * Routes requests through Drupal's front controller. Local CORS is configured
 * by Drupal in sites/default/services.yml so headers are emitted only once.
 */

if (PHP_SAPI !== 'cli-server') {
  header($_SERVER['SERVER_PROTOCOL'] . ' 403 Forbidden');
  exit;
}

$docroot = dirname(__DIR__) . '/local-drupal/web';
$url = parse_url($_SERVER['REQUEST_URI']);
$path = $url['path'] ?? '/';
$file = realpath($docroot . $path);
$docroot_real = realpath($docroot);

if (
  $file &&
  $docroot_real &&
  str_starts_with($file, $docroot_real) &&
  is_file($file)
) {
  return FALSE;
}

$script = 'index.php';
if (str_contains($path, '.php')) {
  do {
    $path = dirname($path);
    if (str_ends_with($path, '.php') && is_file($docroot . $path)) {
      $script = ltrim($path, '/');
      break;
    }
  } while ($path !== '/' && $path !== '.');
}

$_SERVER['DOCUMENT_ROOT'] = $docroot;
$_SERVER['SCRIPT_FILENAME'] = $docroot . DIRECTORY_SEPARATOR . $script;
$_SERVER['SCRIPT_NAME'] = DIRECTORY_SEPARATOR . $script;
$_SERVER['PHP_SELF'] = DIRECTORY_SEPARATOR . $script;

require $_SERVER['SCRIPT_FILENAME'];
