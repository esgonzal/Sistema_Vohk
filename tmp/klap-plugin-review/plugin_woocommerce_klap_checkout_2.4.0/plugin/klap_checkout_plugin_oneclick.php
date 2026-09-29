<?php
if ( ! defined( 'ABSPATH' ) ) {
  exit;
}

require_once( plugin_dir_path( __FILE__ ) . 'klap_checkout_plugin_base.php' );

use Klap\WooCommerce\Helpers\DatabaseInstaller;

class KlapCheckoutPluginOneclick extends KlapCheckoutPluginBase {

  /**
   * construct plugin tarjetas.
   */
  public function __construct() {
    parent::loadDependencies();
    $this->supports           = [
      'tokenization',
      'products'
    ];
    $this->id                 = 'klap_checkout_oneclick';
    $this->version            = MCP_PLUGIN_VERSION;
    $this->plugin_name        = 'klap_checkout_oneclick';
    $this->icon               = apply_filters( 'woocommerce_KlapCheckout_icon', plugin_dir_url( dirname( __FILE__ ) ) . 'public/images/tarjetas-klap.png' );
    $this->has_fields         = false;
    $this->title              = 'Klap Checkout OneClick';
    $this->method_title       = $this->title;
    $this->method_description = 'Permite agregar tarjetas de crédito, débito y/o prepago (Visa y Mastercard) y pagar rápidamente a tráves de Klap Ckeckout Oneclick.';
    $this->description        = 'Agrega tu tarjeta de crédito, débito y/o prepago (Visa y Mastercard) y podrás pagar rápidamente con tan solo un click a tráves de Klap Checkout Oneclick.';
    parent::initContent( $this );
    // carga las configuraciones
    $this->init_settings();
    $this->init_form_fields();
    if ( ! parent::isValidForUse() ) {
      $this->enabled = false;
    }

    add_filter( 'woocommerce_payment_methods_list_item', [ $this, 'methods_list_item_oneclick' ], null, 2 );
    add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, [ $this, 'process_admin_options' ] );
    add_action( 'woocommerce_payment_token_deleted', [ $this, 'woocommerce_payment_token_deleted' ], 10, 2 );
  }

  /**
   * Crea las configuraciones de la seccion de administracion
   */
  public function init_form_fields() {
    parent::init_form_fields_base( self::ONECLICK );
  }

  /**
   * Permite agregar los ultimos digitos y la marca de la tarjeta en seccion Payment methods
   */
  public function methods_list_item_oneclick( $item, $payment_token ) {

    $item['method']['last4'] = $payment_token->get_last4();
    $item['method']['brand'] = 'Registrada en KLAP ' . $payment_token->get_card_type();

    return $item;
  }

  public function payment_fields() {
    $display_tokenization = $this->supports( 'tokenization' ) && is_checkout();
    $description          = $this->get_description();

    echo apply_filters( 'wc_stripe_description', wpautop( wp_kses_post( $description ) ), $this->id );

    if ( $display_tokenization ) {
      $this->tokenization_script();
      $this->saved_payment_methods();
    }

    if ( apply_filters( 'wc_stripe_display_save_payment_method_checkbox', $display_tokenization ) && ! is_add_payment_method_page() && ! isset( $_GET['change_payment_method'] ) ) {

      $this->save_payment_method_checkbox();
    }

    do_action( 'wc_stripe_payment_fields_stripe', $this->id );
  }

  /**
   * Outputs a checkbox for saving a new payment method to the database.
   * Permite verificar si tiene mas de tres tokens un usuario, no mostrar mensaje.
   * @since 2.6.0
   */
  public function save_payment_method_checkbox() {
    $customer_id = get_current_user_id();
    $tokens      = WC_Payment_Tokens::get_customer_tokens( $customer_id, 'klap_checkout_oneclick' );
    if ( count( $tokens ) < 3 ) {
      echo '<p class="form-row woocommerce-SavedPaymentMethods-saveNew"><strong>Esta tarjeta se guardará en tu cuenta para que puedas volver a usarla.</strong></p>';
    }
  }

  /**
   * Controlador del callback invocado por Klap Checkout
   **/
  public function callbackHandler() {
    parent::callbackHandlerBase();
  }

  /**
   * Permite agregar nueva tarjeta desde administrador de tarjetas woocommerce.
   *
   */
  public function add_payment_method() {
    $user        = wp_get_current_user();
    $referenceId = 'RT-' . $user->ID . '-' . uniqid();
    $insert      = CardToken::create( [
      'username'                 => $user->user_login,
      'email'                    => $user->user_email,
      'user_id'                  => $user->ID,
      'status'                   => CardToken::STATUS_PENDING,
      'woocommerce_reference_id' => $referenceId
    ] );

    if ( ! $insert ) {
      global $wpdb;
      $table = CardToken::getTableName();
      $wpdb->show_errors();
      $errorMessage = "No se pudo iniciar el registro de tarjeta en la tabla: '$table', query: $wpdb->last_query, error: $wpdb->last_error";
      wc_add_notice( __(
        'Klap Checkout Oneclick: No se pudo iniciar el registro de tarjeta.',
        'klap_checkout_oneclick_plugin'
      ), 'error' );
      $this->logger->error( $errorMessage );
      return [
        'result' => 'error',
      ];
    }

    return parent::createCardRegistrationOrder( $referenceId );
  }

  /**
   * Delete token from Klap.
   *
   */
  public function woocommerce_payment_token_deleted( $token ) {
    $user = wp_get_current_user();
    if ( $token->get_gateway_id() == 'klap_checkout_oneclick' && $token->get_user_id() == $user->ID ) {
      $delete = CardToken::deleteByTokenId( $token->get_id() );
      if ( ! $delete ) {
        global $wpdb;
        $table = CardToken::getTableName();
        $wpdb->show_errors();
        $errorMessage = "No se pudo iniciar la eliminacion de token de tarjeta en la tabla: '{$table}', query: {$wpdb->last_query}, error: {$wpdb->last_error}";
        $this->logger->error( $errorMessage );
        wc_add_notice( __(
          'Klap Checkout Oneclick: No se pudo iniciar la eliminacion de tarjeta.',
          'klap_checkout_oneclick_plugin'
        ), 'error' );

        return [
          'result' => 'error',
        ];
      }
      //\WC_Payment_Tokens::delete($token->get_id());
    }
  }

  /**
   * Pre-process payment according to Woocommerce API.
   * Permite realizar un pago con registro o un pago con token guardado
   */
  public function process_payment( $referenceId ) {
    $paymentMethodOption = isset( $_POST["wc-{$this->id}-payment-token"] ) ? $_POST["wc-{$this->id}-payment-token"] : null;
    $addNewCard          = 'new' === $paymentMethodOption || $paymentMethodOption === null;

    if ( ! get_current_user_id() ) {
      $this->logger->error( 'Klap Checkout: El usuario debe tener una cuenta para agregar una nueva tarjeta con oneclick Klap. ' );
      wc_add_notice( __(
        'Klap Checkout Oneclick: Debes crear o tener una cuenta en el sitio para poder inscribir tu tarjeta y usar este método de pago.',
        'klap_checkout_oneclick_plugin'
      ), 'error' );

      return [
        'result' => 'error',
      ];
    }
    if ( $addNewCard ) {
      $this->logger->info( '[Oneclick] Se inicia pago con registro de tarjetas.' );

      return parent::process_payment_base( $referenceId );
    } else {
      $this->logger->info( '[Oneclick] Se inicia pago con token registrado.' );
      // token_id de base de datos
      $token_id = wc_clean( $paymentMethodOption );
      //token de klap
      $token = WC_Payment_Tokens::get( $token_id );
      if ( $token->get_user_id() !== get_current_user_id() ) {
        $this->logger->error( '[Oneclick] La información no concuerda al realizar el pago con el tokenId #' . $token_id );

        return wc_add_notice( __(
          'Klap Checkout Oneclick: Ocurrió un error al hacer pago con Oneclick. Por favor intenta mas tarde.<br/>',
          'klap_checkout_oneclick_plugin'
        ), 'error' );
      }

      $tokenKlap = $token->get_token();
      $this->logger->info( '[Oneclick] Pago con token ID ' . $token->get_id() );
      $orderEcommerce = wc_get_order( $referenceId );
      try {
        $this->createOrder( $referenceId, $tokenKlap );

        return [
          'result'   => 'success',
          'redirect' => $orderEcommerce->get_checkout_order_received_url()
        ];
      } catch ( Exception $ex ) {
        $this->logger->error( "[Oneclick] Error pago oneClick - " . $ex->getMessage() );
      }
    }
  }

  /**
   * Se crea la orden en Klap mediante el api
   **/
  public function createOrder( $referenceId, $tokenId = null ) {
    parent::createOrderBase( $referenceId, self::ONECLICK, $tokenId );
  }

  /**
   * Crea la pagina resultado del pago
   */
  public function confirmationOrderPage( $respHtml, $orderEcommerce ) {
    return parent::confirmationOrderPageBase( $respHtml, $orderEcommerce, $this->plugin_name );
  }
}
