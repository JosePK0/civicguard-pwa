<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\PushSubscriptionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json([
        'service' => 'CivicGuard API',
        'status' => 'online',
        'database' => config('database.default'),
        'http_cache_suppressed' => true,
        'timestamp' => now()->toIso8601String(),
    ]));

    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/incidents', [IncidentController::class, 'index']);
    Route::post('/incidents', [IncidentController::class, 'store']);
    Route::post('/incidents/sync-batch', [IncidentController::class, 'syncBatch']);
    Route::patch('/incidents/{incident}/status', [IncidentController::class, 'updateStatus']);

    Route::get('/push/vapid-public-key', [PushSubscriptionController::class, 'vapidPublicKey']);
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);
});
