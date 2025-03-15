// service-worker.js - Enhanced for PWA functionality, offline support, and notification handler for Complexe LeSims Dashboard

// Cache name with version for easy updates
const CACHE_NAME = 'lesims-dashboard-cache-v4';

// Define offline page URL
const OFFLINE_PAGE = './offline.html';

// Core assets to prioritize during installation
const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './logo.jpg',
  './manifest.json',
  './js/api.js',
  './js/ui.js',
  './js/dashboard.js',
  './js/pwa-install.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Additional assets to cache for offline functionality
const ADDITIONAL_ASSETS = [
  './js/notification-system.js',
  './js/mobile-chat.js',
  './notification-sounds/new-customer.mp3',
  './notification-sounds/order-confirmed.mp3',
  './notification-sounds/help-needed.mp3',
  // Icons
  './icons/icon-48x48.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-384x384.png',
  './icons/apple-icon-180x180.png',
];

// Combine all assets for full caching
const CACHE_ASSETS = [...CORE_ASSETS, ...ADDITIONAL_ASSETS];

// Enhanced credential handling with validation
let apiCredentials = null;
let lastCredentialCheck = 0;
let notificationCheckInterval = null;
let isAuthenticated = false;
let pendingCredentials = false;

// Install event - cache assets and prioritize core assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker');
  
  // Use skipWaiting to ensure the service worker activates immediately
  self.skipWaiting();
  
  // Cache core assets first, then additional assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching core shell assets');
        return cache.addAll(CORE_ASSETS)
          .then(() => {
            console.log('[Service Worker] Core assets successfully cached');
            // Then cache additional assets in the background
            return cache.addAll(ADDITIONAL_ASSETS)
              .catch(error => {
                console.log('[Service Worker] Some non-critical assets failed to cache:', error);
                // Continue anyway
                return Promise.resolve();
              });
          })
          .catch(error => {
            console.error('[Service Worker] Failed to cache core assets:', error);
            // Continue even if core assets fail to cache
            return Promise.resolve();
          });
      })
  );
});

// Activate event - clean up old caches and restore credentials
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker');
  
  // Use waitUntil to ensure activation completes before fetch events
  event.waitUntil(
    Promise.all([
      // Clean up old cache versions
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
          isAuthenticated = true;
          
          // Set up notification check interval if credentials exist
          setupNotificationCheckInterval();
          
          // Perform initial check after restoration
          setTimeout(() => checkForNotifications(), 3000);
        } else {
          console.log('[Service Worker] No valid credentials in IndexedDB, awaiting login');
          isAuthenticated = false;
          pendingCredentials = true;
        }
      })
    ])
    .then(() => {
      // This ensures the service worker takes control immediately
      return self.clients.claim();
    })
    .then(() => {
      // Notify clients that the service worker is active
      return self.clients.matchAll();
    })
    .then(clients => {
      console.log('[Service Worker] Successfully activated and claimed', clients.length, 'client(s)');
      
      // Notify all connected clients that service worker is ready
      clients.forEach(client => {
        client.postMessage({
          type: 'SERVICE_WORKER_READY',
          authenticated: isAuthenticated
        });
      });
    })
  );
});

// Periodic background sync for checking new notifications
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-notifications') {
    console.log('[Service Worker] Performing periodic sync: check-notifications');
    event.waitUntil(checkForNotifications());
  } else if (event.tag === 'connectivity-check') {
    event.waitUntil(checkConnectivity());
  }
});

// Basic sync event for checking notifications when online
self.addEventListener('sync', event => {
  if (event.tag === 'check-notifications') {
    console.log('[Service Worker] Performing one-time sync: check-notifications');
    event.waitUntil(checkForNotifications());
  }
});

// Push event handler
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  // Parse data if available
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { 
        title: 'New Notification',
        body: event.data.text()
      };
    }
  }
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'LeSims Dashboard',
      {
        body: data.body || 'You have a new notification',
        icon: './logo.jpg',
        badge: './icons/icon-72x72.png',
        tag: data.tag || 'default',
        data: data,
        renotify: true,
        vibrate: [100, 50, 100],
        requireInteraction: true
      }
    )
  );
});

// Enhanced message event handler
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data.type);
  
  // Special handler for service worker testing
  if (event.data.type === 'PING_SERVICE_WORKER') {
    if (event.source && event.source.postMessage) {
      event.source.postMessage({
        type: 'SERVICE_WORKER_PONG',
        timestamp: Date.now(),
        authenticated: isAuthenticated
      });
    }
    return;
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
    
    isAuthenticated = true;
    pendingCredentials = false;
    
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
      const status = isAuthenticated ? 'success' : 'missing';
      
      event.source.postMessage({
        type: 'CREDENTIALS_STATUS',
        status: status,
        authenticated: isAuthenticated
      });
      
      // If we have no credentials, request them
      if (status === 'missing') {
        requestCredentialsFromClients();
      }
    }
  }
  else if (event.data.type === 'CHECK_NOTIFICATIONS') {
    // If we don't have credentials, request them before checking
    if (!isAuthenticated) {
      console.log('[Service Worker] No credentials available for notification check');
      
      loadCredentialsFromIndexedDB().then(creds => {
        if (creds && creds.apiUrl && creds.apiKey) {
          apiCredentials = creds;
          isAuthenticated = true;
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
  else if (event.data.type === 'REQUEST_CREDENTIALS_RESPONSE') {
    // Validate and store credentials received from client
    if (event.data.apiUrl && event.data.apiKey) {
      apiCredentials = {
        apiUrl: event.data.apiUrl,
        apiKey: event.data.apiKey,
        timestamp: Date.now()
      };
      
      isAuthenticated = true;
      pendingCredentials = false;
      
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
            status: 'success',
            authenticated: true
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
        originalTimestamp: event.data.timestamp,
        authenticated: isAuthenticated
      });
    }
  }
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event.notification.tag);
  
  event.notification.close();
  
  // Handle notification actions
  if (event.action === 'dismiss') {
    // Just close the notification
    console.log('[Service Worker] Notification dismissed');
    return;
  }
  
  // Default action is to open/focus the app and pass notification data
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // If we have an existing window, focus it and send message
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              notification: event.notification.data
            });
            return;
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('./index.html');
        }
      })
  );
});

// Enhanced fetch event handler with better offline support
self.addEventListener('fetch', event => {
  // Skip non-GET requests and browser extension requests
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.includes('extension/')) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Handle API requests with network-first strategy
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('[Service Worker] Network request failed for API, returning offline response');
          // Return an offline API response
          return new Response(JSON.stringify({
            error: 'offline',
            message: 'You are currently offline. Please check your internet connection.'
          }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
            statusText: 'Service Unavailable'
          });
        })
    );
    return;
  }
  
  // For HTML navigation requests, serve offline page if network fails
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept') && 
       event.request.headers.get('accept').includes('text/html'))) {
    
    event.respondWith(
      // Try network first for navigation
      fetch(event.request)
        .catch(() => {
          console.log('[Service Worker] Navigation request failed, falling back to offline page');
          // If network fails, serve the offline page from cache
          return caches.match(OFFLINE_PAGE)
            .then(cachedOfflinePage => {
              if (cachedOfflinePage) {
                return cachedOfflinePage;
              }
              // If offline page isn't in cache, try index page
              return caches.match('./index.html');
            });
        })
    );
    return;
  }
  
  // For all other requests, use stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Even as we return cached response immediately, fetch a fresh copy
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Don't cache error responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Update the cache with the new version
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return networkResponse;
          })
          .catch(error => {
            console.log('[Service Worker] Network fetch failed:', error);
            // Network fetch failed, but we already returned cached response or will fall through
          });
        
        // Return the cached response immediately if available, or wait for network
        return cachedResponse || fetchPromise;
      })
  );
});

// Set up interval for checking notifications
function setupNotificationCheckInterval() {
  // Clear any existing interval
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
  
  // Set up new interval - check every 2 minutes when we have credentials
  notificationCheckInterval = setInterval(() => {
    if (isAuthenticated && apiCredentials && apiCredentials.apiUrl && apiCredentials.apiKey) {
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
  // Prevent checking too frequently
  const now = Date.now();
  if (now - lastCredentialCheck < 30000) { // Don't check more than once every 30 seconds
    console.log('[Service Worker] Skipping notification check - checked recently');
    return;
  }
  
  // Skip if not authenticated
  if (!isAuthenticated) {
    console.log('[Service Worker] Skipping notification check - not authenticated');
    return;
  }
  
  lastCredentialCheck = now;
  
  try {
    if (!apiCredentials || !apiCredentials.apiUrl || !apiCredentials.apiKey) {
      console.log('[Service Worker] No credentials available for notification check');
      
      // Try loading from IndexedDB
      const creds = await loadCredentialsFromIndexedDB();
      if (creds && creds.apiUrl && creds.apiKey) {
        apiCredentials = creds;
        isAuthenticated = true;
        console.log('[Service Worker] Loaded credentials from IndexedDB');
      } else {
        isAuthenticated = false;
        requestCredentialsFromClients();
        return;
      }
    }
    
    console.log('[Service Worker] Checking for notifications with credentials');
    
    // Fetch notifications from server
    const response = await fetch(`${apiCredentials.apiUrl}/api/notifications/pending`, {
      headers: {
        'Authorization': `Bearer ${apiCredentials.apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Service Worker] API error: ${response.status} - ${errorText}`);
      
      // If unauthorized (401), invalidate credentials
      if (response.status === 401) {
        console.log('[Service Worker] Credentials invalid, clearing');
        apiCredentials = null;
        isAuthenticated = false;
        
        // Try to notify clients about invalid credentials
        self.clients.matchAll().then(clients => {
          for (const client of clients) {
            client.postMessage({
              type: 'CREDENTIALS_STATUS',
              status: 'invalid',
              authenticated: false
            });
          }
        });
        
        requestCredentialsFromClients();
      }
      
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Service Worker] Fetched notifications:', data);
    
    if (!data.notifications || !Array.isArray(data.notifications) || data.notifications.length === 0) {
      console.log('[Service Worker] No new notifications found');
      return;
    }
    
    console.log('[Service Worker] Processing ' + data.notifications.length + ' notifications');
    
    // Process each notification
    const notificationPromises = data.notifications.map(async notification => {
      try {
        // Show notification
        await self.registration.showNotification(
          notification.title || 'LeSims Dashboard',
          {
            body: notification.body || '',
            icon: './logo.jpg',
            badge: './icons/icon-72x72.png',
            tag: notification.id || 'default',
            data: notification,
            vibrate: [100, 50, 100],
            requireInteraction: notification.urgent === true,
            actions: [
              {
                action: 'view',
                title: 'View'
              },
              {
                action: 'dismiss',
                title: 'Dismiss'
              }
            ]
          }
        );
        console.log(`[Service Worker] Showed notification: ${notification.id}`);
        return notification.id;
      } catch (err) {
        console.error(`[Service Worker] Error showing notification: ${err.message}`);
        return null;
      }
    });
    
    // Wait for all notifications to be shown
    const shownIds = (await Promise.all(notificationPromises)).filter(id => id !== null);
    console.log('[Service Worker] Displayed notifications:', shownIds);
    
    // Mark notifications as received on server
    if (shownIds.length > 0) {
      try {
        const markResponse = await fetch(`${apiCredentials.apiUrl}/api/notifications/mark-received`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiCredentials.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: shownIds })
        });
        
        if (markResponse.ok) {
          console.log('[Service Worker] Notifications marked as received on server');
        } else {
          console.error('[Service Worker] Failed to mark notifications as received:', 
                     await markResponse.text());
        }
      } catch (markError) {
        console.error('[Service Worker] Error marking notifications as received:', markError);
      }
    }
    
    // Notify all clients about the notifications
    self.clients.matchAll().then(clients => {
      for (const client of clients) {
        client.postMessage({
          type: 'NOTIFICATIONS_CHECKED',
          count: shownIds.length
        });
      }
    });
    
  } catch (error) {
    console.error('[Service Worker] Error checking for notifications:', error);
  }
}

// Function to check connectivity and notify clients
async function checkConnectivity() {
  try {
    const response = await fetch(self.registration.scope, { 
      method: 'HEAD',
      cache: 'no-store'
    });
    
    if (response.ok) {
      // We're online, notify clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CONNECTIVITY_CHANGE',
          status: 'online'
        });
      });
      return true;
    }
  } catch (error) {
    // Still offline, notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CONNECTIVITY_CHANGE',
        status: 'offline'
      });
    });
    console.log('[Service Worker] Connectivity check failed - still offline');
    return false;
  }
}

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

async function checkModerniOSPushSupport() {
  // iOS 16.4+ supports standard web push
  const userAgent = self.navigator ? self.navigator.userAgent : '';
  const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  
  if (match) {
    const version = [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3] || 0, 10)
    ];
    
    // iOS 16.4 or later
    return version[0] >= 16 && version[1] >= 4;
  }
  
  return false;
}

// Register periodic sync for connectivity checks when service worker activates
if ('periodicSync' in self.registration) {
  self.registration.periodicSync.register('connectivity-check', {
    minInterval: 60000 // Check every minute
  }).catch(error => {
    console.log('[Service Worker] Failed to register periodic connectivity sync:', error);
  });
}