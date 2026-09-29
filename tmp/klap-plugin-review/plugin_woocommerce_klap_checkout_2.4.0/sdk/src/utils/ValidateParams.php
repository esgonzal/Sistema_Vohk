<?php
namespace Multicaja\Payments\Utils;

/**
 *
 * Class ValidateParams
 *
 * @package Multicaja\Payments
 */
class ValidateParams
{

  private static $logger;
  public static function setLogger($logger)
  {
    self::$logger = $logger;
  }

  public static function validateNumeric($value, $name = '')
  {
    if (!isset($value)) {
      return;
    }
    if (!is_numeric($value)) {
      throw new \Exception("{$name} must be an Integer");
    }
    if ($value < 0) {
      throw new \Exception("{$name} cannot be less than zero");
    }
  }

  public static function validateString($value, $name = '')
  {
    if (!isset($value)) {
      return;
    }
    if (!is_string($value)) {
      throw new \Exception("{$name} is not a string");
    }
  }

  public static function validateArray($value, $name = '')
  {
    if (!isset($value)) {
      return;
    }
    if (!is_array($value)) {
      throw new \Exception("{$name} is not an array");
    }
  }

  public static function toJsonArray($data, $name = '')
  {
    if (is_string($data)) {
      $data = json_decode($data, true);
    }
    if (!is_array($data)) {
      throw new \Exception("{$name} must be a JSON string or an associative array that is transformable to an associative array using json_decode");
    }
    return $data;
  }

  public static function getHeader($headers, $name)
  {
    foreach ($headers as $hname => $hvalue) {
      if (strtolower($hname) == strtolower($name)) {
        return $hvalue;
      }
    }
    return null;
  }

  public static function validateHashApiKey($hashApiKey, $referenceId, $orderId, $apikey)
  {
    $hashApiKeyCalculated = hash('sha256', $referenceId . $orderId . $apikey);
    return $hashApiKey == $hashApiKeyCalculated;
  }

  public static function validateHashApiKeyFromHeaders($headers, $referenceId, $orderId, $apikey)
  {
    $hashApiKey = self::getHeader($headers, 'apikey');
    return self::validateHashApiKey($hashApiKey, $referenceId, $orderId, $apikey);
  }
}
