<?php

namespace App\Services;

use App\Models\Incident;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class IncidentService
{
    /**
     * Lista todas las incidencias ordenadas de la más reciente a la más antigua.
     */
    public function listAll(): Collection
    {
        return Incident::query()
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();
    }

    /**
     * Sincroniza de forma idempotente un reporte proveniente de la PWA (directo o vía Background Sync).
     */
    public function syncOrStore(array $data): Incident
    {
        return Incident::query()->updateOrCreate(
            ['client_uuid' => $data['client_uuid']],
            [
                'title' => $data['title'],
                'category' => $data['category'],
                'severity' => $data['severity'] ?? 'media',
                'description' => $data['description'],
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'accuracy_meters' => $data['accuracy_meters'] ?? null,
                'photo_data' => $data['photo_data'] ?? null,
                'status' => $data['status'] ?? 'pendiente',
                'captured_offline_at' => isset($data['captured_offline_at'])
                    ? Carbon::parse($data['captured_offline_at'])
                    : now(),
                'synced_at' => now(),
            ]
        );
    }

    /**
     * Actualiza el estatus de una incidencia (ej. a 'solucionado' para disparar notificación Push en Semana 4).
     */
    public function updateStatus(Incident $incident, string $status): Incident
    {
        $incident->status = $status;
        if ($status === 'solucionado') {
            $incident->resolved_at = now();
        }
        $incident->save();

        return $incident;
    }
}
