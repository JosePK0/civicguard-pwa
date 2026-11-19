<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreIncidentRequest;
use App\Models\Incident;
use App\Services\IncidentService;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidentController extends Controller
{
    public function __construct(
        private readonly IncidentService $incidentService,
        private readonly WebPushService $webPushService
    ) {}

    public function index(): JsonResponse
    {
        $incidents = $this->incidentService->listAll();

        return response()->json([
            'status' => 'ok',
            'architecture' => 'Headless PWA REST API',
            'count' => $incidents->count(),
            'data' => $incidents,
        ]);
    }

    public function store(StoreIncidentRequest $request): JsonResponse
    {
        $incident = $this->incidentService->syncOrStore($request->validated());

        return response()->json([
            'status' => 'synced',
            'message' => 'Incidencia registrada y sincronizada correctamente en MySQL.',
            'data' => $incident,
        ], 201);
    }

    public function syncBatch(Request $request): JsonResponse
    {
        $items = $request->validate([
            'incidents' => ['required', 'array', 'min:1'],
            'incidents.*.client_uuid' => ['required', 'string', 'max:64'],
            'incidents.*.title' => ['required', 'string', 'max:160'],
            'incidents.*.category' => ['required', 'string', 'max:50'],
            'incidents.*.severity' => ['required', 'string'],
            'incidents.*.description' => ['required', 'string'],
            'incidents.*.latitude' => ['required', 'numeric'],
            'incidents.*.longitude' => ['required', 'numeric'],
            'incidents.*.accuracy_meters' => ['nullable', 'numeric'],
            'incidents.*.photo_data' => ['nullable', 'string'],
            'incidents.*.captured_offline_at' => ['nullable', 'string'],
        ]);

        $synced = [];
        foreach ($items['incidents'] as $item) {
            $synced[] = $this->incidentService->syncOrStore($item);
        }

        return response()->json([
            'status' => 'batch_synced',
            'synced_count' => count($synced),
            'data' => $synced,
        ]);
    }

    public function updateStatus(Request $request, Incident $incident): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pendiente,en_revision,en_proceso,solucionado'],
        ]);

        $updated = $this->incidentService->updateStatus($incident, $validated['status']);
        $pushPayload = $this->webPushService->buildStatusNotificationPayload($updated);

        return response()->json([
            'status' => 'updated',
            'message' => "Estatus actualizado a {$updated->status}",
            'notification_payload' => $pushPayload,
            'data' => $updated,
        ]);
    }
}
