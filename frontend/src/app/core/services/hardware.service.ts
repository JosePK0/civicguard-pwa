import { Injectable } from '@angular/core';
import { GeoCoordinates } from '../models/incident.model';

/**
 * SEMANA 3: Acceso controlado a elementos físicos del dispositivo móvil:
 * 1. API de Geolocalización (navigator.geolocation)
 * 2. API de Cámara (navigator.mediaDevices.getUserMedia)
 */
@Injectable({
  providedIn: 'root',
})
export class HardwareService {
  private activeStream: MediaStream | null = null;

  /**
   * Obtiene las coordenadas geográficas reales del operador mediante GPS / Red.
   */
  getCurrentCoordinates(): Promise<GeoCoordinates> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('La API de Geolocalización no está soportada en este navegador.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: Number(position.coords.latitude.toFixed(7)),
            longitude: Number(position.coords.longitude.toFixed(7)),
            accuracy_meters: Number(position.coords.accuracy.toFixed(1)),
          });
        },
        (error) => {
          reject(
            new Error(
              `No se pudo obtener GPS (${error.message}). Verifica permisos de ubicación y contexto seguro HTTPS.`
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Inicia el flujo de video de la cámara trasera/frontal del dispositivo.
   */
  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('La API MediaDevices (Cámara) requiere contexto seguro (HTTPS o localhost).');
    }

    this.stopCamera();

    this.activeStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    videoElement.srcObject = this.activeStream;
    await videoElement.play();
  }

  /**
   * Captura un fotograma en Base64 JPEG comprimido listo para almacenarse en IndexedDB.
   */
  capturePhotoFromVideo(videoElement: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto gráfico 2D.');
    }

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Estampa de agua con fecha/hora de evidencia forense urbana
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, canvas.height - 32, canvas.width, 32);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(
      `CivicGuard Evidencia • ${new Date().toLocaleString('es-MX')}`,
      12,
      canvas.height - 11
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    this.stopCamera();
    return dataUrl;
  }

  stopCamera(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = null;
    }
  }
}
