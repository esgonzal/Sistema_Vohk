<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class User implements \JsonSerializable {

  const RUT = 'rut';
  const EMAIL = 'email';
  const FIRST_NAME = 'first_name';
  const LAST_NAME = 'last_name';
  const PHONE = 'phone';
  const ADDRESS_LINE = 'address_line';
  const ADDRESS_CITY = 'address_city';
  const ADDRESS_STATE = 'address_state';


  private $rut; //string
  private $email; //string
  private $first_name; // string
  private $phone; // string
  private $last_name; // string
  private $address_line; // string
  private $address_city; // string
  private $address_state; // string

  public function __construct($user) {
    $this->setRut($user[self::RUT]);
    $this->setEmail($user[self::EMAIL]);
    $this->setFirstName($user[self::FIRST_NAME]);
    $this->setLastName($user[self::LAST_NAME]);
    $this->setPhone($user[self::PHONE]);
    $this->setAddressLine($user[self::ADDRESS_LINE]);
    $this->setAddressCity($user[self::ADDRESS_CITY]);
    $this->setAddressState($user[self::ADDRESS_STATE]);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getRut(){
    return $this->rut;
  }

  public function setRut($rut){
    ValidateParams::validateString($rut, self::RUT);
    $this->rut = $rut;
  }

  public function getEmail(){
    return $this->email;
  }

  public function setEmail($email){
    ValidateParams::validateString($email, self::EMAIL);
    $this->email = $email;
  }

  public function getFirstName() {
    return $this->first_name;
  }

  public function setFirstName($first_name) {
    ValidateParams::validateString($first_name, self::FIRST_NAME);
    $this->first_name = $first_name;
  }

  public function getLastName() {
    return $this->last_name;
  }

  public function setLastName($last_name) {
    ValidateParams::validateString($last_name, self::LAST_NAME);
    $this->last_name = $last_name;
  }

  public function getPhone() {
    return $this->phone;
  }

  public function setPhone($phone) {
    ValidateParams::validateString($phone, self::PHONE);
    $this->phone = $phone;
  }

  public function getAddressLine() {
    return $this->address_line;
  }

  public function setAddressLine($address_line) {
    ValidateParams::validateString($address_line, self::ADDRESS_LINE);
    $this->address_line = $address_line;
  }

  public function getAddressCity() {
    return $this->address_city;
  }

  public function setAddressCity($address_city) {
    ValidateParams::validateString($address_city, self::ADDRESS_CITY);
    $this->address_city = $address_city;
  }

  public function getAddressState() {
    return $this->address_state;
  }

  public function setAddressState($address_state) {
    ValidateParams::validateString($address_state, self::ADDRESS_STATE);
    $this->address_state = $address_state;
  }


  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'User');
     return new User($data);
  }
}
