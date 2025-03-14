// dashboard.js - Main controller for dashboard application
(function() {
  'use strict';
  
  // Dashboard controller
  const dashboard = {
    // Properties
    fallbackPollingInterval: null,
    serviceWorkerFailureDetected: false,
    offlineMode: false,
    
    // Initialize dashboard
    initialize: function() {
      window.logToConsole('Initializing dashboard controller');
      
      // Add service worker status display if not already present
      this.addServiceWorkerStatus();
      
      // Set up automatic reconnection from saved credentials
      this.setupAutoReconnect();
      
      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Set up refresh timer
      this.setupRefreshTimer();
      
      // Set up fallback notification polling
      this.setupFallbackPolling();
      
      // Listen for service worker events
      this.setupServiceWorkerListeners();
      
      // Monitor online/offline status
      this.setupConnectivityMonitor();
      
      window.logToConsole('Dashboard controller initialized');
    },
    
    // Add service worker status display to the UI
    addServiceWorkerStatus: function() {
      if (!document.getElementById('sw-status')) {
        // Find status indicator element
        const statusIndicator = document.getElementById('status-indicator');
        
        if (statusIndicator) {
          // Create service worker status element
          const swStatus = document.createElement('div');
          swStatus.id = 'sw-status';
          swStatus.className = 'text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-400 ml-2';
          swStatus.textContent = 'Service Worker: Initializing...';
          
          // Insert after status indicator
          statusIndicator.parentNode.insertBefore(swStatus, statusIndicator.nextSibling);
        }
      }
    },
    
    // Set up auto-reconnect from saved credentials
    setupAutoReconnect: function() {
      // Only attempt auto-reconnect if credentials are saved
      if (localStorage.getItem('dashboardApiUrl') && localStorage.getItem('dashboardApiKey')) {
        window.logToConsole('Auto-reconnect: Found saved credentials');
        
        // Add a delay to ensure UI is fully loaded
        setTimeout(() => {
          // Skip if already connected
          if (window.dashboardState && window.dashboardState.connected) {
            window.logToConsole('Auto-reconnect: Already connected, skipping');
            return;
          }
          
          // Attempt to connect
          if (window.ui && typeof window.ui.handleConnectClick === 'function') {
            window.logToConsole('Auto-reconnect: Attempting to connect with saved credentials');
            window.ui.handleConnectClick();
          }
        }, 1500);
      }
    },
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts: function() {
      document.addEventListener('keydown', (event) => {
        // Alt+N = Create test notification
        if (event.altKey && event.key === 'n') {
          window.logToConsole('Keyboard shortcut: Alt+N = Create test notification');
          
          if (window.dashboardState && window.dashboardState.connected) {
            if (window.ui && typeof window.ui.handleTestNotificationClick === 'function') {
              window.ui.handleTestNotificationClick();
            }
          } else {
            window.logToConsole('Keyboard shortcut: Not connected, cannot create notification');
          }
        }
        
        // Alt+R = Refresh conversation list
        if (event.altKey && event.key === 'r') {
          window.logToConsole('Keyboard shortcut: Alt+R = Refresh conversation list');
          
          if (window.dashboardState && window.dashboardState.connected) {
            if (window.ui && typeof window.ui.refreshConversationList === 'function') {
              window.ui.refreshConversationList();
            }
          } else {
            window.logToConsole('Keyboard shortcut: Not connected, cannot refresh');
          }
        }
        
        // Alt+C = Clear console
        if (event.altKey && event.key === 'c') {
          window.logToConsole('Keyboard shortcut: Alt+C = Clear console');
          
          const debugConsole = document.getElementById('debug-console');
          if (debugConsole) {
            debugConsole.innerHTML = '// Console cleared\n';
          }
        }
        
        // Alt+D = Toggle debug console
        if (event.altKey && event.key === 'd') {
          window.logToConsole('Keyboard shortcut: Alt+D = Toggle debug console');
          
          const toggleConsoleBtn = document.getElementById('toggle-console-btn');
          if (toggleConsoleBtn) {
            toggleConsoleBtn.click();
          }
        }
        
        // Alt+T = Create test data
        if (event.altKey && event.key === 't') {
          window.logToConsole('Keyboard shortcut: Alt+T = Create test data');
          
          if (window.dashboardState && window.dashboardState.connected) {
            if (window.ui && typeof window.ui.handleCreateTestDataClick === 'function') {
              window.ui.handleCreateTestDataClick();
            }
          } else {
            window.logToConsole('Keyboard shortcut: Not connected, cannot create test data');
          }
        }
        
        // Alt+P = Manually poll notifications
        if (event.altKey && event.key === 'p') {
          window.logToConsole('Keyboard shortcut: Alt+P = Poll notifications');
          
          if (window.dashboardState && window.dashboardState.connected) {
            this.manualNotificationCheck();
          } else {
            window.logToConsole('Keyboard shortcut: Not connected, cannot poll notifications');
          }
        }

        // Alt+O = Toggle offline mode (for testing)
        if (event.altKey && event.key === 'o') {
          window.logToConsole('Keyboard shortcut: Alt+O = Toggle offline simulation');
          this.toggleOfflineSimulation();
        }
      });
    },
    
    // Set up refresh timer to periodically check system state
    setupRefreshTimer: function() {
      // Check system health periodically
      setInterval(() => {
        this.checkSystemHealth();
      }, 5 * 60 * 1000); // Every 5 minutes
    },
    
    // Set up fallback polling for notifications
    setupFallbackPolling: function() {
      window.logToConsole('Setting up fallback notification polling');
      
      // Clear any existing polling
      if (this.fallbackPollingInterval) {
        clearInterval(this.fallbackPollingInterval);
        this.fallbackPollingInterval = null;
      }
      
      // Set up new polling interval - check every 20 seconds
      this.fallbackPollingInterval = setInterval(async () => {
        // Skip if not connected or in offline mode
        if (!window.dashboardState || !window.dashboardState.connected || this.offlineMode) {
          return;
        }
        
        try {
          // Only log if we detected service worker issues or in debug mode
          if (this.serviceWorkerFailureDetected) {
            window.logToConsole('Fallback polling: Checking for notifications');
          }
          
          const result = await window.api.getPendingNotifications();
          
          if (result && result.notifications && Array.isArray(result.notifications) && result.notifications.length > 0) {
            window.logToConsole(`Fallback polling found ${result.notifications.length} notifications`);
            
            // Process each notification
            const notificationIds = [];
            
            for (const notification of result.notifications) {
              // Add to list for marking as received
              notificationIds.push(notification.id);
              
              // Display notification in UI
              if (window.notificationSystem && typeof window.notificationSystem.notify === 'function') {
                window.notificationSystem.notify(notification);
              } else {
                // Fallback to browser notifications if available
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(notification.title || 'New notification', {
                    body: notification.body || '',
                    icon: './logo.jpg'
                  });
                }
              }
            }
            
            // Mark notifications as received
            if (notificationIds.length > 0) {
              await window.api.markNotificationsReceived(notificationIds);
            }
          }
        } catch (error) {
          window.logToConsole(`Fallback polling error: ${error.message}`, true);
        }
      }, 20000); // Check every 20 seconds
      
      return this.fallbackPollingInterval;
    },
    
    // Set up connectivity monitoring
    setupConnectivityMonitor: function() {
      // Listen for online events
      window.addEventListener('online', () => {
        window.logToConsole('Browser reports online status');
        this.updateOfflineStatus(false);
      });
      
      // Listen for offline events
      window.addEventListener('offline', () => {
        window.logToConsole('Browser reports offline status');
        this.updateOfflineStatus(true);
      });

      // Initialize with current status
      this.updateOfflineStatus(!navigator.onLine);
    },

    // Update offline status
    updateOfflineStatus: function(isOffline) {
      this.offlineMode = isOffline;
      
      // Update UI to reflect offline status
      if (isOffline) {
        // Update status indicator
        if (document.getElementById('status-indicator')) {
          const statusIndicator = document.getElementById('status-indicator');
          statusIndicator.innerHTML = '<span class="h-2 w-2 mr-2 rounded-full bg-yellow-500 status-pulse"></span> Offline';
          statusIndicator.classList.remove('bg-green-900', 'bg-red-900');
          statusIndicator.classList.add('bg-yellow-900');
        }
        
        // Show offline banner if it doesn't exist
        if (!document.getElementById('offline-banner')) {
          const banner = document.createElement('div');
          banner.id = 'offline-banner';
          banner.className = 'fixed top-0 left-0 right-0 bg-yellow-600 text-white py-1 px-4 text-center z-50';
          banner.innerHTML = '<i class="fas fa-wifi-slash mr-2"></i> You are currently offline. Limited functionality available.';
          document.body.prepend(banner);
        }
      } else {
        // Remove offline banner if it exists
        const banner = document.getElementById('offline-banner');
        if (banner) {
          banner.remove();
        }
        
        // Restore status indicator if we're connected
        if (window.dashboardState && window.dashboardState.connected) {
          if (document.getElementById('status-indicator')) {
            const statusIndicator = document.getElementById('status-indicator');
            statusIndicator.innerHTML = '<span class="h-2 w-2 mr-2 rounded-full bg-green-500 status-pulse"></span> Connected';
            statusIndicator.classList.remove('bg-yellow-900', 'bg-red-900');
            statusIndicator.classList.add('bg-green-900');
          }
        }
        
        // Refresh data if connected
        if (window.dashboardState && window.dashboardState.connected) {
          setTimeout(() => {
            if (window.ui && typeof window.ui.refreshConversationList === 'function') {
              window.ui.refreshConversationList();
            }
          }, 1000);
        }
      }
      
      // Notify other components about connectivity change
      window.dispatchEvent(new CustomEvent('dashboard:connectivityChanged', {
        detail: {
          online: !isOffline
        }
      }));
    },
    
    // Toggle offline simulation (for testing)
    toggleOfflineSimulation: function() {
      // This doesn't actually change network status, just simulates UI changes
      this.updateOfflineStatus(!this.offlineMode);
      window.logToConsole(`Offline simulation: ${this.offlineMode ? 'Enabled' : 'Disabled'}`);
    },
    
    // Set up listener for service worker status
    setupServiceWorkerListeners: function() {
      // Update service worker status display
      this.updateServiceWorkerStatus('initializing');
      
      if ('serviceWorker' in navigator) {
        // Listen for service worker registration success
        window.addEventListener('serviceWorkerRegistered', (event) => {
          window.logToConsole('Service worker registered successfully');
          this.serviceWorkerFailureDetected = false;
          this.updateServiceWorkerStatus('active');
        });
        
        // Listen for service worker registration failure
        window.addEventListener('serviceWorkerFailed', (event) => {
          window.logToConsole('Service worker registration failed', true);
          this.serviceWorkerFailureDetected = true;
          this.updateServiceWorkerStatus('failed');
          
          // Make sure fallback polling is active
          if (!this.fallbackPollingInterval) {
            this.setupFallbackPolling();
          }
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data) {
            // Handle connectivity messages
            if (event.data.type === 'CONNECTIVITY_CHANGE') {
              window.logToConsole(`Service Worker reports ${event.data.status} status`);
              this.updateOfflineStatus(event.data.status === 'offline');
            }
            
            // Handle service worker ready message
            if (event.data.type === 'SERVICE_WORKER_READY') {
              window.logToConsole('Service Worker ready message received');
              this.updateServiceWorkerStatus('active', event.data.authenticated);
            }
          }
        });
        
        // Check service worker registration immediately
        navigator.serviceWorker.getRegistration().then(registration => {
          if (!registration || !registration.active) {
            window.logToConsole('No active service worker detected, using fallback polling', true);
            this.serviceWorkerFailureDetected = true;
            this.updateServiceWorkerStatus('missing');
          } else {
            window.logToConsole('Active service worker detected');
            this.serviceWorkerFailureDetected = false;
            
            // Ping service worker to check status
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'PING_SERVICE_WORKER',
                timestamp: Date.now()
              });
            }
          }
        }).catch(error => {
          window.logToConsole('Error checking service worker: ' + error.message, true);
          this.serviceWorkerFailureDetected = true;
          this.updateServiceWorkerStatus('error');
        });
      } else {
        window.logToConsole('Service workers not supported in this browser, using fallback polling', true);
        this.serviceWorkerFailureDetected = true;
        this.updateServiceWorkerStatus('unsupported');
      }
    },
    
    // Update service worker status display
    updateServiceWorkerStatus: function(status, isAuthenticated) {
      const swStatus = document.getElementById('sw-status');
      if (!swStatus) return;
      
      let text = 'Service Worker: ';
      let className = 'text-xs px-3 py-1 rounded-full bg-gray-800 ';
      
      switch (status) {
        case 'initializing':
          text += 'Initializing...';
          className += 'text-gray-400';
          break;
        case 'active':
          text += isAuthenticated ? 'Active (Notifications Ready)' : 'Active (Offline Ready)';
          className += 'text-green-500';
          break;
        case 'failed':
          text += 'Registration Failed';
          className += 'text-red-500';
          break;
        case 'missing':
          text += 'Not Registered';
          className += 'text-yellow-500';
          break;
        case 'error':
          text += 'Error';
          className += 'text-red-500';
          break;
        case 'unsupported':
          text += 'Not Supported';
          className += 'text-red-500';
          break;
        default:
          text += 'Unknown';
          className += 'text-gray-400';
      }
      
      swStatus.textContent = text;
      swStatus.className = className;
    },
    
    // Check overall system health
    checkSystemHealth: function() {
      // Skip if not connected
      if (!window.dashboardState || !window.dashboardState.connected) {
        return;
      }
      
      window.logToConsole('Performing system health check');
      
      // Check if service worker is still active
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          window.logToConsole('Service worker is active: ' + registration.active.state);
          
          // Ping service worker to ensure it's responsive
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'HEALTH_CHECK',
              timestamp: Date.now()
            });
          }
        }).catch(error => {
          window.logToConsole('Service worker error: ' + error.message, true);
          this.serviceWorkerFailureDetected = true;
          this.updateServiceWorkerStatus('error');
        });
      }
      
      // Verify notification system is working
      if (window.notificationSystem) {
        // Trigger a notification check
        window.notificationSystem.checkForNotifications();
      }
      
      // Verify API connection is working
      if (window.api) {
        window.api.testConnection().then(result => {
          if (!result) {
            window.logToConsole('API connection test failed during health check', true);
          }
        }).catch(error => {
          window.logToConsole('API error during health check: ' + error.message, true);
        });
      }
      
      // Check fallback polling is working
      if (this.serviceWorkerFailureDetected && !this.fallbackPollingInterval) {
        window.logToConsole('Fallback polling not active but should be, restarting', true);
        this.setupFallbackPolling();
      }
      
      // Check connectivity status
      this.updateOfflineStatus(!navigator.onLine);
    },
    
    // Manual notification check
    manualNotificationCheck: function() {
      window.logToConsole('Manual notification check requested');
      
      // Try notification system first
      if (window.notificationSystem && typeof window.notificationSystem.checkForNotifications === 'function') {
        window.notificationSystem.checkForNotifications();
      }
      
      // Also try service worker directly
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_NOTIFICATIONS'
        });
      }
    },
    
    // Handle login event - sync credentials to service worker
    handleLogin: function(apiUrl, apiKey) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        window.logToConsole('Sending credentials to service worker after login');
        
        navigator.serviceWorker.controller.postMessage({
          type: 'STORE_CREDENTIALS',
          apiUrl: apiUrl,
          apiKey: apiKey,
          timestamp: Date.now()
        });
      }
    },
    
    // Handle disconnect - clean up resources
    handleDisconnect: function() {
      window.logToConsole('Handling dashboard disconnect');
      
      // Clear fallback polling
      if (this.fallbackPollingInterval) {
        clearInterval(this.fallbackPollingInterval);
        this.fallbackPollingInterval = null;
      }
      
      // Update service worker status
      this.updateServiceWorkerStatus('active', false);
    }
  };
  
  // Expose handle login function
  window.handleDashboardLogin = function(apiUrl, apiKey) {
    if (dashboard && typeof dashboard.handleLogin === 'function') {
      dashboard.handleLogin(apiUrl, apiKey);
    }
  };
  
  // Expose disconnect handler to be called from UI
  window.handleDashboardDisconnect = function() {
    if (dashboard && typeof dashboard.handleDisconnect === 'function') {
      dashboard.handleDisconnect();
    }
  };
  
  // Initialize dashboard when document is ready
  document.addEventListener('DOMContentLoaded', function() {
    dashboard.initialize();
  });
})();