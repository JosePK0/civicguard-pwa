<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->string('client_uuid', 64)->unique()->comment('UUID generado en IndexedDB para sincronización idempotente (Background Sync)');
            $table->string('title', 160);
            $table->string('category', 50)->index();
            $table->string('severity', 20)->default('media')->index();
            $table->text('description');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->float('accuracy_meters')->nullable();
            $table->longText('photo_data')->nullable()->comment('Evidencia visual capturada con API MediaDevices');
            $table->string('status', 30)->default('pendiente')->index();
            $table->timestamp('captured_offline_at')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
