import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { SwDiagnostics } from '../models/incident.model';
import { IndexedDbService } from './indexed-db.service';

/**
 * SEMANA 2, 3 & 4:
 * Gestión del Ciclo de Vida del Service Worker (/sw.js),
 * inspección de Cache API, Background Sync API y Suscripción Web Push VAPID.
 */
@Injectable({
  providedIn: 'root',
})
export class SwManagerService {
  readonly syncCompleted$ = new Subject<number>();
  private registration: ServiceWorkerRegistration | null = null;
  private vapidSubscribed = false;

  constructor(
    private readonly idbService: IndexedDbService,
    private readonly http: HttpClient
  ) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'BACKGROUND_SYNC_COMPLETED') {
          this.syncCompleted$.next(event.data.syncedCount || 0);
        }
      });
    }
  }

  /**
   * Registra /sw.js en la raíz del proyecto para controlar el Scope global ("/").
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      // Limpiar cachés obsoletas v1.0.0 si existieran antes de activar v2.1.0
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          if (k.includes('v1.0.0')) {
            await caches.delete(k);
          }
        }
      }

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      await this.registration.update();
      return this.registration;
    } catch (error) {
      console.error('[CivicGuard] Error registrando Service Worker:', error);
      return null;
    }
  }

  /**
   * Registra una tarea en Background Sync API para enviar datos retenidos en IndexedDB.
   */
  async requestBackgroundSync(): Promise<boolean> {
    if (!this.registration && 'serviceWorker' in navigator) {
      this.registration = (await navigator.serviceWorker.ready) || null;
    }

    if (this.registration && 'sync' in this.registration) {
      try {
        await (
          this.registration as unknown as { sync: { register: (tag: string) => Promise<void> } }
        ).sync.register('civicguard-sync-incidents');
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Suscribe el navegador al protocolo Web Push con llaves VAPID del servidor Laravel (Semana 4).
   */
  async subscribeToVapidPush(): Promise<boolean> {
    try {
      if (!('Notification' in window)) return false;

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return false;

      const vapidRes = await firstValueFrom(
        this.http.get<{ publicKey: string }>('/api/v1/push/vapid-public-key')
      );

      const reg = this.registration || (await navigator.serviceWorker.ready);
      let sub = await reg.pushManager.getSubscription();

      if (!sub && vapidRes?.publicKey) {
        const appServerKey = this.urlBase64ToUint8Array(vapidRes.publicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
      }

      if (sub) {
        await firstValueFrom(this.http.post('/api/v1/push-subscriptions', sub.toJSON()));
      } else {
        // Fallback registro de suscripción lógica para entornos de desarrollo local
        await firstValueFrom(
          this.http.post('/api/v1/push-subscriptions', {
            endpoint: `${window.location.origin}/sw-push-client`,
            keys: { p256dh: 'local-pwa-client', auth: 'civicguard-utm' },
          })
        );
      }

      this.vapidSubscribed = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Solicita permiso y dispara una Notificación Push nativa a través del Service Worker.
   */
  async triggerNativePushAlert(title: string, body: string): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return false;
    }

    const reg = this.registration || (await navigator.serviceWorker.getRegistration());
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'civicguard-push-' + Date.now(),
      });
      return true;
    }

    new Notification(title, { body, icon: '/icons/icon-192x192.png' });
    return true;
  }

  async getDiagnostics(): Promise<SwDiagnostics> {
    const supported = 'serviceWorker' in navigator;
    const secureContext = window.isSecureContext;
    let registered = false;
    let scope = 'N/A';
    let state = 'No registrado';

    if (supported) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        registered = true;
        scope = reg.scope;
        if (reg.active) state = 'Activo (Controlling Scope + skipWaiting)';
        else if (reg.waiting) state = 'En espera (Waiting)';
        else if (reg.installing) state = 'Instalando (Installing)';
      }
    }

    const cacheKeys = 'caches' in window ? await caches.keys() : [];
    const cachedUrls: string[] = [];
    if ('caches' in window && cacheKeys.length > 0) {
      for (const key of cacheKeys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        for (const req of requests) {
          try {
            cachedUrls.push(new URL(req.url).pathname);
          } catch {
            cachedUrls.push(req.url);
          }
        }
      }
    }

    const allIdb = await this.idbService.getAllIncidents();
    const pending = allIdb.filter((i) => i.sync_state === 'pending_sync');

    return {
      supported,
      secureContext,
      registered,
      scope,
      state,
      cacheKeys,
      cachedUrls: Array.from(new Set(cachedUrls)),
      indexedDbCount: allIdb.length,
      pendingSyncCount: pending.length,
      localStorageUsedBytes: 0,
      pushPermission: 'Notification' in window ? Notification.permission : 'unsupported',
      vapidSubscribed: this.vapidSubscribed,
    };
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
