<?php

//carga todos las clases php
require_once(dirname(__FILE__) . '/utils/BasicLog.php');
require_once(dirname(__FILE__) . '/utils/ValidateParams.php');
require_once(dirname(__FILE__) . '/model/AmountDetails.php');
require_once(dirname(__FILE__) . '/model/Amount.php');
require_once(dirname(__FILE__) . '/model/User.php');
require_once(dirname(__FILE__) . '/model/Item.php');
require_once(dirname(__FILE__) . '/model/Custom.php');
require_once(dirname(__FILE__) . '/model/Urls.php');
require_once(dirname(__FILE__) . '/model/Webhooks.php');
require_once(dirname(__FILE__) . '/model/Method.php');
require_once(dirname(__FILE__) . '/model/Error.php');
require_once(dirname(__FILE__) . '/model/OrderRequest.php');
require_once(dirname(__FILE__) . '/model/OrderResponse.php');
require_once(dirname(__FILE__) . '/model/MerchantMethodsResponse.php');
require_once(dirname(__FILE__) . '/utils/PaymentsApiClient.php');
