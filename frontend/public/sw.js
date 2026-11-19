/**
 * ============================================================================
 * CIVICGUARD PWA — SERVICE WORKER OFICIAL (/sw.js)
 * Ámbito (Scope): Global ("/")
 * Cumplimiento Técnico:
 *  - Semana 2: Ciclo de vida asíncrono (install, activate, self.skipWaiting())
 *  - Semana 3: Dualidad Cache API (App Shell) + IndexedDB + Network-First + Background Sync
 *  - Semana 4: Protocolo de Notificaciones Push nativas del Sistema Operativo
 * ============================================================================
 */

const CACHE_VERSION = 'v2.5.0';
const SHELL_CACHE_NAME = `civicguard-app-shell-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `civicguard-dynamic-${CACHE_VERSION}`;
const SYNC_TAG_INCIDENTS = 'civicguard-sync-incidents';

const IDB_NAME = 'civicguard_pwa_db';
const IDB_VERSION = 2;
const IDB_STORE_INCIDENTS = 'incidents';

/**
 * Recursos inmutables del Application Shell almacenados durante la instalación.
 */
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
];

// ============================================================================
// 1. EVENTO DE INSTALACIÓN (install) + Control seguro de espera (skipWaiting)
// ============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      await cache.addAll(APP_SHELL_ASSETS);

      // Descubrir y pre-almacenar recursivamente todos los bundles JS/CSS y módulos ES (@angular/*, rxjs, etc.)
      try {
        const indexRes = await fetch('/index.html', { cache: 'no-store' });
        const html = await indexRes.text();
        const queue = [
          ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
        ]
          .map((m) => m[1])
          .filter((u) => !u.startsWith('http') && !u.startsWith('/@vite'))
          .map((u) => (u.startsWith('/') ? u : `/${u}`));

        const visited = new Set();

        while (queue.length > 0) {
          const currentUrl = queue.shift();
          if (!currentUrl || visited.has(currentUrl)) continue;
          visited.add(currentUrl);

          const res = await fetch(currentUrl);
          if (!res || !res.ok) continue;
          await cache.put(currentUrl, res.clone());

          if (currentUrl.includes('.js')) {
            const code = await res.text();
            const baseUrl = new URL(currentUrl, self.location.origin);
            const importMatches = [
              ...code.matchAll(/(?:from|import)\s*["']([^"']+)["']/g),
            ].map((m) => m[1]);

            for (const spec of importMatches) {
              if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
                const resolved = new URL(spec, baseUrl);
                const fullPath = resolved.pathname + resolved.search;
                if (!visited.has(fullPath)) {
                  queue.push(fullPath);
                }
              }
            }
          }
        }
      } catch {
        // Continuar si algún módulo opcional no está disponible
      }

      await self.skipWaiting();
    })()
  );
});

// ============================================================================
// 2. EVENTO DE ACTIVACIÓN (activate) + Depuración de cachés antiguas
// ============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      let deletedLegacyCache = false;
      for (const cacheName of cacheNames) {
        if (cacheName !== SHELL_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
          await caches.delete(cacheName);
          deletedLegacyCache = true;
        }
      }
      await self.clients.claim();
      if (deletedLegacyCache) {
        const windowClients = await self.clients.matchAll({ type: 'window' });
        for (const client of windowClients) {
          if ('navigate' in client) {
            await client.navigate(client.url);
          }
        }
      }
    })()
  );
});

// ============================================================================
// 3. INTERCEPTOR DE RED (fetch):
//    - Ignora sockets de recarga (@vite / ng-cli-ws)
//    - API (/api/*): Estrategia Network-First con Fallback JSON Offline
//    - Recursos estáticos de íconos/manifest: Cache-First
//    - App Shell y Bundles JS/CSS: Network-First con persistencia en Cache API
//      para arranque garantizado en Modo Avión sin servir código desactualizado
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // En Modo Avión, devolver un módulo vacío para el cliente HMR de Vite sin romper el arranque
  if (url.pathname.startsWith('/@vite') || url.pathname.includes('ng-cli-ws')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response('/* offline stub */', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' },
          })
      )
    );
    return;
  }

  // Estrategia Network-First para llamadas a la API Headless de Laravel
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstForApi(request));
    return;
  }

  // Estrategia Cache-First para íconos, manifest y dependencias precompiladas (/@fs/*)
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/@fs/')
  ) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  // Estrategia para servicios cartográficos externos (OpenStreetMap Tiles / Nominatim)
  if (url.origin !== self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const netRes = await fetch(request);
          if (netRes && netRes.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, netRes.clone());
          }
          return netRes;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response('', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Estrategia Resiliente para App Shell y Bundles (Actualiza caché con red; sirve Cache API en Modo Avión)
  event.respondWith(networkFirstWithAppShellFallback(request));
});

async function networkFirstForApi(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      JSON.stringify({
        status: 'offline_fallback',
        architecture: 'Service Worker Network-First Fallback',
        data: [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.status === 200) {
    const cache = await caches.open(SHELL_CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function networkFirstWithAppShellFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      request.url.startsWith(self.location.origin)
    ) {
      const cache = await caches.open(SHELL_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    throw error;
  }
}

// ============================================================================
// 4. SINCRONIZACIÓN EN SEGUNDO PLANO (Background Sync API - Semana 3)
// ============================================================================
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG_INCIDENTS) {
    event.waitUntil(syncPendingIncidentsFromIndexedDB());
  }
});

function openIndexedDBInWorker() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE_INCIDENTS)) {
        const store = db.createObjectStore(IDB_STORE_INCIDENTS, { keyPath: 'client_uuid' });
        store.createIndex('by_sync_state', 'sync_state', { unique: false });
      }
      if (!db.objectStoreNames.contains('auth_session')) {
        db.createObjectStore('auth_session', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function syncPendingIncidentsFromIndexedDB() {
  if (!self.navigator.onLine) {
    throw new Error('Dispositivo sin conexión');
  }

  const db = await openIndexedDBInWorker();

  const pendingItems = await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_INCIDENTS, 'readonly');
    const store = tx.objectStore(IDB_STORE_INCIDENTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      resolve(all.filter((item) => item.sync_state === 'pending_sync'));
    };
    req.onerror = () => reject(req.error);
  });

  if (pendingItems.length === 0) {
    return;
  }

  const response = await fetch('/api/v1/incidents/sync-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ incidents: pendingItems }),
  });

  if (!response.ok) {
    throw new Error('Error al sincronizar lote con el servidor');
  }

  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_INCIDENTS, 'readwrite');
    const store = tx.objectStore(IDB_STORE_INCIDENTS);
    for (const item of pendingItems) {
      item.sync_state = 'synced';
      item.synced_at = new Date().toISOString();
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({
      type: 'BACKGROUND_SYNC_COMPLETED',
      syncedCount: pendingItems.length,
    });
  }
}

// ============================================================================
// 5. PROTOCOLO DE NOTIFICACIONES PUSH NATIVAS (Semana 4)
// ============================================================================
self.addEventListener('push', (event) => {
  let payload = {
    title: 'CivicGuard — Actualización de Reporte',
    body: 'Se ha actualizado el estatus de un reporte de infraestructura.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'civicguard-status-update',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      tag: payload.tag || 'civicguard-alert',
      vibrate: [200, 100, 200],
      data: payload,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
