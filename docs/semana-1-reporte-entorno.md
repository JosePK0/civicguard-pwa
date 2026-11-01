# Entregable Técnico 2 (Semana 1): Reporte de Configuración del Entorno de Desarrollo

**Proyecto:** Sistema de Gestión de Emergencias e Incidencias en Infraestructura Urbana *"CivicGuard PWA"*  
**Enfoque:** Configuración quirúrgica del entorno local seguro, supresión de cachés HTTP clásicas y tunelización HTTPS para hardware móvil real.

---

## 1. Bitácora de Herramientas y Versiones del Entorno

| Componente | Tecnología / Herramienta | Rol en la Arquitectura CivicGuard PWA |
| :--- | :--- | :--- |
| **Front-End (PWA / App Shell)** | **Angular CLI + TypeScript (Node.js v26)** | Renderizado del *Application Shell*, gestión reactiva CSR, acceso a hardware (`Geolocation`, `MediaDevices`) e `IndexedDB`. |
| **Motor Offline / Red** | **Service Worker (`public/sw.js`) + `manifest.json`** | Control del ámbito (*Scope*) global `/`, caché inmutable del cascarón (`Cache API`), `Background Sync` y `Push API`. |
| **Back-End (API Headless)** | **Laravel 12 (PHP 8.5)** | Servidor de API RESTful desacoplada (`/api/v1/*`), validación de datos, almacenamiento de evidencias y despacho WebPush VAPID. |
| **Motor de Base de Datos** | **MySQL / MariaDB (`civicguard_db`)** | Persistencia relacional en servidor central (con soporte nativo local en puerto `3306` y contenedor Docker en puerto `3307`). |
| **Tunelización HTTPS Móvil** | **ngrok (Reverse Proxy TLS)** | Exposición del entorno local bajo certificado SSL/TLS válido (`https://*.ngrok-free.app`) para habilitar APIs restringidas en smartphones físicos. |

---

## 2. Parámetros de Puertos Locales de Desarrollo

| Servicio | Host Local | Puerto | Protocolo Local | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **Front-End Angular Dev Server** | `127.0.0.1` / `0.0.0.0` | `4200` | HTTP (Proxy a `/api`) | Servidor de desarrollo de la SPA/PWA con recarga en vivo y proxy hacia Laravel. |
| **Back-End Laravel API Server** | `127.0.0.1` | `8000` | HTTP (REST JSON) | API Headless que procesa sincronizaciones de incidencias y notificaciones Push. |
| **MySQL / MariaDB Local** | `127.0.0.1` | `3306` | TCP (MySQL) | Base de datos principal `civicguard_db` (Usuario: `civicguard`). |
| **MySQL Docker (Alternativo)** | `127.0.0.1` | `3307` | TCP (MySQL) | Contenedor aislado reproducible mediante `docker compose up -d`. |

---

## 3. Supresión de Cachés HTTP Clásicas

Para evitar que el navegador almacene versiones obsoletas del `sw.js`, `manifest.json` o respuestas JSON mediante la caché HTTP tradicional del protocolo HTTP/1.1, se implementaron dos mecanismos obligatorios:

1. **Middleware en Laravel (`app/Http/Middleware/NoHttpCacheMiddleware.php`):**
   Inyecta en todas las respuestas de la API las cabeceras de supresión de caché estándar:
   ```http
   Cache-Control: no-store, no-cache, must-revalidate, max-age=0
   Pragma: no-cache
   Expires: Sat, 01 Jan 2000 00:00:00 GMT
   ```
2. **Configuración de Cabeceras en el Servidor Front-End (`angular.json`):**
   El servidor de desarrollo de Angular incluye `Cache-Control: no-store` para garantizar que únicamente la **Cache API gobernada por el Service Worker (`sw.js`)** decida qué recursos se persisten.

---

## 4. Validación de Contexto Seguro (`window.isSecureContext`) y Tunelización con `ngrok`

Las APIs críticas de una PWA (**Service Workers, Geolocation API, MediaDevices Camera API y Push Notifications**) exigen ejecutarse en un **Contexto Seguro (`isSecureContext === true`)**:
- En la máquina de desarrollo: `http://localhost:4200` es tratado como origen seguro por especificación W3C.
- En **hardware móvil real (Smartphone Android / iOS)**: acceder por IP local (`http://192.168.x.x:4200`) **bloquea** el Service Worker, la cámara y el GPS por no poseer TLS/HTTPS.
- **Solución con `ngrok`:**
  ```bash
  ngrok http 4200 --host-header=rewrite
  ```
  El proxy inverso `ngrok` genera un túnel cifrado `https://<subdominio>.ngrok-free.app` que redirige el tráfico al puerto `4200` (el cual a su vez encamina `/api` hacia el puerto `8000` de Laravel mediante `proxy.conf.json`), permitiendo probar la instalación de la PWA, cámara, GPS y Modo Avión en un teléfono físico real.
