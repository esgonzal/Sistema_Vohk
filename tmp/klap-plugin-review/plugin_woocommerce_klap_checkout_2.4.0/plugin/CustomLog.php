<?php

// carga el sdk de Klap Checkout
require_once(plugin_dir_path(__FILE__) . '../sdk/src/init.php');

use \Multicaja\Payments\Utils\BasicLog;

/**
 * Clase para escribir logs
 *
 * Compatible con PHP 5.6+ y PHP 8.x
 * Usa el logger nativo de WooCommerce (wc_get_logger) como metodo principal,
 * con fallback a BasicLog del SDK si WooCommerce no esta disponible.
 */
class CustomLog {

  const LOG_SOURCE = 'klap-checkout';

  private $logger = null;
  private $useWcLogger = false;

  public function __construct() {
  }

  public function getLogDir() {
    if (defined('WC_LOG_DIR')) {
      return WC_LOG_DIR;
    }
    return ABSPATH . 'wp-content/uploads/wc-logs/';
  }

  public function getLogFile() {
    return $this->getLogDir() . 'klap-checkout-' . gmdate('Y-m-d') . '.log';
  }

  public function getLogger() {
    if ($this->logger !== null) {
      return $this;
    }
    try {
      if (function_exists('wc_get_logger')) {
        $this->logger = wc_get_logger();
        $this->useWcLogger = true;
      } else {
        $this->logger = new BasicLog();
        $this->useWcLogger = false;
      }
    } catch (Exception $ex) {
      $this->logger = new BasicLog();
      $this->useWcLogger = false;
    }
    return $this;
  }

  public function info($msg) {
    $this->ensureLogger();
    if ($this->useWcLogger) {
      $this->logger->info($msg, array('source' => self::LOG_SOURCE));
    } else {
      $this->logger->info($msg);
    }
  }

  public function warn($msg) {
    $this->ensureLogger();
    if ($this->useWcLogger) {
      $this->logger->warning($msg, array('source' => self::LOG_SOURCE));
    } else {
      $this->logger->warn($msg);
    }
  }

  public function error($msg) {
    $this->ensureLogger();
    if ($this->useWcLogger) {
      $this->logger->error($msg, array('source' => self::LOG_SOURCE));
    } else {
      $this->logger->error($msg);
    }
  }

  private function ensureLogger() {
    if ($this->logger === null) {
      $this->getLogger();
    }
  }
}