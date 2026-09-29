<?php

class WC_Payment_Token_OneClick_Klap extends WC_Payment_Token
{
  protected $type = 'OneClick_Klap';

  protected $extra_data = [
    'last4'  =>       '',
    'username'     => '',
    'email'        => '',
    'card_type'    => '',
    'brand'        => '',
    'bin'          => '',
    'type_card'         => ''

  ];

  /**
   * Get type to display to user.
   *
   * @since  2.6.0
   *
   * @param string $deprecated Deprecated since WooCommerce 3.0.
   *
   * @return string
   */
  public function get_display_name($deprecated = '')
  {
    return $this->get_card_type().' - '. $this->get_type_card().' terminada en **** '.$this->get_last4();
  }

  public function validate()
  {
    if (false === parent::validate()) {
      return false;
    }
    if (!$this->get_last4()) {
      return false;
    }

    if (!$this->get_card_type()) {
      return false;
    }

    if (!$this->get_username()) {
      return false;
    }

    if (!$this->get_email()) {
      return false;
    }

    if (!$this->get_brand()) {
      return false;
    }

    if (!$this->get_bin()) {
      return false;
    }

    if (!$this->get_type_card()) {
      return false;
    }


    return true;
  }

  /**
   * Hook prefix.
   *
   * @since 3.0.0
   */
  protected function get_hook_prefix()
  {
    return 'woocommerce_payment_token_oneclick_get_';
  }

  /**
   * Returns the card type (debit, credit).
   *
   * @since  2.6.0
   *
   * @param string $context What the value is for. Valid values are view and edit.
   *
   * @return string Card type
   */
  public function get_card_type($context = 'view')
  {
    return $this->get_prop('card_type', $context);
  }

  /**
   * Set the card type (debit, credit).
   *
   * @since 2.6.0
   *
   * @param string $type Credit card type (DEBIT, CREDIT).
   */
  public function set_card_type($type)
  {
    $this->set_prop('card_type', $type);
  }

  /**
   * Returns the last four digits.
   *
   * @since  2.6.0
   *
   * @param string $context What the value is for. Valid values are view and edit.
   *
   * @return string Last digits
   */
  public function get_last4($context = 'view')
  {
    return $this->get_prop('last4', $context);
  }

  /**
   * Set the last four digits.
   *
   * @since 2.6.0
   *
   * @param string $last4 Credit card last four digits.
   */
  public function set_last4($last4)
  {
    $this->set_prop('last4', $last4);
  }

  /**
   * Returns username.
   *
   * @since  2.6.0
   *
   * @param string $context What the value is for. Valid values are view and edit.
   *
   * @return string user name
   */
  public function get_username($context = 'view')
  {
    return $this->get_prop('username', $context);
  }

  /**
   * Set username.
   *
   * @since 2.6.0
   *
   * @param string $username user name.
   */
  public function set_username($username)
  {
    $this->set_prop('username', $username);
  }


  /**
   * Returns email.
   *
   * @since  2.6.0
   *
   * @param string $context What the value is for. Valid values are view and edit.
   *
   * @return string email
   */
  public function get_email($context = 'view')
  {
    return $this->get_prop('email', $context);
  }

  /**
   * Set email.
   *
   * @since 2.6.0
   *
   * @param string $email email.
   */
  public function set_email($email)
  {
    $this->set_prop('email', $email);
  }


  /**
   * Returns brand.
   *
   * @since  2.6.0
   *
   * @param string $context What the value is for. Valid values are view and edit.
   *
   * @return string brand
   */
  public function get_brand($context = 'view')
  {
    return $this->get_prop('brand', $context);
  }

  /**
   * Set brand.
   *
   * @since 2.6.0
   *
   * @param string $brand brand.
   */
  public function set_brand($brand)
  {
    $this->set_prop('brand', $brand);
  }

  /**
   * Returns bin.
   *
   * @since  2.6.0
   *
   * @param string $context What the value is for. Valid values are view and edit.
   *
   * @return string bin
   */
  public function get_bin($context = 'view')
  {
    return $this->get_prop('bin', $context);
  }

  /**
   * Set bin.
   *
   * @since 2.6.0
   *
   * @param string $bin bin.
   */
  public function set_bin($bin)
  {
    $this->set_prop('bin', $bin);
  }

  /**
   * Returns type.
   *
   * @since  2.6.0
   *
   * @param string $context What the value is for. Valid values are view and edit.
   *
   * @return string type
   */
  public function get_type_card($context = 'view')
  {
    return $this->get_prop('type_card', $context);
  }

  /**
   * Set type_card.
   *
   * @since 2.6.0
   *
   * @param string $type_card.
   */
  public function set_type_card($type_card)
  {
    $this->set_prop('type_card', $type_card);
  }
}
