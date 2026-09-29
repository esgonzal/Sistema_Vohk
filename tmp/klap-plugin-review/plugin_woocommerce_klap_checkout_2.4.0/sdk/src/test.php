<?php

//carga el sdk php completo
require_once(dirname(__FILE__) . '/init.php');

//importa los modelos
use \Multicaja\Payments\Model\AmountDetails;
use \Multicaja\Payments\Model\Amount;
use \Multicaja\Payments\Model\User;
use \Multicaja\Payments\Model\Item;
use \Multicaja\Payments\Model\Custom;
use \Multicaja\Payments\Model\Urls;
use \Multicaja\Payments\Model\Webhooks;
use \Multicaja\Payments\Model\Method;
use \Multicaja\Payments\Model\Error;
use \Multicaja\Payments\Model\OrderRequest;
use \Multicaja\Payments\Model\OrderResponse;
use \Multicaja\Payments\Utils\PaymentsApiClient;

$reference_id = bin2hex(openssl_random_pseudo_bytes(10));
static $VALUE = "value";
static $APIKEY = 'mKaTZ4yBm3rVFapqNctziKCvXsjD6fDO';
static $INTEGRACION = 'integration';

$jsonOrderRequest = '
  {
    "reference_id": "' . $reference_id . '",
    "description": "Esta es una orden test SDK.",
    "user": {
      "rut": "11111111-1",
      "email": "abcdef21903120@multicaja.cl",
      "first_name": "name",
      "last_name": "last name",
      "address_line": "Address",
      "address_city": "City",
      "address_state":"state",
      "phone": "912345678"
    },
    "amount": {
      "currency": "CLP",
      "total": 1000,
      "details": {
        "subtotal": 1000,
        "fee": 0,
        "tax": 0
      }
    },
    "methods": [
      "efectivo_api"
    ],
    "items": [
      {
        "name": "completo",
        "code": "comp",
        "price": 1000,
        "unit_price": 1000,
        "quantity": 1
      },
      {
        "name": "bebida",
        "code": "beb",
        "price": 600,
        "unit_price": 600,
        "quantity": 1
      }
    ],
 "delivery_type": "1",
    "customs": [
      {
        "key": "efectivo_expiration_minutes",
        "value": "-1"
      },
      {
        "key": "payments_notify_user",
        "value": "false"
      }
    ],
    "urls": {
      "logo_url": "http://logo",
      "return_url": "http://www.micomercio.org/return_url",
      "cancel_url": "http://www.micomercio.org/cancel_url"
    },
    "webhooks": {
      "webhook_validation": "http://localhost:7000/payments-mock-gateway/webhook_validation",
      "webhook_confirm": "http://localhost:7000/payments-mock-gateway/webhook_confirm",
      "webhook_reject": "http://localhost:7000/payments-mock-gateway/webhook_reject"
    }
   }
';

//probar la clase Amount
$jsonAmount = '{"currency": "CLP", "total": 1000, "details": { "subtotal": 1000, "fee": 1,"tax":1}}';
$amount = Amount::fromJSON($jsonAmount);
error_log(json_encode($amount));

//probar la clase Item
$jsonItem = '{"name": "completo", "code": "abc", "price": 1000, "unit_price": 1000, "quantity": 1}';
$item = Item::fromJSON($jsonItem);
error_log(json_encode($item));

//probar la clase Custom
$jsonCustom = '{"key": "expiration_minutes", "value": "-1"}';
$custom = Custom::fromJSON($jsonCustom);
error_log(json_encode($custom));

//probar la clase Urls
$jsonUrls = '{"return_url": "http://return", "cancel_url": "http://cancel", "logo_url": "http://logo"}';
$urls = Urls::fromJSON($jsonUrls);
error_log(json_encode($urls));

//probar la clase Webhooks
$jsonWebhooks = '{"webhook_validation": "http://validation", "webhook_confirm": "http://confirm", "webhook_reject": "http://reject"}';
$webhooks = Webhooks::fromJSON($jsonWebhooks);
error_log(json_encode($webhooks));

//probar la clase User
$jsonUser = '{"rut": "11111111-1", "email": "abcdef21903120@multicaja.cl", "first_name": "name", "last_name": "last name", "phone": "912345678", "address_line": "Address", "address_city": "City", "address_state": "state"}';
$user = User::fromJSON($jsonUser);
error_log(json_encode($user));

//probar la clase OrderRequest
$orderRequest = OrderRequest::fromJSON($jsonOrderRequest);
error_log(json_encode($orderRequest));

//probar la clase OrderResponse
$jsonOrderResponse = json_decode($jsonOrderRequest, true);
$jsonOrderResponse['order_id'] = '97631d89f662e67a49b8a90ffd50556ed63e';
$jsonOrderResponse['status'] = 'pending';
$jsonOrderResponse['redirect_url'] = 'http://localhost/order/97631d89f662e67a49b8a90ffd50556ed63e';
$jsonOrderResponse['selected_method'] = array("code" => "MP5", "name" => "efectivo_api");
$jsonOrderResponse['payment_details'] = array(
  array("key" => "order_id", $VALUE => "97631d89f662e67a49b8a90ffd50556ed63e"),
  array("key" => "mc_order_id",$VALUE => "1560374379491"),
  array("key" => "expiration_date", $VALUE => "2019-06-12T21 =>19 =>39.491Z"),
  array("key" => "coupon_code", $VALUE => "123000635"),
  array("key" => "nearest_branch_url", $VALUE => "https://www.multicaja.cl/puntos-de-pago-efectivo/?monto=mayor")
);

$orderResponse = OrderResponse::fromJSON($jsonOrderResponse);
error_log(json_encode($orderResponse));

//probar lel cliente para crear una orden
$response = PaymentsApiClient::createOrder($INTEGRACION, $APIKEY, $orderRequest);

if ($response instanceof OrderResponse) {

  //probar el cliente para buscar una orden existente
  $response = PaymentsApiClient::getOrder($INTEGRACION, $APIKEY, $response->getOrderId());
  echo 'get order success: ' . json_encode($response, JSON_PRETTY_PRINT + JSON_UNESCAPED_SLASHES);

  //probar el cliente para buscar una orden inexistente
  $response = PaymentsApiClient::getOrder($INTEGRACION, $APIKEY, $response->getOrderId().'1');
  echo 'get order error: ' . json_encode($response, JSON_PRETTY_PRINT + JSON_UNESCAPED_SLASHES);
} else {

  //probar el cliente para error
  echo 'error: ' . json_encode($response, JSON_PRETTY_PRINT + JSON_UNESCAPED_SLASHES);
}
