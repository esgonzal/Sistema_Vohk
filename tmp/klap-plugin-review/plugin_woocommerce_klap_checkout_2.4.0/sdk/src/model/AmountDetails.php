<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class AmountDetails implements \JsonSerializable {

  private $subtotal = 0; //int
  private $fee = 0; //int
  private $tax = 0; //int

  public function __construct($subtotal, $fee, $tax) {
    $this->setSubtotal($subtotal);
    $this->setFee($fee);
    $this->setTax($tax);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

	public function getSubtotal(){
		return $this->subtotal;
	}

	public function setSubtotal($subtotal){
    ValidateParams::validateNumeric($subtotal, 'subtotal');
		$this->subtotal = $subtotal;
	}

	public function getFee(){
		return $this->fee;
	}

	public function setFee($fee){
    ValidateParams::validateNumeric($fee, 'fee');
		$this->fee = $fee;
	}

	public function getTax(){
		return $this->tax;
	}

	public function setTax($tax){
    ValidateParams::validateNumeric($tax, 'tax');
		$this->tax = $tax;
	}

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'AmountDetails');
    return new AmountDetails($data["subtotal"], $data["fee"], $data["tax"]);
  }
}
