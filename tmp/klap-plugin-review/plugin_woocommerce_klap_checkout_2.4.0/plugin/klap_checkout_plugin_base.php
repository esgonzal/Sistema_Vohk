<?php
if (!defined('ABSPATH')) {
    exit;
}

// carga el sdk de Klap Checkout
require_once(plugin_dir_path(__FILE__) . '../sdk/src/init.php');

// carga HelperPasarela
require_once(plugin_dir_path(__FILE__) . 'HelperPasarela.php');
require_once(plugin_dir_path(__FILE__) . '../Models/CardToken.php');

require_once(plugin_dir_path(__FILE__) . '../Tokenization/WC_Payment_Token_OneClick_Klap.php');

use Multicaja\Payments\Model\Amount;
use Multicaja\Payments\Model\Error;
use Multicaja\Payments\Model\Item;
use Multicaja\Payments\Model\OrderRequest;
use Multicaja\Payments\Model\OrderResponse;
use Multicaja\Payments\Model\Urls;
use Multicaja\Payments\Model\Webhooks;
use Multicaja\Payments\Utils\PaymentsApiClient;
use Multicaja\Payments\Utils\ValidateParams;

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 * @author  klap.cl
 *
 * docs: https://docs.woocommerce.com/wc-apidocs/class-WC_Payment_Gateway.html
 * docs: https://github.com/woocommerce/woocommerce/blob/master/includes/abstracts/abstract-wc-payment-gateway.php
 *
 * Metodos nombrados en `camelCase` son metodos propios de la implementacion del plugin de pasarela.
 * Metodos nombrados en `snake_case` son metodos propios de woocomerce que deben ser implementados.
 */
class KlapCheckoutPluginBase extends WC_Payment_Gateway
{

    const PLATFORM = 'WOOCOMMERCE';
    const TARJETAS = 'tarjetas';
    const ONECLICK = 'oneclick';
    const SODEXO = 'sodexo';
    const EFECTIVO_TRANSFERENCIA = 'efectivo_transferencia';
    const AMOUNT = 'amount';
    const VALUE = 'value';
    const REFERENCE_ID = 'reference_id';
    const ORDER_ID = 'order_id';
    const TOKEN_ID = 'token_id';
    const MC_CODE = 'mc_code';
    const QUOTAS_NUMBER = 'quotas_number';
    const CARD_TYPES = 'card_type';
    const LAST_DIGITS = 'last_digits';
    const PAYMENT_METHOD = 'payment_method';
    const BRAND = 'brand';
    const BIN = 'bin';
    const QUOTAS_TYPE = 'quotas_type';
    const FECHA = ', fecha: ';
    const ORDERLOG = ', orderId: ';
    const WOOTHEMES = 'woothemes';
    const ERROR = 'ERROR: ';
    const ERRORLOG = 'error';
    const ESTIMADO = 'Estimado cliente, el pago de su orden ha fallado';
    const PARA_ORDEN = '] para la orden, referenceId: ';
    const DETALLE = '<h2>Detalles de la transacción</h2>';
    const STYLE = '<h3 style="';
    const TABLE = '</table>';
    const TITLE = 'title';
    const DEFAULT_CONFIG = 'default';
    const REQUIRED = 'required';
    const TYPE = 'type';
    const SELECT = 'select';
    const OPTIONS = 'options';
    const IMG_SRC_TEXT = '<img src="';
    const ALT_TEXT = '" alt="';
    const ORDER_EXPIRATION_MINUTES = '-1';
    const TEXT_EXPIRATION_MINUTES = '_expiration_minutes';
    public $hp;
    public $logger = null;
    /**
     * The loader that's responsible for maintaining and registering all hooks that power
     * the plugin.
     *
     * @since    1.0.0
     * @access   protected
     * @var      KlapCheckoutLoader $loader Maintains and registers all hooks for the plugin.
     */
    protected $loader;
    /**
     * The unique identifier of this plugin.
     *
     * @since    1.0.0
     * @access   protected
     * @var      string $plugin_name The string used to uniquely identify this plugin.
     */
    protected $plugin_name;
    /**
     * The current version of the plugin.
     *
     * @since    1.0.0
     * @access   protected
     * @var      string $version The current version of the plugin.
     */
    protected $version;

    public function __construct($configProvider_)
    {
        $this->hp = new HelperPasarela($configProvider_, 'MCP_');
        $this->logger = $this->hp->getLogger();
    }

    /**
     * Run the loader to execute all of the hooks with WordPress.
     */
    public function run()
    {
        $this->loader->run();
    }

    /**
     * The reference to the class that orchestrates the hooks with the plugin.
     */
    public function get_loader()
    {
        return $this->loader;
    }

    public function initContent($configProvider_)
    {
        $this->hp = new HelperPasarela($configProvider_, 'MCP_');
        $this->logger = $this->hp->getLogger();
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array(&$this, 'process_admin_options'));
        add_action('woocommerce_receipt_' . $this->id, array(&$this, 'createOrder'));
        add_action('woocommerce_api_wc_gateway_' . $this->id, array(&$this, 'callbackHandler'));
        add_filter('woocommerce_thankyou_order_received_text', array(&$this, 'confirmationOrderPage'), 10, 2);
    }

    /**
     * Retorna un metadato de la orden por su llave
     */
    public function getHp()
    {
        return $this->hp;
    }

    /**
     * Devuelve informacion propia del ecommerce, usado por HelperPasarela
     */
    public function getEcommerceData()
    {
        global $woocommerce;

        return array(
                'pluginVersion' => MCP_PLUGIN_VERSION,
                'ecommerceInfo' => 'woocommerce-' . $woocommerce->version,
                'webhooksBaseUrl' => home_url('/') . '?wc-api=WC_Gateway_' . $this->id,
                'orderStatusPendingPayment' => 'wc-pending',
                'orderStatusPaid' => 'wc-processing',
                'orderStatusFailed' => 'wc-cancelled'
        );
    }

    /**
     * Devuelve un valor de una configuracion, usado por HelperPasarela
     */
    public function getConfigValue($key, $defaultValue)
    {
        $value = $this->get_option($key, $defaultValue);

        return $value == '' || $value == null ? $defaultValue : $value;
    }

    /**
     * Agrega el link de Settings a para administrar el plugin
     */
    public function add_action_links($links, $plugin_file)
    {
        $newLinks = array();
        if (preg_match('/klap_checkout.php/i', $plugin_file)) {
            $newLinks = array('<a href="' . admin_url('admin.php?page=wc-settings&tab=checkout&section=' . $this->id) . '">' . __($this->id != 'klap_checkout_sodexo' ? ($this->id != 'klap_checkout_tarjetas' ? ($this->id == 'klap_checkout_oneclick' ? 'Settings Oneclick' : 'Settings Efectivo / Tranferencia Bancaria') : 'Settings Tarjetas') : 'Settings Sodexo') . '</a>',);
        }

        return array_merge($newLinks, $links);
    }

    /**
     * Return the gateway's icon.
     *
     * Permite personalizar el icono del medio de pago, en este caso la imagen de Klap se establece a 40px
     *
     * @return string
     */
    public function get_icon()
    {
        $iconTexts = ['checkout-flex', 'pluxee', 'efectivo'];
        $icon = '';
        if ($this->icon) {
            if (strpos($this->icon, $iconTexts[0])) {
                $icon = self::IMG_SRC_TEXT . WC_HTTPS::force_https_url($this->icon) . self::ALT_TEXT . esc_attr($this->get_title()) . '" width="135px" height="50px"/>';
            } elseif (strpos($this->icon, $iconTexts[1])) {
                $icon = self::IMG_SRC_TEXT . WC_HTTPS::force_https_url($this->icon) . self::ALT_TEXT . esc_attr($this->get_title()) . '" width="102px" height="40px"/>';
            } elseif (strpos($this->icon, $iconTexts[2])) {
                $icon = self::IMG_SRC_TEXT . WC_HTTPS::force_https_url($this->icon) . self::ALT_TEXT . esc_attr($this->get_title()) . '" width="80px" height="44px"/>';
            }
        }

        return apply_filters('woocommerce_gateway_icon', $icon, $this->id);
    }

    /**
     * Personaliza la patalla de administracion
     */
    public function admin_options()
    {
        parent::admin_options();
        $debugDataHtml = $this->hp->getDebugDataHtml();
        echo wp_kses_post($debugDataHtml);
    }

    /**
     * Se crea la orden en Klap mediante el api
     **/
    protected function createOrderBase($referenceId, $method, $token = null)
    {
        $orderEcommerce = wc_get_order($referenceId);
        try {
            $returnUrl = $this->hp->getReturnUrl();
            $cancelUrl = $this->hp->getCancelUrl();
            $webhookConfirm = $this->hp->getWebhookConfirm();
            $webhookReject = $this->hp->getWebhookReject();
            $runtimeInfo = $this->hp->getRuntimeInfo();
            $ecommerceInfo = $this->hp->getEcommerceInfo();
            $description = null;
            $amount = intval(round(number_format($orderEcommerce->get_total(), 0, ',', '')));
            $orderRequest = new OrderRequest();

            //agrega los items del carro a los items de la orden
            /* $cartItems = WC()->cart->get_cart();
             foreach ($cartItems as $cartItem) {
             $name = strval($cartItem['data']->get_title());
             $code = strval($cartItem['product_id']);
             $quantity = intval($cartItem['quantity']);
             $unitPrice = intval(round($cartItem['data']->get_price()));
             $price = $unitPrice * $quantity;
             $orderRequest->addItem(new Item($name, $code, $price, $unitPrice, $quantity));
             $description = $name;
             }*/

            if ($method === self::TARJETAS || $method === self::ONECLICK) {
                //verifica si es retiro en tienda
                $shipping = $orderEcommerce->get_items('shipping');
                foreach ($shipping as $shipping_item_obj) {
                    $shipping_method_title = $shipping_item_obj->get_method_title();
                    $shipping_method_id = $shipping_item_obj->get_method_id();
                    $this->logger->info('Metodo seleccionado : ' . $shipping_method_id . ' ' . $shipping_method_title);
                }
            }

            //agrega el costo de envio a los items de la orden
            $shippingPrice = intval(round(WC()->cart->get_shipping_total()));
            if ($shippingPrice != 0) {
                $name = 'Costo por envio';
                $code = 'Envio';
                $quantity = 1;
                $price = $shippingPrice;
                $orderRequest->addItem(new Item($name, $code, $price, $price, $quantity));
            }

            if ($description == null) {
                $description = 'Compra de varios productos';
            }

            /**
             * Validar monto mayor a 50 pesos
             */
            if ($amount < 50) {
                throw new InvalidArgumentException('El monto de compra debe ser de al menos $50 pesos.');
            }

            //agrega los datos del usuario
            /*$user["rut"] = null;
             $user["email"] = $orderEcommerce->get_billing_email();
             $user["first_name"] = $orderEcommerce->get_billing_first_name();
             $user["last_name"] = $orderEcommerce->get_billing_last_name();
             $user["phone"] = $orderEcommerce->get_billing_phone();
             $user["address_line"] = "{$orderEcommerce->get_billing_address_1()}  {$orderEcommerce->get_billing_address_2()}";
             $user["address_city"] = $orderEcommerce->get_billing_city();
             $user["address_state"] = $orderEcommerce->get_billing_state();*/
            $orderRequest->setUser(null); //->setUser(new User($user));
            $orderRequest->setReferenceId((string)$referenceId);
            $orderRequest->setDescription($description);
            $orderRequest->setAmount(new Amount('CLP', $amount));
            $orderRequest->addCustom(array('key' => 'plugin_version', self::VALUE => MCP_PLUGIN_VERSION));
            $orderRequest->addCustom(array('key' => 'plugin_ecommerce_runtime', self::VALUE => $runtimeInfo));
            $orderRequest->addCustom(array('key' => 'plugin_ecommerce_name', self::VALUE => $ecommerceInfo));
            $orderRequest->addCustom(array('key' => 'plugin_ecommerce_platform', self::VALUE => self::PLATFORM));
            $orderRequest->addCustom(array('key' => 'payments_notify_user', self::VALUE => true));
            if ($method === self::TARJETAS) {
                $generateToken = 'none';
                $orderRequest->setGenerateToken($generateToken);
                $orderRequest->setMethods(array('tarjetas'));
                $orderRequest->addCustom(array('key' => 'tarjetas' . self::TEXT_EXPIRATION_MINUTES,
                        self::VALUE => self::ORDER_EXPIRATION_MINUTES
                ));
            } else if ($method === self::ONECLICK) {
                if ($token) {
                    $tokenId = (string)$token;
                    $orderRequest->setTokenId($tokenId);
                    $orderRequest->setMethods(array('tarjetas_api'));
                } else {
                    $generateToken = 'mandatory';
                    $orderRequest->setGenerateToken($generateToken);
                    $orderRequest->setMethods(array('tarjetas'));
                    $orderRequest->addCustom(array('key' => 'tarjetas' . self::TEXT_EXPIRATION_MINUTES,
                            self::VALUE => self::ORDER_EXPIRATION_MINUTES
                    ));
                }
            } else if ($method === self::EFECTIVO_TRANSFERENCIA) {
                $orderRequest->setMethods(array('efectivo', 'transferencia'));
                $orderRequest->addCustom(array('key' => 'efectivo' . self::TEXT_EXPIRATION_MINUTES,
                        self::VALUE => self::ORDER_EXPIRATION_MINUTES
                ));
                $orderRequest->addCustom(array('key' => 'transferencia' . self::TEXT_EXPIRATION_MINUTES,
                        self::VALUE => self::ORDER_EXPIRATION_MINUTES
                ));
            } else if ($method === self::SODEXO) {
                $orderRequest->setMethods(array('sodexo'));
                $orderRequest->addCustom(array('key' => 'sodexo' . self::TEXT_EXPIRATION_MINUTES,
                        self::VALUE => self::ORDER_EXPIRATION_MINUTES
                ));
            }
            $orderRequest->setUrls(new Urls($returnUrl, $cancelUrl));
            $orderRequest->setWebhooks(new Webhooks(null, $webhookConfirm, $webhookReject));

            //crea la orden en Klap
            try {
                $environment = $this->hp->getEnvironment();
                $apikey = $this->hp->getApiKey();
                PaymentsApiClient::setLogger($this->logger);
                $response = PaymentsApiClient::createOrder($environment, $apikey, $orderRequest);
            } catch (Exception $ex) {
                $this->logger->error('Error al crear la orden: ' . $ex->getMessage());
                $response = new Error('0', 'Error al crear la orden');
            }

            //limpia todos los mensajes de error mostrados al usuario
            wc_clear_notices();

            if ($response == null) {
                throw new InvalidArgumentException('Error al intentar conectar con Klap Checkout, sin respuesta. Por favor intenta más tarde.');
            }

            if (!($response instanceof OrderResponse)) {
                $this->logger->error(wp_json_encode($response));
                throw new InvalidArgumentException('Error en la respuesta de Klap Checkout. Por favor intenta más tarde.');
            }

            if (!$token && $response->getRedirectUrl() == null) {
                throw new InvalidArgumentException('Error al intentar conectar con Klap Checkout. Por favor intenta más tarde.');
            }

            //actualiza el estado de la orden a pago pendiente
            $orderStatus = $this->hp->getOrderStatusPendingPayment();
            $orderEcommerce->update_status($orderStatus);

            //actualiza/establece los metadatos de la orden
            $orderId = $response->getOrderId();
            $purchaseDate = $this->getCurrentDateTime();

            $this->addMetadataToOrder($referenceId, self::AMOUNT, $amount);
            $this->addMetadataToOrder($referenceId, self::REFERENCE_ID, $referenceId);
            $this->addMetadataToOrder($referenceId, self::ORDER_ID, $orderId);
            $this->addMetadataToOrder($referenceId, 'purchase_date', $purchaseDate);
            $this->addMetadataToOrder($referenceId, self::PAYMENT_METHOD, $method);

            $this->logger->info('Orden creada con exito usando [klap ' . $method . '] en espera del pago, referenceId: ' . $referenceId . self::ORDERLOG . $orderId . self::FECHA . $purchaseDate);
            if (!$token) {
                wp_redirect($response->getRedirectUrl());
                die();
            }
        } catch (Exception $ex) {
            $this->logger->error('order: ' . $referenceId . ', error: ' . $ex->getMessage());
            wc_add_notice(__(self::ERROR, self::WOOTHEMES) . $ex->getMessage(), self::ERRORLOG);
            if ($token) {
                throw $ex;
            }
            wp_redirect($orderEcommerce->get_checkout_payment_url());
            die();
        }
    }

    /**
     * Retorna la fecha formateada con zona horaria
     */
    private function getCurrentDateTime()
    {
        if (function_exists('wp_date')) {
            return wp_date('F j, Y, G:i:s', null, new \DateTimeZone('America/Santiago'));
        }
        return date('F j, Y, G:i:s');
    }

    /**
     * Agrega un metadato a la orden
     * Compatible con HPOS (WooCommerce 8.2+)
     */
    private function addMetadataToOrder($referenceId, $key, $value)
    {
        $order = wc_get_order($referenceId);
        if ($order) {
            $order->update_meta_data($key, $value);
            $order->save();
        }
    }

    /**
     * Controlador del callback invocado por Klap Checkout
     **/
    protected function callbackHandlerBase()
    {
        $paymentDate = $this->getCurrentDateTime();
        try {
            $callback = isset($_GET['mcb']) ? self::clean_text_order($_GET['mcb']) : null;

            //maneja el callback cuando se redirecciona desde el pasarela front a las url de la orden: return_url o cancel_url
            if (empty($_SERVER['REQUEST_METHOD'])) {
                throw new InvalidArgumentException('[callbackHandlerBase] Error en llamado callbackHandler');
            }

            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                $reference_id = isset($_GET['referenceId']) ? self::clean_text_order($_GET['referenceId']) : null;
                $order_id = isset($_GET['orderId']) ? self::clean_text_order($_GET['orderId']) : null;

                if ($reference_id == null || $order_id == null) {
                    wc_add_notice(__(self::ERROR, self::WOOTHEMES) . self::ESTIMADO, self::ERRORLOG);
                    wp_redirect(wc_get_cart_url());
                    exit;
                }

                if ($callback !== 'return_url' && $callback !== 'cancel_url') {
                    throw new InvalidArgumentException('Error en el nombre de la url de redirección [' . $callback . self::PARA_ORDEN . $reference_id . self::ORDERLOG . $order_id);
                }

                $orderEcommerce = wc_get_order($reference_id);

                if (!$orderEcommerce) {
                    wc_add_notice(__(self::ERROR, self::WOOTHEMES) . self::ESTIMADO, self::ERRORLOG);
                    wp_redirect(wc_get_cart_url());
                    exit;
                }

                $orderStatus = $orderEcommerce->get_status();
                //es orden pendiente de pago
                if ($this->hp->compareStatus($orderStatus, $this->hp->getOrderStatusPendingPayment())) {
                    wp_redirect($orderEcommerce->get_checkout_order_received_url());
                    //es orden pagada
                } else if ($this->hp->compareStatus($orderStatus, $this->hp->getOrderStatusPaid())) {
                    wp_redirect($orderEcommerce->get_checkout_order_received_url());
                    //es orden con error en pago
                } else {
                    wc_add_notice(__(self::ERROR, self::WOOTHEMES) . self::ESTIMADO, self::ERRORLOG);
                    wp_redirect($orderEcommerce->get_checkout_payment_url());
                }

                //maneja el callback cuando se invoca desde pasarela a los webhooks de la orden: webhook_confirm o webhook_reject
            } else {
                $raw_post = file_get_contents('php://input');
                $data = json_decode($raw_post, true);

                $order_id = isset($data[self::ORDER_ID]) ? self::clean_text_order($data[self::ORDER_ID]) : null;
                $reference_id = isset($data[self::REFERENCE_ID]) ? self::clean_text_order($data[self::REFERENCE_ID]) : null;
                $payment_method = isset($data[self::PAYMENT_METHOD]) ? self::clean_text_order($data[self::PAYMENT_METHOD]) : null;
                $is_register = $this->startsWith($reference_id, 'RT');
                if ($reference_id == null) {
                    throw new InvalidArgumentException('Error en la invocación del webhook [' . $callback . '] reference_id inválido');
                }

                if ($order_id == null) {
                    throw new InvalidArgumentException('Error en la invocación del webhook [' . $callback . '] order_id inválido');
                }

                if ($callback !== 'webhook_confirm' && $callback !== 'webhook_reject') {
                    throw new InvalidArgumentException('Error en el nombre del webhook [' . $callback . self::PARA_ORDEN . $reference_id . self::ORDERLOG . $order_id);
                }
                //busca la orden en la BD del ecommerce
                if ($is_register) {
                    $method = 'klap_checkout_oneclick';
                } else {
                    $orderEcommerce = wc_get_order($reference_id);
                    $method = $orderEcommerce->get_data()['payment_method'];
                }
                $my_fields = get_option('woocommerce_' . $method . '_settings');
                $environment = $my_fields['MCP_ENVIRONMENT'];
                $apikey = $my_fields[$environment != 'production' ? $environment == 'integration' ? 'MCP_APIKEY_INTEGRATION' : 'MCP_APIKEY_LOCAL' : 'MCP_APIKEY_PRODUCTION'];
                //verifica el apikey dinamico enviado por el webhook
                $headers = function_exists('apache_request_headers') ? apache_request_headers() : array();
                if (empty($headers)) {
                    // Fallback: leer headers de $_SERVER para compatibilidad con nginx/CGI
                    foreach ($_SERVER as $skey => $svalue) {
                        if (substr($skey, 0, 5) === 'HTTP_') {
                            $header = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($skey, 5)))));
                            $headers[$header] = $svalue;
                        }
                    }
                }
                $valid = ValidateParams::validateHashApiKeyFromHeaders($headers, $reference_id, $order_id, $apikey);
                if (!$valid) {
                    throw new InvalidArgumentException('Error en la autenticación del webhook [' . $callback . self::PARA_ORDEN . $reference_id . self::ORDERLOG . $order_id . self::FECHA . $paymentDate);
                }

                //si es un pago exitoso

                if ($callback === 'webhook_confirm') {
                    //actualiza la orden a pagada

                    $quotasNumber = isset($data[self::QUOTAS_NUMBER]) ? absint($data[self::QUOTAS_NUMBER]) : null;
                    $mcCode = isset($data[self::MC_CODE]) ? $data[self::MC_CODE] : null;
                    $quotasType = null;
                    if ($data[self::QUOTAS_TYPE]) {
                        $quotasType = $data[self::QUOTAS_TYPE] == 'ISSUER' ? 'Emisor' : 'Comercio';
                    }
                    $klap_token = isset($data[self::TOKEN_ID]) ? self::clean_text_order($data[self::TOKEN_ID]) : null;
                    $cardType = isset($data[self::CARD_TYPES]) ? self::clean_text_order($data[self::CARD_TYPES]) : null;
                    if ($cardType) {
                        $cardType = $cardType == 'DEBIT' ? 'DÉBITO' : 'CRÉDITO';
                    }
                    $brand = isset($data[self::BRAND]) ? self::clean_text_order($data[self::BRAND]) : null;
                    $lastDigits = isset($data[self::LAST_DIGITS]) ? absint($data[self::LAST_DIGITS]) : null;
                    $bin = isset($data[self::BIN]) ? absint($data[self::BIN]) : null;
                    $nroCard = '';
                    if ($bin && $lastDigits) {
                        $nroCard = $bin . '******' . $lastDigits;
                    }
                    if (!$is_register) {
                        $orderEcommerce->update_status($this->hp->getOrderStatusPaid());
                        $amount = intval(round(number_format($orderEcommerce->get_total(), 0, ',', '')));

                        if ($amount !== intval($data[self::AMOUNT]))
                            throw new InvalidArgumentException('Error en la invocación del webhook [' . $callback . '], amount inválido');

                        $orderStatus = $this->hp->getOrderStatusPaid();
                        $this->addMetadataToOrder($reference_id, 'payment_date', $paymentDate);
                        $this->addMetadataToOrder($reference_id, self::MC_CODE, $mcCode);
                        $this->addMetadataToOrder($reference_id, 'order_status', $orderStatus);
                        $this->addMetadataToOrder($reference_id, 'card', $nroCard);
                        $this->addMetadataToOrder($reference_id, self::CARD_TYPES, $cardType);
                        $this->addMetadataToOrder($reference_id, self::BRAND, $brand);
                        $this->addMetadataToOrder($reference_id, self::QUOTAS_NUMBER, $quotasNumber);
                        $this->addMetadataToOrder($reference_id, self::QUOTAS_TYPE, $quotasType);
                        //completa el pago de la orden
                        $orderEcommerce->payment_complete();
                        // payment_complete() ya reduce el stock automáticamente
                        $customer_id = $orderEcommerce->get_customer_id();
                        WC()->cart->empty_cart();
                        $message = 'Pago realizado con exito usando Klap Checkout';
                        $this->addOrderDetailsOnNotes($message, $reference_id, $orderStatus, $amount, $paymentDate, $cardType, $brand, $nroCard, $quotasNumber, $quotasType, $payment_method, $mcCode, $order_id, $orderEcommerce);
                        $this->logger->info('Pago realizado con exito usando [klap Checkout - ' . $payment_method . self::PARA_ORDEN . $reference_id . self::ORDERLOG . $order_id . self::FECHA . $paymentDate);
                    } else {
                        $cardToken = CardToken::getCardTokenByReferenceId($reference_id);
                        $customer_id = $cardToken->user_id;
                    }

                    //inicio registro de tarjeta
                    try {
                        $user = new WC_Customer($customer_id);
                        if ($customer_id && $klap_token && $lastDigits && $cardType && $brand && $bin) {

                            $tokens = WC_Payment_Tokens::get_customer_tokens($customer_id, 'klap_checkout_oneclick');

                            if (count($tokens) < 3 && CardToken::getCardTokenByUserIdAndLastDigitsAndBrandAndBin($customer_id, $lastDigits, $brand, $bin) == null) {
                                $token = new WC_Payment_Token_OneClick_Klap();
                                $token->set_token($klap_token);
                                $token->set_gateway_id('klap_checkout_oneclick');
                                $token->set_card_type($brand);
                                $token->set_last4($lastDigits);
                                $token->set_username($user->get_username());
                                $token->set_email($user->get_email());
                                $token->set_brand($brand);
                                $token->set_type_card($cardType);
                                $token->set_bin($bin);
                                $token->set_user_id($customer_id);
                                $token->set_default(1);
                                $token->save();

                                if ($token->get_id()) {
                                    $infoCardToken = [
                                            'klap_token' => $klap_token,
                                            'woocommerce_token_id' => $token->get_id(),
                                            'card_type' => $cardType,
                                            'bin' => $bin,
                                            'last_digits' => $lastDigits,
                                            'brand' => $brand,
                                            'status' => CardToken::STATUS_COMPLETED
                                    ];
                                    if ($is_register) {
                                        if ($cardToken && $cardToken->id) {
                                            $cardToken = CardToken::update($cardToken->id, $infoCardToken);
                                        }
                                    } else {
                                        $infoCardToken['username'] = $user->get_username();
                                        $infoCardToken['email'] = $user->get_email();
                                        $infoCardToken['user_id'] = $customer_id;
                                        $infoCardToken['woocommerce_reference_id'] = $reference_id;
                                        $cardToken = CardToken::create($infoCardToken);
                                    }
                                    if (!$cardToken) {
                                        global $wpdb;
                                        WC_Payment_Tokens::delete($token->get_id());
                                        $wpdb->show_errors();
                                        $table = CardToken::getTableName();
                                        $errorMessage = "La inscripción no se pudo registrar en la tabla: '$table', query: $wpdb->last_query, error: $wpdb->last_error";
                                        $this->logger->error($errorMessage);
                                        $this->logger->error('No se pudo registrar datos en la tabla: ' . $table . ', usuario: ' . $user->get_username() . ' - ' . $user->get_email() . ', order klap: ' . $order_id);
                                    } else {
                                        $this->logger->info('Tarjeta ' . $brand . ' - ' . $cardType . ' terminada en ' . $lastDigits . ' inscrita satisfactoriamente pata OneClick.');
                                    }
                                }
                            }
                        }
                    } catch (Exception $ex) {
                        $this->logger->error($ex->getMessage());
                    }
                } else {
                    $current = $orderEcommerce->get_status();
                    $paid = str_replace('wc-', '', $this->hp->getOrderStatusPaid());
                    $failed = str_replace('wc-', '', $this->hp->getOrderStatusFailed());
                    if (!$this->hp->compareStatus($current, $paid) && !$this->hp->compareStatus($current, $failed)) {
                        $orderEcommerce->update_status($this->hp->getOrderStatusFailed());
                        $this->logger->error('Pago rechazado o anulado usando [klap Checkout - ' . $payment_method . self::PARA_ORDEN . $reference_id . self::ORDERLOG . $order_id . self::FECHA . $paymentDate);
                    }
                }
                header('HTTP/1.1 200 OK');
                die();
            }
        } catch (Exception $ex) {
            $this->logger->error($ex->getMessage() . self::FECHA . $paymentDate . $ex->getMessage());
            header('HTTP/1.1 500 Internal Server Error');
            die();
        }
    }

    private function clean_text_order($text_to_clean)
    {
        return sanitize_text_field($text_to_clean);
    }

    /**
     *  Función que permite evaluar si una cadena empieza por string dado.
     *
     */
    protected function startsWith($string, $startString)
    {
        $len = strlen($startString);

        return (substr($string, 0, $len) === $startString);
    }

    protected function addOrderDetailsOnNotes(
            $message,
            $referenceId,
            $orderStatus,
            $amount,
            $paymentDate,
            $cardType,
            $brand,
            $nroCard,
            $quotasNumber,
            $quotasType,
            $paymentMethod,
            $mcCode,
            $orderId,
            WC_Order $orderEcommerce
    )
    {
        $amountFormatted = number_format($amount, 0, ',', '.');
        if ($paymentMethod != null) {
            $paymentMethod = '<strong>' . strtoupper($paymentMethod) . '</strong>';
        }
        $transactionDetails = "
            <div>
                <p><h3>$message</h3></p>

                <strong>Orden de compra: </strong>$referenceId <br />
                <strong>Estado del pedido: </strong>$orderStatus <br />
                <strong>Monto: </strong>$ $amountFormatted <br />
                <strong>Fecha:</strong> $paymentDate <br />
                <strong>Tipo de tarjeta: </strong>$cardType <br />
                <strong>Marca tarjeta: </strong>$brand <br />
                <strong>Tarjeta: </strong>$nroCard <br />
                <strong>Número de cuotas: </strong>$quotasNumber <br />
                <strong>Tipo de cuotas: </strong>$quotasType <br />
                <strong>Tipo de pago: </strong>$paymentMethod <br />
                <strong>MC Code: </strong>$mcCode <br />
                <strong>Order ID: </strong>$orderId <br />
            </div>
        ";
        $orderEcommerce->add_order_note($transactionDetails);
    }

    /**
     * Funcion que permite crear orden de registro de tarjeta.
     *
     */
    protected function createCardRegistrationOrder($referenceId)
    {
        try {

            if (!$referenceId) {
                throw new InvalidArgumentException('ReferenceId invalido.');
            }
            $orderRequest = new OrderRequest();
            $orderRequest->setReferenceId($referenceId);
            $orderRequest->addCustom(array('key' => 'tarjetas_expiration_minutes',
                    self::VALUE => $this->hp->getTarjetaExpirationMinutes()
            ));
            $webhookConfirm = $this->hp->getWebhookConfirm();
            $webhookReject = $this->hp->getWebhookReject();
            $orderRequest->setWebhooks(new Webhooks(null, $webhookConfirm, $webhookReject));
            $domain = wc_get_endpoint_url('payment-methods', '', get_permalink(get_option('woocommerce_myaccount_page_id')));
            $returnUrl = $domain;
            $cancelUrl = $domain;
            $orderRequest->setUrls(new Urls($returnUrl, $cancelUrl));
            //crea la orden en Klap
            try {
                $environment = $this->hp->getEnvironment();
                $apikey = $this->hp->getApiKey();
                PaymentsApiClient::setLogger($this->logger);
                $response = PaymentsApiClient::registerCard($environment, $apikey, $orderRequest);
            } catch (Exception $ex) {
                $this->logger->error('Error al crear la orden de resgistro de trajeta: ' . $ex->getMessage());
                $response = new Error('0', 'Error al crear la orden');
            }

            if ($response == null) {
                throw new InvalidArgumentException('Error al intentar conectar con Klap Checkout en resgistro de trajeta, sin respuesta. Por favor intenta más tarde.');
            }

            if (!($response instanceof OrderResponse)) {
                $this->logger->error(wp_json_encode($response));
                throw new InvalidArgumentException('Error en la respuesta de Klap Checkout en registro de tarjeta. Por favor intenta más tarde.');
            }

            if ($response->getRedirectUrl() == null) {
                throw new InvalidArgumentException('Error al intentar conectar con Klap Checkout en registro de tarjeta. Por favor intenta más tarde.');
            }
            wp_redirect($response->getRedirectUrl());
            die();
        } catch (Exception $ex) {
            $this->logger->error('[createCardRegistrationOrder] order: ' . $referenceId . ', error: ' . $ex->getMessage());
            wc_add_notice(__(self::ERROR, self::WOOTHEMES) . $ex->getMessage(), self::ERRORLOG);
            die();
        }
    }

    /**
     *
     *metodo que muestra detalle de confirmacion despues de realizar pago
     */
    protected function confirmationOrderPageBase($respHtml, $orderEcommerce, $plugin_name)
    {
        if ($orderEcommerce->get_payment_method() == $plugin_name) {

            $referenceId = $orderEcommerce->get_id();
            $amount = $this->getMetadataFromOrder($referenceId, self::AMOUNT);
            $orderId = $this->getMetadataFromOrder($referenceId, self::ORDER_ID);
            $selectMethod = $this->getMetadataFromOrder($referenceId, 'payment_method');
            $purchaseDate = $this->getMetadataFromOrder($referenceId, 'purchase_date');
            $paymentDate = $this->getMetadataFromOrder($referenceId, 'payment_date');
            $orderStatus = $orderEcommerce->get_status();

            //por defecto es orden con error
            $data =
                    '<tr>
            <td>Método de Pago:</td>
            <td>' . ($selectMethod != '' ? $selectMethod : 'Pendiente') . '</td>
          </tr>
          <tr>
            <td>Monto:</td>
            <td>$ ' . $amount . '</td>
          </tr>
          <tr>
            <td>Id de orden Woocommerce:</td>
            <td>' . $referenceId . '</td>
          </tr>
          <tr>
            <td>Id de orden Klap:</td>
            <td id="mcp-order-id">' . $orderId . '</td>
          </tr>
          <tr>
            <td>Fecha y hora de compra:</td>
            <td>' . $purchaseDate . '</td>
          </tr>';

            $style = 'background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; border-radius: 5px; padding: 10px;';

            $respHtml = self::ESTIMADO .
                    self::DETALLE .
                    self::STYLE . $style . '">Error en el pago</h3><table>' . $data . self::TABLE;

            //es orden pagada
            if ($this->hp->compareStatus($orderStatus, $this->hp->getOrderStatusPaid())) {

                $data = $data .
                        '<tr>
              <td>Fecha y hora de pago:</td>
              <td>' . $paymentDate . '</td>
            </tr>';

                $style = 'background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; border-radius: 5px; padding: 10px;';

                $respHtml = 'Estimado cliente, su orden ha sido recibida y pagada exitosamente' .
                        self::DETALLE .
                        self::STYLE . $style . '">Pago exitoso</h3><table>' . $data . self::TABLE;

                //es orden pendiente de pago
            } else if ($this->hp->compareStatus($orderStatus, $this->hp->getOrderStatusPendingPayment())) {

                $style = 'background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; border-radius: 5px; padding: 10px;';

                $refreshUrl = $this->hp->getReturnUrl() . '&referenceId=' . $referenceId . '&orderId=' . $orderId;

                $respHtml = 'Estimado cliente, su orden ha sido recibida, pero el pago se encuentra pendiente' .
                        self::DETALLE .
                        self::STYLE . $style . '">Orden pendiente de pago - <a href="' . $refreshUrl . '" style="color:#0747A6;">Actualizar Orden</a></h3>
          <table>' . $data . self::TABLE;
            }
        }

        return $respHtml;
    }

    /**
     * Retorna un metadato de la orden por su llave
     */
    private function getMetadataFromOrder($referenceId, $key)
    {
        $order = wc_get_order($referenceId);
        if ($order) {
            $value = $order->get_meta($key, true);
            return $value !== '' ? $value : '';
        }
        return '';
    }

    /**
     * Pre-process payment according to Woocommerce API.
     */
    protected function process_payment_base($referenceId)
    {
        $orderEcommerce = wc_get_order($referenceId);

        return array(
                'result' => 'success',
                'redirect' => $orderEcommerce->get_checkout_payment_url(true)
        );
    }

    /**
     * Activa o desactiva el plugin en funciona de ciertas reglas
     */
    protected function isValidForUse()
    {
        if (!$this->enabled || !$this->hp->isEnabledAndConfigured()) {
            return false;
        }

        //Solamente habilita el plugin si la moneda configurada de Woocommerce es el Peso chileno
        return get_woocommerce_currency() == 'CLP';
    }

    /**
     * Load the required dependencies for this plugin.
     *
     * Include the following files that make up the plugin:
     *
     * - KlapCheckoutLoader. Orchestrates the hooks of the plugin.
     * - KlapCheckoutI18n. Defines internationalization functionality.
     * - KlapCheckoutAdmin. Defines all hooks for the admin area.
     * - KlapCheckoutPublic. Defines all hooks for the public side of the site.
     */
    protected function loadDependencies()
    {

        $path = plugin_dir_path(dirname(__FILE__));

        /**
         * The class responsible for orchestrating the actions and filters of the core plugin.
         */
        require_once $path . 'plugin/klap_checkout_loader.php';

        $this->loader = new KlapCheckoutLoader();

        /**
         * The class responsible for defining all actions that occur in the admin area.
         */
        require_once $path . 'admin/klap_checkout_admin.php';

        $plugin_admin = new KlapCheckoutAdmin($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_styles');
        $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts');
        add_filter('plugin_action_links', array($this, 'add_action_links'), 10, 2);

        /**
         * The class responsible for defining all actions that occur in the public-facing side of the site.
         */
        require_once $path . 'public/klap_checkout_public.php';

        $plugin_public = new KlapCheckoutPublic($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_styles');
        $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_scripts');
    }

    /**
     * The name of the plugin used to uniquely identify it within the context of
     * WordPress and to define internationalization functionality.
     */
    public function get_plugin_name()
    {
        return $this->plugin_name;
    }

    /**
     * Retrieve the version number of the plugin.
     */
    public function get_version()
    {
        return $this->version;
    }

    /**
     * Crea las configuraciones de la seccion de administracion
     */
    protected function init_form_fields_base($method)
    {

        $status = wc_get_order_statuses();
        $webhooksDomain = $this->hp->getWebhooksDomain();

        $environments = array(
                'integration' => 'Integración',
                'production' => 'Producción'
        );

        if ($this->hp->isLocalDev()) {
            $local = array('local' => 'Local');
            $environments = array_merge($local, $environments);
        }

        $enable = array(
                'enabled' => array(
                        self::TYPE => 'checkbox',
                        self::TITLE => 'Activar / Desactivar método de pago',
                        self::DEFAULT_CONFIG => 'yes',
                        self::REQUIRED => true
                )
        );

        $inputs = array(
                'MCP_APIKEY_INTEGRATION' => array(
                        self::TYPE => 'text',
                        self::TITLE => 'ApiKey Integración',
                        self::REQUIRED => true,
                        self::DEFAULT_CONFIG => ''
                ),
                'MCP_APIKEY_PRODUCTION' => array(
                        self::TYPE => 'text',
                        self::TITLE => 'ApiKey Producción',
                        self::REQUIRED => true,
                        self::DEFAULT_CONFIG => ''
                ),
                'MCP_ENVIRONMENT' => array(
                        self::TYPE => self::SELECT,
                        self::TITLE => 'Ambiente',
                        self::REQUIRED => true,
                        self::DEFAULT_CONFIG => 0,
                        self::OPTIONS => $environments
                ),
                'MCP_STATUS_PENDIG_PAYMENT' => array(
                        self::TYPE => self::SELECT,
                        self::TITLE => 'Estado de orden por pagar',
                        self::REQUIRED => true,
                        self::DEFAULT_CONFIG => 'wc-pending',
                        self::OPTIONS => $status
                ),
                'MCP_STATUS_PAID' => array(
                        self::TYPE => self::SELECT,
                        self::TITLE => 'Estado de orden pagada exitosamente',
                        self::REQUIRED => true,
                        self::DEFAULT_CONFIG => 'wc-processing',
                        self::OPTIONS => $status
                ),
                'MCP_STATUS_FAILED' => array(
                        self::TYPE => self::SELECT,
                        self::TITLE => 'Estado de orden con error en el pago',
                        self::REQUIRED => true,
                        self::DEFAULT_CONFIG => 'wc-failed',
                        self::OPTIONS => $status
                ),
                'MCP_WEBHOOKS_DOMAIN' => array(
                        self::TYPE => 'text',
                        self::TITLE => 'Dominio de webhooks y redirección',
                        self::REQUIRED => true,
                        self::DEFAULT_CONFIG => $webhooksDomain
                ),
        );

        if ($this->hp->isLocalDev()) {
            $apiKeyLocal = array(
                    'MCP_APIKEY_LOCAL' => array(
                            self::TYPE => 'text',
                            self::TITLE => 'ApiKey Local',
                            self::DEFAULT_CONFIG => ''
                    )
            );
            $inputs = array_merge($apiKeyLocal, $inputs);
        }
        $this->form_fields = array_merge($enable, $inputs);
    }

    /**
     * Busca la orden y retorna la respuesta, metodo de pago seleccionado y datos del pago
     */
    private function getOrderData($orderId, $apikey, $environment)
    {

        //busca la orden en Klap
        try {
            PaymentsApiClient::setLogger($this->logger);
            $response = PaymentsApiClient::getOrder($environment, $apikey, $orderId);
        } catch (Exception $ex) {
            $this->logger->error('Error al obtener la orden: ' . $ex->getMessage());
            $response = new Error('1', 'Error al obtener la orden por id: ' . $orderId);
        }

        $amount = 0;
        $selectMethod = 'Error';
        $paymentDetails = 'Error';

        //obtiene el medio de pago seleccionado y los datos del pago
        if ($response instanceof OrderResponse && $response->getSelectedMethod() != null) {
            $selectMethod = $response->getSelectedMethod()->getName();
            $paymentDetails = wp_json_encode($response->getPaymentDetails());
            $amount = intval($response->getAmount()->getTotal());
        }

        return array(
                'response' => $response,
                self::AMOUNT => $amount,
                'selectMethod' => $selectMethod,
                'paymentDetails' => $paymentDetails
        );
    }
}

/**
 * Establece Chile como pais por defecto en la pantalla de checkout
 */

add_filter('default_checkout_billing_country', 'default_checkout_billing_country');
function default_checkout_billing_country()
{
    return 'CL'; // codigo de pais
}

/**
 * valida moneda Pesos chileno
 */
add_action('admin_notices', 'validate_currency');
function validate_currency()
{
    if (get_woocommerce_currency() != 'CLP') {
        ?>
        <div class="notice notice-error">
            <p><?php _e('Woocommerce debe estar configurado en pesos chilenos (CLP) para habilitar Klap Checkout', 'klap Checkout'); ?></p>
        </div>
        <?php
    }
}

/**
 * Validar formato del email
 */
add_action('woocommerce_checkout_process', 'custom_validate_billing_email');
function custom_validate_billing_email()
{
    $billing_email = isset($_POST['billing_email']) ? sanitize_email(wp_unslash($_POST['billing_email'])) : '';
    if (!empty($billing_email) && !is_email($billing_email)) {
        wc_add_notice(__('¡Correo inválido! <strong> Debes ingresar un correo válido.</strong>'), 'error');
    }
}

/**
 * Configura el peso chileno para el administrador de woocomerce
 */
add_filter('woocommerce_currencies', 'woocommerce_currencies');
function woocommerce_currencies($currencies)
{
    $currencies['CLP'] = __('Peso Chileno', 'woocommerce');

    return $currencies;
}

/**
 * Configura el simbolo del peso chileno para el administrador de woocomerce
 */

add_filter('woocommerce_currency_symbol', 'woocommerce_currency_symbol', 10, 2);
function woocommerce_currency_symbol($currency_symbol, $currency)
{
    if ($currency === 'CLP') {
        $currency_symbol = '$';
    }

    return $currency_symbol;
}
