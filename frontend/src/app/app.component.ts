import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import {
  AuthUser,
  IncidentCategory,
  IncidentReport,
  IncidentSeverity,
  IncidentStatus,
} from './core/models/incident.model';
import { IncidentService } from './core/services/incident.service';
import { HardwareService } from './core/services/hardware.service';
import { SwManagerService } from './core/services/sw-manager.service';
import { AuthService } from './core/services/auth.service';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('cameraVideo') cameraVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('incidentMap') incidentMapRef?: ElementRef<HTMLDivElement>;

  // Autenticación
  currentUser: AuthUser | null = null;
  authMode: 'login' | 'register' = 'login';
  loginEmail = '';
  loginPassword = '';
  registerName = '';
  registerDepartment = 'Brigada de Infraestructura Vial';
  isAuthenticating = false;

  // Navegación principal
  activeView: 'dashboard' | 'create' = 'dashboard';
  searchQuery = '';
  statusFilter: 'todos' | IncidentStatus = 'todos';
  categoryFilter: 'todas' | IncidentCategory = 'todas';

  isOnline = navigator.onLine;
  deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

  isLoading = true;
  statusBanner = '';
  errorBanner = '';

  // Formulario de nueva incidencia urbana
  title = '';
  category: IncidentCategory = 'bache_vial';
  severity: IncidentSeverity = 'alta';
  description = '';
  latitude = 20.94152;
  longitude = -89.61698;
  accuracyMeters: number | null = 10.0;
  photoData: string | null = null;

  isCameraOpen = false;
  isLocatingGps = false;
  isSubmitting = false;

  // Georreferenciación por Mapa Interactivo y Buscador
  isMapOpen = true;
  mapSearchQuery = '';
  isSearchingLocation = false;
  mapSearchResults: NominatimSearchResult[] = [];
  selectedAddress = '';
  private leafletMap?: L.Map;
  private leafletMarker?: L.Marker;

  incidents: IncidentReport[] = [];

  private syncSub?: Subscription;
  private readonly onlineHandler = () => this.handleConnectivityChange(true);
  private readonly offlineHandler = () => this.handleConnectivityChange(false);
  private readonly beforeInstallHandler = (e: Event) => {
    e.preventDefault();
    this.deferredInstallPrompt = e as BeforeInstallPromptEvent;
  };

  constructor(
    private readonly authService: AuthService,
    private readonly incidentService: IncidentService,
    private readonly hardwareService: HardwareService,
    private readonly swManager: SwManagerService
  ) {}

  async ngOnInit(): Promise<void> {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    window.addEventListener('beforeinstallprompt', this.beforeInstallHandler);

    await this.swManager.registerServiceWorker();

    this.syncSub = this.swManager.syncCompleted$.subscribe(async (count) => {
      if (count > 0) {
        this.statusBanner = `Se sincronizaron ${count} reporte(s) pendiente(s) con el servidor central.`;
      }
      await this.refreshData();
    });

    this.currentUser = await this.authService.restoreSession();
    if (this.currentUser) {
      await this.refreshData();
    } else {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    window.removeEventListener('beforeinstallprompt', this.beforeInstallHandler);
    this.syncSub?.unsubscribe();
    this.hardwareService.stopCamera();
    this.destroyMap();
  }

  switchView(view: 'dashboard' | 'create'): void {
    this.activeView = view;
    if (view === 'create' && this.isMapOpen) {
      this.initOrUpdateMap();
    } else if (view === 'dashboard') {
      this.hardwareService.stopCamera();
      this.isCameraOpen = false;
    }
  }

  // ==========================================================================
  // AUTENTICACIÓN
  // ==========================================================================
  async submitAuth(): Promise<void> {
    this.errorBanner = '';
    this.isAuthenticating = true;
    try {
      if (this.authMode === 'login') {
        this.currentUser = await this.authService.login(
          this.loginEmail.trim(),
          this.loginPassword
        );
      } else {
        this.currentUser = await this.authService.register(
          this.registerName.trim(),
          this.loginEmail.trim(),
          this.loginPassword,
          this.registerDepartment.trim()
        );
      }
      this.loginPassword = '';
      await this.refreshData();
    } catch {
      this.errorBanner =
        'No fue posible iniciar sesión. Verifica tu correo y contraseña.';
    } finally {
      this.isAuthenticating = false;
    }
  }

  async quickDemoLogin(role: 'supervisor' | 'operador'): Promise<void> {
    this.loginEmail =
      role === 'supervisor'
        ? 'admin@civicguard.gob.mx'
        : 'operador@civicguard.gob.mx';
    this.loginPassword = 'Civic2026!';
    this.authMode = 'login';
    await this.submitAuth();
  }

  async logout(): Promise<void> {
    this.hardwareService.stopCamera();
    await this.authService.logout();
    this.currentUser = null;
    this.activeView = 'dashboard';
    this.statusBanner = '';
    this.errorBanner = '';
  }

  // ==========================================================================
  // MÉTRICAS Y FILTROS DEL TABLERO
  // ==========================================================================
  get filteredIncidents(): IncidentReport[] {
    return this.incidents.filter((item) => {
      const matchesStatus =
        this.statusFilter === 'todos' || item.status === this.statusFilter;
      const matchesCategory =
        this.categoryFilter === 'todas' || item.category === this.categoryFilter;
      const query = this.searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }

  get totalCriticalCount(): number {
    return this.incidents.filter(
      (i) => (i.severity === 'critica' || i.severity === 'alta') && i.status !== 'solucionado'
    ).length;
  }

  get inProgressCount(): number {
    return this.incidents.filter(
      (i) => i.status === 'en_proceso' || i.status === 'en_revision'
    ).length;
  }

  get resolvedCount(): number {
    return this.incidents.filter((i) => i.status === 'solucionado').length;
  }

  get pendingSyncCount(): number {
    return this.incidents.filter((i) => i.sync_state === 'pending_sync').length;
  }

  formatCategory(cat: IncidentCategory): string {
    const labels: Record<IncidentCategory, string> = {
      bache_vial: 'Vialidad y Pavimento',
      fuga_agua: 'Red Hidráulica y Drenaje',
      alumbrado_publico: 'Alumbrado Público',
      riesgo_electrico: 'Infraestructura Eléctrica',
      colapso_estructural: 'Riesgo Estructural',
      otro: 'Incidencia General',
    };
    return labels[cat] || cat;
  }

  formatStatus(status: IncidentStatus): string {
    const labels: Record<IncidentStatus, string> = {
      pendiente: 'Pendiente',
      en_revision: 'En Revisión',
      en_proceso: 'En Atención',
      solucionado: 'Solucionado',
    };
    return labels[status] || status;
  }

  // ==========================================================================
  // CONECTIVIDAD, HARDWARE Y OPERACIONES
  // ==========================================================================
  async promptInstallPwa(): Promise<void> {
    if (!this.deferredInstallPrompt) return;
    await this.deferredInstallPrompt.prompt();
    const choice = await this.deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      this.deferredInstallPrompt = null;
    }
  }

  private async handleConnectivityChange(online: boolean): Promise<void> {
    this.isOnline = online;
    if (online) {
      const syncedCount = await this.incidentService.syncPendingManualFallback();
      if (syncedCount > 0) {
        this.statusBanner = `Conexión restablecida: ${syncedCount} reporte(s) sincronizado(s) automáticamente.`;
      }
      await this.refreshData();
    } else {
      this.statusBanner =
        'Modo sin conexión activo. Los reportes que registres se guardarán localmente y se enviarán al recuperar señal.';
    }
  }

  async refreshData(): Promise<void> {
    this.isLoading = true;
    try {
      const result = await this.incidentService.loadIncidents();
      this.incidents = result.items;
    } finally {
      this.isLoading = false;
    }
  }

  async captureGpsLocation(): Promise<void> {
    this.isLocatingGps = true;
    this.errorBanner = '';
    try {
      const coords = await this.hardwareService.getCurrentCoordinates();
      this.latitude = coords.latitude;
      this.longitude = coords.longitude;
      this.accuracyMeters = coords.accuracy_meters;
      this.statusBanner = `Ubicación GPS actualizada (±${coords.accuracy_meters} m).`;
      this.syncMapPosition(this.latitude, this.longitude, 17);
      void this.reverseGeocode(this.latitude, this.longitude);
    } catch (err) {
      this.errorBanner = (err as Error).message;
    } finally {
      this.isLocatingGps = false;
    }
  }

  toggleMapPicker(): void {
    this.isMapOpen = !this.isMapOpen;
    if (this.isMapOpen) {
      this.initOrUpdateMap();
    } else {
      this.destroyMap();
    }
  }

  onManualCoordsChange(): void {
    const lat = Number(this.latitude);
    const lng = Number(this.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      this.syncMapPosition(lat, lng);
    }
  }

  async searchLocationOnMap(): Promise<void> {
    const query = this.mapSearchQuery.trim();
    if (!query) return;

    this.isSearchingLocation = true;
    this.errorBanner = '';
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query
      )}&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'es' },
      });
      if (!response.ok) {
        throw new Error('No se pudo conectar con el servicio de búsqueda cartográfica.');
      }
      const results = (await response.json()) as NominatimSearchResult[];
      this.mapSearchResults = results;

      if (results.length === 0) {
        this.errorBanner = 'No se encontraron ubicaciones para esa búsqueda. Intenta con otra referencia.';
      } else {
        this.selectSearchResult(results[0]);
      }
    } catch {
      this.errorBanner =
        'Sin conexión al buscador de direcciones. Aún puedes arrastrar el marcador en el mapa o ingresar coordenadas.';
    } finally {
      this.isSearchingLocation = false;
    }
  }

  selectSearchResult(item: NominatimSearchResult): void {
    const lat = Number(parseFloat(item.lat).toFixed(6));
    const lng = Number(parseFloat(item.lon).toFixed(6));
    this.latitude = lat;
    this.longitude = lng;
    this.selectedAddress = item.display_name;
    this.mapSearchResults = [];
    if (!this.isMapOpen) {
      this.isMapOpen = true;
      this.initOrUpdateMap();
    } else {
      this.syncMapPosition(lat, lng, 17);
    }
  }

  private initOrUpdateMap(): void {
    setTimeout(() => {
      const container = this.incidentMapRef?.nativeElement;
      if (!container) return;

      if (this.leafletMap && this.leafletMap.getContainer() !== container) {
        this.destroyMap();
      }

      if (!this.leafletMap) {
        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div class="pin-marker"><svg viewBox="0 0 24 24" width="32" height="32" fill="#059669" stroke="#ffffff" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3.5" fill="#ffffff"/></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        this.leafletMap = L.map(container, {
          center: [this.latitude, this.longitude],
          zoom: 16,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(this.leafletMap);

        this.leafletMarker = L.marker([this.latitude, this.longitude], {
          draggable: true,
          icon: customIcon,
        }).addTo(this.leafletMap);

        this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
          this.setCoordinatesFromMap(e.latlng.lat, e.latlng.lng);
        });

        this.leafletMarker.on('dragend', () => {
          const pos = this.leafletMarker?.getLatLng();
          if (pos) {
            this.setCoordinatesFromMap(pos.lat, pos.lng);
          }
        });

        setTimeout(() => {
          this.leafletMap?.invalidateSize();
        }, 120);
      } else {
        this.leafletMap.invalidateSize();
        this.syncMapPosition(this.latitude, this.longitude);
      }
    }, 60);
  }

  private setCoordinatesFromMap(lat: number, lng: number): void {
    this.latitude = Number(lat.toFixed(6));
    this.longitude = Number(lng.toFixed(6));
    this.leafletMarker?.setLatLng([this.latitude, this.longitude]);
    this.leafletMap?.panTo([this.latitude, this.longitude]);
    void this.reverseGeocode(this.latitude, this.longitude);
  }

  private syncMapPosition(lat: number, lng: number, zoom?: number): void {
    if (!this.leafletMap || !this.leafletMarker) return;
    this.leafletMarker.setLatLng([lat, lng]);
    this.leafletMap.setView([lat, lng], zoom ?? this.leafletMap.getZoom());
  }

  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    if (!navigator.onLine) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = (await res.json()) as { display_name?: string };
        if (data.display_name) {
          this.selectedAddress = data.display_name;
        }
      }
    } catch {
      // Silencioso en modo offline
    }
  }

  private destroyMap(): void {
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = undefined;
      this.leafletMarker = undefined;
    }
  }

  async toggleCamera(): Promise<void> {
    this.errorBanner = '';
    if (this.isCameraOpen) {
      this.hardwareService.stopCamera();
      this.isCameraOpen = false;
      return;
    }

    this.isCameraOpen = true;
    setTimeout(async () => {
      if (!this.cameraVideoRef?.nativeElement) return;
      try {
        await this.hardwareService.startCamera(this.cameraVideoRef.nativeElement);
      } catch (err) {
        this.isCameraOpen = false;
        this.errorBanner = (err as Error).message;
      }
    }, 50);
  }

  takeSnapshot(): void {
    if (!this.cameraVideoRef?.nativeElement) return;
    try {
      this.photoData = this.hardwareService.capturePhotoFromVideo(
        this.cameraVideoRef.nativeElement
      );
      this.isCameraOpen = false;
    } catch (err) {
      this.errorBanner = (err as Error).message;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoData = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async submitIncident(): Promise<void> {
    if (!this.title.trim() || !this.description.trim()) {
      this.errorBanner = 'Completa el título y la descripción de la incidencia.';
      return;
    }

    this.isSubmitting = true;
    this.errorBanner = '';
    try {
      const { savedOffline } = await this.incidentService.createIncident({
        title: this.title.trim(),
        category: this.category,
        severity: this.severity,
        description: this.description.trim(),
        latitude: Number(this.latitude),
        longitude: Number(this.longitude),
        accuracy_meters: this.accuracyMeters,
        photo_data: this.photoData,
      });

      this.title = '';
      this.description = '';
      this.photoData = null;
      this.mapSearchQuery = '';
      this.selectedAddress = '';
      this.mapSearchResults = [];
      this.destroyMap();
      this.switchView('dashboard');

      this.statusBanner = savedOffline
        ? 'Incidencia guardada en el dispositivo (Sin conexión). Se sincronizará automáticamente al detectar red.'
        : 'Incidencia registrada exitosamente.';

      await this.refreshData();
    } catch (err) {
      this.errorBanner = (err as Error).message;
    } finally {
      this.isSubmitting = false;
    }
  }

  async changeStatus(incident: IncidentReport, status: IncidentStatus): Promise<void> {
    await this.incidentService.updateIncidentStatus(incident, status);
    this.statusBanner = `El estado del reporte "${incident.title}" se actualizó a ${this.formatStatus(status)}.`;
    await this.refreshData();
  }

  async enableNotifications(): Promise<void> {
    await this.swManager.subscribeToVapidPush();
    const ok = await this.swManager.triggerNativePushAlert(
      'CivicGuard — Alertas Activas',
      'Recibirás notificaciones del sistema cuando los reportes de infraestructura sean atendidos.'
    );
    if (ok) {
      this.statusBanner = 'Notificaciones del sistema activadas correctamente.';
    } else {
      this.errorBanner = 'Debes permitir las notificaciones en tu navegador.';
    }
  }
}
