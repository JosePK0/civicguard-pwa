<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Incident extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_uuid',
        'title',
        'category',
        'severity',
        'description',
        'latitude',
        'longitude',
        'accuracy_meters',
        'photo_data',
        'status',
        'captured_offline_at',
        'synced_at',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'accuracy_meters' => 'float',
            'captured_offline_at' => 'datetime',
            'synced_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }
}
