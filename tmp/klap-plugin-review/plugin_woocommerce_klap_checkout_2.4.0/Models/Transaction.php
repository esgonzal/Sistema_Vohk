<?php

class Transaction
{
    const TRANSACTION_TABLE_NAME = 'klap_transaction';
    const STATUS_FAILED = 'failed';
    const STATUS_COMPLETED = 'completed';

    public static function getTableName()
    {
        global $wpdb;
        if (is_multisite()) {
            return $wpdb->base_prefix.static::TRANSACTION_TABLE_NAME;
        } else {
            return $wpdb->prefix.static::TRANSACTION_TABLE_NAME;
        }
    }

    public static function create(array $data)
    {
        global $wpdb;

        return $wpdb->insert(static::getTableName(), $data);
    }

    public static function update($transactionId, array $data)
    {
        global $wpdb;

        return $wpdb->update(static::getTableName(), $data, ['id' => $transactionId]);
    }
}
