<?php
namespace Multicaja\Payments\Model;

require_once(dirname(__FILE__).'/OrderRequest.php');

use Multicaja\Payments\Utils\ValidateParams;
use Multicaja\Payments\Model\OrderRequest;

/**
 *
 */
class OrderResponse extends OrderRequest {

  const PAYMENT_DETAILS = 'payment_details';

  protected $order_id; //string
  protected $redirect_url; //string
  protected $status; //string
  protected $payment_details; //Array of customs
  protected $selected_method; //Method

  public function __construct() {
  }

  public function getOrderId(){
		return $this->order_id;
	}

	public function setOrderId($order_id){
    ValidateParams::validateString($order_id, 'order_id');
		$this->order_id = $order_id;
  }

	public function getRedirectUrl(){
		return $this->redirect_url;
	}

	public function setRedirectUrl($redirect_url){
    ValidateParams::validateString($redirect_url, 'redirect_url');
		$this->redirect_url = $redirect_url;
	}

	public function getStatus(){
		return $this->status;
	}

	public function setStatus($status){
    ValidateParams::validateString($status, 'status');
		$this->status = $status;
	}

	public function getPaymentDetails(){
		return $this->payment_details;
	}

	public function setPaymentDetails($payment_details){
    ValidateParams::validateArray($payment_details, self::PAYMENT_DETAILS);
		$this->payment_details = $payment_details;
	}

	public function getSelectedMethod(){
		return $this->selected_method;
	}

	public function setSelectedMethod($selected_method){
		$this->selected_method = $selected_method;
	}

  public static function fromJSONResponse($data) {

    $order = parent::fromJSON($data, new OrderResponse());

    $data = ValidateParams::toJsonArray($data, 'OrderResponse');
    $order->setOrderId($data["order_id"]);
    $order->setStatus($data["status"]);
    $order->setRedirectUrl($data["redirect_url"]);

    if (isset($data[self::PAYMENT_DETAILS])) {
      $payment_details = Custom::fromJSONArray($data[self::PAYMENT_DETAILS]);
      $order->setPaymentDetails($payment_details);
    }

    if (isset($data['selected_method'])) {
      $selected_method = Method::fromJSON($data['selected_method']);
      $order->setSelectedMethod($selected_method);
    }

    return $order;
  }
}
