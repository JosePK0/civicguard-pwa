# 🛡️ CivicGuard PWA — Sistema de Gestión de Emergencias e Incidencias en Infraestructura Urbana

**Universidad Tecnológica Metropolitana (UTM)** — *Proyecto Integrador 2 (Ingeniería en Desarrollo y Gestión de Software)*

---

## 🏛️ Arquitectura de Software Implementada

El proyecto implementa una **Arquitectura Web Progresiva (PWA) Desacoplada (Headless)** basada en **Clean Architecture / Separación de Responsabilidades**:

```text
awp-p/
├── docs/                                         # Documentación técnica y entregables por semana
│   ├── semana-1-arquitectura-comparativa.md      # Matriz comparativa y justificación de arquitectura
│   └── semana-1-reporte-entorno.md               # Bitácora de puertos, supresión de caché HTTP y TLS/ngrok
├── docker-compose.yml                            # Respaldo reproducible de MySQL 8.0 + phpMyAdmin
├── backend/                                      # API REST Headless en Laravel + MySQL (Puerto 8000)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/                  # Controladores delgados RESTful (/api/v1/*)
│   │   │   ├── Middleware/NoHttpCacheMiddleware.php # Supresión de caché HTTP clásica (Semana 1)
│   │   │   └── Requests/StoreIncidentRequest.php # Capa de validación estricta (FormRequests)
│   │   ├── Models/                               # Modelos Eloquent (Incident, PushSubscription)
│   │   └── Services/IncidentService.php          # Capa de Lógica de Negocio e Idempotencia Offline
│   └── database/migrations/                      # Esquema relacional en MySQL (civicguard_db)
└── frontend/                                     # Front-End Autónomo en Angular SPA + PWA (Puerto 4200)
    ├── public/
    │   ├── manifest.json                         # Web App Manifest + Maskable Icons + Splash Config
    │   ├── sw.js                                 # Service Worker Nativo (install, activate, skipWaiting, fetch, sync, push)
    │   └── icons/                                # Recursos visuales adaptativos (192x192, 512x512, maskable)
    └── src/
        ├── index.html                            # Application Shell inmutable + Placeholders estáticos (Renderizado Mixto)
        └── app/
            ├── core/
            │   ├── models/incident.model.ts      # Contratos de dominio en TypeScript estricto
            │   └── services/
            │       ├── indexed-db.service.ts     # Persistencia asíncrona en IndexedDB (Cero localStorage)
            │       ├── hardware.service.ts       # Geolocalización GPS + Cámara (MediaDevices API)
            │       ├── sync.service.ts           # Estrategia Network-First + Background Sync API
            │       └── sw-manager.service.ts     # Gestión del ciclo de vida del Service Worker y Push Notifications
            ├── layout/                           # Componentes inmutables del Application Shell
            └── features/                         # Módulos operativos de captura y monitoreo de incidencias
```

---

## ⚙️ Configuración de Base de Datos (MySQL / MariaDB)

La base de datos MySQL local ya está configurada y migrada en el equipo:
- **Host:** `127.0.0.1`
- **Puerto:** `3306`
- **Base de Datos:** `civicguard_db`
- **Usuario:** `civicguard`
- **Contraseña:** `2005`

> 💡 **Alternativa con Docker (para otros integrantes del equipo):**
> Si algún integrante no tiene MySQL instalado localmente, puede levantar el contenedor incluido ejecutando:
> ```bash
> docker compose up -d
> ```
> *(Expone MySQL 8.0 en el puerto `3307` y phpMyAdmin en `http://localhost:8081`).*

---

## 🚀 Cómo Iniciar el Entorno de Desarrollo

### 1. Levantar el Back-End (Laravel API Headless — Puerto `8000`)
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```
- **Healthcheck de la API:** `http://127.0.0.1:8000/api/v1/health`
- **Listado de incidencias:** `http://127.0.0.1:8000/api/v1/incidents`

### 2. Levantar el Front-End (Angular PWA — Puerto `4200`)
```bash
cd frontend
npm start
```
- **Acceso Local (Contexto Seguro):** `http://localhost:4200` (el proxy encamina automáticamente `/api/*` hacia `http://127.0.0.1:8000`).

### 3. Pruebas en Hardware Móvil Real con `ngrok` (Contexto Seguro HTTPS)
```bash
ngrok http 4200 --host-header=rewrite
```
Abre la URL `https://*.ngrok-free.app` en el navegador de tu teléfono para probar la instalación en pantalla de inicio, GPS real, Cámara y Modo Avión.
