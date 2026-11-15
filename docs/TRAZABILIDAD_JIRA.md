# Matriz de Trazabilidad Jira — CivicGuard PWA (`CIV`)
| Clave Jira | Sprint | Responsable | Usuario GitHub | Tarea |
|---|---|---|---|---|
| `CIV-5` | Sprint 1 | Jose Antonio De Jesus Pool Ku | @JosePK0 | Inicializar repositorio monorepo CivicGuard PWA con estructura desacoplada backend (Laravel 13) y frontend (Angular PWA) |
| `CIV-6` | Sprint 1 | Jose Antonio De Jesus Pool Ku | @JosePK0 | Configurar .gitignore, README arquitectónico y estrategia de ramas GitFlow (main, develop, feature/*, release/*) |
| `CIV-7` | Sprint 1 | Jose Antonio De Jesus Pool Ku | @JosePK0 | Crear proyecto Scrum en Jira para CivicGuard PWA, configurar tablero, épicas, historias y los 4 sprints semanales |
| `CIV-8` | Sprint 1 | Jose Antonio De Jesus Pool Ku | @JosePK0 | Configurar docker-compose.yml con MySQL 8.0, phpMyAdmin y script start-dev.sh para orquestación de puertos locales (8000 y 4200) |
| `CIV-9` | Sprint 1 | Jose Antonio De Jesus Pool Ku | @JosePK0 | Elaborar Tabla Comparativa Oficial de arquitecturas (Tradicional, SOA, Nativa, Multiplataforma y PWA) aplicada a CivicGuard |
| `CIV-10` | Sprint 1 | Jose Antonio De Jesus Pool Ku | @JosePK0 | Elaborar Reporte de Configuración del Entorno con bitácora de puertos, supresión de caché HTTP y túnel HTTPS ngrok |
| `CIV-11` | Sprint 1 | Cristian Isaac Llanes Puc | @LlanesGood | Configurar proyecto base Laravel API Headless, conexión MySQL civicguard_db y variables de entorno seguras (.env.example) |
| `CIV-12` | Sprint 1 | Cristian Isaac Llanes Puc | @LlanesGood | Implementar NoHttpCacheMiddleware en Laravel (Cache-Control: no-store, no-cache, must-revalidate, Pragma: no-cache) para suprimir cachés HTTP clásicas |
| `CIV-13` | Sprint 1 | Cristian Isaac Llanes Puc | @LlanesGood | Registrar NoHttpCacheMiddleware en el grupo de rutas API de bootstrap/app.php y crear endpoint GET /api/v1/health |
| `CIV-14` | Sprint 1 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Inicializar proyecto Angular SPA con TypeScript estricto, angular.json y configuración de compilación de producción |
| `CIV-15` | Sprint 1 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Configurar proxy.conf.json en Angular para encaminar /api/* hacia http://127.0.0.1:8000 bajo un mismo origen seguro |
| `CIV-16` | Sprint 1 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Definir contratos de dominio en TypeScript estricto (incident.model.ts) con estados de sincronización y coordenadas geográficas |
| `CIV-17` | Sprint 1 | Alexis Alexander Bolio Chan | @AlexanderPlusD | Diseñar y vincular archivo de metadatos public/manifest.json con display standalone, colores corporativos y orientación |
| `CIV-18` | Sprint 1 | Alexis Alexander Bolio Chan | @AlexanderPlusD | Maquetar Application Shell inmutable en src/index.html y estilos base institucionales en src/styles.css |
| `CIV-19` | Sprint 2 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Programar e inyectar el Service Worker (public/sw.js) en la raíz del proyecto para controlar el ámbito (Scope) global '/' |
| `CIV-20` | Sprint 2 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Implementar evento asíncrono install en sw.js con pre-cacheo atómico del Application Shell y llamada a self.skipWaiting() |
| `CIV-21` | Sprint 2 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Implementar evento asíncrono activate en sw.js con purga automática de versiones obsoletas de caché y self.clients.claim() |
| `CIV-22` | Sprint 2 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Implementar pre-almacenamiento recursivo de bundles JS/CSS de Angular en Cache API para garantizar arranque en frío sin red |
| `CIV-23` | Sprint 2 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Implementar SwManagerService (sw-manager.service.ts) para registro del Service Worker, monitoreo de estado y canal MessageChannel |
| `CIV-24` | Sprint 2 | Alexis Alexander Bolio Chan | @AlexanderPlusD | Generar recursos visuales adaptativos en public/icons/ (icon-192x192.png, icon-512x512.png e icon-maskable-512x512.png) |
| `CIV-25` | Sprint 2 | Alexis Alexander Bolio Chan | @AlexanderPlusD | Configurar Splash-screen y Home-screen nativas mediante Maskable Icons (purpose: any y maskable) en manifest.json |
| `CIV-26` | Sprint 2 | Alexis Alexander Bolio Chan | @AlexanderPlusD | Implementar modelo de renderizado mixto: placeholders estructurales estáticos en index.html e hidratación CSR en Angular |
| `CIV-27` | Sprint 2 | Alexis Alexander Bolio Chan | @AlexanderPlusD | Diseñar barra superior del Application Shell con indicadores en tiempo real de estado de red (Online / Modo Avión) y estado del SW |
| `CIV-28` | Sprint 2 | Cristian Isaac Llanes Puc | @LlanesGood | Crear migración relacional de tabla users y migración add_role_and_token_to_users_table para operadores de campo y despachadores |
| `CIV-29` | Sprint 2 | Cristian Isaac Llanes Puc | @LlanesGood | Implementar modelo User con roles operativos (dispatcher / operator), hashing bcrypt de contraseñas y tokens de sesión |
| `CIV-30` | Sprint 2 | Cristian Isaac Llanes Puc | @LlanesGood | Implementar AuthController en Laravel (/api/v1/auth/login, /register, /me, /logout) con respuestas JSON sin caché HTTP |
| `CIV-31` | Sprint 2 | Jose Antonio De Jesus Pool Ku | @JosePK0 | Documentar el Mapeo del Ciclo de Vida del Service Worker (docs/semana-2-mapeo-ciclo-vida-sw.md) con diagramas de transición |
| `CIV-32` | Sprint 3 | Cristian Isaac Llanes Puc | @LlanesGood | Crear migración de tabla incidents con client_uuid único (idempotencia offline), categoría, severidad, latitud, longitud y foto |
| `CIV-33` | Sprint 3 | Cristian Isaac Llanes Puc | @LlanesGood | Implementar modelo Eloquent Incident con casts tipados para coordenadas geográficas y marca temporal de sincronización |
| `CIV-34` | Sprint 3 | Cristian Isaac Llanes Puc | @LlanesGood | Crear StoreIncidentRequest con validación estricta de coordenadas GPS (-90..90, -180..180), categorías urbanas y fotografías base64 |
| `CIV-35` | Sprint 3 | Cristian Isaac Llanes Puc | @LlanesGood | Implementar IncidentService en Laravel con lógica de upsert idempotente por client_uuid para evitar duplicados en reintentos de red |
| `CIV-36` | Sprint 3 | Cristian Isaac Llanes Puc | @LlanesGood | Implementar IncidentController RESTful (GET/POST /api/v1/incidents, PATCH /status, POST /sync) con soporte de lotes offline |
| `CIV-37` | Sprint 3 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Implementar IndexedDbService (indexed-db.service.ts) con almacenes transaccionales incidents, sync_queue y auth_session (cero localStorage) |
| `CIV-38` | Sprint 3 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Implementar HardwareService (hardware.service.ts) integrando Geolocation API de alta precisión y MediaDevices Camera API con compresión |
| `CIV-39` | Sprint 3 | Luis Gerardo Diaz Pardenilla | @ShakerCandle694 | Implementar IncidentService en Angular con algoritmo resiliente Network-First y fallback automático a IndexedDB en Modo Avión |
