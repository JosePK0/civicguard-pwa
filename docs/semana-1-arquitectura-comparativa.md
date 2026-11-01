# Entregable Técnico 1 (Semana 1): Definición de Proyecto y Tabla Comparativa Oficial de Arquitecturas

**Proyecto:** Sistema de Gestión de Emergencias e Incidencias en Infraestructura Urbana *"CivicGuard PWA"*  
**Institución:** Universidad Tecnológica Metropolitana (UTM)  
**Carrera:** Ingeniería en Desarrollo y Gestión de Software  

---

## 1. Definición y Justificación de la Arquitectura Seleccionada

Para el sistema **CivicGuard PWA**, se seleccionó una **Arquitectura Web Progresiva (PWA) Desacoplada (Headless) bajo el patrón Application Shell + Offline-First**, compuesta por:

1. **Front-End Autónomo (Angular SPA + PWA Engine):**
   - Opera de manera 100% independiente de la base de datos externa mediante **renderizado mixto** (inyección estática de *placeholders* estructurales en el *Application Shell* + *Client-Side Rendering* reactivo en TypeScript).
   - Gestiona un hilo de fondo asíncrono mediante un **Service Worker (`sw.js`)** en la raíz del proyecto para interceptar peticiones de red, aplicar estrategias **Cache-First** (para recursos inmutables del cascarón) y **Network-First con fallback local** (para datos dinámicos).
   - Implementa **persistencia dual asíncrona** libre de bloqueos del hilo principal (sin `localStorage`), combinando **Cache API** e **IndexedDB** transaccional para almacenar reportes de emergencias, coordenadas GPS y fotografías en Modo Avión.
2. **Back-End Headless (Laravel REST API + WebPush Server):**
   - Expone endpoints RESTful desacoplados (`/api/v1/incidents`, `/api/v1/push-subscriptions`) respaldados por **MySQL/MariaDB** bajo una arquitectura por capas (*Controllers → FormRequests → Services → Models*).
   - Implementa un middleware de **supresión de cachés HTTP clásicas** (`Cache-Control: no-store, no-cache, must-revalidate`) para delegar el control determinista del almacenamiento en caché al `Service Worker`.

---

## 2. Tabla Comparativa Oficial de Arquitecturas Aplicadas al Caso de Estudio ("CivicGuard")

| Criterio / Dimensión | Web Tradicional (MPA / Monolito SSR) | Orientada a Servicios (SOA / Headless SPA Clásica) | Móvil Nativa (Android Kotlin / iOS Swift) | Multiplataforma Híbrida (Flutter / React Native) | **Web Progresiva (PWA Headless: Angular + Laravel)** ⭐ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Capacidad Operativa Offline (Modo Avión)** | ❌ **Nula.** Requiere conexión continua al servidor para recargar cada vista HTML. | ⚠️ **Limitada.** Sin un Service Worker y almacenamiento transaccional local, la SPA falla al perder red. | ✅ **Alta.** Acceso directo a SQLite/Room/CoreData locales. | ✅ **Alta.** Soporta bases de datos embebidas mediante plugins nativos. | ✅ **Alta y Autónoma.** Arranque instantáneo con **Cache API** (App Shell) y retención de reportes/fotos en **IndexedDB** + **Background Sync**. |
| **Acceso a Hardware Físico (Cámara y GPS)** | ⚠️ **Básico.** Formularios HTML clásicos sin retención asíncrona offline. | ✅ **Medio.** Usa APIs del navegador, pero depende de conectividad activa. | ✅ **Total.** APIs nativas del sistema operativo. | ✅ **Alto.** Requiere puentes (*bridges*) nativos por plataforma. | ✅ **Óptimo y Estándar.** Uso directo de `navigator.geolocation` y `navigator.mediaDevices.getUserMedia` bajo contexto seguro HTTPS. |
| **Herramientas y Stack Tecnológico** | PHP/Blade, JSP, ASP.NET, Apache/Nginx. | Angular/React/Vue + REST API (Laravel/Node), Axios/Fetch. | Android Studio (Kotlin), Xcode (Swift). | Flutter (Dart), React Native, Capacitor. | **Angular SPA + Service Worker (`sw.js`) + `manifest.json` + IndexedDB + Web Push VAPID + Laravel API + MySQL.** |
| **Distribución e Instalación** | Navegador web (URL). Sin icono en pantalla de inicio ni arranque autónomo. | Navegador web (URL). No instalable como app del sistema. | Tiendas oficiales (Google Play / App Store) con revisión y costos de publicación. | Tiendas oficiales; empaquetado binario pesado (>30 MB). | **Instalación directa desde el navegador (Add to Home Screen)** con *Maskable Icons* y *Splash Screen*, peso < 2 MB, sin fricción de tiendas. |
| **Notificaciones y Sincronización en Fondo** | ❌ No soporta ejecución cuando la pestaña está cerrada. | ❌ Solo notificaciones en pestaña activa (WebSockets). | ✅ Push nativo (FCM / APNs) y Background Services. | ✅ Push nativo mediante SDKs de terceros. | ✅ **Web Push API (VAPID) + Background Sync API** ejecutados en segundo plano por el `Service Worker`. |
| **Ventajas en "CivicGuard"** | Simplicidad inicial en redes estables de oficina. | Separación clara entre UI y lógica de servidor. | Máximo rendimiento gráfico. | Un código base para tiendas móviles. | **Un solo código multiplataforma (Android, iOS, Desktop), tolerancia total a zonas de desastre sin señal (3G/Offline) y despliegue inmediato.** |
| **Desventajas en "CivicGuard"** | **Inoperante en emergencias urbanas sin cobertura celular.** | Vulnerable a micro-cortes de red en campo sin capa PWA. | Doble costo de desarrollo y demora en aprobación de tiendas durante emergencias. | Mayor consumo de batería/datos para descargar el binario inicial en campo. | Requiere obligatoriamente **contexto seguro (HTTPS / TLS)** para habilitar Service Workers, Cámara y Geolocalización. |
