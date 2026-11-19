<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_uuid' => ['required', 'string', 'max:64'],
            'title' => ['required', 'string', 'max:160'],
            'category' => ['required', 'string', 'max:50'],
            'severity' => ['required', 'string', 'in:baja,media,alta,critica'],
            'description' => ['required', 'string'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['nullable', 'numeric', 'min:0'],
            'photo_data' => ['nullable', 'string'],
            'captured_offline_at' => ['nullable', 'date'],
        ];
    }
}
