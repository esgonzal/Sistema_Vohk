<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class Amount implements \JsonSerializable {

  private $currency = 'CLP'; //string
  private $total = 0; //int
  private $details; //Details

  public function __construct($currency, $total, $details = null) {
    $this->setCurrency($currency);
    $this->setTotal($total);
    $this->setDetails($details);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getCurrency(){
		return $this->currency;
	}

	public function setCurrency($currency){
    ValidateParams::validateString($currency, 'currency');
		$this->currency = $currency;
	}

	public function getTotal(){
		return $this->total;
	}

	public function setTotal($total){
    ValidateParams::validateNumeric($total, 'total');
		$this->total = $total;
  }

  public function getDetails(){
		return $this->details;
	}

	public function setDetails($details){
		$this->details = $details;
	}

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'Amount');
    $amount = new Amount($data["currency"], $data["total"]);
    if (isset($data['details'])) {
      $details = AmountDetails::fromJSON($data['details']);
      $amount->setDetails($details);
    }
    return $amount;
  }
}
