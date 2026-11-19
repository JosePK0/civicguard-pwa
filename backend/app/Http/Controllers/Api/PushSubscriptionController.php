<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function __construct(
        private readonly WebPushService $webPushService
    ) {}

    public function vapidPublicKey(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'publicKey' => $this->webPushService->getVapidPublicKey(),
            'subscribers_count' => PushSubscription::query()->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string', 'max:500'],
            'keys.p256dh' => ['nullable', 'string'],
            'keys.auth' => ['nullable', 'string'],
        ]);

        $subscription = PushSubscription::query()->updateOrCreate(
            ['endpoint' => $validated['endpoint']],
            [
                'public_key' => $validated['keys']['p256dh'] ?? null,
                'auth_token' => $validated['keys']['auth'] ?? null,
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]
        );

        return response()->json([
            'status' => 'subscribed',
            'message' => 'Suscripción Push VAPID registrada exitosamente en MySQL.',
            'data' => $subscription,
        ], 201);
    }
}
