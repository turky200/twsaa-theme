<?php

/**
 * Base path helpers for local XAMPP / subfolder deployment.
 * Example: http://localhost/قالب-منصة%20توسع/sky-theme-main/
 */
function theme_normalize_path(string $path): string
{
    $path = str_replace('\\', '/', rawurldecode($path));
    $path = '/' . ltrim($path, '/');

    if ($path !== '/' && str_ends_with($path, '/')) {
        $path = rtrim($path, '/');
    }

    return $path === '' ? '/' : $path;
}

function theme_base_path(): string
{
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
    $base = rtrim(dirname(theme_normalize_path($scriptName)), '/');

    if ($base === '.' || $base === '/') {
        return '';
    }

    return $base;
}

function theme_request_path(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $uri = theme_normalize_path($uri);
    $base = theme_base_path();

    if ($base !== '' && str_starts_with($uri, $base)) {
        $uri = substr($uri, strlen($base)) ?: '/';
    }

    return theme_normalize_path($uri);
}
