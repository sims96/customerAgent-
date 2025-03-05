// dashboard.js - Main controller for dashboard application
(function() {
  'use strict';
  
  // Dashboard controller
  const dashboard = {
    // Initialize dashboard
    initialize: function() {
      window.logToConsole('Initializing dashboard controller');
      
      // Set up automatic reconnection from saved credentials
      this.setupAutoReconnect();
      
      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Set up refresh timer
      this.setupRefreshTimer();
      
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
      });
    },
    
    // Set up refresh timer to periodically check system state
    setupRefreshTimer: function() {
      // Check system health periodically
      setInterval(() => {
        this.checkSystemHealth();
      }, 5 * 60 * 1000); // Every 5 minutes
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
    }
  };
  
  // Initialize dashboard when document is ready
  document.addEventListener('DOMContentLoaded', function() {
    dashboard.initialize();
  });
})();