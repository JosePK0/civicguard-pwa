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
