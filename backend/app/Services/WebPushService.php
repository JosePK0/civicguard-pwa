<?php

namespace App\Services;

use App\Models\Incident;
use App\Models\PushSubscription;

/**
 * SEMANA 4: Servicio de Protocolo de Notificaciones Push (VAPID WebPush).
 * Gestiona las suscripciones Push de los operadores y construye las cargas útiles (payloads)
 * para alertar sobre reportes solucionados.
 */
class WebPushService
{
    public function getVapidPublicKey(): string
    {
        return (string) env(
            'VAPID_PUBLIC_KEY',
            'BJxWkHAnks8rhFmOTIIZ9fcX8RBi4ZvPVjf6IwFzxjy--zZeO4fNGuneovFGbCk53675X0GvTgGnGwG4XOkmB5g'
        );
    }

    public function buildStatusNotificationPayload(Incident $incident): array
    {
        $isResolved = $incident->status === 'solucionado';

        return [
            'title' => $isResolved
                ? '✅ CivicGuard: ¡Tu Reporte fue Solucionado!'
                : '🔔 CivicGuard: Actualización de Estatus',
            'body' => $isResolved
                ? "La incidencia \"{$incident->title}\" ha sido atendida y marcada como SOLUCIONADA por la cuadrilla urbana."
                : "El reporte \"{$incident->title}\" cambió al estado: " . strtoupper($incident->status),
            'icon' => '/icons/icon-192x192.png',
            'badge' => '/icons/icon-192x192.png',
            'tag' => "civicguard-incident-{$incident->client_uuid}",
            'incident_id' => $incident->id,
            'client_uuid' => $incident->client_uuid,
            'status' => $incident->status,
            'timestamp' => now()->toIso8601String(),
            'active_subscribers' => PushSubscription::query()->count(),
        ];
    }
}
