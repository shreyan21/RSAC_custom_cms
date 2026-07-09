<?php

/**
 * Local-only PHP built-in server router for Drupal.
 *
 * Adds CORS headers for the Vite dev server and then routes requests through
 * Drupal's front controller. Use this only for local development.
 */

if (PHP_SAPI !== 'cli-server') {
  header($_SERVER['SERVER_PROTOCOL'] . ' 403 Forbidden');
  exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

if (in_array($origin, $allowed_origins, TRUE)) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
  header('Access-Control-Allow-Headers: x-csrf-token, authorization, content-type, accept, origin, x-requested-with');
  header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
  header('Access-Control-Max-Age: 1000');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
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
