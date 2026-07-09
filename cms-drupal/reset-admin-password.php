<?php

$password = getenv('DRUPAL_LOCAL_ADMIN_PASSWORD');

if (!$password) {
  throw new RuntimeException('DRUPAL_LOCAL_ADMIN_PASSWORD is required.');
}

$account = \Drupal\user\Entity\User::load(1);
if (!$account) {
  throw new RuntimeException('Drupal admin user 1 not found.');
}

$account->setPassword($password);
$account->save();

print "Drupal admin password reset from environment.\n";
