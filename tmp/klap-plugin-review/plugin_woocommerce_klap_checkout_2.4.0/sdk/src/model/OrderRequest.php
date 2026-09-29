<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class OrderRequest implements \JsonSerializable {

  const METHODS = 'methods';
  const ITEMS = 'items';
  const CUSTOMS = 'customs';

  protected $reference_id; //string
  protected $description; //string
  protected $generate_token; //string
  protected $token_id; //string
  protected $user; //User
  protected $amount; //Amount
  protected $methods; //array of string
  protected $items; //array of Item
  protected $customs; //array of Custom
  protected $urls; //Urls
  protected $webhooks; //Webhooks

  public function __construct() {
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getReferenceId(){
		return $this->reference_id;
	}

	public function setReferenceId($reference_id){
    ValidateParams::validateString($reference_id, 'reference_id');
		$this->reference_id = $reference_id;
  }

  public function getDescription(){
		return $this->description;
	}

	public function setDescription($description){
    ValidateParams::validateString($description, 'description');
		$this->description = $description;
	}

  public function getGenerateToken(){
		return $this->generate_token;
	}

  public function setGenerateToken($generateToken){
    ValidateParams::validateString($generateToken, 'generate_token');
		$this->generate_token = $generateToken;
	}

  public function getTokenId(){
		return $this->token_id;
	}

  public function setTokenId($tokenId){
    ValidateParams::validateString($tokenId, 'token_id');
		$this->token_id = $tokenId;
	}

	public function getUser(){
		return $this->user;
	}

	public function setUser($user){
		$this->user = $user;
	}

	public function getAmount(){
		return $this->amount;
	}

	public function setAmount($amount){
		$this->amount = $amount;
	}

	public function getMethods(){
		return $this->methods;
	}

	public function setMethods($methods){
    ValidateParams::validateArray($methods, self::METHODS);
		$this->methods = $methods;
  }

  public function addMethod($method){
    if (!isset($this->methods)) {
      $this->methods = array();
    }
		array_push($this->methods, $method);
	}

	public function getItems(){
		return $this->items;
	}

	public function setItems($items){
    ValidateParams::validateArray($items, self::ITEMS);
		$this->items = $items;
  }

  public function addItem($item){
    if (!isset($this->items)) {
      $this->items = array();
    }
		array_push($this->items, $item);
	}

	public function getCustoms(){
		return $this->customs;
	}

	public function setCustoms($customs){
    ValidateParams::validateArray($customs, self::CUSTOMS);
		$this->customs = $customs;
  }

  public function addCustom($custom){
    if (!isset($this->customs)) {
      $this->customs = array();
    }
		array_push($this->customs, $custom);
	}

	public function getUrls(){
		return $this->urls;
	}

	public function setUrls($urls){
		$this->urls = $urls;
	}

	public function getWebhooks(){
		return $this->webhooks;
	}

	public function setWebhooks($webhooks){
		$this->webhooks = $webhooks;
  }

  public static function fromJSON($data, $order = null) {

    $data = ValidateParams::toJsonArray($data, 'OrderRequest');

    if (!isset($order)) {
      $order = new OrderRequest();
    }

    $order->setReferenceId($data["reference_id"]);
    $order->setDescription($data["description"]);
    $order->setGenerateToken($data["generate_token"]);
    $order->setTokenId($data["token_id"]);

    if (isset($data['user'])) {
      $user = User::fromJSON($data['user']);
      $order->setUser($user);
    }

    if (isset($data['amount'])) {
      $amount = Amount::fromJSON($data['amount']);
      $order->setAmount($amount);
    }

    if (isset($data[self::METHODS])) {
      $methods = ValidateParams::toJsonArray($data[self::METHODS], self::METHODS);
      $order->setMethods($methods);
    }

    if (isset($data[self::ITEMS])) {
      $items = Item::fromJSONArray($data[self::ITEMS]);
      $order->setItems($items);
    }

    if (isset($data[self::CUSTOMS])) {
      $customs = Custom::fromJSONArray($data[self::CUSTOMS]);
      $order->setCustoms($customs);
    }

    if (isset($data['urls'])) {
      $urls = Urls::fromJSON($data['urls']);
      $order->setUrls($urls);
    }

    if (isset($data['webhooks'])) {
      $webhooks = Webhooks::fromJSON($data['webhooks']);
      $order->setWebhooks($webhooks);
    }

    return $order;
  }
}
