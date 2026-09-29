<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class Error implements \JsonSerializable {

  const MESSAGE = 'message';
  const CODE = 'code';

  private $code; //string
  private $message; //string

  public function __construct($code, $message) {
    $this->setCode($code);
    $this->setMessage($message);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getCode(){
    return $this->code;
  }

  public function setCode($code){
    ValidateParams::validateString($code, self::CODE);
    $this->code = $code;
  }

  public function getMessage(){
    return $this->message;
  }

  public function setMessage($message){
    ValidateParams::validateString($message, self::MESSAGE);
    $this->message = $message;
  }

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'Error');
    if (isset($data[self::CODE])) {
      return new Error(strval($data[self::CODE]), strval($data[self::MESSAGE]));
    } else {
      return new Error(strval($data['status']), strval($data['error']) . ' - ' . strval($data[self::MESSAGE]));
    }
  }
}
