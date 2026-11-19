<?php

namespace Database\Seeders;

use App\Models\Incident;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@civicguard.gob.mx'],
            [
                'name' => 'Ing. Carlos Mendoza',
                'role' => 'supervisor',
                'department' => 'Centro de Control Urbano',
                'password' => 'Civic2026!',
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'operador@civicguard.gob.mx'],
            [
                'name' => 'Arq. Elena Vázquez',
                'role' => 'operador',
                'department' => 'Brigada de Infraestructura Vial',
                'password' => 'Civic2026!',
            ]
        );

        Incident::query()->updateOrCreate(
            ['client_uuid' => 'seed-utm-001'],
            [
                'title' => 'Hundimiento asfáltico y colapso de rejilla pluvial',
                'category' => 'bache_vial',
                'severity' => 'alta',
                'description' => 'Rejilla colapsada en carril central sobre avenida principal. Riesgo para vehículos y unidades de transporte.',
                'latitude' => 20.9415200,
                'longitude' => -89.6169800,
                'accuracy_meters' => 8.5,
                'status' => 'en_proceso',
                'captured_offline_at' => now()->subHours(3),
                'synced_at' => now()->subHours(2),
            ]
        );

        Incident::query()->updateOrCreate(
            ['client_uuid' => 'seed-utm-002'],
            [
                'title' => 'Luminaria pública en cortocircuito intermitente',
                'category' => 'alumbrado_publico',
                'severity' => 'critica',
                'description' => 'Poste metálico #402 presenta falla eléctrica tras lluvia intensa; sector sin iluminación nocturna.',
                'latitude' => 20.9673700,
                'longitude' => -89.6235400,
                'accuracy_meters' => 11.2,
                'status' => 'pendiente',
                'captured_offline_at' => now()->subHour(),
                'synced_at' => now()->subMinutes(45),
            ]
        );
    }
}
