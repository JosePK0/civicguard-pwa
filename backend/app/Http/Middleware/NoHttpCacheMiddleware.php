<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Semana 1: Supresión de cachés HTTP clásicas.
 * Garantiza que el almacenamiento en caché sea gobernado exclusivamente
 * por la Cache API e IndexedDB desde el Service Worker (sw.js).
 */
class NoHttpCacheMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', 'Sat, 01 Jan 2000 00:00:00 GMT');
        $response->headers->set('X-CivicGuard-Architecture', 'Headless-PWA-API');

        return $response;
    }
}
