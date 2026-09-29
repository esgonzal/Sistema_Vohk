<?php
namespace Multicaja\Payments\Model;

use Multicaja\Payments\Utils\ValidateParams;

/**
 *
 */
class Webhooks implements \JsonSerializable {

  private $webhook_validation; //string
  private $webhook_confirm; //string
  private $webhook_reject; //string

  public function __construct($webhook_validation, $webhook_confirm, $webhook_reject) {
    $this->setWebhookValidation($webhook_validation);
    $this->setWebhookConfirm($webhook_confirm);
    $this->setWebhookReject($webhook_reject);
  }

  #[\ReturnTypeWillChange]
  public function jsonSerialize() {
    return get_object_vars($this);
  }

  public function getWebhookValidation(){
		return $this->webhook_validation;
	}

	public function setWebhookValidation($webhook_validation){
    ValidateParams::validateString($webhook_validation, 'webhook_validation');
		$this->webhook_validation = $webhook_validation;
	}

	public function getWebhookConfirm(){
		return $this->webhook_confirm;
	}

	public function setWebhookConfirm($webhook_confirm){
    ValidateParams::validateString($webhook_confirm, 'webhook_confirm');
		$this->webhook_confirm = $webhook_confirm;
	}

	public function getWebhookReject(){
		return $this->webhook_reject;
	}

	public function setWebhookReject($webhook_reject){
    ValidateParams::validateString($webhook_reject, 'webhook_reject');
		$this->webhook_reject = $webhook_reject;
  }

  public static function fromJSON($data) {
    $data = ValidateParams::toJsonArray($data, 'Webhooks');
    return new Webhooks($data["webhook_validation"], $data["webhook_confirm"], $data["webhook_reject"]);
  }
}
