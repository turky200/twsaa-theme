<?php
$base = dirname(__DIR__);

if (isset($argv[1])) {
    $path = $argv[1];
    $needlesMap = [
        '/checkout/cart' => ['raqam-cart-page', 'raqam-theme.css'],
        '/customer/account/notifications' => ['raqam-account-page', 'raqam-ac-notifications'],
        '/customer/account/orders' => ['raqam-account-page', 'raqam-ac-orders'],
        '/customer/account/orders/view/1' => ['raqam-ac-order-view', 'raqam-order-view'],
        '/products' => ['raqam-listing-page', 'raqam-listing-grid'],
        '/testimonials' => ['raqam-testimonials-page', 'raqam-testimonials-grid'],
        '/n2-4-5-3' => ['raqam-product-page', 'raqam-theme.css'],
    ];
    $needles = $needlesMap[$path] ?? [];
    chdir($base);
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['REQUEST_URI'] = $path;
    ob_start();
    include $base . '/index.php';
    $html = ob_get_clean();
    $missing = array_filter($needles, fn ($n) => strpos($html, $n) === false);
    if (strlen($html) < 500 || $missing) {
        echo 'FAIL ' . $path . ' len=' . strlen($html) . ' missing=' . implode(',', $missing);
        exit(1);
    }
    echo 'OK ' . $path . ' len=' . strlen($html);
    exit(0);
}

$paths = [
    '/checkout/cart',
    '/customer/account/notifications',
    '/customer/account/orders',
    '/customer/account/orders/view/1',
    '/products',
    '/testimonials',
    '/n2-4-5-3',
];

$ok = true;
foreach ($paths as $path) {
    $cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__FILE__) . ' ' . escapeshellarg($path);
    $lines = [];
    exec($cmd, $lines, $code);
    echo implode(PHP_EOL, $lines) . PHP_EOL;
    if ($code !== 0) {
        $ok = false;
    }
}
exit($ok ? 0 : 1);
