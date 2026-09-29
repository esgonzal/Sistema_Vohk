<?php

require_once(plugin_dir_path(__FILE__) .'../Exceptions/DatabaseException.php');

class CardToken
{
    const CARD_TOKEN_TABLE_NAME = 'klap_card_token';
    const STATUS_FAILED = 'failed';
    const STATUS_COMPLETED = 'completed';
    const STATUS_PENDING = 'pending';

    public static function getTableName()
    {
        global $wpdb;
        if (is_multisite()) {
            return $wpdb->base_prefix.static::CARD_TOKEN_TABLE_NAME;
        } else {
            return $wpdb->prefix.static::CARD_TOKEN_TABLE_NAME;
        }
    }

    public static function create(array $data)
    {
        global $wpdb;

        return $wpdb->insert(static::getTableName(), $data);
    }

    public static function update($cardTokenId, array $data)
    {
        global $wpdb;

        return $wpdb->update(static::getTableName(), $data, ['id' => $cardTokenId]);
    }

    public static function deleteByTokenId($tokenId)
    {
        global $wpdb;

        return $wpdb->delete(static::getTableName(), ['woocommerce_token_id' => $tokenId]);
    }

    public static function getCardTokenByUserIdAndLastDigitsAndBrandAndBin($userId, $lastDigits, $brand, $bin)
    {
      global $wpdb;
      $cardTokenTableName = static::getTableName();
      $query = "SELECT * FROM $cardTokenTableName WHERE user_id = %s AND last_digits = %s AND brand = %s AND bin = %s";
      $sql = $wpdb->prepare($query, array($userId, $lastDigits, $brand, $bin));
      $sqlResult = $wpdb->get_results($sql);
      return isset($sqlResult[0]) ? $sqlResult[0] : null;
    }

    public static function getCardTokenByReferenceId($wcReferenceId)
    {
      global $wpdb;
      $cardTokenTableName = static::getTableName();
      $query = "SELECT * FROM $cardTokenTableName WHERE woocommerce_reference_id = '%s'";
      $sql = $wpdb->prepare($query, $wcReferenceId);
      $sqlResult = $wpdb->get_results($sql);
      if (!is_array($sqlResult) || count($sqlResult) <= 0) {
        throw new DatabaseException("No se encontro CardToken con wcReferenceId: '{$wcReferenceId}'.");
    }

    return isset($sqlResult[0]) ? $sqlResult[0] : null;

    }

}
