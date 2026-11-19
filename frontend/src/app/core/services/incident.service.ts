import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IncidentReport, IncidentStatus } from '../models/incident.model';
import { IndexedDbService } from './indexed-db.service';
import { SwManagerService } from './sw-manager.service';

interface ApiListResponse {
  status: string;
  data: IncidentReport[];
}

interface ApiSingleResponse {
  status: string;
  data: IncidentReport;
  notification_payload?: {
    title: string;
    body: string;
  };
}

/**
 * SEMANA 3: Algoritmo de red resiliente (Network-First con fallback local a IndexedDB)
 * + Integración con Background Sync API y soporte para Simulación de Modo Avión.
 */
@Injectable({
  providedIn: 'root',
})
export class IncidentService {
  private readonly apiUrl = '/api/v1/incidents';
  simulatedAirplaneMode = false;

  constructor(
    private readonly http: HttpClient,
    private readonly idbService: IndexedDbService,
    private readonly swManager: SwManagerService
  ) {}

  get isEffectivelyOnline(): boolean {
    return navigator.onLine && !this.simulatedAirplaneMode;
  }

  /**
   * Obtiene incidencias aplicando Network-First con sincronización automática a IndexedDB.
   * En Modo Avión, retorna instantáneamente las incidencias retenidas en IndexedDB.
   */
  async loadIncidents(): Promise<{
    items: IncidentReport[];
    source: 'network-mysql' | 'indexeddb-offline';
  }> {
    if (this.isEffectivelyOnline) {
      try {
        await this.syncPendingManualFallback();

        const response = await firstValueFrom(this.http.get<ApiListResponse>(this.apiUrl));
        if (response && Array.isArray(response.data) && response.status !== 'offline_fallback') {
          const syncedItems: IncidentReport[] = response.data.map((item) => ({
            ...item,
            sync_state: 'synced',
          }));
          await this.idbService.saveMany(syncedItems);
          const allLocal = await this.idbService.getAllIncidents();
          return { items: allLocal, source: 'network-mysql' };
        }
      } catch {
        // Fallback silencioso a IndexedDB cuando el servidor no está alcanzable
      }
    }

    const offlineItems = await this.idbService.getAllIncidents();
    return { items: offlineItems, source: 'indexeddb-offline' };
  }

  /**
   * Registra una incidencia:
   * 1. Siempre la persiste primero de forma transaccional en IndexedDB.
   * 2. Si hay red, la envía a MySQL vía Laravel API y marca `synced`.
   * 3. Si está en Modo Avión, queda como `pending_sync` y registra la tarea en Background Sync API.
   */
  async createIncident(
    payload: Omit<IncidentReport, 'client_uuid' | 'status' | 'sync_state'>
  ): Promise<{
    report: IncidentReport;
    savedOffline: boolean;
  }> {
    const clientUuid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'cg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

    const draftReport: IncidentReport = {
      ...payload,
      client_uuid: clientUuid,
      status: 'pendiente',
      sync_state: 'pending_sync',
      captured_offline_at: new Date().toISOString(),
    };

    // 1. Retención inmediata en IndexedDB (Funciona 100% en Modo Avión)
    await this.idbService.saveIncident(draftReport);

    // 2. Intentar envío Network-First si hay conexión
    if (this.isEffectivelyOnline) {
      try {
        const res = await firstValueFrom(
          this.http.post<ApiSingleResponse>(this.apiUrl, draftReport)
        );
        if (res?.data) {
          const synced: IncidentReport = {
            ...draftReport,
            ...res.data,
            sync_state: 'synced',
          };
          await this.idbService.saveIncident(synced);
          return { report: synced, savedOffline: false };
        }
      } catch {
        // Si falla la red, pasa al bloque Background Sync
      }
    }

    // 3. Si estamos sin red (o en emulación Offline de DevTools), retener en IndexedDB
    // y registrar Background Sync cuando la interfaz de red esté disponible
    if (navigator.onLine) {
      await this.swManager.requestBackgroundSync();
    }
    return { report: draftReport, savedOffline: true };
  }

  /**
   * Sincroniza los reportes retenidos en IndexedDB cuando regresa la red.
   */
  async syncPendingManualFallback(): Promise<number> {
    const pending = await this.idbService.getPendingSyncIncidents();
    if (pending.length === 0 || !this.isEffectivelyOnline) {
      return 0;
    }

    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/sync-batch`, {
          incidents: pending,
        })
      );

      for (const item of pending) {
        await this.idbService.saveIncident({
          ...item,
          sync_state: 'synced',
          synced_at: new Date().toISOString(),
        });
      }
      return pending.length;
    } catch {
      return 0;
    }
  }

  /**
   * Actualiza el estatus de un reporte y dispara la Notificación Push nativa (Semana 4).
   */
  async updateIncidentStatus(
    incident: IncidentReport,
    status: IncidentStatus
  ): Promise<IncidentReport> {
    const updatedLocal: IncidentReport = {
      ...incident,
      status,
    };
    await this.idbService.saveIncident(updatedLocal);

    if (this.isEffectivelyOnline && incident.id) {
      try {
        const res = await firstValueFrom(
          this.http.patch<ApiSingleResponse>(`${this.apiUrl}/${incident.id}/status`, { status })
        );
        if (res?.notification_payload) {
          await this.swManager.triggerNativePushAlert(
            res.notification_payload.title,
            res.notification_payload.body
          );
        }
        return { ...updatedLocal, ...res.data, sync_state: 'synced' };
      } catch {
        // Mantener cambio local si falla la red
      }
    }

    if (status === 'solucionado') {
      await this.swManager.triggerNativePushAlert(
        '✅ CivicGuard: Reporte Solucionado',
        `La incidencia "${incident.title}" ha sido marcada como SOLUCIONADA.`
      );
    }

    return updatedLocal;
  }
}
