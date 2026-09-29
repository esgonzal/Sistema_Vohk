<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 * Clase que representa la respuesta del Klap Checkout en relacion a los metodos activos del comercio.
 */
class MerchantMethodsResponse {

  protected $methods; //Array of methods

  public function __construct() {
  }

  public function getMethods(){
		return $this->methods;
	}

	public function setMethods($methods){
    ValidateParams::validateArray($methods, 'methods');
		$this->methods = $methods;
	}

  public function addMethod($method){
    if (!isset($this->methods)) {
      $this->methods = array();
    }
		array_push($this->methods, $method);
	}

}
