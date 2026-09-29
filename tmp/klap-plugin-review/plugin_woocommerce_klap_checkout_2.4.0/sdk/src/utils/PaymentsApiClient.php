<?php

namespace Multicaja\Payments\Utils;

use Multicaja\Payments\Model\Error;
use Multicaja\Payments\Model\MerchantMethodsResponse;
use Multicaja\Payments\Model\OrderResponse;

/**
 * Class PaymentsApiClient
 */
class PaymentsApiClient
{

  const LOCAL = 'local';
  const METHOD = 'method';
  const HEADER = 'header';
  const BODY = 'body';
  const CODE = '"code"';
  const MESSAGE = '"message"';
  const ERROR = '"error"';
  const STATUS = '"status"';
  public static $ENVIRONMENT_LOCAL = self::LOCAL;
  public static $ENVIRONMENT_INTEGRATION = 'integration';
  public static $ENVIRONMENT_PRODUCTION = 'production';
  private static $logger;
  private static $ENVIRONMENTS = array(
    self::LOCAL => 'http://localhost:8080',
    'integration' => 'https://api-pasarela-sandbox.mcdesaqa.cl',
    'production' => 'https://api.pasarela.multicaja.cl'
  );

  public static function setLogger($logger)
  {
    self::$logger = $logger;
  }

  /**
   * Invoca al api rest para crear la orden
   */
  public static function createOrder($environment, $apikey, $orderRequest)
  {
    $url = self::getUrlApi($environment, $apikey) . '/orders';

    return self::clientOrder($apikey, $url, 'httpPost', $orderRequest);
  }

  /**
   * Retorna la url del api orders
   */
  public static function getUrlApi($environment, $apikey)
  {

    if (!is_string($environment)) {
      throw new \Exception('environment is not a string');
    }

    if (!self::$ENVIRONMENTS[$environment]) {
      throw new \Exception('Invalid environment, valid environments: ' . implode(", ", array_keys(self::$ENVIRONMENTS)));
    }

    if (!is_string($apikey)) {
      throw new \Exception('apikey is not a string');
    }

    $host = self::$ENVIRONMENTS[$environment];

    if (strcasecmp($environment, self::LOCAL) == 0) {
      $urlApi = getenv('USE_URL_API');
      if (isset($urlApi) && $urlApi != null) {
        if (self::$logger != null) {
          self::$logger->warn('Estableciendo api para pruebas: ' . $urlApi);
        }
        $host = $urlApi;
      }
    }

    return $host . '/payment-gateway/v1';
  }

  public static function clientOrder($apikey, $url, $method, $body = "")
  {
    if (self::$logger != null) {
      self::$logger->info('PaymentsApiClient, URL invocación API: ' . $url . ' Metodo: ' . $method);
    }
    if ($method == 'httpGet') {
      $resp = self::httpGet($url, $apikey);
    }
    else if ('httpPost') {
      $resp = self::httpPost($url, $apikey, $body);
    }
    if (self::$logger != null) {
      self::$logger->info('PaymentsApiClient, Respuesta invocación: ' . wp_json_encode($resp));
    }
    if ((stripos($resp, self::CODE) !== false && stripos($resp, self::MESSAGE) !== false) ||
    (stripos($resp, self::STATUS) !== false && stripos($resp, self::ERROR) !== false)) {
      return Error::fromJSON($resp);
    }
    else if (stripos($resp, '"order_id"') !== false && stripos($resp, '"reference_id"') !== false) {
      return OrderResponse::fromJSONResponse($resp);
    }
    else {
      return new Error('1', 'Error al conectar con Klap, obtener orden');
    }
  }

  /**
   * http GET
   */
  private static function httpGet($url, $apikey)
  {

    $headers = array(
      'Content-type' => 'application/json',
      'apikey' => $apikey
    );

    $http_options = array(
      'method' => 'GET',
      'headers' => $headers,
    );

    /*$http_response = wp_remote_get($url, $http_options);
     return $http_response['body'];*/

    /*$http_options = array(
     self::METHOD => 'GET',
     self::HEADER => array_map(function ($h, $v) {return "$h: $v";}, array_keys($headers), $headers)
     );*/

    return self::httpProcess($url, $http_options);
  }

  /**
   * process http request
   */
  private static function httpProcess($url, $http_options)
  {
    if ($http_options[self::METHOD] == 'GET') {
      $response = wp_remote_get($url, $http_options);
    }

    if ($http_options[self::METHOD] == 'POST') {
      $response = wp_remote_post($url, $http_options);
    }
    if (is_wp_error($response)) {
      return wp_json_encode(array(
        'code' => $response->get_error_code(),
        'message' => $response->get_error_message()
      ));
    }
    else {
      return $response['body'];
    }
  /*if (self::isExtensionLoaded('curl')) {
   //https://www.php.net/manual/en/function.curl-setopt.php
   $ch = curl_init($url);
   curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
   curl_setopt($ch, CURLOPT_HEADER, true);
   curl_setopt($ch, CURLOPT_HTTPHEADER, $http_options[self::HEADER]);
   curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
   curl_setopt($ch, CURLOPT_TIMEOUT, 10);
   if ($http_options[self::METHOD] == 'POST') {
   curl_setopt($ch, CURLOPT_POSTFIELDS, $http_options['content']);
   }
   $response = curl_exec($ch);
   $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
   $body = substr($response, $header_size);
   curl_close($ch);
   return $body;
   } else {
   $ssl_options = array(
   'verify_host' => true
   );
   $context = stream_context_create(array(
   'http' => $http_options,
   'ssl' => $ssl_options
   ));
   $fp = fopen($url, 'r', false, $context);
   $return_code = explode(' ', $http_response_header[0]);
   $return_code = (int)$return_code[1];
   if ($fp) {
   $response_body = stream_get_contents($fp);
   fclose($fp);
   }
   if ($return_code == 200 || $return_code == 201) {
   return $response_body;
   } else {
   switch($return_code) {
   case 400:
   $message = 'Error en parámetros';
   break;
   case 403:
   $message = 'Error en apikey';
   break;
   case 404:
   $message = 'Orden no encontrada';
   break;
   case 500:
   $message = 'Error en la peticion';
   break;
   case 502:
   $message = 'Error en el sub servicio';
   break;
   default:
   $message = 'Error inesperado, conexion rechazada';
   break;
   }
   return json_encode(array(
   'code' => (string)$return_code,
   'message' => $message
   ));
   }
   }*/
  }

  /**
   * http POST
   */
  private static function httpPost($url, $apikey, $content)
  {

    $headers = array(
      'Content-type' => 'application/json',
      'apikey' => $apikey
    );

    $http_options = array(
      'method' => 'POST',
      'headers' => $headers,
      'body' => wp_json_encode($content),
    );

    return self::httpProcess($url, $http_options);
  }

  /**
   * Invoca al api rest para obtener la orden por su orderId
   */
  public static function getOrder($environment, $apikey, $orderId)
  {
    $url = self::getUrlApi($environment, $apikey) . '/orders/' . $orderId;

    return self::clientOrder($apikey, $url, 'httpGet');
  }

  public static function registerCard($environment, $apikey, $orderRequest)
  {
    $url = self::getUrlApi($environment, $apikey) . '/one-click/register';

    return self::clientOrder($apikey, $url, 'httpPost', $orderRequest);
  }

  /**
   * Invoca al api rest para obtener el listado de metodos activos del comercio.
   */
  public static function getMerchantActivedMethods($environment, $apikey)
  {

    $url = self::getUrlApi($environment, $apikey) . '/merchant/methods';
    if (self::$logger != null) {
      self::$logger->info('PaymentsApiClient::getMerchantActivedMethods, URL invocación API: ' . $url);
    }

    $resp = self::httpGet($url, $apikey);
    if (self::$logger != null) {
      self::$logger->info('PaymentsApiClient::getMerchantActivedMethods, respuesta invocación getMerchantActivedMethods: ' . $resp);
    }

    if ((stripos($resp, self::CODE) !== false && stripos($resp, self::MESSAGE) !== false) ||
    (stripos($resp, self::STATUS) !== false && stripos($resp, self::ERROR) !== false)) {
      return Error::fromJSON($resp);
    }
    else {
      $merchantMethods = new MerchantMethodsResponse();
      $merchantMethods->setMethods(json_decode($resp, true));

      return $merchantMethods;
    }
  }

  private static function isExtensionLoaded($extension_name)
  {
    return extension_loaded($extension_name);
  }
}
