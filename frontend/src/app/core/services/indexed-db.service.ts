import { Injectable } from '@angular/core';
import { AuthSession, IncidentReport } from '../models/incident.model';

/**
 * Persistencia Local Asíncrona mediante IndexedDB transaccional.
 * Almacena tanto la cola de incidencias como la sesión activa del operador (cero localStorage).
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private readonly dbName = 'civicguard_pwa_db';
  private readonly dbVersion = 2;
  private readonly storeName = 'incidents';
  private readonly sessionStoreName = 'auth_session';

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'client_uuid',
          });
          store.createIndex('by_sync_state', 'sync_state', { unique: false });
        }
        if (!db.objectStoreNames.contains(this.sessionStoreName)) {
          db.createObjectStore(this.sessionStoreName, {
            keyPath: 'id',
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSession(session: AuthSession): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.sessionStoreName, 'readwrite');
      const store = tx.objectStore(this.sessionStoreName);
      store.put({ ...session, id: 'active_session' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSession(): Promise<AuthSession | null> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.sessionStoreName, 'readonly');
      const store = tx.objectStore(this.sessionStoreName);
      const req = store.get('active_session');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async clearSession(): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.sessionStoreName, 'readwrite');
      const store = tx.objectStore(this.sessionStoreName);
      store.delete('active_session');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveIncident(report: IncidentReport): Promise<IncidentReport> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put(report);
      tx.oncomplete = () => resolve(report);
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveMany(reports: IncidentReport[]): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      for (const item of reports) {
        store.put({
          ...item,
          sync_state: item.sync_state ?? 'synced',
        });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllIncidents(): Promise<IncidentReport[]> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: IncidentReport[] = req.result || [];
        items.sort((a, b) => {
          const dateA = a.captured_offline_at || a.created_at || '';
          const dateB = b.captured_offline_at || b.created_at || '';
          return dateB.localeCompare(dateA);
        });
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingSyncIncidents(): Promise<IncidentReport[]> {
    const all = await this.getAllIncidents();
    return all.filter((item) => item.sync_state === 'pending_sync');
  }
}
