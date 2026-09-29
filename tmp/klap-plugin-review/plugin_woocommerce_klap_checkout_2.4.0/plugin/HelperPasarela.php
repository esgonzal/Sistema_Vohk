<?php

// carga el sdk de Klap Checkout
require_once(plugin_dir_path(__FILE__) . '../sdk/src/init.php');

//carga la clase CustomLog
require_once(dirname(__FILE__).'/CustomLog.php');

class HelperPasarela {

  private $configProvider;
  private $prefix;
  private $logger;
  private $ecommerceData;
  const HTTPS = 'HTTPS';
  const TARGET = '&test_access=true" target="_blank">';

  public function __construct($configProvider_, $prefix_ = '') {
    $this->configProvider = $configProvider_;
    $this->prefix = $prefix_;
    $this->logger = new CustomLog();
    $this->ecommerceData = $this->configProvider->getEcommerceData();
  }

   /**
     * Devuelve logger
     */
  public function getLogger() {
    return $this->logger;
  }

      /**
     * Devuelve un valor de una configuracion
     */
	private function getConfigValue($key, $defaultValue = '') {
    return $this->configProvider->getConfigValue($this->prefix . $key, $defaultValue);
  }

  /**
   * retorna el nombre y version del runtime
   */
  public function getRuntimeInfo() {
    return 'php-' . phpversion();
  }

  public function getPluginVersion() {
    return $this->ecommerceData['pluginVersion'];
  }

  /**
   * retorn el nombre y version del ecommerce
   */
  public function getEcommerceInfo() {
    return $this->ecommerceData['ecommerceInfo'];
  }

  /**
   * retorna el dominio predeterminado
   */
  public function getDefaultDomain() {
    $server_name = isset($_SERVER['SERVER_NAME']) ? self::clean_server_name( $_SERVER['SERVER_NAME'] ) : 'localhost';
    $server_port = isset($_SERVER['SERVER_PORT']) ? self::filter_server_port($_SERVER['SERVER_PORT']) : 80;
    if(empty($server_name) || empty($server_port))
        wp_die( "Invalid server_name or server_port");
    if (!in_array($server_port, [80, 443])) {
      $port = ":$server_port";
    } else {
      $port = '';
    }
    if (!empty($_SERVER[self::HTTPS]) && (strtolower($_SERVER[self::HTTPS]) == 'on' || $_SERVER[self::HTTPS] == '1')) {
      $scheme = 'https';
    } else {
      $scheme = 'http';
    }
    return $scheme.'://'.$server_name.$port;
  }

  /**
   * retorna el dominio predeterminado
   */
  public function getWebhooksBaseUrl() {
    return $this->ecommerceData['webhooksBaseUrl'];
  }

  /**
   * retorna si el plugin se encuentra habilitado
   */
  public function getEnable() {
    return $this->getConfigValue('enabled', 'yes');
  }

  /**
   * retorna true si el plugin se encuentra activado
   */
  public function isEnabledAndConfigured() {
    $apikey = $this->getApiKey();
    return $this->getEnable() === 'yes' && $apikey != null && $apikey != '';
  }

  /**
   * retorna el environment seleccionado
   */
  public function getEnvironment() {
    return strtolower($this->getConfigValue('ENVIRONMENT', 'integration'));
  }

  /**
   * retorna el api por environment seleccionado
   */
  public function getApiKey() {
    $environment = $this->getEnvironment();
    if ($environment === 'production') {
      return $this->getApiKeyProduction();
    } else  if ($environment === 'integration') {
      return $this->getApiKeyIntegration();
    } else {
      return $this->getApiKeyLocal();
    }
  }

  /**
   * retorna el api de local
   */
  public function getApiKeyLocal() {
    return $this->getConfigValue('APIKEY_LOCAL', '');
  }

  /**
   * retorna el api de integracion
   */
  public function getApiKeyIntegration() {
    return $this->getConfigValue('APIKEY_INTEGRATION', '');
  }

  /**
   * retorna el api de produccion
   */
  public function getApiKeyProduction() {
    return $this->getConfigValue('APIKEY_PRODUCTION', '');
  }

  /**
   * retorna el environment seleccionado
   */
  public function getWebhooksDomain() {
    return $this->getConfigValue('WEBHOOKS_DOMAIN', $this->getDefaultDomain());
  }

  private function getWebhookBase() {
    $url = $this->getWebhooksBaseUrl();
    $parts = parse_url($url);
    $webhooksDomain = $this->getWebhooksDomain();
    $path = isset($parts['path']) ? $parts['path'] : '';
    if ($path != null && $path !== '') {
      if (!$this->endsWith($webhooksDomain, '/')) {
        $webhooksDomain.='/';
      }
      if ($this->startsWith($path, '/')) {
        $path = substr($path, 1);
      }
      $webhooksDomain = $webhooksDomain . $path;
    }
    $query = isset($parts['query']) ? $parts['query'] : '';
    if ($query != null && $query !== '') {
      $webhooksDomain = $webhooksDomain . '?' . $query;
    }
    return $webhooksDomain;
  }

  /**
   * retorna la url del webhook dee confirmacion
   */
  public function getWebhookConfirm() {
    $webhooksBase = $this->getWebhookBase();
    if(strpos($webhooksBase,'?') !== false) {
      return $webhooksBase . '&mcb=webhook_confirm';
    } else {
      return $webhooksBase . '?mcb=webhook_confirm';
    }
  }

  /**
   * retorna la url del webhook dee rechazo
   */
  public function getWebhookReject() {
    $webhooksBase = $this->getWebhookBase();
    if(strpos($webhooksBase,'?') !== false) {
      return $webhooksBase . '&mcb=webhook_reject';
    } else {
      return $webhooksBase . '?mcb=webhook_reject';
    }
  }

  /**
   * retorna la url de exito
   */
  public function getReturnUrl() {
    $webhooksBase = $this->getWebhookBase();
    if(strpos($webhooksBase,'?') !== false) {
      return $webhooksBase . '&mcb=return_url';
    } else {
      return $webhooksBase . '?mcb=return_url';
    }
  }

  /**
   * retorna la url de error
   */
  public function getCancelUrl() {
    $webhooksBase = $this->getWebhookBase();
    if(strpos($webhooksBase,'?') !== false) {
      return $webhooksBase . '&mcb=cancel_url';
    } else {
      return $webhooksBase . '?mcb=cancel_url';
    }
  }

  /**
   * retorna la url del logo del comercio
   */
  public function getLogoUrl() {
    return $this->getConfigValue('LOGO_URL', null);
  }

  /**
   * retorna si multiaja envia el email con el cupon o lo hace el comercio
   */
  public function getPaymentsNotifyUser() {
    return (string)$this->getConfigValue('PAYMENTS_NOTIFY_USER', 'true');
  }

  /**
   * retorna el tiempo de expiracion del cupon de efectivo
   */
  public function getEfectivoExpirationMinutes() {
    $value = (int)$this->getConfigValue('EFECTIVO_EXPIRATION_MINUTES', '-1');
    if ($value < -1) {
      $value = '-1';
    }
    return (string)$value;
  }


  /**
   * retorna el tiempo de expiracion de pago sodexo
   */
  public function getSodexoExpirationMinutes() {
    $value = (int)$this->getConfigValue('SODEXO_EXPIRATION_MINUTES', '-1');
    if ($value < -1) {
      $value = '-1';
    }
    return (string)$value;
  }

  /**
   * retorna el tiempo de expiracion del la transferencia
   */
  public function getTransferenciaExpirationMinutes() {
    $value = (int)$this->getConfigValue('TRANSFERENCIA_EXPIRATION_MINUTES', '-1');
    if ($value < -1) {
      $value = '-1';
    }
    return (string)$value;
  }

  /**
   * retorna el tiempo de expiracion con tarjetas de crédito
   */
  public function getTarjetaExpirationMinutes() {
    $value = (int)$this->getConfigValue('TARJETA_EXPIRATION_MINUTES', '-1');
    if ($value < -1) {
      $value = '-1';
    }
    return (string)$value;
  }

  /**
   * retorna el estado configurado para orden en espera de pago
   */
  public function getOrderStatusPendingPayment() {
    return (string)$this->getConfigValue('STATUS_PENDIG_PAYMENT', $this->ecommerceData['orderStatusPendingPayment']);
  }

  /**
   * retorna el estado configurado para orden pagada exitosamente
   */
  public function getOrderStatusPaid() {
    return (string)$this->getConfigValue('STATUS_PAID', $this->ecommerceData['orderStatusPaid']);
  }

  /**
   * retorna el estado configurado para orden no pagada, fallida
   */
  public function getOrderStatusFailed() {
    return (string)$this->getConfigValue('STATUS_FAILED', $this->ecommerceData['orderStatusFailed']);
  }

  /**
   * Compara los estados de la orden
   */
  public function compareStatus($orderStatus, $status) {
    $orderStatus = strval($orderStatus);
    $status = strval($status);
    $newOrderStatus = 'wc-' === substr( $orderStatus, 0, 3 ) ? substr( $orderStatus, 3 ) : $orderStatus;
    $newStatus = 'wc-' === substr( $status, 0, 3 ) ? substr( $status, 3 ) : $status;
    return $newOrderStatus === $newStatus;
  }

  /**
   * Retorna true si el plugin se encuentra en modo desarrollo local
   */
  public function isLocalDev() {
    return getenv('IS_LOCAL_DEV') == 'true';
  }

  public function getDebugDataHtml() {

    $returnUrl = $this->getReturnUrl();
    $cancelUrl = $this->getCancelUrl();
    $webhookConfirm = $this->getWebhookConfirm();
    $webhookReject = $this->getWebhookReject();

    $enable = $this->getEnable()=== 'yes';
    $enabledAndConfigured = $this->isEnabledAndConfigured();
    $environment = $this->getEnvironment();
    $apikey = $this->getApiKey();
    $urlApi = \Multicaja\Payments\Utils\PaymentsApiClient::getUrlApi($environment, $apikey);
    $couponSentBy = $this->getPaymentsNotifyUser() == 'true' ? 'Klap' : 'Comercio';

    $webhooksDomain = $this->getWebhooksDomain();
    $runtimeInfo = $this->getRuntimeInfo();
    $ecommerceInfo = $this->getEcommerceInfo();
    $pluginVersion = $this->getPluginVersion();

    $debugData =
      '<p>
        <b>Habilitado:</b><br>
        - ' . ($enable ? 'Si' : 'No') . '
      </p>
      <p>
        <b>Habilitado y configurado:</b><br>
        - ' . ($enabledAndConfigured ? 'Si' : 'No') . '
      </p>
      <p>
        <b>Ambiente y apikey seleccionados:</b><br>
        - ' . $environment . ' - ' . (strlen($apikey) > 4 ? substr($apikey, 0, 4) . '**********' : 'Sin apikey')  . '
      </p>
      <p>
        <b>Dominio de webhooks y redirección:</b><br>
        - ' . $webhooksDomain . '
      </p>
      <p>
        <b>Url donde se redireccionará al usuario luego de un pago exitoso:</b><br>
        - <a href="' . $returnUrl . self::TARGET . $returnUrl . '</a>
      </p>
      <p>
        <b>Url donde se redireccionará al usuario luego de un pago rechazado o cancelado:</b><br>
        - <a href="' . $cancelUrl . self::TARGET . $cancelUrl . '</a>
      </p>
      <p>
        <b>Webhook de confirmación del pago:</b><br>
        - <a href="' . $webhookConfirm . self::TARGET . $webhookConfirm . '</a>
      </p>
      <p>
        <b>Webhook de rechazo del pago:</b><br>
        - <a href="' . $webhookReject . self::TARGET . $webhookReject . '</a>
      </p>
      <p>
        <b>Url api:</b><br>
        - ' . $urlApi . '
      </p>
      <p>
        <b>Cupón enviado por:</b><br>
        - ' . $couponSentBy . '
      </p>
      <p>
        <b>Versión del plugin:</b><br>
        - ' . $pluginVersion . '
      </p>
      <p>
        <b>Runtime:</b><br>
        - ' . $runtimeInfo . '
      </p>
      <p>
        <b>Ecommerce:</b><br>
        - ' . $ecommerceInfo . '
      </p>';

    $logFile = $this->logger->getLogFile();

    return '<script type="text/javascript">
        function showOrHideConfigurationInfo() {
          var el = document.getElementById("configurationInfo");
          var elLink = document.getElementById("linkConfigurationInfo");
          if (el.style.display == "none") {
            el.style.display = "block";
            elLink.text = "Ocultar información avanzada";
          } else {
            el.style.display = "none";
            elLink.text = "Ver información avanzada";
          }
        }
      </script>
      <div>
        <a id="linkConfigurationInfo" href="javascript:void(0);" onClick="javascript:showOrHideConfigurationInfo();">Ver información avanzada</a>
      </div>
      <hr>
      <div id="configurationInfo" style="display: none; background-color: #ffffff; padding: 10px; border: solid 1px #d3d8db;">
        <p>
          <b>Ruta de logs del plugin:</b><br>
          - ' . $logFile . '
        </p>' . $debugData . '
      </div>';
  }

  private function endsWith($haystack, $needle) {
    $length = strlen($needle);
    if ($length == 0) {
      return true;
    }
    return (substr($haystack, -$length) === $needle);
  }

  private function startsWith($haystack, $needle) {
    $length = strlen($needle);
    return (substr($haystack, 0, $length) === $needle);
  }

  private function clean_server_name( $server_name ) {
    return sanitize_text_field($server_name);
  }

  private function filter_server_port( $server_port ) {
    $server_port_cleaned = absint($server_port);
    return filter_var($server_port_cleaned , FILTER_VALIDATE_INT, array(
      'options' => array(
        'min_range' => 1,
        'max_range' => 65535
      )
    ));
  }
}
