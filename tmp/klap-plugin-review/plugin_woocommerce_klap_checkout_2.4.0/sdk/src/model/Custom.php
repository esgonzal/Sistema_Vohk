<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class Custom implements \JsonSerializable {

  private $key; //string
  private $value; //string

  public function __construct($key, $value) {
    $this->setKey($key);
    $this->setValue($value);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getKey(){
    return $this->key;
  }

  public function setKey($key){
    ValidateParams::validateString($key, 'key');
    $this->key = $key;
  }

  public function getValue(){
    return $this->value;
  }

  public function setValue($value){
    ValidateParams::validateString($value, 'value');
    $this->value = $value;
  }

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'Custom');
    return new Custom($data["key"], $data["value"]);
  }

  public static function fromJSONArray($data) {
    $data = ValidateParams::toJsonArray($data, 'Customs');
    $array = array();
    foreach ($data as &$value) {
      $obj = self::fromJSON($value);
      array_push($array, $obj);
    }
    return $array;
  }
}
