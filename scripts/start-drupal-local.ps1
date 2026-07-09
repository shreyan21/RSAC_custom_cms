param(
  [string]$HostName = "localhost",
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$php = Join-Path $root ".tools\php\php.exe"
$docroot = Join-Path $root "local-drupal\web"
$router = Join-Path $root "cms-drupal\local-router.php"

if (!(Test-Path -LiteralPath $php)) {
  throw "PHP binary not found at $php"
}

if (!(Test-Path -LiteralPath (Join-Path $docroot "index.php"))) {
  throw "Drupal docroot not found at $docroot"
}

Set-Location (Join-Path $root "local-drupal")
& $php -S "${HostName}:$Port" -t $docroot $router
