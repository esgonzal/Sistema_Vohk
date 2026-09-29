<?php
namespace Multicaja\Payments\Utils;

class BasicLog {

  public function __construct() {
  }

  private function getDate() {
    return date("Y-m-d H:i:s", time());
  }

  public function info($msg) {
    error_log('[' . $this->getDate() . '] [INFO]' . $msg);
  }

  public function warn($msg) {
    error_log('[' . $this->getDate() . '] [WARN]' . $msg);
  }

  public function error($msg, $ex = null) {
    error_log('[' . $this->getDate() . '] [ERROR]' . $msg);
    if (isset($ex) && $ex != null) {
      error_log($ex);
    }
  }
}
