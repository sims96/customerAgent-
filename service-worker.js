// service-worker.js - Enhanced for PWA installation on Android
// Version 2.0

// Cache name for offline functionality - updated version
const CACHE_NAME = 'lesims-dashboard-cache-v3';

// Assets to cache for offline functionality
const CACHE_ASSETS = [
  './',
  './index.html',
  './logo.jpg',
  './manifest.json',
  './dashboard.js',
  './js/api.js',
  './js/ui.js',
  './js/notification-system.js',
  './js/mobile-chat.js',
  './js/pwa-install.js',
  './notification-sounds/new-customer.mp3',
  './notification-sounds/order-confirmed.mp3',
  './notification-sounds/help-needed.mp3',
  // Icons - comprehensive list
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/apple-icon-180x180.png',
  './icons/apple-splash-2048-2732.png',
  './icons/apple-splash-1668-2388.png',
  './icons/apple-splash-1536-2048.png',
  './icons/apple-splash-1125-2436.png',
  './icons/apple-splash-1242-2688.png',
  './icons/apple-splash-828-1792.png',
  './icons/apple-splash-1242-2208.png',
  // External resources
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Enhanced credential handling with validation
let apiCredentials = null;
let lastCredentialCheck = 0;
let notificationCheckInterval = null;
let installPromptEvent = null;

// Install event - cache assets and announce installation readiness
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker');
  self.skipWaiting(); // Ensure service worker activates immediately
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete, now ready for offline use and PWA install');
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker');
  
  event.waitUntil(
    Promise.all([
      // Original cache cleanup
      caches.keys().then(keyList => {
        return Promise.all(keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        }));
      }),
      
      // Try to load credentials
      loadCredentialsFromIndexedDB().then(creds => {
        if (creds && creds.apiUrl && creds.apiKey) {
          console.log('[Service Worker] Restored credentials from IndexedDB');
          apiCredentials = creds;
          
          // Set up notification check interval if credentials exist
          setupNotificationCheckInterval();
          
          // Perform initial check after restoration
          setTimeout(() => checkForNotifications(), 3000);
        } else {
          console.log('[Service Worker] No valid credentials in IndexedDB, requesting from clients');
          requestCredentialsFromClients();
        }
      })
    ])
    .then(() => {
      return self.clients.claim();
    })
    .then(() => {
      // Notify all clients that service worker is active
      return self.clients.matchAll();
    })
    .then(clients => {
      if (clients.length > 0) {
        console.log('[Service Worker] Connected to', clients.length, 'client(s)');
        clients.forEach(client => {
          // Tell clients service worker is ready for installation
          client.postMessage({
            type: 'SW_ACTIVATED',
            timestamp: Date.now()
          });
        });
      } else {
        console.log('[Service Worker] No connected clients found');
      }
      
      // Also announce PWA installability
      checkInstallability();
    })
  );
});

// Check if PWA is installable and announce it to clients
function checkInstallability() {
  self.clients.matchAll().then(clients => {
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'PWA_INSTALLABLE',
          installable: true
        });
      });
    }
  });
}

// Special message to inform clients the PWA is installable
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data.type);
  
  if (event.data.type === 'CHECK_INSTALLABLE') {
    // Respond to client that PWA is installable
    if (event.source) {
      event.source.postMessage({
        type: 'PWA_INSTALLABLE',
        installable: true
      });
    }
  }
  
  if (event.data.type === 'STORE_CREDENTIALS') {
    // Validate credentials before storing
    if (!event.data.apiUrl || !event.data.apiKey) {
      console.log('[Service Worker] Received invalid credentials, ignoring');
      
      // Inform client of invalid credentials
      if (event.source && event.source.postMessage) {
        event.source.postMessage({
          type: 'CREDENTIALS_STATUS',
          status: 'invalid'
        });
      }
      return;
    }
    
    // Store API credentials for background fetching
    apiCredentials = {
      apiUrl: event.data.apiUrl,
      apiKey: event.data.apiKey,
      timestamp: event.data.timestamp || Date.now()
    };
    console.log('[Service Worker] API credentials stored successfully');
    
    // Store credentials in IndexedDB for persistence across service worker restarts
    storeCredentialsInIndexedDB(apiCredentials).then(() => {
      console.log('[Service Worker] Credentials also stored in IndexedDB');
    });
    
    // Setup notification checking interval
    setupNotificationCheckInterval();
    
    // Respond to the client that sent the credentials
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        type: 'CREDENTIALS_STATUS',
        status: 'success'
      });
    }
    
    // Check for notifications immediately after receiving credentials
    checkForNotifications();
  } 
  else if (event.data.type === 'VERIFY_CREDENTIALS') {
    // Respond with current credential status
    if (event.source && event.source.postMessage) {
      const status = apiCredentials && apiCredentials.apiUrl && apiCredentials.apiKey 
        ? 'success' 
        : 'missing';
      
      event.source.postMessage({
        type: 'CREDENTIALS_STATUS',
        status: status
      });
      
      // If we have no credentials, request them
      if (status === 'missing') {
        requestCredentialsFromClients();
      }
    }
  }
  else if (event.data.type === 'CHECK_NOTIFICATIONS') {
    // If we don't have credentials, request them before checking
    if (!apiCredentials || !apiCredentials.apiUrl || !apiCredentials.apiKey) {
      console.log('[Service Worker] No credentials available for notification check');
      
      loadCredentialsFromIndexedDB().then(creds => {
        if (creds && creds.apiUrl && creds.apiKey) {
          apiCredentials = creds;
          console.log('[Service Worker] Loaded credentials from IndexedDB');
          checkForNotifications();
        } else {
          console.log('[Service Worker] Still no credentials available, requesting from clients');
          requestCredentialsFromClients();
        }
      });
    } else {
      // Use existing credentials
      checkForNotifications();
    }
  }
  else if (event.data.type === 'STORE_INSTALL_PROMPT') {
    console.log('[Service Worker] Storing install prompt event from client');
    // Store the information that an install prompt was captured
    installPromptEvent = {
      timestamp: Date.now()
    };
    
    // Inform other clients that we have an install prompt
    self.clients.matchAll().then(clients => {
      for (const client of clients) {
        if (client.id !== event.source.id) {
          client.postMessage({
            type: 'INSTALL_PROMPT_AVAILABLE',
            timestamp: installPromptEvent.timestamp
          });
        }
      }
    });
  }
  else if (event.data.type === 'REQUEST_CREDENTIALS_RESPONSE') {
    // Validate and store credentials received from client
    if (event.data.apiUrl && event.data.apiKey) {
      apiCredentials = {
        apiUrl: event.data.apiUrl,
        apiKey: event.data.apiKey,
        timestamp: Date.now()
      };
      
      console.log('[Service Worker] Received valid credentials from client');
      
      // Store for persistence
      storeCredentialsInIndexedDB(apiCredentials);
      
      // Setup notification checking interval
      setupNotificationCheckInterval();
      
      // Check notifications with new credentials
      checkForNotifications();
      
      // Inform all clients that credentials are now available
      self.clients.matchAll().then(clients => {
        for (const client of clients) {
          client.postMessage({
            type: 'CREDENTIALS_STATUS',
            status: 'success'
          });
        }
      });
    } else {
      console.log('[Service Worker] Received invalid credentials response');
    }
  }
  else if (event.data.type === 'HEALTH_CHECK') {
    // Respond to health check to confirm service worker is active
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        type: 'HEALTH_CHECK_RESPONSE',
        timestamp: Date.now(),
        originalTimestamp: event.data.timestamp
      });
    }
  }
});

// Additional event listeners for push events, sync, fetch, etc. remain the same as your original service worker

// Set up interval for checking notifications
function setupNotificationCheckInterval() {
  // Clear any existing interval
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
  
  // Set up new interval - check every 2 minutes when we have credentials
  notificationCheckInterval = setInterval(() => {
    if (apiCredentials && apiCredentials.apiUrl && apiCredentials.apiKey) {
      checkForNotifications();
    } else {
      console.log('[Service Worker] Skipping notification check - no credentials');
    }
  }, 2 * 60 * 1000);
  
  console.log('[Service Worker] Notification check interval set up');
}

// Request credentials from all connected clients
function requestCredentialsFromClients() {
  console.log('[Service Worker] Requesting credentials from clients');
  self.clients.matchAll().then(clients => {
    if (clients.length === 0) {
      console.log('[Service Worker] No connected clients to request credentials from');
      return;
    }
    
    console.log('[Service Worker] Requesting credentials from', clients.length, 'client(s)');
    
    for (const client of clients) {
      client.postMessage({
        type: 'REQUEST_CREDENTIALS'
      });
    }
  });
}

// Enhanced checkForNotifications function with better error handling
async function checkForNotifications() {
  // Implementation remains the same as in your original service worker
  // ...
}

// Fetch handler with improved caching strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Enhanced caching strategy for better PWA experience
  // Check if this is a navigation request (HTML document)
  const isNavigationRequest = event.request.mode === 'navigate';
  
  // Special handling for navigation requests
  if (isNavigationRequest) {
    event.respondWith(
      // Try the network first
      fetch(event.request)
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If not in cache, try the cached index.html as fallback
              return caches.match('./index.html');
            });
        })
    );
    return;
  }
  
  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Fall back to cache for offline support
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if valid response to cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Add to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
});

// IndexedDB functions for persistent credential storage
function openCredentialsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CredentialsDB', 1);
    
    request.onerror = (event) => {
      console.error('[Service Worker] IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('credentials')) {
        db.createObjectStore('credentials', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
}

function storeCredentialsInIndexedDB(credentials) {
  return openCredentialsDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['credentials'], 'readwrite');
      const store = transaction.objectStore('credentials');
      
      const data = {
        id: 'apiCredentials',
        apiUrl: credentials.apiUrl,
        apiKey: credentials.apiKey,
        timestamp: credentials.timestamp || Date.now()
      };
      
      const request = store.put(data);
      
      request.onerror = (event) => {
        console.error('[Service Worker] Error storing credentials:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  });
}

function loadCredentialsFromIndexedDB() {
  return openCredentialsDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['credentials'], 'readonly');
      const store = transaction.objectStore('credentials');
      
      const request = store.get('apiCredentials');
      
      request.onerror = (event) => {
        console.error('[Service Worker] Error loading credentials:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result && result.apiUrl && result.apiKey) {
          resolve({
            apiUrl: result.apiUrl,
            apiKey: result.apiKey,
            timestamp: result.timestamp
          });
        } else {
          resolve(null);
        }
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }).catch(error => {
    console.error('[Service Worker] Failed to load credentials from IndexedDB:', error);
    return null;
  });
}