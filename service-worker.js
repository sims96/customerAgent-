// service-worker.js - Enhanced for PWA functionality and notification handler for Complexe LeSims Dashboard

// Cache name for offline functionality
const CACHE_NAME = 'lesims-dashboard-cache-v2';

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
  // Icons
  './icons/icon-48x48.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/apple-icon-180x180.png',
  // External resources
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Enhanced credential handling with validation
let apiCredentials = null;
let lastCredentialCheck = 0;
let notificationCheckInterval = null;

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker');
  self.skipWaiting(); // Ensure service worker activates immediately
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and assets');
        return cache.addAll(CACHE_ASSETS);
      })
  );
});

// Activate event - clean up old caches and restore credentials
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
    .then(() => self.clients.claim())
    .then(() => {
      // Additional notification after claiming clients
      console.log('[Service Worker] Claimed clients, checking connection status');
      return self.clients.matchAll();
    })
    .then(clients => {
      if (clients.length > 0) {
        console.log('[Service Worker] Connected to', clients.length, 'client(s)');
      } else {
        console.log('[Service Worker] No connected clients found');
      }
    })
  );
});

// Periodic background sync for checking new notifications
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-notifications') {
    console.log('[Service Worker] Performing periodic sync: check-notifications');
    event.waitUntil(checkForNotifications());
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

// Fetch event for network/cache strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
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
  
  // Handle all other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response
        if (response) {
          return response;
        }
        
        // Not in cache - fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Add response to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
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
  // Prevent checking too frequently
  const now = Date.now();
  if (now - lastCredentialCheck < 30000) { // Don't check more than once every 30 seconds
    console.log('[Service Worker] Skipping notification check - checked recently');
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
        console.log('[Service Worker] Loaded credentials from IndexedDB');
      } else {
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
        
        // Try to notify clients about invalid credentials
        self.clients.matchAll().then(clients => {
          for (const client of clients) {
            client.postMessage({
              type: 'CREDENTIALS_STATUS',
              status: 'invalid'
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