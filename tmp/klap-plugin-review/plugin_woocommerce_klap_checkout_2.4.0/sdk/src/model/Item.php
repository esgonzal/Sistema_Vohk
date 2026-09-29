<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class Item implements \JsonSerializable {

  private $name; //string
  private $code; //string
  private $price; //int
  private $unit_price; //int
  private $quantity; //int

  public function __construct($name, $code, $price, $unit_price, $quantity) {
    $this->setName($name);
    $this->setCode($code);
    $this->setPrice($price);
    $this->setUnitPrice($unit_price);
    $this->setQuantity($quantity);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getName(){
    return $this->name;
  }

  public function setName($name){
    ValidateParams::validateString($name, 'name');
    $this->name = $name;
  }

  public function getCode(){
    return $this->code;
  }

  public function setCode($code){
    ValidateParams::validateString($code, 'code');
    $this->code = $code;
  }

  public function getPrice(){
    return $this->price;
  }

  public function setPrice($price){
    ValidateParams::validateNumeric($price, 'price');
    $this->price = $price;
  }

  public function getUnitPrice(){
    return $this->unit_price;
  }

  public function setUnitPrice($unit_price){
    ValidateParams::validateNumeric($unit_price, 'unit_price');
    $this->unit_price = $unit_price;
  }

  public function getQuantity(){
    return $this->quantity;
  }

  public function setQuantity($quantity){
    ValidateParams::validateNumeric($quantity, 'quantity');
    $this->quantity = $quantity;
  }

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'Item');
    return new Item($data["name"], $data["code"], $data["price"], $data["unit_price"], $data["quantity"]);
  }

  public static function fromJSONArray($data) {
    $data = ValidateParams::toJsonArray($data, 'Items');
    $array = array();
    foreach ($data as &$value) {
      $obj = self::fromJSON($value);
      array_push($array, $obj);
    }
    return $array;
  }
}
