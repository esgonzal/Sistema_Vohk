<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class Method implements \JsonSerializable {

  private $code; //string
  private $name; //string

  public function __construct($code, $name) {
    $this->setCode($code);
    $this->setName($name);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getCode(){
    return $this->code;
  }

  public function setCode($code){
    ValidateParams::validateString($code, 'code');
    $this->code = $code;
  }

  public function getName(){
    return $this->name;
  }

  public function setName($name){
    ValidateParams::validateString($name, 'name');
    $this->name = $name;
  }

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'Method');
    return new Method($data["code"], $data["name"]);
  }
}
