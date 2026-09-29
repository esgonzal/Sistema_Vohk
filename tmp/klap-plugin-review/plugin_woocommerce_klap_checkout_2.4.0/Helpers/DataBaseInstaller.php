<?php


require_once(plugin_dir_path(__FILE__) . '../Models/CardToken.php');
require_once(plugin_dir_path(__FILE__) . '../Models/Transaction.php');
require_once(plugin_dir_path(__FILE__) .'../plugin/CustomLog.php');

class DataBaseInstaller
{
    const TABLE_VERSION_OPTION_KEY = 'klap_table_version';
    const LATEST_TABLE_VERSION = 1;

    public static function isUpgraded()
    {
        $version = (int) get_site_option(static::TABLE_VERSION_OPTION_KEY, 0);
        if ($version >= static::LATEST_TABLE_VERSION) {
            return true;
        }

        return false;
    }

    public static function install()
    {
        return static::createTables();
    }

    public static function createTableCardToken()
    {
        global $wpdb;
        require_once ABSPATH.'wp-admin/includes/upgrade.php';
        $charset_collate = $wpdb->get_charset_collate();

        $cardTokenTableName = CardToken::getTableName();
        $sql = "CREATE TABLE IF NOT EXISTS `{$cardTokenTableName}` (
            `id` bigint(20) NOT NULL AUTO_INCREMENT,
            `klap_token` varchar(100),
            `username` varchar(100)  NOT NULL,
            `email` varchar(50) NOT NULL,
            `user_id` bigint(50),
            `woocommerce_token_id` bigint(50),
            `woocommerce_reference_id` varchar(50),
            `card_type` varchar(20),
            `bin` varchar(10),
            `last_digits` varchar(10),
            `brand` varchar(20),
            `status` varchar(50) NOT NULL,
            `created_at` TIMESTAMP NOT NULL  DEFAULT NOW(),
            PRIMARY KEY (id)
        ) DEFAULT CHARSET=utf8; $charset_collate";

        dbDelta($sql);

        $success = empty($wpdb->last_error);
        if (!$success) {
            $log = new CustomLog();
            $log->error('Error creating table: '.$cardTokenTableName);
            $log->error($wpdb->last_error);
            add_settings_error('klap_card_token_table_error', '', 'Klap: Error creando tabla card_token: '.$wpdb->last_error, 'error');
            settings_errors('klap_card_token_table_error');
        }

        return $success;
    }

    public static function createTableTransaction()
    {
        global $wpdb;
        require_once ABSPATH.'wp-admin/includes/upgrade.php';
        $charset_collate = $wpdb->get_charset_collate();

        $transactionTableName = Transaction::getTableName();
        $sql = "CREATE TABLE IF NOT EXISTS `{$transactionTableName}` (
            `id` bigint(20) NOT NULL AUTO_INCREMENT,
            `cart_id` varchar(100) NOT NULL,
            `pedido_id` varchar(100),
            `mc_code` varchar(100),
            `order_id` varchar(100),
            `amount` bigint(20) NOT NULL,
            `status` varchar(50) NOT NULL,
            `klap_data` TEXT,
            `created_at` TIMESTAMP NOT NULL  DEFAULT NOW(),
            PRIMARY KEY (id)
        ) DEFAULT CHARSET=utf8; $charset_collate";

        dbDelta($sql);

        $success = empty($wpdb->last_error);
        if (!$success) {
            $log = new CustomLog();
            $log->error('Error creating table: '.$transactionTableName);
            $log->error($wpdb->last_error);

            add_settings_error('klap_transaction_table_error', '', 'Klap: Error creando tabla transaction: '.$wpdb->last_error, 'error');
            settings_errors('klap_transaction_table_error');
        }

        return $success;
    }

    public static function createTables()
    {
      $successCreateTableCardToken = static::createTableCardToken();
      $successcreateTableTransaction = static::createTableTransaction();
      if ($successCreateTableCardToken && $successcreateTableTransaction) {
          update_site_option(static::TABLE_VERSION_OPTION_KEY, static::LATEST_TABLE_VERSION);
      }

      return $successCreateTableCardToken && $successcreateTableTransaction;
    }

    public static function createTableIfRequired()
    {
      if (!static::isUpgraded()) {
          return static::install();
      }
      return null;
    }
}
