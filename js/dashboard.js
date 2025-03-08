// dashboard.js - Main controller for dashboard application
(function() {
  'use strict';
  
  // Dashboard controller
  const dashboard = {
    // Properties
    fallbackPollingInterval: null,
    serviceWorkerFailureDetected: false,
    
    // Initialize dashboard
    initialize: function() {
      window.logToConsole('Initializing dashboard controller');
      
      // Set up automatic reconnection from saved credentials
      this.setupAutoReconnect();
      
      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Set up refresh timer
      this.setupRefreshTimer();
      
      // Set up fallback notification polling
      this.setupFallbackPolling();
      
      // Listen for service worker failures
      this.setupServiceWorkerListener();
      
      window.logToConsole('Dashboard controller initialized');
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
        // Skip if not connected
        if (!window.dashboardState || !window.dashboardState.connected) {
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
    
    // Set up listener for service worker status
    setupServiceWorkerListener: function() {
      // Listen for service worker errors
      window.addEventListener('serviceWorkerFailed', (event) => {
        window.logToConsole('Service worker failure detected, fallback polling will be used', true);
        this.serviceWorkerFailureDetected = true;
        
        // Make sure fallback polling is active
        if (!this.fallbackPollingInterval) {
          this.setupFallbackPolling();
        }
      });
      
      // Check service worker registration immediately
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (!registration || !registration.active) {
            window.logToConsole('No active service worker detected, using fallback polling', true);
            this.serviceWorkerFailureDetected = true;
          }
        }).catch(error => {
          window.logToConsole('Error checking service worker: ' + error.message, true);
          this.serviceWorkerFailureDetected = true;
        });
      } else {
        window.logToConsole('Service workers not supported in this browser, using fallback polling', true);
        this.serviceWorkerFailureDetected = true;
      }
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
    
    // Handle disconnect - clean up resources
    handleDisconnect: function() {
      window.logToConsole('Handling dashboard disconnect');
      
      // Clear fallback polling
      if (this.fallbackPollingInterval) {
        clearInterval(this.fallbackPollingInterval);
        this.fallbackPollingInterval = null;
      }
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