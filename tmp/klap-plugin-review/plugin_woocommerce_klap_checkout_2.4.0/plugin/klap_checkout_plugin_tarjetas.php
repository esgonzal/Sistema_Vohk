<?php
if (! defined('ABSPATH')) {
    exit;
}

require_once(plugin_dir_path(__FILE__) . 'klap_checkout_plugin_base.php');

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @author     https://www.klap.cl/
 *
 * docs: https://docs.woocommerce.com/wc-apidocs/class-WC_Payment_Gateway.html
 * docs: https://github.com/woocommerce/woocommerce/blob/master/includes/abstracts/abstract-wc-payment-gateway.php
 *
 * Metodos nombrados en `camelCase` son metodos propios de la implementacion del plugin de pasarela.
 * Metodos nombrados en `snake_case` son metodos propios de woocomerce que deben ser implementados.
 */
class KlapCheckoutPluginTarjetas extends KlapCheckoutPluginBase {

    /**
     * construct plugin tarjetas.
     */
    public function __construct() {
      parent::loadDependencies();
      $this->id = 'klap_checkout_tarjetas';
      $this->version = MCP_PLUGIN_VERSION;
      $this->plugin_name = 'klap_checkout_tarjetas';
      $this->icon = apply_filters('woocommerce_KlapCheckout_icon', plugin_dir_url(dirname(__FILE__)) . 'public/images/checkout-flex.svg');
      $this->has_fields = false;
      $this->title ='Klap';
      $this->method_title = $this->title;
      $this->method_description = 'Paga con Klap Checkout (' . $this->version . '). Podrás comprar con Apple Pay, Google Pay o Tarjetas.';
      $this->supports = array('products');
      $this->description ='Paga con Apple Pay, Google Pay o Tarjetas.';
      parent::initContent($this);
      // carga las configuraciones
      $this->init_settings();
      $this->init_form_fields();
      if (!parent::isValidForUse()) {
        $this->enabled = false;
      }
    }

    /**
     * Show payment gateway description.
     */
    public function payment_fields(){
      echo wpautop(wptexturize('Paga con Apple Pay, Google Pay o Tarjetas'));
    }

    /**
     * Controlador del callback invocado por Klap Checkout
     **/
    public function callbackHandler() {
      parent::callbackHandlerBase();
    }

    /**
     * Pre-process payment according to Woocommerce API.
     */
	  public function process_payment($referenceId) {
      return parent::process_payment_base($referenceId);
    }

    /**
     * Se crea la orden en Klap mediante el api
     **/
    public function createOrder($referenceId) {
      parent::createOrderBase($referenceId, self::TARJETAS);
    }

    /**
     * Crea la pagina resultado del pago
     */
    public function confirmationOrderPage($respHtml, $orderEcommerce) {
      return parent::confirmationOrderPageBase($respHtml, $orderEcommerce, $this->plugin_name);
    }

    /**
     * Crea las configuraciones de la seccion de administracion
     */
    public function init_form_fields() {
      parent::init_form_fields_base(self::TARJETAS);
    }

}
