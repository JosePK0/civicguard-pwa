<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CivicGuardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_semana_1_http_cache_suppression_headers_are_present(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'online')
            ->assertJsonPath('http_cache_suppressed', true);

        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('no-cache', $cacheControl);
        $this->assertStringContainsString('must-revalidate', $cacheControl);
        $this->assertEquals('Headless-PWA-API', $response->headers->get('X-CivicGuard-Architecture'));
    }

    public function test_semana_3_incident_creation_and_idempotent_background_sync_batch(): void
    {
        $payload = [
            'client_uuid' => 'offline-uuid-test-001',
            'title' => 'Fuga de agua en tubería matriz',
            'category' => 'fuga_agua',
            'severity' => 'alta',
            'description' => 'Fuga reportada en Modo Avión desde dispositivo móvil.',
            'latitude' => 20.9415200,
            'longitude' => -89.6169800,
            'accuracy_meters' => 6.4,
        ];

        $createRes = $this->postJson('/api/v1/incidents', $payload);
        $createRes->assertStatus(201)
            ->assertJsonPath('status', 'synced')
            ->assertJsonPath('data.client_uuid', 'offline-uuid-test-001');

        // Enviar lote Background Sync con el mismo UUID + uno nuevo para comprobar idempotencia
        $batchRes = $this->postJson('/api/v1/incidents/sync-batch', [
            'incidents' => [
                $payload,
                [
                    'client_uuid' => 'offline-uuid-test-002',
                    'title' => 'Luminaria caída en tormenta',
                    'category' => 'alumbrado_publico',
                    'severity' => 'critica',
                    'description' => 'Poste inclinado sobre banqueta peatonal.',
                    'latitude' => 20.9501000,
                    'longitude' => -89.6205000,
                ],
            ],
        ]);

        $batchRes->assertStatus(200)
            ->assertJsonPath('status', 'batch_synced')
            ->assertJsonPath('synced_count', 2);

        $listRes = $this->getJson('/api/v1/incidents');
        $listRes->assertStatus(200)
            ->assertJsonPath('count', 2);
    }

    public function test_semana_4_status_resolution_generates_push_notification_payload_and_vapid_subscription(): void
    {
        $createRes = $this->postJson('/api/v1/incidents', [
            'client_uuid' => 'offline-uuid-push-001',
            'title' => 'Bache profundo en cruce escolar',
            'category' => 'bache_vial',
            'severity' => 'alta',
            'description' => 'Riesgo vial frente a primaria.',
            'latitude' => 20.9420000,
            'longitude' => -89.6180000,
        ]);

        $incidentId = $createRes->json('data.id');

        $vapidRes = $this->getJson('/api/v1/push/vapid-public-key');
        $vapidRes->assertStatus(200)
            ->assertJsonStructure(['status', 'publicKey', 'subscribers_count']);

        $subRes = $this->postJson('/api/v1/push-subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-subscription-token-utm',
            'keys' => [
                'p256dh' => 'test-p256dh-key',
                'auth' => 'test-auth-token',
            ],
        ]);
        $subRes->assertStatus(201)
            ->assertJsonPath('status', 'subscribed');

        $patchRes = $this->patchJson("/api/v1/incidents/{$incidentId}/status", [
            'status' => 'solucionado',
        ]);

        $patchRes->assertStatus(200)
            ->assertJsonPath('status', 'updated')
            ->assertJsonPath('data.status', 'solucionado')
            ->assertJsonPath('notification_payload.status', 'solucionado');
    }

    public function test_corporate_authentication_login_and_register(): void
    {
        $regRes = $this->postJson('/api/v1/auth/register', [
            'name' => 'Ing. Laura Gómez',
            'email' => 'laura@civicguard.gob.mx',
            'password' => 'Civic2026!',
            'department' => 'Brigada Hidráulica',
        ]);

        $regRes->assertStatus(201)
            ->assertJsonPath('status', 'registered')
            ->assertJsonPath('user.email', 'laura@civicguard.gob.mx');

        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'laura@civicguard.gob.mx',
            'password' => 'Civic2026!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonPath('status', 'authenticated')
            ->assertJsonStructure(['token', 'user']);
    }
}
