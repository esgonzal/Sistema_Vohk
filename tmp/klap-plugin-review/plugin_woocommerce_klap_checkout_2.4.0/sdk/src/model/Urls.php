<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class Urls implements \JsonSerializable {

  private $return_url; //string
  private $cancel_url; //string

  public function __construct($return_url, $cancel_url) {
    $this->setReturnUrl($return_url);
    $this->setCancelUrl($cancel_url);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getReturnUrl(){
    return $this->return_url;
  }

  public function setReturnUrl($return_url){
    ValidateParams::validateString($return_url, 'return_url');
    $this->return_url = $return_url;
  }

  public function getCancelUrl(){
    return $this->cancel_url;
  }

  public function setCancelUrl($cancel_url){
    ValidateParams::validateString($cancel_url, 'cancel_url');
    $this->cancel_url = $cancel_url;
  }

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'Urls');
    return new Urls($data["return_url"], $data["cancel_url"]);
  }
}
