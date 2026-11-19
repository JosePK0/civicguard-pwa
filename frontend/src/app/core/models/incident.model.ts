export type IncidentCategory =
  | 'bache_vial'
  | 'fuga_agua'
  | 'alumbrado_publico'
  | 'riesgo_electrico'
  | 'colapso_estructural'
  | 'otro';

export type IncidentSeverity = 'baja' | 'media' | 'alta' | 'critica';

export type IncidentStatus = 'pendiente' | 'en_revision' | 'en_proceso' | 'solucionado';

export type SyncState = 'pending_sync' | 'synced';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'supervisor' | 'operador' | string;
  department: string;
}

export interface AuthSession {
  id: string;
  token: string;
  user: AuthUser;
  logged_in_at: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy_meters: number;
}

export interface IncidentReport {
  id?: number;
  client_uuid: string;
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  photo_data?: string | null;
  status: IncidentStatus;
  sync_state?: SyncState;
  captured_offline_at?: string;
  synced_at?: string | null;
  created_at?: string;
}

export interface SwDiagnostics {
  supported: boolean;
  secureContext: boolean;
  registered: boolean;
  scope: string;
  state: string;
  cacheKeys: string[];
  cachedUrls: string[];
  indexedDbCount: number;
  pendingSyncCount: number;
  localStorageUsedBytes: number;
  pushPermission: string;
  vapidSubscribed: boolean;
}
